# Error Explainer

> A desktop app that watches your code editor for errors and explains them in plain language, automatically.

Error Explainer starts with **VS Code** and is designed to grow to other editors (Neovim, JetBrains, Cursor, and more) without being rewritten. It's free to use: common errors are explained from a built-in library, and the AI behind the other explanations can be swapped between options that don't require users to have an AI subscription.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Keeping It Free for Users](#keeping-it-free-for-users)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Team Roles](#team-roles)
- [Build Plan & Checkpoints](#build-plan--checkpoints)
- [Getting Started](#getting-started)
- [Glossary](#glossary)

---

## How It Works

1. You're coding in VS Code and make a mistake, and a red squiggle appears.
2. Our **VS Code plugin** notices the error and sends it to the **core**, a small program running in the background on your computer.
3. The core waits a moment to make sure the error isn't just a half-typed line, then looks for an explanation:
   - first in our **built-in library** of common errors (instant and free)
   - otherwise by asking an **AI**
4. The explanation appears in a **panel** inside VS Code.

If the same error comes up again, the saved explanation is reused, so it's instant and costs nothing.

---

## Architecture

The app is split into **small editor plugins** and **one shared core**.

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ VS Code      │   │ Neovim       │   │ JetBrains    │   ← editor plugins
 │ plugin       │   │ plugin       │   │ plugin       │     (small, one per editor)
 └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │         CORE           │   ← runs in the background
              │  receive → wait →      │     (written once, shared by all editors)
              │  explain → send back   │
              └───────────┬────────────┘
                          ▼
         Built-in library  /  AI (swappable)
```

**Why this design?**
- **Plugins are small.** They only detect errors and display results. Supporting a new editor means writing one small plugin, not a whole new app.
- **The core does the hard work once.** Waiting, saving answers, talking to the AI, and settings are all in one place.
- **Everyone uses the same message format** (the *protocol*). Every plugin describes errors the same way, so the core doesn't care which editor an error came from.

**How plugins find the core:** when the core starts, it leaves a small note on the computer (a *lockfile*) saying which port it's on and what password to use. Plugins read that note to connect. Connections only work from the same computer, never over the internet.

---

## Keeping It Free for Users

The core can get explanations from several sources, chosen in settings:

| Source | Cost to user | Pros | Cons |
|---|---|---|---|
| **Built-in library** | Free | Instant, works offline | Only covers errors we've written up |
| **Our server** | Free (we pay) | Best quality, zero setup | Costs us money; needs usage limits |
| **Local AI (Ollama)** | Free | Private, offline, code never leaves the computer | Needs a decent computer and a large download |
| **User's own API key** | User pays | For people who already have one | Not everyone has one |

**The core always tries in this order:**
1. Saved answer from earlier (cache)
2. Built-in library
3. Whichever AI source the user picked

**For the hackathon:** built-in library plus our server. Local AI support comes next.

---

## Tech Stack

| Tool | What it does for us |
|---|---|
| **Node.js + TypeScript** | The language everything is written in. TypeScript is JavaScript with labels that catch mistakes early. |
| **pnpm workspaces** | Keeps all our pieces in one folder so they can share code. |
| **Zod** | Defines our message format once and checks every incoming message against it. |
| **ws** (WebSocket) | The connection plugins and the core use to talk. |
| **Anthropic SDK** | Code library for asking Claude to explain an error. |
| **OS keychain** | Stores API keys securely instead of in a plain text file. |
| **Electron** *(later)* | Turns the core into a real desktop app with a window. |
| **esbuild** | Packages our code so it can be installed. |
| **Vitest** | Runs automatic tests. |

---

## Project Structure

```
error-explainer/
├── packages/
│   ├── protocol/    # The shared message format (everyone uses this)
│   ├── core/        # The background program
│   │   ├── server.ts      # Accepts connections from plugins     (Backend 1)
│   │   ├── discovery.ts   # Writes the lockfile                  (Backend 1)
│   │   ├── pipeline.ts    # Waits / filters incoming errors      (Backend 1)
│   │   ├── explain.ts     # Turns an error into an explanation   (Backend 2)
│   │   ├── library/       # Built-in explanations                (Backend 2)
│   │   ├── cache.ts       # Saves answers for reuse              (Backend 2)
│   │   └── secrets.ts     # Stores API keys safely               (Backend 2)
│   ├── vscode/      # VS Code plugin                             (UI 1 + UI 2)
│   └── app/         # Desktop window (later)
└── adapters/
    └── nvim/        # Neovim plugin (later)
```

---

## Team Roles

**All four together first (about 1 hour):** agree on the message format in `packages/protocol`. It's the contract between everyone's work, so it needs to be settled before splitting up.

### Backend 1: Core Server *(harder)*

**What it is:** the core's "front door." It accepts connections from plugins and decides when an error is ready to be explained.

**Responsibilities**
- Start the background program and write the lockfile (port + password)
- Accept connections from plugins and check the password
- Read incoming messages and reject anything that doesn't match the format
- **Wait** about 1–2 seconds before passing an error on, since errors flicker while you type
- Send explanations back to the right plugin

**Why it's the harder role:** it combines several new ideas at once (background programs, network connections, passwords, timing), and bugs happen *between* programs, which makes them harder to trace. Everyone's work passes through it.

**Done when:** a test script sends a fake error and the core logs it correctly.

---

### Backend 2: Explanation Engine *(easier)*

**What it is:** the brain. An error goes in, a plain-language explanation comes out.

**Responsibilities**
- Write the **built-in library**: plain-English explanations for about 20 common Python and JavaScript errors
- Write `explain(error)`: check the library first, otherwise ask the AI
- Write the instructions given to the AI so explanations are short and beginner-friendly
- **Save answers** so repeat errors are instant and free
- Make the AI source **swappable** (our server, Ollama, or the user's own key)

**Why it's the easier role:** it's mostly one function that can be built and tested alone. The trickiest part is wording the AI's instructions well, which is experimentation rather than debugging.

**Done when:** calling `explain(error)` on its own returns a sensible explanation.

---

### UI 1: VS Code Plugin

**What it is:** the part inside VS Code that notices errors.

**Responsibilities**
- Detect errors as they appear in VS Code
- Convert them into our message format and send them to the core
- Show a status indicator at the bottom of VS Code: *Explainer connected* / *offline*
- Add an **"Explain this error"** option on hover or right-click

**Done when:** real errors from VS Code show up in Backend 1's log.

---

### UI 2: Explanation Display

**What it is:** what the user actually sees.

**Responsibilities**
- Design and build the panel where explanations appear
- Make text readable, format code nicely, and show words appearing as the AI writes them
- Build it as a panel inside VS Code first, written so it can move into a desktop window later

**Can start immediately** using hardcoded sample explanations, with no need to wait for anyone else.

**Done when:** the panel looks good displaying sample explanations.

---

### How the pieces connect

```
UI 1 (detects error) → Backend 1 (receives, waits) → Backend 2 (explains)
                                                          │
                     UI 2 (shows it) ← Backend 1 (sends back) ←┘
```

**Pairing:** the two backend people work closely together, and the two UI people work closely together, since each pair connects with each other first.

---

## Build Plan & Checkpoints

| Step | What | Who |
|---|---|---|
| 1 | Set up the project folder and tools | One person |
| 2 | Agree on the message format | Everyone |
| 3 | Build each piece separately | Each role |
| **Checkpoint 1** | Backend 1 ↔ Backend 2 connected · UI 1 ↔ UI 2 connected | Pairs |
| **Checkpoint 2** | Both halves connected: typo in VS Code → explanation in panel 🎉 | Everyone |

**Later (after the hackathon)**
- Local AI support (Ollama)
- Desktop window (Electron)
- Neovim plugin, then JetBrains
- Explaining runtime errors from the terminal, not just red squiggles
- Publishing to the VS Code Marketplace and Open VSX (which also covers Cursor and Windsurf)

---

## Getting Started

**You'll need:** [Node.js](https://nodejs.org) (LTS version), [pnpm](https://pnpm.io), and [VS Code](https://code.visualstudio.com).

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install the project's dependencies
pnpm install

# Build everything
pnpm build
```

**Running the VS Code plugin:** open the project in VS Code, open `packages/vscode`, and press **F5**. A second VS Code window opens with the plugin running in it.

**Privacy note:** code around an error is sent to the AI source to get an explanation. Explaining with AI is **opt-in**, and users can see exactly what gets sent.

---

## Glossary

| Term | Meaning |
|---|---|
| **Core** | The background program that receives errors and produces explanations |
| **Plugin / adapter** | The small piece inside each editor that detects errors |
| **Protocol** | The agreed format every error message follows |
| **Diagnostic** | VS Code's word for an error or warning (a squiggle) |
| **Lockfile** | A small file the core leaves so plugins can find it |
| **Debounce** | Waiting until something stops changing before acting on it |
| **Cache** | Saved answers, reused so repeat errors are instant |
| **Monorepo** | One project folder containing several related pieces |
| **API key** | A password that lets a program use a paid AI service |
| **Ollama** | Free tool for running AI models on your own computer |