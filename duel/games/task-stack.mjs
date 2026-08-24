import { createRng } from "../game-core.mjs";
import { defineGame, normalizeScoreResult, safeSmallInteger } from "./shared.mjs";

export const taskStackGame = defineGame({
  id: "taskstack",
  meta: {
    icon: "🧱",
    title: "Task Stack",
    teaser: "Tetris s urgentními úkoly",
    difficulty: "arkáda",
    instruction: "Skládej padající úkoly. Smazané řádky pošlou soupeři urgentní práci.",
    scoreLabel: "bodů za úkoly"
  },
  start: startTaskStack,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});

function createPracticeResult(seed) {
  const random = createRng("practice-result:taskstack:" + seed);
  const lines = 3 + Math.floor(random() * 7);
  return {
    score: lines * 115 + Math.floor(random() * 420),
    lines,
    sent: Math.max(0, lines - 2),
    topOut: random() < 0.18
  };
}

function normalizeResult(result) {
  const normalized = normalizeScoreResult(result);
  if (!normalized) return null;
  normalized.lines = safeSmallInteger(result.lines, 100);
  normalized.sent = safeSmallInteger(result.sent, 100);
  normalized.topOut = Boolean(result.topOut);
  return normalized;
}

function formatResult(result) {
  return result.lines + " řádků · " + result.sent + " odesláno";
}

export function startTaskStack(context) {
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

export const TASK_STACK = Object.freeze({
  columns: 10,
  rows: 18,
  durationMs: 40_000
});

export const TASK_PIECES = Object.freeze({
  I: Object.freeze([[1, 1, 1, 1]]),
  O: Object.freeze([[1, 1], [1, 1]]),
  T: Object.freeze([[0, 1, 0], [1, 1, 1]]),
  L: Object.freeze([[0, 0, 1], [1, 1, 1]]),
  J: Object.freeze([[1, 0, 0], [1, 1, 1]]),
  S: Object.freeze([[0, 1, 1], [1, 1, 0]]),
  Z: Object.freeze([[1, 1, 0], [0, 1, 1]])
});

export function buildTaskBag(seed, bagIndex) {
  const random = createRng("task-bag:" + seed + ":" + bagIndex);
  const bag = Object.keys(TASK_PIECES);

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = bag[index];
    bag[index] = bag[swapIndex];
    bag[swapIndex] = value;
  }

  return bag;
}

export function clearTaskRows(board) {
  const columns = board[0] ? board[0].length : TASK_STACK.columns;
  const remaining = board.filter(function (row) {
    return !row.every(Boolean);
  }).map(function (row) { return row.slice(); });
  const cleared = board.length - remaining.length;

  while (remaining.length < board.length) {
    remaining.unshift(Array(columns).fill(0));
  }

  return { board: remaining, cleared };
}

export function addTaskGarbage(board, lines, hole) {
  const next = board.map(function (row) { return row.slice(); });
  const columns = next[0] ? next[0].length : TASK_STACK.columns;
  const safeLines = Math.min(4, Math.max(0, Math.floor(Number(lines) || 0)));
  const safeHole = Math.min(columns - 1, Math.max(0, Math.floor(Number(hole) || 0)));
  let overflow = false;

  for (let line = 0; line < safeLines; line += 1) {
    if (next[0] && next[0].some(Boolean)) overflow = true;
    next.shift();
    next.push(Array.from({ length: columns }, function (_, column) {
      return column === safeHole ? 0 : "garbage";
    }));
  }

  return { board: next, overflow };
}
