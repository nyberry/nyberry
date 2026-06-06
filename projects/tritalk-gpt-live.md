---
layout: layout.html
title: TriTalk miniGPT Live
description: A larger server-backed TriTalk language model embedded from Hugging Face Spaces, while the original browser-only demo stays intact.
image: /assets/images/tritalk-gpt-live-tile.svg
date: 2026-06-06
---

<section class="tritalk-live-hero">
  <div class="tritalk-live-hero__copy">
    <p class="tritalk-live-kicker">Hosted model</p>
    <h1>TriTalk miniGPT Live</h1>
    <p class="tritalk-live-lede">
      This version uses the stronger <code>v0.2.2</code> model and runs through a hosted
      Hugging Face Space rather than inside your browser. The page here on
      <code>nyberrysite</code> stays the front door; the model itself lives behind the scenes.
    </p>
    <p class="tritalk-live-note">
      It is still experimental, but it has a wider embedding size, a longer context window,
      and a better validation loss than the original browser demo.
    </p>

    <div class="tritalk-live-links">
      <a class="tritalk-live-button" href="/projects/tritalk-gpt">Open the original browser-only version</a>
      <a class="tritalk-live-button tritalk-live-button--ghost" href="https://huggingface.co/spaces/nyberry/TriTalk_miniGPT">Open the Hugging Face Space directly</a>
    </div>
  </div>

  <div class="tritalk-live-hero__panel">
    <p class="tritalk-live-panel-label">Model snapshot</p>
    <p class="tritalk-live-meta">
      6,093 subword tokens • 8 layers • 320 embedding width • 53.7 MB weights
    </p>
    <p class="tritalk-live-status">
      Best validation loss so far: <strong>4.254</strong>. This is the hosted <code>v0.2.2</code> checkpoint.
    </p>
  </div>
</section>

<section class="tritalk-live-embed">
  <div class="tritalk-live-embed__frame">
    <iframe
      src="https://nyberry-tritalk-minigpt.hf.space"
      title="TriTalk miniGPT Live"
      loading="lazy"
      allow="clipboard-write"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
</section>

<section class="tritalk-live-explainer">
  <h2>What changed?</h2>
  <p>
    The original page is a browser-only toy model. This version keeps the page on
    <code>nyberrysite</code> but embeds a stronger hosted model from Hugging Face Spaces.
    That makes it possible to serve a larger checkpoint without shipping the entire model
    into the visitor's browser.
  </p>
  <p>
    The tradeoff is that generation now depends on the hosted Space being available, but the
    quality is slightly better and the model can keep a bit more context.
  </p>

  <h2>Why keep both?</h2>
  <p>
    The browser-only version is still a neat technical demo and has no backend dependency.
    The live version is closer to how a public-facing language model would actually be delivered.
  </p>
</section>

<style>
  .tritalk-live-hero,
  .tritalk-live-embed {
    display: grid;
    gap: 1.4rem;
    margin: 1.6rem 0;
  }

  .tritalk-live-hero {
    grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.95fr);
    align-items: stretch;
  }

  .tritalk-live-hero__copy,
  .tritalk-live-hero__panel,
  .tritalk-live-embed__frame,
  .tritalk-live-explainer {
    border: 1px solid rgba(51, 76, 85, 0.16);
    border-radius: 24px;
    box-shadow: 0 18px 48px rgba(38, 57, 63, 0.08);
  }

  .tritalk-live-hero__copy {
    background:
      radial-gradient(circle at top left, rgba(161, 225, 207, 0.55), transparent 34%),
      linear-gradient(145deg, #f5f7f0, #fffdf7 55%, #edf4ff);
    padding: 1.8rem;
  }

  .tritalk-live-hero__panel,
  .tritalk-live-embed__frame,
  .tritalk-live-explainer {
    background: #fffdf9;
    padding: 1.35rem;
  }

  .tritalk-live-kicker,
  .tritalk-live-panel-label {
    margin: 0 0 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.76rem;
    color: #627167;
  }

  .tritalk-live-lede,
  .tritalk-live-note,
  .tritalk-live-meta,
  .tritalk-live-status,
  .tritalk-live-explainer p {
    font-size: 1rem;
    line-height: 1.65;
  }

  .tritalk-live-status {
    margin-bottom: 0;
    padding: 0.85rem 1rem;
    border-radius: 16px;
    background: #e8f3ec;
    color: #285641;
  }

  .tritalk-live-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-top: 1.4rem;
  }

  .tritalk-live-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.8rem 1.05rem;
    border-radius: 999px;
    background: linear-gradient(135deg, #26768a, #2f8f7f);
    color: #fff;
    text-decoration: none;
    box-shadow: 0 14px 24px rgba(34, 102, 108, 0.22);
  }

  .tritalk-live-button--ghost {
    background: #ece6da;
    color: #564f43;
    box-shadow: none;
  }

  .tritalk-live-embed__frame {
    padding: 0.75rem;
  }

  .tritalk-live-embed iframe {
    width: 100%;
    min-height: 980px;
    border: 0;
    border-radius: 18px;
    background: #fff;
  }

  .tritalk-live-explainer h2 {
    margin-top: 0;
  }

  .tritalk-live-explainer h2:not(:first-child) {
    margin-top: 2rem;
  }

  @media (max-width: 920px) {
    .tritalk-live-hero {
      grid-template-columns: 1fr;
    }

    .tritalk-live-embed iframe {
      min-height: 1120px;
    }
  }
</style>
