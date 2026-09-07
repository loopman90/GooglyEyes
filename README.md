# GooglyEyes

Put living, reactive eyes inside Obsidian.

GooglyEyes is a playful, fully local Obsidian Community Plugin. It opens an embedded GooglyEyes tab where animated eyes look around, follow the mouse, blink, react to local UI events, and can be styled with different skins and personalities.

## What You Get

- Living eyes embedded inside an Obsidian tab.
- Mouse and text-cursor tracking.
- Smooth blinking and eyelids.
- Simple settings for everyday use, with Advanced controls for deeper tuning.
- Personalities such as Calm, Curious, Dramatic, Goofy, Suspicious, Sleepy, Chaotic, Shy, Focused, and Mischievous.
- Custom iris, pupil, eyelid, shadow, glow, size, opacity, focus mode, and reaction settings.
- A compact Quick UI behind a Show controls button.
- A full settings page for detailed behavior tuning.
- A copy-ready test build in `release/googly-eyes-test`.

## Privacy Statement

GooglyEyes is designed to be local-only and privacy-friendly. The plugin provides visual reactions inside your workspace; it is not built to collect, transmit, sell, or analyze your personal data.

- No account.
- No cloud backend.
- No runtime AI.
- No internet requirement.
- No analytics or telemetry.
- No third-party tracking.
- No note-text analysis.
- No clipboard content reading.
- Clipboard reactions only know that a `copy`, `cut`, or `paste` event happened.
- Mouse and keyboard reactions use local UI events only.
- Settings are stored locally in Obsidian plugin data.
- Skin images are loaded from the installed plugin folder.
- The plugin does not send vault names, file names, file contents, settings, cursor movement, or usage behavior to any external service.

## Active Skins

The current build exposes only completed skins in the UI:

- Robot
- Cat
- Manga Female
- Dragon
- Cyberpunk Female
- D20 RPG
- SpaceHelmet
- Classic Googly
- Detective Noir
- One Eye
- Tibetan Monk
- Alien
- Hacker
- Anonymous
- Jason
- Clown
- Spy
- Skeleton
- Wizard

Planned skins are added one by one after their imagegen asset packs are complete. Unfinished skins are not exposed in the plugin UI.

## Normal User Install

Use this once the plugin folder is ready or downloaded as a release.

1. Close Obsidian.
2. Open your Obsidian vault folder in Finder.
3. Open the hidden folder named `.obsidian`.
4. Open the folder named `plugins`.
5. Create a folder named `googly-eyes` if it does not exist.
6. Put these files and folders inside `.obsidian/plugins/googly-eyes`:
   - `manifest.json`
   - `main.js`
   - `styles.css`
   - `assets`
7. Open Obsidian.
8. Go to Settings.
9. Go to Community plugins.
10. Turn off Restricted mode if Obsidian asks for it.
11. Click Reload plugins if GooglyEyes does not appear yet.
12. Enable GooglyEyes.
13. Run the command `Open tab`.

Correct final folder:

```text
YourVault/.obsidian/plugins/googly-eyes/manifest.json
YourVault/.obsidian/plugins/googly-eyes/main.js
YourVault/.obsidian/plugins/googly-eyes/styles.css
YourVault/.obsidian/plugins/googly-eyes/assets/
```

If the plugin does not appear in Obsidian, the folder is usually one level too deep. Make sure you do not have this:

```text
YourVault/.obsidian/plugins/googly-eyes/googly-eyes/manifest.json
```

## Test Build Install

For testing the current local build, use the ready-made folder:

```text
release/googly-eyes-test
```

1. Run `npm run package-test`.
2. Copy the whole `release/googly-eyes-test` folder.
3. Paste it into your vault's `.obsidian/plugins` folder.
4. Rename the copied folder to `googly-eyes`.
5. Open Obsidian.
6. Go to Settings > Community plugins.
7. Reload plugins if needed.
8. Enable GooglyEyes.
9. Run `Open tab`.

The test package includes Robot, Cat, Manga Female, Dragon, Cyberpunk Female, D20 RPG, SpaceHelmet, Classic Googly, Detective Noir, One Eye, Tibetan Monk, Alien, Hacker, Anonymous, Jason, Clown, Spy, Skeleton, and Wizard.

## Developer Setup

Use this when editing the plugin source code.

```bash
npm install
npm run generate-skin-data
npm run validate-assets
npm run build
npm run package-test
npm run release:check
```

Use `npm run dev` while developing.

## Release Checklist

Use this before publishing a GitHub release:

1. Update `manifest.json`, `package.json`, `versions.json`, and `CHANGELOG.md`.
2. Run `npm run release:check`.
3. Commit the exact source and generated `main.js`.
4. Tag the commit with the plain version number, for example `1.0.3`, without a `v` prefix.
5. Create the GitHub release with only `main.js`, `manifest.json`, and `styles.css`.
6. Let the artifact attestation workflow run for the release assets.

The repository includes a GitHub Actions workflow that can attest `main.js`, `manifest.json`, and `styles.css` for future releases.

## Quick UI

Open the Quick UI from:

- Command: `Open Quick UI`
- Ribbon eye icon
- Status bar item

The Quick UI starts compact behind a Show controls button. When expanded it supports thumbnail skin switching, personality switching, reaction pause, reset, fullscreen, GooglyEyes tab, full settings, and direct emotion previews.

## GooglyEyes Tab

The GooglyEyes tab embeds the eyes directly inside Obsidian instead of floating over the interface. Each active skin is scaled into a full tab panel overlay so it reads as part of the workspace.

The tab includes live controls for:

- Skin
- Personality
- Size
- Eye pairs
- Iris color
- Eyelid color
- Emotion strength
- Visual reaction previews

## Skin Asset Rules

Every active skin uses the layered renderer. A complete active skin needs:

```text
assets/skins/<skin-id>/skin.json
assets/skins/<skin-id>/thumbnail.png
assets/skins/<skin-id>/eyes/left-base.png
assets/skins/<skin-id>/eyes/right-base.png
assets/skins/<skin-id>/masks/tab-panel.png
```

Mask rule:

- `masks/tab-panel.png` must be a 1774x887 RGBA PNG.
- The outer edges must be opaque.
- Only the two eye openings should be transparent.
- The mask must fill the rectangular tab panel, so the skin feels embedded instead of floating.

Eye scale rule:

- Every layered skin defines `defaults.irisSize` and `defaults.pupilSize` in `skin.json`.
- `irisSize` must stay between 26 and 44 percent of the eye-window width.
- `pupilSize` must stay between 16 and 46 percent of the iris width.
- Runtime iris and pupil layers must stay visually behind the mask.

`npm run validate-assets` enforces these rules.

## README Updates

This README is generated from project files.

- `npm run generate-skin-data` rebuilds `generated-skins.ts` from `assets/skins.json` and `assets/skins/*/skin.json`.
- `npm run update-readme` updates it directly.
- `npm run build` updates it automatically before building.
- `npm run package-test` updates it automatically before creating the test package.

When you add or remove a skin from `assets/skins.json`, the README skin list and install text update on the next build.

## Troubleshooting

GooglyEyes does not show in Community plugins:

- Check that `manifest.json` is directly inside `.obsidian/plugins/googly-eyes`.
- Reload plugins.
- Restart Obsidian.

The tab opens but looks wrong:

- Run `npm run validate-assets`.
- Run `npm run build`.
- Run `npm run package-test`.
- Replace the old vault plugin folder with the new `release/googly-eyes-test` output.

The eyes look too large or too small:

- Adjust `irisSize`, `pupilSize`, or `eyeWindows` in that skin's `skin.json`.
- Run `npm run validate-assets` again.

## Version

Current package version: `1.0.8`.
