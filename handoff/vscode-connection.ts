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

export type Connection = { stop: () => void };

export function connectToCore(post: (message: any) => void): Connection {
  let ws: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  // Per file: the diagnostics we have already sent, so that typing in a file
  // does not re-send every squiggle it already has.
  const reported = new Map<string, Set<string>>();

  const isOpen = () => !!ws && ws.readyState === WebSocket.OPEN;

  const sendRaw = (obj: any) => {
    if (isOpen()) ws!.send(JSON.stringify(obj));
  };

  const keyFor = (d: vscode.Diagnostic) =>
    (d.range.start.line + 1) + ':' + (d.range.start.character + 1) + ':' + d.message;

  const sendDiagnostic = (doc: vscode.TextDocument, d: vscode.Diagnostic) => {
    // VS Code counts lines and columns from 0. The core counts from 1.
    // Forget this and every line number in the demo is off by one.
    const line = d.range.start.line + 1;
    const column = d.range.start.character + 1;

    sendRaw({
      type: 'error.reported',
      // Stable for the same error, which lets the panel update an existing
      // card instead of stacking a new one every time you type.
      errorId: [doc.uri.fsPath, line, column, d.message].join(':'),
      message: d.message,
      file: doc.uri.fsPath,
      line,
      column,
      language: doc.languageId,     // 'python', 'typescriptreact', ...
      severity: 'error',
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
      .filter((d) => d.severity === vscode.DiagnosticSeverity.Error);

    const previous = reported.get(uri.toString()) ?? new Set<string>();
    const current = new Set<string>();

    for (const d of errors) {
      const key = keyFor(d);
      current.add(key);
      if (!previous.has(key)) sendDiagnostic(doc, d);
    }

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
      if (msg?.type === 'explanation' && Array.isArray(msg.panel)) {
        for (const m of msg.panel) post(m);
      }
    });

    ws.on('close', () => {
      ws = undefined;
      if (stopped) return;
      retryTimer = setTimeout(open, RETRY_MS);   // core not up yet - keep trying
    });

    ws.on('error', () => { /* 'close' always follows, which triggers the retry */ });
  };

  const subscriptions = [
    vscode.workspace.onDidSaveTextDocument((doc) => {
      sendRaw({ type: 'file.saved', file: doc.uri.fsPath });
    }),
    vscode.languages.onDidChangeDiagnostics((e) => {
      for (const uri of e.uris) syncUri(uri);
    }),
  ];

  open();

  return {
    stop() {
      stopped = true;
      clearTimeout(retryTimer);
      for (const s of subscriptions) s.dispose();
      ws?.close();
    },
  };
}
