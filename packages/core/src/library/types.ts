export type LibraryEntry = {
  id: string;
  language: string;          // 'python' | 'javascript' | 'typescript'
  pattern: RegExp;           // match a SHORT, STABLE fragment
  headline: string;          // one line, plain English
  cause: string;             // why it happened
  fix: string;               // what to change
  snippet?: string;          // copy-pasteable code for the fix, shown with a Copy button
};
