import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const MEETING_TETRIS = Object.freeze({
  rounds: 4,
  slots: 12,
  roundDurationMs: 15_000,
  maximumScore: 6_900,
  totalMeetings: 22
});

const MEETING_TETRIS_TITLES = Object.freeze([
  "Roadmapa", "Rychlý sync", "Retro", "Budget", "1:1", "Workshop", "Demo", "Plánování",
  "Prioritizace", "Káva se stakeholdery", "Status", "Alignment", "Deep dive", "Kick-off", "Review",
  "Pre-mortem", "Post-mortem", "Ideace", "Governance", "Quick win", "Touchpoint", "Debrief"
]);

const BUSY_TITLES = Object.freeze(["Stand-up", "Oběd", "All-hands", "Povinné školení", "Blokováno"]);

const MEETING_TETRIS_TEMPLATES = Object.freeze([
  Object.freeze({
    busy: Object.freeze([3, 8]),
    pieces: Object.freeze([[0, 1], [1, 2], [4, 1], [5, 3], [9, 1], [10, 2]])
  }),
  Object.freeze({
    busy: Object.freeze([2, 6, 10]),
    pieces: Object.freeze([[0, 2], [3, 1], [4, 2], [7, 1], [8, 2], [11, 1]])
  }),
  Object.freeze({
    busy: Object.freeze([4, 9]),
    pieces: Object.freeze([[0, 3], [3, 1], [5, 2], [7, 2], [10, 2]])
  }),
  Object.freeze({
    busy: Object.freeze([1, 5, 11]),
    pieces: Object.freeze([[0, 1], [2, 2], [4, 1], [6, 3], [9, 2]])
  })
]);

export const meetingTetrisGame = defineGame({
  id: "meeting-tetris",
  meta: {
    icon: "🧱",
    title: "Meeting Tetris",
    teaser: "Naskládej všechny schůzky do jediného pracovního dne",
    difficulty: "plánování",
    instruction: "Vyber meeting a klikni na jeho začátek v kalendáři. Všechny bloky se musí vejít bez překryvu.",
    scoreLabel: "bodů za kalendář"
  },
  start: startMeetingTetris,
  result: {
    mode: "local",
    createPractice: createMeetingTetrisPracticeResult,
    normalize: normalizeMeetingTetrisResult,
    format: formatMeetingTetrisResult
  }
});

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const value = values[index];
    values[index] = values[target];
    values[target] = value;
  }
  return values;
}

export function buildMeetingTetrisRounds(seed, count = MEETING_TETRIS.rounds) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const random = createRng("meeting-tetris:" + seed);
  const templateOrder = shuffle(MEETING_TETRIS_TEMPLATES.map(function (_, index) { return index; }), random);
  const titleOrder = shuffle(MEETING_TETRIS_TITLES.slice(), random);
  let titleIndex = 0;

  return Array.from({ length: safeCount }, function (_, roundIndex) {
    const template = MEETING_TETRIS_TEMPLATES[templateOrder[roundIndex % templateOrder.length]];
    const meetings = template.pieces.map(function (piece, pieceIndex) {
      const title = titleOrder[titleIndex % titleOrder.length];
      titleIndex += 1;
      return {
        id: "meeting-" + roundIndex + "-" + pieceIndex,
        title,
        duration: piece[1],
        solutionStart: piece[0]
      };
    });
    shuffle(meetings, random);
    const busyTitles = {};
    template.busy.forEach(function (slot) {
      busyTitles[slot] = BUSY_TITLES[Math.floor(random() * BUSY_TITLES.length)];
    });
    return {
      id: roundIndex,
      busy: template.busy.slice(),
      busyTitles,
      meetings
    };
  });
}

export function canPlaceMeeting(occupied, start, duration) {
  if (!Array.isArray(occupied) || !Number.isInteger(start) || !Number.isInteger(duration)
    || duration < 1 || start < 0 || start + duration > occupied.length) return false;
  for (let offset = 0; offset < duration; offset += 1) {
    if (occupied[start + offset]) return false;
  }
  return true;
}

export function meetingTetrisRoundScore(
  elapsedMs,
  mistakes = 0,
  placedMeetings = 0,
  totalMeetings = 0,
  completed = false
) {
  const safePlaced = Math.max(0, Math.floor(Number(placedMeetings) || 0));
  const safeTotal = Math.max(0, Math.floor(Number(totalMeetings) || 0));
  if (!completed || !safeTotal || safePlaced < safeTotal) return Math.min(safePlaced, safeTotal) * 120;
  if (!Number.isFinite(Number(elapsedMs))) return 0;
  const elapsed = Math.min(MEETING_TETRIS.roundDurationMs, Math.max(0, Number(elapsedMs)));
  const safeMistakes = Math.max(0, Math.floor(Number(mistakes) || 0));
  const base = safeTotal * 150;
  const bonus = Math.max(200, Math.round(900 - elapsed / 20 - safeMistakes * 100));
  return base + bonus;
}

export function createMeetingTetrisPracticeResult(seed) {
  const random = createRng("practice-result:meeting-tetris:" + seed);
  const rounds = buildMeetingTetrisRounds(seed);
  const completed = 3 + Math.floor(random() * 2);
  const mistakes = Math.floor(random() * 5);
  const average = 6_000 + Math.floor(random() * 5_000);
  let score = 0;
  let scheduled = 0;

  rounds.forEach(function (round, index) {
    if (index < completed) {
      scheduled += round.meetings.length;
      score += meetingTetrisRoundScore(
        Math.min(MEETING_TETRIS.roundDurationMs, average + Math.floor((random() - .5) * 2_000)),
        Math.floor(mistakes / completed),
        round.meetings.length,
        round.meetings.length,
        true
      );
    } else {
      const placed = Math.max(1, round.meetings.length - 2 - Math.floor(random() * 2));
      scheduled += placed;
      score += meetingTetrisRoundScore(MEETING_TETRIS.roundDurationMs, 0, placed, round.meetings.length, false);
    }
  });
  return { score, completed, scheduled, mistakes, average };
}

export function normalizeMeetingTetrisResult(result) {
  const normalized = normalizeScoreResult(result, MEETING_TETRIS.maximumScore);
  if (!normalized) return null;
  normalized.completed = safeSmallInteger(result.completed, MEETING_TETRIS.rounds);
  normalized.scheduled = safeSmallInteger(result.scheduled, MEETING_TETRIS.totalMeetings);
  normalized.mistakes = safeSmallInteger(result.mistakes, 99);
  normalized.average = safeSmallInteger(result.average, MEETING_TETRIS.roundDurationMs);
  return normalized;
}

export function formatMeetingTetrisResult(result) {
  return result.scheduled + "/" + MEETING_TETRIS.totalMeetings + " meetingů · " + result.mistakes + " "
    + czechCount(result.mistakes, "kolize", "kolize", "kolizí");
}

export function startMeetingTetris(context) {
  const rounds = buildMeetingTetrisRounds(context.seed);
  const timers = [];
  const completionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let roundStartedAt = 0;
  let selectedMeetingId = null;
  let placements = new Map();
  let placementOrder = [];
  let score = 0;
  let completed = 0;
  let scheduled = 0;
  let mistakes = 0;
  let roundMistakes = 0;
  let phase = "idle";
  let finished = false;

  context.setRoundLabel(MEETING_TETRIS.rounds + " přeplněné pracovní dny");
  context.stage.innerHTML = `
    <div class="meeting-tetris-shell">
      <div class="meeting-tetris-topline">
        <div class="meeting-tetris-rounds" role="group" aria-label="Průběh kalendářů"></div>
        <strong class="meeting-tetris-score">0 bodů</strong>
        <div class="meeting-tetris-clock" aria-label="Zbývající čas"><b>15,0</b><small>s</small></div>
      </div>
      <div class="meeting-tetris-layout">
        <section class="meeting-tetris-calendar" aria-labelledby="meeting-tetris-day">
          <div class="meeting-tetris-calendar-head"><span class="eyebrow">Dnešní kalendář</span><h3 id="meeting-tetris-day">Zaplnit bez přesčasů</h3></div>
          <div class="meeting-tetris-grid" role="group" aria-label="Časové sloty pracovního dne"></div>
        </section>
        <aside class="meeting-tetris-queue">
          <span class="eyebrow">Čekající pozvánky</span>
          <h3>Vyber blok</h3>
          <div class="meeting-tetris-cards" role="group" aria-label="Meetingy k naplánování"></div>
          <div class="meeting-tetris-tools">
            <button type="button" data-meeting-tool="undo" disabled>↶ Vrátit</button>
            <button type="button" data-meeting-tool="reset" disabled>Začít znovu</button>
          </div>
          <p class="meeting-tetris-help">Klikni na meeting a potom na jeho začátek v kalendáři. Umístěný blok můžeš kliknutím vrátit.</p>
        </aside>
      </div>
      <p class="meeting-tetris-feedback" role="status" aria-live="polite">Čtyři dny, nula prostoru na skutečnou práci.</p>
    </div>`;

  const roundDots = context.stage.querySelector(".meeting-tetris-rounds");
  const scoreLabel = context.stage.querySelector(".meeting-tetris-score");
  const clock = context.stage.querySelector(".meeting-tetris-clock b");
  const grid = context.stage.querySelector(".meeting-tetris-grid");
  const cards = context.stage.querySelector(".meeting-tetris-cards");
  const tools = context.stage.querySelector(".meeting-tetris-tools");
  const undoButton = context.stage.querySelector('[data-meeting-tool="undo"]');
  const resetButton = context.stage.querySelector('[data-meeting-tool="reset"]');
  const feedback = context.stage.querySelector(".meeting-tetris-feedback");

  rounds.forEach(function () {
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    roundDots.append(dot);
  });

  function scheduleTimer(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function publish() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function slotTime(index) {
    const minutes = 9 * 60 + index * 30;
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function durationLabel(duration) {
    return (duration * 30) + " min";
  }

  function currentRound() {
    return rounds[roundIndex] || null;
  }

  function meetingById(meetingId) {
    const round = currentRound();
    return round ? round.meetings.find(function (meeting) { return meeting.id === meetingId; }) || null : null;
  }

  function occupiedSlots(excludeMeetingId = null) {
    const round = currentRound();
    const occupied = Array(MEETING_TETRIS.slots).fill(null);
    if (!round) return occupied;
    round.busy.forEach(function (slot) { occupied[slot] = { kind: "busy", id: "busy-" + slot }; });
    placements.forEach(function (placement, meetingId) {
      if (meetingId === excludeMeetingId) return;
      for (let offset = 0; offset < placement.duration; offset += 1) {
        occupied[placement.start + offset] = { kind: "meeting", id: meetingId, offset };
      }
    });
    return occupied;
  }

  function render() {
    const round = currentRound();
    if (!round) return;
    const occupied = occupiedSlots();
    grid.replaceChildren();

    occupied.forEach(function (entry, slot) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.meetingSlot = String(slot);
      const time = document.createElement("span");
      time.textContent = slotTime(slot);
      const label = document.createElement("b");

      if (entry && entry.kind === "busy") {
        button.className = "is-busy";
        button.disabled = true;
        label.textContent = round.busyTitles[slot] || "Obsazeno";
        button.setAttribute("aria-label", slotTime(slot) + ", obsazeno: " + label.textContent);
      } else if (entry && entry.kind === "meeting") {
        const meeting = meetingById(entry.id);
        const placement = placements.get(entry.id);
        button.className = "is-placed" + (entry.offset === 0 ? " is-start" : "")
          + (entry.offset === placement.duration - 1 ? " is-end" : "");
        button.dataset.placedMeeting = entry.id;
        button.disabled = phase !== "solve";
        label.textContent = entry.offset === 0 ? meeting.title : "↳ pokračuje";
        button.setAttribute("aria-label", slotTime(slot) + ", " + meeting.title + ", kliknutím vrátit");
      } else {
        button.className = "is-free";
        button.disabled = phase !== "solve";
        label.textContent = "volno";
        button.setAttribute("aria-label", slotTime(slot) + ", volný slot"
          + (selectedMeetingId ? ", umístit vybraný meeting" : ", nejdřív vyber meeting"));
      }
      button.append(time, label);
      grid.append(button);
    });

    cards.replaceChildren();
    round.meetings.forEach(function (meeting) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.meetingCard = meeting.id;
      const isPlaced = placements.has(meeting.id);
      const isSelected = selectedMeetingId === meeting.id;
      button.className = (isSelected ? "is-selected " : "") + (isPlaced ? "is-placed" : "");
      button.disabled = phase !== "solve" || isPlaced;
      button.setAttribute("aria-pressed", String(isSelected));
      const duration = document.createElement("span");
      duration.textContent = durationLabel(meeting.duration);
      const title = document.createElement("b");
      title.textContent = meeting.title;
      button.append(duration, title);
      cards.append(button);
    });

    undoButton.disabled = phase !== "solve" || !placementOrder.length;
    resetButton.disabled = phase !== "solve" || !placements.size;
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(MEETING_TETRIS.roundDurationMs, now - roundStartedAt);
    const remaining = Math.max(0, MEETING_TETRIS.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    render();
    feedback.textContent = "Hotovo. Kalendář je plný a produktivita byla úspěšně vytlačena mimo pracovní dobu.";
    const average = completionTimes.length
      ? Math.round(completionTimes.reduce(function (sum, value) { return sum + value; }, 0) / completionTimes.length)
      : 0;
    context.finish({ score, completed, scheduled, mistakes, average });
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
    const round = currentRound();
    const elapsed = success
      ? Math.min(MEETING_TETRIS.roundDurationMs, Math.round(performance.now() - roundStartedAt))
      : MEETING_TETRIS.roundDurationMs;
    const placedCount = placements.size;
    const points = meetingTetrisRoundScore(
      elapsed,
      roundMistakes,
      placedCount,
      round.meetings.length,
      success
    );
    score += points;
    scheduled += placedCount;
    selectedMeetingId = null;
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add(success ? "is-good" : "is-bad");

    if (success) {
      completed += 1;
      completionTimes.push(elapsed);
      feedback.textContent = (elapsed / 1000).toFixed(1).replace(".", ",") + " s · +" + points
        + " bodů. Všechny pozvánky byly odeslány bez souhlasu účastníků.";
    } else {
      clock.textContent = "0,0";
      feedback.textContent = "Čas. Naplánováno " + placedCount + "/" + round.meetings.length
        + " meetingů; zbytek se přesouvá na sobotu.";
    }
    render();
    publish();
    scheduleTimer(nextRound, success ? 900 : 1250);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    phase = "solve";
    selectedMeetingId = null;
    placements = new Map();
    placementOrder = [];
    roundMistakes = 0;
    feedback.textContent = "Den " + (index + 1) + "/" + rounds.length + " · vyber blok a potom jeho začátek.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    roundStartedAt = performance.now();
    clock.textContent = "15,0";
    render();
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = scheduleTimer(function () { resolveRound(false); }, MEETING_TETRIS.roundDurationMs);
    const firstCard = cards.querySelector("button:not(:disabled)");
    if (firstCard) firstCard.focus({ preventScroll: true });
  }

  function selectMeeting(meetingId) {
    if (finished || phase !== "solve" || placements.has(meetingId) || !meetingById(meetingId)) return;
    selectedMeetingId = selectedMeetingId === meetingId ? null : meetingId;
    feedback.textContent = selectedMeetingId
      ? "Vybráno: " + meetingById(meetingId).title + " (" + durationLabel(meetingById(meetingId).duration) + "). Teď zvol začátek."
      : "Výběr zrušen. Kalendář zatím získal pár sekund klidu.";
    render();
  }

  function removeMeeting(meetingId) {
    if (finished || phase !== "solve" || !placements.has(meetingId)) return;
    const meeting = meetingById(meetingId);
    placements.delete(meetingId);
    placementOrder = placementOrder.filter(function (id) { return id !== meetingId; });
    selectedMeetingId = meetingId;
    feedback.textContent = meeting.title + " vrácen do fronty. Můžeš ho položit jinam.";
    render();
  }

  function placeSelected(start) {
    if (finished || phase !== "solve" || !Number.isInteger(start)) return;
    const meeting = meetingById(selectedMeetingId);
    if (!meeting) {
      feedback.textContent = "Nejdřív vyber jeden z čekajících meetingů.";
      return;
    }
    const occupied = occupiedSlots();
    if (!canPlaceMeeting(occupied, start, meeting.duration)) {
      mistakes += 1;
      roundMistakes += 1;
      feedback.textContent = "Kolize. " + meeting.title + " potřebuje souvislých " + durationLabel(meeting.duration) + ".";
      for (let offset = 0; offset < meeting.duration; offset += 1) {
        const slot = grid.querySelector('[data-meeting-slot="' + (start + offset) + '"]');
        if (slot) slot.classList.add("is-wrong");
      }
      return;
    }
    placements.set(meeting.id, { start, duration: meeting.duration });
    placementOrder.push(meeting.id);
    selectedMeetingId = null;
    feedback.textContent = meeting.title + " naplánován od " + slotTime(start) + ".";
    render();
    if (placements.size === currentRound().meetings.length) resolveRound(true);
  }

  function undo() {
    const meetingId = placementOrder[placementOrder.length - 1];
    if (meetingId) removeMeeting(meetingId);
  }

  function reset() {
    if (finished || phase !== "solve" || !placements.size) return;
    placements.clear();
    placementOrder = [];
    selectedMeetingId = null;
    feedback.textContent = "Kalendář vyčištěn. Všechny pozvánky jsou znovu ve frontě.";
    render();
  }

  function onCardClick(event) {
    const button = event.target.closest("[data-meeting-card]");
    if (button) selectMeeting(button.dataset.meetingCard);
  }

  function onGridClick(event) {
    const button = event.target.closest("[data-meeting-slot]");
    if (!button || button.disabled) return;
    if (button.dataset.placedMeeting) removeMeeting(button.dataset.placedMeeting);
    else placeSelected(Number(button.dataset.meetingSlot));
  }

  function onToolClick(event) {
    const button = event.target.closest("[data-meeting-tool]");
    if (!button || button.disabled) return;
    if (button.dataset.meetingTool === "undo") undo();
    else if (button.dataset.meetingTool === "reset") reset();
  }

  cards.addEventListener("click", onCardClick);
  grid.addEventListener("click", onGridClick);
  tools.addEventListener("click", onToolClick);
  publish();
  scheduleTimer(function () { startRound(0); }, 400);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      cards.removeEventListener("click", onCardClick);
      grid.removeEventListener("click", onGridClick);
      tools.removeEventListener("click", onToolClick);
    }
  };
}
