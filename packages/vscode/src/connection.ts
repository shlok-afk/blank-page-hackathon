// DROP-IN for UI 1.
//
// Copy this file to:  packages/vscode/src/connection.ts
//
// Then add these 3 lines to activate() in extension.ts:
//
//   const conn = connectToCore((m) => panel.post(m));
//   context.subscriptions.push({ dispose: () => conn.stop() });
//
// ...and run:  npm i ws && npm i -D @types/ws   (inside packages/vscode)
//
// That is the entire integration. You do NOT translate anything: the core
// sends `msg.panel`, which is already a list of messages your panel
// understands. Forward it and you are done.
//
// Every VS Code gotcha (0-based lines, backslash paths, repeated diagnostics,
// core not running yet) is handled below.

import * as vscode from 'vscode';
import WebSocket from 'ws';

const CORE_URL = 'ws://localhost:4321';
const RETRY_MS = 1500;
// Hold off while the user is typing: `pri`, `prit`, `pritn` are each a different
// "error" mid-word. Only check a file once it's been quiet this long (or on save).
const TYPING_IDLE_MS = 4_000;

export type Connection = { stop: () => void };

export function connectToCore(post: (message: any) => void): Connection {
  let ws: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  // Per file: the diagnostics we have already sent (key -> errorId), so that typing
  // in a file does not re-send every squiggle it already has, and so we know
  // which cards to remove once their error is gone.
  const reported = new Map<string, Map<string, string>>();
  const active = () => new Set([...reported.values()].flatMap((m) => [...m.values()]));

  const isOpen = () => !!ws && ws.readyState === WebSocket.OPEN;

  const sendRaw = (obj: any) => {
    if (isOpen()) ws!.send(JSON.stringify(obj));
  };

  const keyFor = (d: vscode.Diagnostic) =>
    (d.range.start.line + 1) + ':' + (d.range.start.character + 1) + ':' + d.message;

  // Stable for the same error, which lets the panel update an existing
  // card instead of stacking a new one every time you type.
  const idFor = (doc: vscode.TextDocument, d: vscode.Diagnostic) =>
    [doc.uri.fsPath, d.range.start.line + 1, d.range.start.character + 1, d.message].join(':');

  const sendDiagnostic = (doc: vscode.TextDocument, d: vscode.Diagnostic) => {
    // VS Code counts lines and columns from 0. The core counts from 1.
    // Forget this and every line number in the demo is off by one.
    const line = d.range.start.line + 1;
    const column = d.range.start.character + 1;

    sendRaw({
      type: 'error.reported',
      errorId: idFor(doc, d),
      message: d.message,
      file: doc.uri.fsPath,
      line,
      column,
      language: doc.languageId,     // 'python', 'typescriptreact', ...
      severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
      source: d.source,             // 'Pylance', 'ts(2339)', ...
    });
  };

  const syncUri = (uri: vscode.Uri) => {
    if (!isOpen()) return;

    const doc = vscode.workspace.textDocuments.find(
      (t) => t.uri.toString() === uri.toString(),
    );
    if (!doc) return;

    const errors = vscode.languages
      .getDiagnostics(uri)
      // Warnings too: Pylance reports misspelled names (`pritn`) as warnings, the classic beginner mistake.
      .filter((d) => d.severity <= vscode.DiagnosticSeverity.Warning);

    const previous = reported.get(uri.toString()) ?? new Map<string, string>();
    const current = new Map<string, string>();

    for (const d of errors) {
      const key = keyFor(d);
      current.set(key, idFor(doc, d));
      if (!previous.has(key)) sendDiagnostic(doc, d);
    }

    // Errors that are gone (fixed, or a half-typed word that got finished): drop their cards.
    for (const [key, id] of previous) if (!current.has(key)) post({ type: 'resolve', id });

    reported.set(uri.toString(), current);
  };

  const open = () => {
    if (stopped) return;
    ws = new WebSocket(CORE_URL);

    ws.on('open', () => {
      // Forget what we sent before: if the core restarted, its panel is empty
      // and needs everything again. Ids are stable, so no duplicate cards.
      reported.clear();
      sendRaw({ type: 'hello', pluginId: 'vscode-' + process.pid, editor: 'vscode' });

      // Catch up on whatever is already broken on screen.
      for (const [uri] of vscode.languages.getDiagnostics()) syncUri(uri);
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
      if (stopped) return;
      retryTimer = setTimeout(open, RETRY_MS);   // core not up yet - keep trying
    });

    ws.on('error', () => { /* 'close' always follows, which triggers the retry */ });
  };

  // Files the user is typing in, each with a timer that checks it once they stop.
  const typing = new Map<string, ReturnType<typeof setTimeout>>();

  const settle = (uri: vscode.Uri) => {
    clearTimeout(typing.get(uri.toString()));
    typing.delete(uri.toString());
    syncUri(uri);
  };

  const subscriptions = [
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) return;
      const key = e.document.uri.toString();
      clearTimeout(typing.get(key));
      typing.set(key, setTimeout(() => settle(e.document.uri), TYPING_IDLE_MS));
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      sendRaw({ type: 'file.saved', file: doc.uri.fsPath });
      settle(doc.uri); // saving means "I'm done typing"
    }),
    vscode.languages.onDidChangeDiagnostics((e) => {
      // Mid-typing files wait for their timer; everything else syncs right away.
      for (const uri of e.uris) if (!typing.has(uri.toString())) syncUri(uri);
    }),
  ];

  open();

  return {
    stop() {
      stopped = true;
      clearTimeout(retryTimer);
      for (const t of typing.values()) clearTimeout(t);
      for (const s of subscriptions) s.dispose();
      ws?.close();
    },
  };
}
