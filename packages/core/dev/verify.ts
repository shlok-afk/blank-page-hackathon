// Proof that every layer of the backend works.
// Run with:  npm run verify
import { lookupInLibrary } from '../src/library/index';
import { explainUnknown } from '../src/classify';
import { cacheKey, cacheGet, cacheSet } from '../src/cache';
import { explain } from '../src/explain';
import { onFileSaved, onError } from '../src/pipeline';
import { toMarkdown } from '../src/render';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log('  PASS   ' + name);
  } else {
    failed++;
    console.log('  FAIL   ' + name + (detail ? '   (' + detail + ')' : ''));
  }
}

function section(title: string) {
  console.log('');
  console.log(title);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // ---------- 1. Library ----------
  section('1. Library lookup (hand-written explanations)');
  check(
    'python: NoneType subscript',
    lookupInLibrary("TypeError: 'NoneType' object is not subscriptable", 'python')?.id === 'py-none-subscript',
  );
  check(
    'python: ModuleNotFoundError',
    lookupInLibrary('ModuleNotFoundError: No module named requests', 'python')?.id === 'py-modulenotfound',
  );
  check(
    'python: IndentationError',
    lookupInLibrary('IndentationError: unexpected indent', 'python')?.id === 'py-indentation',
  );
  check(
    'javascript: is not a function',
    lookupInLibrary('TypeError: x is not a function', 'javascript')?.id === 'js-not-a-function',
  );
  check(
    'javascript: EADDRINUSE',
    lookupInLibrary('EADDRINUSE: address already in use :::4321', 'javascript')?.id === 'js-eaddrinuse',
  );
  check(
    'typescript matched via "typescriptreact" language id',
    !!lookupInLibrary("Property 'foo' does not exist on type 'Bar'.", 'typescriptreact'),
  );
  check(
    'unknown error correctly returns nothing',
    lookupInLibrary('totally made up error xyz', 'python') === undefined,
  );

  // ---------- 2. Classification ----------
  section('2. Rule-based classification (errors not in the library)');
  check(
    'classifies "not a function"',
    explainUnknown('Value is not a function', 'javascript').headline.includes('not a function'),
  );
  check(
    'classifies syntax errors',
    explainUnknown('SyntaxError: bad thing', 'javascript').headline.toLowerCase().includes('syntax'),
  );
  check(
    'classifies missing modules',
    explainUnknown('Cannot find module "lodash"', 'javascript').headline.length > 0,
  );
  check(
    'always returns something, even for nonsense',
    explainUnknown('qwerty zxcvb', 'python').headline.length > 0,
  );

  // ---------- 3. Cache ----------
  section('3. Cache');
  const k1 = cacheKey('hello', 'python');
  const k2 = cacheKey('hello', 'python');
  const k3 = cacheKey('hello', 'javascript');
  check('same input produces the same key', k1 === k2);
  check('different language produces a different key', k1 !== k3);
  cacheSet('verify-test-key', { headline: 'H', cause: 'C', fix: 'F' });
  check('set then get returns the stored value', cacheGet('verify-test-key')?.headline === 'H');
  check('a missing key returns undefined', cacheGet('definitely-not-here') === undefined);

  // ---------- 4. explain() ----------
  section('4. explain() - the whole brain');
  const libResult = await explain(
    { message: "TypeError: 'NoneType' object is not subscriptable", file: 'x.py', line: 1, language: 'python' },
    '3s after you saved x.py',
  );
  check('returns a headline', libResult.headline.length > 0);
  check('is NOT a stub', !libResult.headline.startsWith('STUB:'), libResult.headline);
  check('carries relatedSave through untouched', libResult.relatedSave === '3s after you saved x.py');
  check('returns all four fields',
    !!libResult.headline && !!libResult.cause && !!libResult.fix && 'relatedSave' in libResult);
  check('a library fix carries a copy-paste snippet', !!libResult.snippet);
  check('the snippet renders as a copyable code block',
    toMarkdown(libResult, 'python').includes('```python\n' + libResult.snippet + '\n```'));

  const unknownResult = await explain(
    { message: 'SomeNeverSeenError ' + Date.now(), file: 'y.ts', line: 9, language: 'typescript' },
  );
  check('an unknown error still gets an explanation', unknownResult.headline.length > 0);

  // ---------- 5. Pipeline ----------
  section('5. Pipeline - debounce and save correlation');
  const errMsg = 'DebounceTestError: ' + Date.now();
  const evt = {
    type: 'error.reported' as const,
    errorId: 'e1',
    message: errMsg,
    file: 'C:/dev/demo/debounce.py',
    line: 12,
    column: 1,
    language: 'python',
    severity: 'error',
  };

  let explained = 0;
  onError(evt, 250).then(() => explained++);
  onError(evt, 250).then(() => explained++);
  onError(evt, 250).then(() => explained++);
  await wait(800);
  check('3 rapid copies of one error become 1 explanation', explained === 1, 'got ' + explained);

  onFileSaved('C:/dev/demo/corr.py');
  const corr = await onError(
    { ...evt, errorId: 'e2', file: 'C:/dev/demo/corr.py', message: 'CorrelationTest ' + Date.now() },
    50,
  );
  check('an error after a save reports which save caused it', !!corr.relatedSave, String(corr.relatedSave));

  // ---------- summary ----------
  console.log('');
  console.log('==================================================');
  console.log('   ' + passed + ' passed, ' + failed + ' failed');
  console.log('==================================================');
  if (failed > 0) process.exit(1);
}

main();
