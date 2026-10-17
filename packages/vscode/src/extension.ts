import * as vscode from 'vscode';
import { SAMPLES } from './samples';

// Messages the panel understands. `chunk` and `explanation` match the core protocol,
// so UI 1 can forward core messages straight through.
export type PanelMessage =
  | { type: 'start'; id: string; title: string; location?: string }
  | { type: 'chunk'; id: string; delta: string }
  | { type: 'explanation'; id: string; text: string };

class ExplanationPanel implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private markReady!: () => void;
  ready = new Promise<void>((r) => (this.markReady = r));

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const asset = (file: string) => view.webview.asWebviewUri(vscode.Uri.joinPath(media, file));
    const nonce = Math.random().toString(36).slice(2);

    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.onDidReceiveMessage((m) => m?.type === 'ready' && this.markReady());
    view.onDidDispose(() => {
      this.view = undefined;
      this.ready = new Promise<void>((r) => (this.markReady = r));
    });
    view.webview.html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="${asset('panel.css')}">
</head>
<body>
  <main id="list" aria-live="polite"></main>
  <p class="empty">No explanations yet. When an error shows up in your code, a plain-language explanation will appear here.</p>
  <script nonce="${nonce}" src="${asset('panel.js')}"></script>
</body>
</html>`;
  }

  post(msg: PanelMessage) {
    this.view?.webview.postMessage(msg);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function playSamples(panel: ExplanationPanel) {
  await vscode.commands.executeCommand('errorExplainer.panel.focus');
  await panel.ready;
  for (const s of SAMPLES) {
    panel.post({ type: 'start', id: s.id, title: s.title, location: s.location });
    await sleep(400); // fake "thinking" time
    for (const word of s.text.match(/\S+\s*/g) ?? []) {
      panel.post({ type: 'chunk', id: s.id, delta: word });
      await sleep(25);
    }
    panel.post({ type: 'explanation', id: s.id, text: s.text });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const panel = new ExplanationPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('errorExplainer.panel', panel, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('errorExplainer.playSamples', () => playSamples(panel)),
  );
}
