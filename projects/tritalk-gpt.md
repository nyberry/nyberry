---
layout: layout.html
title: TriTalk miniGPT
description: A tiny GPT-style language model trained on public TriTalk forum posts and running entirely in the browser.
date: 2026-06-05
---

<section class="tritalk-hero">
  <div class="tritalk-hero__copy">
    <p class="tritalk-kicker">Browser-only language model</p>
    <h1>TriTalk miniGPT</h1>
    <p class="tritalk-lede">
      This is a toy GPT text model trained on 2,463 public posts from the
      TriTalk forum. The cleaned corpus contains 130,608 word tokens, and the
      page downloads the model weights once, then generates text entirely on
      your device.
    </p>
  </div>

  <div class="tritalk-hero__panel">
    <p class="tritalk-panel-label">Model snapshot</p>
    <p id="tritalk-meta" class="tritalk-meta">Waiting for model data…</p>
    <p id="tritalk-status" class="tritalk-status" data-tone="neutral">
      Preparing browser demo…
    </p>
  </div>
</section>

<section class="tritalk-console">
  <div class="tritalk-console__controls">
    <label class="tritalk-field">
      <span>Prompt</span>
      <textarea
        id="tritalk-prompt"
        rows="4"
        placeholder="Try something like: swim training"
      >swim training</textarea>
    </label>

    <div class="tritalk-chip-row">
      <button type="button" class="tritalk-chip" data-tritalk-prompt="hate swimming">hate swimming</button>
      <button type="button" class="tritalk-chip" data-tritalk-prompt="sharks">sharks</button>
      <button type="button" class="tritalk-chip" data-tritalk-prompt="drug cheats">drug cheats</button>
      <button type="button" class="tritalk-chip" data-tritalk-prompt="the best beer">the best beer</button>
    </div>

    <div class="tritalk-knobs">
      <label class="tritalk-field tritalk-field--compact">
        <span>Temperature</span>
        <input id="tritalk-temperature" type="number" min="0.1" max="2" step="0.1" value="0.9">
      </label>

      <label class="tritalk-field tritalk-field--compact">
        <span>Top-k</span>
        <input id="tritalk-topk" type="number" min="1" max="100" step="1" value="20">
      </label>

      <label class="tritalk-field tritalk-field--compact">
        <span>New tokens</span>
        <input id="tritalk-token-count" type="number" min="1" max="80" step="1" value="28">
      </label>
    </div>

    <div class="tritalk-actions">
      <button type="button" id="tritalk-generate-btn">Generate</button>
      <button type="button" id="tritalk-stop-btn">Stop</button>
    </div>
  </div>

  <div class="tritalk-console__output">
    <p class="tritalk-panel-label">Completion</p>
    <pre id="tritalk-output" class="tritalk-output"></pre>
  </div>
</section>

<section class="tritalk-explainer">
  <h2>Version 0.0.1</h2>
  <p>
    The training happened off-line in Python using a small decoder-only transformer.
    The result was then exported into static weight files that JavaScript can load.
  </p>
  <p>
    When you press generate, the browser tokenizes your prompt, runs the model
    layer by layer, samples the next word, appends it, and repeats.
  </p>
  <p>
    No API calls are made during inference. After the model loads, the generation
    loop is local.
  </p>

  <h2>It's not very good is it?</h2>
  <p>
    This model is tiny by modern standards. It has a short context window, a
    word-level vocabulary, and very limited reasoning ability. It is just a
    proof of concept.
  </p>
  <p>
    It also inherits the quirks of the training data. You should expect triathlon
    jargon, forum-like phrasing, repetition, and some odd completions involving Fossies, crocs, and the word "your" in weird places.
  </p>
</section>

<style>
  .tritalk-hero,
  .tritalk-console {
    display: grid;
    gap: 1.4rem;
    margin: 1.6rem 0;
  }

  .tritalk-hero {
    grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.95fr);
    align-items: stretch;
  }

  .tritalk-hero__copy,
  .tritalk-hero__panel,
  .tritalk-console__controls,
  .tritalk-console__output,
  .tritalk-explainer {
    border: 1px solid rgba(51, 76, 85, 0.16);
    border-radius: 24px;
    box-shadow: 0 18px 48px rgba(38, 57, 63, 0.08);
  }

  .tritalk-hero__copy {
    background:
      radial-gradient(circle at top left, rgba(255, 220, 141, 0.55), transparent 34%),
      linear-gradient(145deg, #f7f2e4, #fffdf7 55%, #eef6f3);
    padding: 1.8rem;
  }

  .tritalk-hero__panel,
  .tritalk-console__controls,
  .tritalk-console__output,
  .tritalk-explainer {
    background: #fffdf9;
    padding: 1.35rem;
  }

  .tritalk-kicker,
  .tritalk-panel-label {
    margin: 0 0 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.76rem;
    color: #6f675a;
  }

  .tritalk-lede,
  .tritalk-note,
  .tritalk-meta,
  .tritalk-status,
  .tritalk-explainer p {
    font-size: 1rem;
    line-height: 1.65;
  }

  .tritalk-note {
    margin-bottom: 0;
  }

  .tritalk-status {
    margin-bottom: 0;
    padding: 0.85rem 1rem;
    border-radius: 16px;
    background: #f5efe2;
    color: #4a463f;
  }

  .tritalk-status[data-tone="working"] {
    background: #e7f1f4;
    color: #174b59;
  }

  .tritalk-status[data-tone="good"] {
    background: #e7f4ea;
    color: #205b33;
  }

  .tritalk-status[data-tone="bad"] {
    background: #f9e7e4;
    color: #7f2f22;
  }

  .tritalk-console {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }

  .tritalk-field {
    display: grid;
    gap: 0.45rem;
    margin-bottom: 1rem;
  }

  .tritalk-field span {
    font-size: 0.92rem;
    font-weight: 600;
    color: #2f3a3d;
  }

  .tritalk-field textarea,
  .tritalk-field input {
    width: 100%;
    border: 1px solid #d7d1c3;
    border-radius: 14px;
    background: #fffefb;
    padding: 0.8rem 0.95rem;
    font: inherit;
    color: #202425;
  }

  .tritalk-field textarea {
    resize: vertical;
    min-height: 7.4rem;
  }

  .tritalk-chip-row,
  .tritalk-knobs,
  .tritalk-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .tritalk-chip,
  #tritalk-generate-btn,
  #tritalk-stop-btn {
    border: 0;
    border-radius: 999px;
    padding: 0.72rem 1rem;
    font: inherit;
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
  }

  .tritalk-chip {
    background: #f3ebd7;
    color: #504838;
  }

  #tritalk-generate-btn {
    background: linear-gradient(135deg, #1d6f84, #2f8f7f);
    color: #fff;
    box-shadow: 0 14px 24px rgba(34, 102, 108, 0.22);
  }

  #tritalk-stop-btn {
    background: #ece6da;
    color: #564f43;
  }

  .tritalk-chip:hover,
  #tritalk-generate-btn:hover,
  #tritalk-stop-btn:hover {
    transform: translateY(-1px);
  }

  .tritalk-chip:disabled,
  #tritalk-generate-btn:disabled,
  #tritalk-stop-btn:disabled,
  .tritalk-field textarea:disabled,
  .tritalk-field input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  .tritalk-field--compact {
    flex: 1 1 140px;
    margin-bottom: 0;
  }

  .tritalk-output {
    min-height: 18rem;
    margin: 0;
    white-space: pre-wrap;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(14, 24, 28, 0.95), rgba(24, 40, 45, 0.95)),
      radial-gradient(circle at top right, rgba(76, 180, 176, 0.22), transparent 30%);
    color: #d9f4ef;
    padding: 1.1rem;
    font: 0.98rem/1.6 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    overflow-wrap: anywhere;
  }

  .tritalk-explainer {
    margin: 1.6rem 0;
  }

  .tritalk-explainer h2 {
    margin-top: 0;
  }

  @media (max-width: 820px) {
    .tritalk-hero,
    .tritalk-console {
      grid-template-columns: 1fr;
    }

    .tritalk-hero__copy,
    .tritalk-hero__panel,
    .tritalk-console__controls,
    .tritalk-console__output,
    .tritalk-explainer {
      padding: 1.05rem;
      border-radius: 20px;
    }

    .tritalk-output {
      min-height: 14rem;
    }
  }
</style>

<script type="module" src="/assets/js/tritalk-gpt-demo.js"></script>
