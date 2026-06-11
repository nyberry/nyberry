---
layout: layout.html
title: MicroMedGPT
description: A tiny GPT model for generating new medication names.
image: /assets/images/medicine.png
date: 2026-06-04
---

<section class="medname-hero">
  <div>
    <p class="medname-kicker">Browser-only character model</p>
    <h1>MicroMedGPT</h1>
    <p class="medname-lede">
      A tiny GPT model for generating new medication names.
    </p>
  </div>
  <div class="medname-status-panel">
    <p class="medname-panel-label">Model snapshot</p>
    <p id="medname-model-status" class="medname-status" data-tone="pending">
      Waiting for exported browser weights.
    </p>
  </div>
</section>

<section class="medname-console">
  <div class="medname-controls">
    <label class="medname-field">
      <span>Seed</span>
      <input id="medname-seed" type="text" maxlength="24" placeholder="e.g. za">
    </label>

    <div class="medname-knobs">
      <label class="medname-field medname-field--compact">
        <span>Temperature</span>
        <input id="medname-temperature" type="number" min="0.1" max="2" step="0.1" value="0.8">
      </label>
      <label class="medname-field medname-field--compact">
        <span>Names</span>
        <input id="medname-count" type="number" min="1" max="24" step="1" value="12">
      </label>
      <label class="medname-field medname-field--compact">
        <span>Max length</span>
        <input id="medname-max-length" type="number" min="4" max="32" step="1" value="14">
      </label>
    </div>

    <button id="medname-generate" type="button" disabled>Generate</button>
  </div>

  <div>
    <p class="medname-panel-label">Generated names</p>
    <ol id="medname-output" class="medname-output"></ol>
  </div>
</section>

<section class="medname-explainer">
  <h2>About</h2>
  <p>
    MicroMedGPT is a (very) small language model trained
    to invent new medication-like names, one character at a time.
    Can a very small model learn the spelling rhythms
    of drug names well enough to make plausible new ones?
  </p>
  <p>
    The model has a tiny vocabulary of 27 tokens: the letters <code>a</code> to
    <code>z</code>, plus one end-of-name token. That means every name is treated
    as a sequence of characters rather than as words or subwords.
  </p>
  <p>
    The project was inspired by Andrej Karpathy's
    <a href="https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95"><code>microgpt.py</code></a>,
    a compact, dependency-free GPT implementation written in Python.
    Karpathy's version demonstrates the idea of a GPT end to end: a transformer,
    an autograd engine, training, and sampling, all in one Python file, with no dependencies.
  </p>

  <p>
    The training corpus is a list of drug names compiled from the US FDA National Drug Code Directory.
    It pulls both proprietary names and non-proprietary names, lowercased, with punctuation and numbers removed. It keeps alphabetic characters only, and strips confounding
    words such as <code>tablet</code>, <code>capsule</code>,
    <code>injection</code>, <code>solution</code>, <code>cream</code>, and
    <code>spray</code>.
  </p>
  <p>
    After cleaning, the corpus contains 6,091 drug names. These are compiled in a list: <code>abacavir, abatacept, abemaciclib, abilify, abiraterone</code>, and so on. This is enough for the model
    to notice some of the characteristic endings and internal shapes of medicine
    names, while still being small enough to train in about a minute on a laptop.
    </p>
    <p> Does it work? Well, you can see that if the seed <code>a</code> is used, the GPT will generate new drug names like <code>adlarilo, atrzamasidene, atetapine, akunotrab, acadsel...</code>
  </p>
  <p>
    The offline training run uses 1,000 steps. At the end of that run the final
    training loss is 2.262, which corresponds to a perplexity of about 9.61.
    Perplexity is a rough measure of how uncertain the model is
    about the next character. Lower is better, and a single digit score is (to me) surprisingly good for such a small model. 
  </p>
  <p>
    Once trained, the Python script exports the learned weights as a JSON
    file. This webpage loads that model file, and runs the same transformer calculation
    in JavaScript. No server call is made when you press generate- the sampling
    happens locally in-browser.
  </p>
</section>

<style>
  .medname-hero,
  .medname-console {
    display: grid;
    gap: 1.25rem;
    margin: 1.5rem 0;
  }

  .medname-hero {
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.85fr);
    align-items: stretch;
  }

  .medname-hero,
  .medname-console,
  .medname-explainer {
    border: 1px solid rgba(42, 68, 78, 0.16);
    border-radius: 8px;
    background: #fffdf9;
    padding: 1.4rem;
  }

  .medname-kicker,
  .medname-panel-label {
    margin: 0 0 0.45rem;
    color: #54656b;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .medname-hero h1 {
    margin: 0 0 0.65rem;
  }

  .medname-lede {
    margin: 0;
    max-width: 44rem;
    font-size: 1.05rem;
    line-height: 1.55;
  }

  .medname-status-panel {
    border-left: 4px solid #2f7d6d;
    padding-left: 1rem;
  }

  .medname-status {
    margin: 0;
    font-weight: 700;
  }

  .medname-status[data-tone="pending"] {
    color: #8a5b13;
  }

  .medname-status[data-tone="ready"] {
    color: #246b46;
  }

  .medname-status[data-tone="error"] {
    color: #9b2f2f;
  }

  .medname-controls,
  .medname-knobs {
    display: grid;
    gap: 0.9rem;
  }

  .medname-knobs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .medname-field {
    display: grid;
    gap: 0.35rem;
    font-weight: 700;
  }

  .medname-field span {
    color: #43545a;
    font-size: 0.88rem;
  }

  .medname-field input {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid rgba(42, 68, 78, 0.22);
    border-radius: 8px;
    padding: 0.7rem 0.75rem;
    font: inherit;
  }

  #medname-generate {
    width: fit-content;
    border: 0;
    border-radius: 8px;
    background: #2f665d;
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.7rem 1rem;
  }

  #medname-generate:disabled {
    background: #9aa5a7;
    cursor: not-allowed;
  }

  .medname-output {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.55rem 1rem;
    min-height: 5rem;
    margin: 0;
    padding-left: 1.25rem;
  }

  .medname-output li {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.05rem;
  }

  .medname-explainer {
    margin: 1.5rem 0;
  }

  .medname-explainer h2 {
    margin-top: 0;
  }

  .medname-explainer h2:not(:first-child) {
    margin-top: 1.6rem;
  }

  .medname-explainer p {
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    .medname-hero,
    .medname-knobs {
      grid-template-columns: 1fr;
    }
  }
</style>

<script src="/assets/js/medname-gpt.js"></script>
