# Changelog

## 1.0.13

- Rebuilt the Anonymous mask with clean, smooth eye cutouts and no fixed facial clutter around the openings.
- Rebuilt the Classic Googly mask with clean circular cutouts and retuned eye-window placement.
- Updated thumbnails and generated skin metadata for the corrected masks.

## 1.0.12

- Added C-4PO, Atlas, and Panda layered skins.
- Improved rectangular mask scaling, Quick UI anchoring, eyelid coverage, and retuned several existing mask eye windows.
- Rebuilt clean base-eye PNGs without fixed pupils, irises, lashes, or eyelids for active layered skins.
- Expanded the emotion engine with more distinct expressive, social, calm, focused, and ambient reactions.
- Sorted skin pickers alphabetically in settings, onboarding, and the Quick UI.

## 1.0.11

- Reduced remaining community review warnings around settings key typing, cross-window DOM checks, and UI helper usage.

## 1.0.10

- Replaced the starstruck `clip-path` effect with gradient-based CSS for better Obsidian review compatibility.

## 1.0.9

- Added Cowboy, Pumpkin Halloween, Goblin, and Troll layered skins.
- Added clean base-eye PNGs for the new skins without fixed iris, pupils, lashes, or eyelids.
- Tuned each new skin with unique default eye colors, eyelid colors, ambient reactions, and scalable eye windows.

## 1.0.8

- Reduced automated review warnings around DOM type checks, settings key typing, and UI callbacks.
- Switched HTMLElement checks to Obsidian's cross-window safe helper for popout compatibility.
- Kept release assets aligned with Obsidian's expected `main.js`, `manifest.json`, and `styles.css` package.

## 1.0.7

- Added SpaceHelmet, Classic Googly, Detective Noir, and One Eye layered skins.
- Added single-eye layout support so One Eye renders as one centered runtime eye.
- Added unique per-skin iris, pupil, eyelid, glow, and ambient reaction defaults for the new skins.
- Tuned new mask eye windows and generated clean base-eye PNGs without fixed iris, pupils, lashes, or eyelids.

## 1.0.6

- Removed the Mona Lisa skin from the active plugin and packaged assets.
- Added Cyberpunk Female and Wizard as completed layered skins.
- Rebuilt skin metadata from per-skin JSON via `generated-skins.ts`.
- Added Simple / Advanced settings mode and declarative settings definitions for Obsidian settings search.
- Improved the Quick UI with thumbnail skin switching, compact controls, and direct emotion previews.
- Cleaned base-eye transparency and retuned eye windows so active skins scale and center more reliably.
- Raised the minimum app version to 1.13.0 for the declarative settings API.

## 1.0.5

- Added stronger expressive reactions including Furious, Restless, In love, Dreamy, Drunk, Stoned, Spacing out, Crying, Laughing, Wink, Panic, and Starstruck.
- Added visual emotion accents such as tears, heart pupils, star pupils, jitter, wobble, and soft drifting eyes.
- Updated default ambient emotion pools so each skin shows more fitting random expressions.
- Added skin default eye colors and a setting to switch between per-skin defaults and custom global iris/pupil colors.
- Cleaned the generated README test path so local user folders are not exposed.
- Replaced a grid gap style that triggered an Obsidian CSS compatibility warning.

## 1.0.4

- Added the D20 RPG layered skin with a full rectangular tabletop mask and matte runtime-colored eyes.
- Added per-skin ambient emotion profiles so skins express more fitting random reactions.
- Shortened onboarding and opens the embedded tab after setup.
- Added a README privacy statement and release checklist.
- Added release checks and a GitHub artifact attestation workflow for future releases.

## 1.0.3

- Fixed layered eye placement so every active skin uses its own scalable eye windows inside the rectangular tab mask.
- Added validation rules for left and right eye windows to prevent future skin scaling mismatches.
- Added a fixed Quick UI button in the lower-left corner of the embedded tab.
- Updated settings headings and sliders to satisfy automated review guidance.

## 1.0.2

- Added configurable ambient emotions that occasionally show natural random expressions before returning to mouse tracking.
- Fixed the settings heading so automated review no longer flags the plugin name inside a settings heading.

## 1.0.1

- Added the Skeleton layered skin with a full rectangular skull mask and runtime-colored eyes.

## 1.0.0

- Initial V1 plugin scaffold.
- Added living eye renderer with mouse tracking, Smart / Auto text cursor tracking, idle behavior, reactions, focus mode, peek mode, floating drag, and reduced-motion support.
- Added completed layered skin definitions and validated transparent PNG asset packs.
- Added personalities, reaction intensity, randomness, cooldowns, action mapping, Quick UI, onboarding, ribbon/statusbar access, commands, and Playground view.
- Added local-only privacy documentation.
- Added generated README and test-install documentation.
