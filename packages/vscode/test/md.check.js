// Run: node test/md.check.js — checks the panel's markdown renderer (escaping matters: AI text is untrusted).
const assert = require('node:assert');
globalThis.document = { getElementById: () => ({}) };
globalThis.window = { addEventListener() {} };
const { md } = require('../media/panel.js');

assert.equal(md('Use `a**b**` and **bold**'), '<p>Use <code>a**b**</code> and <strong>bold</strong></p>');
assert.equal(md('<img src=x onerror=alert(1)>'), '<p>&#60;img src=x onerror=alert(1)&#62;</p>');
assert.equal(md('```py\nx = "<b>"\n```'), '<pre data-lang="py"><code>x = &#34;&#60;b&#62;&#34;</code></pre>');
assert.equal(md('- one\n- two'), '<ul><li>one</li><li>two</li></ul>');
assert.equal(md('1. one\n2. two'), '<ol><li>one</li><li>two</li></ol>');
assert.equal(md('Fix:\n\n```js\nlet a'), '<p>Fix:</p><pre data-lang="js"><code>let a</code></pre>'); // unclosed fence mid-stream
console.log('md ok');
