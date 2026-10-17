# Error Explainer — Project Plan

## Goal
A desktop app that watches IDEs for errors and automatically explains them using an LLM. Starts with VS Code, designed to scale to other IDEs (Neovim, JetBrains, VS Code forks).

## Architecture
One local core + thin per-IDE adapters, talking over a versioned protocol.

- **IDE adapters (thin):** collect errors, send to core, optionally display explanations inline. No LLM logic.
- **Core (Node daemon):** debounce, dedupe, cache, prompt building, LLM calls, settings, API key storage.
- **Desktop UI (Electron, optional):** wraps the core; shows explanations in a window/tray.

Transport: WebSocket on 127.0.0.1 only. Adapters find the core via a lockfile (`~/.error-explainer/core.json` → `{ port, token, pid }`) and must send the token.

## Stack
- Node + TypeScript, pnpm workspaces monorepo
- Zod for the protocol (types + runtime validation; export JSON Schema for non-TS adapters)
- `ws` for the server, `@anthropic-ai/sdk` (or similar) for LLM calls with streaming
- OS keychain for the API key (`keytar` / Electron `safeStorage`), never plain config
- esbuild for bundling, Vitest for tests, electron-builder for installers

## Repo layout
packages/
  protocol/   shared Zod schema + types (single source of truth)
  core/       server.ts, discovery.ts, pipeline.ts, cache.ts, explain.ts, secrets.ts
  app/        Electron shell (optional)
  vscode/     VS Code extension adapter
adapters/
  nvim/       Lua adapter, validates against generated JSON Schema

## Protocol (v1)
ErrorReport: v, ide, file, language, message, severity (error|warning|info), source?, code?, range {start,end}, context?, kind (diagnostic|terminal)
Client → core: `report` (errors[]), `explain` (id)
Core → client: `explanation` (id, text), `chunk` (id, delta) for streaming

## Key behaviors
- Debounce per file (errors fire on every keystroke); only explain errors stable for ~1–2s or on save/click
- Start with severity = error only
- Cache by hash(message + code + source)
- Code is sent to a third-party API → opt-in, show what's sent

## Build order
1. `protocol` — schema + types + JSON Schema export
2. `core` — headless daemon + CLI test client sending fake errors
3. `vscode` — adapter using `languages.onDidChangeDiagnostics`; publish to Marketplace + Open VSX (covers Cursor/Windsurf/VSCodium)
4. `app` — Electron UI
5. `nvim` — Lua adapter (`vim.diagnostic`, `DiagnosticChanged`); validates schema is IDE-neutral
6. Later: JetBrains (Kotlin), terminal/runtime errors via VS Code shell integration API

## Instructions for Claude Code
- Start with step 1 and 2 only; scaffold the monorepo and stop for review before the VS Code adapter.
- Use TypeScript project references (composite: true) so packages build against `protocol`.
- Add recorded diagnostic fixtures (Pylance, tsc, ESLint) as JSON for tests.
- Do not run `git commit` or `git push`; leave changes for me to review and commit.