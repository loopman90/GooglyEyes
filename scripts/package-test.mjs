import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { activeSkinNamesText, getActiveSkins, writeReadme } from "./update-readme.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "release", "googly-eyes-test");
writeReadme();
const activeSkins = getActiveSkins();
const skins = activeSkins.map((skin) => skin.id);
const skinNames = activeSkinNamesText();

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of ["manifest.json", "main.js", "styles.css", "README.md", "CHANGELOG.md", "LICENSE"]) {
  copyFileSync(join(root, file), join(out, file));
}

for (const skin of skins) {
  mkdirSync(join(out, "assets", "skins", skin, "eyes"), { recursive: true });
  mkdirSync(join(out, "assets", "skins", skin, "masks"), { recursive: true });
  copyFileSync(join(root, "assets", "skins", skin, "thumbnail.png"), join(out, "assets", "skins", skin, "thumbnail.png"));
  copyFileSync(join(root, "assets", "skins", skin, "skin.json"), join(out, "assets", "skins", skin, "skin.json"));
  copyFileSync(join(root, "assets", "skins", skin, "eyes", "left-base.png"), join(out, "assets", "skins", skin, "eyes", "left-base.png"));
  copyFileSync(join(root, "assets", "skins", skin, "eyes", "right-base.png"), join(out, "assets", "skins", skin, "eyes", "right-base.png"));
  copyFileSync(join(root, "assets", "skins", skin, "masks", "tab-panel.png"), join(out, "assets", "skins", skin, "masks", "tab-panel.png"));
}

const manifest = JSON.parse(readFileSync(join(root, "assets", "skins.json"), "utf8"));
writeFileSync(join(out, "assets", "skins.json"), JSON.stringify({
  ...manifest,
  note: `GooglyEyes layered test package. Includes completed ${skinNames} skins.`,
  layeredSkins: skins,
  maskSkins: skins,
  skins
}, null, 2));

writeFileSync(join(out, "INSTALL-TEST.md"), `# GooglyEyes Test Install

This is the simplest way to test GooglyEyes.

Copy this entire folder to:

\`\`\`text
<your-vault>/.obsidian/plugins/googly-eyes
\`\`\`

The final folder must look like this:

\`\`\`text
<your-vault>/.obsidian/plugins/googly-eyes/manifest.json
<your-vault>/.obsidian/plugins/googly-eyes/main.js
<your-vault>/.obsidian/plugins/googly-eyes/styles.css
<your-vault>/.obsidian/plugins/googly-eyes/assets/
\`\`\`

Then open Obsidian:

1. Go to Settings.
2. Open Community plugins.
3. Reload plugins if needed.
4. Enable GooglyEyes.
5. Use the command "Open tab" to open the embedded tab.

This package includes the completed ${skinNames} layered skins, with runtime iris/pupil tracking, smooth CSS lids, customizable colors, and full embedded tab-panel masks.
`);

console.log(`Packaged GooglyEyes layered test plugin at ${out}`);
