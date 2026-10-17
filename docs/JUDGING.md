# Judging Prep

How we answer each part of the rubric: the claim we make, the evidence we show, and the weak spots to fix or get ahead of.

| Weight | Criterion | Our one-line answer |
|---|---|---|
| 25% | Is it niched? | Beginners hitting their first errors in a real code editor |
| 25% | UI/UX | Calm, theme-native panel that explains errors without leaving the editor |
| 25% | Does it solve the problem? | Explanation appears next to the code, automatically, only for real mistakes |
| 15% | Presentation | Live demo: make a typo, watch it get explained |
| 5% | Future work | Same engine, more places: more IDEs, Jupyter, Code.org |
| 5% | AI use | AI only writes the explanation; everything else is plain code, and it's opt-in |

---

## 1. Is it niched? (25%)

**Claim:** we're not "AI for developers". We serve one specific person at one specific moment: **a beginner who has just moved from tutorials or block coding into a real editor, and is staring at their first wall of red.**

**Talking points**
- **The gap:** school tools (Scratch, Code.org) explain errors gently. Professional tools (VS Code, PyCharm) assume you already know what `TypeError: Cannot read properties of undefined` means. Students fall into the gap between them.
- **The moment:** the first error messages are where beginners decide coding "isn't for them". A confusing error is a motivation problem, not just a technical one.
- **Why existing tools miss it:**
  - Copilot and other AI chat tools are built for people who already code. They write code for you rather than teaching you.
  - Searching Stack Overflow means leaving the editor and parsing answers written for experts.
  - Chatbots need you to copy, paste and explain context, which is exactly what beginners don't know how to do.
- **The niche is a wedge, not a ceiling:** the same niche extends naturally to Jupyter (data-science students) and Code.org (K–12). It's the same person, earlier or later in their journey.

**Get ahead of it**
- The README's Applications table lists five audiences, which can read as "for everyone". **In the pitch, lead with students and beginners only.** Mention the others as later growth, if at all.
- Have a concrete persona ready, e.g. *"Maya, a first-year CS student, just installed VS Code for her intro class."*

---

## 2. UI/UX (25%)

**Claim:** it feels like a native part of VS Code, not a bolted-on chatbot, and it's designed so a nervous beginner isn't overwhelmed.

**Talking points (show each one live)**
- **Zero effort:** there's no button to press or prompt to write. The explanation just appears.
- **Doesn't nag:** it waits until you've stopped typing (about 1.2s), so you never get "errors" for half-typed lines. Point this out explicitly; it's a UX decision judges won't notice otherwise.
- **Recognizable error:** the error title looks exactly like terminal output, with the error type in red, so users connect it to what they saw.
- **Scannable details:** each card shows Language (color-coded), File and Type at a glance.
- **Streams in live:** text appears word by word with a "Thinking…" state, so there's no dead wait.
- **Matches the user's theme:** **switch themes during the demo** (Cmd+K Cmd+T, dark → light). The whole panel re-colors instantly. It's an easy wow moment.
- **Polish:**
  - Frosted-glass cards and an ambient glow.
  - A Copy button on code fixes.
  - A friendly "All clear" empty state.
- **Accessible:**
  - No motion when the user has reduced motion turned on.
  - Works in high-contrast themes.
  - Keyboard focus is visible.
  - Screen readers hear updates without being interrupted mid-stream.
- **Lives where you work:** it sits in the right sidebar, like the Claude and Copilot chat panels, so the code stays visible next to the explanation.

**Get ahead of it**
- **Have a screenshot of each theme ready** (dark, light, high-contrast) in case live switching misbehaves.
- **Explanation tone matters as much as visuals:** short sentences, no jargon, always ending in a concrete fix. Make sure the real explanations (not just the samples) follow this.

---

## 3. How effectively does it actually solve the problem? (25%)

**Claim:** it removes every step between "I see an error" and "I understand the fix".

**Talking points**
- **Before:**
  1. See the squiggle.
  2. Hover it.
  3. Copy the message.
  4. Open a browser and search.
  5. Read an answer written for experts.
  6. Guess.
- **After:** look right and the explanation is already there. The core already knows the file, line and language, so the user doesn't need to describe anything.
- **Every explanation has the same three parts:**
  - **Headline:** what happened, in one line.
  - **Cause:** why it happened.
  - **Fix:** what to change.
- **Save-aware context:** "this appeared 12s after you saved auth.py" helps beginners connect an error to the change that caused it, which is a skill they haven't learned yet.
- **Only real mistakes:** the debounce means beginners aren't flooded with half-typed errors.
- **Built to be cheap and fast:**
  - Common errors come from a built-in library: instant, free and offline.
  - Repeat errors come from a cache.
  - The AI is only used for the long tail.

**Get ahead of it: this is our biggest risk**
- **Explanations are currently placeholders.** `explain.ts` returns stub text, and the panel demo uses hardcoded samples. To score here, aim to have before judging:
  1. **The built-in library** for the errors we'll show in the demo, at minimum. It's reliable, fast and doesn't need the network.
  2. **The real AI call** for anything else.
  3. **End-to-end in VS Code:** UI 1 detects a real error, the core explains it, and the panel shows it.
- **If anything is still a stub on the day, say so honestly** and show the parts that are real. Judges penalize discovering a fake far more than being told.
- **Have one "before vs. after" example ready:** the raw error, and our explanation of it.
- **Bring a number if possible,** e.g. "we tested on N common beginner errors; the library covers X% instantly".

---

## 4. Presentation (15%)

**Suggested structure (~5 minutes)**

| Time | Section | Content |
|---|---|---|
| 0:00 | Hook | Show a real, scary error. "If you're three weeks into learning to code, what does this mean?" |
| 0:30 | Problem | The gap between beginner tools and real editors. First errors are where people quit. |
| 1:00 | Live demo | Type a typo in VS Code, pause, and the explanation streams into the panel. Then switch theme. Then copy the fix. |
| 3:00 | How it works | One diagram: plugin → core (wait) → library / AI → panel. "Write the core once, plug in any editor." |
| 3:45 | AI use | 20 seconds: what the AI does and doesn't do (see section 6). |
| 4:05 | Future | More IDEs, Jupyter, Code.org: same engine. |
| 4:30 | Close | Repeat the one-liner: "Your editor tells you *that* something's wrong. We tell you *why*." |

**Tips**
- **Demo first, architecture second.** Judges remember what they saw.
- **Rehearse the demo error:** pick one the library covers, so it's instant and reliable.
- **Have a backup:** a screen recording of the full flow, plus the **▶ Play Sample Explanations** button if the live connection fails.
- **One speaker per section;** the hand-offs should match team roles (UI, backend).
- **Make the font big:** zoom VS Code in so the back row can read the panel.

---

## 5. Plan for Future Work (5%)

**Claim:** the architecture was designed for growth from day one, so future work means adding plugins, not rewrites.

**Talking points** (full detail in the [README Future Work section](README.md#future-work))
1. **Multiple IDEs:**
   - Cursor, Windsurf and VSCodium are almost free: we just publish to Open VSX.
   - Then Neovim, JetBrains and a desktop app.
   - The core and the message format don't change.
2. **Chrome extension for Jupyter notebooks:** explains failing cells inline, and finds *your* line in long pandas/NumPy tracebacks.
3. **Code.org support:**
   - A K–12 reading level.
   - Points to the exact block.
   - Strict privacy defaults for classrooms.
4. **Also planned:** local AI (Ollama) for privacy, terminal/runtime errors, Marketplace publishing.

**Get ahead of it:** keep this to about 25 seconds in the pitch, since it's only 5%. Show the IDE/browser diagram and move on.

---

## 6. Clear explanation of AI use (5%)

**Claim:** the AI does one narrow job, and everything around it is ordinary, testable code.

**What the AI does**
- Takes one error (message, language, nearby code) and writes a short explanation in our fixed format: headline, cause, fix.
- Follows instructions to use beginner-friendly language: short, no jargon, always a concrete fix.

**What the AI does *not* do**
- **It doesn't decide when to explain.** That's a plain timer (the debounce).
- **It doesn't explain common errors.** Those come from our hand-written library.
- **It doesn't re-explain repeats.** Those come from the cache.
- **It doesn't write or change the user's code.** It explains; the student makes the fix. That's the point.

**Model and data**
- **Model:** Claude, through the Anthropic SDK, with the source swappable to our server, a local model (Ollama), or the user's own key.
- **Data sent:** the error message and nearby code only. It's **opt-in**, the user can see exactly what's sent, and with Ollama nothing leaves the machine.

**Get ahead of it**
- **Be precise about what's live vs. planned:** today the AI call is stubbed (see section 3). Update this section once it's connected.
- **Mention how we used AI to build it,** if the judges count that too: the team used Claude Code for scaffolding and UI work, with the team reviewing and committing every change.

---

## Before judging: checklist

- [ ] Real explanations working (library at minimum) — **affects 25%**
- [ ] UI 1 → core → panel connected end-to-end in VS Code
- [ ] Demo error chosen and rehearsed; backup recording made
- [ ] Theme screenshots (dark / light / high-contrast) ready
- [ ] Pitch leads with *one* niche: beginners
- [ ] README feature statuses match what's actually working on the day
