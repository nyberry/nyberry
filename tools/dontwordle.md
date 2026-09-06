---
layout: layout.html
title: Don't Wordle Optimiser
description: Enter a known Don't Wordle answer and search for a high-scoring six-guess sequence.
image: /assets/images/dontwordle-optimiser.png
date: 2026-09-06
---

<h2>Don't Wordle Optimiser</h2>

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
  <h3>How the optimiser works</h3>

  <p>
    The optimiser runs a client-side bounded beam search over legal Don't Wordle
    trajectories, parameterised by a known target word. The search space is the
    set of six-word sequences drawn from the 12,972 valid Wordle guess words,
    with the additional constraint that the target word itself is never guessed.
  </p>

  <h4>1. Candidate representation</h4>
  <p>
    Each candidate guess is precompiled against the target into a compact
    constraint object. This contains the Wordle feedback vector over
    {green, yellow, grey}, a bitmask of the unique letters used, fixed-position
    green constraints, per-position yellow exclusions, per-letter lower bounds
    from green and yellow multiplicity, and per-letter upper bounds induced by
    grey duplicate tiles.
  </p>
  <p>
    For example, if the target is FABLE and the guess is AYAYA, the feedback is
    yellow-grey-grey-grey-grey. This implies a lower bound of one A and an upper
    bound of one A. Later guesses may therefore contain exactly one A, not zero
    and not two or more.
  </p>

  <h4>2. Legal-transition test</h4>
  <p>
    A sequence is legal only if every later guess satisfies every constraint
    implied by every earlier row. Greens fix absolute positions. Yellows require
    the letter to recur while excluding the original position. Greys impose
    upper bounds: a fully grey letter has maximum count zero, while a grey copy
    of a duplicated letter caps the count at the number of non-grey copies seen
    in that row.
  </p>

  <h4>3. Reverse search</h4>
  <p>
    The optimiser searches backwards. A partial state is a legal suffix of the
    final six guesses. To prepend a candidate guess, the algorithm checks whether
    all words already in the suffix satisfy the constraints created by that
    candidate's feedback. If not, the candidate cannot have appeared earlier and
    the branch is discarded.
  </p>
  <p>
    This is useful because an early guess constrains all later guesses. Working
    backwards allows the optimiser to reject incompatible prefixes before they
    are expanded into full six-row trajectories.
  </p>

  <h4>4. Beam approximation</h4>
  <p>
    Exhaustive enumeration of the complete legal tree is usually too expensive
    for an interactive browser page. Instead, the optimiser uses beam search.
    After each expansion step it ranks partial suffixes with a heuristic and
    retains only the best N states, where N is the value in the Search effort
    box.
  </p>
  <p>
    The heuristic combines both terms in the final objective: it strongly prefers
    states that conserve alphabet letters, while also favouring states that leave
    a larger current set of possible remaining words.
  </p>
  <p>
    Search effort is therefore a beam width, not a depth parameter. Increasing
    it explores more of the search tree and may improve the returned sequence,
    but it increases runtime. Because branches outside the beam are discarded,
    the browser version reports the best sequence found within the selected beam
    rather than a proof of global optimality.
  </p>

  <h4>5. Terminal scoring</h4>
  <p>
    Complete six-guess paths are scored exactly. The score is:
  </p>
  <p class="dontwordle-formula">
    |alphabet \ used_letters(path)| x |{w in W : w satisfies all six feedback rows}|
  </p>
  <p>
    Here W is the 12,972-word valid-guess set. The first factor rewards
    conserving alphabet letters across the six guesses. The second factor rewards
    preserving ambiguity: it counts how many words remain consistent with the
    accumulated constraint system after row 6. Computationally, the task is a
    constrained combinatorial optimisation problem over W^6, approximated here
    by reverse beam search with exact evaluation of retained terminal states.
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
    max-width: 620px;
    margin: 0.75rem auto;
    padding: 0.75rem;
    border: 1px solid #cbd5d9;
    border-radius: 6px;
    background: #f7fafb;
    text-align: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.95rem;
    overflow-wrap: anywhere;
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
