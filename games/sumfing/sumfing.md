---
title: Sumfing
description: A simple yet challenging number game. Can you arrange the tiles to solve the sum? Nothing to do with medicine.
image: /games/sumfing/assets/images/demoImage.png
date: 2024-06-01
order: 400
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/games/sumfing/assets/css/sumfing.css">
</head>

<body>
 <main class="main-container">
    <div class="game-container">
      <div class = "info-button-container"><div class="info-icon" id="info-icon">ℹ️</div></div>
      <div class = "mute-button-container"><div class="mute-icon" id="mute-icon" aria-label="Toggle sound" tabindex="0" role="button">🔈</div></div>
      <div class = "sumfing-title" id="headline">Sumfing</div>
      <div class = "footnote" id="date"></div>
      <div class = "degu-trophy" id="degu-trophy"><img src = "/games/sumfing/assets/images/degutrophy.png"></div>
      <!-- Gameplay elements -->
      <div id = "gameplay-elements">
        <div class="box-container" id="box-container"></div>
        <div class="sumfing-target" id="target-display"></div>
        <div class="sumfing-feedback" id="feedback"></div>
        <div class="tile-container" id="num-tiles"></div>
        <div class="tile-container" id="op-tiles"></div>
        <div class="tile-container" id="extra-op-tiles" style="display: none;"></div>
        <div id="extra-op-info" class="footnote" style="display: none; text-align: center;">
            <a href="#" onclick="showModal(operatorsHTML, 'operators'); return false;">What are these?</a>
        </div>
        <button id="next-button">Next</button>
        <button id="hint1-button">Hint?</button>
        <button id="hint2-button">Another hint?</button>
        <button id="reveal-button">Show answer</button>
      </div>
      <!-- Completion elements (initially hidden) -->
      <div id="completion-elements" style="display: none;"> 
        <ul id="clue-summary">
            <li><span id="clue-easy"></span></li>
            <li><span id="clue-medium"></span></li>
            <li><span id="clue-hard"></span></li>
            <li><span id="clue-extra"></span></li>
        </ul>
        <div id="streak"></div>
        <div class="button-row">
          <button id="share-button">Share</button>
          <button id="admire-button">Admire</button>
        </div>
        <div class="footnote"><p id="countdown-message"></p></div>
      </div>
    </div>
    <!-- Shared Modal template -->
    <div id="shared-modal" class="sumfing-modal-overlay" style="display: none;">
      <div class="sumfing-modal-content">
        <div class="sumfing-modal-header">
          <div class="sumfing-modal-close" id="shared-modal-close">×</div>
        </div>
        <div id="shared-modal-body"></div>
      </div>
    </div>
    <!-- Audio -->
    <audio id="chimes" src="/games/sumfing/assets/audio/chime.mp3"></audio>
    <audio id="nope" src="/games/sumfing/assets/audio/nope.mp3"></audio>
    <audio id="fanfare" src="/games/sumfing/assets/audio/fanfare.mp3"></audio>
 </main>

<script src="/games/sumfing/assets/js/modals.js" defer></script>
<script src="/games/sumfing/assets/js/audio.js" defer></script>

<script>

// global variables //
let modalContext = 'welcome';
let progress;
let currentPuzzle;
let selectedTiles = [];
let unsolved = true;
let expressions = [];
let hint_level = 0;
let hint_answer = [];
let hintTimeoutId = null;
let revealTimeoutId = null;
let audioCtx = null;

const standardDelay = 5000;
const STAGES = ['Easy', 'Medium', 'Hard', 'Extra'];
const today = getLocalDateString();
const dayNumber = getSumfingDayNumber(today);


// main function on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {

  ensureAudioContext();
  document.getElementById('date').textContent = `${today}`;

  const storageKey = 'sumfing_progress';
  const saved = JSON.parse(localStorage.getItem(storageKey));   // retrieve any stored progress from today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayYyyymmdd = yesterday.toISOString().slice(0,10);  

  if (saved?.date === today) {
    progress = saved;
    console.log('progress (in browser localStorage):', progress);
  } else {
    const streak = (saved?.lastPlayed === yesterdayYyyymmdd && saved?.stage === 'Completed')
      ? (saved?.streak || 0) + 1
      : 1;

    progress = {
      date: today,
      stage: 'Easy',
      clues: { Easy: 0, Medium: 0, Hard: 0, Extra: 0 },
      streak,
      lastPlayed: today
    };
    saveProgress(); 
    console.log('No data in local storage, progress initialised to:', progress);
    }

  // Show welcome modal only if not completed
  if (progress.stage !== 'Completed') {
    showModal(welcomeHTML, 'welcome');
  }


  fetch('/games/sumfing/assets/puzzles.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      const puzzle = data[today];
      if (puzzle) {
        currentPuzzle = puzzle;
        console.log('Todays puzzle:', puzzle);
        if (progress?.stage === 'Completed') {
            console.log('Puzzle already completed, showing summary...');
            showCompletionPage(); 
            return; 
        }
      } else {
        console.error('No puzzle found for today:', today);
        return;
      }
    })
    .catch(error => {
      console.error('Failed to fetch puzzle:', error);
    });

  addEventListenersOnceOnly();
});



function addEventListenersOnceOnly() {
  const hint1Btn = document.getElementById('hint1-button');
  const hint2Btn = document.getElementById('hint2-button');
  const revealBtn = document.getElementById('reveal-button');
  const nextBtn = document.getElementById('next-button');
  const closeBtn = document.getElementById('shared-modal-close');
  const infoIcon = document.getElementById('info-icon');
  const modal = document.getElementById('shared-modal');

  if (hint1Btn) hint1Btn.addEventListener('click', revealHint1);
  if (hint2Btn) hint2Btn.addEventListener('click', revealHint2);
  if (revealBtn) revealBtn.addEventListener('click', revealAnswer);
  if (nextBtn) nextBtn.addEventListener('click', advanceStage);
  if (closeBtn) closeBtn.addEventListener('click', closeSharedModal);
  if (infoIcon) infoIcon.addEventListener('click', () => showModal(infoHTML, 'info'));

  if (modal) {
    window.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeSharedModal();
      }
    });
  }
}


function showModal(content, context = null) {
  modalContext = context;
  const container = document.getElementById('shared-modal-body');
  container.innerHTML = ''; // clear previous content

  // Insert either raw HTML string or a DOM node
  if (typeof content === 'string') {
    container.innerHTML = content; // for string elements like the info modal
  } else {
    container.appendChild(content); // for DOM elements like the reivew modal
  }

  document.getElementById('shared-modal').style.display = 'flex';

  // Attach play event listener AFTER content is added
  const playButton = document.getElementById('play-button');
  if (playButton) {
    playButton.addEventListener('click', () => {
      document.getElementById('shared-modal').style.display = 'none';
      if (modalContext === 'welcome') {
        startGameAfterModal();
      }
    });
  }
}

function closeSharedModal() {
  const modal = document.getElementById('shared-modal');
  modal.style.display = 'none';
  if (modalContext === 'welcome') {
    startGameAfterModal();
  }
}

// helper function to start game when modal closes //
function startGameAfterModal() {initPuzzleUI(currentPuzzle);}


// Function to initialise puzzle UI
function initPuzzleUI() {

    console.log('initPuzzleUI function called')

    // Clear any pending hint/reveal timeouts from the previous stage
    if (hintTimeoutId) {
        clearTimeout(hintTimeoutId);
        hintTimeoutId = null;
    }
    if (revealTimeoutId) {
        clearTimeout(revealTimeoutId);
        revealTimeoutId = null;
    }
    hint_level = 0;

    const stage = progress.stage;

    if (stage === 'Completed') {
      showCompletionPage();
      return;
    }

    const headline = document.getElementById('headline');
    headline.textContent = `Sumfing ${stage}`;
    tiles=currentPuzzle.Tiles;
    expressions = currentPuzzle[stage][1];
    hint_answer = expressions[0];
    headline.textContent = `Sumfing ${stage}`;
    unsolved = true;
    selectedTiles = [];
    
    document.getElementById('next-button').style.display = 'none';
    renderTiles(tiles, currentPuzzle[stage]);
    bindTileEvents();
    bindBoxEvents();
    showFeedbackDegu("neutral");

    // Delay hint reveal
    setTimeout(() => {
        if (document.getElementById('next-button').style.display === 'none') {
            document.getElementById('hint1-button').style.display = 'block';
        }
    }, standardDelay);  
}


// Function to render the puzzle
function renderTiles(tiles, puzzlestage) {
    const [target, expressions] = puzzlestage;
    console.log(`Rendering stage: ${progress.stage}`)
    document.getElementById('target-display').textContent = `= ${target}`;

    const firstExpression = expressions[0]; // eg. "7-5"

    const boxes = document.getElementById('box-container');
    boxes.innerHTML = '';

    for (let i = 0; i < firstExpression.length; i++) {
        const div = document.createElement('div');
        div.className = 'box';
        div.dataset.index = i;
        boxes.appendChild(div);
    }

    const numTiles = document.getElementById('num-tiles');
    numTiles.innerHTML = '';
    tiles.forEach((num, i) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.value = num;
        tile.dataset.id = `num${i + 1}`;
        tile.textContent = num;
        numTiles.appendChild(tile);
    });

    const opTiles = document.getElementById('op-tiles');
    opTiles.innerHTML = '';
    ['+', '-', '*', '/'].forEach((op, i) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.value = op;
        tile.dataset.id = `op${i + 1}`;
        tile.textContent = { '*': '×', '/': '÷' }[op] || op;
        opTiles.appendChild(tile);
    });

    const extraOpTiles = document.getElementById('extra-op-tiles');
    if (progress.stage === 'Extra') {
        extraOpTiles.style.display = 'flex';
        extraOpTiles.innerHTML = '';
        ['!', '^'].forEach((op, i) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.value = op;
            tile.dataset.id = `ex${i + 1}`;
            tile.textContent = op;
            extraOpTiles.appendChild(tile);
        });
        document.getElementById('extra-op-info').style.display = 'block';
    } else {
        extraOpTiles.style.display = 'none';
        document.getElementById('extra-op-info').style.display = 'none';
    }
}


/* Gameplay functions */



function bindTileEvents() {
    document.querySelectorAll('.tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const emptyBox = [...document.querySelectorAll('.box')].find(b => !b.dataset.value);
            if (emptyBox) {
                emptyBox.textContent = tile.textContent;
                emptyBox.dataset.value = tile.dataset.value;
                emptyBox.dataset.id = tile.dataset.id;
                tile.style.visibility = 'hidden';
                applyTileStyle(tile, emptyBox);
                selectedTiles.push(tile.dataset.value);
                playPlaceSound();
                if (selectedTiles.length === document.querySelectorAll('.box').length) {
                    checkExpression();
                }
            }
        });
    });
}

function bindBoxEvents() {
    document.querySelectorAll('.box').forEach(box => {
        box.addEventListener('click', () => {
            if (box.dataset.value) {
                const tile = [...document.querySelectorAll('.tile')].find(t => t.dataset.id === box.dataset.id);
                if (tile) tile.style.visibility = 'visible';
                selectedTiles.pop();
                playRemoveSound();
                box.textContent = '';
                delete box.dataset.value;
                delete box.dataset.id;
                box.style.backgroundColor = '';
                box.style.color = '';
                if (hint_level >= 1) setLightBackgroundColors();
                if (hint_level === 2) showOperators();
                if (hint_level === 3) showAnswers();
                if (selectedTiles.length < document.querySelectorAll('.box').length) {
                    showFeedbackDegu('neutral');
                    document.getElementById('next-button').style.display = 'none';
                }
            }
        });
    });
}

function checkExpression() {
    const expression = [...document.querySelectorAll('.box')].map(b => b.dataset.value || '').join('');
    if (expressions.includes(expression)) {
        showFeedbackDegu('correct');
        unsolved = false;
        document.getElementById('hint1-button').style.display = 'none';
        document.getElementById('hint2-button').style.display = 'none';
        document.getElementById('reveal-button').style.display = 'none';
        document.getElementById('next-button').style.display = 'block';
        playChimes();
    } else {
        setTimeout(playWrongSound, 500);
        showFeedbackDegu('notQuite');
    }
}

function showFeedbackDegu(feedback) {
  const feedbackDegu = document.getElementById('feedback');
  if (feedback === "neutral") {
    feedbackDegu.innerHTML = `<div class="deguFeedback">
      <img src="/games/sumfing/assets/images/degu.png" style="height: 100%;">
    </div>`;
  }
  else if (feedback === "correct") {
    feedbackDegu.innerHTML = `<div class="deguFeedback">
      <span>Correct ✅</span>
    </div>`;
  }
  else if (feedback === "notQuite") {
    feedbackDegu.innerHTML = `<div class="deguFeedback">
      <span>Not quite...</span>
    </div>`;
  }
}


function applyTileStyle(tile, box) {
    box.style.backgroundColor = getComputedStyle(tile).backgroundColor;
    box.style.color = getComputedStyle(tile).color;
}

function revealHint1() {
    hint_level = 1;
    progress.clues[progress.stage] = Math.max(progress.clues[progress.stage], 1);
    saveProgress();
    clearBoxesAndTiles();
    
    hintTimeoutId = setTimeout(() => {
        if (unsolved) {
          document.getElementById('hint2-button').style.display = 'block';
        }
    }, standardDelay);
}

function revealHint2() {
    hint_level = 2;
    progress.clues[progress.stage] = Math.max(progress.clues[progress.stage], 2);
    saveProgress();
    clearBoxesAndTiles();
    
    revealTimeoutId= setTimeout(() => {
        if (unsolved) {
          document.getElementById('reveal-button').style.display = 'block';
        }
    }, standardDelay);
}

function revealAnswer() {
    hint_level = 3;
    progress.clues[progress.stage] = 3;
    saveProgress();
    clearBoxesAndTiles();
    disableEventListeners();
    setTimeout(() => {
        document.getElementById('next-button').style.display = 'block';
    }, 2000);
}

function disableEventListeners() {
    document.querySelectorAll('.tile').forEach(tile => {
        const newTile = tile.cloneNode(true);
        tile.replaceWith(newTile); // disables old listeners
    });
}

function clearBoxesAndTiles() {
    document.querySelectorAll('.box').forEach(box => {
        if (box.dataset.value) {
            const tile = [...document.querySelectorAll('.tile')].find(t => t.dataset.id === box.dataset.id);
            if (tile) tile.style.visibility = 'visible';
            box.textContent = '';
            delete box.dataset.value;
            delete box.dataset.id;
            box.style.backgroundColor = '';
            box.style.color = '';
        }
    });
    selectedTiles = [];
    showFeedbackDegu('neutral');
    document.getElementById('hint1-button').style.display = 'none';
    document.getElementById('hint2-button').style.display = 'none';
    document.getElementById('reveal-button').style.display = 'none';

    if (hint_level >= 1) setLightBackgroundColors();
    if (hint_level === 2) showOperators();
    if (hint_level === 3) showAnswers();
}

function setLightBackgroundColors() {
    [...hint_answer].forEach((char, index) => {
        const box = document.querySelectorAll('.box')[index];
        const tile = [...document.querySelectorAll('.tile')].find(t => t.dataset.value === char);
        if (tile && !box.dataset.value) {
            const color = getComputedStyle(tile).backgroundColor;
            box.style.backgroundColor = lightenColor(color, 75);
        }
    });
}

function showOperators() {
    [...hint_answer].forEach((char, i) => {
        const box = document.querySelectorAll('.box')[i];
        const tile = [...document.querySelectorAll('.tile')].find(t => t.dataset.value === char);
        if (tile && !box.dataset.value && isNaN(char)) {
            revealBox(box, tile);
        }
    });
}

function showAnswers() {
    [...hint_answer].forEach((char, i) => {
        const box = document.querySelectorAll('.box')[i];
        const tile = [...document.querySelectorAll('.tile')].find(t => t.dataset.value === char);
        if (tile && !box.dataset.value) {
            revealBox(box, tile);
        }
    });
}

function revealBox(box, tile) {
    box.textContent = tile.textContent;
    box.dataset.value = tile.dataset.value;
    box.dataset.id = tile.dataset.id;
    tile.style.visibility = 'hidden';
    applyTileStyle(tile, box);
    selectedTiles.push(tile.dataset.value);
}

function lightenColor(rgb, percent) {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    let [r, g, b] = match.slice(1).map(Number);
    r = Math.min(255, Math.round(r + (255 - r) * percent / 100));
    g = Math.min(255, Math.round(g + (255 - g) * percent / 100));
    b = Math.min(255, Math.round(b + (255 - b) * percent / 100));
    return `rgb(${r}, ${g}, ${b})`;
}



function advanceStage() {
  const currentIndex = STAGES.indexOf(progress.stage);
  console.log('Completed stage', currentIndex, progress.stage);

  if (progress.stage === 'Easy' || progress.stage === 'Medium') {
    progress.stage = STAGES[currentIndex + 1];
    saveProgress();
    playPlaceSound();
    showFeedbackDegu('neutral');
    initPuzzleUI();
    return;
  }

  const advanceToCompletionPage = () => {
      progress.stage = 'Completed';
      saveProgress();
      playFanfare();
      showCompletionPage();
    };

  if (progress.stage === 'Hard') {

  showModal(offerextraHTML, 'offerextra');

  setTimeout(() => {
    const yesBtn = document.getElementById('extra-yes');
    const noBtn = document.getElementById('extra-no');
    const modalOverlay = document.getElementById('shared-modal');
    const modalClose = document.getElementById('shared-modal-close');
    const modal = modalOverlay;

    const closeAndComplete = () => {
      modalOverlay.style.display = 'none';
      removeExtraModalEventListeners();
      advanceToCompletionPage();
    };

    const removeExtraModalEventListeners = () => {
      modalClose.removeEventListener('click', closeAndComplete);
      window.removeEventListener('click', outsideClickHandler);
    };

    const outsideClickHandler = function (event) {
      if (event.target === modal) {
        closeAndComplete();
      }
    };

    const addExtraModalEventListeners = () => {
      modalClose.addEventListener('click', closeAndComplete, { once: true });
      window.addEventListener('click', outsideClickHandler);
    };

    if (yesBtn && noBtn) {
      yesBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        removeExtraModalEventListeners();
        progress.stage = 'Extra';
        progress.extraAttempted = true;
        saveProgress();
        playPlaceSound();
        showFeedbackDegu('neutral');
        document.getElementById('next-button').textContent = "See Results";
        initPuzzleUI();
      });

      noBtn.addEventListener('click', () => {
        closeAndComplete();
      });
    } else {
      console.warn("Modal buttons not found.");
    }

    addExtraModalEventListeners();
  }, 100);
}

  else if (progress.stage === 'Extra') {
    advanceToCompletionPage();
  }

  else {
    console.log("Logic Error in stage advance function");
    advanceToCompletionPage();
  }
}


function saveProgress() {
  localStorage.setItem('sumfing_progress', JSON.stringify(progress));
}


function showCompletionPage() {

  const { Easy, Medium, Hard, Extra } = progress.clues;
  const streakCount = progress?.streak ?? 1;
  const dayLabel = streakCount === 1 ? 'day' : 'days';
  const delay = 700;

  // hide the game section
  document.getElementById('gameplay-elements').style.display = 'none';
  document.getElementById('completion-elements').style.display = 'block';

  // start showing the page elements
  document.getElementById('headline').textContent = `Sumfing ${dayNumber}`;

  const trophy = document.getElementById('degu-trophy');
  const trophySrc = (progress.extraAttempted && Extra != 3)
    ? '/games/sumfing/assets/images/deguTrophyAdvanced.png'
    : '/games/sumfing/assets/images/degutrophy.png';
  trophy.querySelector('img').src = trophySrc;
  trophy.style.display = 'block';

  setTimeout (() => {document.getElementById('clue-easy').textContent = 'Easy ' + emojiSummary(Easy);}, delay );
  setTimeout (() => {document.getElementById('clue-medium').textContent = 'Medium ' + emojiSummary(Medium);}, delay * 2 );
  setTimeout (() => {document.getElementById('clue-hard').textContent = 'Hard ' + emojiSummary(Hard);}, delay * 3);
  if (progress.extraAttempted) { setTimeout(() => { document.getElementById('clue-extra').textContent = 'Extra ' + emojiSummary(Extra);}, delay * 4);}
  
  setTimeout (() => {document.getElementById('streak').textContent = `Streak: ${streakCount} ${dayLabel}`;},delay * 5);

  setTimeout (() => {
    document.getElementById('share-button').style.display = 'block';
    document.getElementById('admire-button').style.display = 'block';
    attachShareButtonHandler();
    attachAdmireButtonHandler();
    }, delay * 6);

  setTimeout (() => {updateCountdownToMidnight();}, delay * 7);
}


// Helper function to return emoji summary
const emojiSummary = (n) => {
  if (n === 0) return '✅';
  if (n >= 3) return '❌';
  return '💡'.repeat(n);
};


function attachShareButtonHandler() {
  const shareButton = document.getElementById('share-button');
  if (!shareButton) {
    return;
  }

  // Remove any existing listeners (optional but safe)
  const newShareButton = shareButton.cloneNode(true);
  shareButton.replaceWith(newShareButton);

  newShareButton.addEventListener('click', () => {
    const { Easy, Medium, Hard, Extra } = progress.clues;
    let shareText = `Sumfing ${dayNumber}\n` +
                    `Easy: ${emojiSummary(Easy)}\n` +
                    `Medium: ${emojiSummary(Medium)}\n` +
                    `Hard: ${emojiSummary(Hard)}`;
    if (progress.extraAttempted) {
      shareText += `\nExtra: ${emojiSummary(Extra)}`;
    }
    shareText += `\nsumfing.com`;

    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert("Clue summary copied to clipboard!");
      });
    }
  });
}

function attachAdmireButtonHandler() {
  const oldBtn = document.getElementById('admire-button');
  if (!oldBtn) {
    return;
  }
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);

  newBtn.addEventListener('click', showReviewModal);
}

function getLocalDateString(date = new Date()) {
  return date.toLocaleDateString('en-CA'); // "YYYY-MM-DD"
}


function updateCountdownToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight - now;
  const diffHrs = Math.floor(diffMs / 1000 / 60 / 60);
  const diffMins = Math.floor((diffMs / 1000 / 60) % 60);
  document.getElementById('countdown-message').textContent =
    `Sumfing else in ${String(diffHrs).padStart(2, '0')} hours and ${String(diffMins).padStart(2, '0')} minutes`;
}


function getSumfingDayNumber(dateStr) {
  const start = new Date('2024-07-26'); // Day 1
  const today = new Date(dateStr); // e.g., '2025-05-27'
  const msPerDay = 1000 * 60 * 60 * 24;
  const dayNumber = Math.floor((today - start) / msPerDay) + 1;
  return `#${dayNumber}`;
}

</script>

</body>
</html>
