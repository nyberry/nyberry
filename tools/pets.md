---
layout: layout.html
title: Pet Classifier
description: Draw a cat or a degu and let a tiny browser neural net classify it as Milo or Tao.
image: /assets/images/catordegu.jpg
date: 2026-04-06
---

<h2>Milo or Tao?</h2>

<p>
  Draw a <strong>cat</strong> or <strong>degu</strong> on the grid below.
</p>

<div class="shape-tool">
  <section class="shape-panel">
    <div class="shape-toolbar" role="toolbar" aria-label="Drawing controls">
      <label class="shape-brush">
        Brush
        <input id="shape-brush-size" type="range" min="1" max="3" value="2">
      </label>
      <button type="button" id="shape-clear-btn">Clear</button>
    </div>

    <canvas
      id="shape-grid"
      class="shape-canvas"
      width="40"
      height="40"
      aria-label="40 by 40 pixel drawing grid"
    ></canvas>
  </section>

  <section class="shape-panel">
    <div class="shape-actions">
      <button type="button" id="shape-classify-btn">Classify</button>
    </div>
    <p id="shape-prediction" class="shape-prediction" hidden></p>

    <ul id="shape-probabilities" class="shape-probabilities" hidden></ul>

    <canvas
      id="shape-preview"
      class="shape-preview"
      width="40"
      height="40"
      aria-label="Normalized preview of the drawing"
    ></canvas>
  </section>
</div>

<hr>

### How this works

This uses the same browser-only UI as the shapes tool, but with two animal classes instead of geometric shapes.

The current model is a bootstrap model trained on simple synthetic full-body cartoon cats and mouse-like degus.

<style>
  .shape-tool {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin: 1.5rem 0;
  }

  .shape-panel {
    background: #f7f7f5;
    border: 1px solid #ddd;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  }

  .shape-toolbar,
  .shape-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .shape-actions {
    justify-content: center;
  }

  .shape-brush {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  #shape-clear-btn {
    margin-left: auto;
  }

  .shape-canvas,
  .shape-preview {
    width: min(100%, 320px);
    aspect-ratio: 1;
    display: block;
    margin: 0 auto 1rem;
    border-radius: 12px;
    border: 1px solid #d4d0c8;
    background: #fffdf8;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    touch-action: none;
  }

  .shape-preview {
    width: min(100%, 180px);
    margin-bottom: 0;
  }

  .shape-prediction {
    min-height: 1.5rem;
    font-size: 1.15rem;
    font-weight: 600;
  }

  .shape-probabilities {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  .shape-probabilities li {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e5e0d6;
    padding: 0.4rem 0;
    gap: 1rem;
  }

  @media (max-width: 640px) {
    .shape-toolbar,
    .shape-actions {
      gap: 0.5rem;
    }

    .shape-panel {
      padding: 0.9rem;
    }
  }
</style>

<script type="module" src="/assets/js/pets-tool.js"></script>
