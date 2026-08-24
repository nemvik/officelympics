import { createRng } from "../game-core.mjs";
import { defineGame, NOOP, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const deadlineChickenGame = defineGame({
  id: "deadline",
  meta: {
    icon: "⏱️",
    title: "Deadline Chicken",
    teaser: "Pusť práci těsně před vyhořením",
    difficulty: "odhad",
    instruction: "Drž práci, za hranicí mlhy odhaduj a pusť ji těsně před 100 %.",
    scoreLabel: "bodů z 500"
  },
  start: startDeadlineChicken,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});

function createPracticeResult(seed) {
  const random = createRng("practice-result:deadline:" + seed);
  const rounds = Array.from({ length: DEADLINE_ROUNDS }, function () {
    const progress = 91 + random() * 12;
    return { progress, points: deadlineRoundScore(progress) };
  });
  return {
    score: rounds.reduce(function (total, round) { return total + round.points; }, 0),
    rounds
  };
}

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result, 500);
  if (!normalized) return null;
  normalized.rounds = Array.isArray(result.rounds)
    ? result.rounds.slice(0, DEADLINE_ROUNDS).map(function (round) {
      return {
        progress: Number.isFinite(round && round.progress) ? Math.min(120, Math.max(0, round.progress)) : 0,
        points: safeSmallInteger(round && round.points, 100)
      };
    })
    : [];
  return normalized;
}

function formatResult(result) {
  const busts = result.rounds.filter(function (round) { return round.progress > 100; }).length;
  return busts ? busts + "× vyhoření" : "bez vyhoření";
}

export function startDeadlineChicken(context) {
  const totalRounds = DEADLINE_ROUNDS;
  const rounds = [];
  const timers = [];
  let animationFrame = 0;
  let roundIndex = -1;
  let holding = false;
  let canHold = false;
  let heldAt = 0;
  let progress = 0;
  let config = null;
  let finished = false;

  context.setRoundLabel("5 kol nervů");
  context.stage.innerHTML = `
    <div class="deadline-shell">
      <div class="deadline-rounds" role="group" aria-label="Průběh kol"></div>
      <h3 class="deadline-heading">Dotáhni úkol co nejblíž 100 %</h3>
      <div class="deadline-gauge" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Dokončení úkolu">
        <div class="deadline-fill"></div>
        <div class="deadline-fog">deadline mlha</div>
        <div class="deadline-line"></div>
      </div>
      <div class="deadline-readout">0,0 %</div>
      <button class="deadline-hold" type="button" disabled>Drž a pracuj</button>
      <div class="deadline-verdict" role="status" aria-live="polite"></div>
      <p class="deadline-help">Drž tlačítko nebo mezerník. Za hranicí mlhy ukazatel zmizí. Pusť před 100 % — přesčas znamená vyhoření a nula bodů.</p>
    </div>`;

  const dots = context.stage.querySelector(".deadline-rounds");
  const gauge = context.stage.querySelector(".deadline-gauge");
  const fill = context.stage.querySelector(".deadline-fill");
  const readout = context.stage.querySelector(".deadline-readout");
  const holdButton = context.stage.querySelector(".deadline-hold");
  const verdict = context.stage.querySelector(".deadline-verdict");

  for (let index = 0; index < totalRounds; index += 1) {
    const dot = document.createElement("span");
    dot.className = "deadline-round-dot";
    dot.textContent = String(index + 1);
    dots.append(dot);
  }

  function totalScore() {
    return rounds.reduce(function (total, round) { return total + round.points; }, 0);
  }

  function renderProgress() {
    const visible = Math.min(progress, 108);
    fill.style.width = visible + "%";
    gauge.setAttribute("aria-valuenow", String(Math.min(100, progress)));
    const foggy = progress >= config.fogAt;
    gauge.classList.toggle("is-foggy", foggy);
    readout.textContent = foggy ? "???,? %" : progress.toFixed(1).replace(".", ",") + " %";
  }

  function updateHolding(now) {
    if (!holding || finished) return;
    progress = deadlineProgress(config, now - heldAt);
    renderProgress();

    if (progress >= 109) {
      releaseHold();
      return;
    }

    animationFrame = window.requestAnimationFrame(updateHolding);
  }

  function beginHold(event) {
    if (!canHold || holding || finished) return;
    if (event && event.cancelable) event.preventDefault();
    holding = true;
    canHold = false;
    heldAt = performance.now();
    progress = 0;
    holdButton.classList.add("is-held");
    holdButton.textContent = "Nepouštěj… ještě…";
    verdict.textContent = "";
    animationFrame = window.requestAnimationFrame(updateHolding);
  }

  function releaseHold() {
    if (!holding || finished) return;
    holding = false;
    window.cancelAnimationFrame(animationFrame);
    progress = deadlineProgress(config, performance.now() - heldAt);
    renderProgress();

    const points = deadlineRoundScore(progress);
    const bust = progress > 100;
    rounds.push({ progress, points });
    context.publishScore(totalScore());

    holdButton.classList.remove("is-held");
    holdButton.disabled = true;
    holdButton.textContent = "Kolo uzavřeno";
    dots.children[roundIndex].classList.remove("is-active");
    dots.children[roundIndex].classList.add("is-done");
    verdict.classList.toggle("is-bust", bust);
    verdict.textContent = bust
      ? progress.toFixed(1).replace(".", ",") + " % — VYHOŘENÍ · 0 bodů"
      : progress.toFixed(1).replace(".", ",") + " % · " + points + " bodů";

    if (rounds.length >= totalRounds) {
      timers.push(window.setTimeout(function () {
        if (finished) return;
        finished = true;
        context.finish({ score: totalScore(), rounds });
      }, 1250));
    } else {
      timers.push(window.setTimeout(startNextRound, 1250));
    }
  }

  function startNextRound() {
    if (finished) return;
    roundIndex += 1;
    config = deadlineRoundConfig(context.seed, roundIndex);
    progress = 0;
    canHold = false;
    renderProgress();
    gauge.classList.remove("is-foggy");
    verdict.classList.remove("is-bust");
    verdict.textContent = "Kolo " + (roundIndex + 1) + " z " + totalRounds;
    holdButton.disabled = true;
    holdButton.textContent = "Připrav se…";
    Array.from(dots.children).forEach(function (dot) { dot.classList.remove("is-active"); });
    dots.children[roundIndex].classList.add("is-active");

    timers.push(window.setTimeout(function () {
      if (finished) return;
      canHold = true;
      holdButton.disabled = false;
      holdButton.textContent = "Drž a pracuj";
      verdict.textContent = "Teď!";
      holdButton.focus({ preventScroll: true });
    }, 650));
  }

  function onPointerDown(event) {
    beginHold(event);
  }

  function onPointerUp(event) {
    if (event && event.cancelable) event.preventDefault();
    releaseHold();
  }

  function onKeyDown(event) {
    if (event.code !== "Space" || event.repeat) return;
    beginHold(event);
  }

  function onKeyUp(event) {
    if (event.code !== "Space") return;
    event.preventDefault();
    releaseHold();
  }

  holdButton.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseHold);
  timers.push(window.setTimeout(startNextRound, 550));

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.cancelAnimationFrame(animationFrame);
      holdButton.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseHold);
    }
  };
}

export const DEADLINE_ROUNDS = 5;

export function deadlineRoundConfig(seed, roundIndex) {
  const random = createRng("deadline:" + seed + ":" + roundIndex);

  return {
    speed: 27 + random() * 10,
    wobble: 0.08 + random() * 0.08,
    frequency: 2.1 + random() * 1.7,
    phase: random() * Math.PI * 2,
    fogAt: 69 + random() * 6
  };
}

export function deadlineProgress(config, heldMs) {
  const seconds = Math.max(0, heldMs) / 1000;
  const wave = Math.sin(seconds * config.frequency + config.phase) - Math.sin(config.phase);
  const progress = config.speed * seconds + config.speed * config.wobble * wave / config.frequency;
  return Math.max(0, progress);
}

export function deadlineRoundScore(progress) {
  if (!Number.isFinite(progress) || progress > 100) return 0;
  return Math.max(0, Math.round(100 - Math.abs(100 - progress) * 5));
}
