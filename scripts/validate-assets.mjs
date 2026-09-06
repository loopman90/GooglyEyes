import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "assets", "skins.json"), "utf8"));
const missing = [];
const invalid = [];
const invalidJson = [];
const layeredSkins = new Set(manifest.layeredSkins ?? []);
const maskSkins = new Set(manifest.maskSkins ?? []);

function isPng(path) {
  if (!existsSync(path)) return false;
  const header = readFileSync(path, { start: 0, end: 7 });
  return header.length >= 8
    && header[0] === 137
    && header[1] === 80
    && header[2] === 78
    && header[3] === 71
    && header[4] === 13
    && header[5] === 10
    && header[6] === 26
    && header[7] === 10;
}

for (const skin of manifest.skins) {
  const skinDir = join(root, "assets", "skins", skin);
  const requiredPng = ["thumbnail.png"];
  const requiredJson = ["skin.json"];
  if (layeredSkins.has(skin)) {
    requiredPng.push("eyes/left-base.png", "eyes/right-base.png");
  }
  if (maskSkins.has(skin)) requiredPng.push("masks/tab-panel.png");
  for (const filename of requiredPng) {
    const path = join(skinDir, filename);
    if (!existsSync(path)) missing.push(path);
    else if (!isPng(path)) invalid.push(path);
  }
  for (const filename of requiredJson) {
    const path = join(skinDir, filename);
    if (!existsSync(path)) missing.push(path);
    else {
      try {
        JSON.parse(readFileSync(path, "utf8"));
      } catch {
        invalidJson.push(path);
      }
    }
  }
}

if (missing.length || invalid.length || invalidJson.length) {
  if (missing.length) console.error(`Missing required files:\n${missing.join("\n")}`);
  if (invalid.length) console.error(`Invalid PNG assets:\n${invalid.join("\n")}`);
  if (invalidJson.length) console.error(`Invalid JSON files:\n${invalidJson.join("\n")}`);
  process.exit(1);
}

const eyeAssets = layeredSkins.size * 2;
const maskAssets = maskSkins.size;
console.log(`Validated ${eyeAssets + maskAssets + manifest.skins.length} layered assets (${eyeAssets} base eye PNGs, ${maskAssets} mask PNGs, ${manifest.skins.length} thumbnails).`);
