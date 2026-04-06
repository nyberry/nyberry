import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const WIDTH = 640;
const HEIGHT = 480;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "assets", "images", "shapes-tool.png");

function crcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let c = index;

    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }

    table[index] = c >>> 0;
  }

  return table;
}

const CRC_TABLE = crcTable();

function crc32(buffer) {
  let crc = 0xFFFFFFFF;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function setPixel(buffer, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
    return;
  }

  const index = ((y * WIDTH) + x) * 4;
  buffer[index] = r;
  buffer[index + 1] = g;
  buffer[index + 2] = b;
  buffer[index + 3] = a;
}

function fillRect(buffer, x, y, width, height, color) {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(WIDTH, Math.ceil(x + width));
  const endY = Math.min(HEIGHT, Math.ceil(y + height));

  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      setPixel(buffer, px, py, color[0], color[1], color[2], color[3] ?? 255);
    }
  }
}

function blendPixel(buffer, x, y, color, alpha = 1) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
    return;
  }

  const index = ((y * WIDTH) + x) * 4;
  const existingAlpha = buffer[index + 3] / 255;
  const sourceAlpha = alpha * ((color[3] ?? 255) / 255);
  const outAlpha = sourceAlpha + (existingAlpha * (1 - sourceAlpha));

  if (outAlpha === 0) {
    return;
  }

  buffer[index] = Math.round(((color[0] * sourceAlpha) + (buffer[index] * existingAlpha * (1 - sourceAlpha))) / outAlpha);
  buffer[index + 1] = Math.round(((color[1] * sourceAlpha) + (buffer[index + 1] * existingAlpha * (1 - sourceAlpha))) / outAlpha);
  buffer[index + 2] = Math.round(((color[2] * sourceAlpha) + (buffer[index + 2] * existingAlpha * (1 - sourceAlpha))) / outAlpha);
  buffer[index + 3] = Math.round(outAlpha * 255);
}

function fillRoundedRect(buffer, x, y, width, height, radius, color) {
  const left = x;
  const top = y;
  const right = x + width;
  const bottom = y + height;

  for (let py = Math.floor(top); py < Math.ceil(bottom); py += 1) {
    for (let px = Math.floor(left); px < Math.ceil(right); px += 1) {
      let inside = true;

      if (px < left + radius && py < top + radius) {
        const dx = px - (left + radius);
        const dy = py - (top + radius);
        inside = (dx * dx) + (dy * dy) <= radius * radius;
      } else if (px > right - radius && py < top + radius) {
        const dx = px - (right - radius);
        const dy = py - (top + radius);
        inside = (dx * dx) + (dy * dy) <= radius * radius;
      } else if (px < left + radius && py > bottom - radius) {
        const dx = px - (left + radius);
        const dy = py - (bottom - radius);
        inside = (dx * dx) + (dy * dy) <= radius * radius;
      } else if (px > right - radius && py > bottom - radius) {
        const dx = px - (right - radius);
        const dy = py - (bottom - radius);
        inside = (dx * dx) + (dy * dy) <= radius * radius;
      }

      if (inside) {
        setPixel(buffer, px, py, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

function drawGrid(buffer, x, y, width, height, step, color) {
  for (let gx = x + step; gx < x + width; gx += step) {
    fillRect(buffer, gx, y, 2, height, color);
  }

  for (let gy = y + step; gy < y + height; gy += step) {
    fillRect(buffer, x, gy, width, 2, color);
  }
}

function drawStrokeCircle(buffer, cx, cy, radius, thickness, color) {
  const minX = Math.floor(cx - radius - thickness - 1);
  const maxX = Math.ceil(cx + radius + thickness + 1);
  const minY = Math.floor(cy - radius - thickness - 1);
  const maxY = Math.ceil(cy + radius + thickness + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt((dx * dx) + (dy * dy));
      const edge = Math.abs(distance - radius);

      if (edge <= thickness / 2) {
        blendPixel(buffer, x, y, color, 1 - (edge / (thickness / 2 + 0.001)) * 0.15);
      }
    }
  }
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = (abx * abx) + (aby * aby);
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, ((apx * abx) + (apy * aby)) / denom));
  const cx = ax + (abx * t);
  const cy = ay + (aby * t);
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function drawStrokeSegment(buffer, ax, ay, bx, by, thickness, color) {
  const minX = Math.floor(Math.min(ax, bx) - thickness - 1);
  const maxX = Math.ceil(Math.max(ax, bx) + thickness + 1);
  const minY = Math.floor(Math.min(ay, by) - thickness - 1);
  const maxY = Math.ceil(Math.max(ay, by) + thickness + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = pointSegmentDistance(x, y, ax, ay, bx, by);

      if (distance <= thickness / 2) {
        blendPixel(buffer, x, y, color, 1 - (distance / (thickness / 2 + 0.001)) * 0.12);
      }
    }
  }
}

function drawTextBlock(buffer, x, y, lines, color) {
  const glyphs = {
    " ": ["000", "000", "000", "000", "000"],
    ".": ["000", "000", "000", "000", "010"],
    ":": ["000", "010", "000", "010", "000"],
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "9": ["111", "101", "111", "001", "111"],
    "a": ["000", "110", "001", "111", "111"],
    "c": ["000", "111", "100", "100", "111"],
    "e": ["000", "111", "110", "100", "111"],
    "g": ["000", "111", "101", "111", "001"],
    "i": ["010", "000", "110", "010", "111"],
    "l": ["100", "100", "100", "100", "111"],
    "n": ["000", "110", "101", "101", "101"],
    "q": ["000", "111", "101", "111", "001"],
    "r": ["000", "101", "110", "100", "100"],
    "s": ["011", "100", "010", "001", "110"],
    "t": ["010", "111", "010", "010", "011"],
    "u": ["000", "101", "101", "101", "111"]
  };

  const pixel = 4;
  const letterGap = 3;
  const lineGap = 10;

  lines.forEach((line, lineIndex) => {
    let cursorX = x;
    const cursorY = y + lineIndex * ((5 * pixel) + lineGap);

    for (const character of line) {
      const glyph = glyphs[character] ?? glyphs[" "];

      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyph[row].length; col += 1) {
          if (glyph[row][col] === "1") {
            fillRect(buffer, cursorX + (col * pixel), cursorY + (row * pixel), pixel, pixel, color);
          }
        }
      }

      cursorX += (3 * pixel) + letterGap;
    }
  });
}

async function main() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const r = Math.round((247 * (1 - t)) + (220 * t));
    const g = Math.round((241 * (1 - t)) + (233 * t));
    const b = Math.round((223 * (1 - t)) + (226 * t));

    for (let x = 0; x < WIDTH; x += 1) {
      setPixel(pixels, x, y, r, g, b, 255);
    }
  }

  fillRoundedRect(pixels, 56, 64, 248, 248, 18, [255, 253, 248, 255]);
  fillRoundedRect(pixels, 340, 254, 232, 100, 18, [255, 253, 248, 255]);
  fillRect(pixels, 56, 64, 248, 6, [200, 192, 179, 255]);
  fillRect(pixels, 56, 306, 248, 6, [200, 192, 179, 255]);
  fillRect(pixels, 56, 64, 6, 248, [200, 192, 179, 255]);
  fillRect(pixels, 298, 64, 6, 248, [200, 192, 179, 255]);
  fillRect(pixels, 340, 254, 232, 6, [200, 192, 179, 255]);
  fillRect(pixels, 340, 348, 232, 6, [200, 192, 179, 255]);
  fillRect(pixels, 340, 254, 6, 100, [200, 192, 179, 255]);
  fillRect(pixels, 566, 254, 6, 100, [200, 192, 179, 255]);

  drawGrid(pixels, 56, 64, 248, 248, 28, [232, 225, 213, 255]);

  drawStrokeCircle(pixels, 180, 188, 58, 18, [31, 95, 70, 255]);
  fillRoundedRect(pixels, 368, 104, 100, 100, 14, [255, 253, 248, 255]);
  drawStrokeSegment(pixels, 368, 104, 468, 104, 18, [157, 78, 28, 255]);
  drawStrokeSegment(pixels, 468, 104, 468, 204, 18, [157, 78, 28, 255]);
  drawStrokeSegment(pixels, 468, 204, 368, 204, 18, [157, 78, 28, 255]);
  drawStrokeSegment(pixels, 368, 204, 368, 104, 18, [157, 78, 28, 255]);

  drawStrokeSegment(pixels, 512, 228, 456, 340, 18, [41, 74, 122, 255]);
  drawStrokeSegment(pixels, 456, 340, 568, 340, 18, [41, 74, 122, 255]);
  drawStrokeSegment(pixels, 568, 340, 512, 228, 18, [41, 74, 122, 255]);

  drawTextBlock(pixels, 364, 284, ["triangle: 0.93", "circle: 0.04", "square: 0.03"], [58, 55, 47, 255]);

  const rawRows = [];

  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * WIDTH * 4;
    const end = start + WIDTH * 4;
    rawRows.push(Buffer.from([0]));
    rawRows.push(pixels.subarray(start, end));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rawRows))),
    pngChunk("IEND", Buffer.alloc(0))
  ]);

  await fs.writeFile(outputPath, png);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
