// cover.js — canvas poster renderer for Palm Smoke Studio.
// Draws the dense movie-poster export: quote bar, cast grid, striped
// title, credit block with skyline, barcode and seal. No network: photos
// are local files or user data URLs; fonts are local @font-face files
// (Anton for display, Pacifico for the script subtitle).

export const GRADES = {
  sunset: {
    bgTop: '#2b1a4e', bgMid: '#c94b6d', bgBottom: '#f7a13b',
    sun: '#ffd76a',
    title: ['#ffe27a', '#ffb347', '#ff7e5f', '#f9537e', '#ffe27a'],
    accent: '#ffd76a', chip: '#1c1033', chipText: '#ffe9a8',
    quote: '#ffe9a8', paper: '#ffb347', frame: '#ffd76a', credit: '#fff3d6',
    skyline: 'rgba(24, 8, 44, 0.55)', panelBorder: '#fff3d6',
  },
  neon: {
    bgTop: '#12002e', bgMid: '#7b2ff7', bgBottom: '#00b8d4',
    sun: '#ff2fb3',
    title: ['#00f0ff', '#ff2fb3', '#ffe600', '#ff2fb3', '#00f0ff'],
    accent: '#ff2fb3', chip: '#0d0221', chipText: '#aef3ff',
    quote: '#aef3ff', paper: '#ff7ad9', frame: '#ff2fb3', credit: '#eafcff',
    skyline: 'rgba(10, 0, 32, 0.55)', panelBorder: '#eafcff',
  },
  dusk: {
    bgTop: '#0f2a43', bgMid: '#5b4a8a', bgBottom: '#e8736b',
    sun: '#ffc46b',
    title: ['#ffe9a8', '#f7a13b', '#c96a8a', '#7b5ea7', '#ffe9a8'],
    accent: '#ffc46b', chip: '#12233a', chipText: '#ffe9a8',
    quote: '#ffe9a8', paper: '#f7a13b', frame: '#ffc46b', credit: '#fdf3e3',
    skyline: 'rgba(12, 22, 44, 0.55)', panelBorder: '#fdf3e3',
  },
};

export const CAST = [
  { src: 'samples/cast-1.jpg', role: 'THE DRIVER' },
  { src: 'samples/cast-2.jpg', role: 'THE BOSS' },
  { src: 'samples/cast-3.jpg', role: 'THE BRAINS' },
  { src: 'samples/cast-4.jpg', role: 'THE FIXER' },
  { src: 'samples/cast-5.jpg', role: 'THE LOOKOUT' },
  { src: 'samples/cast-6.jpg', role: 'THE GETAWAY' },
];

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// ---- small drawing helpers -------------------------------------------------

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Shrink a font until `text` fits `maxWidth`; returns the final size.
export function fitFont(ctx, text, family, startSize, maxWidth, weight = '') {
  let size = startSize;
  for (let i = 0; i < 24; i++) {
    ctx.font = `${weight} ${size}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxWidth || size <= 8) return size;
    size = Math.floor(size * 0.92);
  }
  ctx.font = `${weight} ${size}px ${family}`.trim();
  return size;
}

// ---- poster geometry (fractions of W/H, so all 3 sizes share the code) ----

export function zones(W, H) {
  const m = Math.round(W * 0.022);
  const gap = Math.max(6, Math.round(W * 0.006));
  const landscape = W / H >= 1.4;
  return {
    m, gap, landscape,
    quote: { x: m, y: Math.round(H * 0.018), w: W - 2 * m, h: Math.round(H * 0.068) },
    grid: { x: m, y: Math.round(H * 0.104), w: W - 2 * m, h: Math.round(H * 0.428) },
    title: { x: m, y: Math.round(H * 0.54), w: W - 2 * m, h: Math.round(H * 0.22) },
    credits: { x: m, y: Math.round(H * 0.776), w: W - 2 * m, h: Math.round(H * 0.20) },
  };
}

// Panel rectangles for the 6 slots. rects[0] is always the hero.
export function panelRects(W, H, layout) {
  const z = zones(W, H);
  const g = z.grid;
  const gap = z.gap;
  const rects = [];
  if (z.landscape) {
    if (layout === 'spotlight') {
      const heroW = Math.round(g.w * 0.4);
      const colW = Math.round((g.w - heroW - 2 * gap) / 2);
      const heroX = g.x + colW + gap;
      const rightX = heroX + heroW + gap;
      rects.push({ x: heroX, y: g.y, w: heroW, h: g.h });
      const lh = Math.floor((g.h - gap) / 2);
      rects.push({ x: g.x, y: g.y, w: colW, h: lh });
      rects.push({ x: g.x, y: g.y + lh + gap, w: colW, h: g.h - lh - gap });
      const rh = Math.floor((g.h - 2 * gap) / 3);
      rects.push({ x: rightX, y: g.y, w: colW, h: rh });
      rects.push({ x: rightX, y: g.y + rh + gap, w: colW, h: rh });
      rects.push({ x: rightX, y: g.y + 2 * (rh + gap), w: colW, h: g.h - 2 * (rh + gap) });
    } else {
      // grid: hero left, five panels in a row on the right
      const heroW = Math.round(g.w * 0.34);
      const sw = Math.floor((g.w - heroW - 5 * gap) / 5);
      rects.push({ x: g.x, y: g.y, w: heroW, h: g.h });
      for (let i = 0; i < 5; i++) {
        rects.push({ x: g.x + heroW + gap + i * (sw + gap), y: g.y, w: sw, h: g.h });
      }
    }
  } else if (layout === 'spotlight') {
    // portrait/square: hero full width on top, then 3 panels, then 2 centred
    const heroH = Math.round(g.h * 0.5);
    rects.push({ x: g.x, y: g.y, w: g.w, h: heroH });
    const rowH = Math.floor((g.h - heroH - 2 * gap) / 2);
    const y1 = g.y + heroH + gap;
    const y2 = y1 + rowH + gap;
    const w3 = Math.floor((g.w - 2 * gap) / 3);
    for (let i = 0; i < 3; i++) rects.push({ x: g.x + i * (w3 + gap), y: y1, w: w3, h: rowH });
    const w2 = Math.floor((g.w - gap) / 2);
    const x0 = g.x + Math.floor((g.w - (2 * w2 + gap)) / 2);
    rects.push({ x: x0, y: y2, w: w2, h: rowH });
    rects.push({ x: x0 + w2 + gap, y: y2, w: w2, h: rowH });
  } else {
    // grid portrait/square: hero full width on top, five panels in a row below
    const heroH = Math.round(g.h * 0.56);
    rects.push({ x: g.x, y: g.y, w: g.w, h: heroH });
    const sh = g.h - heroH - gap;
    const sw = Math.floor((g.w - 4 * gap) / 5);
    for (let i = 0; i < 5; i++) {
      rects.push({ x: g.x + i * (sw + gap), y: g.y + heroH + gap, w: sw, h: sh });
    }
  }
  return rects;
}

// ---- poster bands ----------------------------------------------------------

// One photo panel: cover-fit with the slot's zoom/pan, border, role chip.
function drawPanel(ctx, slot, rect, role, grade, isHero, W) {
  const { x, y, w, h } = rect;
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.max(4, W * 0.003));
  ctx.clip();
  if (slot.img) {
    const iw = slot.img.naturalWidth;
    const ih = slot.img.naturalHeight;
    const base = Math.max(w / iw, h / ih) * (slot.zoom || 1);
    const dw = iw * base;
    const dh = ih * base;
    // Faces sit in the upper part of a portrait: when the panel is much
    // wider than tall, anchor the crop on the upper third instead of the
    // middle, unless the user has panned vertically.
    const vAnchor = (slot.oy || 0) !== 0 ? 0.5 : (w > h * 1.3 ? 0.32 : 0.5);
    const dx = x + (w - dw) / 2 + (slot.ox || 0) * w;
    const dy = y + (h - dh) * vAnchor + (slot.oy || 0) * h;
    ctx.drawImage(slot.img, dx, dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, grade.bgMid);
    grad.addColorStop(1, grade.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
  // gentle bottom shade so the chip reads on any photo
  const shade = ctx.createLinearGradient(x, y, x, y + h);
  shade.addColorStop(0, 'rgba(0,0,0,0.28)');
  shade.addColorStop(0.25, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // border
  ctx.save();
  ctx.lineWidth = isHero ? Math.max(4, W * 0.0025) : Math.max(2, W * 0.0015);
  ctx.strokeStyle = isHero ? grade.accent : grade.panelBorder;
  roundRect(ctx, x, y, w, h, Math.max(4, W * 0.003));
  ctx.stroke();
  ctx.restore();

  // role chip, top-left inside the panel
  const chipSize = Math.max(13, Math.min(h * 0.085, w * 0.11, 34));
  ctx.font = `${chipSize}px Anton`;
  const tw = ctx.measureText(role).width;
  const padX = Math.round(chipSize * 0.55);
  const padY = Math.round(chipSize * 0.42);
  const cw = tw + padX * 2;
  const ch = chipSize + padY * 2;
  const cx = x + Math.max(6, W * 0.004);
  const cy = y + Math.max(6, W * 0.004);
  ctx.save();
  ctx.fillStyle = grade.chip;
  ctx.globalAlpha = 0.92;
  roundRect(ctx, cx, cy, cw, ch, Math.max(3, ch * 0.25));
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = grade.chipText;
  ctx.textBaseline = 'middle';
  ctx.fillText(role, cx + padX, cy + ch / 2 + chipSize * 0.04);
}

// Top quote bar: five gold stars + invented quote + fake newspaper name.
function drawQuoteBar(ctx, zone, state, grade, W) {
  const { x, y, w, h } = zone;
  const quote = `"${state.quote}"`;
  const paper = `— ${state.paper}`;
  let size = Math.max(14, Math.round(h * 0.42));
  let starR = Math.round(h * 0.26);
  let gap = Math.round(W * 0.012);
  for (let i = 0; i < 8; i++) {
    ctx.font = `${size}px Anton`;
    const qw = ctx.measureText(quote).width;
    ctx.font = `${size * 0.82}px Anton`;
    const pw = ctx.measureText(paper).width;
    const total = 5 * starR * 2 + 4 * (starR * 0.5) + gap + qw + gap + pw;
    if (total <= w) break;
    size = Math.floor(size * 0.9);
    starR = Math.max(6, Math.floor(starR * 0.9));
  }
  ctx.font = `${size}px Anton`;
  const qw = ctx.measureText(quote).width;
  ctx.font = `${size * 0.82}px Anton`;
  const pw = ctx.measureText(paper).width;
  const starsW = 5 * starR * 2 + 4 * (starR * 0.5);
  const total = starsW + gap + qw + gap + pw;
  let cx = x + (w - total) / 2;
  const cy = y + h / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx + starR, cy, starR, grade.accent);
    cx += starR * 2 + starR * 0.5;
  }
  cx += gap - starR * 0.5;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grade.quote;
  ctx.font = `${size}px Anton`;
  ctx.fillText(quote, cx, cy + size * 0.04);
  cx += qw + gap;
  ctx.fillStyle = grade.paper;
  ctx.font = `${size * 0.82}px Anton`;
  ctx.fillText(paper, cx, cy + size * 0.04);
}

// ---- middle-band sunset scene (drawn BEHIND the title) --------------------
// The band between the cast grid and the credit block used to be a flat
// empty gradient. Now it carries a sunset scene: warm sky wash, one large
// retro sun with stripe cuts at the right edge (never behind the lettering),
// palm silhouettes framing the far edges, and a thin skyline at the very
// bottom edge of the band.

// Retro sun: solid disc with horizontal stripe cuts in its lower half.
// Drawn as clipped horizontal slices so the gaps show the sky beneath.
function drawSun(ctx, cx, cy, r, color, skyGrad) {
  ctx.save();
  // soft glow around the disc
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.1, cy - r * 2.1, r * 4.2, r * 4.2);
  ctx.globalAlpha = 1;
  // disc, sliced: solid top, then stripes of growing gaps toward the bottom
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  let y = cy - r;
  const bottom = cy + r;
  // solid cap down to just below the middle
  const solidEnd = cy + r * 0.05;
  ctx.fillRect(cx - r, y, r * 2, solidEnd - y);
  y = solidEnd;
  const gaps = [0.05, 0.07, 0.09, 0.12];
  let gi = 0;
  while (y < bottom) {
    const solidH = r * 0.07;
    ctx.fillRect(cx - r, y, r * 2, solidH);
    y += solidH;
    const gapH = r * (gaps[Math.min(gi, gaps.length - 1)]);
    gi++;
    y += gapH;
  }
  ctx.restore();
}

// One palm silhouette: leaning trunk + drooping fronds, drawn inside the
// given box so it never reaches the lettering.
function drawPalm(ctx, x, yBase, h, lean, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, h * 0.045);
  ctx.lineCap = 'round';
  const topX = x + lean;
  const topY = yBase - h;
  ctx.beginPath();
  ctx.moveTo(x, yBase);
  ctx.quadraticCurveTo(x + lean * 0.4, yBase - h * 0.55, topX, topY);
  ctx.stroke();
  // fronds fan out from the crown
  const fronds = 6;
  for (let i = 0; i < fronds; i++) {
    const a = (-Math.PI * 0.08) - (i * Math.PI) / (fronds * 1.15);
    const len = h * (0.42 + (i % 2) * 0.08);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + len * 0.28;
    ctx.lineWidth = Math.max(2, h * 0.02);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.5,
      topY + Math.sin(a) * len * 0.35 - len * 0.12,
      ex, ey,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitleScene(ctx, zone, grade, W, H) {
  const bandY = Math.round(H * 0.532);
  const bandH = Math.round(H * 0.776) - bandY;
  const bandX = zone.x;
  const bandW = zone.w;
  // warm sky wash over the band so it reads as sky, not flat gradient
  const wash = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  wash.addColorStop(0, grade.bgMid);
  wash.addColorStop(1, grade.bgBottom);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(bandX, bandY, bandW, bandH);
  ctx.restore();

  // sun: right edge, high in the band, clear of the lettering. The title
  // spans at most ~85% of the width, so its right edge sits near 0.91W;
  // the disc starts just right of that and is clipped by the poster edge.
  const r = Math.round(Math.min(W * 0.05, bandH * 0.34));
  const cx = W - zone.x - Math.round(r * 0.35);
  const cy = bandY + Math.round(bandH * 0.3);
  drawSun(ctx, cx, cy, r, grade.sun);

  // palms frame the far edges only (left margin, and right below the sun)
  const palmColor = 'rgba(22, 10, 46, 0.85)';
  drawPalm(ctx, bandX + W * 0.012, bandY + bandH, Math.round(bandH * 0.72), W * 0.02, palmColor);
  drawPalm(ctx, bandX + W * 0.052, bandY + bandH, Math.round(bandH * 0.55), -W * 0.015, palmColor);
  drawPalm(ctx, W - W * 0.012, bandY + bandH, Math.round(bandH * 0.42), -W * 0.018, palmColor);

  // thin low skyline at the very bottom edge of the band
  ctx.save();
  ctx.fillStyle = 'rgba(22, 10, 46, 0.75)';
  const sh = Math.max(5, Math.round(bandH * 0.035));
  const sws = [0.06, 0.04, 0.08, 0.05, 0.07, 0.045, 0.09, 0.05];
  const shs = [0.7, 1, 0.55, 0.9, 0.65, 0.8, 0.5, 0.95];
  let bx = bandX;
  for (let i = 0; i < sws.length; i++) {
    const bw = sws[i] * bandW;
    const bh = shs[i] * sh;
    ctx.fillRect(bx, bandY + bandH - bh, bw * 0.9, bh);
    bx += bw;
    if (bx > bandX + bandW) break;
  }
  ctx.restore();
}

// Giant striped title + pink script subtitle, never overlapping a face:
// the title lives in its own band below the cast grid.
function drawTitle(ctx, zone, state, grade, W, H) {
  const { x, y, w, h } = zone;
  drawTitleScene(ctx, zone, grade, W, H);
  // soft sun glow behind the title
  const sun = ctx.createRadialGradient(
    x + w / 2, y + h * 0.55, 10,
    x + w / 2, y + h * 0.55, w * 0.42,
  );
  sun.addColorStop(0, grade.sun);
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = sun;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  const title = state.title.toUpperCase();
  // width-driven fit: the title must span ~85% of the band, with slightly
  // tightened letter-spacing. fitFont only shrinks, so start large.
  ctx.letterSpacing = '-1px';
  const size = fitFont(ctx, title, 'Anton', Math.round(h * 1.6), w * 0.85);
  // re-tighten in proportion to the fitted size, then measure the true width
  ctx.letterSpacing = `${Math.max(-Math.round(size * 0.012), -6)}px`;
  ctx.font = `${size}px Anton`;
  const ty = y + h * 0.44;
  // retro horizontal stripes as a hard-stop vertical gradient
  const grad = ctx.createLinearGradient(0, ty - size * 0.75, 0, ty + size * 0.28);
  const stops = grade.title;
  const n = stops.length;
  for (let i = 0; i < n; i++) {
    const p0 = i / n;
    const p1 = (i + 1) / n;
    grad.addColorStop(p0, stops[i]);
    grad.addColorStop(Math.min(0.999, p1 - 0.001), stops[i]);
  }
  grad.addColorStop(1, stops[n - 1]);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton`;
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a2e';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.round(size * 0.05);
  ctx.shadowOffsetY = Math.round(size * 0.02);
  ctx.strokeText(title, x + w / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, x + w / 2, ty);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // script subtitle tucked at the bottom of the band, clear of the title
  const sub = state.subtitle;
  const subSize = fitFont(ctx, sub, 'Pacifico', Math.round(h * 0.13), w * 0.8);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${subSize}px Pacifico`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(sub, x + w / 2, y + h * 0.95);
  ctx.restore();
}

// ---- bottom credit block ---------------------------------------------------
// Every band carries content: skyline silhouette sits BEHIND the credit
// text, never under a floating tagline.

function drawSkyline(ctx, zone, grade, W, H) {
  const base = zone.y + zone.h - Math.round(H * 0.012);
  ctx.save();
  ctx.fillStyle = grade.skyline;
  // deterministic building skyline
  const widths = [0.05, 0.03, 0.07, 0.04, 0.06, 0.035, 0.08, 0.045, 0.055, 0.04, 0.065, 0.05];
  const heights = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.4, 0.85, 0.55, 0.7, 0.45, 0.9];
  // Low silhouette strip only: bars stay in the bottom ~16% of the zone,
  // clear below every credit line and the VOL. 1 badge, never touching text.
  const maxH = zone.h * 0.16;
  let bx = zone.x;
  for (let i = 0; i < widths.length; i++) {
    const bw = widths[i] * zone.w;
    const bh = heights[i] * maxH;
    ctx.fillRect(bx, base - bh, bw * 0.92, bh);
    bx += bw;
    if (bx > zone.x + zone.w) break;
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, W) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  // deterministic bar pattern
  const bars = [3, 1, 2, 1, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1];
  let bx = x + w * 0.06;
  const bw = (w * 0.88) / bars.reduce((a, b) => a + b, 0);
  ctx.fillStyle = '#111111';
  for (const b of bars) {
    ctx.fillRect(bx, y + h * 0.08, bw * b * 0.62, h * 0.62);
    bx += bw * b;
  }
  ctx.fillStyle = '#111111';
  const numSize = fitFont(ctx, '8 901234 567890', 'monospace', Math.max(9, Math.round(h * 0.14)), w * 0.92);
  ctx.font = `${numSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('8 901234 567890', x + w / 2, y + h * 0.86);
  ctx.restore();
}

function drawCredits(ctx, zone, state, grade, W, H) {
  const { x, y, w, h } = zone;
  drawSkyline(ctx, zone, grade, W, H);

  // gold rule above the credits
  ctx.save();
  ctx.fillStyle = grade.frame;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x, y - Math.round(H * 0.006), w, Math.max(2, H * 0.0025));
  ctx.restore();

  const leftW = Math.round(w * 0.17);
  const gapR = Math.max(10, Math.round(W * 0.01));
  // Right block first: seal at the far right, barcode left of it with a
  // gap, so the two can never overlap however narrow the poster is.
  const sealR = Math.min(Math.round(h * 0.26), Math.round(w * 0.05));
  const sx = x + w - sealR - Math.max(4, W * 0.004);
  const sy = y + h * 0.42;
  const bw = Math.min(Math.round(w * 0.11), Math.round(h * 0.95));
  const bh = Math.round(h * 0.52);
  const bx = sx - sealR - gapR - bw;
  const by2 = y + h * 0.14;
  // Centre text gets whatever room is left between the left block and
  // the barcode, so it can never run under either of them.
  const centerX0 = x + leftW;
  const centerW = Math.max(50, bx - gapR - centerX0);
  const centerX = centerX0 + centerW / 2;

  // left: COMING SOON + VOL. 1 badge
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const csSize = fitFont(ctx, 'COMING SOON', 'Anton', Math.round(h * 0.2), leftW);
  ctx.font = `${csSize}px Anton`;
  ctx.fillStyle = grade.credit;
  ctx.fillText('COMING SOON', x, y + h * 0.3);
  const badge = 'VOL. 1';
  const bSize = Math.round(h * 0.16);
  ctx.font = `${bSize}px Anton`;
  const btw = ctx.measureText(badge).width;
  const bPad = Math.round(bSize * 0.6);
  const by = y + h * 0.58;
  ctx.fillStyle = grade.accent;
  roundRect(ctx, x, by, btw + bPad * 2, bSize * 1.7, Math.max(4, bSize * 0.3));
  ctx.fill();
  ctx.fillStyle = '#160a2e';
  ctx.fillText(badge, x + bPad, by + bSize * 0.85 + bSize * 0.05);
  ctx.restore();

  // centre: three credit lines
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grade.credit;
  const l1 = 'PALM SMOKE PICTURES  PRESENTS';
  const l2 = 'STARRING YOU AND YOUR CREW';
  const l3 = 'SHOT ON YOUR OWN PHONE  •  GRADED AT SUNSET  •  A PALM SMOKE PRODUCTION';
  const s1 = fitFont(ctx, l1, 'Anton', Math.round(h * 0.13), centerW);
  ctx.font = `${s1}px Anton`;
  ctx.fillText(l1, centerX, y + h * 0.24);
  const s2 = fitFont(ctx, l2, 'Anton', Math.round(h * 0.19), centerW);
  ctx.font = `${s2}px Anton`;
  ctx.fillText(l2, centerX, y + h * 0.5);
  const s3 = fitFont(ctx, l3, 'Anton', Math.round(h * 0.115), centerW);
  ctx.font = `${s3}px Anton`;
  ctx.fillText(l3, centerX, y + h * 0.76);
  ctx.restore();

  // right: barcode + gold seal (positions computed above)
  drawBarcode(ctx, bx, by2, bw, bh, W);
  ctx.save();
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.arc(sx, sy, sealR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#160a2e';
  ctx.lineWidth = Math.max(2, sealR * 0.08);
  ctx.beginPath();
  ctx.arc(sx, sy, sealR * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  drawStar(ctx, sx, sy, sealR * 0.5, '#160a2e');
  ctx.restore();
}

// ---- render ----------------------------------------------------------------

const imgCache = new Map();

function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  imgCache.set(src, p);
  return p;
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // fall back to system fonts; the poster still renders
  }
}

export async function renderPoster(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  await ensureFonts();
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const s = state.photos[i] || {};
    const img = s.src ? await loadImage(s.src) : null;
    slots.push({ img, zoom: s.zoom || 1, ox: s.ox || 0, oy: s.oy || 0 });
  }
  const ctx = canvas.getContext('2d');
  const z = zones(W, H);

  // background: warm vertical gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, grade.bgTop);
  bg.addColorStop(0.55, grade.bgMid);
  bg.addColorStop(1, grade.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawQuoteBar(ctx, z.quote, state, grade, W);
  const rects = panelRects(W, H, state.layout);
  for (let i = 0; i < 6; i++) {
    drawPanel(ctx, slots[i], rects[i], CAST[i].role, grade, i === 0, W);
  }
  drawTitle(ctx, z.title, state, grade, W, H);
  drawCredits(ctx, z.credits, state, grade, W, H);

  // gold frame around the whole poster
  ctx.save();
  ctx.strokeStyle = grade.frame;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(z.m / 2, z.m / 2, W - z.m, H - z.m);
  ctx.restore();
}

export async function exportPNG(state, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  await renderPoster(c, state);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
