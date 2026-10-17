// Builds the browser playground (the Devpost demo link) from the real code:
// the core's library + classifier, and the extension's panel.css / panel.js.
// Run:  npm run playground   ->  out/playground.html
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const lib = buildSync({
  stdin: {
    contents: "export { lookupInLibrary } from '../src/library/index';\nexport { explainUnknown } from '../src/classify';\nexport { suggestFix } from '../src/suggest';",
    resolveDir: __dirname,
    loader: 'ts',
  },
  bundle: true,
  format: 'iife',
  globalName: 'Explainer',
  platform: 'browser',
  write: false,
}).outputFiles[0].text;

// split/join, not replace(): the inlined code contains `$` sequences replace() would interpret.
const fill = (html: string, key: string, value: string) => html.split(key).join(value);

let html = read('packages/core/dev/playground.html');
html = fill(html, '/*PANEL_CSS*/', read('packages/vscode/media/panel.css'));
html = fill(html, '/*LIB_JS*/', lib);
html = fill(html, '/*PANEL_JS*/', read('packages/vscode/media/panel.js'));

mkdirSync(join(root, 'out'), { recursive: true });
writeFileSync(join(root, 'out/playground.html'), html);
console.log('wrote out/playground.html (' + Math.round(html.length / 1024) + ' KB)');
