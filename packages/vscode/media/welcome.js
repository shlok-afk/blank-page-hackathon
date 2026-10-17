// Welcome & setup screen. Like panel.js, host-agnostic: it only listens for
// window "message" events and posts through acquireVsCodeApi when present, so
// the same file works in a VS Code webview or an Electron window.

const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
const post = (msg) => vscodeApi?.postMessage(msg);

const sliders = [...document.querySelectorAll('.slider')];
const segs = [...document.querySelectorAll('.seg')];
const previews = [...document.querySelectorAll('.preview-body')];

// Precise readouts: the slider is continuous, so show the exact number.
const fmt = {
  score: (v) => String(v),
  ms: (v) => (v >= 1000 ? `${+(v / 1000).toFixed(2)}s` : `${v}ms`),
  lines: (v) => `${v} ${v === 1 ? 'line' : 'lines'}`,
};

// Live extras that translate the raw number into what it actually means.
const derived = {
  sensitivity: (v) =>
    v < 40 ? 'Flags: hard errors only' : v < 70 ? 'Flags: errors + warnings' : 'Flags: errors, warnings & info',
  contextLines: (v) =>
    v === 0
      ? 'Nothing extra is sent'
      : v <= 10
        ? 'A small snippet is sent'
        : v <= 20
          ? 'A generous slice is sent'
          : 'A whole function is sent',
};

const pctOf = (input, v) => (v - input.min) / (input.max - input.min);
const nearest = (ticks, v) =>
  ticks.reduce((best, t) => (Math.abs(t.dataset.at - v) < Math.abs(best.dataset.at - v) ? t : best), ticks[0]);

function showPreview(level) {
  for (const p of previews) p.classList.toggle('active', p.dataset.level === level);
}

function updateSlider(slider) {
  const input = slider.querySelector('input[type="range"]');
  const v = input.valueAsNumber;
  const p = pctOf(input, v);
  slider.querySelector('.track-wrap').style.setProperty('--p', p);

  const ticks = [...slider.querySelectorAll('.ticks span')];
  for (const t of ticks) t.style.setProperty('--at', pctOf(input, +t.dataset.at));
  const stop = nearest(ticks, v);
  for (const t of ticks) t.classList.toggle('on', t === stop);

  // Bubble rides the thumb and names the stop you're nearest. Anchored to its
  // edge at the extremes so the pill can never spill past the track.
  const bubble = slider.querySelector('.bubble');
  bubble.textContent = stop.textContent;
  bubble.dataset.edge = p < 0.08 ? 'start' : p > 0.92 ? 'end' : '';

  slider.querySelector('.readout').textContent = `${(fmt[input.dataset.format] ?? fmt.score)(v)} · ${stop.textContent}`;

  const chip = slider.querySelector('.chip');
  if (chip) chip.textContent = derived[input.dataset.setting]?.(v) ?? '';

  if (input.dataset.setting === 'narration') showPreview(stop.dataset.level);
}

function setSliderValue(slider, value) {
  const input = slider.querySelector('input[type="range"]');
  if (Number.isFinite(Number(value))) input.value = String(value); // the browser clamps to min/max
  updateSlider(slider);
}

// Patience only means something when explanations run automatically, so dim it
// (and say why) whenever the trigger is something else.
function syncPatience(explainOn) {
  const slider = document.querySelector('.slider[data-setting="patience"]');
  if (!slider) return;
  const idle = explainOn !== 'auto';
  slider.classList.toggle('idle', idle);
  const note = slider.querySelector('.note');
  if (note) note.hidden = !idle;
}

// Flash the always-present "Saved ✓" — opacity only, so nothing reflows and the
// slider stays exactly where the pointer left it.
function flashSaved(root) {
  const tag = root?.querySelector('.saved');
  if (!tag) return;
  tag.classList.remove('show');
  void tag.offsetWidth; // restart the animation
  tag.classList.add('show');
}

// Apply settings pushed by the extension host.
function apply(values) {
  for (const slider of sliders) setSliderValue(slider, values[slider.dataset.setting]);
  for (const seg of segs) {
    for (const b of seg.querySelectorAll('button')) {
      b.setAttribute('aria-checked', String(b.dataset.value === values[seg.dataset.setting]));
    }
  }
  const bar = document.querySelector('input[data-setting="statusBar"]');
  if (bar) bar.checked = Boolean(values.statusBar);
  syncPatience(values.explainOn);
}

// Dragging live-updates the glass; releasing commits to VS Code settings.
document.addEventListener('input', (e) => {
  const slider = e.target.closest('.slider');
  if (slider) updateSlider(slider);
});

document.addEventListener('change', (e) => {
  const input = e.target.closest('.slider input[type="range"]');
  if (input) {
    const slider = input.closest('.slider');
    post({ type: 'set', key: slider.dataset.setting, value: input.valueAsNumber });
    flashSaved(slider.querySelector('.slider-head'));
    return;
  }
  const box = e.target.closest('input[data-setting]');
  if (!box) return;
  post({ type: 'set', key: box.dataset.setting, value: box.checked });
  flashSaved(box.closest('.control'));
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('.seg button');
  if (b) {
    const seg = b.closest('.seg');
    for (const other of seg.querySelectorAll('button')) other.setAttribute('aria-checked', String(other === b));
    post({ type: 'set', key: seg.dataset.setting, value: b.dataset.value });
    if (seg.dataset.setting === 'explainOn') syncPatience(b.dataset.value);
    flashSaved(seg.closest('.control'));
    return;
  }
  const id = e.target.closest('button')?.id;
  if (id === 'play') post({ type: 'command', id: 'squiggle.playSamples' });
  else if (id === 'settings') post({ type: 'command', id: 'workbench.action.openSettings', arg: 'squiggle' });
  else if (id === 'done') post({ type: 'close' });
});

// Paint once at defaults so nothing is blank before the host answers, then ask
// for the real settings.
for (const slider of sliders) updateSlider(slider);
syncPatience('auto');
post({ type: 'ready' });
