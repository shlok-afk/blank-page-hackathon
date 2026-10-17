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

// How the wording changes with the narration setting. The default (balanced,
// 50) produces exactly the original output, so nothing changes unless the user
// actually moves the slider.
export type Tone = 'pro' | 'balanced' | 'baby';

export function toneFor(narration?: number): Tone {
  if (typeof narration !== 'number' || Number.isNaN(narration)) return 'balanced';
  if (narration < 34) return 'pro';    // terse: what happened and the fix
  if (narration > 66) return 'baby';   // hand-holding: reassurance and steps
  return 'balanced';
}

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

export function toMarkdown(e: Explanation, language = '', narration?: number): string {
  const tone = toneFor(narration);
  const parts: string[] = [];

  parts.push('**' + e.headline + '**');

  // Baby mode opens with reassurance: beginners quit over red squiggles, so
  // the first thing they read should tell them it is normal and fixable.
  if (tone === 'baby') parts.push("Don't worry — this is a common one, and it's easy to fix.");

  // Pro mode drops the cause: it wants the answer, not the lecture.
  if (tone !== 'pro') parts.push(e.cause);

  parts.push('**Fix:** ' + e.fix);

  // A fenced block gets a Copy button in the panel.
  if (e.snippet) parts.push('```' + language.toLowerCase() + '\n' + e.snippet + '\n```');

  // Baby mode spells out what to do with the snippet.
  if (tone === 'baby' && e.snippet) {
    parts.push('Copy the code above, swap in your own variable names, and save. The red squiggle should go away.');
  }

  // The save correlation is the whole point of the product - give it
  // its own paragraph so it is never buried.
  if (e.relatedSave) parts.push(e.relatedSave);

  return parts.join('\n\n');
}

export function toDisplay(input: RenderInput, explanation: Explanation, narration?: number): DisplayBlock {
  const line = input.line && input.line > 0 ? input.line : 1;
  const location = input.file ? basename(input.file) + ':' + line : '';

  return {
    title: (input.message || 'Unknown error').trim(),
    language: languageName(input.language),
    location,
    source: input.source || errorTypeOf(input.message) || '',
    text: toMarkdown(explanation, input.language, narration),
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
