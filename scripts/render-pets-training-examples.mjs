import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const GRID_SIZE = 40;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const SCALE = GRID_SIZE / 26;
const TILE_SIZE = 110;
const COLUMNS = 5;
const ROWS = 4;
const WIDTH = COLUMNS * TILE_SIZE;
const HEIGHT = ROWS * TILE_SIZE;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "assets", "images", "pets-training-examples.png");

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

function createRng(seed) {
  let value = seed >>> 0;

  return function next() {
    value += 0x6D2B79F5;
    let state = value;
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20260406);

function randomBetween(min, max) {
  return min + ((max - min) * rng());
}

function scaled(value) {
  return value * SCALE;
}

function imageIndex(x, y) {
  return (y * GRID_SIZE) + x;
}

function createBlankImage() {
  return new Float32Array(CELL_COUNT);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = (abx * abx) + (aby * aby);
  const t = lengthSquared === 0 ? 0 : clamp(((apx * abx) + (apy * aby)) / lengthSquared, 0, 1);
  const closestX = ax + (t * abx);
  const closestY = ay + (t * aby);
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function activateBrush(image, x, y, radius) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if ((dx * dx) + (dy * dy) > (radius + 0.45) * (radius + 0.45)) {
        continue;
      }

      const px = clamp(x + dx, 0, GRID_SIZE - 1);
      const py = clamp(y + dy, 0, GRID_SIZE - 1);
      image[imageIndex(px, py)] = 1;
    }
  }
}

function drawCircleOutline(image, cx, cy, radius, strokeWidth) {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;
      const distance = Math.sqrt((dx * dx) + (dy * dy));

      if (Math.abs(distance - radius) <= strokeWidth) {
        image[imageIndex(x, y)] = 1;
      }
    }
  }
}

function drawEllipseOutline(image, cx, cy, radiusX, radiusY, strokeWidth) {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const dx = ((x + 0.5) - cx) / radiusX;
      const dy = ((y + 0.5) - cy) / radiusY;
      const distance = Math.sqrt((dx * dx) + (dy * dy));

      if (Math.abs(distance - 1) <= (strokeWidth / Math.max(radiusX, radiusY))) {
        image[imageIndex(x, y)] = 1;
      }
    }
  }
}

function drawLine(image, ax, ay, bx, by, strokeWidth) {
  const minX = Math.floor(Math.min(ax, bx) - strokeWidth - 1);
  const maxX = Math.ceil(Math.max(ax, bx) + strokeWidth + 1);
  const minY = Math.floor(Math.min(ay, by) - strokeWidth - 1);
  const maxY = Math.ceil(Math.max(ay, by) + strokeWidth + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointToSegmentDistance(x + 0.5, y + 0.5, ax, ay, bx, by) <= strokeWidth) {
        image[imageIndex(clamp(x, 0, GRID_SIZE - 1), clamp(y, 0, GRID_SIZE - 1))] = 1;
      }
    }
  }
}

function drawTriangleOutline(image, vertices, strokeWidth) {
  drawLine(image, vertices[0][0], vertices[0][1], vertices[1][0], vertices[1][1], strokeWidth);
  drawLine(image, vertices[1][0], vertices[1][1], vertices[2][0], vertices[2][1], strokeWidth);
  drawLine(image, vertices[2][0], vertices[2][1], vertices[0][0], vertices[0][1], strokeWidth);
}

function addPixelNoise(image) {
  const toggles = Math.floor(randomBetween(0, 5));

  for (let attempt = 0; attempt < toggles; attempt += 1) {
    const x = Math.floor(randomBetween(1, GRID_SIZE - 1));
    const y = Math.floor(randomBetween(1, GRID_SIZE - 1));

    if (rng() < 0.65) {
      activateBrush(image, x, y, 0);
    } else {
      image[imageIndex(x, y)] = 0;
    }
  }
}

function findBoundingBox(image) {
  let minX = GRID_SIZE;
  let minY = GRID_SIZE;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (image[imageIndex(x, y)] <= 0.5) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX === -1) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function normalizeImage(image, padding = Math.max(5, Math.round(GRID_SIZE * 0.12))) {
  const bbox = findBoundingBox(image);

  if (!bbox) {
    return createBlankImage();
  }

  const sourceWidth = bbox.maxX - bbox.minX + 1;
  const sourceHeight = bbox.maxY - bbox.minY + 1;
  const maxSpan = GRID_SIZE - (padding * 2);
  const scale = Math.min(maxSpan / sourceWidth, maxSpan / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = (GRID_SIZE - scaledWidth) / 2;
  const offsetY = (GRID_SIZE - scaledHeight) / 2;
  const normalized = createBlankImage();

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const sourceX = ((x + 0.5) - offsetX) / scale + bbox.minX - 0.5;
      const sourceY = ((y + 0.5) - offsetY) / scale + bbox.minY - 0.5;
      const sampleX = Math.round(sourceX);
      const sampleY = Math.round(sourceY);

      if (
        sampleX < bbox.minX ||
        sampleX > bbox.maxX ||
        sampleY < bbox.minY ||
        sampleY > bbox.maxY
      ) {
        continue;
      }

      normalized[imageIndex(x, y)] = image[imageIndex(sampleX, sampleY)] > 0.5 ? 1 : 0;
    }
  }

  return normalized;
}

function generateCat() {
  const image = createBlankImage();
  const bodyCx = scaled(17.2) + randomBetween(-scaled(1.1), scaled(1.1));
  const bodyCy = scaled(21.8) + randomBetween(-scaled(0.9), scaled(0.9));
  const bodyRx = randomBetween(scaled(7.4), scaled(8.8));
  const bodyRy = randomBetween(scaled(4.6), scaled(5.6));
  const stroke = randomBetween(scaled(0.8), scaled(1.3));
  const headCx = bodyCx + bodyRx - scaled(0.8);
  const headCy = bodyCy - scaled(3.8);
  const headR = randomBetween(scaled(2.6), scaled(3.4));
  const earHeight = randomBetween(scaled(1.9), scaled(2.8));
  const legLength = randomBetween(scaled(5.0), scaled(6.4));

  drawEllipseOutline(image, bodyCx, bodyCy, bodyRx, bodyRy, stroke);
  drawCircleOutline(image, headCx, headCy, headR, stroke);

  drawTriangleOutline(image, [
    [headCx - scaled(1.4), headCy - headR + scaled(0.3)],
    [headCx - scaled(2.1), headCy - headR - earHeight],
    [headCx - scaled(0.2), headCy - headR - scaled(0.5)]
  ], stroke);

  drawTriangleOutline(image, [
    [headCx + scaled(1.1), headCy - headR + scaled(0.4)],
    [headCx + scaled(2.1), headCy - headR - earHeight],
    [headCx + scaled(0.3), headCy - headR - scaled(0.4)]
  ], stroke);

  drawLine(image, bodyCx - bodyRx + scaled(0.8), bodyCy + bodyRy - scaled(0.2), bodyCx - bodyRx - scaled(3.2), bodyCy - bodyRy - scaled(1.2), stroke);
  drawLine(image, bodyCx - bodyRx - scaled(3.2), bodyCy - bodyRy - scaled(1.2), bodyCx - bodyRx - scaled(5.6), bodyCy - bodyRy + scaled(2.0), stroke);

  const legXs = [
    bodyCx - scaled(4.4),
    bodyCx - scaled(1.5),
    bodyCx + scaled(1.9),
    bodyCx + scaled(4.8)
  ];

  for (const legX of legXs) {
    drawLine(image, legX, bodyCy + bodyRy - scaled(0.1), legX + randomBetween(-scaled(0.3), scaled(0.3)), bodyCy + bodyRy + legLength, stroke);
  }

  drawLine(image, headCx + headR - scaled(0.3), headCy + scaled(0.4), headCx + headR + scaled(2.4), headCy + scaled(1.1), stroke * 0.9);
  drawLine(image, headCx + headR + scaled(0.6), headCy + scaled(0.9), headCx + headR + scaled(3.8), headCy + scaled(0.1), scaled(0.45));
  drawLine(image, headCx + headR + scaled(0.6), headCy + scaled(1.5), headCx + headR + scaled(3.8), headCy + scaled(2.2), scaled(0.45));

  if (rng() < 0.55) {
    drawLine(image, headCx + scaled(0.5), headCy + headR - scaled(0.4), headCx + scaled(1.8), headCy + headR + scaled(1.0), scaled(0.45));
    drawLine(image, headCx + scaled(0.5), headCy + headR - scaled(0.4), headCx - scaled(0.8), headCy + headR + scaled(1.0), scaled(0.45));
  }

  return image;
}

function generateMouse() {
  const image = createBlankImage();
  const bodyCx = scaled(16.2) + randomBetween(-scaled(1.0), scaled(1.0));
  const bodyCy = scaled(23.0) + randomBetween(-scaled(0.8), scaled(0.8));
  const bodyRx = randomBetween(scaled(6.0), scaled(7.4));
  const bodyRy = randomBetween(scaled(4.0), scaled(4.8));
  const stroke = randomBetween(scaled(0.8), scaled(1.3));
  const headCx = bodyCx + bodyRx - scaled(0.6);
  const headCy = bodyCy - scaled(2.2);
  const noseX = headCx + scaled(4.8);
  const noseY = headCy + scaled(0.8);
  const earR = randomBetween(scaled(1.8), scaled(2.5));
  const legLength = randomBetween(scaled(2.0), scaled(3.0));

  drawEllipseOutline(image, bodyCx, bodyCy, bodyRx, bodyRy, stroke);
  drawLine(image, headCx - scaled(2.1), headCy - scaled(2.2), noseX, noseY, stroke);
  drawLine(image, noseX, noseY, headCx - scaled(1.6), headCy + scaled(2.2), stroke);
  drawLine(image, headCx - scaled(1.6), headCy + scaled(2.2), headCx - scaled(2.3), headCy - scaled(1.6), stroke);
  drawCircleOutline(image, headCx - scaled(0.8), headCy - scaled(2.7), earR, stroke);
  drawCircleOutline(image, headCx + scaled(1.2), headCy - scaled(2.1), earR, stroke);

  activateBrush(image, Math.round(headCx + scaled(0.9)), Math.round(headCy - scaled(0.2)), Math.round(scaled(0.35)));
  activateBrush(image, Math.round(noseX), Math.round(noseY), Math.round(scaled(0.3)));

  const legXs = [
    bodyCx - scaled(3.4),
    bodyCx - scaled(0.6),
    bodyCx + scaled(2.4)
  ];

  for (const legX of legXs) {
    drawLine(image, legX, bodyCy + bodyRy - scaled(0.1), legX + randomBetween(-scaled(0.4), scaled(0.4)), bodyCy + bodyRy + legLength, stroke);
  }

  drawLine(image, bodyCx - bodyRx + scaled(0.2), bodyCy - scaled(1.2), bodyCx - bodyRx - scaled(4.0), bodyCy - scaled(5.0), stroke * 0.9);
  drawLine(image, bodyCx - bodyRx - scaled(4.0), bodyCy - scaled(5.0), bodyCx - bodyRx - scaled(7.0), bodyCy - scaled(2.0), stroke * 0.8);

  drawLine(image, headCx + scaled(1.0), headCy + scaled(0.6), headCx + scaled(4.5), headCy - scaled(0.6), scaled(0.45));
  drawLine(image, headCx + scaled(1.0), headCy + scaled(1.1), headCx + scaled(4.8), headCy + scaled(1.7), scaled(0.45));

  return image;
}

function generateSample(label) {
  const raw = label === "cat" ? generateCat() : generateMouse();

  if (rng() < 0.6) {
    addPixelNoise(raw);
  }

  return normalizeImage(raw);
}

function crcPng(buffer) {
  const rawRows = [];

  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * WIDTH * 4;
    rawRows.push(Buffer.from([0]));
    rawRows.push(buffer.subarray(start, start + WIDTH * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rawRows))),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

async function main() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      setPixel(pixels, x, y, 250, 247, 241, 255);
    }
  }

  const examples = [];

  for (let index = 0; index < 10; index += 1) {
    examples.push({ label: "cat", pixels: generateSample("cat") });
  }

  for (let index = 0; index < 10; index += 1) {
    examples.push({ label: "mouse", pixels: generateSample("mouse") });
  }

  for (let index = 0; index < examples.length; index += 1) {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const tileX = col * TILE_SIZE;
    const tileY = row * TILE_SIZE;

    fillRect(pixels, tileX, tileY, TILE_SIZE, TILE_SIZE, [255, 253, 248, 255]);
    fillRect(pixels, tileX, tileY, TILE_SIZE, 2, [218, 211, 200, 255]);
    fillRect(pixels, tileX, tileY + TILE_SIZE - 2, TILE_SIZE, 2, [218, 211, 200, 255]);
    fillRect(pixels, tileX, tileY, 2, TILE_SIZE, [218, 211, 200, 255]);
    fillRect(pixels, tileX + TILE_SIZE - 2, tileY, 2, TILE_SIZE, [218, 211, 200, 255]);

    const margin = 12;
    const pixelSize = (TILE_SIZE - (margin * 2)) / GRID_SIZE;

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (examples[index].pixels[imageIndex(x, y)] <= 0.5) {
          continue;
        }

        fillRect(
          pixels,
          tileX + margin + (x * pixelSize),
          tileY + margin + (y * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize),
          [35, 33, 29, 255]
        );
      }
    }
  }

  await fs.writeFile(outputPath, crcPng(pixels));
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
