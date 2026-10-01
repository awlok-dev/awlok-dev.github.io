# Alex Wong — Portfolio

A static portfolio for game development, real-time VFX and 3D art. Hosted at https://awlok-dev.github.io/ through GitHub Pages on the `master` branch.

## Edit content

- `portfolio-content.json`: project descriptions, image/video paths, categories and model links.
- `scripts/build_portfolio.py`: homepage and project page templates.
- `portfolio.css`: responsive visual design.
- `portfolio.js`: featured scene and project selectors, VFX playlist, archive filters, mobile navigation and accessible media dialogs.
- `assets/portfolio/`: optimized WebP thumbnails and WebM video previews. Original media stays under `assets/images/` and `assets/videos/`.

After editing content or templates, run:

```sh
python3 scripts/build_portfolio.py
python3 -m http.server 8000
```

Open http://localhost:8000. Commit the generated HTML together with the content/template changes; GitHub Pages needs no build dependencies. Existing game builds and tools remain available at their original paths.

The homepage and project links work without JavaScript. JavaScript adds scene/project selectors, an inline VFX playlist, filtering and dialogs. The full archive remains available without JavaScript. Video data and third-party players load on demand. The inline VFX player uses a poster and `preload="none"`; playback pauses offscreen and when the tab is hidden. Lightweight WebM previews are included for selected clips, with the original MP4 as a fallback. Other clips play directly from the existing MP4 library; full-quality originals stay available through the media dialog. Model and video dialogs include a direct link to the original media.

## Verification

```sh
python3 scripts/check_portfolio.py
node --check portfolio.js
```

Review desktop/mobile layouts, featured scenes, project selectors, the VFX playlist, filters, the mobile menu, image/video dialogs, Escape-to-close, keyboard focus restoration, model links and project navigation before publishing.
