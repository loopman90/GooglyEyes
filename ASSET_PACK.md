# Eyesidian Asset Pack

Eyesidian exposes only completed skins in the UI. The current active skin is Robot.

Eyesidian supports individual transparent PNGs per eye. Pair-level PNGs can remain as an internal fallback for a completed skin, but unfinished skins should not be listed in the active manifest or UI.

Asset layout:

```text
assets/
  skins/
    robot/
      idle-neutral.png        # pair fallback
      blink.png               # pair fallback
      left/
        idle-neutral.png
        blink.png
      right/
        idle-neutral.png
        blink.png
      masks/
        tab-panel.png
      ...
      drag-tracking.png
      thumbnail.png
```

Every active skin folder contains all reactions listed in `assets/skins.json`, plus `thumbnail.png`. Skins listed in `individualEyeSkins` also contain `left/` and `right/` reaction PNGs. Skins listed in `maskSkins` contain `masks/tab-panel.png`, a full-stage overlay that makes the eyes look embedded inside an Obsidian tab. There is no required sprite sheet.

Current V1 count:

- 1 active skin
- 36 reaction PNGs per skin
- 1 thumbnail PNG per skin
- 37 pair fallback/thumbnail PNG files for Robot
- 72 individual eye PNG files for each completed split skin
- 1 mask PNG for Robot

Validation:

```bash
npm run validate-assets
```

Regeneration:

```bash
npm run generate-assets
```

The generated V1 PNGs are deterministic, local, transparent-background starter assets. A future art pass can replace any single PNG without changing the plugin architecture, as long as the same path and transparent PNG format are kept.
