---
layout: layout.html
title: MedName miniGPT
description: A browser-only character-level microGPT experiment for generating fictional medication names.
image: /assets/images/medicine.png
date: 2026-06-08
---

<section class="medname-hero">
  <div>
    <p class="medname-kicker">Browser-only character model</p>
    <h1>MedName miniGPT</h1>
    <p class="medname-lede">
      A tiny GPT-style model for generating fictional medication names. Training
      happens offline in Python; inference will run locally in the browser from
      static model files.
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

<section class="medname-notes">
  <h2>Build Notes</h2>
  <p>
    The offline training project now lives outside the site repository at
    <code>/Users/nyberry/Desktop/python/medname_gpt</code>. This page is the
    static nyberry.com inference surface and will load exported model weights
    from <code>/assets/data/</code> when they are available.
  </p>
  <p>
    The Python project is based on Karpathy's dependency-free
    <code>microgpt.py</code> gist rather than the larger nanoGPT repository.
  </p>
  <p>
    The planned tokenizer is character-level: <code>a</code> through
    <code>z</code> plus an EOS token.
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
  .medname-notes {
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

  .medname-notes {
    margin: 1.5rem 0;
  }

  .medname-notes h2 {
    margin-top: 0;
  }

  @media (max-width: 720px) {
    .medname-hero,
    .medname-knobs {
      grid-template-columns: 1fr;
    }
  }
</style>

<script src="/assets/js/medname-gpt.js"></script>
