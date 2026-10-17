// Tests our library against REAL error messages captured from real tools.
//
// 1. Paste real messages into real-messages.txt, one per line:
//        language | message
// 2. Run:  npx tsx packages/core/dev/coverage.ts
//
// Anything that says NO ENTRY is a gap worth filling.
import { readFileSync } from 'fs';
import { join } from 'path';
import { lookupInLibrary } from '../src/library/index';
import { explainUnknown } from '../src/classify';

const path = join(__dirname, 'real-messages.txt');

const lines = readFileSync(path, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'));

let matched = 0;

console.log('');
for (const line of lines) {
  const cut = line.indexOf('|');
  if (cut === -1) {
    console.log('SKIPPED (no "|" found): ' + line);
    continue;
  }

  const language = line.slice(0, cut).trim();
  const message = line.slice(cut + 1).trim();

  const entry = lookupInLibrary(message, language);

  if (entry) {
    matched++;
    console.log('MATCHED   [' + language + ']  ' + entry.id);
  } else {
    const guess = explainUnknown(message, language);
    console.log('NO ENTRY  [' + language + ']  -> ' + guess.headline);
  }
  console.log('          "' + message + '"');
  console.log('');
}

console.log('========================================');
console.log('  ' + matched + ' of ' + lines.length + ' matched a library entry');
console.log('========================================');
