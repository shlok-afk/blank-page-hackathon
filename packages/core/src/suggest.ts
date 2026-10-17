// Line-level suggestions: when we can see the broken line, hand back that
// exact line fixed, ready to copy. Library entries explain the *kind* of
// error; this fixes *this* one.

export type Suggestion = { fix: string; snippet: string };

// Names a beginner most often misspells. Identifiers from the surrounding
// code are added per call, so the user's own variables are covered too.
const KNOWN = [
  // Python
  'print', 'input', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool',
  'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter',
  'open', 'type', 'isinstance', 'any', 'all', 'None', 'True', 'False', 'self', 'super', 'return',
  'import', 'random', 'math', 'json', 'os', 'sys', 'time',
  // JavaScript / TypeScript
  'console', 'document', 'window', 'require', 'Math', 'JSON', 'Array', 'Object', 'String',
  'Number', 'Promise', 'setTimeout', 'parseInt', 'undefined', 'null', 'true', 'false', 'function',
];

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Closest known name within a typo's reach: 1 edit for short names, 2 for longer.
export function closestName(name: string, context = ''): string | undefined {
  const pool = new Set([...KNOWN, ...(context.match(/\b[A-Za-z_]\w*\b/g) ?? [])]);
  pool.delete(name);
  const limit = name.length <= 4 ? 1 : 2;
  let best: string | undefined;
  let bestD = limit + 1;
  for (const c of pool) {
    const d = distance(name.toLowerCase(), c.toLowerCase());
    if (d < bestD) [best, bestD] = [c, d];
  }
  return best;
}

export function suggestFix(message: string, lineText = '', context = ''): Suggestion | undefined {
  if (!lineText.trim()) return undefined;
  const msg = message.replace(/[‘’“”"]/g, "'");
  const line = lineText.replace(/\s+$/, '');

  // `pritn(...)` -> `print(...)`
  const undefinedName = /'(\w+)' is not defined|Cannot find name '(\w+)'/.exec(msg);
  if (undefinedName) {
    const name = undefinedName[1] ?? undefinedName[2];
    const best = closestName(name, context);
    if (!best) return undefined;
    return {
      fix: 'Did you mean `' + best + '`? Here is the line with that change:',
      snippet: line.replace(new RegExp('\\b' + name + '\\b'), best),
    };
  }

  // `if x > 0` -> `if x > 0:`
  if (/expected ':'/i.test(msg) && !line.endsWith(':')) {
    return { fix: 'Add a colon at the end of the line:', snippet: line + ':' };
  }

  // `from math import` / `import` with nothing after it
  const emptyImport = /^(\s*)(?:from\s+([\w.]+)\s+)?import\s*$/.exec(line);
  if (emptyImport && /import|module name|invalid syntax/i.test(msg)) {
    const [, indent, mod] = emptyImport;
    return mod
      ? {
          fix: 'Name what you need from `' + mod + '`, or delete the line if you no longer use it:',
          snippet: indent + 'from ' + mod + ' import name_you_need',
        }
      : {
          fix: 'Name the module to import, or delete the line if you no longer need it:',
          snippet: indent + 'import module_name',
        };
  }

  return undefined;
}
