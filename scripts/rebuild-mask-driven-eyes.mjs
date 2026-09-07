import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const MASK_WIDTH = 1774;
const MASK_HEIGHT = 887;
const SKIN_TUNING = {
  alien: { irisSize: 40, pupilSize: 18, minDistance: 0.32 },
  anonymous: { irisSize: 34, pupilSize: 16, minDistance: 0.23 },
  cat: { irisSize: 44, pupilSize: 16, minDistance: 0.32 },
  cowboy: { irisSize: 42, pupilSize: 17, minDistance: 0.2 },
  "cyberpunk-female": { irisSize: 42, pupilSize: 16, minDistance: 0.24 },
  "detective-noir": { irisSize: 40, pupilSize: 17, minDistance: 0.2 },
  dragon: { irisSize: 38, pupilSize: 16, minDistance: 0.32 },
  goblin: { irisSize: 42, pupilSize: 16, minDistance: 0.23 },
  hacker: { irisSize: 42, pupilSize: 16, minDistance: 0.26 },
  "manga-female": { irisSize: 43, pupilSize: 16, minDistance: 0.2 },
  "one-eye": { irisSize: 44, pupilSize: 16, minDistance: 0 },
  panda: { irisSize: 42, pupilSize: 16, minDistance: 0.34 },
  "pumpkin-halloween": { irisSize: 42, pupilSize: 16, minDistance: 0.28 },
  "tibetan-monk": { irisSize: 38, pupilSize: 16, minDistance: 0.18 },
  troll: { irisSize: 40, pupilSize: 16, minDistance: 0.24 },
  wizard: { irisSize: 42, pupilSize: 16, minDistance: 0.18 }
};

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
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

function writePngRgba(path, width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

function readPngRgba(path) {
  const file = readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = file.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset = dataEnd + 4;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`${path} must be an 8-bit RGBA PNG`);
  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const source = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const targetStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? rgba[targetStart + x - 4] : 0;
      const up = y > 0 ? rgba[targetStart + x - stride] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[targetStart + x - stride - 4] : 0;
      const value = source[x];
      if (filter === 0) rgba[targetStart + x] = value;
      else if (filter === 1) rgba[targetStart + x] = (value + left) & 255;
      else if (filter === 2) rgba[targetStart + x] = (value + up) & 255;
      else if (filter === 3) rgba[targetStart + x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        rgba[targetStart + x] = (value + predictor) & 255;
      } else throw new Error(`Unsupported PNG filter ${filter}`);
    }
  }
  return { width, height, rgba };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function alphaAt(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 255;
  return image.rgba[(y * image.width + x) * 4 + 3];
}

function transparentComponents(image) {
  const total = image.width * image.height;
  const seen = new Uint8Array(total);
  const components = [];
  const queue = new Int32Array(total);
  for (let start = 0; start < total; start += 1) {
    if (seen[start] || image.rgba[start * 4 + 3] >= 24) continue;
    let head = 0;
    let tail = 0;
    let minX = image.width;
    let minY = image.height;
    let maxX = 0;
    let maxY = 0;
    seen[start] = 1;
    queue[tail] = start;
    tail += 1;
    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % image.width;
      const y = Math.floor(index / image.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const neighbors = [index - 1, index + 1, index - image.width, index + image.width];
      for (const next of neighbors) {
        if (next < 0 || next >= total || seen[next]) continue;
        const nx = next % image.width;
        if ((next === index - 1 && nx !== x - 1) || (next === index + 1 && nx !== x + 1)) continue;
        if (image.rgba[next * 4 + 3] >= 24) continue;
        seen[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (tail > 1400 && w > 24 && h > 18) {
      components.push({
        x: minX,
        y: minY,
        w,
        h,
        area: tail,
        cx: (minX + maxX + 1) / 2 / image.width,
        cy: (minY + maxY + 1) / 2 / image.height
      });
    }
  }
  return components;
}

function pickEyeComponents(components, eyeLayout, tuning) {
  const candidates = components
    .filter((component) => component.cy > 0.12 && component.cy < 0.72)
    .filter((component) => component.w / MASK_WIDTH < 0.62 && component.h / MASK_HEIGHT < 0.62)
    .sort((a, b) => b.area - a.area)
    .slice(0, 10);

  if (eyeLayout === "single") {
    const single = candidates.sort((a, b) => b.area - a.area)[0];
    if (!single) throw new Error("No transparent eye component found");
    return [single, single];
  }

  let best = null;
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      const left = a.cx < b.cx ? a : b;
      const right = a.cx < b.cx ? b : a;
      const distance = right.cx - left.cx;
      if (distance < tuning.minDistance || distance > 0.75) continue;
      const yDelta = Math.abs(left.cy - right.cy);
      const areaBalance = Math.min(left.area, right.area) / Math.max(left.area, right.area);
      const score = (left.area + right.area) * areaBalance - yDelta * 600000 - Math.abs(distance - 0.38) * 120000;
      if (!best || score > best.score) best = { left, right, score };
    }
  }
  if (!best) {
    const sorted = candidates.sort((a, b) => a.cx - b.cx);
    if (sorted.length < 2) throw new Error("No pair of transparent eye components found");
    return [sorted[0], sorted[sorted.length - 1]];
  }
  return [best.left, best.right];
}

function paddedWindow(component, image, eyeLayout) {
  const padX = Math.max(12, Math.round(component.w * (eyeLayout === "single" ? 0.08 : 0.06)));
  const padY = Math.max(10, Math.round(component.h * 0.12));
  const x = clamp(component.x - padX, 0, image.width - 1);
  const y = clamp(component.y - padY, 0, image.height - 1);
  const maxX = clamp(component.x + component.w + padX, 1, image.width);
  const maxY = clamp(component.y + component.h + padY, 1, image.height);
  return capWindow({
    x: x / image.width,
    y: y / image.height,
    w: (maxX - x) / image.width,
    h: (maxY - y) / image.height
  }, eyeLayout);
}

function capWindow(window, eyeLayout) {
  const maxSize = eyeLayout === "single" ? 0.75 : 0.5;
  let { x, y, w, h } = window;
  if (w > maxSize) {
    const cx = x + w / 2;
    w = maxSize;
    x = clamp(cx - w / 2, 0, 1 - w);
  }
  if (h > maxSize) {
    const cy = y + h / 2;
    h = maxSize;
    y = clamp(cy - h / 2, 0, 1 - h);
  }
  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
    w: Number(w.toFixed(4)),
    h: Number(h.toFixed(4))
  };
}

function parseHex(hex) {
  const clean = hex.replace("#", "").trim();
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a, b, amount) {
  return Math.round(a + (b - a) * amount);
}

function renderEyeBase(mask, window, colorHex, outPath) {
  const color = parseHex(colorHex);
  const aspect = window.h / window.w;
  const width = 640;
  const height = clamp(Math.round(width * aspect), 260, 760);
  const rgba = Buffer.alloc(width * height * 4);
  let visiblePixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const v = height === 1 ? 0 : y / (height - 1);
      const mx = Math.round((window.x + window.w * u) * (mask.width - 1));
      const my = Math.round((window.y + window.h * v) * (mask.height - 1));
      const oval = ((u - 0.5) / 0.49) ** 2 + ((v - 0.5) / 0.46) ** 2 <= 1;
      const transparent = alphaAt(mask, mx, my) < 42;
      const index = (y * width + x) * 4;
      if (!transparent && !oval) continue;
      if (transparent) visiblePixels += 1;
      const dx = (u - 0.5) / 0.5;
      const dy = (v - 0.48) / 0.52;
      const radial = clamp(Math.hypot(dx, dy), 0, 1);
      const shade = 1 - radial * 0.26 - Math.max(0, v - 0.52) * 0.14;
      const highlight = Math.exp(-((u - 0.36) ** 2 + (v - 0.28) ** 2) / 0.018) * 0.18;
      rgba[index] = clamp(mix(color[0], 255, highlight) * shade, 0, 255);
      rgba[index + 1] = clamp(mix(color[1], 255, highlight) * shade, 0, 255);
      rgba[index + 2] = clamp(mix(color[2], 255, highlight) * shade, 0, 255);
      rgba[index + 3] = 255;
    }
  }
  if (visiblePixels < width * height * 0.04) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const u = width === 1 ? 0 : x / (width - 1);
        const v = height === 1 ? 0 : y / (height - 1);
        const oval = ((u - 0.5) / 0.49) ** 2 + ((v - 0.5) / 0.46) ** 2 <= 1;
        const index = (y * width + x) * 4;
        if (!oval) {
          rgba[index + 3] = 0;
          continue;
        }
        const dx = (u - 0.5) / 0.5;
        const dy = (v - 0.48) / 0.52;
        const radial = clamp(Math.hypot(dx, dy), 0, 1);
        const shade = 1 - radial * 0.26 - Math.max(0, v - 0.52) * 0.14;
        const highlight = Math.exp(-((u - 0.36) ** 2 + (v - 0.28) ** 2) / 0.018) * 0.18;
        rgba[index] = clamp(mix(color[0], 255, highlight) * shade, 0, 255);
        rgba[index + 1] = clamp(mix(color[1], 255, highlight) * shade, 0, 255);
        rgba[index + 2] = clamp(mix(color[2], 255, highlight) * shade, 0, 255);
        rgba[index + 3] = 255;
      }
    }
  }
  writePngRgba(outPath, width, height, rgba);
}

function existingWindow(skin, side) {
  const window = (skin.eyeWindows ?? []).find((item) => item.side === side) ?? (skin.eyeWindows ?? [])[0];
  if (!window) throw new Error(`${skin.id} has no existing eye window fallback`);
  return {
    x: Number(window.x),
    y: Number(window.y),
    w: Number(window.w),
    h: Number(window.h)
  };
}

const manifest = readJson(join(root, "assets", "skins.json"));
let rebuilt = 0;

for (const skinId of manifest.skins) {
  const skinDir = join(root, "assets", "skins", skinId);
  const skinPath = join(skinDir, "skin.json");
  const skin = readJson(skinPath);
  const maskPath = join(skinDir, skin.mask ?? "masks/tab-panel.png");
  if (!existsSync(maskPath)) throw new Error(`Missing mask: ${maskPath}`);
  const mask = readPngRgba(maskPath);
  const tuning = SKIN_TUNING[skinId] ?? { irisSize: 38, pupilSize: 18, minDistance: 0.2 };
  const components = transparentComponents(mask);
  let leftWindow;
  let rightWindow;
  try {
    const [leftComponent, rightComponent] = pickEyeComponents(components, skin.eyeLayout, tuning);
    leftWindow = paddedWindow(leftComponent, mask, skin.eyeLayout);
    rightWindow = skin.eyeLayout === "single" ? leftWindow : paddedWindow(rightComponent, mask, skin.eyeLayout);
  } catch {
    leftWindow = capWindow(existingWindow(skin, "left"), skin.eyeLayout);
    rightWindow = skin.eyeLayout === "single" ? leftWindow : capWindow(existingWindow(skin, "right"), skin.eyeLayout);
  }
  skin.eyeWindows = [
    { side: "left", ...leftWindow },
    { side: "right", ...rightWindow }
  ];
  skin.eyeStyle = {
    slotRadius: "0px",
    lidLeft: "-34%",
    lidWidth: "168%",
    lidHeight: "122%",
    lidUpperRadius: "0 0 46% 46%",
    lidLowerRadius: "46% 46% 0 0"
  };
  skin.defaults = {
    ...skin.defaults,
    irisSize: tuning.irisSize,
    pupilSize: tuning.pupilSize
  };
  renderEyeBase(mask, leftWindow, skin.defaults.eyeWhiteColor ?? "#f4eadc", join(skinDir, skin.assets?.leftBase ?? "eyes/left-base.png"));
  renderEyeBase(mask, rightWindow, skin.defaults.eyeWhiteColor ?? "#f4eadc", join(skinDir, skin.assets?.rightBase ?? "eyes/right-base.png"));
  writeFileSync(skinPath, `${JSON.stringify(skin, null, 2)}\n`);
  rebuilt += 1;
  console.log(`Rebuilt ${skinId}: left ${leftWindow.x},${leftWindow.y},${leftWindow.w},${leftWindow.h}; right ${rightWindow.x},${rightWindow.y},${rightWindow.w},${rightWindow.h}`);
}

console.log(`Mask-driven eye rebuild complete for ${rebuilt} skins.`);
