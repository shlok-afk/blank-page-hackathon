import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:4321');

function send(obj: any) { ws.send(JSON.stringify(obj)); }
function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

ws.on('open', async () => {
  console.log('[fake-plugin] connected');

  send({ type: 'hello', pluginId: 'fake-vscode', editor: 'vscode' });

  await wait(200);
  console.log('[fake-plugin] pretending to save a file...');
  send({ type: 'file.saved', file: 'C:/dev/demo/auth.py' });

  await wait(300);
  console.log('[fake-plugin] sending an error...');
  send({
    type: 'error.reported',
    errorId: 'err-1',
    message: "TypeError: 'NoneType' object is not subscriptable",
    file: 'C:/dev/demo/auth.py',
    line: 88,
    column: 3,
    language: 'python',
    severity: 'error',
  });
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log('[fake-plugin] GOT EXPLANATION:');
  console.log(JSON.stringify(msg, null, 2));
});

ws.on('error', (e) => console.log('[fake-plugin] error:', e.message));