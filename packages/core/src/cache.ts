import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const DIR = join(homedir(), '.squiggle');
const FILE = join(DIR, 'cache.json');

export type Cached = { headline: string; cause: string; fix: string; snippet?: string };

let memory: Record<string, Cached> | null = null;

function load(): Record<string, Cached> {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    // A hand-edited or truncated file can be valid JSON but not an object.
    memory = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    memory = {};
  }
  return memory!;
}

function persist() {
  try {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(memory, null, 2));
  } catch (e) {
    console.log('[cache] could not save:', e);
  }
}

export function cacheKey(message: string, language: string): string {
  return createHash('sha1').update(language + '|' + message).digest('hex');
}

export function cacheGet(key: string): Cached | undefined {
  return load()[key];
}

export function cacheSet(key: string, value: Cached) {
  load()[key] = value;
  persist();
}
