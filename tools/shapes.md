---
layout: layout.html
title: Shape Classifier
description: Draw a triangle, circle, or square on a 26 x 26 grid and let a tiny browser neural net guess the shape.
image: /assets/images/shapes-tool.svg
date: 2026-04-06
---

<h2>Shape Classifier</h2>

<p>
  Draw a rough shape on the 26 x 26 grid below and the browser will classify it as a
  <strong>triangle</strong>, <strong>circle</strong>, or <strong>square</strong>.
  The model is trained on synthetic examples and runs entirely in JavaScript.
</p>

<div class="shape-tool">
  <section class="shape-panel">
    <div class="shape-toolbar" role="toolbar" aria-label="Drawing controls">
      <button type="button" class="shape-mode-btn active" data-mode="draw">Draw</button>
      <button type="button" class="shape-mode-btn" data-mode="erase">Erase</button>
      <label class="shape-brush">
        Brush
        <input id="shape-brush-size" type="range" min="1" max="3" value="2">
      </label>
    </div>

    <canvas
      id="shape-grid"
      class="shape-canvas"
      width="26"
      height="26"
      aria-label="26 by 26 pixel drawing grid"
    ></canvas>

    <div class="shape-actions">
      <button type="button" id="shape-classify-btn">Classify drawing</button>
      <button type="button" id="shape-clear-btn">Clear</button>
    </div>

    <div class="shape-actions">
      <button type="button" class="shape-stamp-btn" data-shape="circle">Stamp circle</button>
      <button type="button" class="shape-stamp-btn" data-shape="square">Stamp square</button>
      <button type="button" class="shape-stamp-btn" data-shape="triangle">Stamp triangle</button>
    </div>
  </section>

  <section class="shape-panel">
    <h3>Prediction</h3>
    <p id="shape-status" class="shape-status">Loading model...</p>
    <p id="shape-prediction" class="shape-prediction">Waiting for a drawing.</p>

    <ul id="shape-probabilities" class="shape-probabilities"></ul>

    <h3>Normalized Preview</h3>
    <canvas
      id="shape-preview"
      class="shape-preview"
      width="26"
      height="26"
      aria-label="Normalized preview of the drawing"
    ></canvas>
    <p class="footnote">
      Before classifying, the script crops the shape, rescales it, and centers it to make rough sketches more forgiving.
    </p>
  </section>
</div>

<hr>

### How this works

This is a deliberately tiny toy model: a multilayer perceptron with hidden layers, trained on procedurally generated triangles, circles, and squares.

That means it is fully client-side, easy to inspect, and fast to run.

It also means it can still be fooled by very unusual doodles, partial shapes, or heavy scribbling.

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

  .shape-brush {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
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
    margin-bottom: 0.5rem;
  }

  .shape-mode-btn.active {
    background: #1f5f46;
    color: #fff;
  }

  .shape-status,
  .shape-prediction {
    min-height: 1.5rem;
  }

  .shape-prediction {
    font-size: 1.15rem;
    font-weight: 600;
  }

  .shape-probabilities {
    list-style: none;
    padding: 0;
    margin: 0 0 1.25rem;
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

<script type="module" src="/assets/js/shapes-tool.js"></script>
