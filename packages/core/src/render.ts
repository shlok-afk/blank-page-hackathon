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
  narration?: number;
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

// The narration slider's stops (see the welcome screen). A value snaps to the
// nearest one, exactly like the slider's label does.
export type Depth = 'pro' | 'balanced' | 'friendly' | 'baby';
const STOPS: Array<[number, Depth]> = [[0, 'pro'], [33, 'balanced'], [66, 'friendly'], [100, 'baby']];
export function depthOf(narration = 33): Depth {
  return STOPS.reduce((best, s) => (Math.abs(s[0] - narration) < Math.abs(best[0] - narration) ? s : best))[1];
}

const REASSURANCE = [
  "Don't worry: this is one of the most common errors there is, and everyone hits it while learning.",
  'Errors like this are a normal part of coding. Even experienced programmers see this one all the time.',
  "You're doing fine. Reading an error like this is how everyone learns a new language.",
];

export function toMarkdown(e: Explanation, language = '', depth: Depth = 'balanced'): string {
  const parts: string[] = [];
  // Rule-based guesses have no beginner wording; they fall back to the cause.
  const plain = e.plain ?? e.cause;

  parts.push('**' + e.headline + '**');
  if (depth === 'balanced') parts.push(e.cause);
  if (depth === 'friendly' || depth === 'baby') parts.push(plain);
  if (depth === 'baby' && e.plain) parts.push('**Why it happened:** ' + e.cause);
  parts.push('**Fix:** ' + e.fix);

  // A fenced block gets a Copy button in the panel.
  if (e.snippet) parts.push('```' + language.toLowerCase() + '\n' + e.snippet + '\n```');

  // The save correlation is the whole point of the product - give it
  // its own paragraph so it is never buried.
  if (e.relatedSave) parts.push(e.relatedSave);

  if (depth === 'baby') parts.push(REASSURANCE[e.headline.length % REASSURANCE.length]);

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
    text: toMarkdown(explanation, input.language, depthOf(input.narration)),
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
