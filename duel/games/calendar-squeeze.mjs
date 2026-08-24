import { CALENDAR_ROUNDS, buildCalendarRounds, calendarSlotScore } from "../game-core.mjs";
import { NOOP, pointsWord } from "./shared.mjs";

export function startCalendarSqueeze(context) {
  const rounds = buildCalendarRounds(context.seed);
  const timers = [];
  const reactionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let phase = "idle";
  let score = 0;
  let booked = 0;
  let mistakes = 0;
  let roundMistakes = 0;
  let solveStartedAt = 0;
  let finished = false;

  context.setRoundLabel(CALENDAR_ROUNDS + " mezer v kalendáři");
  context.stage.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-topline">
        <div class="calendar-rounds" role="group" aria-label="Průběh rezervací"></div>
        <strong class="calendar-score">0 bodů</strong>
      </div>
      <div class="calendar-brief">
        <span class="calendar-icon" aria-hidden="true">🗓️</span>
        <div><span class="eyebrow">Urgentní požadavek</span><h3 class="calendar-request">Hledám volno…</h3></div>
        <div class="calendar-clock"><b>8,0</b><small>s</small></div>
      </div>
      <div class="calendar-timer" aria-hidden="true"><span></span></div>
      <div class="calendar-grid" role="group" aria-label="Pracovní kalendář"></div>
      <p class="calendar-feedback" role="status" aria-live="polite">Klikni na začátek dostatečně dlouhého volného okna.</p>
    </div>`;

  const roundDots = context.stage.querySelector(".calendar-rounds");
  const scoreLabel = context.stage.querySelector(".calendar-score");
  const request = context.stage.querySelector(".calendar-request");
  const clock = context.stage.querySelector(".calendar-clock b");
  const timerBar = context.stage.querySelector(".calendar-timer span");
  const grid = context.stage.querySelector(".calendar-grid");
  const feedback = context.stage.querySelector(".calendar-feedback");

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

  function timeLabel(index) {
    const minutes = 9 * 60 + index * 30;
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function durationLabel(duration) {
    const minutes = duration * 30;
    return minutes + " minut";
  }

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function setGridDisabled(disabled) {
    grid.querySelectorAll("button:not(.is-busy)").forEach(function (button) {
      button.disabled = disabled || button.classList.contains("is-wrong");
    });
  }

  function renderRound(round) {
    grid.replaceChildren();
    round.occupied.forEach(function (busy, index) {
      const row = document.createElement("button");
      row.type = "button";
      row.dataset.calendarSlot = String(index);
      row.className = "calendar-slot" + (busy ? " is-busy" : "");
      row.disabled = busy || phase !== "solve";
      const time = document.createElement("span");
      time.textContent = timeLabel(index);
      const label = document.createElement("b");
      label.textContent = busy ? round.titles[index] : "volno";
      row.append(time, label);
      grid.append(row);
    });
  }

  function markWindow(start, duration, className) {
    for (let offset = 0; offset < duration; offset += 1) {
      const row = grid.querySelector('[data-calendar-slot="' + (start + offset) + '"]');
      if (row) row.classList.add(className);
    }
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(8000, now - solveStartedAt);
    const remaining = Math.max(0, 8000 - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(" + (remaining / 8000) + ")";
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setGridDisabled(true);
    feedback.textContent = "Kalendář napěchován. Na skutečnou práci už naštěstí nezbylo místo.";
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (total, value) { return total + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, booked, mistakes, average });
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
    if (finished || phase !== "solve" || roundIndex !== expectedRound) return;
    phase = "resolved";
    window.cancelAnimationFrame(animationFrame);
    clock.textContent = "0,0";
    timerBar.style.transform = "scaleX(0)";
    setGridDisabled(true);
    const round = rounds[roundIndex];
    markWindow(round.validStarts[0], round.duration, "is-reveal");
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-bad");
    feedback.textContent = "Pozdě. Tady se meeting ještě vešel, alespoň podle Outlooku.";
    schedule(nextRound, 1250);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "solve";
    roundMistakes = 0;
    solveStartedAt = performance.now();
    const round = rounds[index];
    request.textContent = "Najdi souvislých " + durationLabel(round.duration);
    feedback.textContent = "Klikni na čas, kdy má schůzka začít. Přes oběd se profesionalita neřeší.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    renderRound(round);
    clock.textContent = "8,0";
    timerBar.style.transform = "scaleX(1)";
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = schedule(function () { resolveTimeout(index); }, 8000);
    const firstFree = grid.querySelector("button:not(:disabled)");
    if (firstFree) firstFree.focus({ preventScroll: true });
  }

  function chooseSlot(index) {
    if (finished || phase !== "solve" || !Number.isInteger(index)) return;
    const round = rounds[roundIndex];
    const button = grid.querySelector('[data-calendar-slot="' + index + '"]');
    if (!button || button.disabled) return;

    if (!round.validStarts.includes(index)) {
      mistakes += 1;
      roundMistakes += 1;
      button.classList.add("is-wrong");
      button.disabled = true;
      feedback.textContent = "Sem se meeting nevejde. Korporátní časoprostor odmítá spolupráci.";
      return;
    }

    const elapsed = Math.round(performance.now() - solveStartedAt);
    const points = calendarSlotScore(elapsed, roundMistakes);
    phase = "resolved";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    score += points;
    booked += 1;
    reactionTimes.push(elapsed);
    setGridDisabled(true);
    markWindow(index, round.duration, "is-selected");
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-good");
    feedback.textContent = timeLabel(index) + " · +" + points + " bodů. Pozvánka odeslána bez agendy.";
    updateScore();
    schedule(nextRound, 1000);
  }

  function onGridClick(event) {
    const button = event.target.closest("[data-calendar-slot]");
    if (!button) return;
    chooseSlot(Number(button.dataset.calendarSlot));
  }

  grid.addEventListener("click", onGridClick);
  updateScore();
  schedule(function () { startRound(0); }, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      grid.removeEventListener("click", onGridClick);
    }
  };
}
