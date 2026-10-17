// Run: npx tsx packages/vscode/test/fixes.check.ts — checks the "Fix it for me" rules.
import assert from 'node:assert';
import { ruleFix, distance } from '../src/fixes';

assert.equal(distance('pritn', 'print'), 1);

assert.deepEqual(ruleFix(`"pritn" is not defined`, ['pritn("hi")'], 0, 0, 'python'),
  { line: 0, text: 'print("hi")', label: 'Changed `pritn` to `print`' });
assert.equal(ruleFix(`"total" is not defined`, ['x = total + 1', 'totl = 5'], 0, 4, 'python')?.text, 'x = totl + 1');
assert.equal(ruleFix(`"zzzzzz" is not defined`, ['zzzzzz()'], 0, 0, 'python'), undefined); // nothing close: no guess

assert.equal(ruleFix('Expected ":"', ['if x == 1', '    pass'], 0, 9, 'python')?.text, 'if x == 1:');
assert.equal(ruleFix('Expected ":"', ['def f()  # hi', '    pass'], 1, 0, 'python')?.text, 'def f():  # hi');
assert.equal(ruleFix('Expected ":"', ['x = 1'], 0, 0, 'python'), undefined);

assert.equal(ruleFix('Invalid character', ['print(“hi”)'], 0, 6, 'python')?.text, 'print("hi")');
console.log('fixes ok');
