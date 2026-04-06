import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GRID_SIZE = 26;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const LABELS = ["circle", "square", "triangle"];
const TRAIN_SAMPLES_PER_CLASS = 900;
const VALIDATION_SAMPLES_PER_CLASS = 180;
const HIDDEN_LAYER_SIZES = [64, 32];
const EPOCHS = 55;
const INITIAL_LEARNING_RATE = 0.018;
const WEIGHT_DECAY = 0.00015;
const SEED = 20260406;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "assets", "data", "shape-classifier-model.json");

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

const rng = createRng(SEED);

function randomBetween(min, max) {
  return min + ((max - min) * rng());
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

function rasterizeCircle(image, cx, cy, radius, strokeWidth) {
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

function rasterizeSquare(image, cx, cy, halfSize, rotation, strokeWidth) {
  const cosTheta = Math.cos(rotation);
  const sinTheta = Math.sin(rotation);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;
      const localX = (dx * cosTheta) + (dy * sinTheta);
      const localY = (-dx * sinTheta) + (dy * cosTheta);
      const absX = Math.abs(localX);
      const absY = Math.abs(localY);

      if (
        absX <= halfSize + strokeWidth &&
        absY <= halfSize + strokeWidth &&
        (Math.abs(absX - halfSize) <= strokeWidth || Math.abs(absY - halfSize) <= strokeWidth)
      ) {
        image[imageIndex(x, y)] = 1;
      }
    }
  }
}

function rasterizeTriangle(image, cx, cy, radius, rotation, strokeWidth, squeeze) {
  const vertices = [];

  for (let corner = 0; corner < 3; corner += 1) {
    const angle = rotation + (corner * ((Math.PI * 2) / 3));
    vertices.push([
      cx + (Math.cos(angle) * radius),
      cy + (Math.sin(angle) * radius * squeeze)
    ]);
  }

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const edgeDistance = Math.min(
        pointToSegmentDistance(px, py, vertices[0][0], vertices[0][1], vertices[1][0], vertices[1][1]),
        pointToSegmentDistance(px, py, vertices[1][0], vertices[1][1], vertices[2][0], vertices[2][1]),
        pointToSegmentDistance(px, py, vertices[2][0], vertices[2][1], vertices[0][0], vertices[0][1])
      );

      if (edgeDistance <= strokeWidth) {
        image[imageIndex(x, y)] = 1;
      }
    }
  }
}

function addPixelNoise(image) {
  const toggles = Math.floor(randomBetween(0, 5));

  for (let attempt = 0; attempt < toggles; attempt += 1) {
    const x = Math.floor(randomBetween(1, GRID_SIZE - 1));
    const y = Math.floor(randomBetween(1, GRID_SIZE - 1));

    if (rng() < 0.6) {
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

function generateShape(label) {
  const image = createBlankImage();
  const cx = 13 + randomBetween(-2.8, 2.8);
  const cy = 13 + randomBetween(-2.8, 2.8);
  const strokeWidth = randomBetween(0.8, 1.7);
  const brushRadius = rng() < 0.25 ? 1 : 0;

  if (label === "circle") {
    rasterizeCircle(image, cx, cy, randomBetween(5.6, 8.9), strokeWidth);
  } else if (label === "square") {
    rasterizeSquare(image, cx, cy, randomBetween(5.2, 8.2), randomBetween(-0.45, 0.45), strokeWidth);
  } else {
    rasterizeTriangle(
      image,
      cx,
      cy,
      randomBetween(6.2, 9.4),
      randomBetween(-1.1, 1.1),
      strokeWidth,
      randomBetween(0.88, 1.08)
    );
  }

  if (brushRadius > 0) {
    const reinforced = createBlankImage();

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (image[imageIndex(x, y)] <= 0.5) {
          continue;
        }

        activateBrush(reinforced, x, y, brushRadius);
      }
    }

    return reinforced;
  }

  return image;
}

function generateSample(label) {
  let image = generateShape(label);

  if (rng() < 0.55) {
    addPixelNoise(image);
  }

  image = normalizeImage(image);
  return image;
}

function makeDataset(samplesPerClass) {
  const samples = [];

  for (const label of LABELS) {
    const labelIndex = LABELS.indexOf(label);

    for (let count = 0; count < samplesPerClass; count += 1) {
      samples.push({
        label: labelIndex,
        input: generateSample(label)
      });
    }
  }

  return samples;
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - maxLogit));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function relu(value) {
  return value > 0 ? value : 0;
}

function createLayer(inputSize, outputSize, activation) {
  const weights = new Float32Array(inputSize * outputSize);
  const biases = new Float32Array(outputSize);
  const scale = Math.sqrt(2 / inputSize);

  for (let index = 0; index < weights.length; index += 1) {
    weights[index] = (rng() * 2 - 1) * scale;
  }

  return { inputSize, outputSize, activation, weights, biases };
}

function createNetwork() {
  const sizes = [CELL_COUNT, ...HIDDEN_LAYER_SIZES, LABELS.length];
  const layers = [];

  for (let index = 0; index < sizes.length - 1; index += 1) {
    layers.push(
      createLayer(
        sizes[index],
        sizes[index + 1],
        index === sizes.length - 2 ? "linear" : "relu"
      )
    );
  }

  return layers;
}

function forwardPass(layers, input) {
  const activations = [input];
  const preActivations = [];
  let current = input;

  for (const layer of layers) {
    const output = new Float32Array(layer.outputSize);

    for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
      let value = layer.biases[outputIndex];
      const rowOffset = outputIndex * layer.inputSize;

      for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
        value += layer.weights[rowOffset + inputIndex] * current[inputIndex];
      }

      output[outputIndex] = value;
    }

    preActivations.push(output);

    if (layer.activation === "relu") {
      const activated = new Float32Array(layer.outputSize);

      for (let index = 0; index < layer.outputSize; index += 1) {
        activated[index] = relu(output[index]);
      }

      activations.push(activated);
      current = activated;
    } else {
      activations.push(output);
      current = output;
    }
  }

  return { activations, preActivations, logits: current };
}

function predictIndex(layers, input) {
  const { logits } = forwardPass(layers, input);
  let bestIndex = 0;
  let bestValue = logits[0];

  for (let index = 1; index < logits.length; index += 1) {
    if (logits[index] > bestValue) {
      bestValue = logits[index];
      bestIndex = index;
    }
  }

  return bestIndex;
}

function evaluate(dataset, layers) {
  let correct = 0;

  for (const sample of dataset) {
    if (predictIndex(layers, sample.input) === sample.label) {
      correct += 1;
    }
  }

  return correct / dataset.length;
}

function backpropagate(layers, sample, learningRate) {
  const { activations, preActivations, logits } = forwardPass(layers, sample.input);
  const probabilities = softmax(Array.from(logits));
  const deltas = new Array(layers.length);
  const outputDelta = new Float32Array(probabilities.length);

  for (let index = 0; index < probabilities.length; index += 1) {
    outputDelta[index] = probabilities[index] - (index === sample.label ? 1 : 0);
  }

  deltas[deltas.length - 1] = outputDelta;

  for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const layer = layers[layerIndex];
    const delta = deltas[layerIndex];
    const previousActivation = activations[layerIndex];

    if (layerIndex > 0) {
      const previousDelta = new Float32Array(layer.inputSize);
      const previousPreActivation = preActivations[layerIndex - 1];

      for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
        let total = 0;

        for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
          total += layer.weights[(outputIndex * layer.inputSize) + inputIndex] * delta[outputIndex];
        }

        previousDelta[inputIndex] = previousPreActivation[inputIndex] > 0 ? total : 0;
      }

      deltas[layerIndex - 1] = previousDelta;
    }

    for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
      const deltaValue = delta[outputIndex];
      const rowOffset = outputIndex * layer.inputSize;

      layer.biases[outputIndex] -= learningRate * deltaValue;

      for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
        const weightIndex = rowOffset + inputIndex;
        const gradient = (deltaValue * previousActivation[inputIndex]) + (WEIGHT_DECAY * layer.weights[weightIndex]);
        layer.weights[weightIndex] -= learningRate * gradient;
      }
    }
  }
}

function trainModel(trainingSet, validationSet) {
  const layers = createNetwork();

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const learningRate = INITIAL_LEARNING_RATE / (1 + (epoch * 0.05));
    shuffle(trainingSet);

    for (const sample of trainingSet) {
      backpropagate(layers, sample, learningRate);
    }

    if ((epoch + 1) % 10 === 0 || epoch === EPOCHS - 1) {
      const trainingAccuracy = evaluate(trainingSet, layers);
      const validationAccuracy = evaluate(validationSet, layers);
      console.log(
        `epoch ${String(epoch + 1).padStart(2, "0")}/${EPOCHS}  train=${(trainingAccuracy * 100).toFixed(1)}%  val=${(validationAccuracy * 100).toFixed(1)}%`
      );
    }
  }

  return layers;
}

function serializeLayers(layers) {
  return layers.map((layer) => ({
    inputSize: layer.inputSize,
    outputSize: layer.outputSize,
    activation: layer.activation,
    weights: Array.from(layer.weights, (value) => Number(value.toFixed(6))),
    biases: Array.from(layer.biases, (value) => Number(value.toFixed(6)))
  }));
}

async function main() {
  console.log("Generating synthetic shape data...");
  const trainingSet = makeDataset(TRAIN_SAMPLES_PER_CLASS);
  const validationSet = makeDataset(VALIDATION_SAMPLES_PER_CLASS);

  console.log(`Training samples: ${trainingSet.length}`);
  console.log(`Validation samples: ${validationSet.length}`);
  console.log(`Training MLP with hidden layers ${HIDDEN_LAYER_SIZES.join(" -> ")}...`);

  const layers = trainModel(trainingSet, validationSet);
  const validationAccuracy = evaluate(validationSet, layers);

  const model = {
    type: "mlp",
    labels: LABELS,
    gridSize: GRID_SIZE,
    hiddenLayerSizes: HIDDEN_LAYER_SIZES,
    validationAccuracy,
    trainingSamples: trainingSet.length,
    validationSamples: validationSet.length,
    seed: SEED,
    layers: serializeLayers(layers)
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(model, null, 2)}\n`);

  console.log(`Saved model to ${outputPath}`);
  console.log(`Final validation accuracy: ${(validationAccuracy * 100).toFixed(1)}%`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
