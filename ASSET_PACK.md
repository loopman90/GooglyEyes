# GooglyEyes Asset Pack

GooglyEyes exposes only completed skins in the UI.

All active skins use the layered renderer. That means PNGs provide only the fixed art that should not move: a tab-panel mask, a thumbnail, and clean left/right base eyes. Iris, pupil, glow, eyelids, blinking, mouse tracking, and reaction poses are drawn at runtime with DOM/CSS.

Asset layout:

```text
assets/
  skins/
    robot/
      skin.json
      eyes/
        left-base.png         # no iris, no pupil, no lids
        right-base.png        # no iris, no pupil, no lids
      masks/
        tab-panel.png         # full embedded Obsidian panel overlay
      thumbnail.png
    cat/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    manga-female/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    dragon/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    tibetan-monk/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    alien/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    hacker/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    anonymous/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    ice-hockey/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
    clown/
      skin.json
      eyes/
        left-base.png
        right-base.png
      masks/
        tab-panel.png
      thumbnail.png
```

Every active skin folder contains `thumbnail.png` and `skin.json`. Skins listed in `layeredSkins` contain `eyes/left-base.png` and `eyes/right-base.png`. Skins listed in `maskSkins` contain `masks/tab-panel.png`, a full-stage overlay that makes the eyes look embedded inside an Obsidian tab.

Mask rule:

- `masks/tab-panel.png` must be a 1774x887 RGBA PNG.
- The mask must fill the complete rectangular tab panel; every outer edge pixel must be opaque.
- Only the two eye openings should be transparent. The outside of the panel may not be transparent, because that makes the skin feel like a floating cutout instead of an embedded Obsidian tab.
- `npm run validate-assets` enforces this rule for every active mask skin.

Runtime eye scale rule:

- Every layered skin must define `defaults.irisSize` and `defaults.pupilSize` in `skin.json`.
- `irisSize` is a percentage of the eye-window width and must stay between 26 and 44.
- `pupilSize` is a percentage of the iris width and must stay between 16 and 46.
- The renderer applies these values as CSS variables so iris and pupil stay behind the mask and visually inside the eye opening.
- Smaller or more realistic masks should use the low end of the range. Tibetan Monk and Hacker intentionally use smaller iris sizes than the fantasy skins.

Current V1 count:

- 15 active skins
- 2 base eye PNGs per skin
- 1 mask PNG per skin
- 1 thumbnail PNG per skin
- 1 skin metadata JSON per skin

Validation:

```bash
npm run validate-assets
```

Runtime layers:

- Iris and pupil are not baked into the PNGs, so users can recolor them.
- Pupil and iris are separate layers, so the pupil can track the mouse farther than the iris.
- Eyelids are CSS layers, so blink and wink motion stays smooth instead of jumping between images.
- Personality idle poses are CSS-driven, so Calm, Dramatic, Goofy, Suspicious, Sleepy, Chaotic, Shy, Focused, and Mischievous read differently even before an action reaction fires.
- The panel mask sits above the eye layers, so the result reads as an embedded tab/window rather than a floating mask.

Imagegen or hand-authored replacements can swap any PNG as long as the same paths and transparent PNG format are kept.
