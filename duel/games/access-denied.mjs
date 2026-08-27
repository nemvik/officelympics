import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const ACCESS_DENIED_SYMBOLS = Object.freeze([
  Object.freeze({ id: "clip", emoji: "📎", label: "Sponka" }),
  Object.freeze({ id: "coffee", emoji: "☕", label: "Káva" }),
  Object.freeze({ id: "folder", emoji: "📁", label: "Složka" }),
  Object.freeze({ id: "idea", emoji: "💡", label: "Nápad" }),
  Object.freeze({ id: "chart", emoji: "📊", label: "Graf" }),
  Object.freeze({ id: "key", emoji: "🔑", label: "Klíč" })
]);

export const ACCESS_DENIED_LEVELS = Object.freeze([
  Object.freeze({ id: "meeting-room", label: "Zasedačka", codeLength: 3, symbolCount: 4, allowDuplicates: false }),
  Object.freeze({ id: "archive", label: "Archiv smluv", codeLength: 3, symbolCount: 5, allowDuplicates: false }),
  Object.freeze({ id: "server-room", label: "Serverovna", codeLength: 4, symbolCount: 5, allowDuplicates: false })
]);

export const ACCESS_DENIED = Object.freeze({
  rounds: ACCESS_DENIED_LEVELS.length,
  roundDurationMs: 45_000,
  maxAttempts: 8,
  maximumScore: 4_500
});

export const accessDeniedGame = defineGame({
  id: "access-denied",
  meta: {
    icon: "🔐",
    title: "Access Denied",
    teaser: "Prolom kód od zasedačky",
    difficulty: "dedukce",
    instruction: "Sestav tajný kód bez opakování. Zelený symbol sedí, žlutý patří jinam a šedý v kódu není.",
    scoreLabel: "bodů za prolomení"
  },
  start: startAccessDenied,
  result: {
    mode: "local",
    createPractice: createAccessDeniedPracticeResult,
    normalize: normalizeAccessDeniedResult,
    format: formatAccessDeniedResult
  }
});

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

export function buildAccessDeniedRounds(seed, levels = ACCESS_DENIED_LEVELS) {
  const random = createRng("access-denied:" + seed);
  if (!Array.isArray(levels)) return [];

  return levels.map(function (level, roundIndex) {
    const symbolCount = Math.min(
      ACCESS_DENIED_SYMBOLS.length,
      Math.max(2, Math.floor(Number(level.symbolCount) || ACCESS_DENIED_SYMBOLS.length))
    );
    const pool = ACCESS_DENIED_SYMBOLS.slice(0, symbolCount).map(function (symbol) { return symbol.id; });
    const codeLength = Math.min(6, Math.max(2, Math.floor(Number(level.codeLength) || 4)));
    const allowDuplicates = Boolean(level.allowDuplicates);
    let code;

    if (allowDuplicates && codeLength > 1) {
      const distinctCount = Math.min(pool.length, Math.max(1, codeLength - 1));
      code = shuffle(pool.slice(), random).slice(0, distinctCount);
      while (code.length < codeLength) {
        code.push(code[Math.floor(random() * code.length)]);
      }
      shuffle(code, random);
    } else {
      code = shuffle(pool.slice(), random).slice(0, Math.min(codeLength, pool.length));
    }

    return {
      id: typeof level.id === "string" ? level.id : "level-" + roundIndex,
      label: typeof level.label === "string" ? level.label : "Přístupový bod " + (roundIndex + 1),
      codeLength: code.length,
      allowDuplicates,
      code,
      keypad: shuffle(pool.slice(), random)
    };
  });
}

export function classifyAccessGuess(secret, guess) {
  if (!Array.isArray(secret) || !Array.isArray(guess)) return { exact: 0, misplaced: 0, statuses: [] };
  const remainingSecret = new Map();
  const remainingGuess = [];
  const statuses = guess.map(function () { return "absent"; });
  let exact = 0;

  secret.forEach(function (symbol, index) {
    if (index < guess.length && guess[index] === symbol) {
      exact += 1;
      statuses[index] = "exact";
      return;
    }
    remainingSecret.set(symbol, (remainingSecret.get(symbol) || 0) + 1);
  });

  guess.forEach(function (symbol, index) {
    if (index < secret.length && secret[index] === symbol) return;
    remainingGuess.push({ symbol, index });
  });

  let misplaced = 0;
  remainingGuess.forEach(function (entry) {
    const available = remainingSecret.get(entry.symbol) || 0;
    if (!available) return;
    misplaced += 1;
    statuses[entry.index] = "misplaced";
    remainingSecret.set(entry.symbol, available - 1);
  });

  return { exact, misplaced, statuses };
}

export function evaluateAccessCode(secret, guess) {
  const result = classifyAccessGuess(secret, guess);
  return { exact: result.exact, misplaced: result.misplaced };
}

export function accessDeniedRoundScore(elapsedMs, attempts = 1) {
  if (!Number.isFinite(Number(elapsedMs)) || !Number.isFinite(Number(attempts))) return 0;
  const safeElapsed = Math.min(ACCESS_DENIED.roundDurationMs, Math.max(0, Number(elapsedMs)));
  const safeAttempts = Math.min(ACCESS_DENIED.maxAttempts, Math.max(1, Math.floor(Number(attempts))));
  return Math.max(250, Math.round(1_500 - safeElapsed / 45 - (safeAttempts - 1) * 105));
}

export function createAccessDeniedPracticeResult(seed) {
  const random = createRng("practice-result:access-denied:" + seed);
  const cracked = 2 + Math.floor(random() * 2);
  const timeouts = ACCESS_DENIED.rounds - cracked;
  const reactions = [];
  let attempts = 0;
  let score = 0;

  for (let roundIndex = 0; roundIndex < cracked; roundIndex += 1) {
    const roundAttempts = 2 + Math.floor(random() * 4);
    const elapsed = 7_500 + Math.floor(random() * 15_500);
    attempts += roundAttempts;
    reactions.push(elapsed);
    score += accessDeniedRoundScore(elapsed, roundAttempts);
  }
  attempts += timeouts * ACCESS_DENIED.maxAttempts;

  const average = reactions.length
    ? Math.round(reactions.reduce(function (sum, value) { return sum + value; }, 0) / reactions.length)
    : 0;
  return { score, cracked, attempts, timeouts, average };
}

export function normalizeAccessDeniedResult(result) {
  const normalized = normalizeScoreResult(result, ACCESS_DENIED.maximumScore);
  if (!normalized) return null;
  normalized.cracked = safeSmallInteger(result.cracked, ACCESS_DENIED.rounds);
  normalized.attempts = safeSmallInteger(result.attempts, ACCESS_DENIED.rounds * ACCESS_DENIED.maxAttempts);
  normalized.timeouts = safeSmallInteger(result.timeouts, ACCESS_DENIED.rounds);
  normalized.average = safeSmallInteger(result.average, ACCESS_DENIED.roundDurationMs);
  return normalized;
}

export function formatAccessDeniedResult(result) {
  return result.cracked + "/" + ACCESS_DENIED.rounds + " kódy · " + result.attempts + " "
    + czechCount(result.attempts, "pokus", "pokusy", "pokusů");
}

export function startAccessDenied(context) {
  const rounds = buildAccessDeniedRounds(context.seed);
  const symbolById = new Map(ACCESS_DENIED_SYMBOLS.map(function (symbol) { return [symbol.id, symbol]; }));
  const timers = [];
  const reactionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let roundStartedAt = 0;
  let phase = "idle";
  let selection = [];
  let roundAttempts = 0;
  let score = 0;
  let cracked = 0;
  let attempts = 0;
  let timeouts = 0;
  let finished = false;

  context.setRoundLabel(ACCESS_DENIED.rounds + " přístupové kódy");
  context.stage.innerHTML = `
    <div class="access-denied-shell">
      <div class="access-denied-topline">
        <div class="access-denied-rounds" role="group" aria-label="Průběh prolamování"></div>
        <strong class="access-denied-score">0 bodů</strong>
      </div>
      <div class="access-denied-layout">
        <section class="access-denied-terminal" aria-labelledby="access-denied-heading">
          <div class="access-denied-terminal-head">
            <span class="access-denied-lock" aria-hidden="true">🔐</span>
            <div><span class="eyebrow">Přístupový terminál</span><h3 id="access-denied-heading">Navazuji spojení…</h3></div>
            <div class="access-denied-clock" aria-label="Zbývající čas"><b>45,0</b><small>s</small></div>
          </div>
          <div class="access-denied-timer" aria-hidden="true"><span></span></div>
          <div class="access-denied-current" role="group" aria-label="Aktuální pokus"></div>
          <div class="access-denied-legend" aria-label="Význam nápovědy">
            <span><i class="is-exact"></i> místo sedí</span>
            <span><i class="is-misplaced"></i> patří jinam</span>
            <span><i class="is-absent"></i> není v kódu</span>
          </div>
          <div class="access-denied-history" role="log" aria-live="polite" aria-label="Předchozí pokusy"></div>
        </section>
        <section class="access-denied-controls" aria-label="Ovládání kódu">
          <span class="eyebrow">Kódová sada</span>
          <h3>Poskládej další pokus</h3>
          <p class="access-denied-rule">Načítám bezpečnostní pravidla…</p>
          <div class="access-denied-keypad" role="group" aria-label="Symboly kódu"></div>
          <div class="access-denied-actions">
            <button class="access-denied-undo" type="button" disabled>← Smazat</button>
            <button class="access-denied-submit" type="button" disabled>Ověřit kód</button>
          </div>
          <small class="access-denied-shortcuts">Klávesy 1–5 · Backspace · Enter</small>
        </section>
      </div>
      <p class="access-denied-feedback" role="status" aria-live="polite">Správné symboly terminál potvrdí, jejich pozici ale neprozradí.</p>
    </div>`;

  const shell = context.stage.querySelector(".access-denied-shell");
  const roundDots = context.stage.querySelector(".access-denied-rounds");
  const scoreLabel = context.stage.querySelector(".access-denied-score");
  const lock = context.stage.querySelector(".access-denied-lock");
  const heading = context.stage.querySelector("#access-denied-heading");
  const clock = context.stage.querySelector(".access-denied-clock b");
  const timerBar = context.stage.querySelector(".access-denied-timer span");
  const current = context.stage.querySelector(".access-denied-current");
  const history = context.stage.querySelector(".access-denied-history");
  const rule = context.stage.querySelector(".access-denied-rule");
  const keypad = context.stage.querySelector(".access-denied-keypad");
  const undoButton = context.stage.querySelector(".access-denied-undo");
  const submitButton = context.stage.querySelector(".access-denied-submit");
  const feedback = context.stage.querySelector(".access-denied-feedback");

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

  function publish() {
    scoreLabel.textContent = score + " " + pointsWord(score);
    context.publishScore(score);
  }

  function renderCurrent(values = selection, reveal = false) {
    const round = rounds[roundIndex];
    current.replaceChildren();
    if (!round) return;

    for (let index = 0; index < round.codeLength; index += 1) {
      const slot = document.createElement("span");
      slot.className = "access-denied-slot" + (values[index] ? " is-filled" : "") + (reveal ? " is-revealed" : "");
      const symbol = symbolById.get(values[index]);
      slot.textContent = symbol ? symbol.emoji : "?";
      slot.setAttribute("aria-label", symbol ? "Pozice " + (index + 1) + ": " + symbol.label : "Prázdná pozice " + (index + 1));
      current.append(slot);
    }
  }

  function renderControls() {
    const round = rounds[roundIndex];
    if (!round) return;
    keypad.querySelectorAll("[data-access-symbol]").forEach(function (button) {
      const alreadyUsed = selection.includes(button.dataset.accessSymbol);
      button.disabled = phase !== "solve" || selection.length >= round.codeLength || (!round.allowDuplicates && alreadyUsed);
      button.setAttribute("aria-pressed", String(alreadyUsed));
    });
    undoButton.disabled = phase !== "solve" || !selection.length;
    submitButton.disabled = phase !== "solve" || selection.length !== round.codeLength;
    renderCurrent();
  }

  function renderKeypad(round) {
    keypad.replaceChildren();
    round.keypad.forEach(function (symbolId, index) {
      const symbol = symbolById.get(symbolId);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.accessSymbol = symbolId;
      button.setAttribute("aria-pressed", "false");
      const shortcut = document.createElement("small");
      shortcut.textContent = String(index + 1);
      const emoji = document.createElement("span");
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = symbol.emoji;
      const label = document.createElement("b");
      label.textContent = symbol.label;
      button.append(shortcut, emoji, label);
      keypad.append(button);
    });
  }

  function appendHistory(guess, result, solved) {
    const row = document.createElement("div");
    row.className = "access-denied-attempt" + (solved ? " is-solved" : "");
    const number = document.createElement("small");
    number.textContent = "#" + roundAttempts;
    const symbols = document.createElement("span");
    symbols.className = "access-denied-attempt-code";
    guess.forEach(function (symbolId, index) {
      const symbol = symbolById.get(symbolId);
      const item = document.createElement("i");
      item.classList.add("is-" + (result.statuses[index] || "absent"));
      item.textContent = symbol ? symbol.emoji : "?";
      symbols.append(item);
    });
    const resultLabel = document.createElement("span");
    resultLabel.className = "access-denied-attempt-result";
    resultLabel.innerHTML = `<b class="is-exact">${result.exact} přesně</b><b class="is-misplaced">${result.misplaced} jinde</b>`;
    row.setAttribute("aria-label", "Pokus " + roundAttempts + ": " + result.exact + " správně, " + result.misplaced + " na jiné pozici");
    row.append(number, symbols, resultLabel);
    history.append(row);
    history.scrollTop = history.scrollHeight;
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(ACCESS_DENIED.roundDurationMs, now - roundStartedAt);
    const remaining = Math.max(0, ACCESS_DENIED.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(" + (remaining / ACCESS_DENIED.roundDurationMs) + ")";
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    lock.textContent = "🔓";
    heading.textContent = "Audit přístupů dokončen";
    feedback.textContent = "Terminály zajištěny. Bezpečnostní oddělení popírá, že používalo emoji.";
    renderControls();
    const average = reactionTimes.length
      ? Math.round(reactionTimes.reduce(function (sum, value) { return sum + value; }, 0) / reactionTimes.length)
      : 0;
    context.finish({ score, cracked, attempts, timeouts, average });
  }

  function nextRound() {
    if (finished) return;
    if (roundIndex + 1 >= rounds.length) {
      finish();
      return;
    }
    startRound(roundIndex + 1);
  }

  function failRound(reason) {
    if (finished || phase !== "solve") return;
    phase = "resolved";
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    if (reason === "timeout") timeouts += 1;
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add("is-bad");
    shell.classList.add("is-denied");
    lock.textContent = "⛔";
    clock.textContent = reason === "timeout" ? "0,0" : clock.textContent;
    timerBar.style.transform = "scaleX(0)";
    renderControls();
    renderCurrent(rounds[roundIndex].code, true);
    feedback.textContent = reason === "timeout"
      ? "Čas vypršel. Terminál na okamžik odhalil správný kód."
      : "Osm pokusů nestačilo. Správný kód byl právě bezpečně kompromitován.";
    schedule(nextRound, 1_650);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    roundAttempts = 0;
    selection = [];
    phase = "solve";
    const round = rounds[index];
    shell.classList.remove("is-denied", "is-cracked", "is-mistake");
    lock.textContent = "🔐";
    heading.textContent = round.label + " · úroveň " + (index + 1) + "/" + rounds.length;
    rule.textContent = "Symboly se v kódu neopakují. Začni klidně třemi různými.";
    history.replaceChildren();
    renderKeypad(round);
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    feedback.textContent = "Pokus 1/" + ACCESS_DENIED.maxAttempts + ". Barva každého symbolu napoví, co s ním dál.";
    clock.textContent = (ACCESS_DENIED.roundDurationMs / 1000).toFixed(1).replace(".", ",");
    timerBar.style.transform = "scaleX(1)";
    renderControls();
    roundStartedAt = performance.now();
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = schedule(function () { failRound("timeout"); }, ACCESS_DENIED.roundDurationMs);
    const firstButton = keypad.querySelector("button:not(:disabled)");
    if (firstButton) firstButton.focus({ preventScroll: true });
  }

  function addSymbol(symbolId) {
    if (finished || phase !== "solve") return;
    const round = rounds[roundIndex];
    if (!round.keypad.includes(symbolId) || selection.length >= round.codeLength) return;
    if (!round.allowDuplicates && selection.includes(symbolId)) return;
    selection.push(symbolId);
    renderControls();
  }

  function undo() {
    if (finished || phase !== "solve" || !selection.length) return;
    selection.pop();
    renderControls();
  }

  function submitGuess() {
    if (finished || phase !== "solve") return;
    const round = rounds[roundIndex];
    if (selection.length !== round.codeLength) return;
    const guess = selection.slice();
    const result = classifyAccessGuess(round.code, guess);
    roundAttempts += 1;
    attempts += 1;
    const solved = result.exact === round.codeLength;
    appendHistory(guess, result, solved);

    if (solved) {
      phase = "resolved";
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      const elapsed = Math.min(ACCESS_DENIED.roundDurationMs, Math.round(performance.now() - roundStartedAt));
      const points = accessDeniedRoundScore(elapsed, roundAttempts);
      score += points;
      cracked += 1;
      reactionTimes.push(elapsed);
      roundDots.children[roundIndex].classList.remove("is-current");
      roundDots.children[roundIndex].classList.add("is-good");
      shell.classList.add("is-cracked");
      lock.textContent = "🔓";
      feedback.textContent = "Přístup povolen · " + roundAttempts + " "
        + czechCount(roundAttempts, "pokus", "pokusy", "pokusů") + " · +" + points + " bodů.";
      renderControls();
      publish();
      schedule(nextRound, 1_350);
      return;
    }

    shell.classList.remove("is-mistake");
    void shell.offsetWidth;
    shell.classList.add("is-mistake");
    if (roundAttempts >= ACCESS_DENIED.maxAttempts) {
      failRound("attempts");
      return;
    }
    selection = [];
    feedback.textContent = result.exact + " přesně · " + result.misplaced + " jinde · zbývá "
      + (ACCESS_DENIED.maxAttempts - roundAttempts) + " pokusů.";
    renderControls();
  }

  function onKeypadClick(event) {
    const button = event.target.closest("[data-access-symbol]");
    if (button) addSymbol(button.dataset.accessSymbol);
  }

  function onKeyDown(event) {
    if (phase !== "solve" || event.repeat) return;
    if (/^[1-5]$/.test(event.key)) {
      const button = keypad.children[Number(event.key) - 1];
      if (!button || button.disabled) return;
      event.preventDefault();
      addSymbol(button.dataset.accessSymbol);
      return;
    }
    if (event.code === "Backspace") {
      event.preventDefault();
      undo();
      return;
    }
    if (event.code === "Enter" && !submitButton.disabled) {
      event.preventDefault();
      submitGuess();
    }
  }

  keypad.addEventListener("click", onKeypadClick);
  undoButton.addEventListener("click", undo);
  submitButton.addEventListener("click", submitGuess);
  window.addEventListener("keydown", onKeyDown);
  publish();
  schedule(function () { startRound(0); }, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      keypad.removeEventListener("click", onKeypadClick);
      undoButton.removeEventListener("click", undo);
      submitButton.removeEventListener("click", submitGuess);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
