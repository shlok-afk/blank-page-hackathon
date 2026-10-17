// Small, predictable fixes for beginner errors that language servers have no
// quick fix for. Pure text in, text out (no vscode import), so it's easy to check.

export type RuleFix = { line: number; text: string; label: string };

const PY_BUILTINS = (
  'print input len range str int float bool list dict set tuple sum min max abs round sorted reversed ' +
  'enumerate zip map filter open type isinstance help None True False return import from while for elif else'
).split(' ');

const BLOCK_START = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/;

// Edit distance that counts a swapped pair (pritn -> print) as one edit.
export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

// The closest known name to a typo, or undefined if nothing is close enough to be a safe guess.
export function closestName(typo: string, known: Iterable<string>): string | undefined {
  const limit = typo.length <= 4 ? 1 : 2;
  let best: string | undefined;
  let bestD = limit + 1;
  for (const k of new Set(known)) {
    if (k === typo) continue;
    const dd = distance(typo, k);
    if (dd < bestD) [best, bestD] = [k, dd];
  }
  return best;
}

export function ruleFix(message: string, lines: string[], line: number, column: number, language: string): RuleFix | undefined {
  const text = lines[line] ?? '';

  // Curly quotes pasted from a document or chat.
  if (/[“”‘’]/.test(text))
    return { line, text: text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"), label: 'Replaced the curly quotes with straight ones' };

  // A typo'd name: `pritn` -> `print`.
  const typo = /["'](\w+)["'] is not defined/.exec(message)?.[1];
  if (typo) {
    const words = lines.join('\n').match(/[A-Za-z_]\w*/g) ?? [];
    const best = closestName(typo, language.startsWith('py') ? [...words, ...PY_BUILTINS] : words);
    if (!best) return;
    const at = text.slice(column, column + typo.length) === typo ? column : text.search(new RegExp(`\\b${typo}\\b`));
    if (at < 0) return;
    return { line, text: text.slice(0, at) + best + text.slice(at + typo.length), label: `Changed \`${typo}\` to \`${best}\`` };
  }

  // Python's missing colon. Pylance reports it on the line or just after it.
  if (/expected ["']:["']/i.test(message))
    for (const l of [line, line - 1]) {
      const t = lines[l] ?? '';
      // ponytail: treats the first # as a comment, wrong if a string on that line contains #.
      const [, code, comment = ''] = /^(.*?)(\s*#.*)?$/.exec(t)!;
      if (BLOCK_START.test(code) && !code.trimEnd().endsWith(':'))
        return { line: l, text: code.trimEnd() + ':' + comment, label: 'Added the missing `:`' };
    }
}
