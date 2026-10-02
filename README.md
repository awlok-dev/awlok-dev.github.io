# Alex Wong — Portfolio

A static portfolio for game development, real-time VFX and 3D art. Hosted at https://awlok-dev.github.io/ through GitHub Pages on the `master` branch.

## Edit content

- `portfolio-content.json`: project descriptions, image/video paths, categories and model links.
- `scripts/build_portfolio.py`: homepage and project page templates.
- `portfolio.css`: responsive visual design.
- `portfolio.js`: featured skill selectors, three circular collection browsers, project filters, replayable title animations, mobile navigation and media dialogs.
- `assets/portfolio/`: optimized WebP thumbnails and WebM video previews. Original media stays under `assets/images/` and `assets/videos/`.

After editing content or templates, run:

```sh
python3 scripts/build_portfolio.py
python3 -m http.server 8000
```

Open http://localhost:8000. Commit the generated HTML together with the content/template changes; GitHub Pages needs no build dependencies. Existing game builds and tools remain available at their original paths.

The homepage and project links work without JavaScript. The opening showcase presents Game Development (Phobos Oddity), VFX (Sword Slash 02), and 3D Arts (Fantasy crystal). The VFX background loads only when selected, plays muted, and includes a pause control. Arrow keys switch scenes. Staggered letter animations start when section headings are well inside the viewport and replay after scrolling away and returning; system reduced-motion preferences disable animation and automatic preview playback.

The homepage has three collections: Projects (21, with Game and Interactive filters), VFX (13), and 3D Arts (18). Each includes all matching works, circular previous/next arrows, a thumbnail index, a position counter, and keyboard navigation. Without JavaScript, all collection panels remain visible. Video data and third-party players load on demand. Inline video players use posters and `preload="none"`; playback pauses offscreen and when the tab is hidden. Lightweight WebM previews are included for selected clips, with the original MP4 as a fallback. Other clips play directly from the existing MP4 library; full-quality originals stay available through the media dialog. Model and video dialogs include a direct link to the original media.

## Verification

```sh
python3 scripts/check_portfolio.py
node --check portfolio.js
```

Review desktop/mobile layouts, featured scenes, carousel wraparound in both directions, Game/Interactive filters, inline players, replaying titles, the mobile menu, image/video dialogs, Escape-to-close, keyboard focus restoration, model links and project navigation before publishing.
