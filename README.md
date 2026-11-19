# Vice Neon Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/tuyullsxx1-cmd/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/tuyullsxx1-cmd/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Vice Neon Cover Studio is an offline single-page web app that turns your photos and a caption into GTA 6 poster-style cover art, exported as a PNG to share. It was built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on [make.fun](https://make.fun/).

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or open `app/index.html` directly — the app is static files with no build step and works with no network request. Your photos are read on your own machine and never uploaded.

## How it works

1. Load photos — up to five, from your machine or the built-in samples.
2. Pick a layout and a colour grade, write the lettering.
3. Export a PNG in a common post size.

## Features

- **3 layouts**, including the 5-panel Vice Grid (large hero panel + 2×2 grid), Sunset Strip, and Neon Solo.
- **4 colour grades**: Sunset, Neon Night, Vice Gold, and Palm Dusk.
- **5 photo slots** with crop, pan, and zoom per panel; fill all panels with one photo or use several.
- **3 export sizes**: 1080×1080, 1080×1350, and 1920×1080 PNG.
- **Sunburst + skyline banner** decoration, drawn on canvas and toggleable.
- **Heat meter** (1–5 stars), editable corner ribbon, place pill, and neon signs.
- **Bold gradient lettering** with a pink script subtitle and tagline, in Anton and Pacifico (SIL Open Font License), loaded from local files.
- Fully offline: no network requests, no uploads, no tracking.

## License

MIT, see [LICENSE](LICENSE).
