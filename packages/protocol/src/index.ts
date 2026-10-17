// ---------- Messages a plugin sends TO the core ----------

export type HelloMessage = {
  type: 'hello';
  pluginId: string;
  editor: string;        // 'vscode', 'nvim', ...
};

export type FileSavedMessage = {
  type: 'file.saved';
  file: string;          // absolute path
};

export type ErrorReportedMessage = {
  type: 'error.reported';
  errorId: string;       // unique id; the reply is matched by this
  message: string;       // the raw error text
  file: string;
  line: number;
  column: number;
  language: string;      // 'typescript', 'python', ...
  severity: string;      // 'error' | 'warning'
  source?: string;       // optional: 'Pylance', 'ts(2339)' - shown in the panel
  narration?: number;    // explanation depth: 0 (terse) to 100 (hand-holding), default 33 (Balanced)
};

export type PluginMessage = HelloMessage | FileSavedMessage | ErrorReportedMessage;

// ---------- What the core sends BACK ----------

export type Explanation = {
  headline: string;              // one-line plain-English summary
  cause: string;                 // why it happened
  plain?: string;                // the same idea in beginner words (library entries only)
  fix: string;                   // what to change
  snippet?: string;              // copy-pasteable code for the fix
  relatedSave: string | null;    // "You saved auth.py 12 seconds before this error appeared.", or null
};

// A ready-to-render block. The core builds this so a UI never has to
// assemble it from the structured fields above.
export type DisplayBlock = {
  title: string;                 // the raw error line, e.g. "NameError: name 'pritn' is not defined"
  language: string;              // display name, e.g. "Python"
  location: string;              // "auth.py:88"
  source: string;                // "Pylance" / "TypeError" / ""
  text: string;                  // markdown: paragraphs, **bold**, `code`, lists, ``` fences
};

// The exact shape a renderer consumes. A UI can forward these verbatim,
// with no field renaming and no markdown assembly of its own.
export type PanelStartMessage = {
  type: 'start';
  id: string;
  title: string;
  language?: string;
  location?: string;
  source?: string;
};

export type PanelExplanationMessage = {
  type: 'explanation';
  id: string;
  text: string;
};

export type PanelMessage = PanelStartMessage | PanelExplanationMessage;

export type ExplanationMessage = {
  type: 'explanation';
  errorId: string;               // matches the error.reported it answers
  explanation: Explanation;      // structured form
  display: DisplayBlock;         // ready-to-render form
  panel: PanelMessage[];         // ready-to-forward form (verbatim, in order)
};

export type CoreMessage = ExplanationMessage;

// ---------- Simple checks ----------

export function isPluginMessage(value: any): value is PluginMessage {
  if (!value || typeof value.type !== 'string') return false;
  return ['hello', 'file.saved', 'error.reported'].includes(value.type);
}

export function isCoreMessage(value: any): value is CoreMessage {
  if (!value || typeof value.type !== 'string') return false;
  return value.type === 'explanation';
}
