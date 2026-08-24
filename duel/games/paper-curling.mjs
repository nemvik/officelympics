import { CURLING, calculateCurlingScore, clampShotVelocity, createCurlingStone, makeBotCurlingShot, sanitizeCurlingStones, stepCurling } from "../game-core.mjs";
import { pointsWord } from "./shared.mjs";

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
