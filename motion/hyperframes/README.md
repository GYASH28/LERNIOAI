# Lernio HyperFrames Opening

The production landing page uses `HyperframesIntro`, a runtime HTML/CSS version of the same motion design so the sequence remains responsive, accessible and seamless inside the app.

The deterministic render source is:

```text
motion/hyperframes/lernio-opening.html
```

Render it with the HyperFrames CLI:

```bash
hyperframes render motion/hyperframes/lernio-opening.html --out public/motion/lernio-opening.mp4
```

The runtime sequence is preferred for the website because it:

- adapts to mobile and desktop layouts;
- shortens itself for low-power/save-data contexts;
- respects reduced motion;
- avoids loading a large MP4 before the landing page;
- uses the same three-scene narrative as the deterministic composition.

The MP4 render can be used later for promotional videos, social previews or app-store assets without changing the website intro.
