import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "release", "eyesidian-test");
const skins = ["robot", "cat"];

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
  note: "Eyesidian layered test package. Includes completed Robot and Cat skins.",
  layeredSkins: skins,
  maskSkins: skins,
  skins
}, null, 2));

writeFileSync(join(out, "INSTALL-TEST.md"), `# Eyesidian Test Install

Copy this entire folder to:

\`\`\`text
<your-vault>/.obsidian/plugins/eyesidian
\`\`\`

Then open Obsidian:

1. Go to Settings.
2. Open Community plugins.
3. Reload plugins if needed.
4. Enable Eyesidian.
5. Use the command "Open Eyesidian Tab" to open the embedded tab.

This package includes the completed Robot and Cat layered skins, with runtime iris/pupil tracking, smooth CSS lids, customizable colors, and full embedded tab-panel masks.
`);

console.log(`Packaged Eyesidian layered test plugin at ${out}`);
