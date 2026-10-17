import * as vscode from 'vscode';
import { SAMPLES } from './samples';
import { connectToCore } from './connection';

// Messages the panel understands. `chunk` and `explanation` match the core protocol,
// so UI 1 can forward core messages straight through.
export type PanelMessage =
  | { type: 'start'; id: string; title: string; language?: string; location?: string; source?: string }
  | { type: 'chunk'; id: string; delta: string }
  | { type: 'explanation'; id: string; text: string }
  | { type: 'resolve'; id: string }; // the error is gone: remove its card

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
    view.webview.onDidReceiveMessage((m) => {
      if (m?.type === 'ready') this.markReady();
      if (m?.type === 'openSettings') vscode.commands.executeCommand('squiggle.showWelcome');
    });
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
  <div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>
    <strong>All clear</strong>
    <p>When an error shows up in your code, a plain-language explanation will appear here, with a fix you can copy.</p>
    <p class="hint">Want it quieter, chattier, or offline? <button type="button" class="link" id="open-settings">Open settings</button> or click the gear icon above.</p>
  </div>
  <script nonce="${nonce}" src="${asset('panel.js')}"></script>
</body>
</html>`;
  }

  // Waits for the panel to load, so explanations that arrive before it's opened aren't lost.
  post(msg: PanelMessage) {
    this.ready.then(() => this.view?.webview.postMessage(msg));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The core sends whole explanations; play them out word by word so they read as live.
// ponytail: local animation, drop this once the core streams real `chunk`s.
const streams = new Map<string, number>();
async function streamText(panel: ExplanationPanel, id: string, text: string) {
  const run = (streams.get(id) ?? 0) + 1;
  streams.set(id, run);
  for (const word of text.match(/\S+\s*/g) ?? []) {
    if (streams.get(id) !== run) return; // a newer report of this error took over the card
    panel.post({ type: 'chunk', id, delta: word });
    await sleep(25);
  }
  panel.post({ type: 'explanation', id, text });
}

async function playSamples(panel: ExplanationPanel) {
  await vscode.commands.executeCommand('squiggle.panel.focus');
  await panel.ready;
  for (const s of SAMPLES) {
    panel.post({ type: 'start', id: s.id, title: s.title, language: s.language, location: s.location, source: s.source });
    await sleep(400); // fake "thinking" time
    await streamText(panel, s.id, s.text);
  }
}

// Settings UI filtered to our contributes.configuration block.
const openSettings = () => vscode.commands.executeCommand('workbench.action.openSettings', 'squiggle');

// Carries settings saved under the old `errorExplainer.*` name over to `squiggle.*`.
async function migrateOldSettings() {
  const old = vscode.workspace.getConfiguration('errorExplainer');
  const cfg = vscode.workspace.getConfiguration('squiggle');
  for (const key of ['patience', 'narration', 'contextLines']) {
    const was = old.inspect(key);
    const now = cfg.inspect(key);
    if (was?.globalValue !== undefined && now?.globalValue === undefined)
      await cfg.update(key, was.globalValue, vscode.ConfigurationTarget.Global);
    if (was?.workspaceValue !== undefined && now?.workspaceValue === undefined && vscode.workspace.workspaceFolders)
      await cfg.update(key, was.workspaceValue, vscode.ConfigurationTarget.Workspace);
  }
}

export function activate(context: vscode.ExtensionContext) {
  migrateOldSettings();
  const panel = new ExplanationPanel(context.extensionUri);
  const conn = connectToCore((m: PanelMessage) => {
    if (m.type === 'explanation') return streamText(panel, m.id, m.text);
    if (m.type === 'resolve') streams.delete(m.id); // stops any word-by-word playback for it
    panel.post(m);
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('squiggle.panel', panel, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('squiggle.playSamples', () => playSamples(panel)),
    vscode.commands.registerCommand('squiggle.showWelcome', openSettings),
    { dispose: () => conn.stop() },
  );

  // First run only: pop the settings open so people see what they can tune.
  if (!context.globalState.get('setupShown')) {
    context.globalState.update('setupShown', true);
    openSettings();
  }
}
