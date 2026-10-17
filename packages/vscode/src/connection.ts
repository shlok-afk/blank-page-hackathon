// The one wire between VS Code and the core.
//
// The core does the hard work (wait, library/cache/AI, render) and hands back
// finished panel messages, so this file only:
//
//   1. watches VS Code diagnostics and forwards the ones worth explaining,
//   2. applies the user's settings (which ones, how soon, how often),
//   3. reports connection status, and
//   4. supports asking for an explanation on purpose ("Explain this error").
//
// Every VS Code gotcha (0-based lines, backslash paths, repeated diagnostics,
// core not running yet) is handled here.

import * as vscode from 'vscode';
import WebSocket from 'ws';

const CORE_URL = 'ws://localhost:4321';
const RETRY_MS = 1500;

export type Connection = {
  stop: () => void;
  explainNow: (uri?: vscode.Uri) => void;
};

type Settings = {
  patience: number;    // ms of quiet before an error is explained
  narration: number;   // 0..100, passed to the core for wording
  sensitivity: number; // 0..100, decides which severities we send
  contextLines: number;
  explainOn: 'auto' | 'save' | 'click';
};

function readSettings(): Settings {
  const cfg = vscode.workspace.getConfiguration('errorExplainer');
  return {
    patience: cfg.get<number>('patience', 1500),
    narration: cfg.get<number>('narration', 50),
    sensitivity: cfg.get<number>('sensitivity', 50),
    contextLines: cfg.get<number>('contextLines', 10),
    explainOn: cfg.get<'auto' | 'save' | 'click'>('explainOn', 'auto'),
  };
}

// Sensitivity decides how much the explainer is allowed to talk about.
// The bands match the chips on the setup screen: Zen..Chill = hard errors
// only, Balanced..Alert adds warnings, Nitpicky adds info hints too.
// VS Code severities count DOWN (Error=0 is the most severe), and a diagnostic
// passes when its severity is <= this value.
function mostSevereWanted(sensitivity: number): vscode.DiagnosticSeverity {
  if (sensitivity >= 70) return vscode.DiagnosticSeverity.Hint;        // errors, warnings & info
  if (sensitivity >= 40) return vscode.DiagnosticSeverity.Warning;     // errors + warnings
  return vscode.DiagnosticSeverity.Error;                             // hard errors only
}

export function connectToCore(
  post: (message: any) => void,
  onStatus?: (connected: boolean) => void,
): Connection {
  let ws: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let settings = readSettings();

  // Per file: the diagnostics we have actually SENT (key -> errorId), so typing
  // in a file does not re-send every squiggle it already has, and so we know
  // which cards to remove once their error is gone.
  const reported = new Map<string, Map<string, string>>();
  const active = () => new Set([...reported.values()].flatMap((m) => [...m.values()]));

  const isOpen = () => !!ws && ws.readyState === WebSocket.OPEN;

  const sendRaw = (obj: any) => {
    if (isOpen()) ws!.send(JSON.stringify(obj));
  };

  const keyFor = (d: vscode.Diagnostic) =>
    d.range.start.line + 1 + ':' + d.range.start.character + 1 + ':' + d.message;

  // Stable for the same error, which lets the panel update an existing
  // card instead of stacking a new one every time you type.
  const idFor = (doc: vscode.TextDocument, d: vscode.Diagnostic) =>
    [doc.uri.fsPath, d.range.start.line + 1, d.range.start.character + 1, d.message].join(':');

  // The lines around the error, so the core has something to reason about.
  // contextLines = 0 sends nothing extra (the private option on the slider).
  function contextFor(doc: vscode.TextDocument, d: vscode.Diagnostic): string | undefined {
    if (settings.contextLines <= 0) return undefined;
    const start = Math.max(0, d.range.start.line - settings.contextLines);
    const end = Math.min(doc.lineCount - 1, d.range.start.line + settings.contextLines);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(doc.lineAt(i).text);
    return lines.join('\n');
  }

  const sendDiagnostic = (doc: vscode.TextDocument, d: vscode.Diagnostic, immediate: boolean) => {
    // VS Code counts lines and columns from 0. The core counts from 1.
    // Forget this and every line number in the demo is off by one.
    sendRaw({
      type: 'error.reported',
      errorId: idFor(doc, d),
      message: d.message,
      file: doc.uri.fsPath,
      line: d.range.start.line + 1,
      column: d.range.start.character + 1,
      language: doc.languageId, // 'python', 'typescriptreact', ...
      severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
      source: d.source, // 'Pylance', 'ts(2339)', ...
      codeContext: contextFor(doc, d),
      immediate,
    });
  };

  const diagnosticsFor = (uri: vscode.Uri) =>
    vscode.languages
      .getDiagnostics(uri)
      .filter((d) => d.severity <= mostSevereWanted(settings.sensitivity));

  // Bring one file up to date with the core. `send` is false when the current
  // mode forbids new explanations (save/click), in which case we only retire
  // cards whose errors have been fixed.
  const syncUri = (uri: vscode.Uri, opts: { send: boolean; immediate?: boolean }) => {
    const doc = vscode.workspace.textDocuments.find((t) => t.uri.toString() === uri.toString());
    if (!doc) return;

    const errors = diagnosticsFor(uri);
    const current = new Map<string, string>();
    for (const d of errors) current.set(keyFor(d), idFor(doc, d));

    const previous = reported.get(uri.toString()) ?? new Map<string, string>();

    // Errors that are gone (fixed, or a half-typed word that got finished).
    for (const [key, id] of previous) if (!current.has(key)) post({ type: 'resolve', id });

    if (opts.send) {
      for (const d of errors) {
        const key = keyFor(d);
        if (!previous.has(key)) sendDiagnostic(doc, d, opts.immediate === true);
      }
      reported.set(uri.toString(), current);
    } else {
      // Not sending: remember only what we already sent, minus the fixed ones,
      // so a later save still reports them as new.
      const kept = new Map(previous);
      for (const key of [...kept.keys()]) if (!current.has(key)) kept.delete(key);
      reported.set(uri.toString(), kept);
    }
  };

  const helloSettings = () => ({ patience: settings.patience, narration: settings.narration });

  const open = () => {
    if (stopped) return;
    ws = new WebSocket(CORE_URL);

    ws.on('open', () => {
      // Forget what we sent before: if the core restarted, its panel is empty
      // and needs everything again. Ids are stable, so no duplicate cards.
      reported.clear();
      sendRaw({ type: 'hello', pluginId: 'vscode-' + process.pid, editor: 'vscode', settings: helloSettings() });
      onStatus?.(true);

      // Catch up on whatever is already broken on screen. "On request" mode
      // stays silent until the user actually asks.
      for (const [uri] of vscode.languages.getDiagnostics()) {
        syncUri(vscode.Uri.parse(uri), { send: settings.explainOn === 'auto' });
      }
    });

    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // The core has already built finished renderer messages. Forward them.
      // Skip answers for errors that were fixed while the core was thinking.
      if (msg?.type === 'explanation' && Array.isArray(msg.panel)) {
        const live = active();
        for (const m of msg.panel) if (live.has(m.id)) post(m);
      }
    });

    ws.on('close', () => {
      ws = undefined;
      onStatus?.(false);
      if (stopped) return;
      retryTimer = setTimeout(open, RETRY_MS); // core not up yet - keep trying
    });

    ws.on('error', () => {
      /* 'close' always follows, which triggers the retry */
    });
  };

  // Files the user is typing in, each with a timer that checks them once they
  // stop. `patience` is that quiet period.
  const typing = new Map<string, ReturnType<typeof setTimeout>>();

  const settle = (uri: vscode.Uri) => {
    clearTimeout(typing.get(uri.toString()));
    typing.delete(uri.toString());
    syncUri(uri, { send: true });
  };

  const subscriptions = [
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) return;
      if (settings.explainOn !== 'auto') return; // save/click don't explain mid-typing
      const key = e.document.uri.toString();
      clearTimeout(typing.get(key));
      typing.set(key, setTimeout(() => settle(e.document.uri), settings.patience));
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      sendRaw({ type: 'file.saved', file: doc.uri.fsPath });
      clearTimeout(typing.get(doc.uri.toString()));
      typing.delete(doc.uri.toString());
      // Saving means "I'm done typing" - explain now, unless we only explain on request.
      syncUri(doc.uri, { send: settings.explainOn !== 'click' });
    }),
    vscode.languages.onDidChangeDiagnostics((e) => {
      for (const uri of e.uris) {
        if (settings.explainOn === 'auto') {
          // Mid-typing files wait for their timer; everything else syncs right away.
          if (!typing.has(uri.toString())) syncUri(uri, { send: true });
        } else {
          // Not allowed to explain unprompted, but still retire fixed cards.
          syncUri(uri, { send: false });
        }
      }
    }),
    // Keep the core in step with the settings as soon as the user moves a slider.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('errorExplainer')) return;
      settings = readSettings();
      sendRaw({ type: 'hello', pluginId: 'vscode-' + process.pid, editor: 'vscode', settings: helloSettings() });
    }),
  ];

  open();

  return {
    // "Explain this error": ask for this file's errors right now, skipping the
    // wait. Used by the click mode and the right-click command.
    explainNow(uri?: vscode.Uri) {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) return;
      syncUri(target, { send: true, immediate: true });
    },
    stop() {
      stopped = true;
      clearTimeout(retryTimer);
      for (const t of typing.values()) clearTimeout(t);
      for (const s of subscriptions) s.dispose();
      ws?.close();
    },
  };
}
