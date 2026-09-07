import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const skinId = process.argv[2];
if (!skinId) throw new Error("Usage: node scripts/render-skin-check.mjs <skin-id>");

const outPath = `release/skin-audit/${skinId}-composite-check.png`;
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuffer.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return out;
}

function readPng(path) {
  const file = readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`${path} must be RGBA PNG`);
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }

  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const source = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const target = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? rgba[target + x - 4] : 0;
      const up = y > 0 ? rgba[target + x - stride] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[target + x - stride - 4] : 0;
      const value = source[x];
      if (filter === 0) rgba[target + x] = value;
      else if (filter === 1) rgba[target + x] = (value + left) & 255;
      else if (filter === 2) rgba[target + x] = (value + up) & 255;
      else if (filter === 3) rgba[target + x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        rgba[target + x] = (value + predictor) & 255;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }
  }
  return { width, height, rgba };
}

function writePng(path, image) {
  mkdirSync(dirname(path), { recursive: true });
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    image.rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

function parseHex(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function sample(image, u, v) {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(u * (image.width - 1))));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(v * (image.height - 1))));
  const i = (y * image.width + x) * 4;
  return [image.rgba[i], image.rgba[i + 1], image.rgba[i + 2], image.rgba[i + 3]];
}

function over(dst, index, src) {
  const a = src[3] / 255;
  const inv = 1 - a;
  dst[index] = Math.round(src[0] * a + dst[index] * inv);
  dst[index + 1] = Math.round(src[1] * a + dst[index + 1] * inv);
  dst[index + 2] = Math.round(src[2] * a + dst[index + 2] * inv);
  dst[index + 3] = 255;
}

function drawEye(canvas, skin, base, eyeWindow) {
  const iris = parseHex(skin.defaults.irisColor);
  const pupil = parseHex(skin.defaults.pupilColor);
  const x0 = Math.round(eyeWindow.x * canvas.width);
  const y0 = Math.round(eyeWindow.y * canvas.height);
  const w = Math.round(eyeWindow.w * canvas.width);
  const h = Math.round(eyeWindow.h * canvas.height);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cx = x0 + x;
      const cy = y0 + y;
      if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
      over(canvas.rgba, (cy * canvas.width + cx) * 4, sample(base, x / Math.max(1, w - 1), y / Math.max(1, h - 1)));
    }
  }

  const centerX = x0 + w * 0.5;
  const centerY = y0 + h * 0.5;
  const irisRadius = Math.min(w, h) * skin.defaults.irisSize / 200;
  const pupilRadius = Math.min(w, h) * skin.defaults.pupilSize / 200;
  for (let y = Math.floor(centerY - irisRadius * 1.25); y <= Math.ceil(centerY + irisRadius * 1.25); y += 1) {
    for (let x = Math.floor(centerX - irisRadius * 1.25); x <= Math.ceil(centerX + irisRadius * 1.25); x += 1) {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
      const d = Math.hypot(x - centerX, y - centerY);
      const i = (y * canvas.width + x) * 4;
      if (d <= irisRadius) {
        const shade = 1 - d / irisRadius * 0.28;
        over(canvas.rgba, i, [iris[0] * shade, iris[1] * shade, iris[2] * shade, 255]);
      }
      if (d <= pupilRadius) over(canvas.rgba, i, [pupil[0], pupil[1], pupil[2], 255]);
      if (Math.hypot(x - (centerX - irisRadius * 0.34), y - (centerY - irisRadius * 0.34)) <= Math.max(4, pupilRadius * 0.22)) {
        over(canvas.rgba, i, [255, 255, 255, 215]);
      }
    }
  }
}

const skin = JSON.parse(readFileSync(`assets/skins/${skinId}/skin.json`, "utf8"));
const mask = readPng(`assets/skins/${skinId}/${skin.mask}`);
const canvas = { width: mask.width, height: mask.height, rgba: Buffer.alloc(mask.width * mask.height * 4, 255) };
drawEye(canvas, skin, readPng(`assets/skins/${skinId}/${skin.assets.leftBase}`), skin.eyeWindows[0]);
if (skin.eyeLayout !== "single") drawEye(canvas, skin, readPng(`assets/skins/${skinId}/${skin.assets.rightBase}`), skin.eyeWindows[1]);
for (let i = 0; i < mask.rgba.length; i += 4) over(canvas.rgba, i, [mask.rgba[i], mask.rgba[i + 1], mask.rgba[i + 2], mask.rgba[i + 3]]);
writePng(outPath, canvas);
console.log(outPath);
