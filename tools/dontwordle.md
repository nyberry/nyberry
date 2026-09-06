---
layout: layout.html
title: Don't Wordle Solver
description: Enter a known Don't Wordle answer and search for a high-scoring six-guess sequence.
image: /assets/images/toolbox.png
date: 2026-09-06
---

<h2>Don't Wordle Solver</h2>

<form id="dontwordle-form" class="dontwordle-form">
  <label for="dontwordle-answer">Enter known answer</label>
  <input id="dontwordle-answer" type="text" inputmode="latin" autocomplete="off" maxlength="5" pattern="[A-Za-z]{5}" placeholder="fable" required>

  <label for="dontwordle-beam">Search effort</label>
  <input id="dontwordle-beam" type="number" min="10" max="100" step="10" value="20">

  <button type="submit">Find Sequence</button>
</form>

<p id="dontwordle-status" class="dontwordle-status" aria-live="polite"></p>

<section id="dontwordle-result" class="dontwordle-result" hidden>
  <div id="dontwordle-sequence" class="dontwordle-sequence"></div>
  <p id="dontwordle-summary" class="dontwordle-summary"></p>
  <details class="dontwordle-details">
    <summary>Remaining possible words</summary>
    <p id="dontwordle-remaining"></p>
  </details>
</section>

<hr>

<section class="dontwordle-explainer">
  <h3>How the solver works</h3>

  <p>
    The aim of Don't Wordle is not to guess the answer. Instead, this tool tries
    to find six legal guesses that leave a high final score.
  </p>

  <h4>1. It starts with the answer</h4>
  <p>
    You type in the known answer, for example FABLE. The solver
    then tests possible guesses against that answer, just as the real game would.
    It uses the 12,972 valid Wordle guess words.
  </p>

  <h4>2. It works out the coloured feedback</h4>
  <p>
    For each guess, the solver calculates the Wordle-style tiles:
  </p>
  <ul>
    <li>Green: right letter, right position.</li>
    <li>Yellow: right letter, wrong position.</li>
    <li>Grey: this copy of the letter is not in the answer.</li>
  </ul>
  <p>
    Duplicate letters matter. If the answer is FABLE and the guess is AYAYA,
    the feedback is yellow-grey-grey-grey-grey. That means there is one A in the
    answer, but not three. Future guesses are therefore only allowed to use one
    A.
  </p>

  <h4>3. It keeps only legal future guesses</h4>
  <p>
    Don't Wordle uses hard-mode-style rules. After each row, future guesses must
    obey the information already revealed. For example, if a letter is green, it
    must stay in that position. If a letter is yellow, it must be used again, but
    not in the same position. If a grey tile proves that a letter is absent, that
    letter cannot be used again.
  </p>

  <h4>4. It searches backwards</h4>
  <p>
    A simple program could try every possible sequence from row 1 to row 6, but
    there are far too many combinations. So this solver builds possible endings
    first and works backwards. In other words, it asks: "Could this word have
    come before the guesses I already have?"
  </p>
  <p>
    This helps because an earlier guess creates rules that all later guesses must
    follow. If an earlier guess would make a later word illegal, that path is
    rejected immediately.
  </p>

  <h4>5. It uses beam search</h4>
  <p>
    The box labelled Search effort controls the size of the beam. A beam is the
    shortlist of partly-built sequences that the solver keeps at each stage.
    Imagine trying to find a route through a maze, but only keeping your best 20
    possible routes after each junction instead of keeping every single route.
  </p>
  <p>
    If Search effort is set to 20, the solver keeps 20 promising routes after
    each step. If it is set to 100, it keeps 100. A larger beam means the solver
    checks more possibilities and may find a better sequence, but it will take
    longer. A smaller beam is faster, but it may throw away a route that would
    have become better later.
  </p>
  <p>
    This is not the same as checking every legal route. It is a controlled
    shortcut so the tool can run in an ordinary web browser.
  </p>

  <h4>6. It scores the final row</h4>
  <p>
    After six guesses, the score is:
  </p>
  <p class="dontwordle-formula">
    unused letters x possible words remaining
  </p>
  <p>
    Unused letters means letters of the alphabet that did not appear in any of
    the six guesses. Possible words remaining means words from the Wordle list
    that still match all the green, yellow, grey, and duplicate-letter clues
    after row 6.
  </p>
  <p>
    For example, if there are 13 unused letters and 3 possible words remaining,
    the final score is 13 x 3 = 39.
  </p>

  <h4>7. Why it says "best found"</h4>
  <p>
    This browser version does not prove that it has found the perfect answer. It
    reports the best sequence it found within the chosen search effort. To prove a
    true optimum, the program would need to check every legal route, which can be
    much slower.
  </p>
</section>

<style>
  .dontwordle-form {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(0, 1fr);
    max-width: 360px;
    margin: 1.5rem auto;
    text-align: left;
  }

  .dontwordle-form label {
    font-weight: 700;
    color: #14313f;
  }

  .dontwordle-form input {
    width: 100%;
    max-width: none;
    border: 1px solid #a9b4ba;
    border-radius: 6px;
    padding: 0.55rem 0.65rem;
    background: #fff;
    color: #111;
  }

  #dontwordle-answer {
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .dontwordle-status {
    min-height: 1.5rem;
    font-weight: 700;
    color: #14313f;
  }

  .dontwordle-result {
    max-width: 540px;
    margin: 1.5rem auto;
    padding: 1rem;
    border: 1px solid #cbd5d9;
    border-radius: 8px;
    background: #f7fafb;
    text-align: left;
  }

  .dontwordle-sequence {
    display: grid;
    gap: 0.5rem;
  }

  .dontwordle-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .dontwordle-row strong {
    margin-left: 0.5rem;
    color: #14313f;
    letter-spacing: 0.04em;
  }

  .dontwordle-tile {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 4px;
    color: #fff;
    font-weight: 800;
    font-size: 1rem;
  }

  .tile-grey {
    background: #787c7e;
  }

  .tile-yellow {
    background: #c9b458;
  }

  .tile-green {
    background: #6aaa64;
  }

  .dontwordle-summary {
    margin: 1rem 0;
    padding: 0.75rem;
    border-radius: 6px;
    background: #e8f0f4;
    text-align: center;
  }

  .dontwordle-details {
    overflow-wrap: anywhere;
    line-height: 1.45;
  }

  .dontwordle-explainer {
    max-width: 680px;
    margin: 1.5rem auto 0;
    text-align: left;
    line-height: 1.55;
  }

  .dontwordle-explainer h3,
  .dontwordle-explainer h4 {
    color: #14313f;
  }

  .dontwordle-explainer h4 {
    margin-bottom: 0.25rem;
  }

  .dontwordle-explainer ul {
    padding-left: 1.25rem;
  }

  .dontwordle-formula {
    max-width: 360px;
    margin: 0.75rem auto;
    padding: 0.75rem;
    border: 1px solid #cbd5d9;
    border-radius: 6px;
    background: #f7fafb;
    text-align: center;
    font-weight: 800;
  }

  @media (max-width: 520px) {
    .dontwordle-result {
      padding: 0.75rem;
    }

    .dontwordle-tile {
      width: 1.65rem;
      height: 1.65rem;
      font-size: 0.85rem;
    }
  }
</style>

<script type="module" src="/assets/js/dontwordle-solver.js"></script>
