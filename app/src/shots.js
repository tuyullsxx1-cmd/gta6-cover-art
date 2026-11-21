// shots.js — reads ?shot=... staging params for screenshots.
//   ?shot=cover  renders the export view full-bleed (the poster only)
//   ?shot=editor shows the editor with a photo loaded
// Optional: photo=cast-1..6 (hero sample), caption=..., grade=sunset|neon|dusk,
// layout=grid|spotlight, size=1080x1080|1080x1350|1920x1080.
export function parseShot() {
  const q = new URLSearchParams(location.search);
  return {
    shot: q.get('shot') || '',
    photo: q.get('photo') || '',
    caption: q.get('caption') || '',
    grade: q.get('grade') || '',
    layout: q.get('layout') || '',
    size: q.get('size') || '',
  };
}

export function sampleSrc(photo) {
  const m = /^cast-[1-6]$/.exec(photo || '');
  return m ? `samples/${photo}.jpg` : 'samples/cast-1.jpg';
}
