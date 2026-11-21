// main.ts — copies app/ and screenshots/ into $MAKEFUN_OUTPUT_DIR and
// writes the dossier.json for this entry (Node 22, standard library only).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const here = dirname(fileURLToPath(import.meta.url));

mkdirSync(out, { recursive: true });
// Copy the whole app and the staged screenshots next to the dossier,
// so the entry is self-contained and runs offline from the output dir.
for (const dir of ['app', 'screenshots']) {
  const src = resolve(here, dir);
  if (existsSync(src)) cpSync(src, resolve(out, dir), { recursive: true });
}

// buildDossier returns the dossier bytes; write them out as dossier.json.
const dossier = await buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`dossier written to ${out}/dossier.json (${dossier.length} bytes)`);
