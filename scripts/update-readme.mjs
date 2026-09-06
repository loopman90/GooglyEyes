import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function getActiveSkins() {
  const manifest = readJson(join(root, "assets", "skins.json"));
  return manifest.skins.map((id) => {
    const skinPath = join(root, "assets", "skins", id, "skin.json");
    const skin = existsSync(skinPath) ? readJson(skinPath) : { name: id };
    return { id, name: skin.name ?? id };
  });
}

export function activeSkinNamesText() {
  const names = getActiveSkins().map((skin) => skin.name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function generateReadme() {
  const pkg = readJson(join(root, "package.json"));
  const skins = getActiveSkins();
  const skinList = skins.map((skin) => `- ${skin.name}`).join("\n");
  const skinNames = activeSkinNamesText();

  return `# Eyessidian

Put living, reactive eyes inside Obsidian.

Eyessidian is a playful, fully local Obsidian Community Plugin. It opens an embedded Eyessidian tab where animated eyes look around, follow the mouse, blink, react to local UI events, and can be styled with different skins and personalities.

## What You Get

- Living eyes embedded inside an Obsidian tab.
- Mouse and text-cursor tracking.
- Smooth blinking and eyelids.
- Personalities such as Calm, Curious, Dramatic, Goofy, Suspicious, Sleepy, Chaotic, Shy, Focused, and Mischievous.
- Custom iris, pupil, eyelid, shadow, glow, size, opacity, focus mode, and reaction settings.
- A compact Quick UI behind a Show controls button.
- A full settings page for detailed behavior tuning.
- A copy-ready test build in \`release/eyessidian-test\`.

## Privacy

Eyessidian is local-only.

- No account.
- No cloud backend.
- No runtime AI.
- No internet requirement.
- No note-text analysis.
- No clipboard content reading.
- Clipboard reactions only know that a \`copy\`, \`cut\`, or \`paste\` event happened.
- Settings are stored locally in Obsidian plugin data.

## Active Skins

The current build exposes only completed skins in the UI:

${skinList}

Planned skins are added one by one after their imagegen asset packs are complete. Unfinished skins are not exposed in the plugin UI.

## Normal User Install

Use this once the plugin folder is ready or downloaded as a release.

1. Close Obsidian.
2. Open your Obsidian vault folder in Finder.
3. Open the hidden folder named \`.obsidian\`.
4. Open the folder named \`plugins\`.
5. Create a folder named \`eyessidian\` if it does not exist.
6. Put these files and folders inside \`.obsidian/plugins/eyessidian\`:
   - \`manifest.json\`
   - \`main.js\`
   - \`styles.css\`
   - \`assets\`
7. Open Obsidian.
8. Go to Settings.
9. Go to Community plugins.
10. Turn off Restricted mode if Obsidian asks for it.
11. Click Reload plugins if Eyessidian does not appear yet.
12. Enable Eyessidian.
13. Run the command \`Open Eyessidian Tab\`.

Correct final folder:

\`\`\`text
YourVault/.obsidian/plugins/eyessidian/manifest.json
YourVault/.obsidian/plugins/eyessidian/main.js
YourVault/.obsidian/plugins/eyessidian/styles.css
YourVault/.obsidian/plugins/eyessidian/assets/
\`\`\`

If the plugin does not appear in Obsidian, the folder is usually one level too deep. Make sure you do not have this:

\`\`\`text
YourVault/.obsidian/plugins/eyessidian/eyessidian/manifest.json
\`\`\`

## Test Build Install

For testing the current local build, use the ready-made folder:

\`\`\`text
${join(root, "release", "eyessidian-test")}
\`\`\`

1. Run \`npm run package-test\`.
2. Copy the whole \`release/eyessidian-test\` folder.
3. Paste it into your vault's \`.obsidian/plugins\` folder.
4. Rename the copied folder to \`eyessidian\`.
5. Open Obsidian.
6. Go to Settings > Community plugins.
7. Reload plugins if needed.
8. Enable Eyessidian.
9. Run \`Open Eyessidian Tab\`.

The test package includes ${skinNames}.

## Developer Setup

Use this when editing the plugin source code.

\`\`\`bash
npm install
npm run validate-assets
npm run build
npm run package-test
\`\`\`

Use \`npm run dev\` while developing.

## Quick UI

Open the Quick UI from:

- Command: \`Open Quick UI\`
- Default hotkey: \`Mod+Shift+E\`
- Ribbon eye icon
- Status bar item

The Quick UI starts compact behind a Show controls button. When expanded it supports show/hide, skin switching, personality switching, reaction pause, focus mode, blink preview, Eyessidian tab, and full settings.

## Eyessidian Tab

The Eyessidian tab embeds the eyes directly inside Obsidian instead of floating over the interface. Each active skin is scaled into a full tab panel overlay so it reads as part of the workspace.

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

\`\`\`text
assets/skins/<skin-id>/skin.json
assets/skins/<skin-id>/thumbnail.png
assets/skins/<skin-id>/eyes/left-base.png
assets/skins/<skin-id>/eyes/right-base.png
assets/skins/<skin-id>/masks/tab-panel.png
\`\`\`

Mask rule:

- \`masks/tab-panel.png\` must be a 1774x887 RGBA PNG.
- The outer edges must be opaque.
- Only the two eye openings should be transparent.
- The mask must fill the rectangular tab panel, so the skin feels embedded instead of floating.

Eye scale rule:

- Every layered skin defines \`defaults.irisSize\` and \`defaults.pupilSize\` in \`skin.json\`.
- \`irisSize\` must stay between 26 and 44 percent of the eye-window width.
- \`pupilSize\` must stay between 16 and 46 percent of the iris width.
- Runtime iris and pupil layers must stay visually behind the mask.

\`npm run validate-assets\` enforces these rules.

## README Updates

This README is generated from project files.

- \`npm run update-readme\` updates it directly.
- \`npm run build\` updates it automatically before building.
- \`npm run package-test\` updates it automatically before creating the test package.

When you add or remove a skin from \`assets/skins.json\`, the README skin list and install text update on the next build.

## Troubleshooting

Eyessidian does not show in Community plugins:

- Check that \`manifest.json\` is directly inside \`.obsidian/plugins/eyessidian\`.
- Reload plugins.
- Restart Obsidian.

The tab opens but looks wrong:

- Run \`npm run validate-assets\`.
- Run \`npm run build\`.
- Run \`npm run package-test\`.
- Replace the old vault plugin folder with the new \`release/eyessidian-test\` output.

The eyes look too large or too small:

- Adjust \`irisSize\`, \`pupilSize\`, or \`eyeWindows\` in that skin's \`skin.json\`.
- Run \`npm run validate-assets\` again.

## Version

Current package version: \`${pkg.version}\`.
`;
}

export function writeReadme() {
  writeFileSync(join(root, "README.md"), generateReadme());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeReadme();
  console.log("Updated README.md");
}
