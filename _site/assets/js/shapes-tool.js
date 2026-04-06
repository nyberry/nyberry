const GRID_SIZE = 26;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const DISPLAY_SIZE = 312;
const PREVIEW_SIZE = 156;
const MODEL_URL = "/assets/data/shape-classifier-model.json";

const LABELS = ["circle", "square", "triangle"];

const canvas = document.getElementById("shape-grid");
const previewCanvas = document.getElementById("shape-preview");
const statusEl = document.getElementById("shape-status");
const predictionEl = document.getElementById("shape-prediction");
const probabilitiesEl = document.getElementById("shape-probabilities");
const brushInput = document.getElementById("shape-brush-size");
const classifyButton = document.getElementById("shape-classify-btn");
const clearButton = document.getElementById("shape-clear-btn");
const modeButtons = Array.from(document.querySelectorAll(".shape-mode-btn"));
const stampButtons = Array.from(document.querySelectorAll(".shape-stamp-btn"));

canvas.width = DISPLAY_SIZE;
canvas.height = DISPLAY_SIZE;
previewCanvas.width = PREVIEW_SIZE;
previewCanvas.height = PREVIEW_SIZE;

const ctx = canvas.getContext("2d");
const previewCtx = previewCanvas.getContext("2d");

let grid = new Float32Array(CELL_COUNT);
let drawingMode = "draw";
let isPointerDown = false;
let model = null;

function createBlankImage() {
  return new Float32Array(CELL_COUNT);
}

function imageIndex(x, y) {
  return (y * GRID_SIZE) + x;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getActivePixelCount(image) {
  let count = 0;

  for (const value of image) {
    if (value > 0.5) {
      count += 1;
    }
  }

  return count;
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

function normalizeImage(image, padding = 3) {
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

function renderImage(targetCtx, image, pixelSize, showGrid) {
  targetCtx.clearRect(0, 0, pixelSize * GRID_SIZE, pixelSize * GRID_SIZE);
  targetCtx.fillStyle = "#fffdf8";
  targetCtx.fillRect(0, 0, pixelSize * GRID_SIZE, pixelSize * GRID_SIZE);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const value = image[imageIndex(x, y)];

      if (value <= 0) {
        continue;
      }

      const shade = Math.round(255 - (value * 220));
      targetCtx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      targetCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }

  if (!showGrid) {
    return;
  }

  targetCtx.strokeStyle = "#e6ddcf";
  targetCtx.lineWidth = 1;

  for (let step = 0; step <= GRID_SIZE; step += 1) {
    const position = step * pixelSize;

    targetCtx.beginPath();
    targetCtx.moveTo(position, 0);
    targetCtx.lineTo(position, pixelSize * GRID_SIZE);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.moveTo(0, position);
    targetCtx.lineTo(pixelSize * GRID_SIZE, position);
    targetCtx.stroke();
  }
}

function updateCanvas() {
  renderImage(ctx, grid, DISPLAY_SIZE / GRID_SIZE, true);
  renderImage(previewCtx, normalizeImage(grid), PREVIEW_SIZE / GRID_SIZE, false);
}

function updateModeButtons() {
  for (const button of modeButtons) {
    button.classList.toggle("active", button.dataset.mode === drawingMode);
  }
}

function paintAt(x, y) {
  const brushRadius = Number(brushInput.value) - 1;
  const value = drawingMode === "draw" ? 1 : 0;

  for (let dy = -brushRadius; dy <= brushRadius; dy += 1) {
    for (let dx = -brushRadius; dx <= brushRadius; dx += 1) {
      if ((dx * dx) + (dy * dy) > (brushRadius + 0.45) * (brushRadius + 0.45)) {
        continue;
      }

      const px = clamp(x + dx, 0, GRID_SIZE - 1);
      const py = clamp(y + dy, 0, GRID_SIZE - 1);
      grid[imageIndex(px, py)] = value;
    }
  }

  updateCanvas();
}

function canvasPointToCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
  const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);

  return {
    x: clamp(x, 0, GRID_SIZE - 1),
    y: clamp(y, 0, GRID_SIZE - 1)
  };
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function relu(value) {
  return value > 0 ? value : 0;
}

function applyLayer(input, layer) {
  const output = new Float32Array(layer.outputSize);

  for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
    let value = layer.biases[outputIndex];
    const rowOffset = outputIndex * layer.inputSize;

    for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
      value += layer.weights[rowOffset + inputIndex] * input[inputIndex];
    }

    output[outputIndex] = layer.activation === "relu" ? relu(value) : value;
  }

  return output;
}

function predict(image) {
  let current = image;

  for (const layer of model.layers) {
    current = applyLayer(current, layer);
  }

  const scores = softmax(Array.from(current));

  return model.labels
    .map((label, index) => ({ label, probability: scores[index] }))
    .sort((a, b) => b.probability - a.probability);
}

function renderProbabilities(results) {
  probabilitiesEl.innerHTML = "";

  for (const result of results) {
    const item = document.createElement("li");
    item.innerHTML = `<span>${result.label}</span><strong>${(result.probability * 100).toFixed(1)}%</strong>`;
    probabilitiesEl.appendChild(item);
  }
}

function classifyCurrentDrawing() {
  if (!model) {
    statusEl.textContent = "The model is still loading.";
    return;
  }

  const normalized = normalizeImage(grid);

  if (getActivePixelCount(normalized) < 8) {
    predictionEl.textContent = "Draw a shape first.";
    probabilitiesEl.innerHTML = "";
    renderImage(previewCtx, normalized, PREVIEW_SIZE / GRID_SIZE, false);
    return;
  }

  const results = predict(normalized);
  predictionEl.textContent = `Best guess: ${results[0].label}`;
  renderProbabilities(results);
}

function clearDrawing() {
  grid = createBlankImage();
  predictionEl.textContent = "Waiting for a drawing.";
  probabilitiesEl.innerHTML = "";
  updateCanvas();
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLengthSquared = (abx * abx) + (aby * aby);
  const t = abLengthSquared === 0 ? 0 : clamp(((apx * abx) + (apy * aby)) / abLengthSquared, 0, 1);
  const closestX = ax + (t * abx);
  const closestY = ay + (t * aby);
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function stampShape(shape) {
  const stamped = createBlankImage();

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let active = false;

      if (shape === "circle") {
        const dx = px - 13;
        const dy = py - 13;
        const distance = Math.sqrt((dx * dx) + (dy * dy));
        active = Math.abs(distance - 7.2) <= 1.3;
      } else if (shape === "square") {
        const dx = Math.abs(px - 13);
        const dy = Math.abs(py - 13);
        active = dx <= 7.5 && dy <= 7.5 && (Math.abs(dx - 7.5) <= 1.2 || Math.abs(dy - 7.5) <= 1.2);
      } else if (shape === "triangle") {
        const vertices = [
          [13, 5.3],
          [6, 18.7],
          [20, 18.7]
        ];
        const edgeDistances = [
          pointToSegmentDistance(px, py, vertices[0][0], vertices[0][1], vertices[1][0], vertices[1][1]),
          pointToSegmentDistance(px, py, vertices[1][0], vertices[1][1], vertices[2][0], vertices[2][1]),
          pointToSegmentDistance(px, py, vertices[2][0], vertices[2][1], vertices[0][0], vertices[0][1])
        ];
        active = Math.min(...edgeDistances) <= 1.2;
      }

      stamped[imageIndex(x, y)] = active ? 1 : 0;
    }
  }

  grid = stamped;
  predictionEl.textContent = `Stamped a ${shape}.`;
  updateCanvas();
  classifyCurrentDrawing();
}

async function loadModel() {
  try {
    const response = await fetch(MODEL_URL);

    if (!response.ok) {
      throw new Error(`Model request failed with status ${response.status}`);
    }

    model = await response.json();
    model.layers = model.layers.map((layer) => ({
      ...layer,
      weights: Float32Array.from(layer.weights),
      biases: Float32Array.from(layer.biases)
    }));
    const hiddenLayers = model.hiddenLayerSizes ? model.hiddenLayerSizes.join(" -> ") : "unknown";
    statusEl.textContent = `Model ready. MLP ${GRID_SIZE * GRID_SIZE} -> ${hiddenLayers} -> ${model.labels.length}. Synthetic validation accuracy: ${(model.validationAccuracy * 100).toFixed(1)}%.`;
  } catch (error) {
    statusEl.textContent = "Model load failed. Rebuild the site or regenerate the shape model.";
    predictionEl.textContent = error.message;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  isPointerDown = true;
  canvas.setPointerCapture(event.pointerId);
  const cell = canvasPointToCell(event.clientX, event.clientY);
  paintAt(cell.x, cell.y);
});

canvas.addEventListener("pointermove", (event) => {
  if (!isPointerDown) {
    return;
  }

  const cell = canvasPointToCell(event.clientX, event.clientY);
  paintAt(cell.x, cell.y);
});

function endPointerSession(event) {
  if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  isPointerDown = false;
}

canvas.addEventListener("pointerup", endPointerSession);
canvas.addEventListener("pointerleave", endPointerSession);
canvas.addEventListener("pointercancel", endPointerSession);

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    drawingMode = button.dataset.mode;
    updateModeButtons();
  });
}

for (const button of stampButtons) {
  button.addEventListener("click", () => {
    stampShape(button.dataset.shape);
  });
}

classifyButton.addEventListener("click", classifyCurrentDrawing);
clearButton.addEventListener("click", clearDrawing);

updateModeButtons();
updateCanvas();
loadModel();
