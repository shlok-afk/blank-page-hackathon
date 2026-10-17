# Error Explainer

> Your editor shows you *that* something is wrong. Error Explainer tells you *why*, in plain language, as soon as the error appears.

Error Explainer watches your code editor for errors. When one sticks around, it shows a short, beginner-friendly explanation in a side panel: what the error means, why it probably happened, and how to fix it. You don't have to copy the error into a search engine or a chatbot.

It starts with **VS Code** and is built so other editors (Neovim, JetBrains, Cursor) and browser-based coding tools (Jupyter notebooks, Code.org) can plug into the same engine later. See [Future Work](#future-work).

---

## Contents

- [Applications](#applications)
- [Features](#features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Message Format](#message-format)
- [Future Work](#future-work)
- [Glossary](#glossary)

---

## Applications

Who it's for, and the moments it helps with.

| Who | When | How Error Explainer helps |
|---|---|---|
| **Students and beginners** | Learning a first language, when an error message reads like a foreign language | Turns `TypeError: Cannot read properties of undefined (reading 'map')` into "you called `.map()` on something that has no value yet", with a fix |
| **Developers switching languages** | A Python developer writing TypeScript for the first time | Explains unfamiliar errors like `ts(2339)` using concepts they already know |
| **Teachers and bootcamps** | A room of students hitting the same errors | Each student gets a consistent first explanation, which frees the instructor for harder questions |
| **Self-taught and hobby coders** | Coding alone, with nobody to ask | A patient explainer that never makes you feel silly for asking |
| **Experienced developers** | Cryptic messages from tools they rarely touch (build configs, type systems) | Gives a quick "what does this actually mean" without breaking focus |

**Why not just paste the error into a chatbot?** Because that means leaving your editor, copying the error, adding context, and waiting. Error Explainer already knows the file, line and language, and the explanation is waiting in the panel by the time you look.

---

## Features

Status key: ✅ built · 🚧 in progress · 🗓️ planned

### Explanation panel ✅
A panel in VS Code's right-hand sidebar where explanations appear, one card per error, newest on top.
- **Terminal-style error title:** the error appears exactly as a terminal would print it, with the error type (`NameError:`, `error TS2339:`) in red, so it's easy to match to what you see.
- **Error details:** each card lists **Language** (color-coded per language), **File** (file and line) and **Type** (where the error came from, e.g. `ts(2339)`, `Pylance`, `runtime`).
- **Configurable explanations:** short paragraphs, lists, **bold** key points and code examples, all in your editor's own fonts. Adjust the depth of your explanation in settings or upon dowload.
- **Copy code:** every code example has a one-click **Copy** button.

### Live streaming text ✅
Explanations appear word by word as the AI writes them, with a typing cursor, so you can start reading straight away. "Thinking…" shows until the first words arrive, and the card glows softly while it's being written.

### Matches your theme ✅
Every color comes from your VS Code theme: light, dark, high-contrast or custom. Switch themes and the panel updates instantly.

### Accessible by default ✅
- No motion for people who have reduced motion turned on.
- Outlines in high-contrast themes.
- Keyboard-reachable buttons with visible focus.
- Updates are announced politely to screen readers.

### Wait-for-typing (debounce) ✅
Errors flicker constantly while you type: half a line is always "wrong". The core waits until an error has stayed put for about **1.2 seconds** before explaining it, so you only get explanations for real mistakes, not half-typed ones.

### Save-aware context ✅
The core remembers when you last saved each file. When an error appears, the explanation can say something like *"12s after you saved auth.py"*, which helps connect a new error to the change that caused it.

### Background core ✅
A small program on your computer receives errors from editor plugins, decides when they're ready, and sends explanations back to the right editor. It only accepts connections from your own machine.

### Error detection in VS Code 🚧
The VS Code plugin notices errors (red squiggles) as they appear and sends them to the core automatically. An **"Explain this error"** option on hover or right-click is planned too.

### Plain-language explanations 🚧
Each explanation has three parts: a **headline** (one-line summary), the **cause** (why it happened) and the **fix** (what to change). The wiring is in place; the explanation content is currently a placeholder until the AI and library are connected.

### Built-in library 🗓️
Hand-written explanations for about 20 of the most common Python and JavaScript errors. They're instant, free and work offline.

### Saved answers (cache) 🗓️
Once an error has been explained, the same error is explained instantly from memory next time, at no cost.

### Choose your AI 🗓️
For errors outside the library, the core asks an AI. You choose the source, and none of the options requires an AI subscription:

| Source | Cost to you | Notes |
|---|---|---|
| Built-in library | Free | Instant, offline, common errors only |
| Our server | Free | Best quality, zero setup |
| Local AI (Ollama) | Free | Private: your code never leaves your computer |
| Your own API key | You pay | For people who already have one |

### Privacy controls 🗓️
Explaining with AI is **opt-in**. You can see exactly what will be sent before anything leaves your machine. API keys are stored in your system's secure keychain, never in a plain text file.

---

## How It Works

```
 1. You make a mistake          2. The plugin notices        3. The core waits ~1.2s
    → red squiggle appears         and sends it to the core     (are you still typing?)
                                                                        │
 6. Explanation appears   ←   5. Core sends it back   ←   4. Core explains it
    in the side panel                                         (library → AI)
```

The app is split into **small editor plugins** and **one shared core**:

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ VS Code      │   │ Neovim       │   │ JetBrains    │   ← editor plugins (small, one per editor)
 └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
        └──────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │         CORE           │   ← background program, written once
              │  receive → wait →      │
              │  explain → send back   │
              └───────────┬────────────┘
                          ▼
             Built-in library  /  AI (your choice)
```

Supporting a new editor only means writing a new small plugin. The core and the message format stay the same.

---

## Getting Started

**You'll need:** [Node.js](https://nodejs.org) (LTS) and [VS Code](https://code.visualstudio.com).

```bash
# Install dependencies (repo root and the VS Code extension)
npm install
cd packages/vscode && npm install && cd ../..
```

**Run the core:**
```bash
npm run dev     # starts the core on ws://localhost:4321
npm run fake    # in a second terminal: sends a fake error to the core
```

**See the explanation panel:**
1. Open this repo in VS Code and press **F5**. A second VS Code window opens with the extension running.
2. In that window, open the **Error Explainer** tab in the right sidebar. Press **Cmd+Option+B** (Mac) or **Ctrl+Alt+B** (Windows/Linux) if the sidebar is hidden.
3. Click **▶** to play the sample explanations.

**Run the checks:**
```bash
npm run check                           # type-check the core
node packages/vscode/test/md.check.js   # panel formatting and safety checks
```

---

## Project Structure

```
packages/
├── protocol/        The shared message format: every plugin and the core speak this
├── core/            The background program
│   ├── src/
│   │   ├── server.ts     Accepts plugin connections, routes messages
│   │   ├── pipeline.ts   Wait-for-typing timer and save tracking
│   │   ├── explain.ts    Turns an error into an explanation
│   │   └── index.ts      Starts the core
│   └── dev/              Test scripts (fake plugin)
└── vscode/          The VS Code extension
    ├── src/              Extension code and sample explanations
    ├── media/            The panel: panel.js (display), panel.css (styling)
    └── test/             Panel checks
```

The panel (`media/panel.js` and `media/panel.css`) doesn't depend on VS Code, so it can move into a standalone desktop window later without changes.

See [BUILDPLAN.md](BUILDPLAN.md) for team roles and the build plan.

---

## Message Format

Plugins and the core send JSON messages over a WebSocket.

**Plugin → core**

| Message | Meaning |
|---|---|
| `hello` | "I'm a plugin for editor X." Sent first, once. |
| `file.saved` | The user saved a file |
| `error.reported` | A new error: text, file, line, column, language, severity |

**Core → plugin**

| Message | Meaning |
|---|---|
| `explanation` | The answer for one error: `headline`, `cause`, `fix`, and `relatedSave` (e.g. *"12s after you saved auth.py"*) |

The exact definitions are in [packages/protocol/src/index.ts](packages/protocol/src/index.ts).

---

## Future Work

The hackathon version covers VS Code. Because the core and the message format don't depend on any one editor, every item below is "write a new small plugin" rather than "rebuild the app".

### 1. Support for multiple IDEs

The goal is to be wherever people write code, with the same explanations everywhere.

| Editor | How it would work | Effort |
|---|---|---|
| **Cursor, Windsurf, VSCodium** | These are built on VS Code, so our existing extension runs as-is once it's published to [Open VSX](https://open-vsx.org) | Low: publishing only |
| **Neovim** | A small Lua plugin that listens to Neovim's built-in error events (`vim.diagnostic`) and shows explanations in a floating window | Medium |
| **JetBrains** (IntelliJ, PyCharm, WebStorm) | A Kotlin plugin that reads the IDE's error highlights and shows explanations in a tool window | Medium–High |
| **Desktop app** | An Electron window that runs the core and shows the same panel, for editors that can't host a panel of their own | Medium: the panel is already editor-independent |

Each plugin only has to do two things: report errors in our message format, and display what comes back. Adding an editor never changes the core.

### 2. Chrome extension for Jupyter notebooks

A huge share of students and data scientists don't write code in an IDE at all. They work in **Jupyter notebooks** in the browser: JupyterLab, Jupyter Notebook and Google Colab.

**What it would do**
- Notice when a notebook cell fails and prints a traceback (the red wall of text under the cell)
- Show a plain-language explanation right below the failing cell, or in a side panel
- Read the long traceback and point out the line in **your** code that caused it, rather than one buried inside a library

**Why it matters:** Python tracebacks from libraries like pandas and NumPy are some of the most intimidating errors beginners see, often 30+ lines where only one is relevant.

**How it would work:** the extension reads the error output from the notebook page and sends it to the core, or straight to our server when no core is running. The explanation panel is reused as-is.

### 3. Code.org support

[Code.org](https://code.org) is where millions of K–12 students write their first programs. Its tools (App Lab, Game Lab and the CS Discoveries / CS Principles courses) run in the browser and use JavaScript, often written as drag-and-drop blocks.

**What it would do**
- Detect errors in Code.org's in-browser editor and console
- Explain them at a **student reading level**: shorter sentences, no jargon, encouraging tone
- Point to the exact block or line to look at

**Why it matters:** these are often a student's first error messages ever. A confusing first error is one of the most common reasons beginners decide coding "isn't for them".

**How it would work:** delivered through the same Chrome extension as Jupyter support, with a "beginner" explanation style chosen automatically on Code.org pages. Because classrooms are involved, the privacy defaults would be strictest here: no student code is sent anywhere without teacher or school opt-in.

### Also planned
- **Real explanations:** connect the built-in library and AI, and save answers for instant repeats
- **Local AI (Ollama):** fully private, offline explanations
- **Terminal and runtime errors:** explain crashes printed in the terminal, not just red squiggles
- **Publishing:** the VS Code Marketplace and Open VSX

---

## Glossary

| Term | Meaning |
|---|---|
| **Core** | The background program that receives errors and produces explanations |
| **Plugin** | The small piece inside each editor that detects errors and shows explanations |
| **Protocol** | The agreed message format every plugin and the core use |
| **Diagnostic** | VS Code's word for an error or warning (a squiggle) |
| **Debounce** | Waiting until something stops changing before acting on it |
| **Cache** | Saved answers, reused so repeat errors are instant |
| **Streaming** | Showing text word by word as it's generated, instead of all at once |
| **Ollama** | A free tool for running AI models on your own computer |
