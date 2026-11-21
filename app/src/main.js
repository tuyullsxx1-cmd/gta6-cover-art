// main.js — Palm Smoke Studio editor: state, controls, live preview,
// photo load / crop / pan / zoom, and PNG export. Imports the poster
// renderer from cover.js and the staging params from shots.js.
import { renderPoster, exportPNG, panelRects, GRADES, CAST, SIZES } from './cover.js';
import { parseShot, sampleSrc } from './shots.js';

const $ = (id) => document.getElementById(id);

export function defaultState() {
  return {
    title: 'PALM SMOKE',
    subtitle: 'one last sunset job',
    quote: 'Pure sunshine noir — the getaway of the year.',
    paper: 'THE VICE BAY LEDGER',
    layout: 'grid',
    grade: 'sunset',
    size: '1920x1080',
    photos: CAST.map((c) => ({ src: c.src, zoom: 1, ox: 0, oy: 0 })),
  };
}

let state = defaultState();
let selected = 0;
let renderQueued = false;
window.__state = state;
window.__renderCount = 0;

const preview = $('preview');
const coverCanvas = $('coverCanvas');

function previewDims() {
  const [w, h] = SIZES[state.size] || SIZES['1920x1080'];
  const scale = Math.min(1, 960 / w, 540 / h);
  return [Math.round(w * scale), Math.round(h * scale)];
}

export function renderPreview() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(async () => {
    renderQueued = false;
    if (document.body.classList.contains('cover-mode')) return;
    const [pw, ph] = previewDims();
    if (preview.width !== pw || preview.height !== ph) {
      preview.width = pw;
      preview.height = ph;
    }
    await renderPoster(preview, state);
    window.__renderCount += 1;
    if (!window.__ready) window.__ready = true;
  });
}

function renderCoverMode() {
  const [w, h] = SIZES[state.size] || SIZES['1920x1080'];
  coverCanvas.width = w;
  coverCanvas.height = h;
  renderPoster(coverCanvas, state).then(() => {
    window.__renderCount += 1;
    window.__ready = true;
  });
}

// ---- slot cards ------------------------------------------------------------

function slotCard(i) {
  const card = document.createElement('div');
  card.className = 'slot';
  card.dataset.slot = String(i);
  card.innerHTML = `
    <div class="slot-head"><span class="slot-role">${CAST[i].role}</span><span class="slot-num">#${i + 1}</span></div>
    <img class="slot-thumb" alt="panel ${i + 1} photo">
    <label class="slot-file">Load photo<input type="file" accept="image/*" hidden></label>
    <label class="slot-row">Zoom <input type="range" min="1" max="3" step="0.05" value="1"></label>
    <label class="slot-row">Pan X <input type="range" min="-0.5" max="0.5" step="0.01" value="0"></label>
    <label class="slot-row">Pan Y <input type="range" min="-0.5" max="0.5" step="0.01" value="0"></label>
    <button type="button" class="slot-fill">Use in all panels</button>`;
  const [thumb, file, zoom, ox, oy, fill] = [
    card.querySelector('.slot-thumb'),
    card.querySelector('input[type=file]'),
    ...card.querySelectorAll('input[type=range]'),
    card.querySelector('.slot-fill'),
  ];
  const syncThumb = () => {
    thumb.src = state.photos[i].src;
    thumb.style.objectPosition = `${50 + state.photos[i].ox * 100}% ${50 + state.photos[i].oy * 100}%`;
    card.classList.toggle('selected', selected === i);
  };
  card.addEventListener('click', (e) => {
    if (e.target.closest('input,button,label')) return;
    selected = i;
    document.querySelectorAll('.slot').forEach((el) => el.classList.remove('selected'));
    card.classList.add('selected');
  });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.photos[i] = { src: String(reader.result), zoom: 1, ox: 0, oy: 0 };
      zoom.value = '1';
      ox.value = '0';
      oy.value = '0';
      syncThumb();
      renderPreview();
    };
    reader.readAsDataURL(f);
  });
  zoom.addEventListener('input', () => {
    state.photos[i].zoom = Number(zoom.value);
    renderPreview();
  });
  ox.addEventListener('input', () => {
    state.photos[i].ox = Number(ox.value);
    syncThumb();
    renderPreview();
  });
  oy.addEventListener('input', () => {
    state.photos[i].oy = Number(oy.value);
    syncThumb();
    renderPreview();
  });
  fill.addEventListener('click', () => {
    const src = state.photos[i].src;
    state.photos = state.photos.map(() => ({ src, zoom: 1, ox: 0, oy: 0 }));
    buildSlots();
    renderPreview();
  });
  card._sync = syncThumb;
  syncThumb();
  return card;
}

function buildSlots() {
  const wrap = $('slots');
  wrap.innerHTML = '';
  for (let i = 0; i < 6; i++) wrap.appendChild(slotCard(i));
}

// ---- controls ---------------------------------------------------------------

function bindText(id, key) {
  const el = $(id);
  el.value = state[key];
  el.addEventListener('input', () => {
    state[key] = el.value;
    renderPreview();
  });
}

function bindChoice(selector, key, values) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === state[key]);
    btn.addEventListener('click', () => {
      state[key] = btn.dataset.value;
      document.querySelectorAll(selector).forEach((b) => b.classList.toggle('active', b === btn));
      renderPreview();
    });
  });
}

function bindSize() {
  const sel = $('sizeSelect');
  sel.value = state.size;
  sel.addEventListener('change', () => {
    state.size = sel.value;
    renderPreview();
  });
}

function bindExport() {
  $('exportBtn').addEventListener('click', async () => {
    const [w, h] = SIZES[state.size] || SIZES['1920x1080'];
    const status = $('exportStatus');
    status.textContent = `Rendering ${w}×${h}…`;
    const blob = await exportPNG(state, w, h);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palm-smoke-${w}x${h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.__lastExport = { w, h, bytes: blob.size };
    status.textContent = `Exported ${w}×${h} PNG (${(blob.size / 1048576).toFixed(2)} MB)`;
  });
  $('resetBtn').addEventListener('click', () => {
    state = defaultState();
    window.__state = state;
    selected = 0;
    bindText('titleInput', 'title');
    bindText('subtitleInput', 'subtitle');
    bindText('quoteInput', 'quote');
    bindText('paperInput', 'paper');
    $('sizeSelect').value = state.size;
    document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.value === state.layout));
    document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.value === state.grade));
    buildSlots();
    renderPreview();
  });
}

// ---- drag to pan / wheel to zoom on the preview -----------------------------

function bindPreviewGestures() {
  let drag = null;
  const toCanvas = (e) => {
    const r = preview.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * preview.width,
      y: ((e.clientY - r.top) / r.height) * preview.height,
    };
  };
  preview.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const rects = panelRects(preview.width, preview.height, state.layout);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit >= 0) {
      selected = hit;
      document.querySelectorAll('.slot').forEach((el, i) => el.classList.toggle('selected', i === hit));
      drag = { x: p.x, y: p.y, ox: state.photos[hit].ox, oy: state.photos[hit].oy, rect: rects[hit] };
      preview.setPointerCapture(e.pointerId);
    }
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const s = state.photos[selected];
    s.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (p.x - drag.x) / drag.rect.w));
    s.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (p.y - drag.y) / drag.rect.h));
    const card = document.querySelector(`.slot[data-slot="${selected}"]`);
    if (card) {
      const ranges = card.querySelectorAll('input[type=range]');
      if (ranges[1]) ranges[1].value = String(s.ox);
      if (ranges[2]) ranges[2].value = String(s.oy);
      const thumb = card.querySelector('.slot-thumb');
      if (thumb) thumb.style.objectPosition = `${50 + s.ox * 100}% ${50 + s.oy * 100}%`;
    }
    renderPreview();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const s = state.photos[selected];
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    s.zoom = Math.max(1, Math.min(3, (s.zoom || 1) * f));
    const card = document.querySelector(`.slot[data-slot="${selected}"]`);
    if (card) {
      const ranges = card.querySelectorAll('input[type=range]');
      if (ranges[0]) ranges[0].value = String(s.zoom);
    }
    renderPreview();
  }, { passive: false });
}

// ---- boot -------------------------------------------------------------------

function applyShotParams(p) {
  if (p.caption) state.title = p.caption;
  if (p.photo) state.photos[0] = { src: sampleSrc(p.photo), zoom: 1, ox: 0, oy: 0 };
  if (p.grade && GRADES[p.grade]) state.grade = p.grade;
  if (p.layout === 'grid' || p.layout === 'spotlight') state.layout = p.layout;
  if (p.size && SIZES[p.size]) state.size = p.size;
}

function boot() {
  const p = parseShot();
  applyShotParams(p);
  buildSlots();
  bindText('titleInput', 'title');
  bindText('subtitleInput', 'subtitle');
  bindText('quoteInput', 'quote');
  bindText('paperInput', 'paper');
  bindChoice('.layout-btn', 'layout');
  bindChoice('.grade-btn', 'grade');
  bindSize();
  bindExport();
  bindPreviewGestures();
  if (p.shot === 'cover') {
    document.body.classList.add('cover-mode');
    $('coverMode').hidden = false;
    renderCoverMode();
  } else {
    renderPreview();
  }
}

boot();
