import { WebSocketServer, WebSocket } from 'ws';
import {
  isPluginMessage,
  ExplanationMessage,
  ErrorReportedMessage,
  Explanation,
} from '../../protocol/src/index';
import { onFileSaved, onError } from './pipeline';
import { toDisplay, toPanelMessages } from './render';

// A UI must never be left staring at a spinner. If anything at all goes
// wrong we still answer with a usable explanation.
const FALLBACK: Explanation = {
  headline: 'The explainer could not handle this one',
  cause: 'Something inside the backend failed while working on this error.',
  fix: 'Save the file again. If it keeps happening, check the core terminal for the real cause.',
  relatedSave: null,
};

function str(v: any, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: any, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// A plugin may send a partial or malformed report (different VS Code
// versions, different error shapes, a rushed teammate). Fill the gaps so
// everything downstream can assume every field is present.
function sanitize(raw: any, index: number): ErrorReportedMessage {
  return {
    type: 'error.reported',
    errorId: str(raw.errorId) || 'auto-' + index + '-' + Date.now(),
    message: str(raw.message),
    file: str(raw.file),
    line: num(raw.line, 0),
    column: num(raw.column, 0),
    language: str(raw.language),
    severity: str(raw.severity, 'error'),
    source: str(raw.source) || undefined,
  };
}

export function startServer(port = 4321) {
  const wss = new WebSocketServer({ port });
  const clients = new Map<string, WebSocket>();
  let counter = 0;

  console.log('[server] listening on ws://localhost:' + port);

  wss.on('connection', (ws) => {
    let pluginId: string | null = null;

    ws.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        console.log('[server] ignoring unreadable message');
        return;
      }

      if (!isPluginMessage(msg)) {
        console.log('[server] ignoring unknown message type:', msg?.type);
        return;
      }

      if (msg.type === 'hello') {
        pluginId = str(msg.pluginId, 'unknown-plugin');
        clients.set(pluginId, ws);
        console.log('[server] plugin connected:', pluginId, '(' + str(msg.editor, '?') + ')');
        return;
      }

      if (!pluginId) {
        console.log('[server] message arrived before hello, ignoring');
        return;
      }

      if (msg.type === 'file.saved') {
        onFileSaved(str(msg.file));
        return;
      }

      if (msg.type === 'error.reported') {
        const report = sanitize(msg, ++counter);
        console.log('[server] error reported:', report.message || '(empty)');

        let explanation: Explanation;
        try {
          explanation = await onError(report);
        } catch (err: any) {
          console.log('[server] explanation failed:', err?.message ?? err);
          explanation = FALLBACK;
        }

        // The core does the translation, so a UI only has to forward.
        const display = toDisplay(report, explanation);
        const reply: ExplanationMessage = {
          type: 'explanation',
          errorId: report.errorId,
          explanation,
          display,
          panel: toPanelMessages(display, report.errorId),
        };

        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(reply));
        console.log('[server] sent explanation for', report.errorId);
      }
    });

    ws.on('close', () => {
      console.log('[server] plugin disconnected:', pluginId);
      if (pluginId) clients.delete(pluginId);
    });

    ws.on('error', (e) => console.log('[server] connection error:', e.message));
  });

  return wss;
}
