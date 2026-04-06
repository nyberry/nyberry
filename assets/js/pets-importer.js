const GRID_SIZE = 40;
const STORAGE_KEY = "pets-importer-examples-v1";

const labelInput = document.getElementById("import-label");
const thresholdInput = document.getElementById("import-threshold");
const thresholdValueEl = document.getElementById("import-threshold-value");
const invertInput = document.getElementById("import-invert");
const filesInput = document.getElementById("import-files");
const runButton = document.getElementById("import-run-btn");
const exportButton = document.getElementById("import-export-btn");
const clearButton = document.getElementById("import-clear-btn");
const statusEl = document.getElementById("import-status");
const countsEl = document.getElementById("import-counts");
const previewListEl = document.getElementById("import-preview-list");

let examples = loadExamples();

function imageIndex(x, y) {
  return (y * GRID_SIZE) + x;
}

function createBlankImage() {
  return new Float32Array(GRID_SIZE * GRID_SIZE);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadExamples() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((example) =>
      (example.label === "cat" || example.label === "mouse") &&
      Array.isArray(example.pixels) &&
      example.pixels.length === GRID_SIZE * GRID_SIZE
    );
  } catch {
    return [];
  }
}

function saveExamples() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(examples));
}

function findBoundingBox(image, sourceWidth, sourceHeight) {
  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      if (image[(y * sourceWidth) + x] === 0) {
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

function normalizeToGrid(sourcePixels, sourceWidth, sourceHeight, padding = 5) {
  const bbox = findBoundingBox(sourcePixels, sourceWidth, sourceHeight);

  if (!bbox) {
    return createBlankImage();
  }

  const sourceBoxWidth = bbox.maxX - bbox.minX + 1;
  const sourceBoxHeight = bbox.maxY - bbox.minY + 1;
  const maxSpan = GRID_SIZE - (padding * 2);
  const scale = Math.min(maxSpan / sourceBoxWidth, maxSpan / sourceBoxHeight);
  const scaledWidth = sourceBoxWidth * scale;
  const scaledHeight = sourceBoxHeight * scale;
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

      normalized[imageIndex(x, y)] = sourcePixels[(sampleY * sourceWidth) + sampleX] > 0 ? 1 : 0;
    }
  }

  return normalized;
}

function drawPreview(canvas, pixels) {
  const ctx = canvas.getContext("2d");
  const pixelSize = canvas.width / GRID_SIZE;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (pixels[imageIndex(x, y)] <= 0.5) {
        continue;
      }

      ctx.fillStyle = "#21201c";
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

function updateCounts() {
  const cats = examples.filter((example) => example.label === "cat").length;
  const mice = examples.filter((example) => example.label === "mouse").length;
  countsEl.textContent = `Cats: ${cats}. Mice: ${mice}. Total: ${examples.length}.`;
}

function renderPreviews() {
  previewListEl.innerHTML = "";

  const recentExamples = examples.slice(-24).reverse();

  for (const example of recentExamples) {
    const card = document.createElement("div");
    card.className = "importer-card";

    const canvas = document.createElement("canvas");
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    drawPreview(canvas, example.pixels);

    const label = document.createElement("p");
    label.textContent = `Label: ${example.label}`;

    const source = document.createElement("p");
    source.textContent = example.sourceName || "Imported image";

    card.appendChild(canvas);
    card.appendChild(label);
    card.appendChild(source);
    previewListEl.appendChild(card);
  }

  if (recentExamples.length === 0) {
    previewListEl.innerHTML = "<p class=\"importer-note\">No previews yet.</p>";
  }
}

function updateThresholdLabel() {
  thresholdValueEl.textContent = `Threshold: ${thresholdInput.value}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load ${file.name}`));
    };

    image.src = objectUrl;
  });
}

function rasterizeImage(image, threshold, invert) {
  const maxDimension = 512;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = new Uint8Array(width * height);

  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    const a = imageData.data[offset + 3] / 255;
    const gray = ((0.299 * r) + (0.587 * g) + (0.114 * b)) * a + (255 * (1 - a));
    const isActive = invert ? gray > threshold : gray < threshold;
    pixels[index] = isActive ? 1 : 0;
  }

  return { pixels, width, height };
}

async function importSelectedImages() {
  const files = Array.from(filesInput.files || []);

  if (files.length === 0) {
    statusEl.textContent = "Choose one or more images first.";
    return;
  }

  runButton.disabled = true;
  statusEl.textContent = "Importing images...";

  const label = labelInput.value;
  const threshold = Number(thresholdInput.value);
  const invert = invertInput.checked;
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const image = await loadImage(file);
      const raster = rasterizeImage(image, threshold, invert);
      const normalized = normalizeToGrid(raster.pixels, raster.width, raster.height);
      const activePixels = normalized.reduce((sum, value) => sum + (value > 0.5 ? 1 : 0), 0);

      if (activePixels < 10) {
        skipped += 1;
        continue;
      }

      examples.push({
        label,
        sourceName: file.name,
        threshold,
        invert,
        pixels: Array.from(normalized, (value) => Number(value))
      });

      imported += 1;
    } catch {
      skipped += 1;
    }
  }

  saveExamples();
  updateCounts();
  renderPreviews();

  statusEl.textContent = `Imported ${imported} image${imported === 1 ? "" : "s"}. Skipped ${skipped}.`;
  runButton.disabled = false;
  filesInput.value = "";
}

function downloadExamples() {
  if (examples.length === 0) {
    statusEl.textContent = "Import some examples before exporting.";
    return;
  }

  const blob = new Blob([`${JSON.stringify(examples, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "examples.json";
  link.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Downloaded examples.json.";
}

function clearExamples() {
  examples = [];
  saveExamples();
  updateCounts();
  renderPreviews();
  statusEl.textContent = "Dataset cleared.";
}

thresholdInput.addEventListener("input", updateThresholdLabel);
runButton.addEventListener("click", importSelectedImages);
exportButton.addEventListener("click", downloadExamples);
clearButton.addEventListener("click", clearExamples);

updateThresholdLabel();
updateCounts();
renderPreviews();
