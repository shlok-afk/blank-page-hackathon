// TRUE end-to-end proof, with no VS Code required.
//
//   real WebSocket  ->  real server  ->  real pipeline  ->  real render
//                                                              |
//                                              UI 2's ACTUAL panel renderer
//
// Run with:  npm run e2e
//
// If this passes, then every join between the backend and the UI is correct:
// the protocol shapes, the translation, and the markdown the panel must parse.
import WebSocket from 'ws';
import { startServer } from '../src/server';

// UI 2's panel.js touches document/window at load time, so stub them first.
(globalThis as any).document = { getElementById: () => ({ addEventListener() {} }) };
(globalThis as any).window = { addEventListener() {} };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const panelRenderer = require('../../vscode/media/panel.js');
const md: (s: string) => string = panelRenderer.md;
const terminalTitle: (s: string) => string = panelRenderer.terminalTitle;

const PORT = 4399;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log('  PASS   ' + name);
  } else {
    failed++;
    console.log('  FAIL   ' + name + (detail ? '   (' + detail + ')' : ''));
  }
}

async function main() {
  const wss = startServer(PORT);
  await wait(300);

  const ws = new WebSocket('ws://localhost:' + PORT);
  await new Promise((r) => ws.on('open', r));

  // Wait for the next explanation the core sends us.
  let waiting: ((m: any) => void) | null = null;
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (waiting) {
      const r = waiting;
      waiting = null;
      r(m);
    }
  });
  const nextReply = () => new Promise<any>((r) => (waiting = r));

  ws.send(JSON.stringify({ type: 'hello', pluginId: 'e2e', editor: 'vscode' }));

  console.log('');
  console.log('1. The happy path: a real error, end to end');

  // Deliberately save with BACKSLASHES and report the error with FORWARD
  // slashes. Real editors do exactly this, and it used to break correlation.
  ws.send(JSON.stringify({ type: 'file.saved', file: 'C:\\dev\\demo\\auth.py' }));
  const replyP = nextReply();
  ws.send(JSON.stringify({
    type: 'error.reported',
    errorId: 'e2e-1',
    message: "TypeError: 'NoneType' object is not subscriptable",
    file: 'C:/dev/demo/auth.py',
    line: 88,
    column: 3,
    language: 'python',
    severity: 'error',
    source: 'Pylance',
  }));

  const msg = await replyP;

  check('core replied with an explanation', msg?.type === 'explanation');
  check('reply is matched to the right error', msg?.errorId === 'e2e-1');
  check('the library produced a real headline', !!msg?.explanation?.headline, msg?.explanation?.headline);
  check(
    'save correlation SURVIVED the backslash/forward-slash difference',
    typeof msg?.explanation?.relatedSave === 'string' && msg.explanation.relatedSave.includes('auth.py'),
    String(msg?.explanation?.relatedSave),
  );

  console.log('');
  console.log('2. The ready-to-render block (what the UI reads)');

  const display = msg?.display;
  check('display exists', !!display);
  check('title is the raw error line', display?.title === "TypeError: 'NoneType' object is not subscriptable");
  check('language is human readable', display?.language === 'Python', display?.language);
  check('location is file:line, not a full path', display?.location === 'auth.py:88', display?.location);
  check('source is passed through from the plugin', display?.source === 'Pylance', display?.source);

  console.log('');
  console.log('3. The ready-to-forward messages (what makes UI 1 trivial)');

  const panel = msg?.panel;
  check('panel is an array', Array.isArray(panel));
  check('panel has exactly a start + an explanation', panel?.length === 2, String(panel?.length));
  check('first message is "start"', panel?.[0]?.type === 'start');
  check('second message is "explanation"', panel?.[1]?.type === 'explanation');
  check(
    'every message carries a truthy id (the panel silently drops messages without one)',
    panel?.every((m: any) => !!m.id),
  );
  check('ids match the errorId', panel?.every((m: any) => m.id === 'e2e-1'));

  console.log('');
  console.log("4. UI 2's real renderer accepts the backend's output");

  const html = md(panel?.[1]?.text ?? '');
  check('markdown renders into HTML', html.includes('<p>') || html.includes('<strong>'), html.slice(0, 80));
  check('the headline becomes bold', html.includes('<strong>'));
  check('the fix is visible in the output', html.includes('Fix:'));
  check('the save correlation reaches the rendered card', html.includes('auth.py'));
  check('no raw markdown asterisks leak through', !html.includes('**'));

  const titleHtml = terminalTitle(display?.title ?? '');
  check('the error type is coloured like a terminal', titleHtml.includes('<span class="err">TypeError:</span>'), titleHtml);

  console.log('');
  console.log('5. A malformed report must not take the server down');

  const garbageP = nextReply();
  ws.send(JSON.stringify({ type: 'error.reported' }));   // no fields at all
  const garbage = await garbageP;
  check('a fields-less report still gets an answer', garbage?.type === 'explanation');
  check('it still has a usable panel array', Array.isArray(garbage?.panel) && garbage.panel.length === 2);
  check('it still has a non-empty headline', !!garbage?.explanation?.headline);

  // The server must survive a message it cannot even parse.
  ws.send('this is not json at all');
  await wait(150);
  const aliveP = nextReply();
  ws.send(JSON.stringify({
    type: 'error.reported',
    errorId: 'e2e-after-garbage',
    message: 'IndentationError: unexpected indent',
    file: 'C:/dev/demo/auth.py',
    line: 12,
    column: 1,
    language: 'python',
    severity: 'error',
  }));
  const alive = await aliveP;
  check('the server is still answering after unparseable input', alive?.errorId === 'e2e-after-garbage');

  console.log('');
  console.log('6. An unknown language id still finds an explanation');

  const aliasP = nextReply();
  ws.send(JSON.stringify({
    type: 'error.reported',
    errorId: 'e2e-alias',
    message: "Property 'age' does not exist on type 'User'.",
    file: 'C:/dev/demo/u.tsx',
    line: 6,
    column: 15,
    language: 'typescriptreact',      // VS Code's id for TSX
    severity: 'error',
  }));
  const alias = await aliasP;
  check(
    '"typescriptreact" matched the TypeScript library',
    !!alias?.explanation?.headline && alias.explanation.headline.toLowerCase().includes('type'),
    alias?.explanation?.headline,
  );
  check('language name renders as TSX', alias?.display?.language === 'TSX', alias?.display?.language);

  ws.close();
  wss.close();

  console.log('');
  console.log('==================================================');
  console.log('   ' + passed + ' passed, ' + failed + ' failed');
  console.log('==================================================');
  process.exit(failed > 0 ? 1 : 0);
}

main();
