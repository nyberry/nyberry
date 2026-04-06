---
layout: layout.html
title: Pet Dataset Importer
description: Import black and white cat and mouse line drawings, convert them to normalized 40 x 40 examples, and export JSON for training.
date: 2026-04-06
excludeFromIndex: true
---

<h2>Pet Dataset Importer</h2>

<p>
  Use this page locally to turn chosen black and white cat and mouse line drawings into
  normalized <strong>40 x 40</strong> training examples for the pet classifier.
</p>

<div class="importer-grid">
  <section class="importer-panel">
    <div class="importer-controls">
      <label class="importer-field">
        Label
        <select id="import-label">
          <option value="cat">Cat</option>
          <option value="mouse">Mouse</option>
        </select>
      </label>

      <label class="importer-field">
        Threshold
        <input id="import-threshold" type="range" min="20" max="235" value="170">
      </label>

      <p id="import-threshold-value" class="importer-note">Threshold: 170</p>

      <label class="importer-check">
        <input id="import-invert" type="checkbox">
        Invert light and dark
      </label>

      <label class="importer-file">
        Choose images
        <input id="import-files" type="file" accept="image/*" multiple>
      </label>

      <div class="importer-actions">
        <button type="button" id="import-run-btn">Import selected images</button>
        <button type="button" id="import-export-btn">Download examples.json</button>
        <button type="button" id="import-clear-btn">Clear dataset</button>
      </div>
    </div>

    <p id="import-status" class="importer-status">No images imported yet.</p>
    <p id="import-counts" class="importer-note">Cats: 0. Mice: 0. Total: 0.</p>
  </section>

  <section class="importer-panel">
    <h3>Processed previews</h3>
    <p class="importer-note">
      Each preview below shows the normalized 40 x 40 version that will be exported for training.
    </p>
    <div id="import-preview-list" class="importer-preview-list"></div>
  </section>
</div>

<hr>

### Suggested workflow

Start by importing a small batch of cat drawings, then a small batch of mouse drawings. Keep only simple black and white line drawings with one animal per image and little or no text. If a batch looks wrong, adjust the threshold or the invert checkbox and import again.

When you have enough examples, download `examples.json` and place it at `scripts/pets-data/examples.json`. Then run `npm run train:pets`.

<style>
  .importer-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin: 1.5rem 0;
  }

  .importer-panel {
    background: #f7f7f5;
    border: 1px solid #ddd;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  }

  .importer-controls {
    display: grid;
    gap: 0.9rem;
  }

  .importer-field,
  .importer-file {
    display: grid;
    gap: 0.35rem;
    text-align: left;
  }

  .importer-check {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6rem;
  }

  .importer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    justify-content: center;
  }

  .importer-status {
    min-height: 1.5rem;
    font-weight: 600;
  }

  .importer-note {
    color: #5a554b;
    font-size: 0.95rem;
  }

  .importer-preview-list {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }

  .importer-card {
    background: #fffdf8;
    border: 1px solid #ddd6c7;
    border-radius: 12px;
    padding: 0.8rem;
  }

  .importer-card canvas {
    width: 100%;
    aspect-ratio: 1;
    display: block;
    margin: 0 auto 0.5rem;
    border: 1px solid #d4d0c8;
    border-radius: 8px;
    background: #fffdf8;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .importer-card p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    word-break: break-word;
  }

  @media (max-width: 640px) {
    .importer-actions {
      justify-content: stretch;
    }

    .importer-actions button {
      width: 100%;
    }
  }
</style>

<script type="module" src="/assets/js/pets-importer.js"></script>
