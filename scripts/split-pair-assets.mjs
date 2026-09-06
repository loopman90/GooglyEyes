import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skin = process.argv[2];

if (!skin) {
  console.error("Usage: node scripts/split-pair-assets.mjs <skin-id>");
  process.exit(1);
}

const reactions = [
  "idle-neutral", "blink", "slow-blink", "sleepy", "look-left", "look-right", "look-up", "look-down",
  "wide-stare", "happy", "shocked", "suspicious", "angry", "sad", "confused", "dizzy", "cross-eyed",
  "eye-roll", "nervous", "typing", "cut", "copy", "paste", "delete", "undo", "redo", "idle-long",
  "wake", "hover-suspicious", "fast-movement", "peek", "sleepy-idle", "chaotic-stare", "dramatic-shock",
  "rapid-typing-focus", "drag-tracking"
];

function dimensions(path) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], { encoding: "utf8" });
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) throw new Error(`Could not read dimensions for ${path}`);
  return { width, height };
}

function crop(source, out, side) {
  const { width, height } = dimensions(source);
  const cropWidth = Math.floor(width / 2);
  const offset = Math.floor(width / 4);
  const horizontalOffset = side === "left" ? -offset : offset;
  execFileSync("sips", [
    "-c", String(height), String(cropWidth),
    "--cropOffset", "0", String(horizontalOffset),
    source,
    "--out", out
  ], { stdio: "ignore" });
}

const skinDir = join(root, "assets", "skins", skin);
const leftDir = join(skinDir, "left");
const rightDir = join(skinDir, "right");
mkdirSync(leftDir, { recursive: true });
mkdirSync(rightDir, { recursive: true });

let count = 0;
for (const reaction of reactions) {
  const source = join(skinDir, `${reaction}.png`);
  if (!existsSync(source)) {
    console.warn(`Skipping missing pair asset: ${source}`);
    continue;
  }
  crop(source, join(leftDir, `${reaction}.png`), "left");
  crop(source, join(rightDir, `${reaction}.png`), "right");
  count += 2;
}

console.log(`Split ${count} individual eye PNG assets for ${skin}.`);
