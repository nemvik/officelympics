import { PANIC_DURATION_MS, PANIC_EVENTS, buildPanicSchedule, panicClickScore } from "../game-core.mjs";
import { NOOP } from "./shared.mjs";

export function startOfficePanic(context) {
  const schedule = buildPanicSchedule(context.seed);
  const timers = [];
  const activeBySlot = new Map();
  let animationFrame = 0;
  let feedbackTimer = 0;
  let finished = false;
  let score = 0;
  let combo = 0;
  let hits = 0;
  let mistakes = 0;
  let misses = 0;

  context.setRoundLabel("20 sekund chaosu");
  context.stage.innerHTML = `
    <div class="panic-shell">
      <div class="panic-hud">
        <div>
          <p>Klikej na užitečné věci. Pastem dej profesionální ignoraci.</p>
          <div class="panic-timer" aria-hidden="true"><span></span></div>
        </div>
        <div class="panic-time" aria-label="Zbývající čas">20,0 s</div>
      </div>
      <div class="panic-feedback" role="status" aria-live="polite">Připrav si reflexy…</div>
      <div class="panic-grid" aria-label="Kancelářské události"></div>
    </div>`;

  const grid = context.stage.querySelector(".panic-grid");
  const time = context.stage.querySelector(".panic-time");
  const timerBar = context.stage.querySelector(".panic-timer > span");
  const feedback = context.stage.querySelector(".panic-feedback");

  for (let slotIndex = 0; slotIndex < 9; slotIndex += 1) {
    const slot = document.createElement("div");
    slot.className = "panic-slot";
    slot.dataset.slot = String(slotIndex);
    grid.append(slot);
  }

  function showFeedback(message, bad) {
    window.clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.classList.toggle("is-bad", Boolean(bad));
    feedbackTimer = window.setTimeout(function () {
      if (!finished) {
        feedback.textContent = combo >= 3 ? "Kombo ×" + combo + " — kancelář tě nestíhá!" : " ";
        feedback.classList.remove("is-bad");
      }
    }, 650);
  }

  function removeActive(slotIndex, countMiss) {
    const active = activeBySlot.get(slotIndex);
    if (!active) return;
    window.clearTimeout(active.expiryTimer);
    activeBySlot.delete(slotIndex);
    active.button.remove();
    if (countMiss && active.event.kind === "good" && !active.clicked) misses += 1;
  }

  function spawn(item) {
    if (finished) return;
    removeActive(item.slot, true);

    const event = PANIC_EVENTS[item.eventIndex];
    const slot = grid.children[item.slot];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panic-event";
    button.dataset.kind = event.kind;
    button.style.setProperty("--tilt", item.tilt + "deg");
    button.setAttribute("aria-label", event.label + (event.kind === "good" ? ", kliknout" : ", neklikat"));

    const emoji = document.createElement("span");
    emoji.className = "event-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = event.emoji;

    const label = document.createElement("span");
    label.className = "event-label";
    label.textContent = event.label;
    button.append(emoji, label);

    const active = { button, event, clicked: false, expiryTimer: 0 };
    activeBySlot.set(item.slot, active);
    slot.append(button);

    button.addEventListener("click", function () {
      if (finished || active.clicked) return;
      active.clicked = true;
      const result = panicClickScore(score, combo, event);
      score = result.score;
      combo = result.combo;

      if (event.kind === "good") {
        hits += 1;
        showFeedback("+" + result.delta + " · " + event.label, false);
      } else {
        mistakes += 1;
        showFeedback(result.delta + " · kancelářská past!", true);
      }

      context.publishScore(score);
      button.classList.add("is-hit");
      window.setTimeout(function () { removeActive(item.slot, false); }, 220);
    });

    active.expiryTimer = window.setTimeout(function () {
      removeActive(item.slot, true);
    }, item.lifetime);
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(window.clearTimeout);
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(feedbackTimer);
    activeBySlot.forEach(function (_, slotIndex) { removeActive(slotIndex, true); });
    feedback.textContent = "Hotovo. Inbox přežil, tvoje důstojnost se vyhodnotí.";
    time.textContent = "0,0 s";
    timerBar.style.transform = "scaleX(0)";
    context.finish({ score, hits, mistakes, misses });
  }

  const startedAt = performance.now();
  schedule.forEach(function (item) {
    timers.push(window.setTimeout(function () { spawn(item); }, item.at));
  });
  timers.push(window.setTimeout(finish, PANIC_DURATION_MS + 30));

  function updateClock(now) {
    if (finished) return;
    const elapsed = Math.min(PANIC_DURATION_MS, now - startedAt);
    const remaining = Math.max(0, PANIC_DURATION_MS - elapsed);
    time.textContent = (remaining / 1000).toFixed(1).replace(".", ",") + " s";
    timerBar.style.transform = "scaleX(" + (remaining / PANIC_DURATION_MS) + ")";
    animationFrame = window.requestAnimationFrame(updateClock);
  }
  animationFrame = window.requestAnimationFrame(updateClock);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      activeBySlot.forEach(function (_, slotIndex) { removeActive(slotIndex, false); });
      window.clearTimeout(feedbackTimer);
      window.cancelAnimationFrame(animationFrame);
    }
  };
}
