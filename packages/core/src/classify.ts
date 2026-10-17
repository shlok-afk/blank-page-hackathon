import { Cached } from './cache';

// Used when an error isn't in our library. No network, no key, instant.
export function explainUnknown(message: string, language: string): Cached {
  const m = message.toLowerCase();

  const rules: Array<{ test: RegExp; result: Cached }> = [
    {
      test: /not a function|is not callable/,
      result: {
        headline: 'You called something that is not a function',
        cause: 'That name holds a value instead of a function - usually a failed import or a variable shadowing it.',
        fix: 'Print the value on the line before, and check the imported name matches exactly.',
      },
    },
    {
      test: /cannot read propert|undefined is not|cannot read prop/,
      result: {
        headline: 'You used a property of something that is undefined or null',
        cause: 'The object you are reaching into does not exist yet.',
        fix: 'Find what is supposed to create it and confirm that ran. Optional chaining (obj?.prop) prevents the crash.',
      },
    },
    {
      test: /not defined|nameerror/,
      result: {
        headline: 'That name was never created',
        cause: 'It is misspelled, or it is defined somewhere this code cannot see.',
        fix: 'Check the spelling, and that it is imported or declared in this scope.',
      },
    },
    {
      test: /syntaxerror|unexpected token|parse error|invalid syntax/,
      result: {
        headline: 'There is a typo in your syntax',
        cause: 'A bracket, comma, quote, or colon is missing or extra nearby.',
        fix: 'Look at the reported line and the line above it. Count your brackets and quotes.',
      },
    },
    {
      test: /cannot find module|modulenotfound|no module named|importerror/,
      result: {
        headline: 'That package or file could not be found',
        cause: 'It is not installed, or the path points somewhere that does not exist.',
        fix: 'If it is a package, install it. If it is your own file, check the relative path.',
      },
    },
    {
      test: /indexerror|keyerror|out of range|index out of bounds/,
      result: {
        headline: 'You asked for an item that does not exist',
        cause: 'The list is shorter than your index, or the dictionary does not have that key.',
        fix: 'Print the length, or the available keys, right before this line.',
      },
    },
    {
      test: /indentationerror|unexpected indent|expected an indented block/,
      result: {
        headline: 'Your indentation is inconsistent',
        cause: 'This line does not line up with the block it belongs to.',
        fix: 'Re-indent the block. Do not mix tabs and spaces.',
      },
    },
    {
      test: /unsupported operand|cannot convert|typeerror|type error|not subscriptable/,
      result: {
        headline: 'A value has the wrong type for what you are doing',
        cause: 'You are using a value in a way its type does not support.',
        fix: 'Print the value and its type on the line before. Convert it if needed.',
      },
    },
    {
      test: /division by zero|zerodivision/,
      result: {
        headline: 'You divided by zero',
        cause: 'The denominator worked out to 0 at runtime.',
        fix: 'Check the denominator before dividing and handle the zero case.',
      },
    },
    {
      test: /cannot find name/,
      result: {
        headline: "That name was never created",
        cause: 'It is misspelled, not imported, or used before it is declared.',
        fix: 'Check the spelling first, then the import, then the declaration order.',
      },
    },
    {
      test: /not assignable|argument of type/,
      result: {
        headline: 'A value has the wrong type for where you used it',
        cause: 'This spot expects one type of value and got another.',
        fix: 'Convert the value, or widen the type to accept what you are passing.',
      },
    },
    {
      test: /eacces|permission denied/,
      result: {
        headline: 'You do not have permission to access that',
        cause: 'The file or folder is protected, or another program is using it.',
        fix: 'Close whatever is using it, or check that you can write to that path.',
      },
    },
  ];

  const hit = rules.find((r) => r.test.test(m));
  if (hit) return hit.result;

  return {
    headline: 'We do not have a written explanation for this one yet',
    cause: 'This error is not in our library.',
    fix: 'Read the first line of the error - it usually names the file, the line, and the kind of problem.',
  };
}
