import { PRINTER_ACTIONS, PRINTER_ROUNDS, buildPrinterRounds, printerRepairScore } from "../game-core.mjs";
import { NOOP, pointsWord } from "./shared.mjs";

export function startPrinterExorcist(context) {
  const rounds = buildPrinterRounds(context.seed);
  const actionById = new Map(PRINTER_ACTIONS.map(function (action) { return [action.id, action]; }));
  const timers = [];
  const reactionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let phase = "idle";
  let score = 0;
  let repaired = 0;
  let mistakes = 0;
  let roundMistakes = 0;
  let shownAt = 0;
  let finished = false;

  context.setRoundLabel(PRINTER_ROUNDS + " poruch před výpovědí");
  context.stage.innerHTML = `
    <div class="printer-shell">
      <div class="printer-topline">
        <div class="printer-rounds" role="group" aria-label="Průběh oprav"></div>
        <strong class="printer-score">0 bodů</strong>
      </div>
      <div class="printer-console">
        <div class="printer-machine" aria-hidden="true">
          <div class="printer-paper">Q4<br><b>FINAL</b></div>
          <span>🖨️</span>
          <i></i>
        </div>
        <div class="printer-display" role="status" aria-live="assertive">
          <small class="printer-code">DIAGNOSTIKA</small>
          <h3 class="printer-message">Probouzím kancelářského démona…</h3>
          <div class="printer-timer" aria-hidden="true"><span></span></div>
        </div>
      </div>
      <div class="printer-actions" role="group" aria-label="Možnosti opravy"></div>
      <p class="printer-feedback" role="status" aria-live="polite">Přečti závadu a co nejrychleji zvol správný zásah.</p>
    </div>`;

  const shell = context.stage.querySelector(".printer-shell");
  const roundDots = context.stage.querySelector(".printer-rounds");
  const scoreLabel = context.stage.querySelector(".printer-score");
  const codeLabel = context.stage.querySelector(".printer-code");
  const messageLabel = context.stage.querySelector(".printer-message");
  const timerBar = context.stage.querySelector(".printer-timer span");
  const actions = context.stage.querySelector(".printer-actions");
  const feedback = context.stage.querySelector(".printer-feedback");

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

  function updateScore() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function setActionsDisabled(disabled) {
    actions.querySelectorAll("button").forEach(function (button) {
      button.disabled = disabled || button.classList.contains("is-wrong");
    });
  }

  function renderActions(round) {
    actions.replaceChildren();
    round.actions.forEach(function (actionId, index) {
      const action = actionById.get(actionId);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.printerAction = action.id;
      button.disabled = phase !== "solve";
      const shortcut = document.createElement("small");
      shortcut.textContent = String(index + 1);
      const emoji = document.createElement("span");
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = action.emoji;
      const label = document.createElement("b");
      label.textContent = action.label;
      button.append(shortcut, emoji, label);
      actions.append(button);
    });
  }

  function updateTimer(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(3500, now - shownAt);
    timerBar.style.transform = "scaleX(" + Math.max(0, 1 - elapsed / 3500) + ")";
    animationFrame = window.requestAnimationFrame(updateTimer);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setActionsDisabled(true);
    codeLabel.textContent = "OFFLINE";
    messageLabel.textContent = "Tiskárna byla prohlášena za dočasně funkční";
    feedback.textContent = "Exorcismus dokončen. Nikdo nesmí nic tisknout alespoň do pondělí.";
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (total, value) { return total + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, repaired, mistakes, average });
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
    timerBar.style.transform = "scaleX(0)";
    setActionsDisabled(true);
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-bad");
    shell.classList.add("is-failed");
    const correctAction = actionById.get(rounds[roundIndex].issue);
    feedback.textContent = "Pozdě. Správně bylo: " + correctAction.label + ". Tiskárna si připisuje bod.";
    schedule(nextRound, 1050);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "solve";
    roundMistakes = 0;
    shell.classList.remove("is-failed", "is-repaired", "is-mistake");
    const round = rounds[index];
    codeLabel.textContent = round.code + " · PORUCHA " + (index + 1) + "/" + rounds.length;
    messageLabel.textContent = round.message;
    feedback.textContent = "Diagnostikuj závadu. Klávesy 1–4 fungují rychleji než volání IT.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    renderActions(round);
    shownAt = performance.now();
    timerBar.style.transform = "scaleX(1)";
    animationFrame = window.requestAnimationFrame(updateTimer);
    roundTimer = schedule(function () { resolveTimeout(index); }, 3500);
    const firstAction = actions.querySelector("button:not(:disabled)");
    if (firstAction) firstAction.focus({ preventScroll: true });
  }

  function chooseAction(actionId) {
    if (finished || phase !== "solve") return;
    const round = rounds[roundIndex];
    const button = actions.querySelector('[data-printer-action="' + actionId + '"]');
    if (!button || button.disabled) return;

    if (actionId !== round.issue) {
      mistakes += 1;
      roundMistakes += 1;
      button.classList.add("is-wrong");
      button.disabled = true;
      shell.classList.remove("is-mistake");
      void shell.offsetWidth;
      shell.classList.add("is-mistake");
      feedback.textContent = "To nepomohlo. Tiskárna vrčí o něco osobněji.";
      return;
    }

    const elapsed = Math.round(performance.now() - shownAt);
    const points = printerRepairScore(elapsed, roundMistakes);
    phase = "resolved";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    score += points;
    repaired += 1;
    reactionTimes.push(elapsed);
    setActionsDisabled(true);
    button.classList.add("is-correct");
    shell.classList.add("is-repaired");
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-good");
    feedback.textContent = elapsed + " ms · +" + points + " bodů. Démon na chvíli ustoupil.";
    updateScore();
    schedule(nextRound, 720);
  }

  function onActionClick(event) {
    const button = event.target.closest("[data-printer-action]");
    if (!button) return;
    chooseAction(button.dataset.printerAction);
  }

  function onKeyDown(event) {
    if (phase !== "solve" || !/^[1-4]$/.test(event.key)) return;
    const button = actions.children[Number(event.key) - 1];
    if (!button || button.disabled) return;
    event.preventDefault();
    chooseAction(button.dataset.printerAction);
  }

  actions.addEventListener("click", onActionClick);
  window.addEventListener("keydown", onKeyDown);
  updateScore();
  schedule(function () { startRound(0); }, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      actions.removeEventListener("click", onActionClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
