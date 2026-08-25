import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const PAPER_SHREDDER = Object.freeze({
  durationMs: 24_000,
  lanes: 4,
  maximumScore: 9_999
});

export const SHREDDER_DOCUMENTS = Object.freeze([
  Object.freeze({ id: "draft", kind: "trash", icon: "📝", title: "Návrh_v2_STARÝ", stamp: "DRAFT" }),
  Object.freeze({ id: "duplicate", kind: "trash", icon: "📄", title: "Kopie kopie reportu", stamp: "DUPLIKÁT" }),
  Object.freeze({ id: "test-page", kind: "trash", icon: "🖨️", title: "Testovací stránka", stamp: "TEST" }),
  Object.freeze({ id: "old-menu", kind: "trash", icon: "🥡", title: "Menu z minulého týdne", stamp: "NEPLATNÉ" }),
  Object.freeze({ id: "done-todo", kind: "trash", icon: "✅", title: "Hotový TODO list", stamp: "HOTOVO" }),
  Object.freeze({ id: "blank", kind: "trash", icon: "⬜", title: "Prázdná titulní strana", stamp: "PRÁZDNÉ" }),
  Object.freeze({ id: "meeting-2019", kind: "trash", icon: "📆", title: "Agenda porady 2019", stamp: "ARCHIVNÍ ODPAD" }),
  Object.freeze({ id: "expired-coupon", kind: "trash", icon: "🎟️", title: "Propadlý kupon na kávu", stamp: "EXP." }),

  Object.freeze({ id: "contract", kind: "keep", icon: "📜", title: "Podepsaná smlouva", stamp: "ORIGINÁL" }),
  Object.freeze({ id: "invoice", kind: "keep", icon: "🧾", title: "Daňový doklad", stamp: "UCHOVAT" }),
  Object.freeze({ id: "backup", kind: "keep", icon: "🔐", title: "Záložní přístupové kódy", stamp: "DŮVĚRNÉ" }),
  Object.freeze({ id: "order", kind: "keep", icon: "✍️", title: "Schválená objednávka", stamp: "SCHVÁLENO" }),
  Object.freeze({ id: "certificate", kind: "keep", icon: "📑", title: "Bezpečnostní certifikát", stamp: "PLATNÉ" }),
  Object.freeze({ id: "nda", kind: "keep", icon: "🤐", title: "Dohoda o mlčenlivosti", stamp: "POVINNĚ UCHOVAT" })
]);

export const paperShredderGame = defineGame({
  id: "paper-shredder",
  meta: {
    icon: "🗑️",
    title: "Papírová skartovačka",
    teaser: "Skartuj odpad a nech důležité dokumenty projet",
    difficulty: "postřeh",
    instruction: "Klikni jen na nepotřebné dokumenty jedoucí po čtyřech drahách. Důležité originály nech bezpečně projet.",
    scoreLabel: "bodů za skartaci"
  },
  start: startPaperShredder,
  result: {
    mode: "local",
    createPractice: createPaperShredderPracticeResult,
    normalize: normalizePaperShredderResult,
    format: formatPaperShredderResult
  }
});

export function buildShredderSchedule(seed, durationMs = PAPER_SHREDDER.durationMs) {
  const safeDuration = Math.max(4_000, Math.floor(Number(durationMs) || PAPER_SHREDDER.durationMs));
  const random = createRng("paper-shredder:" + seed);
  const trash = SHREDDER_DOCUMENTS.filter(function (document) { return document.kind === "trash"; });
  const keep = SHREDDER_DOCUMENTS.filter(function (document) { return document.kind === "keep"; });
  const schedule = [];
  const laneFreeAt = Array(PAPER_SHREDDER.lanes).fill(0);
  let at = 450;
  let previousDocumentId = "";

  while (at < safeDuration - 3_150) {
    const progress = at / safeDuration;
    const travel = Math.round(3_050 - progress * 850);
    let available = laneFreeAt.map(function (freeAt, lane) { return { freeAt, lane }; })
      .filter(function (entry) { return entry.freeAt <= at; });
    if (!available.length) {
      const earliest = laneFreeAt.reduce(function (best, freeAt, lane) {
        return freeAt < best.freeAt ? { freeAt, lane } : best;
      }, { freeAt: laneFreeAt[0], lane: 0 });
      at = earliest.freeAt + 40;
      available = [{ lane: earliest.lane, freeAt: earliest.freeAt }];
      if (at >= safeDuration - travel) break;
    }

    const lane = available[Math.floor(random() * available.length)].lane;
    const pool = random() < .64 ? trash : keep;
    let document = pool[Math.floor(random() * pool.length)];
    if (pool.length > 1 && document.id === previousDocumentId) {
      document = pool[(pool.indexOf(document) + 1 + Math.floor(random() * (pool.length - 1))) % pool.length];
    }
    schedule.push({
      id: schedule.length,
      at: Math.round(at),
      lane,
      documentId: document.id,
      kind: document.kind,
      travel,
      tilt: Math.round((random() * 5 - 2.5) * 10) / 10
    });
    previousDocumentId = document.id;
    laneFreeAt[lane] = at + travel + 90;
    at += 560 + random() * 240;
  }
  return schedule;
}

export function shredderClickScore(currentScore, combo, kind) {
  const safeScore = Math.max(0, Math.floor(Number(currentScore) || 0));
  const safeCombo = Math.max(0, Math.floor(Number(combo) || 0));
  if (kind !== "trash") {
    return { score: Math.max(0, safeScore - 250), combo: 0, delta: -250 };
  }
  const nextCombo = safeCombo + 1;
  const delta = 200 + Math.min(150, (nextCombo - 1) * 25);
  return { score: Math.min(PAPER_SHREDDER.maximumScore, safeScore + delta), combo: nextCombo, delta };
}

export function createPaperShredderPracticeResult(seed) {
  const random = createRng("practice-result:paper-shredder:" + seed);
  const schedule = buildShredderSchedule(seed);
  const trashCount = schedule.filter(function (item) { return item.kind === "trash"; }).length;
  const keepCount = schedule.length - trashCount;
  const missed = Math.min(trashCount, 2 + Math.floor(random() * 4));
  const mistakes = Math.min(keepCount, Math.floor(random() * 3));
  const shredded = Math.max(0, trashCount - missed);
  const saved = Math.max(0, keepCount - mistakes);
  let score = 0;
  let combo = 0;
  for (let index = 0; index < shredded; index += 1) {
    const result = shredderClickScore(score, combo, "trash");
    score = result.score;
    combo = result.combo;
    if (random() < .16) combo = 0;
  }
  for (let index = 0; index < mistakes; index += 1) score = shredderClickScore(score, combo, "keep").score;
  return { score, shredded, saved, mistakes, missed };
}

export function normalizePaperShredderResult(result) {
  const normalized = normalizeScoreResult(result, PAPER_SHREDDER.maximumScore);
  if (!normalized) return null;
  normalized.shredded = safeSmallInteger(result.shredded, 50);
  normalized.saved = safeSmallInteger(result.saved, 50);
  normalized.mistakes = safeSmallInteger(result.mistakes, 50);
  normalized.missed = safeSmallInteger(result.missed, 50);
  return normalized;
}

export function formatPaperShredderResult(result) {
  return result.shredded + " skartováno · " + result.mistakes + " "
    + czechCount(result.mistakes, "důležitý dokument zničen", "důležité dokumenty zničeny", "důležitých dokumentů zničeno");
}

export function startPaperShredder(context) {
  const schedule = buildShredderSchedule(context.seed);
  const documentById = new Map(SHREDDER_DOCUMENTS.map(function (document) { return [document.id, document]; }));
  const timers = [];
  const active = new Map();
  let animationFrame = 0;
  let feedbackTimer = 0;
  let startedAt = 0;
  let score = 0;
  let combo = 0;
  let shredded = 0;
  let saved = 0;
  let mistakes = 0;
  let missed = 0;
  let finished = false;

  context.setRoundLabel("24 sekund skartační směny");
  context.stage.innerHTML = `
    <div class="paper-shredder-shell">
      <div class="paper-shredder-topline">
        <div><span class="eyebrow">Bezpečná likvidace</span><h3>Skartuj odpad. Originály nech projet.</h3></div>
        <div class="paper-shredder-stats">
          <span><small>Skartováno</small><b data-shredder-stat="shredded">0</b></span>
          <span><small>Chyby</small><b data-shredder-stat="mistakes">0</b></span>
          <span><small>Kombo</small><b data-shredder-stat="combo">×0</b></span>
          <span class="paper-shredder-clock"><small>Čas</small><b>24,0 s</b></span>
        </div>
      </div>
      <div class="paper-shredder-timer" aria-hidden="true"><span></span></div>
      <div class="paper-shredder-machine">
        <div class="paper-shredder-intake" aria-hidden="true"><b>SKARTOVAČKA</b><span>▼</span></div>
        <div class="paper-shredder-lanes" role="group" aria-label="Čtyři dráhy dokumentů"></div>
        <div class="paper-shredder-archive" aria-hidden="true"><span>✓</span><b>ARCHIV</b></div>
      </div>
      <p class="paper-shredder-feedback" role="status" aria-live="polite">Klikni na odpadní papír, nebo použij klávesy 1–4 podle dráhy.</p>
    </div>`;

  const shell = context.stage.querySelector(".paper-shredder-shell");
  const lanes = context.stage.querySelector(".paper-shredder-lanes");
  const timerBar = context.stage.querySelector(".paper-shredder-timer span");
  const clock = context.stage.querySelector(".paper-shredder-clock b");
  const shreddedLabel = context.stage.querySelector('[data-shredder-stat="shredded"]');
  const mistakesLabel = context.stage.querySelector('[data-shredder-stat="mistakes"]');
  const comboLabel = context.stage.querySelector('[data-shredder-stat="combo"]');
  const feedback = context.stage.querySelector(".paper-shredder-feedback");

  for (let laneIndex = 0; laneIndex < PAPER_SHREDDER.lanes; laneIndex += 1) {
    const lane = document.createElement("div");
    lane.className = "paper-shredder-lane";
    lane.dataset.shredderLane = String(laneIndex);
    const shortcut = document.createElement("span");
    shortcut.className = "paper-shredder-shortcut";
    shortcut.setAttribute("aria-hidden", "true");
    shortcut.textContent = String(laneIndex + 1);
    const track = document.createElement("div");
    track.className = "paper-shredder-track";
    lane.append(shortcut, track);
    lanes.append(lane);
  }

  function scheduleTimer(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function updateStats() {
    shreddedLabel.textContent = String(shredded);
    mistakesLabel.textContent = String(mistakes);
    comboLabel.textContent = "×" + combo;
    context.publishScore(score);
  }

  function showFeedback(message, bad) {
    window.clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.classList.toggle("is-bad", Boolean(bad));
    feedbackTimer = window.setTimeout(function () {
      if (finished) return;
      feedback.classList.remove("is-bad");
      feedback.textContent = combo >= 3 ? "Kombo ×" + combo + " · skartovačka žádá povýšení." : "Klávesy 1–4 skartují papír v odpovídající dráze.";
    }, 720);
  }

  function removeActive(itemId, outcome) {
    const entry = active.get(itemId);
    if (!entry) return;
    active.delete(itemId);
    if (outcome === "expired") {
      if (entry.item.kind === "trash") {
        missed += 1;
        combo = 0;
      } else {
        saved += 1;
      }
      entry.button.remove();
      updateStats();
      return;
    }
    entry.button.classList.add(outcome === "trash" ? "is-shredded" : "is-destroyed");
    scheduleTimer(function () { entry.button.remove(); }, 220);
  }

  function spawn(item) {
    if (finished) return;
    const definition = documentById.get(item.documentId);
    const lane = lanes.querySelector('[data-shredder-lane="' + item.lane + '"] .paper-shredder-track');
    if (!definition || !lane) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "paper-shredder-document";
    button.dataset.shredderItem = String(item.id);
    button.style.setProperty("--document-tilt", item.tilt + "deg");
    button.setAttribute("aria-label", "Dráha " + (item.lane + 1) + ": " + definition.title + ", " + definition.stamp);
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = definition.icon;
    const copy = document.createElement("span");
    const title = document.createElement("b");
    title.textContent = definition.title;
    const stamp = document.createElement("small");
    stamp.textContent = definition.stamp;
    copy.append(title, stamp);
    button.append(icon, copy);
    lane.append(button);
    active.set(item.id, { button, item, definition, startedAt: performance.now() });
  }

  function clickDocument(itemId) {
    if (finished) return;
    const entry = active.get(itemId);
    if (!entry) return;
    const result = shredderClickScore(score, combo, entry.item.kind);
    score = result.score;
    combo = result.combo;

    if (entry.item.kind === "trash") {
      shredded += 1;
      showFeedback("+" + result.delta + " · " + entry.definition.title + " zmizel v souladu se směrnicí.", false);
      removeActive(itemId, "trash");
    } else {
      mistakes += 1;
      shell.classList.remove("is-mistake");
      void shell.offsetWidth;
      shell.classList.add("is-mistake");
      showFeedback(result.delta + " · To byl originál. Právní oddělení už píše.", true);
      removeActive(itemId, "keep");
    }
    updateStats();
  }

  function update(now) {
    if (finished) return;
    const elapsed = Math.min(PAPER_SHREDDER.durationMs, now - startedAt);
    const remaining = Math.max(0, PAPER_SHREDDER.durationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",") + " s";
    timerBar.style.transform = "scaleX(" + (remaining / PAPER_SHREDDER.durationMs) + ")";

    active.forEach(function (entry, itemId) {
      const progress = Math.max(0, (now - entry.startedAt) / entry.item.travel);
      entry.button.style.left = (-7 + progress * 114) + "%";
      if (progress >= 1) removeActive(itemId, "expired");
    });
    animationFrame = window.requestAnimationFrame(update);
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(window.clearTimeout);
    window.clearTimeout(feedbackTimer);
    window.cancelAnimationFrame(animationFrame);
    active.forEach(function (entry) { entry.button.remove(); });
    active.clear();
    clock.textContent = "0,0 s";
    timerBar.style.transform = "scaleX(0)";
    feedback.classList.remove("is-bad");
    feedback.textContent = "Směna skončila. Skartovačka je horká a audit překvapivě stále probíhá.";
    context.finish({ score, shredded, saved, mistakes, missed });
  }

  function onLaneClick(event) {
    const button = event.target.closest("[data-shredder-item]");
    if (button) clickDocument(Number(button.dataset.shredderItem));
  }

  function onKeyDown(event) {
    if (finished || !/^[1-4]$/.test(event.key)) return;
    const laneIndex = Number(event.key) - 1;
    const entry = Array.from(active.values()).find(function (candidate) { return candidate.item.lane === laneIndex; });
    if (!entry) return;
    event.preventDefault();
    clickDocument(entry.item.id);
  }

  lanes.addEventListener("click", onLaneClick);
  window.addEventListener("keydown", onKeyDown);
  updateStats();
  startedAt = performance.now();
  schedule.forEach(function (item) { scheduleTimer(function () { spawn(item); }, item.at); });
  scheduleTimer(finish, PAPER_SHREDDER.durationMs + 40);
  animationFrame = window.requestAnimationFrame(update);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(feedbackTimer);
      window.cancelAnimationFrame(animationFrame);
      active.forEach(function (entry) { entry.button.remove(); });
      active.clear();
      lanes.removeEventListener("click", onLaneClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
