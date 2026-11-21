import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const outArg = process.env.MAKEFUN_OUTPUT_DIR || 'out';
const outDir = outArg.startsWith('/') ? outArg : join(process.cwd(), outArg);
const here = process.cwd();

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written to ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
