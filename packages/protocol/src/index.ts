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
};

export type PluginMessage = HelloMessage | FileSavedMessage | ErrorReportedMessage;

// ---------- Messages the core sends BACK ----------

export type Explanation = {
  headline: string;              // one-line plain-English summary
  cause: string;                 // why it happened
  fix: string;                   // what to change
  relatedSave: string | null;    // "12s after you saved auth.py:88", or null
};

export type ExplanationMessage = {
  type: 'explanation';
  errorId: string;               // matches the error.reported it answers
  explanation: Explanation;
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