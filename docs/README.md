# Squiggle

> 💫 The Greek prefix "meta-" can mean "beyond" or "transcending." How can you understand your code errors *beyond* what's shown in your editor?

Your editor shows you *that* something is wrong. Squiggle tells you *why*, in plain language, right next to your code.

Squiggle is a VS Code extension for people learning a new programming language. When a red squiggle stays put, a side panel explains what the error means, why it probably happened, and how to fix it.

---

## The problem

**Who it's for:** people learning a new programming language, such as **Python, JavaScript or TypeScript**. That includes students in their first real editor and developers picking up a second language.

**The problem:** error messages are written for people who already know the language. `TypeError: Cannot read properties of undefined (reading 'map')` or `error TS2339` don't help someone three weeks in. The usual fix is to copy the error, leave the editor, search, and read an answer written for experts. Confusing first errors are one of the most common reasons learners give up.

---

## The solution

Squiggle removes every step between "I see an error" and "I understand the fix." There's no button to press and nothing to copy. Look right, and the explanation is already there.

Every explanation has the same three parts:
- **Headline:** what happened, in one line.
- **Cause:** why it happened.
- **Fix:** what to change, often with a code example.

**Features**
- **Automatic, but not naggy:** it waits until you stop typing, so half-typed lines never trigger an explanation.
- **Save-aware:** "12s after you saved auth.py" helps you connect a new error to the change that caused it.
- **Familiar error titles:** each error is shown the way a terminal prints it, with its language, file, line and source.
- **Tunable:** sliders for sensitivity, patience before explaining, and how much hand-holding you want.
- **One-click copy** on every code example.
- **Native look:** colors come from your VS Code theme (light, dark or high-contrast).
- **Accessible:** works with screen readers and reduced motion, and everything is reachable by keyboard.

**Language support**

| Language | Built-in explanations |
|---|---|
| Python | 55 common errors |
| JavaScript | 25 common errors |
| TypeScript | 16 TypeScript-specific errors, plus all the JavaScript ones |

Errors outside the library still get a general explanation from pattern rules.

---

## How it works

```
 1. You make a mistake     2. The extension notices    3. The core waits until
    → red squiggle            and sends it to the core    you stop typing
                                                                 │
 6. Explanation appears ←  5. Core sends it back   ←   4. Core explains it
    in the side panel                                     (library → cache → rules)
```

- **The VS Code extension** watches VS Code's errors and shows the explanation panel.
- **The core** is a small background program on your computer. It decides when an error is real, looks it up, and sends the explanation back. It only accepts connections from your own machine.
- **Explanations** come from a hand-written library of common errors first. Repeat errors come from a saved cache, and anything else is matched by pattern rules. All of this is instant, free and works offline.

The core doesn't depend on VS Code, so other editors can plug into it later without a rewrite.

**Try it:** run `npm install`, then `npm run dev` to start the core. Then open this repo in VS Code and press **F5**, and open the **Squiggle** tab in the sidebar.

---

## How it was made

We built Squiggle in TypeScript: a VS Code extension, a Node.js core, and a WebSocket connection between them. We wrote the error library by hand and checked it against real error messages from Python, JavaScript and TypeScript.

**AI declaration**
- **Building it:** we used Claude Code (Anthropic) to help with scaffolding, UI work and writing library entries. The team reviewed and committed every change.
- **Inside the product:** Squiggle uses no AI. Every explanation comes from our hand-written library and rules, and nothing leaves your computer. Squiggle never writes or changes your code: it explains, and you make the fix.

---

## Future plans

- **More editors:** Cursor, Windsurf and VSCodium (publishing only), then Neovim and JetBrains.
- **Jupyter notebooks:** a Chrome extension that explains failing cells and finds *your* line in long pandas or NumPy tracebacks.
- **Code.org:** explanations at a student reading level for K–12 classrooms, with strict privacy defaults.
- **Terminal and runtime errors:** explain crashes, not just squiggles.
- **More languages**, and publishing to the VS Code Marketplace and Open VSX.
