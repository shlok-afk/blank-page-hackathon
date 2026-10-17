import { basename } from 'path';
import { explain } from './explain';
import { ErrorReportedMessage, Explanation } from '../../protocol/src/index';

type SaveRecord = { file: string; at: number };

const saveHistory: SaveRecord[] = [];
const timers = new Map<string, any>();

// Remember every save
export function onFileSaved(file: string) {
  console.log('[pipeline] save recorded:', file);
  saveHistory.push({ file, at: Date.now() });
}

// Wait for typing to stop, then explain
export function onError(
  e: ErrorReportedMessage,
  delayMs = 1200,
): Promise<Explanation> {
  const key = `${e.file}:${e.line}:${e.message}`;

  // A repeat of the same error throws away the old timer and starts over.
  // If they keep typing, this never fires.
  clearTimeout(timers.get(key));

  return new Promise((resolve) => {
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      console.log('[pipeline] explaining', e.file + ':' + e.line);

      const lastSave = findLastSave(e.file);
      let relatedSave: string | null = null;

      if (lastSave) {
        const seconds = Math.round((Date.now() - lastSave.at) / 1000);
        relatedSave = `${seconds}s after you saved ${basename(lastSave.file)}`;
      }

      resolve(await explain(
        { message: e.message, file: e.file, line: e.line, language: e.language },
        relatedSave,
      ));
    }, delayMs));
  });
}

function findLastSave(file: string): SaveRecord | undefined {
  for (let i = saveHistory.length - 1; i >= 0; i--) {
    if (saveHistory[i].file === file) return saveHistory[i];
  }
  return undefined;
}