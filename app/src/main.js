// main.js — Palm Smoke Studio editor: upload / crop / pan / zoom / caption / export.
import { drawPoster, loadImage, ROLES, panelRects } from './cover.js';
import { getShot } from './shots.js';

const EXPORT_SIZES = [[1920, 1080], [1080, 1080], [1080, 1350]];

const state = {
  photos: [],
  captions: [...ROLES],
  pans: ROLES.map(() => ({ ox: 0, oy: 0, zoom: 1 })),
  layout: 'grid',
  grade: 'sunset',
  size: [1920, 1080],
  selected: 0,
  title: 'PALM SMOKE',
  subtitle: 'one last sunset job',
  quote: 'Pure sunshine noir — the getaway of the year.',
  quoteSource: 'THE VICE BAY LEDGER',
};

const canvas = document.getElementById('stage');
const fileInput = document.getElementById('file-input');
let pendingPanel = 0;
let rafPending = false;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));

async function loadFonts() {
  try {
    await Promise.all([document.fonts.load('20px Anton'), document.fonts.load('20px Pacifico')]);
    await document.fonts.ready;
  } catch (e) { /* fall back to system fonts */ }
}

function render() {
  canvas.width = state.size[0];
  canvas.height = state.size[1];
  drawPoster(canvas, state);
  document.querySelectorAll('.panel-card').forEach((card, i) => {
    card.classList.toggle('selected', i === state.selected);
  });
}

function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; render(); });
}

function buildPanelCards() {
  const list = document.getElementById('panel-list');
  ROLES.forEach((role, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML = `
      <img class="thumb" src="./samples/cast-${i + 1}.jpg" alt="${role}">
      <input class="caption" type="text" value="${role}" maxlength="24" aria-label="Caption for panel ${i + 1}">
      <div class="card-actions">
        <button class="upload-btn" type="button">Upload photo</button>
        <button class="reset-btn" type="button">Reset</button>
      </div>`;
    card.querySelector('.caption').addEventListener('input', (e) => {
      state.captions[i] = e.target.value.toUpperCase();
      scheduleRender();
    });
    card.querySelector('.upload-btn').addEventListener('click', () => {
      pendingPanel = i;
      fileInput.click();
    });
    card.querySelector('.reset-btn').addEventListener('click', async () => {
      state.photos[i] = await loadImage(`./samples/cast-${i + 1}.jpg`);
      state.pans[i] = { ox: 0, oy: 0, zoom: 1 };
      card.querySelector('.thumb').src = `./samples/cast-${i + 1}.jpg`;
      render();
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, input')) return;
      state.selected = i;
      render();
    });
    list.appendChild(card);
  });
}

function wireToolbar() {
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size.split('x').map(Number);
      document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      exportPNG(w, h);
    });
  });
}

async function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawPoster(off, state);
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  window.__lastExport = { w, h, bytes: blob.size };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `palm-smoke-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return blob;
}

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const rects = panelRects(state, canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { index: i, rect: r };
  }
  return null;
}

function wireCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    state.selected = hit.index;
    const pan = state.pans[hit.index];
    drag = { index: hit.index, x0: e.clientX, y0: e.clientY, ox: pan.ox, oy: pan.oy, rect: hit.rect };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const cdx = (e.clientX - drag.x0) * (canvas.width / rect.width);
    const cdy = (e.clientY - drag.y0) * (canvas.height / rect.height);
    const pan = state.pans[drag.index];
    pan.ox = Math.max(-0.5, Math.min(0.5, drag.ox - cdx / drag.rect.w));
    pan.oy = Math.max(-0.5, Math.min(0.5, drag.oy - cdy / drag.rect.h));
    scheduleRender();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pan = state.pans[state.selected];
    pan.zoom = Math.max(1, Math.min(2.5, pan.zoom * Math.exp(-e.deltaY * 0.0012)));
    scheduleRender();
  }, { passive: false });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const img = await loadImage(dataUrl);
    state.photos[pendingPanel] = img;
    state.pans[pendingPanel] = { ox: 0, oy: 0, zoom: 1 };
    state.selected = pendingPanel;
    const card = document.querySelectorAll('.panel-card')[pendingPanel];
    if (card) card.querySelector('.thumb').src = dataUrl;
    window.__uploaded = true;
    fileInput.value = '';
    render();
  });
}

async function init() {
  const shot = getShot();
  await loadFonts();
  state.photos = await Promise.all(ROLES.map((_, i) => loadImage(`./samples/cast-${i + 1}.jpg`)));
  buildPanelCards();
  wireToolbar();
  wireCanvas();
  if (shot.mode === 'cover') {
    document.body.classList.add('cover');
    state.layout = shot.layout;
    state.grade = shot.grade;
    state.size = shot.size;
  } else {
    state.size = [1920, 1080];
  }
  render();
  window.__posterReady = true;
  window.__state = state;
  window.__exportPNG = exportPNG;
  window.__exportSizes = EXPORT_SIZES;
}

init();
