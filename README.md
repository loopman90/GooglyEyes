# Irisidian

Put living googly eyes in Obsidian.

Irisidian is a playful, fully local Obsidian Community Plugin that makes the interface look back. One or more pairs of eyes follow the mouse, optionally glance at the text cursor while typing, blink, idle, peek from edges, and react visually to UI events.

## What It Does

- Shows living eyes in Obsidian, with one or multiple eye pairs.
- Follows the mouse, the text cursor, Smart / Auto, or both.
- Reacts to local events such as typing, copy, cut, paste, delete, undo, redo, hover, tab switches, fast scrolling, and quick mouse movement.
- Supports personalities, reaction intensity, randomness, focus mode, peek mode, opacity, size, and z-index inside an embedded Obsidian tab.
- Lets users tune iris color, pupil color, eyelid color, eyelid shadow, glow, blink speed, emotion strength, and per-action reactions.
- Includes a Quick UI, ribbon entry, status bar access, commands, onboarding, settings preview, and an embedded Irisidian tab.

## Privacy

Irisidian is local-only.

- No account.
- No cloud backend.
- No runtime AI.
- No internet requirement.
- No note-text analysis.
- No clipboard content reading.
- Clipboard reactions only know that a `copy`, `cut`, or `paste` event happened.
- Settings are stored locally in Obsidian plugin data.

## Styles

The current test build exposes only completed skins in the UI.

Available now:

- Robot
- Cat
- Manga Female
- Dragon
- Tibetan Monk
- Alien
- Hacker
- Baby Yoda

Planned skins will be added one by one after their imagegen asset packs are complete. The backlog lives in `SKIN_BACKLOG.md` and is not exposed in the plugin UI.

Every active skin uses a layered renderer instead of full reaction PNGs. The PNGs are only the embedded tab mask, thumbnail, and clean left/right base eyes without iris, pupil, or lids. Iris color, pupil color, eyelid color, pupil tracking, eyelids, blinking, and reactions are drawn at runtime, which makes the eyes easier to tune and keeps future skins much lighter.

Mask rule: every `masks/tab-panel.png` must be a 1774x887 rectangular RGBA panel with opaque outer edges and transparency only for the two eye openings. The validator enforces this so skins stay embedded in the Obsidian tab instead of becoming floating cutouts.

## Personalities

Personality is separate from skin. It changes timing, blink frequency, smoothing, expressiveness, and chaos:

Calm, Curious, Dramatic, Goofy, Suspicious, Sleepy, Chaotic, Shy, Focused, and Mischievous.

## Quick UI

Open the Quick UI from:

- Command: `Open Quick UI`
- Default hotkey: `Mod+Shift+E`
- Ribbon eye icon
- Status bar item

Quick UI supports show/hide, switch personality, reaction pause, focus mode, randomize personality, Irisidian tab, and full settings.

## Irisidian Tab

The Irisidian tab embeds the eyes directly inside Obsidian instead of floating over the interface. Each active skin is scaled into a full tab panel overlay so it reads as part of the workspace. It lets you test Blink, Shock, Suspicious, Sleep, Copy, Cut, Paste, Delete, Undo, Dizzy, Idle, and Random reactions. It also has live controls for style, personality, size, and eye-pair count.

## Customization

Settings include visibility mode, follow target, sensitivity, smoothing, behavior presets, reactions, reaction intensity, randomness, emotion strength, blink speed, reaction hold, cooldowns, action mappings, personality tuning, skin thumbnails, iris color, pupil color, eyelid color, eyelid shadow color, iris glow, debug eye windows, peek mode, size, opacity, layering, animation smoothness, focus mode, DND mode, subtle mode, and privacy notes.

Actions can be tuned in a friendly mapping list:

- action name
- trigger type
- enabled / disabled
- selected reaction
- intensity
- cooldown

Fallback reactions are built in, so a missing or unknown reaction resolves to a close visual state.

## Install

For manual installation during development:

1. Copy this folder into `.obsidian/plugins/irisidian`.
2. Run `npm install`.
3. Run `npm run build`.
4. Enable the plugin in Obsidian settings.

## Build

```bash
npm install
npm run validate-assets
npm run build
```

Use `npm run dev` while developing.

## Limitations

- The current test build exposes only completed layered asset packs. More skins will appear one by one after their base eye and mask packs are complete.
- No community skin marketplace.
- No custom user asset imports.
- No achievements, dialogue system, social features, cloud sync, or online downloads.
- Sound effects are present as an off-by-default setting, but V1 focuses on visual feedback.

## Roadmap

- More polished hand-authored or imagegen base/mask packs.
- Per-eye-pair personality controls in the settings UI.
- More hover targets and custom action trigger integrations.
- Optional frame-based animation for skins that benefit from it.
- More embedded panel layouts for mobile and sidebar testing.
