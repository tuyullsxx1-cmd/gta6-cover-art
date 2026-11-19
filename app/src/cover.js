// Vice Neon Cover Studio — the cover drawing engine.
// drawCoverArt(canvas, state) renders a multi-panel GTA-style poster cover at the
// canvas's own pixel size: photo panels, a Vice City colour grade, giant gradient
// title lettering, a pink script subtitle, a tagline, a place pill, a sunburst +
// skyline banner, an EST. badge, a ribbon and a HEAT star meter.
// Everything is drawn with the 2D canvas API; no image leaves the machine.

// The four colour grades. Each grade tints every panel, colours the sky band and
// sets the title gradient, the script colour and the neon accent.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    tintTop: 'rgba(255, 140, 60, 0.10)', tintBottom: 'rgba(190, 30, 110, 0.55)',
    skyTop: '#ff9a3d', skyMid: '#ff5e7a', skyBottom: '#7b2d8b',
    title: ['#ffe259', '#ff9a3d', '#ff2e88'], script: '#ff7ad9', accent: '#ffb347',
    sign: '#7df9ff', frame: 'rgba(255, 255, 255, 0.85)',
  },
  neon: {
    label: 'Neon Night',
    tintTop: 'rgba(0, 229, 255, 0.16)', tintBottom: 'rgba(255, 0, 128, 0.52)',
    skyTop: '#12002e', skyMid: '#5b0a86', skyBottom: '#ff2e88',
    title: ['#7df9ff', '#c77dff', '#ff2e88'], script: '#00e5ff', accent: '#ff2e88',
    sign: '#ffe259', frame: 'rgba(125, 249, 255, 0.9)',
  },
  gold: {
    label: 'Vice Gold',
    tintTop: 'rgba(255, 214, 10, 0.12)', tintBottom: 'rgba(180, 90, 0, 0.55)',
    skyTop: '#fff3b0', skyMid: '#ffb703', skyBottom: '#7a3b00',
    title: ['#fff3b0', '#ffd60a', '#fb8500'], script: '#ffe259', accent: '#ffd60a',
    sign: '#ff7ad9', frame: 'rgba(255, 243, 176, 0.9)',
  },
  dusk: {
    label: 'Palm Dusk',
    tintTop: 'rgba(20, 160, 160, 0.18)', tintBottom: 'rgba(239, 71, 111, 0.50)',
    skyTop: '#0f766e', skyMid: '#e07a5f', skyBottom: '#3d348b',
    title: ['#ffd166', '#ef476f', '#8ecae6'], script: '#8ecae6', accent: '#06d6a0',
    sign: '#ffd166', frame: 'rgba(142, 202, 230, 0.9)',
  },
};

// The three layouts. Each panel is a rectangle in fractions of the cover, plus the
// photo slot it shows. A photo may fill several panels at once.
export const LAYOUTS = {
  grid: {
    label: 'Vice Grid',
    panels: [
      { x: 0, y: 0, w: 0.588, h: 1, slot: 0 },
      { x: 0.6, y: 0, w: 0.194, h: 0.494, slot: 1 },
      { x: 0.806, y: 0, w: 0.194, h: 0.494, slot: 2 },
      { x: 0.6, y: 0.506, w: 0.194, h: 0.494, slot: 3 },
      { x: 0.806, y: 0.506, w: 0.194, h: 0.494, slot: 4 },
    ],
  },
  strip: {
    label: 'Sunset Strip',
    panels: [
      { x: 0, y: 0, w: 0.612, h: 1, slot: 0 },
      { x: 0.624, y: 0, w: 0.376, h: 0.494, slot: 1 },
      { x: 0.624, y: 0.506, w: 0.376, h: 0.494, slot: 2 },
    ],
  },
  solo: {
    label: 'Neon Solo',
    panels: [{ x: 0, y: 0, w: 1, h: 1, slot: 0 }],
  },
};

// Little neon signs painted onto the panels, one per photo slot.
export const SIGNS = ['COLONY HOTEL', 'ARCADE', '24H', 'PALMS', 'VICE'];

export const TITLE_FONT = '"Anton", "Arial Black", sans-serif';
export const SCRIPT_FONT = '"Pacifico", cursive';

/** A fresh default state: five empty photo slots, grid layout, sunset grade. */
export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'Vice City nights',
    tagline: 'EVERY STREET IS A STAGE',
    place: 'VICE BAY',
    ribbon: 'ONE LAST SCORE',
    heat: 4,
    banner: true,
    photos: [null, null, null, null, null],
    transforms: [
      { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 },
      { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 },
    ],
    selected: 0,
  };
}

/** Panels of the state's layout as pixel rectangles on this canvas. */
export function layoutPanels(state, width, height) {
  return LAYOUTS[state.layout].panels.map((p) => ({
    x: p.x * width, y: p.y * height, w: p.w * width, h: p.h * height, slot: p.slot,
  }));
}

/** Which panel (if any) contains point (px, py) on a canvas of this size. */
export function panelAt(state, width, height, px, py) {
  return layoutPanels(state, width, height).find(
    (p) => px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h,
  ) ?? null;
}

// Draws one photo into a panel rectangle, cover-filling it, honouring the slot's
// pan (fractions of the panel) and zoom. An empty slot gets a sunset sky instead.
function drawPanelPhoto(ctx, photo, transform, rect, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, grade.skyTop);
    sky.addColorStop(0.55, grade.skyMid);
    sky.addColorStop(1, grade.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // A low glowing sun and a flat skyline, so an empty panel still reads as Vice City.
    const sunR = Math.min(w, h) * 0.22;
    const sun = ctx.createRadialGradient(x + w * 0.5, y + h * 0.62, sunR * 0.1, x + w * 0.5, y + h * 0.62, sunR);
    sun.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
    sun.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(40, 10, 50, 0.85)';
    const base = y + h * 0.78;
    const bw = w / 7;
    for (let i = 0; i < 7; i++) {
      const bh = h * (0.08 + ((i * 37) % 10) / 100);
      ctx.fillRect(x + i * bw, base - bh, bw * 0.8, bh + h * 0.22);
    }
  } else {
    const baseScale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const scale = baseScale * transform.zoom;
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const dx = x + (w - pw) / 2 + transform.x * w;
    const dy = y + (h - ph) / 2 + transform.y * h;
    ctx.drawImage(photo, dx, dy, pw, ph);
  }
  const tint = ctx.createLinearGradient(0, y, 0, y + h);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// A small glowing neon sign in the top corner of a panel.
function drawNeonSign(ctx, text, rect, grade, scale) {
  const pad = 10 * scale;
  ctx.save();
  ctx.font = `bold ${Math.max(11, 13 * scale)}px ${TITLE_FONT}`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 2;
  const bh = Math.max(18, 24 * scale);
  ctx.fillStyle = 'rgba(10, 5, 25, 0.72)';
  ctx.fillRect(rect.x + pad, rect.y + pad, bw, bh);
  ctx.strokeStyle = grade.sign;
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeRect(rect.x + pad, rect.y + pad, bw, bh);
  ctx.fillStyle = grade.sign;
  ctx.shadowColor = grade.sign;
  ctx.shadowBlur = 10 * scale;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + pad * 2, rect.y + pad + bh / 2 + 1);
  ctx.restore();
}

// The giant title: gradient fill, dark outline, drop shadow, shrinking to fit.
function drawTitle(ctx, text, width, height, grade) {
  const clean = text.trim().toUpperCase();
  if (!clean) return;
  const bandY = height * 0.66;
  const bandH = height * 0.34;
  const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.55, grade.title[1]);
  grad.addColorStop(1, grade.title[2]);
  const band = ctx.createLinearGradient(0, bandY, 0, height);
  band.addColorStop(0, 'rgba(15, 5, 30, 0)');
  band.addColorStop(0.35, 'rgba(15, 5, 30, 0.55)');
  band.addColorStop(1, 'rgba(15, 5, 30, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, width, height - bandY);
  let size = height * 0.115;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fit = () => {
    ctx.font = `${size}px ${TITLE_FONT}`;
    return ctx.measureText(clean).width <= width * 0.94;
  };
  while (!fit() && size > 14) size -= 2;
  ctx.font = `${size}px ${TITLE_FONT}`;
  const ty = height * 0.805;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20, 5, 30, 0.9)';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.75)';
  ctx.shadowBlur = size * 0.28;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(clean, width / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(clean, width / 2, ty);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return { size, y: ty };
}

// Pink script subtitle, tucked just under the title, plus the letterspaced tagline.
function drawSubtitleAndTagline(ctx, state, width, height, grade, titleInfo) {
  const scale = height / 1080;
  if (state.subtitle.trim()) {
    const size = Math.max(20, height * 0.048);
    ctx.save();
    ctx.font = `${size}px ${SCRIPT_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.script;
    ctx.shadowColor = grade.script;
    ctx.shadowBlur = 16 * scale;
    ctx.fillText(state.subtitle.trim(), width / 2, (titleInfo?.y ?? height * 0.84) + size * 1.05);
    ctx.restore();
  }
  if (state.tagline.trim()) {
    const text = state.tagline.trim().toUpperCase();
    const size = Math.max(11, height * 0.02);
    ctx.save();
    ctx.font = `bold ${size}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = `${Math.max(3, size * 0.35)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    const y = height - Math.max(14, height * 0.022);
    const lineW = Math.min(width * 0.3, 220 * scale);
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(width / 2 - ctx.measureText(text).width / 2 - lineW - 14, y - size * 0.35);
    ctx.lineTo(width / 2 - ctx.measureText(text).width / 2 - 14, y - size * 0.35);
    ctx.moveTo(width / 2 + ctx.measureText(text).width / 2 + 14, y - size * 0.35);
    ctx.lineTo(width / 2 + ctx.measureText(text).width / 2 + lineW + 14, y - size * 0.35);
    ctx.stroke();
    ctx.fillText(text, width / 2, y);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.restore();
  }
}

// Diagonal ribbon across the top-left corner, the EST. badge top-right, and the
// HEAT star meter just below the badge. Ribbon text and heat come from state.
function drawRibbonAndBadge(ctx, state, width, height, grade) {
  const scale = height / 1080;
  const ribbon = (state.ribbon ?? 'ONE LAST SCORE').trim().toUpperCase();
  if (ribbon) {
    ctx.save();
    ctx.translate(width * 0.02, height * 0.055);
    ctx.rotate(-0.06);
    ctx.font = `bold ${Math.max(12, height * 0.02)}px ${TITLE_FONT}`;
    const rw = ctx.measureText(ribbon).width + 36 * scale;
    const rh = Math.max(20, height * 0.032);
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8 * scale;
    ctx.fillRect(0, 0, rw, rh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#16041f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbon, 18 * scale, rh / 2 + 1);
    ctx.restore();
  }
  const cx = width - Math.max(34, width * 0.055);
  const cy = Math.max(34, height * 0.05);
  const r = Math.max(26, height * 0.038);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 5, 30, 0.78)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, 2.5 * scale);
  ctx.strokeStyle = grade.accent;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(10, r * 0.34)}px ${TITLE_FONT}`;
  ctx.fillText('EST.', cx, cy - r * 0.22);
  ctx.font = `bold ${Math.max(12, r * 0.44)}px ${TITLE_FONT}`;
  ctx.fillText('2026', cx, cy + r * 0.28);
  ctx.restore();
  const heat = Math.max(0, Math.min(5, Math.round(state.heat ?? 4)));
  if (heat > 0) {
    const size = Math.max(12, height * 0.019);
    const stars = '★'.repeat(heat) + '☆'.repeat(5 - heat);
    ctx.save();
    ctx.font = `bold ${size}px ${TITLE_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const rightX = width - Math.max(24, width * 0.028);
    const y = cy + r + Math.max(14, height * 0.026);
    ctx.fillStyle = grade.script;
    ctx.shadowColor = grade.script;
    ctx.shadowBlur = 10 * scale;
    ctx.fillText(stars, rightX, y);
    const sw = ctx.measureText(stars).width;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText('HEAT ', rightX - sw - 8 * scale, y);
    ctx.restore();
  }
}

// The place pill: a dark pill with gold text, centred just above the title band.
function drawPlacePill(ctx, state, width, height, grade) {
  const place = (state.place ?? '').trim().toUpperCase();
  if (!place) return;
  const scale = height / 1080;
  const text = `★ ${place} ★`;
  ctx.save();
  ctx.font = `bold ${Math.max(11, height * 0.019)}px ${TITLE_FONT}`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 34 * scale;
  const ph = Math.max(20, height * 0.032);
  const x = (width - pw) / 2;
  const y = height * 0.6;
  ctx.fillStyle = 'rgba(15, 5, 30, 0.82)';
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, ph / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe259';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, y + ph / 2 + 1);
  ctx.restore();
}

// The bottom banner: a gradient strip with sunburst rays and a black skyline
// silhouette (tiny yellow windows, palm silhouettes at the edges), drawn by the
// app's own canvas code. It sits behind the tagline at the very bottom.
function drawSkylineBanner(ctx, width, height, grade) {
  const y0 = height * 0.875;
  const y1 = height;
  const bandH = y1 - y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, width, bandH);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, grade.skyTop);
  grad.addColorStop(0.5, grade.skyMid);
  grad.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, width, bandH);
  // Sunburst rays fanning up from a point just below the band.
  const cx = width / 2;
  const cy = y1 + bandH * 0.25;
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    const a0 = Math.PI + (i / rays) * Math.PI;
    const a1 = Math.PI + ((i + 0.5) / rays) * Math.PI;
    const r = bandH * 3.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 240, 180, 0.13)' : 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
  }
  // Skyline silhouette with tiny lit windows.
  const n = 18;
  const bw = width / n;
  ctx.fillStyle = 'rgba(8, 2, 18, 0.92)';
  for (let i = 0; i < n; i++) {
    const bh = bandH * (0.3 + (((i * 37) % 10) / 10) * 0.45);
    ctx.fillRect(i * bw, y1 - bh, bw * 0.82, bh);
    ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        if ((i + row * 2 + col) % 3 !== 0) continue;
        const wx = i * bw + bw * (0.18 + col * 0.36);
        const wy = y1 - bh + bandH * (0.12 + row * 0.3);
        ctx.fillRect(wx, wy, Math.max(2, bw * 0.06), Math.max(2, bandH * 0.07));
      }
    }
    ctx.fillStyle = 'rgba(8, 2, 18, 0.92)';
  }
  // Palm silhouettes at both edges of the band.
  const drawPalm = (px, lean) => {
    const trunkH = bandH * 0.95;
    const topX = px + lean * bandH * 0.28;
    const topY = y1 - trunkH;
    ctx.strokeStyle = 'rgba(8, 2, 18, 0.95)';
    ctx.lineWidth = Math.max(2, bandH * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, y1);
    ctx.quadraticCurveTo(px + lean * bandH * 0.1, y1 - trunkH * 0.55, topX, topY);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, bandH * 0.035);
    for (let f = 0; f < 5; f++) {
      const ang = Math.PI * (0.08 + f * 0.21);
      const fx = topX + Math.cos(ang) * bandH * 0.52 * (lean >= 0 ? 1 : -1);
      const fy = topY + Math.sin(ang) * bandH * 0.34;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + (fx - topX) * 0.5, topY - bandH * 0.18, fx, fy);
      ctx.stroke();
    }
  };
  drawPalm(width * 0.045, 1);
  drawPalm(width * 0.955, -1);
  ctx.restore();
}

/** Renders the whole cover onto `canvas` at its own pixel size. `highlightSlot`
 *  (editor only) outlines the selected panel so the user sees which slot is active. */
export function drawCoverArt(canvas, state, highlightSlot = null) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const grade = GRADES[state.grade];
  const scale = height / 1080;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#16041f';
  ctx.fillRect(0, 0, width, height);
  const panels = layoutPanels(state, width, height);
  for (const panel of panels) {
    drawPanelPhoto(ctx, state.photos[panel.slot], state.transforms[panel.slot], panel, grade);
    drawNeonSign(ctx, SIGNS[panel.slot], panel, grade, scale);
    ctx.strokeStyle = grade.frame;
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(panel.x + 1, panel.y + 1, panel.w - 2, panel.h - 2);
    if (highlightSlot === panel.slot) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, 5 * scale);
      ctx.setLineDash([14 * scale, 8 * scale]);
      ctx.strokeRect(panel.x + 4, panel.y + 4, panel.w - 8, panel.h - 8);
      ctx.restore();
    }
  }
  // Vignette: darkens the corners so the lettering pops.
  const vig = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 2, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  const titleInfo = drawTitle(ctx, state.title, width, height, grade);
  if (state.banner !== false) drawSkylineBanner(ctx, width, height, grade);
  drawPlacePill(ctx, state, width, height, grade);
  drawSubtitleAndTagline(ctx, state, width, height, grade, titleInfo);
  drawRibbonAndBadge(ctx, state, width, height, grade);
}

/** The three export sizes, in pixels. */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: '1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: '1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: '1920 × 1080', width: 1920, height: 1080 },
];

/** Renders the cover at an export size and returns a PNG blob. */
export function exportCoverBlob(state, sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  drawCoverArt(off, state);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}
