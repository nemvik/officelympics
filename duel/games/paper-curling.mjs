import { createRng } from "../game-core.mjs";
import { defineGame, normalizeScoreResult, pointsWord } from "./shared.mjs";

export const paperCurlingGame = defineGame({
  id: "curling",
  meta: {
    icon: "🗑️",
    title: "Papírový curling",
    teaser: "Tři koule, jeden kancelářský koš",
    difficulty: "taktika",
    instruction: "Střídejte se po jednom hodu. Bodují koule nejblíž středu kancelářského koše.",
    scoreLabel: "curlingových bodů"
  },
  start: startPaperCurling,
  result: {
    mode: "shared",
    normalize: normalizeResult,
    format: formatResult
  }
});

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result, 3);
  if (!normalized) return null;
  normalized.nearest = Number.isFinite(result.nearest) ? Math.min(1000, Math.max(0, result.nearest)) : null;
  return normalized;
}

function formatResult(result) {
  return result.score === 1 ? "1 curlingový bod" : result.score + " curlingové body";
}

export function startPaperCurling(context) {
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

export const CURLING = Object.freeze({
  width: 720,
  height: 880,
  ballRadius: 19,
  houseRadius: 108,
  targetX: 360,
  targetY: 166,
  launchX: 360,
  launchY: 730,
  inset: 24,
  friction: 190,
  wallBounce: 0.62,
  collisionBounce: 0.88,
  stopSpeed: 7,
  maxShotSpeed: 570,
  shotsPerPlayer: 3
});

export function createCurlingStone(owner, shotNumber) {
  return {
    id: "stone-" + shotNumber,
    owner,
    x: CURLING.launchX,
    y: CURLING.launchY,
    vx: 0,
    vy: 0,
    radius: CURLING.ballRadius
  };
}

export function clampShotVelocity(vx, vy) {
  let safeX = Number.isFinite(vx) ? vx : 0;
  let safeY = Number.isFinite(vy) ? vy : 0;
  const speed = Math.hypot(safeX, safeY);

  if (speed > CURLING.maxShotSpeed) {
    const scale = CURLING.maxShotSpeed / speed;
    safeX *= scale;
    safeY *= scale;
  }

  return { vx: safeX, vy: safeY };
}

function resolveWallCollision(stone) {
  const radius = stone.radius || CURLING.ballRadius;
  const minX = CURLING.inset + radius;
  const maxX = CURLING.width - CURLING.inset - radius;
  const minY = CURLING.inset + radius;
  const maxY = CURLING.height - CURLING.inset - radius;

  if (stone.x < minX) {
    stone.x = minX;
    stone.vx = Math.abs(stone.vx) * CURLING.wallBounce;
  } else if (stone.x > maxX) {
    stone.x = maxX;
    stone.vx = -Math.abs(stone.vx) * CURLING.wallBounce;
  }

  if (stone.y < minY) {
    stone.y = minY;
    stone.vy = Math.abs(stone.vy) * CURLING.wallBounce;
  } else if (stone.y > maxY) {
    stone.y = maxY;
    stone.vy = -Math.abs(stone.vy) * CURLING.wallBounce;
  }
}

function resolveStoneCollision(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  const minimum = (first.radius || CURLING.ballRadius) + (second.radius || CURLING.ballRadius);

  if (distance >= minimum) return;

  const safeDistance = distance || 0.0001;
  const nx = dx / safeDistance;
  const ny = dy / safeDistance;
  const overlap = minimum - safeDistance;

  first.x -= nx * overlap * 0.5;
  first.y -= ny * overlap * 0.5;
  second.x += nx * overlap * 0.5;
  second.y += ny * overlap * 0.5;

  const relativeX = second.vx - first.vx;
  const relativeY = second.vy - first.vy;
  const normalSpeed = relativeX * nx + relativeY * ny;

  if (normalSpeed >= 0) return;

  const impulse = -(1 + CURLING.collisionBounce) * normalSpeed / 2;
  const impulseX = impulse * nx;
  const impulseY = impulse * ny;

  first.vx -= impulseX;
  first.vy -= impulseY;
  second.vx += impulseX;
  second.vy += impulseY;
}

export function stepCurling(stones, dt) {
  const safeDt = Math.min(Math.max(Number(dt) || 0, 0), 1 / 30);

  stones.forEach(function (stone) {
    stone.x += stone.vx * safeDt;
    stone.y += stone.vy * safeDt;

    const speed = Math.hypot(stone.vx, stone.vy);
    if (speed > 0) {
      const nextSpeed = Math.max(0, speed - CURLING.friction * safeDt);
      const scale = nextSpeed / speed;
      stone.vx *= scale;
      stone.vy *= scale;
    }

    resolveWallCollision(stone);
  });

  for (let firstIndex = 0; firstIndex < stones.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < stones.length; secondIndex += 1) {
      resolveStoneCollision(stones[firstIndex], stones[secondIndex]);
    }
  }

  let moving = false;
  stones.forEach(function (stone) {
    const speed = Math.hypot(stone.vx, stone.vy);
    if (speed < CURLING.stopSpeed) {
      stone.vx = 0;
      stone.vy = 0;
    } else {
      moving = true;
    }
  });

  return moving;
}

export function sanitizeCurlingStones(value) {
  if (!Array.isArray(value)) return null;
  const maxStones = CURLING.shotsPerPlayer * 2;
  if (value.length > maxStones) return null;

  const stones = [];
  for (let index = 0; index < value.length; index += 1) {
    const source = value[index];
    if (!source || (source.owner !== 0 && source.owner !== 1)) return null;
    if (![source.x, source.y, source.vx, source.vy].every(Number.isFinite)) return null;

    stones.push({
      id: "stone-" + index,
      owner: source.owner,
      x: Math.min(CURLING.width, Math.max(0, source.x)),
      y: Math.min(CURLING.height, Math.max(0, source.y)),
      vx: 0,
      vy: 0,
      radius: CURLING.ballRadius
    });
  }

  return stones;
}

export function calculateCurlingScore(stones) {
  const inHouse = stones
    .map(function (stone) {
      return {
        owner: stone.owner,
        distance: Math.hypot(stone.x - CURLING.targetX, stone.y - CURLING.targetY)
      };
    })
    .filter(function (stone) { return stone.distance <= CURLING.houseRadius + CURLING.ballRadius; })
    .sort(function (first, second) { return first.distance - second.distance; });

  if (!inHouse.length) return { scores: [0, 0], winner: null, nearest: null };
  if (inHouse.length > 1 && Math.abs(inHouse[0].distance - inHouse[1].distance) < 0.5
    && inHouse[0].owner !== inHouse[1].owner) {
    return { scores: [0, 0], winner: null, nearest: inHouse[0].distance };
  }

  const winner = inHouse[0].owner;
  const nearestOpponent = inHouse.find(function (stone) { return stone.owner !== winner; });
  const cutoff = nearestOpponent ? nearestOpponent.distance : Infinity;
  const points = inHouse.filter(function (stone) {
    return stone.owner === winner && stone.distance < cutoff;
  }).length;
  const scores = [0, 0];
  scores[winner] = points;

  return { scores, winner, nearest: inHouse[0].distance };
}

export function makeBotCurlingShot(seed, shotNumber, stones) {
  const random = createRng("curling-bot:" + seed + ":" + shotNumber);
  const opponentStone = stones
    .filter(function (stone) { return stone.owner === 0; })
    .sort(function (first, second) {
      const firstDistance = Math.hypot(first.x - CURLING.targetX, first.y - CURLING.targetY);
      const secondDistance = Math.hypot(second.x - CURLING.targetX, second.y - CURLING.targetY);
      return firstDistance - secondDistance;
    })[0];

  const attacksOpponent = opponentStone && random() < 0.32;
  const targetX = attacksOpponent ? opponentStone.x : CURLING.targetX + (random() - 0.5) * 54;
  const targetY = attacksOpponent ? opponentStone.y : CURLING.targetY + (random() - 0.5) * 42;
  const dx = targetX - CURLING.launchX;
  const dy = targetY - CURLING.launchY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const idealSpeed = Math.sqrt(2 * CURLING.friction * distance) * (0.98 + random() * 0.08);

  return clampShotVelocity(
    dx / distance * idealSpeed + (random() - 0.5) * 18,
    dy / distance * idealSpeed + (random() - 0.5) * 12
  );
}
