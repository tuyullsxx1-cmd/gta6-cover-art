// shots.js — ?shot= staging presets for screenshots and demos.
export function getShot() {
  const p = new URLSearchParams(location.search);
  const shot = p.get('shot') || 'cover';
  const presets = {
    cover: { mode: 'cover', layout: 'grid', grade: 'sunset', size: [1920, 1080] },
    editor: { mode: 'editor', layout: 'grid', grade: 'sunset', size: [1920, 1080] },
    cover2: { mode: 'cover', layout: 'spotlight', grade: 'neon', size: [1080, 1080] },
    cover3: { mode: 'cover', layout: 'grid', grade: 'dusk', size: [1080, 1350] },
  };
  return presets[shot] || presets.cover;
}
