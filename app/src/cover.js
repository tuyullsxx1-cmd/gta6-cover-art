// cover.js — Palm Smoke poster renderer. Pure canvas, no DOM deps besides the canvas.
// Draws the dense movie poster: quote bar, 6-panel cast, giant striped title over a
// sunset scene, and a credit block with barcode, VOL. 1 badge and gold seal.

export const ROLES = ['THE DRIVER', 'THE BOSS', 'THE BRAINS', 'THE FIXER', 'THE LOOKOUT', 'THE GETAWAY'];

export const GRADES = {
  sunset: {
    skyTop: '#3b1d5e', skyMid: '#c22a6d', skyBot: '#ff8a3c',
    band: '#2a1245', frame: '#ffd166', credit: '#fff3d6',
    titleStops: ['#ffd166', '#ff9a3d', '#ff5e78', '#ffe9a8'],
    sun: '#ffd166', ink: '#2a1245', star: '#ffd166',
  },
  neon: {
    skyTop: '#0e0a2e', skyMid: '#7a1fa2', skyBot: '#00b3c8',
    band: '#0e0a2e', frame: '#7df9ff', credit: '#eafcff',
    titleStops: ['#7df9ff', '#c86bff', '#ff5e78', '#fff3a8'],
    sun: '#ff5e78', ink: '#0e0a2e', star: '#7df9ff',
  },
  dusk: {
    skyTop: '#0f1b3d', skyMid: '#5b2a6d', skyBot: '#ff7a3d',
    band: '#0f1b3d', frame: '#ffb35c', credit: '#fff3d6',
    titleStops: ['#ffb35c', '#ff7a3d', '#e84a7a', '#ffe9a8'],
    sun: '#ffb35c', ink: '#0f1b3d', star: '#ffb35c',
  },
};

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Cover-fit draw with a face anchor: for panels wider than 1.3:1 the source rect is
// biased to the upper third (faces live there) unless the user panned.
function drawPanelPhoto(ctx, img, dx, dy, dw, dh, pan) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const targetAspect = dw / dh;
  let sw, sh;
  if (iw / ih > targetAspect) { sh = ih; sw = ih * targetAspect; }
  else { sw = iw; sh = iw / targetAspect; }
  let sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  if (targetAspect > 2.5) sy = Math.max(0, (ih - sh) * 0.38); // extreme strip: show the eyes, not just hair
  else if (targetAspect > 1.3) sy = Math.max(0, (ih - sh) * 0.18);
  const z = pan && pan.zoom ? pan.zoom : 1;
  sw /= z; sh /= z;
  const ox = pan && pan.ox ? pan.ox * sw : 0;
  const oy = pan && pan.oy ? pan.oy * sh : 0;
  sx = clamp(sx + ox, 0, Math.max(0, iw - sw));
  sy = clamp(sy + oy, 0, Math.max(0, ih - sh));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawRoleChip(ctx, x, y, label, H, grade) {
  const fs = Math.max(13, H * 0.021);
  ctx.font = `${fs}px Anton, sans-serif`;
  const pad = fs * 0.55;
  const w = ctx.measureText(label).width + pad * 2;
  const h = fs * 1.9;
  ctx.fillStyle = 'rgba(18, 8, 38, 0.88)';
  rr(ctx, x, y, w, h, h * 0.28);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + pad, y + h / 2 + fs * 0.03);
}

function drawPanel(ctx, img, x, y, w, h, label, pan, H, grade) {
  ctx.save();
  rr(ctx, x, y, w, h, Math.min(10, w * 0.04));
  ctx.clip();
  if (img) drawPanelPhoto(ctx, img, x, y, w, h, pan);
  else { ctx.fillStyle = '#1c1030'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = Math.max(2, H * 0.003);
  rr(ctx, x, y, w, h, Math.min(10, w * 0.04));
  ctx.stroke();
  drawRoleChip(ctx, x + w * 0.04, y + h * 0.045, label, H, grade);
}

function drawSun(ctx, cx, cy, r, color, bandColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // horizontal stripe cuts, thicker toward the bottom
  ctx.fillStyle = bandColor;
  const cuts = [0.18, 0.34, 0.50, 0.66, 0.80];
  cuts.forEach((t, i) => {
    const y = cy + r * t;
    const h = r * (0.045 + i * 0.028);
    ctx.fillRect(cx - r, y, r * 2, h);
  });
  ctx.restore();
}

function drawPalm(ctx, x, baseY, h, color, lean) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, h * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * h * 0.25, baseY - h * 0.55, x + lean * h * 0.12, baseY - h);
  ctx.stroke();
  const tx = x + lean * h * 0.12, ty = baseY - h;
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI * 0.08) - (i * Math.PI) / 7.2;
    const len = h * (0.42 - Math.abs(i - 2.5) * 0.045);
    ctx.lineWidth = Math.max(2, h * 0.03);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.45 - h * 0.10,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len + h * 0.16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkyline(ctx, x, y, w, maxH, color, seed) {
  ctx.fillStyle = color;
  let bx = x;
  let i = 0;
  while (bx < x + w) {
    const bw = w * (0.05 + ((seed * 37 + i * 53) % 10) / 100);
    const bh = maxH * (0.35 + ((seed * 17 + i * 29) % 65) / 100);
    ctx.fillRect(bx, y + maxH - bh, bw, bh);
    bx += bw + w * 0.012;
    i++;
  }
}

function fitFont(ctx, text, maxW, startPx, minPx) {
  let px = startPx;
  while (px > minPx) {
    ctx.font = `${px}px Anton, sans-serif`;
    if (ctx.measureText(text).width <= maxW) return px;
    px *= 0.92;
  }
  ctx.font = `${minPx}px Anton, sans-serif`;
  return minPx;
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff';
  rr(ctx, x, y, w, h, Math.max(3, w * 0.03));
  ctx.fill();
  ctx.fillStyle = '#111';
  const bars = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1];
  let bx = x + w * 0.08;
  const top = y + h * 0.10, bot = y + h * 0.68;
  const unit = (w * 0.84) / bars.reduce((a, b) => a + b, 0);
  bars.forEach((b) => { ctx.fillRect(bx, top, b * unit, bot - top); bx += b * unit; });
  // number fitted inside the white rect, never wider than it
  const num = '8 901234 567890';
  let nfs = Math.max(9, h * 0.13);
  ctx.font = `${nfs}px monospace`;
  while (nfs > 7 && ctx.measureText(num).width > w * 0.84) {
    nfs *= 0.92;
    ctx.font = `${nfs}px monospace`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num, x + w / 2, y + h * 0.84);
}

function drawSeal(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.fillStyle = grade.frame;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = grade.ink;
  ctx.font = `${r * 1.05}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy + r * 0.06);
  ctx.restore();
}

// state: { photos: [Image x6], captions: [string x6], layout: 'grid'|'spotlight',
//          grade: 'sunset'|'neon'|'dusk', pans: [{ox,oy,zoom} x6],
//          title, subtitle, quote, quoteSource }
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const title = state.title || 'PALM SMOKE';
  const subtitle = state.subtitle || 'one last sunset job';
  const quote = state.quote || 'Pure sunshine noir — the getaway of the year.';
  const quoteSource = state.quoteSource || 'THE VICE BAY LEDGER';

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.45, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // quote bar
  const qy = H * 0.02, qh = H * 0.06;
  ctx.fillStyle = grade.band;
  ctx.fillRect(W * 0.012, qy, W * 0.976, qh);
  const qfs0 = Math.max(13, H * 0.026);
  const stars = '★ ★ ★ ★ ★  ';
  const qtext = `"${quote}"`;
  const srcText = `  — ${quoteSource}`;
  let qfs = qfs0;
  let totalW = Infinity;
  while (qfs > 12) {
    ctx.font = `${qfs}px Anton, sans-serif`;
    totalW = ctx.measureText(stars).width + ctx.measureText(qtext).width + ctx.measureText(srcText).width;
    if (totalW <= W * 0.96) break;
    qfs *= 0.92;
  }
  ctx.font = `${qfs}px Anton, sans-serif`;
  let qx = (W - totalW) / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = grade.star;
  ctx.fillText(stars, qx, qy + qh / 2);
  qx += ctx.measureText(stars).width;
  ctx.fillStyle = '#fff';
  ctx.fillText(qtext, qx, qy + qh / 2);
  qx += ctx.measureText(qtext).width;
  ctx.fillStyle = grade.frame;
  ctx.fillText(srcText, qx, qy + qh / 2);

  // cast row
  const photos = state.photos || [];
  const captions = state.captions || ROLES;
  const pans = state.pans || [];
  const wide = W / H >= 1.2;
  const castTop = H * 0.105;
  if (wide) {
    const ph = H * 0.385;
    const gap = W * 0.008;
    const x0 = W * 0.03, x1 = W * 0.97;
    if (state.layout === 'spotlight') {
      const heroW = (x1 - x0) * 0.52;
      drawPanel(ctx, photos[0], x0, castTop, heroW, ph, captions[0], pans[0], H, grade);
      const rx = x0 + heroW + gap, rw = x1 - rx;
      const cols = 3, rows = 2;
      const cw = (rw - (cols - 1) * gap) / cols;
      const rh = (ph - gap) / rows;
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        const n = r === 0 ? cols : 2;
        const rowW = n * cw + (n - 1) * gap;
        const rowX = rx + (rw - rowW) / 2;
        for (let c = 0; c < n && idx < 6; c++) {
          drawPanel(ctx, photos[idx], rowX + c * (cw + gap), castTop + r * (rh + gap), cw, rh, captions[idx], pans[idx], H, grade);
          idx++;
        }
      }
    } else {
      const heroW = (x1 - x0) * 0.30;
      drawPanel(ctx, photos[0], x0, castTop, heroW, ph, captions[0], pans[0], H, grade);
      const rx = x0 + heroW + gap;
      const ow = (x1 - rx - 4 * gap) / 5;
      for (let i = 1; i < 6; i++) {
        drawPanel(ctx, photos[i], rx + (i - 1) * (ow + gap), castTop, ow, ph, captions[i], pans[i], H, grade);
      }
    }
  } else {
    // square / portrait
    const gap = W * 0.012;
    const x0 = W * 0.03, x1 = W * 0.97;
    if (state.layout === 'spotlight') {
      // hero strip across the top, the other five in a row below
      const heroH = H * 0.20;
      drawPanel(ctx, photos[0], x0, castTop, x1 - x0, heroH, captions[0], pans[0], H, grade);
      const rowY = castTop + heroH + H * 0.015;
      const rh = H * 0.17;
      const cw = (x1 - x0 - 4 * gap) / 5;
      for (let i = 1; i < 6; i++) {
        drawPanel(ctx, photos[i], x0 + (i - 1) * (cw + gap), rowY, cw, rh, captions[i], pans[i], H, grade);
      }
    } else {
      // 3 columns x 2 rows, equal panels
      const cw = (x1 - x0 - 2 * gap) / 3;
      const ph = H * 0.185;
      const rowGap = H * 0.018;
      for (let i = 0; i < 6; i++) {
        const r = Math.floor(i / 3), c = i % 3;
        drawPanel(ctx, photos[i], x0 + c * (cw + gap), castTop + r * (ph + rowGap), cw, ph, captions[i], pans[i], H, grade);
      }
    }
  }

  // title band scene
  const bandY = H * 0.485, bandH = H * 0.265;
  const sunR = W * 0.075;
  drawSun(ctx, W * 0.965, bandY + bandH * 0.30, sunR, grade.sun, grade.skyMid);
  drawPalm(ctx, W * 0.018, bandY + bandH, H * 0.16, grade.ink, 1);
  drawPalm(ctx, W * 0.985, bandY + bandH, H * 0.14, grade.ink, -1);
  drawSkyline(ctx, W * 0.05, bandY + bandH - H * 0.012, W * 0.9, H * 0.012, grade.ink, 7);

  // giant striped title — capped at 0.78W and centred slightly left so the sun
  // (right edge) never sits behind any lettering.
  const titlePx = fitFont(ctx, title, W * 0.78, H * 0.24, H * 0.05);
  const tgrad = ctx.createLinearGradient(0, bandY + bandH * 0.12, 0, bandY + bandH * 0.62);
  const stops = grade.titleStops;
  tgrad.addColorStop(0, stops[0]);
  tgrad.addColorStop(0.34, stops[0]);
  tgrad.addColorStop(0.36, stops[1]);
  tgrad.addColorStop(0.54, stops[1]);
  tgrad.addColorStop(0.56, stops[2]);
  tgrad.addColorStop(0.78, stops[2]);
  tgrad.addColorStop(0.80, stops[3]);
  tgrad.addColorStop(1, stops[3]);
  ctx.font = `${titlePx}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = titlePx * 0.06;
  ctx.shadowColor = 'rgba(20, 8, 40, 0.45)';
  ctx.shadowBlur = titlePx * 0.08;
  ctx.shadowOffsetY = titlePx * 0.03;
  const titleY = bandY + bandH * 0.42;
  ctx.strokeText(title, W * 0.465, titleY);
  ctx.fillStyle = tgrad;
  ctx.fillText(title, W * 0.465, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // script subtitle
  const subFs = Math.max(16, H * 0.042);
  ctx.font = `${subFs}px Pacifico, cursive`;
  ctx.fillStyle = grade.credit;
  ctx.fillText(subtitle, W * 0.465, bandY + bandH * 0.82);

  // credit block
  const cy = H * 0.775;
  ctx.fillStyle = grade.credit;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'PALM SMOKE PICTURES   PRESENTS', W * 0.60, H * 0.026, 11);
  ctx.fillText('PALM SMOKE PICTURES   PRESENTS', W * 0.5, cy);
  fitFont(ctx, 'STARRING YOU AND YOUR CREW', W * 0.80, H * 0.04, H * 0.015);
  ctx.fillText('STARRING YOU AND YOUR CREW', W * 0.5, cy + H * 0.042);
  fitFont(ctx, 'SHOT ON YOUR OWN PHONE   •   GRADED AT SUNSET   •   A PALM SMOKE PRODUCTION', W * 0.64, H * 0.02, 10);
  ctx.fillText('SHOT ON YOUR OWN PHONE   •   GRADED AT SUNSET   •   A PALM SMOKE PRODUCTION', W * 0.5, cy + H * 0.088);

  // left: COMING SOON + VOL. 1 (badge sized to its text so nothing overflows it)
  ctx.textAlign = 'left';
  ctx.font = `${Math.max(14, H * 0.036)}px Anton, sans-serif`;
  ctx.fillText('COMING SOON', W * 0.03, cy + H * 0.01);
  ctx.font = `${Math.max(12, H * 0.028)}px Anton, sans-serif`;
  const badgePad = H * 0.012;
  const badgeW = ctx.measureText('VOL. 1').width + badgePad * 2;
  const badgeH = H * 0.042;
  ctx.fillStyle = grade.frame;
  rr(ctx, W * 0.03, cy + H * 0.045, badgeW, badgeH, badgeH * 0.25);
  ctx.fill();
  ctx.fillStyle = grade.ink;
  ctx.textAlign = 'center';
  ctx.fillText('VOL. 1', W * 0.03 + badgeW / 2, cy + H * 0.045 + badgeH / 2 + 1);

  // right: barcode + gold seal (kept apart so the seal never covers the barcode number)
  const bcW = W * 0.068, bcH = H * 0.095;
  drawBarcode(ctx, W * 0.835, cy - H * 0.005, bcW, bcH);
  drawSeal(ctx, W * 0.945, cy + H * 0.042, Math.max(14, H * 0.028), grade);

  // low skyline strip at the very bottom, below all credit text
  drawSkyline(ctx, W * 0.03, H * 0.955, W * 0.94, H * 0.022, grade.ink, 3);

  // gold frame
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(W * 0.012, H * 0.012, W * 0.976, H * 0.976);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.strokeRect(W * 0.02, H * 0.02, W * 0.96, H * 0.96);
}

// Panel rectangles for a given poster size, mirroring drawPoster's layout.
// Used by the editor for click / drag hit-testing.
export function panelRects(state, W, H) {
  const wide = W / H >= 1.2;
  const castTop = H * 0.105;
  const rects = [];
  if (wide) {
    const ph = H * 0.385;
    const gap = W * 0.008;
    const x0 = W * 0.03, x1 = W * 0.97;
    if (state.layout === 'spotlight') {
      const heroW = (x1 - x0) * 0.52;
      rects.push({ x: x0, y: castTop, w: heroW, h: ph });
      const rx = x0 + heroW + gap, rw = x1 - rx;
      const cols = 3, rows = 2;
      const cw = (rw - (cols - 1) * gap) / cols;
      const rh = (ph - gap) / rows;
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        const n = r === 0 ? cols : 2;
        const rowW = n * cw + (n - 1) * gap;
        const rowX = rx + (rw - rowW) / 2;
        for (let c = 0; c < n && idx < 6; c++) {
          rects.push({ x: rowX + c * (cw + gap), y: castTop + r * (rh + gap), w: cw, h: rh });
          idx++;
        }
      }
    } else {
      const heroW = (x1 - x0) * 0.30;
      rects.push({ x: x0, y: castTop, w: heroW, h: ph });
      const rx = x0 + heroW + gap;
      const ow = (x1 - rx - 4 * gap) / 5;
      for (let i = 1; i < 6; i++) rects.push({ x: rx + (i - 1) * (ow + gap), y: castTop, w: ow, h: ph });
    }
  } else {
    const gap = W * 0.012;
    const x0 = W * 0.03, x1 = W * 0.97;
    if (state.layout === 'spotlight') {
      const heroH = H * 0.20;
      rects.push({ x: x0, y: castTop, w: x1 - x0, h: heroH });
      const rowY = castTop + heroH + H * 0.015;
      const rh = H * 0.17;
      const cw = (x1 - x0 - 4 * gap) / 5;
      for (let i = 1; i < 6; i++) rects.push({ x: x0 + (i - 1) * (cw + gap), y: rowY, w: cw, h: rh });
    } else {
      const cw = (x1 - x0 - 2 * gap) / 3;
      const ph = H * 0.185;
      const rowGap = H * 0.018;
      for (let i = 0; i < 6; i++) {
        const r = Math.floor(i / 3), c = i % 3;
        rects.push({ x: x0 + c * (cw + gap), y: castTop + r * (ph + rowGap), w: cw, h: ph });
      }
    }
  }
  return rects;
}
