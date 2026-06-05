const MODEL_MANIFEST_URL = "/assets/data/tritalk-gpt-browser-model.json";

const promptInput = document.getElementById("tritalk-prompt");
const generateButton = document.getElementById("tritalk-generate-btn");
const stopButton = document.getElementById("tritalk-stop-btn");
const outputEl = document.getElementById("tritalk-output");
const statusEl = document.getElementById("tritalk-status");
const metaEl = document.getElementById("tritalk-meta");
const temperatureInput = document.getElementById("tritalk-temperature");
const topKInput = document.getElementById("tritalk-topk");
const tokenCountInput = document.getElementById("tritalk-token-count");
const samplePromptButtons = Array.from(document.querySelectorAll("[data-tritalk-prompt]"));

let model = null;
let cancelGeneration = false;
let isGenerating = false;

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function setOutput(message) {
  outputEl.textContent = message;
}

function setBusy(busy) {
  isGenerating = busy;
  generateButton.disabled = busy || !model;
  stopButton.disabled = !busy;
  promptInput.disabled = busy;
  temperatureInput.disabled = busy;
  topKInput.disabled = busy;
  tokenCountInput.disabled = busy;
  for (const button of samplePromptButtons) {
    button.disabled = busy;
  }
}

function tokenizeWords(text, lowercase = true) {
  const cleaned = lowercase ? text.trim().toLowerCase() : text.trim();
  const matches = cleaned.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*|[^\w\s]/g);
  return matches ? matches : [];
}

function detokenize(tokens) {
  const output = [];
  const attachLeft = new Set([".", ",", "!", "?", ":", ";", ")", "]", "'s"]);
  const attachRight = new Set(["(", "["]);

  for (const token of tokens) {
    if (output.length === 0) {
      output.push(token);
    } else if (attachLeft.has(token)) {
      output[output.length - 1] += token;
    } else if (attachRight.has(output[output.length - 1])) {
      output[output.length - 1] += token;
    } else {
      output.push(` ${token}`);
    }
  }

  return output.join("");
}

function erfApprox(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + (p * x));
  const y = 1 - (((((a5 * t) + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-(x * x));
  return sign * y;
}

function gelu(value) {
  return 0.5 * value * (1 + erfApprox(value / Math.sqrt(2)));
}

function layerNorm(x, weight, bias, rows, cols) {
  const output = new Float32Array(x.length);
  const epsilon = 1e-5;

  for (let row = 0; row < rows; row += 1) {
    const offset = row * cols;
    let mean = 0;
    for (let col = 0; col < cols; col += 1) {
      mean += x[offset + col];
    }
    mean /= cols;

    let variance = 0;
    for (let col = 0; col < cols; col += 1) {
      const diff = x[offset + col] - mean;
      variance += diff * diff;
    }
    variance /= cols;
    const invStd = 1 / Math.sqrt(variance + epsilon);

    for (let col = 0; col < cols; col += 1) {
      const normalized = (x[offset + col] - mean) * invStd;
      output[offset + col] = (normalized * weight[col]) + bias[col];
    }
  }

  return output;
}

function addInPlace(target, addition) {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += addition[index];
  }
}

function linear(input, weight, bias, rows, inputSize, outputSize) {
  const output = new Float32Array(rows * outputSize);

  for (let row = 0; row < rows; row += 1) {
    const inputOffset = row * inputSize;
    const outputOffset = row * outputSize;

    for (let outIndex = 0; outIndex < outputSize; outIndex += 1) {
      const weightOffset = outIndex * inputSize;
      let sum = bias ? bias[outIndex] : 0;

      for (let inIndex = 0; inIndex < inputSize; inIndex += 1) {
        sum += weight[weightOffset + inIndex] * input[inputOffset + inIndex];
      }

      output[outputOffset + outIndex] = sum;
    }
  }

  return output;
}

function mlp(input, block, rows, embd) {
  const hiddenSize = block.fc1Bias.length;
  const hidden = linear(input, block.fc1Weight, block.fc1Bias, rows, embd, hiddenSize);
  for (let index = 0; index < hidden.length; index += 1) {
    hidden[index] = gelu(hidden[index]);
  }
  return linear(hidden, block.fc2Weight, block.fc2Bias, rows, hiddenSize, embd);
}

function causalSelfAttention(input, block, config, rows) {
  const embd = config.n_embd;
  const heads = config.n_head;
  const headDim = embd / heads;
  const query = linear(input, block.queryWeight, block.queryBias, rows, embd, embd);
  const key = linear(input, block.keyWeight, block.keyBias, rows, embd, embd);
  const value = linear(input, block.valueWeight, block.valueBias, rows, embd, embd);
  const attended = new Float32Array(rows * embd);
  const scale = 1 / Math.sqrt(headDim);

  for (let head = 0; head < heads; head += 1) {
    const headOffset = head * headDim;

    for (let targetIndex = 0; targetIndex < rows; targetIndex += 1) {
      const scores = new Float32Array(targetIndex + 1);
      let maxScore = -Infinity;

      for (let sourceIndex = 0; sourceIndex <= targetIndex; sourceIndex += 1) {
        let score = 0;
        const queryOffset = (targetIndex * embd) + headOffset;
        const keyOffset = (sourceIndex * embd) + headOffset;

        for (let dim = 0; dim < headDim; dim += 1) {
          score += query[queryOffset + dim] * key[keyOffset + dim];
        }

        score *= scale;
        scores[sourceIndex] = score;
        if (score > maxScore) {
          maxScore = score;
        }
      }

      let total = 0;
      for (let sourceIndex = 0; sourceIndex <= targetIndex; sourceIndex += 1) {
        const weight = Math.exp(scores[sourceIndex] - maxScore);
        scores[sourceIndex] = weight;
        total += weight;
      }

      const outputOffset = (targetIndex * embd) + headOffset;
      for (let sourceIndex = 0; sourceIndex <= targetIndex; sourceIndex += 1) {
        const probability = scores[sourceIndex] / total;
        const valueOffset = (sourceIndex * embd) + headOffset;

        for (let dim = 0; dim < headDim; dim += 1) {
          attended[outputOffset + dim] += probability * value[valueOffset + dim];
        }
      }
    }
  }

  return linear(attended, block.projWeight, block.projBias, rows, embd, embd);
}

function embedTokens(tokenIds, modelConfig) {
  const rows = tokenIds.length;
  const cols = modelConfig.config.n_embd;
  const embedded = new Float32Array(rows * cols);

  for (let row = 0; row < rows; row += 1) {
    const tokenId = tokenIds[row];
    const tokenOffset = tokenId * cols;
    const positionOffset = row * cols;

    for (let col = 0; col < cols; col += 1) {
      embedded[(row * cols) + col] =
        modelConfig.tokenEmbedding[tokenOffset + col] +
        modelConfig.positionEmbedding[positionOffset + col];
    }
  }

  return embedded;
}

function forward(tokenIds) {
  const rows = tokenIds.length;
  const cols = model.config.n_embd;
  let x = embedTokens(tokenIds, model);

  for (const block of model.blocks) {
    const ln1 = layerNorm(x, block.ln1Weight, block.ln1Bias, rows, cols);
    const attn = causalSelfAttention(ln1, block, model.config, rows);
    addInPlace(x, attn);

    const ln2 = layerNorm(x, block.ln2Weight, block.ln2Bias, rows, cols);
    const feedForward = mlp(ln2, block, rows, cols);
    addInPlace(x, feedForward);
  }

  const finalState = layerNorm(x, model.lnFWeight, model.lnFBias, rows, cols);
  const lastOffset = (rows - 1) * cols;
  const logits = new Float32Array(model.config.vocab_size);

  for (let vocabIndex = 0; vocabIndex < model.config.vocab_size; vocabIndex += 1) {
    const weightOffset = vocabIndex * cols;
    let score = 0;

    for (let col = 0; col < cols; col += 1) {
      score += model.headWeight[weightOffset + col] * finalState[lastOffset + col];
    }

    logits[vocabIndex] = score;
  }

  return logits;
}

function sampleIndex(logits, temperature, topK) {
  const adjusted = Array.from(logits, (value) => value / Math.max(temperature, 1e-5));
  let candidates = adjusted.map((value, index) => ({ value, index }));
  candidates.sort((a, b) => b.value - a.value);

  if (topK > 0 && topK < candidates.length) {
    candidates = candidates.slice(0, topK);
  }

  const maxValue = candidates[0].value;
  let total = 0;
  const probabilities = [];

  for (const candidate of candidates) {
    const probability = Math.exp(candidate.value - maxValue);
    probabilities.push(probability);
    total += probability;
  }

  let threshold = Math.random() * total;
  for (let index = 0; index < candidates.length; index += 1) {
    threshold -= probabilities[index];
    if (threshold <= 0) {
      return candidates[index].index;
    }
  }

  return candidates[candidates.length - 1].index;
}

async function nextFrame() {
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function generateCompletion() {
  if (!model || isGenerating) {
    return;
  }

  cancelGeneration = false;
  setBusy(true);

  try {
    const keepCase = Boolean(model.tokenization.keep_case);
    const promptTokens = tokenizeWords(promptInput.value, !keepCase);
    const bosId = model.stoi.get(model.specialTokens.bos);
    const eosId = model.stoi.get(model.specialTokens.eos);
    const unkId = model.stoi.get(model.specialTokens.unk);
    const maxNewTokens = Math.max(1, Number(tokenCountInput.value) || 24);
    const temperature = Math.max(0.1, Number(temperatureInput.value) || 0.9);
    const topK = Math.max(1, Number(topKInput.value) || 20);
    const context = [bosId, ...promptTokens.map((token) => model.stoi.get(token) ?? unkId)];
    let visibleTokens = promptTokens.slice();

    setOutput(detokenize(visibleTokens));
    setStatus("Generating in your browser…", "working");

    for (let step = 0; step < maxNewTokens; step += 1) {
      if (cancelGeneration) {
        setStatus("Generation stopped.", "neutral");
        break;
      }

      const windowed = context.slice(-model.config.block_size);
      const logits = forward(windowed);
      const nextTokenId = sampleIndex(logits, temperature, topK);

      context.push(nextTokenId);
      const nextToken = model.vocab[nextTokenId];

      if (nextToken === model.specialTokens.eos) {
        setStatus("Generation complete.", "good");
        break;
      }

      if (nextToken !== model.specialTokens.pad && nextToken !== model.specialTokens.bos) {
        visibleTokens.push(nextToken);
      }

      setOutput(detokenize(visibleTokens));
      await nextFrame();

      if (step === maxNewTokens - 1) {
        setStatus("Generation complete.", "good");
      }
    }
  } catch (error) {
    console.error(error);
    setStatus("The browser model hit an error.", "bad");
  } finally {
    cancelGeneration = false;
    setBusy(false);
  }
}

function bindPromptChips() {
  for (const button of samplePromptButtons) {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.tritalkPrompt || "";
      promptInput.focus();
    });
  }
}

function getTensorView(buffer, spec) {
  return new Float32Array(buffer, spec.byte_offset, spec.byte_length / 4);
}

function buildBlock(manifest, weightBuffer, blockIndex) {
  const prefix = `blocks.${blockIndex}`;
  const tensor = (name) => getTensorView(weightBuffer, manifest.tensors[`${prefix}.${name}`]);

  return {
    ln1Weight: tensor("ln1.weight"),
    ln1Bias: tensor("ln1.bias"),
    keyWeight: tensor("attn.key.weight"),
    keyBias: tensor("attn.key.bias"),
    queryWeight: tensor("attn.query.weight"),
    queryBias: tensor("attn.query.bias"),
    valueWeight: tensor("attn.value.weight"),
    valueBias: tensor("attn.value.bias"),
    projWeight: tensor("attn.proj.weight"),
    projBias: tensor("attn.proj.bias"),
    ln2Weight: tensor("ln2.weight"),
    ln2Bias: tensor("ln2.bias"),
    fc1Weight: tensor("mlp.0.weight"),
    fc1Bias: tensor("mlp.0.bias"),
    fc2Weight: tensor("mlp.2.weight"),
    fc2Bias: tensor("mlp.2.bias")
  };
}

async function loadModel() {
  setStatus("Loading model manifest…", "working");

  const manifestResponse = await fetch(MODEL_MANIFEST_URL);
  if (!manifestResponse.ok) {
    throw new Error(`Manifest request failed with status ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();
  const weightsUrl = `/assets/data/${manifest.weights_file}`;
  setStatus("Downloading browser weights…", "working");

  const weightsResponse = await fetch(weightsUrl);
  if (!weightsResponse.ok) {
    throw new Error(`Weights request failed with status ${weightsResponse.status}`);
  }

  const weightBuffer = await weightsResponse.arrayBuffer();
  const tensor = (name) => getTensorView(weightBuffer, manifest.tensors[name]);

  model = {
    config: manifest.config,
    tokenization: manifest.tokenization,
    specialTokens: manifest.special_tokens,
    vocab: manifest.vocab,
    stoi: new Map(manifest.vocab.map((token, index) => [token, index])),
    tokenEmbedding: tensor("token_embedding.weight"),
    positionEmbedding: tensor("position_embedding.weight"),
    lnFWeight: tensor("ln_f.weight"),
    lnFBias: tensor("ln_f.bias"),
    headWeight: tensor("head.weight"),
    blocks: Array.from({ length: manifest.config.n_layer }, (_, index) => buildBlock(manifest, weightBuffer, index))
  };

  const sizeMb = (weightBuffer.byteLength / (1024 * 1024)).toFixed(1);
  metaEl.textContent =
    `Vocabulary ${manifest.config.vocab_size.toLocaleString()} words • ` +
    `${manifest.config.n_layer} layers • ` +
    `${manifest.config.n_embd} embedding width • ` +
    `${sizeMb} MB weights`;
  setStatus("Model loaded. Everything now runs locally in your browser.", "good");
  setBusy(false);
}

generateButton.addEventListener("click", () => {
  generateCompletion();
});

stopButton.addEventListener("click", () => {
  cancelGeneration = true;
});

promptInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    generateCompletion();
  }
});

bindPromptChips();
setBusy(true);
setOutput("");
setStatus("Preparing browser demo…", "neutral");

loadModel().catch((error) => {
  console.error(error);
  setStatus("Could not load the browser model.", "bad");
  metaEl.textContent = "Try rebuilding the model bundle if the static assets are missing.";
  setBusy(true);
});
