import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const POSTIT_SPRINT = Object.freeze({
  rounds: 3,
  notesPerRound: 12,
  roundDurationMs: 12_000,
  maximumScore: 5_700
});

const POSTIT_COLORS = Object.freeze(["yellow", "pink", "blue", "green"]);

export const postitSprintGame = defineGame({
  id: "postit-sprint",
  meta: {
    icon: "🗒️",
    title: "Post-it Sprint",
    teaser: "Najdi lepíky od jedničky do dvanáctky",
    difficulty: "postřeh a rychlost",
    instruction: "Klikej na očíslované lepíky ve správném pořadí. Čím rychleji dokončíš tři nástěnky, tím víc bodů získáš.",
    scoreLabel: "bodů za pořádek"
  },
  start: startPostitSprint,
  result: {
    mode: "local",
    createPractice: createPostitSprintPracticeResult,
    normalize: normalizePostitSprintResult,
    format: formatPostitSprintResult
  }
});

export function buildPostitSprintRounds(seed, count = POSTIT_SPRINT.rounds) {
  const random = createRng("postit-sprint:" + seed);

  return Array.from({ length: Math.max(0, Math.floor(Number(count) || 0)) }, function (_, roundIndex) {
    const numbers = Array.from({ length: POSTIT_SPRINT.notesPerRound }, function (__, index) { return index + 1; });
    shuffle(numbers, random);
    if (numbers.every(function (number, index) { return number === index + 1; })) numbers.push(numbers.shift());

    return {
      id: roundIndex,
      notes: numbers.map(function (number, cell) {
        return {
          number,
          cell,
          color: POSTIT_COLORS[Math.floor(random() * POSTIT_COLORS.length)],
          rotation: Math.round((random() * 7 - 3.5) * 10) / 10
        };
      })
    };
  });
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const value = values[index];
    values[index] = values[target];
    values[target] = value;
  }
  return values;
}

export function postitSprintRoundScore(elapsedMs, mistakes = 0, correct = POSTIT_SPRINT.notesPerRound) {
  const safeCorrect = Math.min(POSTIT_SPRINT.notesPerRound, Math.max(0, Math.floor(Number(correct) || 0)));
  const safeMistakes = Math.max(0, Math.floor(Number(mistakes) || 0));
  const safeElapsed = Math.min(
    POSTIT_SPRINT.roundDurationMs,
    Math.max(0, Number(elapsedMs) || 0)
  );
  const base = safeCorrect * 100;
  if (safeCorrect !== POSTIT_SPRINT.notesPerRound) return base;
  const bonus = Math.max(100, Math.round(700 - safeElapsed / 20 - safeMistakes * 75));
  return base + bonus;
}

export function createPostitSprintPracticeResult(seed) {
  const random = createRng("practice-result:postit-sprint:" + seed);
  const completed = 2 + Math.floor(random() * 2);
  const mistakes = Math.floor(random() * 6);
  const average = 3_400 + Math.floor(random() * 3_700);
  const partial = completed === POSTIT_SPRINT.rounds ? 0 : 5 + Math.floor(random() * 7);
  const correct = completed * POSTIT_SPRINT.notesPerRound + partial;
  let score = 0;

  for (let round = 0; round < completed; round += 1) {
    const elapsed = Math.min(POSTIT_SPRINT.roundDurationMs, average + Math.floor((random() - .5) * 1_100));
    score += postitSprintRoundScore(elapsed, Math.floor(mistakes / completed), POSTIT_SPRINT.notesPerRound);
  }
  if (partial) score += postitSprintRoundScore(POSTIT_SPRINT.roundDurationMs, mistakes, partial);

  return { score, correct, completed, mistakes, average };
}

export function normalizePostitSprintResult(result) {
  const normalized = normalizeScoreResult(result, POSTIT_SPRINT.maximumScore);
  if (!normalized) return null;
  normalized.correct = safeSmallInteger(result.correct, POSTIT_SPRINT.rounds * POSTIT_SPRINT.notesPerRound);
  normalized.completed = safeSmallInteger(result.completed, POSTIT_SPRINT.rounds);
  normalized.mistakes = safeSmallInteger(result.mistakes, 99);
  normalized.average = safeSmallInteger(result.average, POSTIT_SPRINT.roundDurationMs);
  return normalized;
}

export function formatPostitSprintResult(result) {
  return result.correct + "/" + (POSTIT_SPRINT.rounds * POSTIT_SPRINT.notesPerRound) + " lepíků · "
    + result.mistakes + " " + czechCount(result.mistakes, "chyba", "chyby", "chyb");
}

export function startPostitSprint(context) {
  const rounds = buildPostitSprintRounds(context.seed);
  const timers = [];
  const completionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let roundStartedAt = 0;
  let nextNumber = 1;
  let roundCorrect = 0;
  let roundMistakes = 0;
  let score = 0;
  let correct = 0;
  let completed = 0;
  let mistakes = 0;
  let phase = "idle";
  let finished = false;

  context.setRoundLabel(POSTIT_SPRINT.rounds + " nástěnky po " + POSTIT_SPRINT.notesPerRound + " lepících");
  context.stage.innerHTML = `
    <div class="postit-sprint-shell">
      <div class="postit-sprint-topline">
        <div class="postit-sprint-rounds" role="group" aria-label="Průběh nástěnek"></div>
        <strong class="postit-sprint-score">0 bodů</strong>
      </div>
      <div class="postit-sprint-brief">
        <div><span class="eyebrow">Aktuálně hledej</span><b class="postit-sprint-next">1</b></div>
        <p>Klikej od jedničky do dvanáctky. Špatný lepík stojí čas a bonus.</p>
        <div class="postit-sprint-clock" aria-label="Zbývající čas"><b>12,0</b><small>s</small></div>
      </div>
      <div class="postit-sprint-timer" aria-hidden="true"><span></span></div>
      <div class="postit-sprint-board" role="group" aria-label="Nástěnka s očíslovanými lepíky"></div>
      <p class="postit-sprint-feedback" role="status" aria-live="polite">Připravuji organizovaný chaos…</p>
    </div>`;

  const roundDots = context.stage.querySelector(".postit-sprint-rounds");
  const scoreLabel = context.stage.querySelector(".postit-sprint-score");
  const nextLabel = context.stage.querySelector(".postit-sprint-next");
  const clock = context.stage.querySelector(".postit-sprint-clock b");
  const timerBar = context.stage.querySelector(".postit-sprint-timer span");
  const board = context.stage.querySelector(".postit-sprint-board");
  const feedback = context.stage.querySelector(".postit-sprint-feedback");

  rounds.forEach(function () {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    roundDots.append(dot);
  });

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function publish(value = score) {
    scoreLabel.textContent = value + " " + pointsWord(value);
    context.publishScore(value);
  }

  function setBoardDisabled(disabled) {
    board.querySelectorAll("button").forEach(function (button) {
      button.disabled = disabled || button.classList.contains("is-done");
    });
  }

  function renderRound(round) {
    board.replaceChildren();
    round.notes.forEach(function (note) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "postit-note is-" + note.color;
      button.dataset.postitNumber = String(note.number);
      button.style.setProperty("--postit-rotation", note.rotation + "deg");
      button.setAttribute("aria-label", "Lepík číslo " + note.number);
      button.textContent = String(note.number);
      board.append(button);
    });
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(POSTIT_SPRINT.roundDurationMs, now - roundStartedAt);
    const remaining = Math.max(0, POSTIT_SPRINT.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(" + (remaining / POSTIT_SPRINT.roundDurationMs) + ")";
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setBoardDisabled(true);
    nextLabel.textContent = "✓";
    feedback.textContent = "Nástěnka zkrocena. Proces má pořadí, majitele a překvapivě i konec.";
    const average = completionTimes.length
      ? Math.round(completionTimes.reduce(function (sum, value) { return sum + value; }, 0) / completionTimes.length)
      : 0;
    context.finish({ score, correct, completed, mistakes, average });
  }

  function nextRound() {
    if (finished) return;
    if (roundIndex + 1 >= rounds.length) {
      finish();
      return;
    }
    startRound(roundIndex + 1);
  }

  function resolveRound(success) {
    if (finished || phase !== "solve") return;
    phase = "resolved";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    const elapsed = success
      ? Math.min(POSTIT_SPRINT.roundDurationMs, Math.round(performance.now() - roundStartedAt))
      : POSTIT_SPRINT.roundDurationMs;
    const points = postitSprintRoundScore(elapsed, roundMistakes, roundCorrect);
    score += points;
    setBoardDisabled(true);
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add(success ? "is-good" : "is-bad");

    if (success) {
      completed += 1;
      completionTimes.push(elapsed);
      nextLabel.textContent = "✓";
      feedback.textContent = (elapsed / 1000).toFixed(1).replace(".", ",") + " s · +" + points
        + " bodů. Lepíky jsou dočasně pod kontrolou.";
    } else {
      clock.textContent = "0,0";
      timerBar.style.transform = "scaleX(0)";
      const missing = POSTIT_SPRINT.notesPerRound - roundCorrect;
      feedback.textContent = "Čas. Chybělo " + missing + " "
        + czechCount(missing, "číslo", "čísla", "čísel") + ". Další nástěnka čeká.";
    }
    publish();
    schedule(nextRound, success ? 850 : 1100);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "solve";
    nextNumber = 1;
    roundCorrect = 0;
    roundMistakes = 0;
    nextLabel.textContent = "1";
    feedback.textContent = "Nástěnka " + (index + 1) + "/" + rounds.length + " · začni lepíkem číslo 1.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    renderRound(rounds[index]);
    roundStartedAt = performance.now();
    clock.textContent = "12,0";
    timerBar.style.transform = "scaleX(1)";
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = schedule(function () { resolveRound(false); }, POSTIT_SPRINT.roundDurationMs);
    const first = board.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }

  function chooseNote(button) {
    if (finished || phase !== "solve" || !button || button.disabled) return;
    const number = Number(button.dataset.postitNumber);
    if (number !== nextNumber) {
      mistakes += 1;
      roundMistakes += 1;
      button.classList.remove("is-wrong");
      void button.offsetWidth;
      button.classList.add("is-wrong");
      feedback.textContent = "Nejdřív " + nextNumber + ". Audit pořadí právě našel nesrovnalost.";
      schedule(function () { button.classList.remove("is-wrong"); }, 300);
      return;
    }

    button.classList.add("is-done");
    button.disabled = true;
    roundCorrect += 1;
    correct += 1;
    nextNumber += 1;
    nextLabel.textContent = nextNumber > POSTIT_SPRINT.notesPerRound ? "✓" : String(nextNumber);
    feedback.textContent = nextNumber > POSTIT_SPRINT.notesPerRound
      ? "Nástěnka hotová."
      : "Správně. Teď najdi " + nextNumber + ".";
    publish(score + roundCorrect * 100);

    if (roundCorrect === POSTIT_SPRINT.notesPerRound) resolveRound(true);
  }

  function onBoardClick(event) {
    chooseNote(event.target.closest("[data-postit-number]"));
  }

  board.addEventListener("click", onBoardClick);
  publish();
  schedule(function () { startRound(0); }, 400);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      board.removeEventListener("click", onBoardClick);
    }
  };
}
