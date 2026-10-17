import { basename } from 'path';
import { explain } from './explain';
import { ErrorReportedMessage, Explanation } from '../../protocol/src/index';

type SaveRecord = { file: string; at: number };

const saveHistory: SaveRecord[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const FALLBACK: Explanation = {
  headline: 'The explainer could not handle this one',
  cause: 'Something inside the backend failed while working on this error.',
  fix: 'Save the file again. If it keeps happening, check the core terminal for the real cause.',
  relatedSave: null,
};

// Windows hands back the same file as C:\a\b.py or C:/a/b.py depending on
// which API produced it, and the drive letter can differ in case. Normalise
// before comparing - otherwise a save and its error silently fail to
// correlate, which is the one feature this whole project is built around.
function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function humanDelay(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return seconds === 1 ? '1 second' : seconds + ' seconds';
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 minute' : minutes + ' minutes';
}

// Remember every save.
export function onFileSaved(file: string) {
  if (!file) return;
  console.log('[pipeline] save recorded:', file);
  saveHistory.push({ file, at: Date.now() });
}

// Wait for typing to stop, then explain.
export function onError(
  e: ErrorReportedMessage,
  delayMs = 1200,
): Promise<Explanation> {
  const key = [normalizePath(e.file), e.line, e.message].join('|');

  // A repeat of the same error throws away the old timer and starts over.
  // If they keep typing, this never fires.
  clearTimeout(timers.get(key));

  return new Promise((resolve) => {
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      console.log('[pipeline] explaining', e.file + ':' + e.line);

      try {
        const lastSave = findLastSave(e.file);
        let relatedSave: string | null = null;

        if (lastSave) {
          const name = basename(lastSave.file);
          relatedSave =
            'You saved ' + name + ' ' +
            humanDelay(Date.now() - lastSave.at) +
            ' before this error appeared.';
        }

        resolve(await explain(
          { message: e.message, file: e.file, line: e.line, language: e.language, lineText: e.lineText, codeContext: e.context },
          relatedSave,
        ));
      } catch (err: any) {
        // If this throws and nobody catches it, it becomes an unhandled
        // rejection and takes the whole core process down mid-demo.
        // Always resolve with something usable instead.
        console.log('[pipeline] explanation failed:', err?.message ?? err);
        resolve(FALLBACK);
      }
    }, delayMs));
  });
}

function findLastSave(file: string): SaveRecord | undefined {
  const target = normalizePath(file);
  if (!target) return undefined;
  for (let i = saveHistory.length - 1; i >= 0; i--) {
    if (normalizePath(saveHistory[i].file) === target) return saveHistory[i];
  }
  return undefined;
}
