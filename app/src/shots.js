// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with sample photos loaded. Query params:
//   layout=grid|strip|solo  grade=sunset|neon|gold|dusk  size=1080x1080|1080x1350|1920x1080
//   title=  subtitle=  tagline=  place=  ribbon=  heat=1..5  banner=0|1
//   t0=x,y,zoom  (hero slot transform override, e.g. t0=0,-0.15,1 to pan the hero up)
// window.__shotReady is set once the scene is painted, so a headless browser can
// screenshot it. The kit's sample photos (free to use) fill the panels.
export async function runShot(shot, query, api) {
  const { state } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') ?? 'grid';
  state.grade = query.get('grade') ?? 'sunset';
  if (query.get('title') !== null) {
    state.title = query.get('title');
    document.getElementById('title').value = state.title;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  if (query.get('tagline') !== null) {
    state.tagline = query.get('tagline');
    document.getElementById('tagline').value = state.tagline;
  }
  if (query.get('place') !== null) {
    state.place = query.get('place');
    const el = document.getElementById('place');
    if (el) el.value = state.place;
  }
  if (query.get('ribbon') !== null) {
    state.ribbon = query.get('ribbon');
    const el = document.getElementById('ribbon');
    if (el) el.value = state.ribbon;
  }
  if (query.get('heat') !== null) {
    state.heat = Math.max(0, Math.min(5, parseInt(query.get('heat'), 10) || 0));
    const el = document.getElementById('heat');
    if (el) el.value = String(state.heat);
    if (api.syncHeat) api.syncHeat();
  }
  if (query.get('banner') !== null) {
    state.banner = query.get('banner') !== '0';
    const el = document.getElementById('banner');
    if (el) el.checked = state.banner;
  }
  api.setPreviewSize(query.get('size') ?? '1080x1080');
  // Photos for the panels, as a comma-separated `photos=` query param of sample
  // file stems (lady, gangster, police, heli, pier, boulevard); fewer than five
  // cycle round. Default keeps the two original samples alternating.
  const names = (query.get('photos') ?? 'pier,boulevard').split(',').map((s) => s.trim()).filter(Boolean);
  const loaded = await Promise.all(names.map((n) => api.loadImage(`samples/${n}.jpg`)));
  state.photos = [0, 1, 2, 3, 4].map((i) => loaded[i % loaded.length]);
  state.transforms = state.transforms.map(() => ({ x: 0, y: 0, zoom: 1 }));
  // Hero transform override: t0=x,y,zoom pans/zooms the hero slot (slot 0).
  if (query.get('t0') !== null) {
    const [tx, ty, tz] = query.get('t0').split(',').map(Number);
    state.transforms[0] = {
      x: Number.isFinite(tx) ? tx : 0,
      y: Number.isFinite(ty) ? ty : 0,
      zoom: Number.isFinite(tz) && tz > 0 ? tz : 1,
    };
  }
  state.selected = 0;
  api.rebuild();
  api.redraw();
  if (document.fonts?.ready) await document.fonts.ready;
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
