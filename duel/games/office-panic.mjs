import { createRng } from "../game-core.mjs";
import { defineGame, NOOP, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const officePanicGame = defineGame({
  id: "panic",
  meta: {
    icon: "🔥",
    title: "Office Panic",
    teaser: "20 sekund inboxového chaosu",
    difficulty: "rychlost",
    instruction: "Klikni na užitečné události, pasti ignoruj. Kombo přidává body.",
    scoreLabel: "bodů"
  },
  start: startOfficePanic,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});

function createPracticeResult(seed) {
  const random = createRng("practice-result:panic:" + seed);
  return {
    score: 48 + Math.floor(random() * 34),
    hits: 13 + Math.floor(random() * 8),
    mistakes: Math.floor(random() * 5),
    misses: 3 + Math.floor(random() * 7)
  };
}

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result);
  if (!normalized) return null;
  normalized.hits = safeSmallInteger(result.hits, 60);
  normalized.mistakes = safeSmallInteger(result.mistakes, 60);
  normalized.misses = safeSmallInteger(result.misses, 60);
  return normalized;
}

function formatResult(result) {
  return result.hits + " zásahů · " + result.mistakes + " přešlapů";
}

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

export const PANIC_DURATION_MS = 20_000;

export const PANIC_EVENTS = Object.freeze([
  Object.freeze({ emoji: "🔥", label: "Produkce hoří", kind: "good", points: 3 }),
  Object.freeze({ emoji: "☕", label: "Doplnit kávu", kind: "good", points: 1 }),
  Object.freeze({ emoji: "💾", label: "Uložit dokument", kind: "good", points: 2 }),
  Object.freeze({ emoji: "📞", label: "Zvednout klienta", kind: "good", points: 2 }),
  Object.freeze({ emoji: "✅", label: "Schválit dovolenou", kind: "good", points: 1 }),
  Object.freeze({ emoji: "📣", label: "Odpovědět všem", kind: "bad", points: -2 }),
  Object.freeze({ emoji: "🎣", label: "Faktura_FINAL.zip", kind: "bad", points: -3 }),
  Object.freeze({ emoji: "🗓️", label: "Meeting bez agendy", kind: "bad", points: -2 }),
  Object.freeze({ emoji: "🔔", label: "Náhodný Slack", kind: "bad", points: -1 })
]);

export function buildPanicSchedule(seed, durationMs = PANIC_DURATION_MS) {
  const random = createRng("panic:" + seed);
  const schedule = [];
  let at = 450;
  let previousSlot = -1;

  while (at < durationMs - 650) {
    const good = random() < 0.68;
    const poolStart = good ? 0 : 5;
    const poolLength = good ? 5 : 4;
    let slot = Math.floor(random() * 9);

    if (slot === previousSlot) slot = (slot + 1 + Math.floor(random() * 7)) % 9;
    previousSlot = slot;

    schedule.push({
      id: schedule.length,
      at: Math.round(at),
      slot,
      eventIndex: poolStart + Math.floor(random() * poolLength),
      lifetime: Math.round(900 + random() * 500),
      tilt: Math.round((random() * 8 - 4) * 10) / 10
    });

    at += 470 + random() * 340;
  }

  return schedule;
}

export function panicClickScore(currentScore, combo, event) {
  if (!event || event.kind !== "good") {
    return {
      score: Math.max(0, currentScore + (event ? event.points : 0)),
      combo: 0,
      delta: event ? event.points : 0
    };
  }

  const nextCombo = combo + 1;
  const bonus = Math.min(3, Math.floor(nextCombo / 3));
  const delta = event.points + bonus;

  return { score: currentScore + delta, combo: nextCombo, delta };
}
