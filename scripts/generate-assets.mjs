import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const reactions = [
  "idle-neutral", "blink", "slow-blink", "sleepy", "look-left", "look-right", "look-up", "look-down",
  "wide-stare", "happy", "shocked", "suspicious", "angry", "sad", "confused", "dizzy", "cross-eyed",
  "eye-roll", "nervous", "typing", "cut", "copy", "paste", "delete", "undo", "redo", "idle-long",
  "wake", "hover-suspicious", "fast-movement", "peek", "sleepy-idle", "chaotic-stare", "dramatic-shock",
  "rapid-typing-focus", "drag-tracking"
];

const skins = [
  ["robot", [66, 217, 255], [238, 248, 255], [106, 118, 133], [255, 204, 51], "rect"],
  ["alien", [131, 255, 122], [217, 255, 225], [67, 86, 77], [183, 121, 255], "almond"],
  ["manga", [111, 183, 255], [255, 248, 251], [20, 20, 20], [255, 122, 168], "big"],
  ["manga-girl", [186, 132, 255], [255, 247, 255], [75, 51, 88], [255, 158, 207], "lashes"],
  ["one-eye", [242, 207, 74], [255, 245, 207], [80, 63, 27], [228, 92, 92], "one"],
  ["monster", [255, 107, 87], [255, 242, 222], [75, 39, 31], [121, 212, 76], "monster"],
  ["troll", [198, 227, 108], [249, 255, 216], [81, 97, 48], [214, 133, 76], "lumpy"],
  ["sexy-woman", [111, 92, 255], [255, 244, 248], [45, 35, 56], [242, 95, 160], "lashes"],
  ["sexy-man", [71, 168, 255], [248, 251, 255], [31, 44, 57], [104, 210, 164], "sharp"],
  ["non-binary", [242, 210, 75], [255, 249, 234], [83, 72, 102], [157, 124, 255], "balanced"],
  ["classic-googly", [17, 17, 17], [255, 255, 255], [36, 36, 36], [224, 224, 224], "round"],
  ["minimal", [76, 139, 245], [247, 247, 242], [48, 52, 59], [103, 216, 162], "minimal"],
  ["pixel", [62, 232, 129], [245, 255, 232], [32, 40, 32], [255, 79, 123], "pixel"],
  ["cartoon", [72, 168, 255], [255, 253, 245], [37, 37, 37], [255, 202, 58], "big"],
  ["cat-eyes", [165, 230, 90], [255, 248, 223], [41, 53, 31], [240, 180, 76], "cat"],
  ["spooky", [200, 156, 255], [246, 240, 255], [54, 40, 68], [103, 255, 218], "spooky"],
  ["cyberpunk", [0, 240, 255], [239, 252, 255], [41, 50, 74], [255, 43, 214], "rect"],
  ["retro-pc", [75, 221, 131], [236, 255, 232], [48, 67, 50], [242, 184, 75], "pixel"],
  ["space", [123, 167, 255], [244, 247, 255], [30, 40, 72], [255, 209, 102], "space"],
  ["fantasy", [215, 168, 73], [255, 244, 219], [90, 62, 34], [135, 201, 107], "sharp"]
];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(width, height, paint) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    let offset = 1;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = paint(x, y);
      row[offset++] = r;
      row[offset++] = g;
      row[offset++] = b;
      row[offset++] = a;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function mix(a, b, t) {
  return a.map((value, index) => Math.round(value + (b[index] - value) * t));
}

function insideEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function reactionState(reaction) {
  const state = { lid: 0, px: 0, py: 0, rx: 18, ry: 20, brow: 0, one: false };
  if (reaction.includes("blink")) state.lid = reaction === "slow-blink" ? 0.65 : 0.88;
  if (reaction.includes("sleepy")) state.lid = 0.52;
  if (reaction === "look-left") state.px = -9;
  if (reaction === "look-right") state.px = 9;
  if (reaction === "look-up") state.py = -7;
  if (reaction === "look-down" || reaction === "typing") state.py = 7;
  if (reaction.includes("shock") || reaction === "wide-stare" || reaction === "wake") { state.rx = 22; state.ry = 24; state.brow = -9; }
  if (reaction === "suspicious" || reaction === "hover-suspicious") { state.lid = 0.25; state.brow = 7; state.px = -5; }
  if (reaction === "angry" || reaction === "delete" || reaction === "cut") state.brow = 10;
  if (reaction === "sad") { state.brow = -5; state.py = 5; state.lid = 0.18; }
  if (reaction === "happy" || reaction === "paste" || reaction === "copy") { state.ry = 15; state.py = -2; }
  if (reaction === "confused" || reaction === "undo" || reaction === "redo") { state.px = -7; state.py = 4; }
  if (reaction === "dizzy" || reaction === "fast-movement") { state.px = 11; state.py = -6; state.brow = -8; }
  if (reaction === "cross-eyed") state.cross = true;
  if (reaction === "eye-roll") state.py = -11;
  if (reaction === "nervous" || reaction === "rapid-typing-focus") { state.rx = 16; state.ry = 18; state.px = 6; }
  if (reaction === "peek") state.lid = 0.38;
  if (reaction === "chaotic-stare") { state.rx = 23; state.ry = 20; state.px = -11; state.py = 8; }
  if (reaction === "drag-tracking") { state.px = 8; state.py = 5; }
  return state;
}

function drawSkin([id, iris, white, outline, accent, shape], reaction) {
  const width = 384;
  const height = 216;
  const state = reactionState(reaction);
  const centers = shape === "one" ? [[192, 108]] : [[126, 108], [258, 108]];
  const pixel = shape === "pixel";
  return png(width, height, (x, y) => {
    let color = [0, 0, 0, 0];
    for (let i = 0; i < centers.length; i++) {
      const [cx, cy] = centers[i];
      const rx = shape === "one" ? 72 : shape === "cat" ? 52 : shape === "minimal" ? 45 : 58;
      const ry = shape === "one" ? 70 : shape === "cat" ? 30 : shape === "sharp" ? 38 : 48;
      const edge = insideEllipse(x, y, cx, cy, rx + 5, ry + 5);
      const body = insideEllipse(x, y, cx, cy, rx, ry);
      if (edge) color = [...outline, 255];
      if (body) color = [...white, 255];
      if (body && shape === "rect" && (Math.abs(x - cx) > rx - 13 || Math.abs(y - cy) > ry - 12)) color = [...mix(white, iris, 0.16), 255];
      if (body && shape === "spooky" && Math.sin((x + y) / 14) > 0.88) color = [...mix(white, accent, 0.25), 230];
      if (body && shape === "monster" && Math.sin((x - cx) / 6) + Math.cos((y - cy) / 7) > 1.45) color = [...mix(white, accent, 0.28), 255];
      if (body && state.lid > 0) {
        const lidHeight = ry * state.lid;
        if (y < cy - ry + lidHeight || y > cy + ry - lidHeight * 0.45) color = [...mix(outline, accent, 0.25), 255];
      }
      const cross = state.cross ? (i === 0 ? 9 : -9) : 0;
      const px = cx + state.px + cross;
      const py = cy + state.py;
      const irisR = pixel ? 15 : shape === "cat" ? 15 : state.rx;
      const pupilR = shape === "cat" ? 5 : pixel ? 7 : 9;
      if (insideEllipse(x, y, px, py, irisR, state.ry)) color = [...iris, 255];
      if (shape === "cat") {
        if (Math.abs(x - px) < pupilR && Math.abs(y - py) < 23 && insideEllipse(x, y, px, py, 12, 25)) color = [8, 12, 10, 255];
      } else if (insideEllipse(x, y, px, py, pupilR, pupilR)) color = [10, 12, 16, 255];
      if (reaction === "dizzy" && insideEllipse(x, y, px + Math.sin(y / 4) * 8, py + Math.cos(x / 4) * 8, 4, 4)) color = [...accent, 255];
      if ((shape === "lashes" || shape === "manga-girl") && body && y < cy - ry + 6 && Math.abs(x - cx) > 36 && Math.abs(x - cx) < 70) color = [...outline, 255];
      if (state.brow !== 0 && Math.abs(y - (cy - ry - 12 - state.brow * 0.2)) < 3 && Math.abs(x - cx) < 42) color = [...outline, 255];
    }
    if ((shape === "space" || shape === "cyberpunk") && color[3] === 0 && (x + y) % 89 === 0) color = [...accent, 180];
    return color;
  });
}

for (const skin of skins) {
  const dir = join(root, "assets", "skins", skin[0]);
  mkdirSync(dir, { recursive: true });
  for (const reaction of reactions) writeFileSync(join(dir, `${reaction}.png`), drawSkin(skin, reaction));
  writeFileSync(join(dir, "thumbnail.png"), drawSkin(skin, "happy"));
}

writeFileSync(join(root, "assets", "skins.json"), JSON.stringify({
  generated: new Date().toISOString(),
  note: "Deterministic transparent PNG V1 starter assets. Replace individual files with imagegen-polished assets when desired.",
  skins: skins.map(([id]) => id),
  reactions
}, null, 2));

console.log(`Generated ${skins.length * (reactions.length + 1)} transparent PNG assets.`);
