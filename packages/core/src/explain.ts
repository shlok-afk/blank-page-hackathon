import { Explanation } from '../../protocol/src/index';
import { lookupInLibrary } from './library/index';
import { cacheGet, cacheSet, cacheKey, Cached } from './cache';
import { explainUnknown } from './classify';
import { suggestFix } from './suggest';

export type ExplainInput = {
  message: string;
  file: string;
  line: number;
  language: string;
  lineText?: string;         // the broken line, for a line-specific suggestion
  codeContext?: string;      // nearby lines: their names help spot typos
};

export async function explain(
  error: ExplainInput,
  relatedSave?: string | null,
): Promise<Explanation> {
  // When we can see the broken line, its fixed version beats a generic fix.
  // Applied after the cache: it depends on the line, not just the message.
  const suggestion = suggestFix(error.message, error.lineText, error.codeContext);
  return { ...describe(error), ...suggestion, relatedSave: relatedSave ?? null };
}

function describe(error: ExplainInput): Cached {
  // 1. Is it in our library? Checked before the cache so library edits
  //    (new snippets, better wording) show up without clearing the cache.
  const entry = lookupInLibrary(error.message, error.language);
  if (entry) {
    const { headline, cause, plain, fix, snippet } = entry;
    return { headline, cause, plain, fix, snippet };
  }

  // 2. Have we seen this exact error before?
  const key = cacheKey(error.message, error.language);
  const cached = cacheGet(key);
  if (cached) return cached;

  // 3. Unknown error - classify it with rules
  const guess = explainUnknown(error.message, error.language);
  cacheSet(key, guess);
  return guess;
}
