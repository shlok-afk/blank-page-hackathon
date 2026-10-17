import * as vscode from 'vscode';

// Settings the welcome screen can change. Keep in sync with `contributes.configuration`
// in package.json and with media/welcome.js.
const SETTING_KEYS = [
  'patience',
  'narration',
  'contextLines',
] as const;
type SettingKey = (typeof SETTING_KEYS)[number];

// The welcome & setup screen: explains what the extension is, what to expect,
// and lets the user tune it with liquid-glass sliders. Every control writes a
// real VS Code setting (`squiggle.*`), so it also works from the Settings
// UI and settings.json.
export class WelcomePanel {
  private panel?: vscode.WebviewPanel;

  constructor(private readonly extensionUri: vscode.Uri) {}

  show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'squiggle.welcome',
      'Welcome — Squiggle',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')] },
    );
    this.panel = panel;
    panel.onDidDispose(() => (this.panel = undefined));

    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const asset = (file: string) => panel.webview.asWebviewUri(vscode.Uri.joinPath(media, file));
    const nonce = Math.random().toString(36).slice(2);

    panel.webview.onDidReceiveMessage(async (m) => {
      if (!m) return;
      if (m.type === 'ready') {
        panel.webview.postMessage({ type: 'settings', values: this.readSettings() });
      } else if (m.type === 'set' && SETTING_KEYS.includes(m.key)) {
        // Global so it applies everywhere; each user picks their own comfort level.
        await vscode.workspace.getConfiguration('squiggle').update(m.key, m.value, vscode.ConfigurationTarget.Global);
      } else if (m.type === 'command' && typeof m.id === 'string') {
        vscode.commands.executeCommand(m.id, m.arg);
      } else if (m.type === 'close') {
        panel.dispose();
      }
    });

    // `.saved` is always in the DOM (reserving its width) and only fades in, so
    // a save never reflows the layout or moves a slider out from under the pointer.
    const saved = '<span class="saved" role="status" aria-live="polite"></span>';

    panel.webview.html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="${asset('panel.css')}">
  <link rel="stylesheet" href="${asset('welcome.css')}">
</head>
<body class="welcome">
  <main id="page">
    <header class="hero">
      <img src="${asset('icon.svg')}" alt="" width="56" height="56">
      <div>
        <h1>Squiggle</h1>
        <p class="tagline">Red squiggle in, plain English out.</p>
      </div>
    </header>

    <section class="card">
      <h2>What it is</h2>
      <p>
        Squiggle watches your editor for errors and explains them in plain language — automatically.
        When a red squiggle appears, it's quietly sent to a small program running in the background on your
        computer (the <strong>core</strong>), which waits a moment to make sure the error isn't just a
        half-typed line, then looks up an explanation and shows it in the panel beside your editor.
      </p>
    </section>

    <section class="card">
      <h2>What to expect</h2>
      <ol class="steps">
        <li><strong>You make a mistake.</strong> A red squiggle appears — that's your editor's diagnostic.</li>
        <li><strong>The core thinks for a second.</strong> Errors flicker while you type, so it waits until things settle.</li>
        <li><strong>An explanation appears in the panel.</strong> What went wrong, why, and how to fix it.</li>
      </ol>
      <ul class="bullets">
        <li><strong>Repeat errors are instant.</strong> Explanations are cached, so the second time you see an error it appears immediately and costs nothing.</li>
        <li><strong>Common errors are free.</strong> A built-in library covers frequent Python, JavaScript, and TypeScript mistakes.</li>
        <li><strong>You're in control.</strong> Everything runs on your own computer. Your code is never sent anywhere.</li>
      </ul>
    </section>

    <section class="card">
      <h2>Tune the explainer</h2>
      <p class="hint">
        The sliders shape how it behaves.
        Every pick is saved instantly as a real setting (search <code>squiggle</code> in Settings).
      </p>

      <div class="slider" data-setting="patience">
        <div class="slider-head">
          <div class="setting-text">
            <h3>Patience</h3>
            <p>How long an error must sit still before it's explained. Errors flicker while you type.</p>
          </div>
          <span class="readout" aria-hidden="true"></span>
          ${saved}
        </div>
        <div class="track-wrap">
          <input type="range" min="0" max="5000" step="250" value="1500" data-setting="patience" data-format="ms" aria-label="Patience, from instant to very patient">
          <div class="bubble" aria-hidden="true"></div>
        </div>
        <div class="ticks">
          <span data-at="0">Instant</span>
          <span data-at="1500">Balanced</span>
          <span data-at="3000">Patient</span>
          <span data-at="5000">Deep zen</span>
        </div>
        <div class="slider-foot">
          <span class="ends"><em>Impatient</em><em>Very patient</em></span>
        </div>
      </div>

      <div class="slider" data-setting="narration">
        <div class="slider-head">
          <div class="setting-text">
            <h3>Narration</h3>
            <p>How much hand-holding in explanations, from terse to "you've never seen a variable before".</p>
          </div>
          <span class="readout" aria-hidden="true"></span>
          ${saved}
        </div>
        <div class="track-wrap">
          <input type="range" min="0" max="100" step="1" value="33" data-setting="narration" data-format="score" aria-label="Narration, from terse to hand-holding">
          <div class="bubble" aria-hidden="true"></div>
        </div>
        <div class="ticks">
          <span data-at="0" data-level="pro">Pro</span>
          <span data-at="33" data-level="balanced">Balanced</span>
          <span data-at="66" data-level="friendly">Friendly</span>
          <span data-at="100" data-level="baby">Baby</span>
        </div>
        <div class="slider-foot">
          <span class="ends"><em>Terse</em><em>Hand-holding</em></span>
        </div>

        <div class="preview" aria-live="polite">
          <p class="preview-label">A typo'd <code>print</code>, explained at this level:</p>
          <div class="preview-body" data-level="pro">
            <p><code>pritn</code> is not defined — a typo for <code>print</code>. Fix the spelling.</p>
          </div>
          <div class="preview-body" data-level="balanced">
            <p>Python doesn't know anything called <code>pritn</code>. This is almost always a <strong>typo</strong>: you meant <code>print</code>.</p>
            <p>Python reads names exactly as written, so one swapped letter makes it look like a brand new variable that was never created.</p>
            <p><strong>Fix:</strong> correct the spelling.</p>
          </div>
          <div class="preview-body" data-level="friendly">
            <p>Python doesn't know <code>pritn</code> — you almost certainly meant <code>print</code>.</p>
            <p>Python reads names exactly as written, so one swapped letter makes it look like a name it has never seen. Easy fix: correct the spelling.</p>
          </div>
          <div class="preview-body" data-level="baby">
            <p>Python doesn't know anything called <code>pritn</code>. This is almost always a <strong>typo</strong> — you meant <code>print</code>. Don't worry, this is one of the most common mistakes out there!</p>
            <p>Python reads names exactly as written, so one swapped letter makes it look like a brand new variable that was never created.</p>
            <p><strong>Fix:</strong> correct the spelling. <code>pritn("Hello")</code> → <code>print("Hello")</code></p>
          </div>
        </div>
      </div>

      <div class="slider" data-setting="contextLines">
        <div class="slider-head">
          <div class="setting-text">
            <h3>Context</h3>
            <p>How much surrounding code travels with the error. More context, sharper explanations.</p>
          </div>
          <span class="readout" aria-hidden="true"></span>
          ${saved}
        </div>
        <div class="track-wrap">
          <input type="range" min="0" max="30" step="1" value="10" data-setting="contextLines" data-format="lines" aria-label="Context, from just the error line to a whole function">
          <div class="bubble" aria-hidden="true"></div>
        </div>
        <div class="ticks">
          <span data-at="0">Just the line</span>
          <span data-at="10">Snippet</span>
          <span data-at="20">Surroundings</span>
          <span data-at="30">Whole function</span>
        </div>
        <div class="slider-foot">
          <span class="ends"><em>Private</em><em>Chatty</em></span>
          <span class="chip" data-chip="contextLines"></span>
        </div>
      </div>

    </section>

    <section class="card">
      <h2>Try it</h2>
      <p>See three real explanations — a typo, a TypeScript mistake, and a runtime crash — stream into the panel.</p>
      <div class="actions">
        <button type="button" class="primary" id="play">▶ Play sample explanations</button>
        <button type="button" id="settings">Open all settings</button>
      </div>
    </section>

    <footer>
      <p><strong>Privacy:</strong> everything runs on your own computer. Nothing leaves it.</p>
      <button type="button" class="primary" id="done">Done</button>
    </footer>
  </main>
  <script nonce="${nonce}" src="${asset('welcome.js')}"></script>
</body>
</html>`;
  }

  private readSettings(): Record<SettingKey, unknown> {
    const cfg = vscode.workspace.getConfiguration('squiggle');
    return {
      patience: cfg.get('patience'),
      narration: cfg.get('narration'),
      contextLines: cfg.get('contextLines'),
    };
  }
}
