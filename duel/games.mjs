import {
  ALT_TAB_ROUNDS,
  BATTLESHIP,
  CURLING,
  ESCAPE,
  JARGON_ROUNDS,
  PANIC_DURATION_MS,
  PANIC_EVENTS,
  PONG,
  TASK_PIECES,
  TASK_STACK,
  addTaskGarbage,
  altTabReactionScore,
  battleshipShotResult,
  buildAltTabRounds,
  buildBattleshipFleet,
  buildEscapeCourse,
  buildJargonRounds,
  buildPanicSchedule,
  buildTaskBag,
  calculateCurlingScore,
  clampShotVelocity,
  clearTaskRows,
  createCurlingStone,
  createPongBall,
  createRng,
  deadlineProgress,
  deadlineRoundConfig,
  deadlineRoundScore,
  makeBotCurlingShot,
  panicClickScore,
  rectanglesOverlap,
  sanitizeCurlingStones,
  stepCurling,
  stepPong
} from "./game-core.mjs";

const NOOP = function () {};

export function startGame(gameId, context) {
  if (gameId === "deadline") return startDeadlineChicken(context);
  if (gameId === "curling") return startPaperCurling(context);
  if (gameId === "alttab") return startAltTabDuel(context);
  if (gameId === "battleship") return startSpreadsheetBattleship(context);
  if (gameId === "taskstack") return startTaskStack(context);
  if (gameId === "pong") return startInboxPong(context);
  if (gameId === "escape") return startMeetingEscape(context);
  if (gameId === "jargon") return startJargonDecoder(context);
  return startOfficePanic(context);
}

export function createPracticeResult(gameId, seed) {
  const random = createRng("practice-result:" + gameId + ":" + seed);

  if (gameId === "deadline") {
    const rounds = Array.from({ length: 5 }, function () {
      const progress = 91 + random() * 12;
      return {
        progress,
        points: deadlineRoundScore(progress)
      };
    });
    return {
      score: rounds.reduce(function (total, round) { return total + round.points; }, 0),
      rounds
    };
  }

  if (gameId === "alttab") {
    const reactions = Array.from({ length: 5 }, function () {
      return Math.round(285 + random() * 520);
    });
    const mistakes = random() < 0.45 ? 1 : 0;
    return {
      score: reactions.reduce(function (total, reaction) {
        return total + altTabReactionScore(reaction);
      }, 3 * 350) - mistakes * 350,
      reactions,
      mistakes,
      missed: random() < 0.22 ? 1 : 0,
      average: Math.round(reactions.reduce(function (total, value) { return total + value; }, 0) / reactions.length)
    };
  }

  if (gameId === "taskstack") {
    const lines = 3 + Math.floor(random() * 7);
    return {
      score: lines * 115 + Math.floor(random() * 420),
      lines,
      sent: Math.max(0, lines - 2),
      topOut: random() < 0.18
    };
  }

  if (gameId === "escape") {
    const crashes = Math.floor(random() * 4);
    const coffees = 1 + Math.floor(random() * 4);
    const distance = 2850 + Math.floor(random() * 1050);
    return {
      score: Math.max(0, distance + coffees * 150 - crashes * 250),
      distance,
      crashes,
      coffees
    };
  }

  if (gameId === "jargon") {
    const solved = 3 + Math.floor(random() * 4);
    const average = 2300 + Math.floor(random() * 3300);
    return {
      score: solved * 520 + Math.floor(random() * 850),
      solved,
      mistakes: Math.floor(random() * 5),
      average
    };
  }

  return {
    score: 48 + Math.floor(random() * 34),
    hits: 13 + Math.floor(random() * 8),
    mistakes: Math.floor(random() * 5),
    misses: 3 + Math.floor(random() * 7)
  };
}

function startOfficePanic(context) {
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

function startDeadlineChicken(context) {
  const totalRounds = 5;
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
      <div class="deadline-rounds" aria-label="Průběh kol"></div>
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

function startPaperCurling(context) {
  const fixedStep = 1 / 120;
  const localRole = context.localRole;
  const timers = [];
  let stones = [];
  let shotNumber = 0;
  let activeShotOwner = null;
  let moving = false;
  let awaitingSettle = false;
  let drag = null;
  let keyboardAim = { vx: 0, vy: -465 };
  let animationFrame = 0;
  let animationGeneration = 0;
  let finished = false;

  context.setRoundLabel("3 hody na hráče");
  context.stage.innerHTML = `
    <div class="curling-shell">
      <div class="curling-board-wrap">
        <canvas class="curling-canvas" width="720" height="880" tabindex="0" role="img" aria-label="Hrací plocha papírového curlingu. Táhni koulí směrem dolů a pusť ji, nebo použij šipky a mezerník.">Tvůj prohlížeč neumí zobrazit herní plochu.</canvas>
      </div>
      <aside class="curling-sidebar">
        <span class="eyebrow">Papírový curling</span>
        <h3 id="curling-turn-title">Na tahu</h3>
        <p class="curling-status" role="status" aria-live="polite"></p>
        <div class="curling-legend">
          <div><span><i class="stone-swatch pink"></i><span class="pink-name"></span></span><span class="shot-pips pink-pips"></span></div>
          <div><span><i class="stone-swatch blue"></i><span class="blue-name"></span></span><span class="shot-pips blue-pips"></span></div>
        </div>
        <p class="curling-help">Táhni kouli od koše směrem dolů a pusť. Čím delší tah, tím silnější hod. Šipky mění směr a sílu, mezerník vystřelí.</p>
        <div class="curling-live-score">V kruhu zatím nikdo neboduje.</div>
      </aside>
    </div>`;

  const canvas = context.stage.querySelector(".curling-canvas");
  const drawing = canvas.getContext("2d");
  const status = context.stage.querySelector(".curling-status");
  const turnTitle = context.stage.querySelector("#curling-turn-title");
  const liveScore = context.stage.querySelector(".curling-live-score");
  const pinkPips = context.stage.querySelector(".pink-pips");
  const bluePips = context.stage.querySelector(".blue-pips");
  context.stage.querySelector(".pink-name").textContent = context.names[0];
  context.stage.querySelector(".blue-name").textContent = context.names[1];

  [pinkPips, bluePips].forEach(function (container) {
    for (let index = 0; index < CURLING.shotsPerPlayer; index += 1) {
      container.append(document.createElement("i"));
    }
  });

  function ownerName(owner) {
    return context.names[owner] || (owner === 0 ? "Růžový" : "Modrý");
  }

  function currentOwner() {
    return shotNumber % 2;
  }

  function canLocalShoot() {
    return !finished && !moving && !awaitingSettle && shotNumber < CURLING.shotsPerPlayer * 2 && currentOwner() === localRole;
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * CURLING.width / bounds.width,
      y: (event.clientY - bounds.top) * CURLING.height / bounds.height
    };
  }

  function updateShotPips() {
    const used = [0, 0];
    stones.forEach(function (stone) { used[stone.owner] += 1; });
    [pinkPips, bluePips].forEach(function (container, owner) {
      Array.from(container.children).forEach(function (pip, index) {
        pip.classList.toggle("is-used", index < used[owner]);
      });
    });
  }

  function updateProvisionalScore() {
    const scoring = calculateCurlingScore(stones);
    const localScore = scoring.scores[localRole];
    const remoteScore = scoring.scores[1 - localRole];
    context.setScores(localScore, remoteScore);

    if (scoring.winner === null) {
      liveScore.textContent = "V kruhu zatím nikdo neboduje.";
    } else {
      liveScore.textContent = ownerName(scoring.winner) + " průběžně získává " + scoring.scores[scoring.winner] + " " + pointsWord(scoring.scores[scoring.winner]) + ".";
    }
  }

  function updateTurnUi() {
    updateShotPips();
    updateProvisionalScore();

    if (finished) return;
    if (shotNumber >= CURLING.shotsPerPlayer * 2) {
      turnTitle.textContent = "Měříme";
      status.textContent = "Rozhodčí hledá pravítko a poslední zbytky autority.";
      return;
    }

    const owner = currentOwner();
    const numberForOwner = Math.floor(shotNumber / 2) + 1;
    turnTitle.textContent = owner === localRole ? "Tvůj hod" : "Hází " + ownerName(owner);
    status.textContent = owner === localRole
      ? "Hod " + numberForOwner + " ze 3. Táhni kouli dolů a pusť."
      : "Čekáš na hod " + numberForOwner + " ze 3. Strategické funění je povoleno.";

    if (context.mode === "practice" && owner === 1) {
      status.textContent = "Kolega-bot počítá trajektorii na úrovni tabulky v Excelu…";
    }
  }

  function drawDesk() {
    const gradient = drawing.createLinearGradient(0, 0, CURLING.width, CURLING.height);
    gradient.addColorStop(0, "#d6a16d");
    gradient.addColorStop(.5, "#c58a54");
    gradient.addColorStop(1, "#dda874");
    drawing.fillStyle = gradient;
    drawing.fillRect(0, 0, CURLING.width, CURLING.height);

    drawing.save();
    drawing.globalAlpha = .15;
    drawing.strokeStyle = "#5b3218";
    drawing.lineWidth = 2;
    for (let y = 38; y < CURLING.height; y += 62) {
      drawing.beginPath();
      drawing.moveTo(0, y);
      drawing.bezierCurveTo(180, y - 8, 500, y + 9, CURLING.width, y - 2);
      drawing.stroke();
    }
    drawing.restore();

    const rings = [
      { radius: CURLING.houseRadius, color: "#48a7ff" },
      { radius: 80, color: "#fffaf0" },
      { radius: 51, color: "#ff0f7b" },
      { radius: 20, color: "#ffd51f" }
    ];
    rings.forEach(function (ring) {
      drawing.beginPath();
      drawing.arc(CURLING.targetX, CURLING.targetY, ring.radius, 0, Math.PI * 2);
      drawing.fillStyle = ring.color;
      drawing.fill();
      drawing.lineWidth = 3;
      drawing.strokeStyle = "#111";
      drawing.stroke();
    });

    drawing.save();
    drawing.setLineDash([12, 10]);
    drawing.strokeStyle = "rgba(17,17,17,.55)";
    drawing.lineWidth = 3;
    drawing.beginPath();
    drawing.moveTo(45, CURLING.launchY + 34);
    drawing.lineTo(CURLING.width - 45, CURLING.launchY + 34);
    drawing.stroke();
    drawing.restore();

    drawing.fillStyle = "rgba(17,17,17,.72)";
    drawing.font = "900 15px Arial";
    drawing.textAlign = "center";
    drawing.fillText("KANCELÁŘSKÝ KOŠ", CURLING.targetX, CURLING.targetY - CURLING.houseRadius - 17);
  }

  function drawStone(stone, ghost) {
    const color = stone.owner === 0 ? "#ff0f7b" : "#48a7ff";
    drawing.save();
    drawing.translate(stone.x, stone.y);
    drawing.globalAlpha = ghost ? .72 : 1;
    drawing.shadowColor = "rgba(0,0,0,.3)";
    drawing.shadowBlur = 8;
    drawing.shadowOffsetY = 5;
    drawing.beginPath();
    drawing.arc(0, 0, stone.radius || CURLING.ballRadius, 0, Math.PI * 2);
    drawing.fillStyle = color;
    drawing.fill();
    drawing.shadowColor = "transparent";
    drawing.lineWidth = 3;
    drawing.strokeStyle = "#111";
    drawing.stroke();

    const stoneNumber = Number(String(stone.id).split("-")[1]) || 0;
    drawing.strokeStyle = "rgba(255,255,255,.65)";
    drawing.lineWidth = 2;
    for (let line = 0; line < 3; line += 1) {
      const angle = (stoneNumber * 1.7 + line * 2.2) % (Math.PI * 2);
      drawing.beginPath();
      drawing.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4);
      drawing.lineTo(Math.cos(angle + .5) * 13, Math.sin(angle + .5) * 13);
      drawing.stroke();
    }
    drawing.restore();
  }

  function drawAim() {
    if (!canLocalShoot()) return;
    const owner = currentOwner();
    const launchStone = createCurlingStone(owner, shotNumber);
    drawStone(launchStone, true);

    let velocity = keyboardAim;
    if (drag) {
      velocity = clampShotVelocity(
        (CURLING.launchX - drag.x) * 4.2,
        (CURLING.launchY - drag.y) * 4.2
      );

      drawing.save();
      drawing.setLineDash([8, 8]);
      drawing.strokeStyle = "rgba(17,17,17,.72)";
      drawing.lineWidth = 4;
      drawing.beginPath();
      drawing.moveTo(CURLING.launchX, CURLING.launchY);
      drawing.lineTo(drag.x, drag.y);
      drawing.stroke();
      drawing.restore();
    }

    const speed = Math.hypot(velocity.vx, velocity.vy);
    if (speed < 1) return;
    const length = 115 + speed * .16;
    const endX = CURLING.launchX + velocity.vx / speed * length;
    const endY = CURLING.launchY + velocity.vy / speed * length;

    drawing.save();
    drawing.strokeStyle = owner === 0 ? "#c5005b" : "#0d57c8";
    drawing.fillStyle = drawing.strokeStyle;
    drawing.lineWidth = 6;
    drawing.beginPath();
    drawing.moveTo(CURLING.launchX, CURLING.launchY);
    drawing.lineTo(endX, endY);
    drawing.stroke();
    const angle = Math.atan2(endY - CURLING.launchY, endX - CURLING.launchX);
    drawing.beginPath();
    drawing.moveTo(endX, endY);
    drawing.lineTo(endX - 18 * Math.cos(angle - .5), endY - 18 * Math.sin(angle - .5));
    drawing.lineTo(endX - 18 * Math.cos(angle + .5), endY - 18 * Math.sin(angle + .5));
    drawing.closePath();
    drawing.fill();
    drawing.restore();
  }

  function draw() {
    drawDesk();
    stones.forEach(function (stone) { drawStone(stone, false); });
    drawAim();
  }

  function normalizedSnapshot() {
    return stones.map(function (stone) {
      return { owner: stone.owner, x: stone.x, y: stone.y, vx: 0, vy: 0 };
    });
  }

  function completeCurling() {
    if (finished) return;
    finished = true;
    const scoring = calculateCurlingScore(stones);
    const nearest = scoring.nearest === null ? null : Math.round(scoring.nearest * 10) / 10;
    const results = [0, 1].map(function (owner) {
      return {
        score: scoring.scores[owner],
        nearest,
        winner: scoring.winner
      };
    });
    context.finishShared(results);
  }

  function scheduleBotIfNeeded() {
    if (context.mode !== "practice" || finished || shotNumber >= CURLING.shotsPerPlayer * 2 || currentOwner() !== 1) return;
    timers.push(window.setTimeout(function () {
      if (finished || moving || currentOwner() !== 1) return;
      const shot = makeBotCurlingShot(context.seed, shotNumber, stones);
      performShot(1, shotNumber, shot.vx, shot.vy, false);
    }, 900));
  }

  function applySettle(snapshot, completedShot) {
    if (finished || completedShot !== shotNumber) return;
    const sanitized = sanitizeCurlingStones(snapshot);
    if (!sanitized || sanitized.length !== completedShot + 1) return;
    animationGeneration += 1;
    window.cancelAnimationFrame(animationFrame);
    stones = sanitized;
    moving = false;
    awaitingSettle = false;
    activeShotOwner = null;
    shotNumber += 1;
    keyboardAim = { vx: 0, vy: -465 };
    updateTurnUi();
    draw();

    if (shotNumber >= CURLING.shotsPerPlayer * 2) {
      timers.push(window.setTimeout(completeCurling, 900));
    } else {
      scheduleBotIfNeeded();
    }
  }

  function settleFromAuthority(completedShot) {
    const snapshot = normalizedSnapshot();
    if (context.mode === "online") {
      context.send({ type: "curling-settle", shotNumber: completedShot, stones: snapshot });
    }
    applySettle(snapshot, completedShot);
  }

  function animateShot(generation) {
    let previous = performance.now();
    let accumulator = 0;

    function frame(now) {
      if (finished || generation !== animationGeneration || !moving) return;
      accumulator += Math.min(.05, (now - previous) / 1000);
      previous = now;
      let stillMoving = true;
      let steps = 0;

      while (accumulator >= fixedStep && steps < 12) {
        stillMoving = stepCurling(stones, fixedStep);
        accumulator -= fixedStep;
        steps += 1;
      }

      draw();
      if (!stillMoving) {
        moving = false;
        const isAuthority = context.mode === "practice" || activeShotOwner === localRole;
        if (isAuthority) {
          settleFromAuthority(shotNumber);
        } else {
          awaitingSettle = true;
          status.textContent = "Srovnávám papíry podle soupeřova stolu…";
        }
        return;
      }

      animationFrame = window.requestAnimationFrame(frame);
    }

    animationFrame = window.requestAnimationFrame(frame);
  }

  function performShot(owner, incomingShotNumber, vx, vy, shouldSend) {
    if (finished || moving || awaitingSettle || incomingShotNumber !== shotNumber || owner !== currentOwner()) return false;
    const velocity = clampShotVelocity(vx, vy);
    const speed = Math.hypot(velocity.vx, velocity.vy);
    if (speed < 85 || velocity.vy > -35) return false;

    const stone = createCurlingStone(owner, shotNumber);
    stone.vx = velocity.vx;
    stone.vy = velocity.vy;
    stones.push(stone);
    activeShotOwner = owner;
    moving = true;
    drag = null;
    updateShotPips();
    status.textContent = ownerName(owner) + " posílá kancelářskou techniku do neznáma…";

    if (shouldSend && context.mode === "online") {
      context.send({
        type: "curling-shot",
        shotNumber,
        owner,
        vx: velocity.vx,
        vy: velocity.vy
      });
    }

    animationGeneration += 1;
    animateShot(animationGeneration);
    return true;
  }

  function onPointerDown(event) {
    if (!canLocalShoot()) return;
    const point = canvasPoint(event);
    if (Math.hypot(point.x - CURLING.launchX, point.y - CURLING.launchY) > 72) return;
    event.preventDefault();
    drag = point;
    canvas.setPointerCapture(event.pointerId);
    draw();
  }

  function onPointerMove(event) {
    if (!drag || !canLocalShoot()) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const dx = point.x - CURLING.launchX;
    const dy = point.y - CURLING.launchY;
    const distance = Math.hypot(dx, dy);
    const maxPull = 136;
    const scale = distance > maxPull ? maxPull / distance : 1;
    drag = {
      x: CURLING.launchX + dx * scale,
      y: CURLING.launchY + dy * scale
    };
    draw();
  }

  function onPointerUp(event) {
    if (!drag || !canLocalShoot()) return;
    event.preventDefault();
    const velocity = clampShotVelocity(
      (CURLING.launchX - drag.x) * 4.2,
      (CURLING.launchY - drag.y) * 4.2
    );
    drag = null;
    if (!performShot(localRole, shotNumber, velocity.vx, velocity.vy, true)) {
      status.textContent = "Táhni kouli víc dolů. Do vlastního oddělení se body nepočítají.";
      draw();
    }
  }

  function onPointerCancel() {
    if (!drag) return;
    drag = null;
    draw();
  }

  function onKeyDown(event) {
    if (!canLocalShoot()) return;
    const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"].includes(event.code);
    if (!handled) return;
    event.preventDefault();

    if (event.code === "ArrowLeft") keyboardAim.vx = Math.max(-240, keyboardAim.vx - 16);
    if (event.code === "ArrowRight") keyboardAim.vx = Math.min(240, keyboardAim.vx + 16);
    if (event.code === "ArrowUp") keyboardAim.vy = Math.max(-570, keyboardAim.vy - 14);
    if (event.code === "ArrowDown") keyboardAim.vy = Math.min(-160, keyboardAim.vy + 14);
    if (event.code === "Space" || event.code === "Enter") {
      performShot(localRole, shotNumber, keyboardAim.vx, keyboardAim.vy, true);
      return;
    }
    draw();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("keydown", onKeyDown);

  updateTurnUi();
  draw();
  if (canLocalShoot()) canvas.focus({ preventScroll: true });

  return {
    receiveNetwork: function (message) {
      if (finished || !message) return;

      if (message.type === "curling-shot") {
        if (message.owner === localRole) return;
        performShot(message.owner, message.shotNumber, message.vx, message.vy, false);
      }

      if (message.type === "curling-settle" && activeShotOwner !== localRole) {
        applySettle(message.stones, message.shotNumber);
      }
    },
    cleanup: function () {
      finished = true;
      animationGeneration += 1;
      timers.forEach(window.clearTimeout);
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("keydown", onKeyDown);
    }
  };
}

function startAltTabDuel(context) {
  const rounds = buildAltTabRounds(context.seed);
  const timers = [];
  const reactions = [];
  let roundIndex = -1;
  let phase = "idle";
  let shownAt = 0;
  let score = 0;
  let mistakes = 0;
  let missed = 0;
  let finished = false;

  context.setRoundLabel(ALT_TAB_ROUNDS + " kontrol šéfa");
  context.stage.innerHTML = `
    <div class="alttab-shell">
      <div class="alttab-topline">
        <div class="alttab-rounds" aria-label="Průběh kol"></div>
        <strong class="alttab-score">0 bodů</strong>
      </div>
      <div class="alttab-monitor" data-state="working">
        <div class="monitor-chrome"><i></i><i></i><i></i><span>Q4_vysledky_FINAL_opravdu.xlsx</span></div>
        <div class="monitor-work">
          <div class="fake-sheet" aria-hidden="true">
            <b>A</b><b>B</b><b>C</b><b>D</b><b>E</b>
            <span>Q4</span><span>128</span><span>?</span><span>☕</span><span>#REF!</span>
            <span>KPI</span><span>42 %</span><span>👍</span><span>0</span><span>brzy</span>
            <span>ROI</span><span>∞</span><span>📈</span><span>ano</span><span>možná</span>
          </div>
          <div class="alttab-alert" role="status" aria-live="assertive">
            <span class="alttab-alert-icon" aria-hidden="true">⌛</span>
            <div><strong>Pracuj nenápadně</strong><small>Reaguj jen, když se objeví šéf.</small></div>
          </div>
        </div>
      </div>
      <button class="alttab-button" type="button"><span>ALT + TAB</span><small>nebo mezerník</small></button>
      <p class="alttab-feedback" role="status" aria-live="polite">Až přijde šéf, zachraň tabulku. Ostatní notifikace ignoruj.</p>
    </div>`;

  const monitor = context.stage.querySelector(".alttab-monitor");
  const alert = context.stage.querySelector(".alttab-alert");
  const alertIcon = context.stage.querySelector(".alttab-alert-icon");
  const alertTitle = alert.querySelector("strong");
  const alertCopy = alert.querySelector("small");
  const button = context.stage.querySelector(".alttab-button");
  const feedback = context.stage.querySelector(".alttab-feedback");
  const scoreLabel = context.stage.querySelector(".alttab-score");
  const roundPips = context.stage.querySelector(".alttab-rounds");

  rounds.forEach(function (_, index) {
    const pip = document.createElement("i");
    pip.setAttribute("aria-label", "Kolo " + (index + 1));
    roundPips.append(pip);
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

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    button.disabled = true;
    monitor.dataset.state = "done";
    alertIcon.textContent = "✅";
    alertTitle.textContent = "Směna přežita";
    alertCopy.textContent = "Historie prohlížeče byla preventivně skartována.";
    feedback.textContent = "Hotovo. Šéf nic neviděl — nebo to aspoň profesionálně předstírá.";
    const average = reactions.length
      ? Math.round(reactions.reduce(function (total, value) { return total + value; }, 0) / reactions.length)
      : 0;
    context.finish({ score, reactions, mistakes, missed, average });
  }

  function resolveRound(outcome) {
    if (finished || (phase !== "waiting" && phase !== "signal")) return;
    const round = rounds[roundIndex];
    let successful = false;
    let delta = 0;

    if (phase === "waiting") {
      mistakes += 1;
      feedback.textContent = "Předčasně! Tohle byl jen kolega jdoucí pro kávu.";
      monitor.dataset.state = "mistake";
    } else if (round.kind === "boss" && outcome === "press") {
      const reaction = Math.max(0, Math.round(performance.now() - shownAt));
      reactions.push(reaction);
      delta = altTabReactionScore(reaction);
      score += delta;
      successful = true;
      feedback.textContent = reaction + " ms · +" + delta + " bodů. Tabulka zachráněna!";
      monitor.dataset.state = "success";
    } else if (round.kind === "safe" && outcome === "timeout") {
      delta = 350;
      score += delta;
      successful = true;
      feedback.textContent = "+350 bodů · Slack úspěšně ignorován.";
      monitor.dataset.state = "success";
    } else if (round.kind === "boss") {
      missed += 1;
      feedback.textContent = "Pozdě! Šéf právě viděl otevřený turnaj v curlingu.";
      monitor.dataset.state = "mistake";
    } else {
      mistakes += 1;
      feedback.textContent = "Past! Kvůli běžné zprávě ses prozradil úplně sám.";
      monitor.dataset.state = "mistake";
    }

    phase = "resolved";
    roundPips.children[roundIndex].classList.add(successful ? "is-good" : "is-bad");
    updateScore();

    if (roundIndex + 1 >= rounds.length) {
      schedule(finish, 850);
    } else {
      schedule(beginRound, 800);
    }
  }

  function showSignal(expectedRound) {
    if (finished || phase !== "waiting" || roundIndex !== expectedRound) return;
    const round = rounds[roundIndex];
    phase = "signal";
    shownAt = performance.now();

    if (round.kind === "boss") {
      monitor.dataset.state = "boss";
      alertIcon.textContent = "👔";
      alertTitle.textContent = "ŠÉF ZA ZÁDY!";
      alertCopy.textContent = "Teď! Přepni na důležitě vypadající tabulku.";
    } else {
      monitor.dataset.state = "safe";
      alertIcon.textContent = "💬";
      alertTitle.textContent = "Slack: oběd?";
      alertCopy.textContent = "Tohle není šéf. Zachovej chladnou hlavu.";
    }

    schedule(function () {
      if (roundIndex === expectedRound) resolveRound("timeout");
    }, round.window);
  }

  function beginRound() {
    if (finished) return;
    roundIndex += 1;
    phase = "waiting";
    monitor.dataset.state = "working";
    alertIcon.textContent = "⌛";
    alertTitle.textContent = "Kolo " + (roundIndex + 1) + " z " + rounds.length;
    alertCopy.textContent = "Pracuj nenápadně a čekej…";
    feedback.textContent = "Ruce v pohotovosti. Panika až na povel.";
    roundPips.children[roundIndex].classList.add("is-current");
    const expectedRound = roundIndex;
    schedule(function () { showSignal(expectedRound); }, rounds[roundIndex].wait);
  }

  function press() {
    if (finished || phase === "resolved" || phase === "idle") return;
    resolveRound("press");
  }

  function onKeyDown(event) {
    if (event.code !== "Space") return;
    event.preventDefault();
    press();
  }

  button.addEventListener("click", press);
  window.addEventListener("keydown", onKeyDown);
  schedule(beginRound, 450);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      button.removeEventListener("click", press);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

function startSpreadsheetBattleship(context) {
  const localRole = context.localRole;
  const fleets = [buildBattleshipFleet(context.seed, 0), buildBattleshipFleet(context.seed, 1)];
  const shots = [new Set(), new Set()];
  const timers = [];
  const botRandom = createRng("battleship-bot:" + context.seed);
  let turnOwner = 0;
  let sequence = 0;
  let finished = false;

  context.setRoundLabel("2 lodě · mřížka 6 × 6");
  context.stage.innerHTML = `
    <div class="battleship-shell">
      <div class="battleship-status" role="status" aria-live="polite">
        <span class="eyebrow">Tabulková námořní bitva</span>
        <h3>Růžový tým zahajuje audit</h3>
        <p>Zásah dává další tah. Minutí předává slovo soupeři.</p>
      </div>
      <div class="battleship-boards">
        <section>
          <div class="battleship-board-heading"><strong>Cizí kalendář</strong><span class="enemy-fleet">5 bloků zbývá</span></div>
          <div class="battleship-grid enemy-grid" role="grid" aria-label="Mřížka soupeře"></div>
        </section>
        <section>
          <div class="battleship-board-heading"><strong>Tvůj kalendář</strong><span class="own-fleet">2 meetingy plují</span></div>
          <div class="battleship-grid own-grid" role="grid" aria-label="Vlastní mřížka"></div>
        </section>
      </div>
      <div class="battleship-legend"><span><i class="ship"></i> meeting</span><span><i class="hit"></i> zásah</span><span><i class="miss"></i> voda</span></div>
    </div>`;

  const heading = context.stage.querySelector(".battleship-status h3");
  const status = context.stage.querySelector(".battleship-status p");
  const enemyGrid = context.stage.querySelector(".enemy-grid");
  const ownGrid = context.stage.querySelector(".own-grid");
  const enemyFleetLabel = context.stage.querySelector(".enemy-fleet");
  const ownFleetLabel = context.stage.querySelector(".own-fleet");

  function ownerName(owner) {
    return owner === localRole ? "Ty" : context.names[owner];
  }

  function targetFleet(owner) {
    return fleets[1 - owner];
  }

  function hitCount(owner) {
    const occupied = new Set(targetFleet(owner).flat());
    let hits = 0;
    shots[owner].forEach(function (cell) { if (occupied.has(cell)) hits += 1; });
    return hits;
  }

  function sunkCount(owner) {
    return targetFleet(owner).filter(function (ship) {
      return ship.every(function (cell) { return shots[owner].has(cell); });
    }).length;
  }

  function cellLabel(cell) {
    const column = String.fromCharCode(65 + cell % BATTLESHIP.size);
    const row = Math.floor(cell / BATTLESHIP.size) + 1;
    return column + row;
  }

  function isSunkCell(fleet, receivedShots, cell) {
    return fleet.some(function (ship) {
      return ship.includes(cell) && ship.every(function (shipCell) { return receivedShots.has(shipCell); });
    });
  }

  function renderGrid(container, shotOwner, fleetOwner, interactive) {
    const fragment = document.createDocumentFragment();
    const fired = shots[shotOwner];
    const fleet = fleets[fleetOwner];
    const occupied = new Set(fleet.flat());

    for (let cell = 0; cell < BATTLESHIP.size * BATTLESHIP.size; cell += 1) {
      const button = document.createElement("button");
      const wasFired = fired.has(cell);
      const hit = wasFired && occupied.has(cell);
      button.type = "button";
      button.className = "battleship-cell";
      button.dataset.cell = String(cell);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", cellLabel(cell) + (wasFired ? hit ? ", zásah" : ", voda" : interactive ? ", vystřelit" : occupied.has(cell) ? ", vlastní meeting" : ", prázdné"));

      if (!interactive && occupied.has(cell)) button.classList.add("is-ship");
      if (wasFired) button.classList.add(hit ? "is-hit" : "is-miss");
      if (hit && isSunkCell(fleet, fired, cell)) button.classList.add("is-sunk");
      if (!interactive || finished || turnOwner !== localRole || wasFired) button.setAttribute("aria-disabled", "true");
      if (interactive) {
        button.addEventListener("click", function () {
          performShot(localRole, sequence, cell, true);
        });
      }
      fragment.append(button);
    }
    container.replaceChildren(fragment);
  }

  function render() {
    renderGrid(enemyGrid, localRole, 1 - localRole, true);
    renderGrid(ownGrid, 1 - localRole, localRole, false);
    const enemyRemaining = BATTLESHIP.totalDecks - hitCount(localRole);
    const ownRemaining = BATTLESHIP.totalDecks - hitCount(1 - localRole);
    enemyFleetLabel.textContent = enemyRemaining + " " + (enemyRemaining === 1 ? "blok zbývá" : "bloků zbývá");
    ownFleetLabel.textContent = ownRemaining + " " + (ownRemaining === 1 ? "blok zbývá" : "bloků zbývá");
    context.setScores(hitCount(localRole), hitCount(1 - localRole));
  }

  function complete(winner) {
    if (finished) return;
    finished = true;
    render();
    heading.textContent = ownerName(winner) + (winner === localRole ? " potápíš poslední meeting!" : " potápí poslední meeting!");
    status.textContent = "Audit uzavřen. Všechny pozvánky byly nenávratně archivovány.";
    timers.push(window.setTimeout(function () {
      const results = [0, 1].map(function (owner) {
        return {
          score: owner === winner ? 1 : 0,
          hits: hitCount(owner),
          shots: shots[owner].size,
          sunk: sunkCount(owner)
        };
      });
      context.finishShared(results);
    }, 750));
  }

  function scheduleBot() {
    if (context.mode !== "practice" || finished || turnOwner !== 1) return;
    timers.push(window.setTimeout(function () {
      if (finished || turnOwner !== 1) return;
      const available = [];
      for (let cell = 0; cell < BATTLESHIP.size * BATTLESHIP.size; cell += 1) {
        if (!shots[1].has(cell)) available.push(cell);
      }
      if (!available.length) return;

      const possibleNeighbors = [];
      shots[1].forEach(function (cell) {
        if (!fleets[0].flat().includes(cell)) return;
        const x = cell % BATTLESHIP.size;
        const y = Math.floor(cell / BATTLESHIP.size);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (offset) {
          const nextX = x + offset[0];
          const nextY = y + offset[1];
          const next = nextY * BATTLESHIP.size + nextX;
          if (nextX >= 0 && nextX < BATTLESHIP.size && nextY >= 0 && nextY < BATTLESHIP.size && !shots[1].has(next)) {
            possibleNeighbors.push(next);
          }
        });
      });
      const pool = possibleNeighbors.length ? possibleNeighbors : available;
      const cell = pool[Math.floor(botRandom() * pool.length)];
      performShot(1, sequence, cell, false);
    }, 620 + Math.round(botRandom() * 520)));
  }

  function performShot(owner, incomingSequence, cell, shouldSend) {
    if (finished || owner !== turnOwner || incomingSequence !== sequence || !Number.isInteger(cell) || cell < 0 || cell >= BATTLESHIP.size * BATTLESHIP.size || shots[owner].has(cell)) return false;
    shots[owner].add(cell);
    const result = battleshipShotResult(targetFleet(owner), shots[owner], cell);

    if (shouldSend && context.mode === "online") {
      context.send({ type: "game:battleship-shot", owner, sequence, cell });
    }
    sequence += 1;

    if (result.hit) {
      heading.textContent = result.sunk ? "Meeting potopen!" : "Zásah do kalendáře!";
      status.textContent = ownerName(owner) + " trefuje " + cellLabel(cell) + " a pokračuje dalším tahem.";
    } else {
      turnOwner = 1 - turnOwner;
      heading.textContent = turnOwner === localRole ? "Jsi na tahu" : "Na tahu je " + ownerName(turnOwner);
      status.textContent = ownerName(owner) + " na " + cellLabel(cell) + " našel jen volný čas. Tah se střídá.";
    }

    render();
    if (result.fleetSunk) {
      complete(owner);
    } else {
      scheduleBot();
    }
    return true;
  }

  heading.textContent = turnOwner === localRole ? "Jsi na tahu" : "Začíná " + ownerName(turnOwner);
  status.textContent = turnOwner === localRole
    ? "Klikni do soupeřova kalendáře. Zásah ti nechá další tah."
    : "Soupeř vybírá první podezřelý blok v tabulce.";
  render();
  scheduleBot();

  return {
    receiveNetwork: function (message) {
      if (!message || message.type !== "game:battleship-shot" || message.owner !== 1 - localRole) return;
      performShot(message.owner, message.sequence, message.cell, false);
    },
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
    }
  };
}

function startTaskStack(context) {
  const columns = TASK_STACK.columns;
  const rows = TASK_STACK.rows;
  const cellSize = 30;
  const timers = [];
  const garbageRandom = createRng("task-garbage:" + context.seed + ":" + context.localRole);
  let animationFrame = 0;
  let gravityTimer = 0;
  let finishTimer = 0;
  let board = Array.from({ length: rows }, function () { return Array(columns).fill(0); });
  let piece = null;
  let bag = [];
  let bagIndex = 0;
  let nextKind = "";
  let score = 0;
  let clearedLines = 0;
  let sentLines = 0;
  let garbageSequence = 0;
  let lastRemoteGarbage = -1;
  let finished = false;
  const startedAt = performance.now();

  context.setRoundLabel("40 sekund · urgentní úkoly");
  context.stage.innerHTML = `
    <div class="taskstack-shell">
      <div class="taskstack-board-wrap">
        <canvas class="taskstack-canvas" width="300" height="540" tabindex="0" aria-label="Hrací plocha Task Stack. Ovládání šipkami, mezerník položí dílek."></canvas>
        <div class="taskstack-overlay" hidden><strong>Inbox přetekl</strong><span>Čekáme na výsledek soupeře…</span></div>
      </div>
      <aside class="taskstack-sidebar">
        <span class="eyebrow">Task Stack</span>
        <h3>Skládej úkoly. Maž řádky.</h3>
        <div class="taskstack-stats">
          <div><small>Čas</small><strong class="task-time">40,0</strong></div>
          <div><small>Řádky</small><strong class="task-lines">0</strong></div>
          <div><small>Další</small><strong class="task-next">—</strong></div>
          <div><small>Odesláno</small><strong class="task-sent">0</strong></div>
        </div>
        <p class="taskstack-status" role="status" aria-live="polite">Každý smazaný řádek pošle soupeři urgentní práci.</p>
        <p class="taskstack-help">← → posun · ↑ otočit · ↓ zrychlit · mezerník položit</p>
      </aside>
      <div class="taskstack-controls" role="group" aria-label="Ovládání Task Stack">
        <button type="button" data-task-action="left" aria-label="Doleva">←</button>
        <button type="button" data-task-action="rotate" aria-label="Otočit">↻</button>
        <button type="button" data-task-action="right" aria-label="Doprava">→</button>
        <button type="button" data-task-action="down" aria-label="Dolů">↓</button>
        <button type="button" data-task-action="drop" aria-label="Položit">⇊</button>
      </div>
    </div>`;

  const shell = context.stage.querySelector(".taskstack-shell");
  const canvas = context.stage.querySelector(".taskstack-canvas");
  const drawing = canvas.getContext("2d");
  const overlay = context.stage.querySelector(".taskstack-overlay");
  const timeLabel = context.stage.querySelector(".task-time");
  const linesLabel = context.stage.querySelector(".task-lines");
  const nextLabel = context.stage.querySelector(".task-next");
  const sentLabel = context.stage.querySelector(".task-sent");
  const status = context.stage.querySelector(".taskstack-status");
  const colors = {
    I: "#48a7ff",
    O: "#ffd51f",
    T: "#b86cff",
    L: "#ff8b32",
    J: "#315ee8",
    S: "#55e895",
    Z: "#ff4f70",
    garbage: "#566174"
  };

  function takeKind() {
    if (!bag.length) {
      bag = buildTaskBag(context.seed, bagIndex);
      bagIndex += 1;
    }
    return bag.shift();
  }

  function ensureNext() {
    if (!nextKind) nextKind = takeKind();
    nextLabel.textContent = nextKind;
  }

  function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
  }

  function canPlace(matrix, x, y) {
    for (let matrixY = 0; matrixY < matrix.length; matrixY += 1) {
      for (let matrixX = 0; matrixX < matrix[matrixY].length; matrixX += 1) {
        if (!matrix[matrixY][matrixX]) continue;
        const boardX = x + matrixX;
        const boardY = y + matrixY;
        if (boardX < 0 || boardX >= columns || boardY >= rows) return false;
        if (boardY >= 0 && board[boardY][boardX]) return false;
      }
    }
    return true;
  }

  function spawnPiece() {
    ensureNext();
    const kind = nextKind;
    nextKind = takeKind();
    nextLabel.textContent = nextKind;
    const matrix = cloneMatrix(TASK_PIECES[kind]);
    piece = {
      kind,
      matrix,
      x: Math.floor((columns - matrix[0].length) / 2),
      y: 0
    };
    if (!canPlace(piece.matrix, piece.x, piece.y)) finishGame(true);
  }

  function rotateMatrix(matrix) {
    return matrix[0].map(function (_, column) {
      return matrix.map(function (row) { return row[column]; }).reverse();
    });
  }

  function move(horizontal, vertical) {
    if (finished || !piece || !canPlace(piece.matrix, piece.x + horizontal, piece.y + vertical)) return false;
    piece.x += horizontal;
    piece.y += vertical;
    draw();
    return true;
  }

  function rotate() {
    if (finished || !piece) return;
    const rotated = rotateMatrix(piece.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (let index = 0; index < kicks.length; index += 1) {
      if (!canPlace(rotated, piece.x + kicks[index], piece.y)) continue;
      piece.matrix = rotated;
      piece.x += kicks[index];
      draw();
      return;
    }
  }

  function lockPiece() {
    if (finished || !piece) return;
    let overflow = false;
    piece.matrix.forEach(function (row, matrixY) {
      row.forEach(function (occupied, matrixX) {
        if (!occupied) return;
        const boardY = piece.y + matrixY;
        const boardX = piece.x + matrixX;
        if (boardY < 0) {
          overflow = true;
        } else {
          board[boardY][boardX] = piece.kind;
        }
      });
    });
    if (overflow) {
      finishGame(true);
      return;
    }

    const cleared = clearTaskRows(board);
    board = cleared.board;
    if (cleared.cleared) {
      const scoreTable = [0, 100, 300, 500, 800];
      const delta = scoreTable[Math.min(4, cleared.cleared)];
      const attack = Math.min(3, cleared.cleared);
      score += delta;
      clearedLines += cleared.cleared;
      sentLines += attack;
      linesLabel.textContent = String(clearedLines);
      sentLabel.textContent = String(sentLines);
      status.textContent = "+" + delta + " bodů · soupeři letí " + attack + " urgentní " + (attack === 1 ? "řádek" : "řádky") + ".";
      context.publishScore(score);
      if (context.mode === "online") {
        const hole = Math.floor(garbageRandom() * columns);
        context.send({ type: "game:taskstack-garbage", sequence: garbageSequence, lines: attack, hole });
        garbageSequence += 1;
      }
    }
    spawnPiece();
    draw();
  }

  function stepDown() {
    if (finished || !piece) return;
    if (!move(0, 1)) lockPiece();
  }

  function hardDrop() {
    if (finished || !piece) return;
    while (canPlace(piece.matrix, piece.x, piece.y + 1)) piece.y += 1;
    lockPiece();
  }

  function applyGarbage(lines, hole) {
    if (finished || !piece) return;
    const result = addTaskGarbage(board, lines, hole);
    board = result.board;
    piece.y -= lines;
    status.textContent = "Soupeř poslal " + lines + " urgentní " + (lines === 1 ? "řádek" : "řádky") + ". Priority byly přepsány.";
    if (result.overflow || !canPlace(piece.matrix, piece.x, piece.y)) {
      finishGame(true);
      return;
    }
    draw();
  }

  function drawCell(x, y, color, alpha) {
    drawing.save();
    drawing.globalAlpha = alpha === undefined ? 1 : alpha;
    drawing.fillStyle = color;
    drawing.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    drawing.strokeStyle = "rgba(17,17,17,.7)";
    drawing.lineWidth = 2;
    drawing.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    drawing.restore();
  }

  function drawPiece(activePiece, yOverride, alpha) {
    if (!activePiece) return;
    activePiece.matrix.forEach(function (row, matrixY) {
      row.forEach(function (occupied, matrixX) {
        const y = (yOverride === undefined ? activePiece.y : yOverride) + matrixY;
        if (occupied && y >= 0) drawCell(activePiece.x + matrixX, y, colors[activePiece.kind], alpha);
      });
    });
  }

  function draw() {
    drawing.fillStyle = "#0b1730";
    drawing.fillRect(0, 0, canvas.width, canvas.height);
    drawing.strokeStyle = "rgba(255,255,255,.07)";
    drawing.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) {
      drawing.beginPath();
      drawing.moveTo(x * cellSize, 0);
      drawing.lineTo(x * cellSize, canvas.height);
      drawing.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      drawing.beginPath();
      drawing.moveTo(0, y * cellSize);
      drawing.lineTo(canvas.width, y * cellSize);
      drawing.stroke();
    }
    board.forEach(function (row, y) {
      row.forEach(function (value, x) {
        if (value) drawCell(x, y, colors[value] || colors.garbage);
      });
    });
    if (piece && !finished) {
      let ghostY = piece.y;
      while (canPlace(piece.matrix, piece.x, ghostY + 1)) ghostY += 1;
      drawPiece(piece, ghostY, .22);
      drawPiece(piece);
    }
  }

  function finishGame(topOut) {
    if (finished) return;
    finished = true;
    window.clearInterval(gravityTimer);
    window.clearTimeout(finishTimer);
    window.cancelAnimationFrame(animationFrame);
    overlay.hidden = false;
    overlay.querySelector("strong").textContent = topOut ? "Inbox přetekl" : "Směna skončila";
    overlay.querySelector("span").textContent = "Čekáme na výsledek soupeře…";
    context.finish({ score, lines: clearedLines, sent: sentLines, topOut: Boolean(topOut) });
  }

  function updateClock(now) {
    if (finished) return;
    const remaining = Math.max(0, TASK_STACK.durationMs - (now - startedAt));
    timeLabel.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function performAction(action) {
    if (action === "left") move(-1, 0);
    if (action === "right") move(1, 0);
    if (action === "down") stepDown();
    if (action === "rotate") rotate();
    if (action === "drop") hardDrop();
  }

  function onKeyDown(event) {
    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowUp: "rotate",
      Space: "drop"
    };
    const action = actions[event.code];
    if (!action) return;
    event.preventDefault();
    performAction(action);
  }

  function onControlClick(event) {
    const button = event.target.closest("[data-task-action]");
    if (!button) return;
    canvas.focus({ preventScroll: true });
    performAction(button.dataset.taskAction);
  }

  window.addEventListener("keydown", onKeyDown);
  shell.addEventListener("click", onControlClick);
  canvas.addEventListener("pointerdown", function () { canvas.focus({ preventScroll: true }); });
  ensureNext();
  spawnPiece();
  draw();
  canvas.focus({ preventScroll: true });
  gravityTimer = window.setInterval(stepDown, 620);
  finishTimer = window.setTimeout(function () { finishGame(false); }, TASK_STACK.durationMs);
  animationFrame = window.requestAnimationFrame(updateClock);

  if (context.mode === "practice") {
    [10_000, 21_500, 32_500].forEach(function (delay, index) {
      timers.push(window.setTimeout(function () {
        if (!finished) applyGarbage(index === 2 ? 2 : 1, Math.floor(garbageRandom() * columns));
      }, delay));
    });
  }

  return {
    receiveNetwork: function (message) {
      if (!message || message.type !== "game:taskstack-garbage" || !Number.isInteger(message.sequence)
        || message.sequence <= lastRemoteGarbage || !Number.isInteger(message.lines) || message.lines < 1
        || message.lines > 3 || !Number.isInteger(message.hole) || message.hole < 0 || message.hole >= columns) return;
      lastRemoteGarbage = message.sequence;
      applyGarbage(message.lines, message.hole);
    },
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.clearInterval(gravityTimer);
      window.clearTimeout(finishTimer);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      shell.removeEventListener("click", onControlClick);
    }
  };
}

function startInboxPong(context) {
  const localRole = context.localRole;
  const isAuthority = localRole === 0;
  const timers = [];
  const pongState = {
    ball: createPongBall(context.seed, 0),
    paddles: [
      (PONG.height - PONG.paddleHeight) / 2,
      (PONG.height - PONG.paddleHeight) / 2
    ],
    scores: [0, 0]
  };
  let animationFrame = 0;
  let previousFrame = performance.now();
  let pausedUntil = performance.now() + 700;
  let snapshotAt = 0;
  let snapshotTick = 0;
  let receivedTick = -1;
  let inputSequence = 0;
  let receivedInputSequence = -1;
  let serveNumber = 0;
  let rally = 0;
  let bestRally = 0;
  let finished = false;
  let ending = false;

  context.setRoundLabel("První na 5 e-mailů");
  context.stage.innerHTML = `
    <div class="pong-shell">
      <div class="pong-board-wrap">
        <canvas class="pong-canvas" width="800" height="450" tabindex="0" aria-label="Inbox Pong. Pohybuj inboxem nahoru a dolů pomocí šipek nebo dotykem."></canvas>
      </div>
      <aside class="pong-sidebar">
        <span class="eyebrow">Inbox Pong</span>
        <h3>Nenech urgentní mail propadnout.</h3>
        <p class="pong-status" role="status" aria-live="polite">Připravuji velmi důležitou elektronickou poštu…</p>
        <div class="pong-mini-score"><strong>0</strong><span>:</span><strong>0</strong></div>
        <div class="pong-rally"><small>Nejdelší výměna</small><b>0</b></div>
        <p class="pong-help">Pohyb myší nebo dotykem po hřišti. Klávesnice: ↑ ↓ nebo W S.</p>
        <div class="pong-controls" role="group" aria-label="Ovládání inboxu">
          <button type="button" data-pong-move="up" aria-label="Posunout nahoru">↑</button>
          <button type="button" data-pong-move="down" aria-label="Posunout dolů">↓</button>
        </div>
      </aside>
    </div>`;

  const shell = context.stage.querySelector(".pong-shell");
  const canvas = context.stage.querySelector(".pong-canvas");
  const drawing = canvas.getContext("2d");
  const status = context.stage.querySelector(".pong-status");
  const miniScores = context.stage.querySelectorAll(".pong-mini-score strong");
  const rallyLabel = context.stage.querySelector(".pong-rally b");

  function clampPaddle(y) {
    return Math.min(PONG.height - PONG.paddleHeight, Math.max(0, Number(y) || 0));
  }

  function updateScores() {
    context.setScores(pongState.scores[localRole], pongState.scores[1 - localRole]);
    miniScores[0].textContent = String(pongState.scores[localRole]);
    miniScores[1].textContent = String(pongState.scores[1 - localRole]);
    rallyLabel.textContent = String(bestRally);
  }

  function setLocalPaddle(y, shouldSend) {
    if (finished) return;
    pongState.paddles[localRole] = clampPaddle(y);
    if (shouldSend && context.mode === "online" && !isAuthority) {
      context.send({
        type: "game:pong-paddle",
        owner: localRole,
        sequence: inputSequence,
        y: pongState.paddles[localRole]
      });
      inputSequence += 1;
    }
  }

  function ownerName(owner) {
    return owner === localRole ? "Ty" : context.names[owner];
  }

  function resetBall() {
    serveNumber += 1;
    pongState.ball = createPongBall(context.seed, serveNumber);
    rally = 0;
    pausedUntil = performance.now() + 720;
  }

  function stateMessage() {
    return {
      type: "game:pong-state",
      tick: snapshotTick,
      ball: {
        x: pongState.ball.x,
        y: pongState.ball.y,
        vx: pongState.ball.vx,
        vy: pongState.ball.vy
      },
      paddles: pongState.paddles.slice(),
      scores: pongState.scores.slice(),
      rally,
      bestRally
    };
  }

  function broadcastState(force) {
    if (!isAuthority || context.mode !== "online") return;
    const now = performance.now();
    if (!force && now - snapshotAt < 45) return;
    snapshotAt = now;
    snapshotTick += 1;
    context.send(stateMessage());
  }

  function complete(winner, broadcast) {
    if (finished) return;
    finished = true;
    ending = true;
    updateScores();
    status.textContent = ownerName(winner) + (winner === localRole ? " chytáš poslední urgentní mail!" : " chytá poslední urgentní mail!");
    const results = [0, 1].map(function (owner) {
      return {
        score: pongState.scores[owner],
        winner,
        bestRally
      };
    });
    if (broadcast && context.mode === "online") {
      context.send({
        type: "game:pong-finish",
        scores: pongState.scores.slice(),
        winner,
        bestRally
      });
    }
    context.finishShared(results);
  }

  function scorePoint(owner) {
    if (ending) return;
    pongState.scores[owner] += 1;
    updateScores();
    status.textContent = ownerName(owner) + " zachraňuje e-mail. HR zapisuje bod.";
    broadcastState(true);
    if (pongState.scores[owner] >= PONG.winningScore) {
      ending = true;
      timers.push(window.setTimeout(function () { complete(owner, true); }, 700));
    } else {
      resetBall();
    }
  }

  function updateBot(dt) {
    if (context.mode !== "practice") return;
    const target = pongState.ball.y - PONG.paddleHeight / 2 + Math.sin(performance.now() / 650) * 18;
    const difference = target - pongState.paddles[1];
    const maximum = 245 * dt;
    pongState.paddles[1] = clampPaddle(pongState.paddles[1] + Math.max(-maximum, Math.min(maximum, difference)));
  }

  function updateAuthority(now, dt) {
    updateBot(dt);
    if (ending || now < pausedUntil) {
      broadcastState(false);
      return;
    }
    const event = stepPong(pongState, dt);
    if (event && event.hit !== null) {
      rally += 1;
      bestRally = Math.max(bestRally, rally);
    }
    if (event && event.scored !== null) scorePoint(event.scored);
    broadcastState(false);
  }

  function drawEnvelope() {
    const ball = pongState.ball;
    drawing.save();
    drawing.translate(ball.x, ball.y);
    drawing.rotate(Math.atan2(ball.vy, ball.vx) * 0.12);
    drawing.fillStyle = "#ffd51f";
    drawing.strokeStyle = "#111";
    drawing.lineWidth = 3;
    drawing.fillRect(-15, -11, 30, 22);
    drawing.strokeRect(-15, -11, 30, 22);
    drawing.beginPath();
    drawing.moveTo(-14, -9);
    drawing.lineTo(0, 2);
    drawing.lineTo(14, -9);
    drawing.stroke();
    drawing.restore();
  }

  function draw() {
    const gradient = drawing.createLinearGradient(0, 0, PONG.width, PONG.height);
    gradient.addColorStop(0, "#071a3d");
    gradient.addColorStop(0.5, "#102b55");
    gradient.addColorStop(1, "#071a3d");
    drawing.fillStyle = gradient;
    drawing.fillRect(0, 0, PONG.width, PONG.height);

    drawing.save();
    drawing.setLineDash([13, 13]);
    drawing.strokeStyle = "rgba(255,255,255,.34)";
    drawing.lineWidth = 3;
    drawing.beginPath();
    drawing.moveTo(PONG.width / 2, 18);
    drawing.lineTo(PONG.width / 2, PONG.height - 18);
    drawing.stroke();
    drawing.restore();

    drawing.fillStyle = "rgba(255,255,255,.06)";
    drawing.font = "900 64px Arial";
    drawing.textAlign = "center";
    drawing.fillText(String(pongState.scores[0]), PONG.width * 0.36, 82);
    drawing.fillText(String(pongState.scores[1]), PONG.width * 0.64, 82);

    pongState.paddles.forEach(function (paddleY, owner) {
      const x = owner === 0 ? PONG.paddleInset : PONG.width - PONG.paddleInset - PONG.paddleWidth;
      drawing.fillStyle = owner === 0 ? "#ff0f7b" : "#48a7ff";
      drawing.strokeStyle = "#fff";
      drawing.lineWidth = 3;
      drawing.fillRect(x, paddleY, PONG.paddleWidth, PONG.paddleHeight);
      drawing.strokeRect(x, paddleY, PONG.paddleWidth, PONG.paddleHeight);
    });
    drawEnvelope();

    drawing.fillStyle = "rgba(255,255,255,.68)";
    drawing.font = "900 13px Arial";
    drawing.textAlign = "left";
    drawing.fillText("INBOX", 18, PONG.height - 17);
    drawing.textAlign = "right";
    drawing.fillText("INBOX", PONG.width - 18, PONG.height - 17);
  }

  function frame(now) {
    if (finished) return;
    const dt = Math.min(.05, Math.max(0, (now - previousFrame) / 1000));
    previousFrame = now;
    if (isAuthority) updateAuthority(now, dt);
    draw();
    animationFrame = window.requestAnimationFrame(frame);
  }

  function pointerToPaddle(event) {
    const bounds = canvas.getBoundingClientRect();
    const y = (event.clientY - bounds.top) / bounds.height * PONG.height - PONG.paddleHeight / 2;
    setLocalPaddle(y, true);
  }

  function onPointerMove(event) {
    if (event.pointerType === "mouse" && event.buttons === 0) return;
    event.preventDefault();
    pointerToPaddle(event);
  }

  function onPointerDown(event) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    pointerToPaddle(event);
    canvas.focus({ preventScroll: true });
  }

  function onKeyDown(event) {
    if (!["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) return;
    event.preventDefault();
    const direction = event.code === "ArrowUp" || event.code === "KeyW" ? -1 : 1;
    setLocalPaddle(pongState.paddles[localRole] + direction * 34, true);
  }

  function onControls(event) {
    const button = event.target.closest("[data-pong-move]");
    if (!button) return;
    const direction = button.dataset.pongMove === "up" ? -1 : 1;
    setLocalPaddle(pongState.paddles[localRole] + direction * 48, true);
    canvas.focus({ preventScroll: true });
  }

  function receiveState(message) {
    if (isAuthority || !Number.isInteger(message.tick) || message.tick <= receivedTick
      || !message.ball || ![message.ball.x, message.ball.y, message.ball.vx, message.ball.vy].every(Number.isFinite)
      || !Array.isArray(message.paddles) || message.paddles.length !== 2 || !message.paddles.every(Number.isFinite)
      || !Array.isArray(message.scores) || message.scores.length !== 2
      || !message.scores.every(function (score) { return Number.isInteger(score) && score >= 0 && score <= PONG.winningScore; })) return;
    receivedTick = message.tick;
    pongState.ball = {
      x: Math.min(PONG.width + 30, Math.max(-30, message.ball.x)),
      y: Math.min(PONG.height, Math.max(0, message.ball.y)),
      vx: Math.min(800, Math.max(-800, message.ball.vx)),
      vy: Math.min(800, Math.max(-800, message.ball.vy))
    };
    pongState.paddles = message.paddles.map(clampPaddle);
    pongState.scores = message.scores.slice();
    rally = Math.max(0, Math.min(999, Math.round(Number(message.rally) || 0)));
    bestRally = Math.max(0, Math.min(999, Math.round(Number(message.bestRally) || 0)));
    updateScores();
    status.textContent = "Přímé spojení drží. Inboxy se plní v reálném čase.";
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("keydown", onKeyDown);
  shell.addEventListener("click", onControls);
  updateScores();
  draw();
  canvas.focus({ preventScroll: true });
  status.textContent = context.mode === "practice"
    ? "Kolega-bot tvrdí, že všechny e-maily četl. Dokaž opak."
    : isAuthority ? "Jsi správce mailserveru. První servis právě startuje." : "Čekám na první zásilku od hostitele…";
  animationFrame = window.requestAnimationFrame(frame);

  return {
    receiveNetwork: function (message) {
      if (!message || finished) return;
      if (message.type === "game:pong-paddle" && isAuthority && message.owner === 1
        && Number.isInteger(message.sequence) && message.sequence > receivedInputSequence && Number.isFinite(message.y)) {
        receivedInputSequence = message.sequence;
        pongState.paddles[1] = clampPaddle(message.y);
      }
      if (message.type === "game:pong-state") receiveState(message);
      if (message.type === "game:pong-finish" && !isAuthority && Array.isArray(message.scores)
        && message.scores.length === 2 && message.scores.every(function (score) {
          return Number.isInteger(score) && score >= 0 && score <= PONG.winningScore;
        }) && (message.winner === 0 || message.winner === 1)) {
        pongState.scores = message.scores.slice();
        bestRally = Math.max(0, Math.min(999, Math.round(Number(message.bestRally) || 0)));
        complete(message.winner, false);
      }
    },
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      shell.removeEventListener("click", onControls);
    }
  };
}

function startMeetingEscape(context) {
  const course = buildEscapeCourse(context.seed);
  const handled = new Set();
  let animationFrame = 0;
  let jumpOffset = 0;
  let jumpVelocity = 0;
  let ducking = false;
  let crashes = 0;
  let coffees = 0;
  let score = 0;
  let distance = 0;
  let lastPublishedAt = 0;
  let invulnerableUntil = 0;
  let flashUntil = 0;
  let finished = false;
  const startedAt = performance.now();
  let previousFrame = startedAt;

  context.setRoundLabel("35 sekund útěku");
  context.stage.innerHTML = `
    <div class="escape-shell">
      <div class="escape-hud">
        <div><small>Do cíle</small><strong class="escape-time">35,0 s</strong></div>
        <div><small>Vzdálenost</small><strong class="escape-distance">0 m</strong></div>
        <div><small>Kolize</small><strong class="escape-crashes">0</strong></div>
        <div><small>Káva</small><strong class="escape-coffees">0</strong></div>
      </div>
      <div class="escape-board-wrap">
        <canvas class="escape-canvas" width="900" height="360" tabindex="0" aria-label="Meeting Escape. Přeskakuj meetingy a skrč se pod e-maily."></canvas>
        <div class="escape-progress" aria-hidden="true"><span></span></div>
      </div>
      <div class="escape-bottom">
        <p class="escape-status" role="status" aria-live="polite">Utíkej před meetingy. Káva obnovuje profesionální sebevědomí.</p>
        <div class="escape-controls" role="group" aria-label="Ovládání Meeting Escape">
          <button type="button" data-escape-action="jump">↑ Přeskočit</button>
          <button type="button" data-escape-action="duck">↓ Skrčit se</button>
        </div>
      </div>
    </div>`;

  const canvas = context.stage.querySelector(".escape-canvas");
  const drawing = canvas.getContext("2d");
  const timeLabel = context.stage.querySelector(".escape-time");
  const distanceLabel = context.stage.querySelector(".escape-distance");
  const crashLabel = context.stage.querySelector(".escape-crashes");
  const coffeeLabel = context.stage.querySelector(".escape-coffees");
  const progressBar = context.stage.querySelector(".escape-progress span");
  const status = context.stage.querySelector(".escape-status");
  const jumpButton = context.stage.querySelector("[data-escape-action=\"jump\"]");
  const duckButton = context.stage.querySelector("[data-escape-action=\"duck\"]");

  function currentPlayerRect() {
    const isDucking = ducking && jumpOffset <= 0;
    const height = isDucking ? ESCAPE.duckHeight : ESCAPE.playerHeight;
    return {
      x: ESCAPE.playerX,
      y: ESCAPE.groundY - height - jumpOffset,
      width: ESCAPE.playerWidth,
      height
    };
  }

  function obstacleRect(item, elapsed) {
    const x = ESCAPE.playerX + (item.at - elapsed) * ESCAPE.scrollSpeed;
    if (item.type === "meeting") {
      return { x, y: ESCAPE.groundY - 52, width: 48, height: 52 };
    }
    if (item.type === "reply") {
      return { x, y: ESCAPE.groundY - 78, width: 62, height: 34 };
    }
    return { x, y: ESCAPE.groundY - 126, width: 35, height: 35 };
  }

  function jump() {
    if (finished || jumpOffset > 1) return;
    ducking = false;
    jumpVelocity = 635;
    canvas.focus({ preventScroll: true });
  }

  function updateScore(elapsed, publish) {
    distance = Math.floor(elapsed * .108);
    score = Math.max(0, distance + coffees * 150 - crashes * 250);
    distanceLabel.textContent = distance + " m";
    crashLabel.textContent = String(crashes);
    coffeeLabel.textContent = String(coffees);
    if (publish || elapsed - lastPublishedAt >= 500) {
      lastPublishedAt = elapsed;
      context.publishScore(score);
    }
  }

  function handleObstacles(elapsed, now) {
    const player = currentPlayerRect();
    course.forEach(function (item) {
      if (handled.has(item.id)) return;
      const obstacle = obstacleRect(item, elapsed);
      if (obstacle.x + obstacle.width < ESCAPE.playerX - 12) {
        handled.add(item.id);
        return;
      }
      if (!rectanglesOverlap(player, obstacle)) return;

      handled.add(item.id);
      if (item.type === "coffee") {
        coffees += 1;
        status.textContent = "Káva chycena. Produktivita byla na okamžik obnovena.";
      } else if (now >= invulnerableUntil) {
        crashes += 1;
        invulnerableUntil = now + 900;
        flashUntil = now + 260;
        status.textContent = item.type === "meeting"
          ? "Kolize s meetingem bez agendy. −250 bodů."
          : "Zásah Reply All. Tohle už nejde vzít zpět. −250 bodů.";
      }
      updateScore(elapsed, true);
    });
  }

  function drawBackground(elapsed) {
    const gradient = drawing.createLinearGradient(0, 0, 0, ESCAPE.height);
    gradient.addColorStop(0, "#dff2ff");
    gradient.addColorStop(1, "#fff8e9");
    drawing.fillStyle = gradient;
    drawing.fillRect(0, 0, ESCAPE.width, ESCAPE.height);

    const offset = (elapsed * ESCAPE.scrollSpeed * .22) % 180;
    drawing.fillStyle = "rgba(7,26,61,.08)";
    for (let x = -offset; x < ESCAPE.width + 180; x += 180) {
      drawing.fillRect(x, 54, 112, 128);
      drawing.fillStyle = "rgba(255,255,255,.66)";
      drawing.fillRect(x + 12, 68, 39, 44);
      drawing.fillRect(x + 61, 68, 39, 44);
      drawing.fillStyle = "rgba(7,26,61,.08)";
    }

    drawing.fillStyle = "#d4aa72";
    drawing.fillRect(0, ESCAPE.groundY, ESCAPE.width, ESCAPE.height - ESCAPE.groundY);
    drawing.strokeStyle = "#111";
    drawing.lineWidth = 4;
    drawing.beginPath();
    drawing.moveTo(0, ESCAPE.groundY);
    drawing.lineTo(ESCAPE.width, ESCAPE.groundY);
    drawing.stroke();
    drawing.strokeStyle = "rgba(82,44,18,.18)";
    drawing.lineWidth = 2;
    for (let x = -(elapsed * ESCAPE.scrollSpeed) % 70; x < ESCAPE.width; x += 70) {
      drawing.beginPath();
      drawing.moveTo(x, ESCAPE.groundY);
      drawing.lineTo(x + 24, ESCAPE.height);
      drawing.stroke();
    }
  }

  function drawObstacle(item, rect) {
    drawing.save();
    if (handled.has(item.id)) drawing.globalAlpha = .34;
    if (item.type === "meeting") {
      drawing.fillStyle = item.variant === 0 ? "#ff5b4d" : item.variant === 1 ? "#ff0f7b" : "#b86cff";
      drawing.strokeStyle = "#111";
      drawing.lineWidth = 3;
      drawing.fillRect(rect.x, rect.y, rect.width, rect.height);
      drawing.strokeRect(rect.x, rect.y, rect.width, rect.height);
      drawing.fillStyle = "#fff";
      drawing.font = "900 12px Arial";
      drawing.textAlign = "center";
      drawing.fillText("MEET", rect.x + rect.width / 2, rect.y + 22);
      drawing.fillText("ING", rect.x + rect.width / 2, rect.y + 38);
    } else if (item.type === "reply") {
      drawing.fillStyle = "#ffd51f";
      drawing.strokeStyle = "#111";
      drawing.lineWidth = 3;
      drawing.fillRect(rect.x, rect.y, rect.width, rect.height);
      drawing.strokeRect(rect.x, rect.y, rect.width, rect.height);
      drawing.beginPath();
      drawing.moveTo(rect.x + 2, rect.y + 2);
      drawing.lineTo(rect.x + rect.width / 2, rect.y + 20);
      drawing.lineTo(rect.x + rect.width - 2, rect.y + 2);
      drawing.stroke();
      drawing.fillStyle = "#111";
      drawing.font = "900 9px Arial";
      drawing.textAlign = "center";
      drawing.fillText("REPLY ALL", rect.x + rect.width / 2, rect.y + 30);
    } else {
      drawing.font = "31px Arial";
      drawing.textAlign = "center";
      drawing.fillText("☕", rect.x + rect.width / 2, rect.y + 29);
    }
    drawing.restore();
  }

  function drawPlayer(now) {
    const player = currentPlayerRect();
    drawing.save();
    if (now < invulnerableUntil && Math.floor(now / 90) % 2 === 0) drawing.globalAlpha = .3;
    drawing.fillStyle = "#fff";
    drawing.strokeStyle = "#111";
    drawing.lineWidth = 3;
    drawing.fillRect(player.x, player.y, player.width, player.height);
    drawing.strokeRect(player.x, player.y, player.width, player.height);
    drawing.fillStyle = context.localRole === 1 ? "#48a7ff" : "#ff0f7b";
    drawing.fillRect(player.x + 4, player.y + 5, player.width - 8, 13);
    drawing.fillStyle = "#111";
    drawing.font = "900 11px Arial";
    drawing.textAlign = "center";
    drawing.fillText(ducking && jumpOffset <= 0 ? "OOO" : "RUN", player.x + player.width / 2, player.y + player.height - 10);
    drawing.restore();
  }

  function draw(elapsed, now) {
    drawBackground(elapsed);
    course.forEach(function (item) {
      const rect = obstacleRect(item, elapsed);
      if (rect.x > -90 && rect.x < ESCAPE.width + 80) drawObstacle(item, rect);
    });
    drawPlayer(now);
    if (now < flashUntil) {
      drawing.fillStyle = "rgba(201,34,27,.2)";
      drawing.fillRect(0, 0, ESCAPE.width, ESCAPE.height);
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    ducking = false;
    timeLabel.textContent = "0,0 s";
    progressBar.style.transform = "scaleX(1)";
    updateScore(ESCAPE.durationMs, true);
    status.textContent = "Únik dokončen. Kalendář byl preventivně označen jako nedostupný.";
    context.finish({ score, distance, crashes, coffees });
  }

  function frame(now) {
    if (finished) return;
    const elapsed = Math.min(ESCAPE.durationMs, now - startedAt);
    const dt = Math.min(.04, Math.max(0, (now - previousFrame) / 1000));
    previousFrame = now;

    if (jumpOffset > 0 || jumpVelocity > 0) {
      jumpOffset += jumpVelocity * dt;
      jumpVelocity -= 1540 * dt;
      if (jumpOffset <= 0) {
        jumpOffset = 0;
        jumpVelocity = 0;
      }
    }

    handleObstacles(elapsed, now);
    updateScore(elapsed, false);
    timeLabel.textContent = ((ESCAPE.durationMs - elapsed) / 1000).toFixed(1).replace(".", ",") + " s";
    progressBar.style.transform = "scaleX(" + (elapsed / ESCAPE.durationMs) + ")";
    draw(elapsed, now);
    if (elapsed >= ESCAPE.durationMs) {
      finish();
      return;
    }
    animationFrame = window.requestAnimationFrame(frame);
  }

  function onKeyDown(event) {
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      jump();
    }
    if (event.code === "ArrowDown") {
      event.preventDefault();
      ducking = true;
    }
  }

  function onKeyUp(event) {
    if (event.code !== "ArrowDown") return;
    event.preventDefault();
    ducking = false;
  }

  function onDuckStart(event) {
    event.preventDefault();
    ducking = true;
    canvas.focus({ preventScroll: true });
  }

  function onDuckEnd(event) {
    event.preventDefault();
    ducking = false;
  }

  function onCanvasPointer(event) {
    event.preventDefault();
    jump();
  }

  jumpButton.addEventListener("click", jump);
  duckButton.addEventListener("pointerdown", onDuckStart);
  duckButton.addEventListener("pointerup", onDuckEnd);
  duckButton.addEventListener("pointercancel", onDuckEnd);
  duckButton.addEventListener("pointerleave", onDuckEnd);
  canvas.addEventListener("pointerdown", onCanvasPointer);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  context.publishScore(0);
  draw(0, startedAt);
  canvas.focus({ preventScroll: true });
  animationFrame = window.requestAnimationFrame(frame);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      window.cancelAnimationFrame(animationFrame);
      jumpButton.removeEventListener("click", jump);
      duckButton.removeEventListener("pointerdown", onDuckStart);
      duckButton.removeEventListener("pointerup", onDuckEnd);
      duckButton.removeEventListener("pointercancel", onDuckEnd);
      duckButton.removeEventListener("pointerleave", onDuckEnd);
      canvas.removeEventListener("pointerdown", onCanvasPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    }
  };
}

function startJargonDecoder(context) {
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
        <div class="jargon-rounds" aria-label="Průběh kol"></div>
        <strong class="jargon-score">0 bodů</strong>
      </div>
      <div class="jargon-card">
        <span class="eyebrow">Interní komunikační standard</span>
        <h3>Zapamatuj a poskládej korporátní moudro</h3>
        <div class="jargon-preview" role="status" aria-live="polite">Načítám slovník stakeholderů…</div>
        <div class="jargon-answer" aria-label="Sestavená věta"><span>Zde vznikne tvoje věta</span></div>
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
    dot.setAttribute("aria-label", "Kolo " + (index + 1));
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
    if (finished || phase !== "solve" || roundIndex !== expectedRound) return;
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

function pointsWord(value) {
  if (value === 1) return "bod";
  if (value >= 2 && value <= 4) return "body";
  return "bodů";
}
