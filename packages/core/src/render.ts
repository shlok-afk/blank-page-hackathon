// Turns a structured Explanation into something a UI can render directly.
//
// This exists so the UI never has to know how an explanation is shaped.
// It receives a finished title, a finished location, and finished markdown.
import { basename } from 'path';
import { Explanation, DisplayBlock, PanelMessage } from '../../protocol/src/index';

export type RenderInput = {
  errorId: string;
  message: string;
  file: string;
  line: number;
  language: string;
  source?: string;
};

// VS Code language ids -> something a human reads. Unknown ids pass through.
const LANGUAGE_NAMES: Record<string, string> = {
  python: 'Python',
  python3: 'Python',
  py: 'Python',
  typescript: 'TypeScript',
  typescriptreact: 'TSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  javascript: 'JavaScript',
  javascriptreact: 'JSX',
  js: 'JavaScript',
  jsx: 'JSX',
};

export function languageName(id: string): string {
  if (!id) return '';
  const key = id.toLowerCase();
  return LANGUAGE_NAMES[key] ?? id;
}

// 'TypeError: ...' -> 'TypeError'. Used as a display fallback when the
// plugin did not tell us which tool produced the error.
function errorTypeOf(message: string): string {
  const m = /\b([A-Z]\w*(?:Error|Exception))\b/.exec(message);
  return m ? m[1] : '';
}

export function toMarkdown(e: Explanation): string {
  const parts: string[] = [];

  parts.push('**' + e.headline + '**');
  parts.push(e.cause);
  parts.push('**Fix:** ' + e.fix);

  // The save correlation is the whole point of the product - give it
  // its own paragraph so it is never buried.
  if (e.relatedSave) parts.push(e.relatedSave);

  return parts.join('\n\n');
}

export function toDisplay(input: RenderInput, explanation: Explanation): DisplayBlock {
  const line = input.line && input.line > 0 ? input.line : 1;
  const location = input.file ? basename(input.file) + ':' + line : '';

  return {
    title: (input.message || 'Unknown error').trim(),
    language: languageName(input.language),
    location,
    source: input.source || errorTypeOf(input.message) || '',
    text: toMarkdown(explanation),
  };
}

// Verbatim messages for a renderer that speaks this shape.
// Order matters: start first, then the finished explanation.
export function toPanelMessages(display: DisplayBlock, id: string): PanelMessage[] {
  return [
    {
      type: 'start',
      id,
      title: display.title,
      language: display.language,
      location: display.location,
      source: display.source,
    },
    { type: 'explanation', id, text: display.text },
  ];
}
