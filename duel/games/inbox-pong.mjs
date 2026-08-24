import { PONG, createPongBall, stepPong } from "../game-core.mjs";

export function startInboxPong(context) {
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
    const controlledPaddle = pongState.paddles[localRole];
    pongState.paddles = message.paddles.map(clampPaddle);
    pongState.paddles[localRole] = controlledPaddle;
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
