# Eyesidian Asset Pack

Eyesidian exposes only completed skins in the UI. The current active skin is Robot.

Robot uses the layered renderer. That means PNGs provide only the fixed art that should not move: a tab-panel mask, a thumbnail, and clean left/right base eyes. Iris, pupil, glow, eyelids, blinking, mouse tracking, and reaction poses are drawn at runtime with DOM/CSS.

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
```

Every active skin folder contains `thumbnail.png` and `skin.json`. Skins listed in `layeredSkins` contain `eyes/left-base.png` and `eyes/right-base.png`. Skins listed in `maskSkins` contain `masks/tab-panel.png`, a full-stage overlay that makes the eyes look embedded inside an Obsidian tab.

Current V1 count:

- 1 active skin
- 2 base eye PNGs for Robot
- 1 mask PNG for Robot
- 1 thumbnail PNG for Robot
- 1 skin metadata JSON for Robot

Validation:

```bash
npm run validate-assets
```

Runtime layers:

- Iris and pupil are not baked into the PNGs, so users can recolor them.
- Pupil and iris are separate layers, so the pupil can track the mouse farther than the iris.
- Eyelids are CSS layers, so blink and wink motion stays smooth instead of jumping between images.
- The panel mask sits above the eye layers, so the result reads as an embedded tab/window rather than a floating mask.

Imagegen or hand-authored replacements can swap any PNG as long as the same paths and transparent PNG format are kept.
