# Eyesidian

Put living googly eyes in Obsidian.

Eyesidian is a playful, fully local Obsidian Community Plugin that makes the interface look back. One or more pairs of eyes follow the mouse, optionally glance at the text cursor while typing, blink, idle, peek from edges, and react visually to UI events.

## What It Does

- Shows living eyes in Obsidian, with one or multiple eye pairs.
- Follows the mouse, the text cursor, Smart / Auto, or both.
- Reacts to local events such as typing, copy, cut, paste, delete, undo, redo, hover, tab switches, fast scrolling, and quick mouse movement.
- Supports personalities, reaction intensity, randomness, focus mode, peek mode, opacity, size, and z-index inside an embedded Obsidian tab.
- Includes a Quick UI, ribbon entry, status bar access, commands, onboarding, settings preview, and an embedded Eyesidian tab.

## Privacy

Eyesidian is local-only.

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

Planned skins will be added one by one after their imagegen asset packs are complete. The backlog lives in `SKIN_BACKLOG.md` and is not exposed in the plugin UI.

Each completed skin has PNG files for every supported reaction, plus a thumbnail. Skins can also provide true per-eye assets in `left/` and `right/`; the Robot skin is the first completed split skin with 72 individual eye PNGs. Mask-capable skins can add `masks/tab-panel.png`, a full-stage overlay that makes the eyes look embedded inside an Obsidian tab.

## Personalities

Personality is separate from skin. It changes timing, blink frequency, smoothing, expressiveness, and chaos:

Calm, Curious, Dramatic, Goofy, Suspicious, Sleepy, Chaotic, Shy, Focused, and Mischievous.

## Quick UI

Open the Quick UI from:

- Command: `Open Quick UI`
- Default hotkey: `Mod+Shift+E`
- Ribbon eye icon
- Status bar item

Quick UI supports show/hide, switch personality, reaction pause, focus mode, randomize personality, Eyesidian tab, and full settings.

## Eyesidian Tab

The Eyesidian tab embeds the eyes directly inside Obsidian instead of floating over the interface. The Robot skin is scaled into a full tab panel overlay so it reads as part of the workspace. It lets you test Blink, Shock, Suspicious, Sleep, Copy, Cut, Paste, Delete, Undo, Dizzy, Idle, and Random reactions. It also has live controls for style, personality, size, and eye-pair count.

## Customization

Settings include visibility mode, follow target, sensitivity, smoothing, reactions, reaction intensity, randomness, cooldowns, action mappings, personality tuning, skin thumbnails, peek mode, size, opacity, layering, animation smoothness, focus mode, DND mode, subtle mode, and privacy notes.

Actions use:

- action name
- trigger type
- enabled / disabled
- assigned reaction pool
- intensity
- cooldown

Fallback reactions are built in, so a missing or unknown reaction resolves to a close visual state.

## Install

For manual installation during development:

1. Copy this folder into `.obsidian/plugins/eyesidian`.
2. Run `npm install`.
3. Run `npm run generate-assets`.
4. Run `npm run build`.
5. Enable the plugin in Obsidian settings.

## Build

```bash
npm install
npm run generate-assets
npm run build
```

Use `npm run dev` while developing.

## Limitations

- The current test build exposes only the completed Robot PNG asset pack. More skins will appear after their imagegen packs are complete.
- No community skin marketplace.
- No custom user asset imports.
- No achievements, dialogue system, social features, cloud sync, or online downloads.
- Sound effects are present as an off-by-default setting, but V1 focuses on visual feedback.

## Roadmap

- More polished hand-authored or generated asset packs.
- Per-eye-pair personality controls in the settings UI.
- More hover targets and custom action trigger integrations.
- Optional frame-based animation for skins that benefit from it.
- More embedded panel layouts for mobile and sidebar testing.
