![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/tuyullsxx1-cmd/gta6-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/tuyullsxx1-cmd/gta6-cover-art/reward.svg)

# Palm Smoke Studio

Turn your photos into a sun-soaked movie poster. A static, offline
single-page web app: load up to 6 of your own photos (they never leave
your machine), crop, pan and zoom each one inside its panel, edit the
caption live, and export a dense movie-poster PNG.

Bounty: https://make.fun/bounty/gta6-cover-art-01

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests. Everything — photos, fonts, code —
is local.

## What the poster has

- **Top quote bar** — five gold stars, an invented quote, and a fake
  newspaper name (THE VICE BAY LEDGER). Never a real publication.
- **Cast grid** — six panels, each a different person with a role chip:
  THE DRIVER, THE BOSS, THE BRAINS, THE FIXER, THE LOOKOUT, THE GETAWAY.
  One large hero panel plus smaller panels. Two layouts: Cast grid and
  Spotlight.
- **Giant striped title** — retro sunset-striped gradient lettering
  (gold-orange-pink) with a pink script subtitle. The title lives in its
  own band and never overlaps a face.
- **Bottom credit block** — fake production credits, a drawn barcode,
  COMING SOON, a VOL. 1 badge and a gold seal, over a skyline silhouette
  that sits behind the text. No dead empty band anywhere.
- **Three colour grades** — Sunset, Neon, Dusk.
- **Three export sizes** — 1080×1080, 1080×1350, 1920×1080 PNG.
- **Six built-in sample portraits** — AI-generated fictional people at
  golden hour, so the app works with photos loaded out of the box.
- **Screenshot staging** — `?shot=cover` renders the export view
  full-bleed, `?shot=editor` shows the editor with a photo loaded
  (see `shots.json`).

All artwork, names, roles, quotes and credits are invented. No Rockstar
logo, wordmark, official artwork, characters, or fonts are used.

## Files

- `app/index.html`, `app/style.css` — editor shell and styling.
- `app/src/main.js` — editor state, controls, pan/zoom gestures, export.
- `app/src/cover.js` — the canvas poster renderer and PNG export.
- `app/src/shots.js` — `?shot=` staging params.
- `app/fonts/` — Anton and Pacifico (see below).
- `app/samples/` — six generated cast portraits.
- `main.ts` — copies `app/` and `screenshots/` to the output dir and
  writes `dossier.json`.

## Fonts

- **Anton** (display) and **Pacifico** (script), both under the
  [SIL Open Font License 1.1](https://openfontlicense.org/). Source:
  https://github.com/google/fonts (ofl/anton, ofl/pacifico). License
  texts are included in `app/fonts/OFL.txt` summaries below; the full
  OFL text ships with the google/fonts repository.

## License

MIT — see `LICENSE`.
