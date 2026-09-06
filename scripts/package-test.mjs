import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "release", "eyesidian-test");
const skin = "robot";

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets", "skins"), { recursive: true });

for (const file of ["manifest.json", "main.js", "styles.css", "README.md", "CHANGELOG.md", "LICENSE"]) {
  copyFileSync(join(root, file), join(out, file));
}

execFileSync("rsync", ["-a", join(root, "assets", "skins", skin), join(out, "assets", "skins")]);
const oldMask = join(out, "assets", "skins", skin, "masks", "peek-face.png");
if (existsSync(oldMask)) unlinkSync(oldMask);

const manifest = JSON.parse(readFileSync(join(root, "assets", "skins.json"), "utf8"));
writeFileSync(join(out, "assets", "skins.json"), JSON.stringify({
  ...manifest,
  note: "Robot-only Eyesidian test package. Other skins are intentionally omitted until their imagegen asset packs are complete.",
  individualEyeSkins: ["robot"],
  maskSkins: ["robot"],
  skins: ["robot"]
}, null, 2));

writeFileSync(join(out, "INSTALL-TEST.md"), `# Eyesidian Robot Test Install

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

This package is intentionally Robot-only, with split left/right eye assets and a full embedded tab-panel mask.
`);

console.log(`Packaged Robot-only test plugin at ${out}`);
