// Vice Neon Cover Studio — wires the editor: photo slots, layout and grade pickers,
// lettering inputs, panel pan/zoom on the preview canvas, and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCoverArt, defaultState, GRADES, LAYOUTS, EXPORT_SIZES, panelAt, exportCoverBlob } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let previewSize = EXPORT_SIZES[0];
// A ?shot= query means this load is a fixed screenshot scene, not the editor.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads an image from a user-picked file, as a data: URI that never leaves the machine. */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function redraw() {
  canvas.width = previewSize.width;
  canvas.height = previewSize.height;
  // In a ?shot= scene the cover is the product: no editor selection outline.
  drawCoverArt(canvas, state, shot ? null : state.selected);
}

function setStatus(text) {
  status.textContent = text;
}

// --- Photo slots -----------------------------------------------------------
const slotsEl = document.getElementById('slots');

function buildPhotoSlots() {
  slotsEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const row = document.createElement('div');
    row.className = 'slot' + (state.selected === i ? ' selected' : '');
    row.dataset.slot = String(i);
    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.alt = '';
    if (photo) thumb.src = photo.src;
    const name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = `Photo ${i + 1}`;
    const st = document.createElement('span');
    st.className = 'slot-state';
    st.textContent = photo ? 'loaded' : 'empty';
    const label = document.createElement('span');
    label.append(name, document.createElement('br'), st);
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'pick';
    pick.textContent = photo ? 'Replace' : 'Add photo';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      state.photos[i] = await loadImageFile(file);
      state.transforms[i] = { x: 0, y: 0, zoom: 1 };
      state.selected = i;
      syncZoomSlider();
      buildPhotoSlots();
      redraw();
      setStatus(`Photo ${i + 1} loaded — drag it into place, then export.`);
    });
    pick.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
    row.addEventListener('click', () => { state.selected = i; syncZoomSlider(); buildPhotoSlots(); redraw(); });
    row.append(thumb, label, pick, input);
    slotsEl.append(row);
  });
}

// --- Layout and grade pickers ----------------------------------------------
function buildPicker(el, options, current, onPick) {
  el.innerHTML = '';
  for (const [id, def] of Object.entries(options)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(id === current));
    b.dataset.id = id;
    if (def.skyTop) {
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = `linear-gradient(135deg, ${def.skyTop}, ${def.skyMid} 55%, ${def.skyBottom})`;
      b.append(dot);
    }
    b.append(def.label);
    b.addEventListener('click', () => { onPick(id); buildPicker(el, options, id, onPick); });
    el.append(b);
  }
}

buildPicker(document.getElementById('layout-picker'), LAYOUTS, state.layout, (id) => {
  state.layout = id;
  redraw();
});
buildPicker(document.getElementById('grade-picker'), GRADES, state.grade, (id) => {
  state.grade = id;
  redraw();
});

// --- Lettering ---------------------------------------------------------------
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const taglineInput = document.getElementById('tagline');
const placeInput = document.getElementById('place');
const ribbonInput = document.getElementById('ribbon');
const heatInput = document.getElementById('heat');
const heatStars = document.getElementById('heat-stars');
const bannerInput = document.getElementById('banner');
function syncHeat() {
  const h = Math.max(0, Math.min(5, Math.round(state.heat ?? 4)));
  heatStars.textContent = '★'.repeat(h) + '☆'.repeat(5 - h);
}
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
placeInput.addEventListener('input', () => { state.place = placeInput.value; redraw(); });
ribbonInput.addEventListener('input', () => { state.ribbon = ribbonInput.value; redraw(); });
heatInput.addEventListener('input', () => { state.heat = Number(heatInput.value); syncHeat(); redraw(); });
bannerInput.addEventListener('change', () => { state.banner = bannerInput.checked; redraw(); });
syncHeat();

// --- Pan and zoom on the preview --------------------------------------------
const zoomSlider = document.getElementById('zoom');
function syncZoomSlider() {
  zoomSlider.value = String(state.transforms[state.selected].zoom);
}
zoomSlider.addEventListener('input', () => {
  state.transforms[state.selected].zoom = Number(zoomSlider.value);
  redraw();
});

let dragging = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const panel = panelAt(state, canvas.width, canvas.height, p.x, p.y);
  if (!panel) return;
  state.selected = panel.slot;
  syncZoomSlider();
  buildPhotoSlots();
  canvas.setPointerCapture(e.pointerId);
  dragging = { slot: panel.slot, startX: p.x, startY: p.y, panel };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const t = state.transforms[dragging.slot];
  t.x += (p.x - dragging.startX) / dragging.panel.w;
  t.y += (p.y - dragging.startY) / dragging.panel.h;
  t.x = Math.max(-0.6, Math.min(0.6, t.x));
  t.y = Math.max(-0.6, Math.min(0.6, t.y));
  dragging.startX = p.x;
  dragging.startY = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const t = state.transforms[state.selected];
  t.zoom = Math.max(1, Math.min(3, t.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncZoomSlider();
  redraw();
}, { passive: false });

// --- Fill all, samples, preview size, export --------------------------------
document.getElementById('fill-all').addEventListener('click', () => {
  const photo = state.photos[state.selected];
  if (!photo) { setStatus('Load a photo into the selected slot first.'); return; }
  state.photos = state.photos.map(() => photo);
  state.transforms = state.transforms.map(() => ({ x: 0, y: 0, zoom: 1 }));
  syncZoomSlider();
  buildPhotoSlots();
  redraw();
  setStatus('One photo now fills every panel.');
});

document.getElementById('sample-photos').addEventListener('click', async () => {
  const [vista, gangster, police, heli, pier] = await Promise.all([
    loadImage('samples/vista.jpg'), loadImage('samples/gangster.jpg'),
    loadImage('samples/police.jpg'), loadImage('samples/heli.jpg'),
    loadImage('samples/pier.jpg'),
  ]);
  state.photos = [vista, gangster, police, heli, pier];
  state.transforms = state.transforms.map(() => ({ x: 0, y: 0, zoom: 1 }));
  syncZoomSlider();
  buildPhotoSlots();
  redraw();
  setStatus('Sample photos loaded into all five panels.');
});

document.getElementById('preview-size').addEventListener('change', (e) => {
  previewSize = EXPORT_SIZES.find((s) => s.id === e.target.value) ?? EXPORT_SIZES[0];
  redraw();
});

for (const size of EXPORT_SIZES) {
  document.getElementById(`export-${size.id}`).addEventListener('click', async () => {
    setStatus(`Rendering ${size.label}…`);
    const blob = await exportCoverBlob(state, size.id);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved cover-${size.id}.png`);
  });
}

// --- Boot --------------------------------------------------------------------
buildPhotoSlots();
if (shot) {
  runShot(shot, query, {
    state, loadImage, redraw, syncHeat,
    setPreviewSize(id) {
      previewSize = EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
      document.getElementById('preview-size').value = previewSize.id;
    },
    rebuild() { buildPhotoSlots(); syncZoomSlider(); },
  });
} else {
  redraw();
}

// Redraw once the vendored fonts arrive, so the title uses Anton/Pacifico.
if (document.fonts?.ready) document.fonts.ready.then(redraw);
