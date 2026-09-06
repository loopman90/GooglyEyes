import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "release", "irisidian-test");
const skins = ["robot", "cat", "manga-female", "dragon", "tibetan-monk", "alien", "hacker", "baby-yoda"];

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
  note: "Irisidian layered test package. Includes completed Robot, Cat, Manga Female, Dragon, Tibetan Monk, Alien, Hacker, and Baby Yoda skins.",
  layeredSkins: skins,
  maskSkins: skins,
  skins
}, null, 2));

writeFileSync(join(out, "INSTALL-TEST.md"), `# Irisidian Test Install

Copy this entire folder to:

\`\`\`text
<your-vault>/.obsidian/plugins/irisidian
\`\`\`

Then open Obsidian:

1. Go to Settings.
2. Open Community plugins.
3. Reload plugins if needed.
4. Enable Irisidian.
5. Use the command "Open Irisidian Tab" to open the embedded tab.

This package includes the completed Robot, Cat, Manga Female, Dragon, Tibetan Monk, Alien, Hacker, and Baby Yoda layered skins, with runtime iris/pupil tracking, smooth CSS lids, customizable colors, and full embedded tab-panel masks.
`);

console.log(`Packaged Irisidian layered test plugin at ${out}`);
