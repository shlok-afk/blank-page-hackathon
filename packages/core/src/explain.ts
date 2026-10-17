import { Explanation } from '../../protocol/src/index';
import { lookupInLibrary } from './library/index';
import { cacheGet, cacheSet, cacheKey, Cached } from './cache';
import { explainUnknown } from './classify';

export type ExplainInput = {
  message: string;
  file: string;
  line: number;
  language: string;
  codeContext?: string;      // unused for now - kept for the future AI option
};

export async function explain(
  error: ExplainInput,
  relatedSave?: string | null,
): Promise<Explanation> {
  const key = cacheKey(error.message, error.language);

  // 1. Have we seen this exact error before?
  const cached = cacheGet(key);
  if (cached) {
    return { ...cached, relatedSave: relatedSave ?? null };
  }

  // 2. Is it in our library?
  const entry = lookupInLibrary(error.message, error.language);
  if (entry) {
    const result: Cached = { headline: entry.headline, cause: entry.cause, fix: entry.fix };
    cacheSet(key, result);
    return { ...result, relatedSave: relatedSave ?? null };
  }

  // 3. Unknown error - classify it with rules
  const guess = explainUnknown(error.message, error.language);
  cacheSet(key, guess);
  return { ...guess, relatedSave: relatedSave ?? null };
}
