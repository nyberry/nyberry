(() => {
  const MODEL_URL = "/assets/data/medname-gpt-model.json";
  const status = document.getElementById("medname-model-status");
  const button = document.getElementById("medname-generate");
  const output = document.getElementById("medname-output");
  const seedInput = document.getElementById("medname-seed");
  const temperatureInput = document.getElementById("medname-temperature");
  const countInput = document.getElementById("medname-count");
  const maxLengthInput = document.getElementById("medname-max-length");

  let model = null;

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} bytes`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);

  const linear = (x, w) => w.map((row) => dot(row, x));

  const softmax = (logits) => {
    const maxValue = Math.max(...logits);
    const exps = logits.map((value) => Math.exp(value - maxValue));
    const total = exps.reduce((sum, value) => sum + value, 0);
    return exps.map((value) => value / total);
  };

  const rmsnorm = (x) => {
    const meanSquare = x.reduce((sum, value) => sum + value * value, 0) / x.length;
    const scale = 1 / Math.sqrt(meanSquare + 1e-5);
    return x.map((value) => value * scale);
  };

  const add = (a, b) => a.map((value, i) => value + b[i]);

  const relu = (x) => x.map((value) => Math.max(0, value));

  const gpt = (tokenId, posId, keys, values) => {
    const state = model.state_dict;
    let x = add(state.wte[tokenId], state.wpe[posId]);
    x = rmsnorm(x);

    for (let layer = 0; layer < model.n_layer; layer += 1) {
      let residual = x;
      x = rmsnorm(x);
      const q = linear(x, state[`layer${layer}.attn_wq`]);
      const k = linear(x, state[`layer${layer}.attn_wk`]);
      const v = linear(x, state[`layer${layer}.attn_wv`]);
      keys[layer].push(k);
      values[layer].push(v);

      const xAttn = [];
      for (let head = 0; head < model.n_head; head += 1) {
        const start = head * model.head_dim;
        const qHead = q.slice(start, start + model.head_dim);
        const attnLogits = keys[layer].map((key) => {
          const kHead = key.slice(start, start + model.head_dim);
          return dot(qHead, kHead) / Math.sqrt(model.head_dim);
        });
        const attnWeights = softmax(attnLogits);

        for (let j = 0; j < model.head_dim; j += 1) {
          let value = 0;
          for (let t = 0; t < values[layer].length; t += 1) {
            value += attnWeights[t] * values[layer][t][start + j];
          }
          xAttn.push(value);
        }
      }

      x = add(linear(xAttn, state[`layer${layer}.attn_wo`]), residual);
      residual = x;
      x = rmsnorm(x);
      x = relu(linear(x, state[`layer${layer}.mlp_fc1`]));
      x = add(linear(x, state[`layer${layer}.mlp_fc2`]), residual);
    }

    return linear(x, state.lm_head);
  };

  const sampleToken = (probs) => {
    let threshold = Math.random();
    for (let i = 0; i < probs.length; i += 1) {
      threshold -= probs[i];
      if (threshold <= 0) return i;
    }
    return probs.length - 1;
  };

  const sanitizeSeed = (value) => value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 24);

  const generateName = () => {
    const temperature = Math.max(0.1, Number(temperatureInput.value) || 0.8);
    const maxLength = Math.min(model.block_size - 1, Math.max(4, Number(maxLengthInput.value) || 14));
    const seed = sanitizeSeed(seedInput.value).slice(0, maxLength);
    const keys = Array.from({ length: model.n_layer }, () => []);
    const values = Array.from({ length: model.n_layer }, () => []);
    const chars = [...seed];
    let tokenId = model.eos_token;

    for (let pos = 0; pos < model.block_size; pos += 1) {
      const logits = gpt(tokenId, pos, keys, values);
      if (pos < seed.length) {
        tokenId = model.vocab.indexOf(seed[pos]);
      } else {
        const probs = softmax(logits.map((value) => value / temperature));
        tokenId = sampleToken(probs);
        if (tokenId === model.eos_token || chars.length >= maxLength) break;
        chars.push(model.vocab[tokenId]);
      }
    }

    return chars.join("");
  };

  const renderNames = () => {
    if (!model) return;
    const count = Math.min(24, Math.max(1, Number(countInput.value) || 12));
    output.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement("li");
      item.textContent = generateName() || "eos";
      output.appendChild(item);
    }
  };

  fetch(MODEL_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("missing model metadata");
      return response.text();
    })
    .then((text) => {
      const payload = JSON.parse(text);
      model = payload;
      const perplexity = Math.exp(payload.train_loss);
      status.textContent = `${payload.num_params.toLocaleString()} params, ${formatBytes(text.length)} weights, ${payload.num_steps.toLocaleString()} steps, loss ${payload.train_loss.toFixed(4)}, perplexity ${perplexity.toFixed(2)}`;
      status.dataset.tone = "ready";
      button.disabled = false;
      renderNames();
    })
    .catch(() => {
      status.textContent = "No exported model found yet.";
      status.dataset.tone = "pending";
      output.innerHTML = "<li>offline training first</li>";
    });

  button.addEventListener("click", renderNames);
})();
