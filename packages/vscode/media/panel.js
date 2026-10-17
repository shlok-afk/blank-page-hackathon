// Host-agnostic: only listens for window "message" events, so the same file
// works in a VS Code webview or an Electron window.

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Inline: `code` and **bold**. Backtick segments are split out first so ** inside code stays literal.
const inline = (s) =>
  s
    .split('`')
    .map((part, i) =>
      i % 2 ? `<code>${esc(part)}</code>` : esc(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
    )
    .join('');

function prose(text) {
  return text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-*] /.test(l)))
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
      if (lines.every((l) => /^\s*\d+[.)] /.test(l)))
        return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)] /, ''))}</li>`).join('')}</ol>`;
      if (/^#{1,6} /.test(block)) return `<h3>${inline(block.replace(/^#+ /, ''))}</h3>`;
      return `<p>${inline(lines.join(' '))}</p>`;
    })
    .join('');
}

// ponytail: tiny markdown subset (paragraphs, lists, headings, code, bold). Swap in `marked` if the AI starts using tables/links.
// Odd segments after splitting on ``` are code, which also handles an unclosed fence mid-stream.
function md(src) {
  return src
    .split('```')
    .map((part, i) => {
      if (!(i % 2)) return prose(part);
      const nl = part.indexOf('\n');
      const lang = nl < 0 ? '' : part.slice(0, nl).trim();
      const code = nl < 0 ? '' : part.slice(nl + 1).replace(/\n$/, '');
      return `<pre data-lang="${esc(lang)}"><code>${esc(code)}</code></pre>`;
    })
    .join('');
}

// Color the error type red like a terminal does: `NameError:`, `error TS2339:`, `SyntaxError:`.
const terminalTitle = (s) => {
  const m = /\b(\w*Error|error(?: TS\d+)?)\b:?/.exec(s);
  return m ? esc(s.slice(0, m.index)) + `<span class="err">${esc(m[0])}</span>` + esc(s.slice(m.index + m[0].length)) : esc(s);
};

// VS Code language ids → display names; unknown ids show as-is.
const LANGS = { python: 'Python', typescript: 'TypeScript', typescriptreact: 'TSX', javascript: 'JavaScript', javascriptreact: 'JSX' };

const list = /** @type {HTMLElement} */ (document.getElementById('list'));
const cards = new Map();

function card(id) {
  let c = cards.get(id);
  if (!c) {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML =
      '<header><div class="title"></div><div class="meta"><span>Language: <span class="lang"></span></span><span>File: <span class="loc"></span></span><span>Type: <span class="src"></span></span></div></header><div class="body"></div>';
    c = { el, body: el.querySelector('.body'), text: '' };
    cards.set(id, c);
    list.prepend(el); // newest on top
  }
  return c;
}

function addCopyButtons(c) {
  for (const pre of c.body.querySelectorAll('pre')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy';
    b.textContent = 'Copy';
    b.setAttribute('aria-label', 'Copy code');
    pre.append(b);
  }
}

list.addEventListener('click', (e) => {
  const b = e.target.closest('.copy');
  if (!b) return;
  navigator.clipboard.writeText(b.parentElement.querySelector('code').textContent).then(() => {
    b.textContent = 'Copied ✓';
    b.classList.add('done');
    setTimeout(() => {
      b.textContent = 'Copy';
      b.classList.remove('done');
    }, 1500);
  });
});

function setStreaming(c, on) {
  c.el.classList.toggle('streaming', on);
  c.el.setAttribute('aria-busy', String(on));
}

window.addEventListener('message', ({ data: m }) => {
  if (!m || !m.id) return;
  const c = card(m.id);
  if (m.type === 'start') {
    c.el.querySelector('.title').innerHTML = terminalTitle(m.title ?? '');
    const lang = c.el.querySelector('.lang');
    lang.textContent = LANGS[m.language] ?? m.language ?? '';
    lang.dataset.lang = m.language ?? '';
    c.el.querySelector('.loc').textContent = m.location ?? '';
    c.el.querySelector('.src').textContent = m.source ?? '';
    c.text = '';
    c.body.innerHTML = '';
    // Replays jump to the top and re-run the entrance animation.
    c.el.remove();
    list.prepend(c.el);
    setStreaming(c, true);
  } else if (m.type === 'chunk') {
    c.text += m.delta;
    c.body.innerHTML = md(c.text);
    setStreaming(c, true);
  } else if (m.type === 'explanation') {
    c.text = m.text;
    c.body.innerHTML = md(c.text);
    addCopyButtons(c);
    setStreaming(c, false);
  }
});

// Tell the VS Code host we're listening (no-op elsewhere).
if (typeof acquireVsCodeApi === 'function') acquireVsCodeApi().postMessage({ type: 'ready' });

if (typeof module === 'object') module.exports = { md, terminalTitle }; // for node self-check
