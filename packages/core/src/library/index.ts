import { LibraryEntry } from './types';
import { pythonErrors } from './python';
import { javascriptErrors, typescriptErrors } from './javascript';

export const allEntries: LibraryEntry[] = [
  ...pythonErrors,
  ...javascriptErrors,
  ...typescriptErrors,
];

// Editors label the same language a dozen ways: VS Code sends
// 'typescriptreact', a terminal might say 'tsx', a human types 'TS'.
// Fold them all onto the ids our entries use, so a pattern never misses
// just because the caller picked a different spelling.
const LANGUAGE_ALIASES: Record<string, string> = {
  py: 'python',
  python: 'python',
  python3: 'python',
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'typescriptreact',
  typescriptreact: 'typescriptreact',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascriptreact',
  javascriptreact: 'javascriptreact',
};

function canonical(lang: string): string {
  const key = (lang || '').toLowerCase().trim();
  return LANGUAGE_ALIASES[key] ?? key;
}

function languageMatches(entryLang: string, incoming: string): boolean {
  const a = canonical(entryLang);
  const b = canonical(incoming);
  if (!b) return true;              // unknown language - try anything
  return b === a || b.includes(a);  // 'typescriptreact' also covers 'typescript'
}

// Different tools quote things differently:
//   tsc / Pylance:  Property 'foo' does not exist
//   Pylance:        "NoneType" object is not subscriptable
// Normalising quotes means one pattern covers both.
function normalizeQuotes(message: string): string {
  return message.replace(/[\u2018\u2019\u201C\u201D"']/g, "'");
}

export function lookupInLibrary(message: string, language: string): LibraryEntry | undefined {
  const normalized = normalizeQuotes(message);
  return allEntries.find(
    (e) => languageMatches(e.language, language) && e.pattern.test(normalized),
  );
}
