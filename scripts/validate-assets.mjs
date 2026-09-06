import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "assets", "skins.json"), "utf8"));
const missing = [];
const invalid = [];
const invalidJson = [];
const layeredSkins = new Set(manifest.layeredSkins ?? []);
const maskSkins = new Set(manifest.maskSkins ?? []);
const MASK_WIDTH = 1774;
const MASK_HEIGHT = 887;
const MIN_MASK_HOLE_TRANSPARENCY = 0.08;
const MAX_MASK_HOLE_TRANSPARENCY = 0.3;
const MIN_IRIS_SIZE = 26;
const MAX_IRIS_SIZE = 44;
const MIN_PUPIL_SIZE = 16;
const MAX_PUPIL_SIZE = 46;

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

function readPngRgba(path) {
  const file = readFileSync(path);
  if (!isPng(path)) throw new Error("Invalid PNG header");

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
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Expected 8-bit RGBA PNG, got bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * bytesPerPixel);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const source = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const targetStart = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? rgba[targetStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? rgba[targetStart + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? rgba[targetStart + x - stride - bytesPerPixel] : 0;
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
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }
  }

  return { width, height, rgba };
}

function validateRectangularMask(path) {
  const { width, height, rgba } = readPngRgba(path);
  const problems = [];

  if (width !== MASK_WIDTH || height !== MASK_HEIGHT) {
    problems.push(`expected ${MASK_WIDTH}x${MASK_HEIGHT}, got ${width}x${height}`);
  }

  const edgeAlpha = [];
  for (let x = 0; x < width; x += 1) {
    edgeAlpha.push(rgba[(x * 4) + 3]);
    edgeAlpha.push(rgba[((height - 1) * width + x) * 4 + 3]);
  }
  for (let y = 0; y < height; y += 1) {
    edgeAlpha.push(rgba[(y * width) * 4 + 3]);
    edgeAlpha.push(rgba[(y * width + width - 1) * 4 + 3]);
  }

  const transparentEdges = edgeAlpha.filter((alpha) => alpha < 240).length;
  if (transparentEdges > 0) {
    problems.push(`${transparentEdges} outer edge pixels are transparent; masks must fill the rectangular tab panel`);
  }

  let transparentPixels = 0;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] < 8) transparentPixels += 1;
  }
  const transparentRatio = transparentPixels / (width * height);
  if (transparentRatio < MIN_MASK_HOLE_TRANSPARENCY || transparentRatio > MAX_MASK_HOLE_TRANSPARENCY) {
    problems.push(`transparent area must be mostly eye holes (${MIN_MASK_HOLE_TRANSPARENCY * 100}-${MAX_MASK_HOLE_TRANSPARENCY * 100}%), got ${(transparentRatio * 100).toFixed(2)}%`);
  }

  return problems;
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
  if (maskSkins.has(skin)) {
    const path = join(skinDir, "masks/tab-panel.png");
    if (existsSync(path) && isPng(path)) {
      try {
        const problems = validateRectangularMask(path);
        if (problems.length) invalid.push(`${path}\n  - ${problems.join("\n  - ")}`);
      } catch (error) {
        invalid.push(`${path}\n  - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  for (const filename of requiredJson) {
    const path = join(skinDir, filename);
    if (!existsSync(path)) missing.push(path);
    else {
      try {
        const skinMeta = JSON.parse(readFileSync(path, "utf8"));
        const defaults = skinMeta.defaults ?? {};
        if (layeredSkins.has(skin)) {
          if (typeof defaults.irisSize !== "number" || defaults.irisSize < MIN_IRIS_SIZE || defaults.irisSize > MAX_IRIS_SIZE) {
            invalidJson.push(`${path}\n  - defaults.irisSize must be ${MIN_IRIS_SIZE}-${MAX_IRIS_SIZE}% of the eye window width`);
          }
          if (typeof defaults.pupilSize !== "number" || defaults.pupilSize < MIN_PUPIL_SIZE || defaults.pupilSize > MAX_PUPIL_SIZE) {
            invalidJson.push(`${path}\n  - defaults.pupilSize must be ${MIN_PUPIL_SIZE}-${MAX_PUPIL_SIZE}% of the iris width`);
          }
        }
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
