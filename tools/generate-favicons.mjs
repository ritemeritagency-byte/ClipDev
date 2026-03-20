import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const outDir = process.cwd();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(size, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = getPixel(x, y, size);
      const offset = row + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function signedDistanceToRoundedRect(x, y, cx, cy, hw, hh, radius) {
  const dx = Math.abs(x - cx) - hw + radius;
  const dy = Math.abs(y - cy) - hh + radius;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function drawClipDevsPixel(px, py, size) {
  const x = px + 0.5;
  const y = py + 0.5;
  const scale = size / 96;
  const cx = size / 2;
  const cy = size / 2;
  const rectDistance = signedDistanceToRoundedRect(
    x,
    y,
    cx,
    cy,
    40 * scale,
    40 * scale,
    24 * scale,
  );

  let alpha = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  if (rectDistance <= 1.25) {
    const cover = 1 - smoothstep(-1.25, 1.25, rectDistance);
    const nx = px / Math.max(size - 1, 1);
    const ny = py / Math.max(size - 1, 1);
    const gradient = clamp(0.58 * nx + 0.42 * ny, 0, 1);
    r = Math.round(47 + (31 - 47) * gradient);
    g = Math.round(128 + (95 - 128) * gradient);
    b = Math.round(237 + (170 - 237) * gradient);
    alpha = cover;

    const borderDistance = Math.abs(rectDistance);
    const borderStrength = 0.22 * (1 - smoothstep(0.2, 1.6, borderDistance));
    if (borderStrength > 0) {
      r = Math.round(r * (1 - borderStrength) + 255 * borderStrength);
      g = Math.round(g * (1 - borderStrength) + 255 * borderStrength);
      b = Math.round(b * (1 - borderStrength) + 255 * borderStrength);
    }

    const shine = clamp(1 - ((x - 20 * scale) * 0.9 + (y - 18 * scale)) / (56 * scale), 0, 1);
    const shineStrength = 0.18 * shine * shine;
    r = Math.round(r * (1 - shineStrength) + 255 * shineStrength);
    g = Math.round(g * (1 - shineStrength) + 255 * shineStrength);
    b = Math.round(b * (1 - shineStrength) + 255 * shineStrength);
  }

  const cCenterX = 65 * scale;
  const cCenterY = 48 * scale;
  const cOuter = 30 * scale;
  const cInner = 18.7 * scale;
  const cDist = Math.hypot(x - cCenterX, y - cCenterY);
  const cAngle = Math.atan2(y - cCenterY, x - cCenterX);
  const cGap = Math.abs(cAngle) < 0.5;
  const inC = cDist <= cOuter && cDist >= cInner && !cGap;

  const dOuter = [
    [26, 24],
    [44.6, 24],
    [58.5, 24],
    [68, 33.4],
    [68, 48],
    [68, 62.6],
    [58.5, 72],
    [44.6, 72],
    [26, 72],
  ].map(([vx, vy]) => [vx * scale, vy * scale]);
  const dInner = [
    [39.1, 36],
    [43.3, 36],
    [54.7, 36],
    [54.7, 60],
    [43.3, 60],
    [39.1, 60],
  ].map(([vx, vy]) => [vx * scale, vy * scale]);
  const inD = pointInPolygon(x, y, dOuter) && !pointInPolygon(x, y, dInner);

  const fgCover = inC || inD ? 1 : 0;
  if (fgCover > 0) {
    const fgR = 223;
    const fgG = 240;
    const fgB = 255;
    const composite = fgCover + alpha * (1 - fgCover);
    if (composite > 0) {
      r = Math.round((fgR * fgCover + r * alpha * (1 - fgCover)) / composite);
      g = Math.round((fgG * fgCover + g * alpha * (1 - fgCover)) / composite);
      b = Math.round((fgB * fgCover + b * alpha * (1 - fgCover)) / composite);
      alpha = composite;
    }
  }

  return [r, g, b, Math.round(alpha * 255)];
}

function writeFile(fileName, contents) {
  fs.writeFileSync(path.join(outDir, fileName), contents);
}

function writeIco(fileName, pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 48;
  entry[1] = 48;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  writeFile(fileName, Buffer.concat([header, entry, pngBuffer]));
}

const png48 = encodePng(48, drawClipDevsPixel);
const png180 = encodePng(180, drawClipDevsPixel);

writeFile('favicon-48.png', png48);
writeFile('apple-touch-icon.png', png180);
writeIco('favicon.ico', png48);
