import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const WIDTH = 640;
const HEIGHT = 480;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "assets", "images", "pets-tool.png");

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

function fillCircle(buffer, cx, cy, radius, color) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) + (dy * dy) <= radius * radius) {
        setPixel(buffer, x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
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

function drawLine(buffer, ax, ay, bx, by, thickness, color) {
  const minX = Math.floor(Math.min(ax, bx) - thickness - 1);
  const maxX = Math.ceil(Math.max(ax, bx) + thickness + 1);
  const minY = Math.floor(Math.min(ay, by) - thickness - 1);
  const maxY = Math.ceil(Math.max(ay, by) + thickness + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointSegmentDistance(x + 0.5, y + 0.5, ax, ay, bx, by) <= thickness / 2) {
        setPixel(buffer, x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

function drawTextBlock(buffer, x, y, lines, color) {
  const glyphs = {
    " ": ["0000", "0000", "0000", "0000", "0000", "0000", "0000"],
    "?": ["1110", "0001", "0010", "0100", "0100", "0000", "0100"],
    "C": ["0111", "1000", "1000", "1000", "1000", "1000", "0111"],
    "a": ["0000", "0110", "0001", "0111", "1001", "1001", "0111"],
    "c": ["0000", "0111", "1000", "1000", "1000", "1000", "0111"],
    "d": ["0001", "0001", "0111", "1001", "1001", "1001", "0111"],
    "e": ["0000", "0110", "1001", "1111", "1000", "1000", "0111"],
    "g": ["0000", "0111", "1001", "1001", "0111", "0001", "0110"],
    "o": ["0000", "0110", "1001", "1001", "1001", "1001", "0110"],
    "r": ["0000", "1011", "1100", "1000", "1000", "1000", "1000"],
    "t": ["0100", "1110", "0100", "0100", "0100", "0101", "0010"],
    "u": ["0000", "1001", "1001", "1001", "1001", "1001", "0111"]
  };

  const pixel = 8;
  const letterGap = 4;
  const lineGap = 14;

  lines.forEach((line, lineIndex) => {
    let cursorX = x;
    const cursorY = y + lineIndex * ((7 * pixel) + lineGap);

    for (const character of line) {
      const glyph = glyphs[character] ?? glyphs[" "];

      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyph[row].length; col += 1) {
          if (glyph[row][col] === "1") {
            fillRect(buffer, cursorX + (col * pixel), cursorY + (row * pixel), pixel, pixel, color);
          }
        }
      }

      cursorX += (4 * pixel) + letterGap;
    }
  });
}

function drawCat(buffer) {
  fillCircle(buffer, 188, 276, 86, [242, 159, 84, 255]);
  fillCircle(buffer, 188, 276, 76, [249, 194, 120, 255]);
  fillCircle(buffer, 127, 176, 34, [242, 159, 84, 255]);
  fillCircle(buffer, 249, 176, 34, [242, 159, 84, 255]);
  drawLine(buffer, 110, 194, 122, 126, 20, [242, 159, 84, 255]);
  drawLine(buffer, 122, 126, 164, 171, 20, [242, 159, 84, 255]);
  drawLine(buffer, 266, 194, 254, 126, 20, [242, 159, 84, 255]);
  drawLine(buffer, 254, 126, 212, 171, 20, [242, 159, 84, 255]);
  fillCircle(buffer, 162, 266, 11, [46, 56, 64, 255]);
  fillCircle(buffer, 214, 266, 11, [46, 56, 64, 255]);
  fillCircle(buffer, 188, 296, 10, [227, 122, 141, 255]);
  drawLine(buffer, 174, 311, 188, 299, 8, [120, 90, 76, 255]);
  drawLine(buffer, 202, 311, 188, 299, 8, [120, 90, 76, 255]);
  drawLine(buffer, 160, 304, 96, 287, 6, [120, 90, 76, 255]);
  drawLine(buffer, 160, 318, 100, 336, 6, [120, 90, 76, 255]);
  drawLine(buffer, 216, 304, 280, 287, 6, [120, 90, 76, 255]);
  drawLine(buffer, 216, 318, 276, 336, 6, [120, 90, 76, 255]);
}

function drawDegu(buffer) {
  fillCircle(buffer, 462, 290, 74, [152, 115, 81, 255]);
  fillCircle(buffer, 462, 290, 64, [197, 160, 118, 255]);
  fillCircle(buffer, 405, 204, 38, [182, 146, 106, 255]);
  fillCircle(buffer, 519, 204, 38, [182, 146, 106, 255]);
  fillCircle(buffer, 442, 280, 10, [46, 56, 64, 255]);
  fillCircle(buffer, 486, 280, 10, [46, 56, 64, 255]);
  fillCircle(buffer, 462, 306, 12, [238, 169, 156, 255]);
  drawLine(buffer, 450, 314, 404, 300, 6, [120, 90, 76, 255]);
  drawLine(buffer, 450, 326, 404, 346, 6, [120, 90, 76, 255]);
  drawLine(buffer, 474, 314, 520, 300, 6, [120, 90, 76, 255]);
  drawLine(buffer, 474, 326, 520, 346, 6, [120, 90, 76, 255]);
  drawLine(buffer, 462, 350, 554, 402, 10, [205, 162, 122, 255]);
}

async function main() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const r = Math.round((111 * (1 - t)) + (255 * t));
    const g = Math.round((198 * (1 - t)) + (236 * t));
    const b = Math.round((233 * (1 - t)) + (187 * t));

    for (let x = 0; x < WIDTH; x += 1) {
      setPixel(pixels, x, y, r, g, b, 255);
    }
  }

  fillCircle(pixels, 120, 92, 84, [255, 230, 153, 120]);
  fillCircle(pixels, 566, 86, 70, [255, 255, 255, 110]);
  fillCircle(pixels, 544, 380, 110, [255, 208, 191, 110]);
  fillRoundedRect(pixels, 34, 34, 572, 412, 28, [255, 252, 246, 215]);
  fillRoundedRect(pixels, 78, 64, 484, 88, 24, [255, 243, 232, 255]);

  drawTextBlock(pixels, 114, 84, ["Cat or degu?"], [62, 70, 79, 255]);

  drawCat(pixels);
  drawDegu(pixels);

  const rawRows = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * WIDTH * 4;
    rawRows.push(Buffer.from([0]));
    rawRows.push(pixels.subarray(start, start + WIDTH * 4));
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
