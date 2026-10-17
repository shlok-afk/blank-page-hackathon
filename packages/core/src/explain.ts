import { Explanation } from '../../protocol/src/index';

export async function explain(
  error: { message: string; file: string; line: number; language: string },
  relatedSave?: string | null,
): Promise<Explanation> {
  return {
    headline: 'STUB: ' + error.message.slice(0, 40),
    cause: 'STUB: this is where the real cause goes',
    fix: 'STUB: this is where the real fix goes',
    relatedSave: relatedSave ?? null,
  };
}