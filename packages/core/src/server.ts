import { WebSocketServer, WebSocket } from 'ws';
import { isPluginMessage, ExplanationMessage } from '../../protocol/src/index';
import { onFileSaved, onError } from './pipeline';

export function startServer(port = 4321) {
  const wss = new WebSocketServer({ port });
  const clients = new Map<string, WebSocket>();

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
        pluginId = msg.pluginId;
        clients.set(pluginId, ws);
        console.log('[server] plugin connected:', pluginId, '(' + msg.editor + ')');
        return;
      }

      if (!pluginId) {
        console.log('[server] message arrived before hello, ignoring');
        return;
      }

      if (msg.type === 'file.saved') {
        onFileSaved(msg.file);
        return;
      }

      if (msg.type === 'error.reported') {
        console.log('[server] error reported:', msg.message);
        const explanation = await onError(msg);

        const reply: ExplanationMessage = {
          type: 'explanation',
          errorId: msg.errorId,
          explanation,
        };
        clients.get(pluginId)?.send(JSON.stringify(reply));
        console.log('[server] sent explanation for', msg.errorId);
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