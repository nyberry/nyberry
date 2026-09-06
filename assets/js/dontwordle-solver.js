const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ALL_MASK = (1 << 26) - 1;

const form = document.getElementById("dontwordle-form");
const answerInput = document.getElementById("dontwordle-answer");
const beamInput = document.getElementById("dontwordle-beam");
const statusEl = document.getElementById("dontwordle-status");
const resultEl = document.getElementById("dontwordle-result");
const sequenceEl = document.getElementById("dontwordle-sequence");
const summaryEl = document.getElementById("dontwordle-summary");
const remainingEl = document.getElementById("dontwordle-remaining");
const submitButton = form.querySelector("button[type='submit']");

let wordListPromise;

function bit(letter) {
  return 1 << (letter.charCodeAt(0) - 97);
}

function wordMask(word) {
  let mask = 0;
  for (const letter of word) mask |= bit(letter);
  return mask;
}

function countLetters(word) {
  const counts = Array(26).fill(0);
  for (const letter of word) counts[letter.charCodeAt(0) - 97] += 1;
  return counts;
}

function maskText(mask) {
  return ALPHABET.split("").filter((letter) => mask & bit(letter)).join("");
}

function wordleFeedback(guess, answer) {
  const result = Array(5).fill("B");
  const remaining = {};

  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === answer[i]) {
      result[i] = "G";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (result[i] === "G") continue;
    const letter = guess[i];
    if ((remaining[letter] || 0) > 0) {
      result[i] = "Y";
      remaining[letter] -= 1;
    }
  }

  return result.join("");
}

function compileFeedback(guess, feedback) {
  const minCounts = Array(26).fill(0);
  const maxCounts = Array(26).fill(5);
  const hasGrey = Array(26).fill(false);
  const greens = Array(5).fill(null);
  const forbiddenByPos = Array(5).fill(0);
  let requiredMask = 0;
  let absentMask = 0;

  for (let i = 0; i < 5; i += 1) {
    const idx = guess.charCodeAt(i) - 97;
    const mark = feedback[i];
    if (mark === "G") {
      greens[i] = guess[i];
      minCounts[idx] += 1;
      requiredMask |= bit(guess[i]);
    } else if (mark === "Y") {
      minCounts[idx] += 1;
      requiredMask |= bit(guess[i]);
      forbiddenByPos[i] |= bit(guess[i]);
    } else {
      hasGrey[idx] = true;
    }
  }

  for (let i = 0; i < 26; i += 1) {
    if (hasGrey[i]) {
      maxCounts[i] = minCounts[i];
      if (minCounts[i] === 0) absentMask |= 1 << i;
    }
  }

  return { guess, feedback, minCounts, maxCounts, greens, forbiddenByPos, requiredMask, absentMask };
}

function obeysCompiled(word, counts, mask, row) {
  if ((mask & row.absentMask) !== 0) return false;
  if ((mask & row.requiredMask) !== row.requiredMask) return false;

  for (let i = 0; i < 26; i += 1) {
    if (counts[i] < row.minCounts[i] || counts[i] > row.maxCounts[i]) return false;
  }

  for (let i = 0; i < 5; i += 1) {
    if (row.greens[i] !== null && word[i] !== row.greens[i]) return false;
    if ((row.forbiddenByPos[i] & bit(word[i])) !== 0) return false;
  }

  return true;
}

async function loadWords() {
  if (!wordListPromise) {
    wordListPromise = fetch("/assets/data/wordle-valid-guesses.txt")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the word list.");
        return response.text();
      })
      .then((text) => text.split(/\s+/).map((word) => word.trim().toLowerCase()).filter(Boolean));
  }
  return wordListPromise;
}

function possibleWords(words, rows) {
  return words.filter((entry) => rows.every((row) => obeysCompiled(entry.word, entry.counts, entry.mask, row)));
}

function candidateCanPrepend(candidate, state, answer) {
  if (candidate.word === answer) return false;

  for (const future of state.path) {
    if (!obeysCompiled(future.word, future.counts, future.mask, candidate.row)) return false;
  }

  return true;
}

function stateRank(state) {
  const unusedLetters = 26 - state.usedMask.toString(2).replaceAll("0", "").length;
  return unusedLetters * 100000 + state.path.length * 1000;
}

function scoreState(state, words) {
  const rows = state.path.map((entry) => entry.row);
  const remaining = possibleWords(words, rows).map((entry) => entry.word);
  const unusedMask = ALL_MASK & ~state.usedMask;
  const unusedLetters = maskText(unusedMask);
  return {
    path: state.path,
    feedback: rows.map((row) => row.feedback),
    unusedLetters,
    remaining,
    score: unusedLetters.length * remaining.length,
  };
}

function optimize(answer, wordEntries, beam) {
  const candidates = wordEntries.map((entry) => ({
    ...entry,
    row: compileFeedback(entry.word, wordleFeedback(entry.word, answer)),
  }));

  let frontier = [{ path: [], usedMask: 0 }];

  for (let turn = 0; turn < 6; turn += 1) {
    const next = [];

    for (const state of frontier) {
      for (const candidate of candidates) {
        if (!candidateCanPrepend(candidate, state, answer)) continue;
        next.push({
          path: [candidate, ...state.path],
          usedMask: state.usedMask | candidate.mask,
        });
      }
    }

    if (next.length === 0) break;
    next.sort((a, b) => stateRank(b) - stateRank(a));
    frontier = next.slice(0, beam);
  }

  if (!frontier.length || frontier[0].path.length !== 6) return null;

  let best = null;
  for (const state of frontier) {
    const scored = scoreState(state, wordEntries);
    if (!best || scored.score > best.score) best = scored;
  }
  return best;
}

function tileClass(mark) {
  if (mark === "G") return "tile-green";
  if (mark === "Y") return "tile-yellow";
  return "tile-grey";
}

function renderResult(result) {
  sequenceEl.innerHTML = "";
  result.path.forEach((entry, rowIndex) => {
    const row = document.createElement("div");
    row.className = "dontwordle-row";

    for (let i = 0; i < 5; i += 1) {
      const tile = document.createElement("span");
      tile.className = `dontwordle-tile ${tileClass(result.feedback[rowIndex][i])}`;
      tile.textContent = entry.word[i].toUpperCase();
      row.appendChild(tile);
    }

    const word = document.createElement("strong");
    word.textContent = entry.word.toUpperCase();
    row.appendChild(word);
    sequenceEl.appendChild(row);
  });

  summaryEl.innerHTML = `
    <strong>${result.remaining.length}</strong> possible words remaining
    x <strong>${result.unusedLetters.length}</strong> unused letters
    = <strong>${result.score}</strong>
  `;
  remainingEl.textContent = result.remaining.join(", ");
  resultEl.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resultEl.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = "Searching...";

  const answer = answerInput.value.trim().toLowerCase();
  const beam = Number.parseInt(beamInput.value, 10);

  if (!/^[a-z]{5}$/.test(answer)) {
    statusEl.textContent = "Please enter a five-letter word.";
    submitButton.disabled = false;
    submitButton.textContent = "Find Sequence";
    return;
  }

  statusEl.textContent = "Loading word list...";

  try {
    const words = await loadWords();
    if (!words.includes(answer)) {
      statusEl.textContent = "That word is not in the Wordle word list.";
      submitButton.disabled = false;
      submitButton.textContent = "Find Sequence";
      return;
    }

    const entries = words.map((word) => ({ word, mask: wordMask(word), counts: countLetters(word) }));
    statusEl.textContent = "Searching. Higher depths can take a few seconds.";

    requestAnimationFrame(() => {
      try {
        const result = optimize(answer, entries, beam);
        if (!result) {
          statusEl.textContent = "No six-guess sequence found with this search effort.";
          return;
        }
        statusEl.textContent = "Best sequence found:";
        renderResult(result);
      } catch (error) {
        statusEl.textContent = error.message || "Something went wrong.";
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Find Sequence";
      }
    });
  } catch (error) {
    statusEl.textContent = error.message || "Something went wrong.";
    submitButton.disabled = false;
    submitButton.textContent = "Find Sequence";
  }
});
