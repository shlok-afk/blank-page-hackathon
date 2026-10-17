import { lookupInLibrary } from '../src/library/index';

console.log('1:', lookupInLibrary("TypeError: 'NoneType' object is not subscriptable", 'python'));
console.log('2:', lookupInLibrary('ModuleNotFoundError: No module named requests', 'python'));
console.log('3:', lookupInLibrary('TypeError: x is not a function', 'javascript'));
console.log('4:', lookupInLibrary('EADDRINUSE: address already in use', 'javascript'));
console.log('5:', lookupInLibrary("Property 'foo' does not exist on type 'Bar'.", 'typescriptreact'));
console.log('6 (should be undefined):', lookupInLibrary('some weird error nobody has seen', 'python'));
