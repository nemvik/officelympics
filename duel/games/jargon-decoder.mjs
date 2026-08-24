import { JARGON_ROUNDS, buildJargonRounds } from "../game-core.mjs";
import { NOOP, pointsWord } from "./shared.mjs";

export function startJargonDecoder(context) {
  const rounds = buildJargonRounds(context.seed);
  const timers = [];
  const reactionTimes = [];
  let roundTimer = 0;
  let roundIndex = -1;
  let phase = "idle";
  let selected = [];
  let solveStartedAt = 0;
  let score = 0;
  let solved = 0;
  let mistakes = 0;
  let finished = false;

  context.setRoundLabel(JARGON_ROUNDS + " kol korporátštiny");
  context.stage.innerHTML = `
    <div class="jargon-shell">
      <div class="jargon-topline">
        <div class="jargon-rounds" role="group" aria-label="Průběh kol"></div>
        <strong class="jargon-score">0 bodů</strong>
      </div>
      <div class="jargon-card">
        <span class="eyebrow">Interní komunikační standard</span>
        <h3>Zapamatuj a poskládej korporátní moudro</h3>
        <div class="jargon-preview" role="status" aria-live="polite">Načítám slovník stakeholderů…</div>
        <div class="jargon-answer" role="status" aria-live="polite" aria-label="Sestavená věta"><span>Zde vznikne tvoje věta</span></div>
        <div class="jargon-tiles" role="group" aria-label="Slova k poskládání"></div>
        <button class="jargon-undo" type="button" disabled>← Vrátit poslední slovo</button>
        <p class="jargon-feedback" role="status" aria-live="polite">Správné pořadí má větší hodnotu než samotný význam.</p>
      </div>
    </div>`;

  const roundDots = context.stage.querySelector(".jargon-rounds");
  const scoreLabel = context.stage.querySelector(".jargon-score");
  const preview = context.stage.querySelector(".jargon-preview");
  const answerBox = context.stage.querySelector(".jargon-answer");
  const tiles = context.stage.querySelector(".jargon-tiles");
  const undoButton = context.stage.querySelector(".jargon-undo");
  const feedback = context.stage.querySelector(".jargon-feedback");
  const card = context.stage.querySelector(".jargon-card");

  rounds.forEach(function (_, index) {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    roundDots.append(dot);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function renderSelection() {
    answerBox.replaceChildren();
    if (!selected.length) {
      const placeholder = document.createElement("span");
      placeholder.textContent = "Klikáním sestav větu…";
      answerBox.append(placeholder);
    } else {
      selected.forEach(function (entry) {
        const word = document.createElement("b");
        word.textContent = entry.word;
        answerBox.append(word);
      });
    }
    undoButton.disabled = phase !== "solve" || !selected.length;
    tiles.querySelectorAll("button").forEach(function (button) {
      button.disabled = phase !== "solve" || selected.some(function (entry) {
        return entry.index === Number(button.dataset.wordIndex);
      });
    });
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    tiles.replaceChildren();
    undoButton.disabled = true;
    preview.textContent = "Slovník úspěšně vyčerpán";
    feedback.textContent = "Hotovo. Význam nebyl nalezen, ale forma byla bezchybná.";
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (total, value) { return total + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, solved, mistakes, average });
  }

  function nextRound() {
    if (finished) return;
    if (roundIndex + 1 >= rounds.length) {
      finish();
      return;
    }
    startRound(roundIndex + 1);
  }

  function resolveTimeout(expectedRound) {
    if (finished || (phase !== "solve" && phase !== "penalty") || roundIndex !== expectedRound) return;
    phase = "resolved";
    roundDots.children[roundIndex].classList.add("is-bad");
    preview.textContent = rounds[roundIndex].phrase;
    feedback.textContent = "Čas vypršel. Tohle bude chtít navazující workshop.";
    renderSelection();
    schedule(nextRound, 1200);
  }

  function beginSolve(expectedRound) {
    if (finished || roundIndex !== expectedRound || phase !== "preview") return;
    phase = "solve";
    selected = [];
    solveStartedAt = performance.now();
    preview.textContent = "Teď větu obnov z rozházených slov";
    preview.classList.add("is-hidden-phrase");
    feedback.textContent = "Klikni na slova ve správném pořadí. Na význam se neptej.";
    renderSelection();
    roundTimer = schedule(function () { resolveTimeout(expectedRound); }, 9000);
    const firstAvailable = tiles.querySelector("button:not(:disabled)");
    if (firstAvailable) firstAvailable.focus({ preventScroll: true });
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    roundIndex = index;
    phase = "preview";
    selected = [];
    preview.classList.remove("is-hidden-phrase");
    preview.textContent = rounds[index].phrase;
    feedback.textContent = "Kolo " + (index + 1) + " z " + rounds.length + " · máš 1,7 sekundy na zapamatování.";
    roundDots.children[index].classList.add("is-current");
    tiles.replaceChildren();

    rounds[index].words.forEach(function (word, wordIndex) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.wordIndex = String(wordIndex);
      button.textContent = word;
      button.disabled = true;
      tiles.append(button);
    });
    renderSelection();
    schedule(function () { beginSolve(index); }, 1700);
  }

  function resetAfterMistake(expectedRound) {
    if (finished || roundIndex !== expectedRound || phase !== "penalty") return;
    phase = "solve";
    selected = [];
    card.classList.remove("is-mistake");
    renderSelection();
  }

  function chooseWord(index) {
    if (finished || phase !== "solve" || !Number.isInteger(index)) return;
    const round = rounds[roundIndex];
    if (!round || index < 0 || index >= round.words.length || selected.some(function (entry) { return entry.index === index; })) return;
    const word = round.words[index];
    selected.push({ index, word });
    const expectedWord = round.answer[selected.length - 1];

    if (word !== expectedWord) {
      mistakes += 1;
      phase = "penalty";
      feedback.textContent = "Tohle pořadí neprošlo připomínkovým řízením. Zkus znovu.";
      card.classList.add("is-mistake");
      renderSelection();
      schedule(function () { resetAfterMistake(roundIndex); }, 430);
      return;
    }

    renderSelection();
    if (selected.length !== round.answer.length) return;
    window.clearTimeout(roundTimer);
    phase = "resolved";
    const reaction = Math.round(performance.now() - solveStartedAt);
    const points = Math.max(120, Math.min(1000, Math.round(1080 - reaction / 6)));
    reactionTimes.push(reaction);
    solved += 1;
    score += points;
    roundDots.children[roundIndex].classList.add("is-good");
    preview.classList.remove("is-hidden-phrase");
    preview.textContent = round.phrase;
    feedback.textContent = reaction + " ms · +" + points + " bodů. Synergie obnovena.";
    renderSelection();
    updateScore();
    schedule(nextRound, 1050);
  }

  function onTileClick(event) {
    const button = event.target.closest("[data-word-index]");
    if (!button) return;
    chooseWord(Number(button.dataset.wordIndex));
  }

  function undo() {
    if (phase !== "solve" || !selected.length) return;
    selected.pop();
    feedback.textContent = "Slovo vráceno do oběhu. Nikdo nic neviděl.";
    renderSelection();
  }

  function onKeyDown(event) {
    if (event.code !== "Backspace" || phase !== "solve") return;
    event.preventDefault();
    undo();
  }

  tiles.addEventListener("click", onTileClick);
  undoButton.addEventListener("click", undo);
  window.addEventListener("keydown", onKeyDown);
  updateScore();
  schedule(function () { startRound(0); }, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      tiles.removeEventListener("click", onTileClick);
      undoButton.removeEventListener("click", undo);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
