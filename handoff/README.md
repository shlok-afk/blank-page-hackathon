# Handoff: the one wire between the UI and the backend

Everything below the extension is finished, tested, and running.

You do **not** need to understand the backend, translate anything, or match
any field names. The core hands you finished messages. Your job is to forward
them.

---

## The deal

```
VS Code  ──(1) send me these 3 things──▶  core  ──(2) here are your messages──▶  panel
```

**(1) You send three kinds of message to `ws://localhost:4321`:**

```js
{ type: 'hello',        pluginId: 'vscode-1', editor: 'vscode' }
{ type: 'file.saved',   file: 'C:\\dev\\demo\\auth.py' }
{ type: 'error.reported', errorId: '...', message: '...', file: '...',
  line: 88, column: 3, language: 'python', severity: 'error', source: 'Pylance' }
```

**(2) The core sends one kind back.** It already contains a `panel` array
shaped exactly like the messages `panel.js` listens for:

```json
{
  "type": "explanation",
  "errorId": "C:\\dev\\demo\\auth.py:88:3:TypeError: ...",
  "explanation": { "headline": "...", "cause": "...", "fix": "...", "relatedSave": "..." },
  "display": { "title": "...", "language": "Python", "location": "auth.py:88",
               "source": "Pylance", "text": "**...**\n\n...\n\n**Fix:** ..." },
  "panel": [
    { "type": "start",       "id": "...", "title": "...", "language": "Python",
                             "location": "auth.py:88", "source": "Pylance" },
    { "type": "explanation", "id": "...", "text": "**...**\n\n...\n\n**Fix:** ..." }
  ]
}
```

`panel` is ready to forward **verbatim**. No renaming, no markdown assembly.

---

## Wiring it up (3 steps, ~3 minutes)

**1.** Copy `handoff/vscode-connection.ts` into `packages/vscode/src/connection.ts`.

**2.** Inside `packages/vscode`, install the socket library:

```powershell
cd packages\vscode
npm i ws
npm i -D @types/ws
```

**3.** In `packages/vscode/src/extension.ts`, add two lines to `activate()`:

```ts
import { connectToCore } from './connection';

export function activate(context: vscode.ExtensionContext) {
  const panel = new ExplanationPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('squiggle.panel', panel, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('squiggle.playSamples', () => playSamples(panel)),
  );

  // ---- the whole integration is these two lines ----
  const conn = connectToCore((m) => panel.post(m));
  context.subscriptions.push({ dispose: () => conn.stop() });
}
```

Done. `playSamples` still works, so the demo can fall back to samples if the
core is not running.

---

## Things that are already handled for you

You do **not** need to worry about any of these — they were the bugs waiting
to happen, and they are fixed:

| Trap | Handled |
|---|---|
| VS Code lines are 0-based, the core is 1-based | ✅ added 1 in `connection.ts` |
| Windows gives `C:\a\b.py` and `C:/a/b.py` for the same file | ✅ the core normalises paths before matching your save |
| `onDidChangeDiagnostics` fires on every keystroke | ✅ only newly-appeared errors are sent; the core also debounces |
| The core is not running yet | ✅ retries every 1.5s, and catches up when it connects |
| Diagnostics include warnings and hints | ✅ only `DiagnosticSeverity.Error` is sent |
| The backend throws on a weird error | ✅ it always answers, never goes silent |
| A card without an `id` is dropped by `panel.js` | ✅ every message has one |

---

## Testing without VS Code

The backend has a full end-to-end test that runs a real error through a real
WebSocket, then feeds the result into **your actual `panel.js` renderer**:

```powershell
npm run e2e      # 27 checks, includes the real markdown renderer
```

If that passes, the wire is correct. If you change `panel.js` in a way that
breaks the backend's output, this test will catch it.

Also useful:

```powershell
npm run dev      # start the core on ws://localhost:4321
npm run fake     # pretend to be the extension; prints the reply it gets back
npm run verify   # 22 backend checks
npm run check    # TypeScript
```

---

## What the core does *not* do

Be aware of these so nothing is a surprise:

- **It does not stream.** You get `start` + `explanation` in one shot, and
  `panel.js` renders the complete card. The typing animation only happens in
  `playSamples`. If you want it live, animate the text locally before posting
  `explanation` — the `display.text` field is there for that.
- **It only knows a fixed library of errors.** Anything unknown still gets an
  explanation, but a generic one. Ask me to add an error and it takes a minute.
