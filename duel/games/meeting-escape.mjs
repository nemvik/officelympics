import { createRng } from "../game-core.mjs";
import { defineGame, NOOP, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const meetingEscapeGame = defineGame({
  id: "escape",
  meta: {
    icon: "🏃",
    title: "Meeting Escape",
    teaser: "Uteč meetingům a sbírej kávu",
    difficulty: "běh",
    instruction: "Přeskakuj meetingy, skrč se pod Reply All a cestou sbírej kávu.",
    scoreLabel: "bodů za útěk"
  },
  start: startMeetingEscape,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});

function createPracticeResult(seed) {
  const random = createRng("practice-result:escape:" + seed);
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

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result);
  if (!normalized) return null;
  normalized.distance = safeSmallInteger(result.distance, 5000);
  normalized.crashes = safeSmallInteger(result.crashes, 50);
  normalized.coffees = safeSmallInteger(result.coffees, 50);
  return normalized;
}

function formatResult(result) {
  return result.distance + " m · " + result.coffees + "× káva · " + result.crashes + " kolizí";
}

export function startMeetingEscape(context) {
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

export const ESCAPE = Object.freeze({
  width: 900,
  height: 360,
  groundY: 292,
  playerX: 132,
  playerWidth: 42,
  playerHeight: 58,
  duckHeight: 31,
  durationMs: 35_000,
  scrollSpeed: 0.27
});

export function buildEscapeCourse(seed, durationMs = ESCAPE.durationMs) {
  const random = createRng("meeting-escape:" + seed);
  const course = [];
  let at = 1700;

  while (at < durationMs - 900) {
    const roll = random();
    const type = roll < 0.56 ? "meeting" : roll < 0.84 ? "reply" : "coffee";
    course.push({
      id: course.length,
      at: Math.round(at),
      type,
      variant: Math.floor(random() * 3)
    });
    at += 920 + random() * 720;
  }

  return course;
}

export function rectanglesOverlap(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}
