import * as vscode from 'vscode';

// The connected / offline indicator BUILDPLAN asks for, driven by the core
// connection and controlled by the `errorExplainer.statusBar` setting.
export class StatusBarItem implements vscode.Disposable {
  private item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  constructor() {
    this.item.command = 'errorExplainer.showWelcome';
    this.setConnected(false);
  }

  setConnected(ok: boolean) {
    this.item.text = ok ? '$(check) Explainer connected' : '$(debug-disconnect) Explainer offline';
    this.item.tooltip = ok
      ? 'Error Explainer is connected to the core. Click for setup.'
      : 'Error Explainer cannot reach the core yet - it keeps retrying. Click for setup.';
    // Offline is expected while the core boots, so a quiet warning tint, not red.
    this.item.backgroundColor = ok ? undefined : new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.show();
  }

  setVisible(visible: boolean) {
    if (visible) this.item.show();
    else this.item.hide();
  }

  dispose() {
    this.item.dispose();
  }
}
