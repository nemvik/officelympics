import { createRng } from "../game-core.mjs";
import {
  czechCount,
  defineGame,
  NOOP,
  normalizeScoreResult,
  pointsWord,
  safeSmallInteger
} from "./shared.mjs";

export const CURSOR_MAZE = Object.freeze({
  rounds: 2,
  columns: 8,
  rows: 5,
  width: 640,
  height: 400,
  roundDurationMs: 20_000,
  maximumScore: 6_000,
  wallThickness: 10
});

const MAZE_DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1, wall: "top", opposite: "bottom" }),
  right: Object.freeze({ dx: 1, dy: 0, wall: "right", opposite: "left" }),
  down: Object.freeze({ dx: 0, dy: 1, wall: "bottom", opposite: "top" }),
  left: Object.freeze({ dx: -1, dy: 0, wall: "left", opposite: "right" })
});

export const cursorMazeGame = defineGame({
  id: "cursor-maze",
  meta: {
    icon: "🖱️",
    title: "Kurzorový labyrint",
    teaser: "Proveď kurzor od startu do cíle bez nárazu",
    difficulty: "přesnost",
    instruction: "Táhni tečku labyrintem bez dotyku stěny. Na mobilu použij prst, s klávesnicí šipky.",
    scoreLabel: "bodů za přesnost"
  },
  start: startCursorMaze,
  result: {
    mode: "local",
    createPractice: createCursorMazePracticeResult,
    normalize: normalizeCursorMazeResult,
    format: formatCursorMazeResult
  }
});

function shuffledDirections(random) {
  const directions = Object.keys(MAZE_DIRECTIONS);
  for (let index = directions.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const value = directions[index];
    directions[index] = directions[target];
    directions[target] = value;
  }
  return directions;
}

export function buildCursorMaze(seed, roundIndex = 0, columns = CURSOR_MAZE.columns, rows = CURSOR_MAZE.rows) {
  const safeColumns = Math.max(2, Math.min(20, Math.floor(Number(columns) || CURSOR_MAZE.columns)));
  const safeRows = Math.max(2, Math.min(20, Math.floor(Number(rows) || CURSOR_MAZE.rows)));
  const random = createRng("cursor-maze:" + seed + ":" + roundIndex);
  const cells = Array.from({ length: safeColumns * safeRows }, function () {
    return { top: true, right: true, bottom: true, left: true };
  });
  const visited = new Set([0]);
  const stack = [0];

  while (stack.length) {
    const current = stack[stack.length - 1];
    const column = current % safeColumns;
    const row = Math.floor(current / safeColumns);
    const candidates = shuffledDirections(random).map(function (directionId) {
      const direction = MAZE_DIRECTIONS[directionId];
      const nextColumn = column + direction.dx;
      const nextRow = row + direction.dy;
      return {
        directionId,
        direction,
        index: nextRow * safeColumns + nextColumn,
        valid: nextColumn >= 0 && nextColumn < safeColumns && nextRow >= 0 && nextRow < safeRows
      };
    }).filter(function (candidate) {
      return candidate.valid && !visited.has(candidate.index);
    });

    if (!candidates.length) {
      stack.pop();
      continue;
    }

    const next = candidates[Math.floor(random() * candidates.length)];
    cells[current][next.direction.wall] = false;
    cells[next.index][next.direction.opposite] = false;
    visited.add(next.index);
    stack.push(next.index);
  }

  const maze = {
    id: Math.max(0, Math.floor(Number(roundIndex) || 0)),
    columns: safeColumns,
    rows: safeRows,
    start: 0,
    goal: cells.length - 1,
    cells
  };
  maze.solution = solveCursorMaze(maze);
  return maze;
}

export function buildCursorMazeRounds(seed, count = CURSOR_MAZE.rounds) {
  return Array.from({ length: Math.max(0, Math.floor(Number(count) || 0)) }, function (_, index) {
    return buildCursorMaze(seed, index);
  });
}

export function cursorMazeCanMove(maze, cellIndex, directionId) {
  const direction = MAZE_DIRECTIONS[directionId];
  if (!maze || !direction || !Array.isArray(maze.cells) || !Number.isInteger(cellIndex)
    || cellIndex < 0 || cellIndex >= maze.cells.length) return false;
  const column = cellIndex % maze.columns;
  const row = Math.floor(cellIndex / maze.columns);
  const nextColumn = column + direction.dx;
  const nextRow = row + direction.dy;
  if (nextColumn < 0 || nextColumn >= maze.columns || nextRow < 0 || nextRow >= maze.rows) return false;
  const nextIndex = nextRow * maze.columns + nextColumn;
  return maze.cells[cellIndex][direction.wall] === false
    && maze.cells[nextIndex] && maze.cells[nextIndex][direction.opposite] === false;
}

export function cursorMazeNeighbor(maze, cellIndex, directionId) {
  if (!cursorMazeCanMove(maze, cellIndex, directionId)) return null;
  const direction = MAZE_DIRECTIONS[directionId];
  return cellIndex + direction.dy * maze.columns + direction.dx;
}

export function solveCursorMaze(maze) {
  if (!maze || !Array.isArray(maze.cells) || !maze.cells.length) return [];
  const start = Number.isInteger(maze.start) ? maze.start : 0;
  const goal = Number.isInteger(maze.goal) ? maze.goal : maze.cells.length - 1;
  const queue = [start];
  const previous = new Map([[start, null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const cell = queue[cursor];
    if (cell === goal) break;
    Object.keys(MAZE_DIRECTIONS).forEach(function (directionId) {
      const neighbor = cursorMazeNeighbor(maze, cell, directionId);
      if (neighbor === null || previous.has(neighbor)) return;
      previous.set(neighbor, cell);
      queue.push(neighbor);
    });
  }

  if (!previous.has(goal)) return [];
  const path = [];
  let current = goal;
  while (current !== null) {
    path.push(current);
    current = previous.get(current);
  }
  return path.reverse();
}

export function cursorMazePointIsSafe(
  maze,
  x,
  y,
  width = CURSOR_MAZE.width,
  height = CURSOR_MAZE.height,
  wallThickness = CURSOR_MAZE.wallThickness
) {
  if (!maze || !Array.isArray(maze.cells) || !Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || x >= width || y < 0 || y >= height) return false;
  const cellWidth = width / maze.columns;
  const cellHeight = height / maze.rows;
  const column = Math.min(maze.columns - 1, Math.floor(x / cellWidth));
  const row = Math.min(maze.rows - 1, Math.floor(y / cellHeight));
  const cell = maze.cells[row * maze.columns + column];
  if (!cell) return false;
  const localX = x - column * cellWidth;
  const localY = y - row * cellHeight;
  const halfWall = Math.max(1, Number(wallThickness) || 0) / 2;

  if (cell.left && localX <= halfWall) return false;
  if (cell.right && cellWidth - localX <= halfWall) return false;
  if (cell.top && localY <= halfWall) return false;
  if (cell.bottom && cellHeight - localY <= halfWall) return false;
  return true;
}

export function cursorMazeSegmentIsSafe(maze, from, to) {
  if (!from || !to || !Number.isFinite(from.x) || !Number.isFinite(from.y)
    || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return false;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 3));
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const x = from.x + (to.x - from.x) * ratio;
    const y = from.y + (to.y - from.y) * ratio;
    if (!cursorMazePointIsSafe(maze, x, y)) return false;
  }
  return true;
}

export function cursorMazeRoundScore(elapsedMs, collisions = 0, progress = 1, completed = true) {
  const safeProgress = Math.min(1, Math.max(0, Number(progress) || 0));
  if (!completed) return Math.round(safeProgress * 400);
  const safeElapsed = Math.min(CURSOR_MAZE.roundDurationMs, Math.max(0, Number(elapsedMs) || 0));
  const safeCollisions = Math.max(0, Math.floor(Number(collisions) || 0));
  return Math.max(500, Math.round(3_000 - safeElapsed / 10 - safeCollisions * 250));
}

export function createCursorMazePracticeResult(seed) {
  const random = createRng("practice-result:cursor-maze:" + seed);
  const completed = 1 + Math.floor(random() * 2);
  const collisions = Math.floor(random() * 5);
  const average = 7_000 + Math.floor(random() * 7_000);
  let score = 0;
  for (let round = 0; round < completed; round += 1) {
    score += cursorMazeRoundScore(
      Math.min(CURSOR_MAZE.roundDurationMs, average + Math.floor((random() - .5) * 2_000)),
      Math.floor(collisions / completed),
      1,
      true
    );
  }
  if (completed < CURSOR_MAZE.rounds) score += cursorMazeRoundScore(0, 0, .35 + random() * .5, false);
  return { score, completed, collisions, average };
}

export function normalizeCursorMazeResult(result) {
  const normalized = normalizeScoreResult(result, CURSOR_MAZE.maximumScore);
  if (!normalized) return null;
  normalized.completed = safeSmallInteger(result.completed, CURSOR_MAZE.rounds);
  normalized.collisions = safeSmallInteger(result.collisions, 99);
  normalized.average = safeSmallInteger(result.average, CURSOR_MAZE.roundDurationMs);
  return normalized;
}

export function formatCursorMazeResult(result) {
  return result.completed + "/" + CURSOR_MAZE.rounds + " labyrinty · " + result.collisions + " "
    + czechCount(result.collisions, "náraz", "nárazy", "nárazů");
}

export function startCursorMaze(context) {
  const rounds = buildCursorMazeRounds(context.seed);
  const timers = [];
  const completionTimes = [];
  let animationFrame = 0;
  let roundTimer = 0;
  let roundIndex = -1;
  let roundStartedAt = 0;
  let maze = null;
  let score = 0;
  let completed = 0;
  let collisions = 0;
  let roundCollisions = 0;
  let currentCell = 0;
  let currentPoint = { x: 0, y: 0 };
  let trail = [];
  let furthestSolutionIndex = 0;
  let tracking = false;
  let pointerId = null;
  let phase = "idle";
  let finished = false;
  let revealSolution = false;

  context.setRoundLabel(CURSOR_MAZE.rounds + " labyrinty bez dotyku stěny");
  context.stage.innerHTML = `
    <div class="cursor-maze-shell">
      <div class="cursor-maze-topline">
        <div class="cursor-maze-rounds" role="group" aria-label="Průběh labyrintů"></div>
        <strong class="cursor-maze-score">0 bodů</strong>
        <div class="cursor-maze-clock" aria-label="Zbývající čas"><b>20,0</b><small>s</small></div>
      </div>
      <div class="cursor-maze-board-wrap">
        <canvas class="cursor-maze-canvas" width="640" height="400" tabindex="0" aria-label="Labyrint. Začni v růžovém kruhu a dojdi ke žlutému cíli."></canvas>
      </div>
      <div class="cursor-maze-bottom">
        <p class="cursor-maze-feedback" role="status" aria-live="polite">Drž tlačítko myši nebo prst na růžovém startu a táhni k cíli.</p>
        <div class="cursor-maze-controls" role="group" aria-label="Ovládání labyrintu šipkami">
          <button type="button" data-maze-direction="up" aria-label="Nahoru">↑</button>
          <button type="button" data-maze-direction="left" aria-label="Doleva">←</button>
          <button type="button" data-maze-direction="down" aria-label="Dolů">↓</button>
          <button type="button" data-maze-direction="right" aria-label="Doprava">→</button>
        </div>
      </div>
    </div>`;

  const roundDots = context.stage.querySelector(".cursor-maze-rounds");
  const scoreLabel = context.stage.querySelector(".cursor-maze-score");
  const clock = context.stage.querySelector(".cursor-maze-clock b");
  const canvas = context.stage.querySelector(".cursor-maze-canvas");
  const controls = context.stage.querySelector(".cursor-maze-controls");
  const feedback = context.stage.querySelector(".cursor-maze-feedback");
  const drawing = canvas.getContext("2d");

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

  function cellCenter(cellIndex) {
    const cellWidth = CURSOR_MAZE.width / maze.columns;
    const cellHeight = CURSOR_MAZE.height / maze.rows;
    return {
      x: (cellIndex % maze.columns + .5) * cellWidth,
      y: (Math.floor(cellIndex / maze.columns) + .5) * cellHeight
    };
  }

  function drawPath(cells, color, width) {
    if (!cells || cells.length < 2) return;
    drawing.beginPath();
    cells.forEach(function (cell, index) {
      const center = cellCenter(cell);
      if (index === 0) drawing.moveTo(center.x, center.y);
      else drawing.lineTo(center.x, center.y);
    });
    drawing.strokeStyle = color;
    drawing.lineWidth = width;
    drawing.lineCap = "round";
    drawing.lineJoin = "round";
    drawing.stroke();
  }

  function drawMaze() {
    if (!maze || !drawing) return;
    const cellWidth = CURSOR_MAZE.width / maze.columns;
    const cellHeight = CURSOR_MAZE.height / maze.rows;
    drawing.clearRect(0, 0, CURSOR_MAZE.width, CURSOR_MAZE.height);
    drawing.fillStyle = "#fffaf0";
    drawing.fillRect(0, 0, CURSOR_MAZE.width, CURSOR_MAZE.height);

    if (revealSolution) drawPath(maze.solution, "rgba(72, 167, 255, .55)", 15);

    if (trail.length > 1) {
      drawing.beginPath();
      trail.forEach(function (point, index) {
        if (index === 0) drawing.moveTo(point.x, point.y);
        else drawing.lineTo(point.x, point.y);
      });
      drawing.strokeStyle = "rgba(255, 15, 123, .55)";
      drawing.lineWidth = 8;
      drawing.lineCap = "round";
      drawing.lineJoin = "round";
      drawing.stroke();
    }

    drawing.beginPath();
    maze.cells.forEach(function (cell, index) {
      const column = index % maze.columns;
      const row = Math.floor(index / maze.columns);
      const left = column * cellWidth;
      const top = row * cellHeight;
      if (cell.top) { drawing.moveTo(left, top); drawing.lineTo(left + cellWidth, top); }
      if (cell.left) { drawing.moveTo(left, top); drawing.lineTo(left, top + cellHeight); }
      if (cell.right) { drawing.moveTo(left + cellWidth, top); drawing.lineTo(left + cellWidth, top + cellHeight); }
      if (cell.bottom) { drawing.moveTo(left, top + cellHeight); drawing.lineTo(left + cellWidth, top + cellHeight); }
    });
    drawing.strokeStyle = "#111";
    drawing.lineWidth = CURSOR_MAZE.wallThickness;
    drawing.lineCap = "square";
    drawing.stroke();

    const start = cellCenter(maze.start);
    const goal = cellCenter(maze.goal);
    drawing.beginPath();
    drawing.arc(start.x, start.y, 22, 0, Math.PI * 2);
    drawing.fillStyle = "#ff0f7b";
    drawing.fill();
    drawing.lineWidth = 4;
    drawing.strokeStyle = "#111";
    drawing.stroke();
    drawing.fillStyle = "#fff";
    drawing.font = "900 12px Arial";
    drawing.textAlign = "center";
    drawing.textBaseline = "middle";
    drawing.fillText("START", start.x, start.y);

    drawing.fillStyle = "#ffd51f";
    drawing.fillRect(goal.x - 24, goal.y - 20, 48, 40);
    drawing.strokeStyle = "#111";
    drawing.lineWidth = 4;
    drawing.strokeRect(goal.x - 24, goal.y - 20, 48, 40);
    drawing.fillStyle = "#111";
    drawing.font = "1000 13px Arial";
    drawing.fillText("CÍL", goal.x, goal.y);

    drawing.beginPath();
    drawing.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
    drawing.fillStyle = "#071a3d";
    drawing.fill();
    drawing.lineWidth = 3;
    drawing.strokeStyle = "#fff";
    drawing.stroke();
  }

  function setControlsDisabled(disabled) {
    controls.querySelectorAll("button").forEach(function (button) { button.disabled = disabled; });
  }

  function updateClock(now) {
    if (finished || phase !== "solve") return;
    const elapsed = Math.min(CURSOR_MAZE.roundDurationMs, now - roundStartedAt);
    const remaining = Math.max(0, CURSOR_MAZE.roundDurationMs - elapsed);
    clock.textContent = (remaining / 1000).toFixed(1).replace(".", ",");
    animationFrame = window.requestAnimationFrame(updateClock);
  }

  function updateProgress(cellIndex) {
    const solutionIndex = maze.solution.indexOf(cellIndex);
    if (solutionIndex >= 0) furthestSolutionIndex = Math.max(furthestSolutionIndex, solutionIndex);
  }

  function resetAfterCollision(message) {
    collisions += 1;
    roundCollisions += 1;
    tracking = false;
    pointerId = null;
    currentCell = maze.start;
    currentPoint = cellCenter(currentCell);
    trail = [currentPoint];
    feedback.textContent = message || "Náraz do zdi. Kurzor se vrací na start.";
    drawMaze();
  }

  function finish() {
    if (finished) return;
    finished = true;
    phase = "finished";
    tracking = false;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setControlsDisabled(true);
    feedback.textContent = "Hotovo. Kurzor přežil dvě služební cesty bez navigace.";
    const average = completionTimes.length
      ? Math.round(completionTimes.reduce(function (sum, value) { return sum + value; }, 0) / completionTimes.length)
      : 0;
    context.finish({ score, completed, collisions, average });
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
    tracking = false;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    setControlsDisabled(true);
    const elapsed = success
      ? Math.min(CURSOR_MAZE.roundDurationMs, Math.round(performance.now() - roundStartedAt))
      : CURSOR_MAZE.roundDurationMs;
    const progress = maze.solution.length > 1 ? furthestSolutionIndex / (maze.solution.length - 1) : 0;
    const points = cursorMazeRoundScore(elapsed, roundCollisions, progress, success);
    score += points;
    roundDots.children[roundIndex].classList.remove("is-current");
    roundDots.children[roundIndex].classList.add(success ? "is-good" : "is-bad");

    if (success) {
      completed += 1;
      completionTimes.push(elapsed);
      feedback.textContent = (elapsed / 1000).toFixed(1).replace(".", ",") + " s · +" + points
        + " bodů. Kurzoru byla schválena cesta.";
    } else {
      revealSolution = true;
      clock.textContent = "0,0";
      feedback.textContent = "Čas vypršel. Modrá trasa ukazuje cestu, kterou audit očekával.";
      drawMaze();
    }
    publish();
    schedule(nextRound, success ? 900 : 1400);
  }

  function startRound(index) {
    if (finished || !rounds[index]) return;
    window.clearTimeout(roundTimer);
    window.cancelAnimationFrame(animationFrame);
    roundIndex = index;
    maze = rounds[index];
    phase = "solve";
    roundCollisions = 0;
    furthestSolutionIndex = 0;
    tracking = false;
    pointerId = null;
    revealSolution = false;
    currentCell = maze.start;
    currentPoint = cellCenter(currentCell);
    trail = [currentPoint];
    feedback.textContent = "Labyrint " + (index + 1) + "/" + rounds.length
      + " · táhni ze STARTU, nebo použij šipky.";
    Array.from(roundDots.children).forEach(function (dot) { dot.classList.remove("is-current"); });
    roundDots.children[index].classList.add("is-current");
    setControlsDisabled(false);
    roundStartedAt = performance.now();
    clock.textContent = "20,0";
    drawMaze();
    animationFrame = window.requestAnimationFrame(updateClock);
    roundTimer = schedule(function () { resolveRound(false); }, CURSOR_MAZE.roundDurationMs);
    canvas.focus({ preventScroll: true });
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * CURSOR_MAZE.width / Math.max(1, bounds.width),
      y: (event.clientY - bounds.top) * CURSOR_MAZE.height / Math.max(1, bounds.height)
    };
  }

  function isNear(point, target, radius) {
    return Math.hypot(point.x - target.x, point.y - target.y) <= radius;
  }

  function onPointerDown(event) {
    if (finished || phase !== "solve") return;
    const point = canvasPoint(event);
    if (!isNear(point, currentPoint, 30)) {
      feedback.textContent = "Začni na tmavé tečce. Po nárazu se vrací na růžový START.";
      return;
    }
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    tracking = true;
    pointerId = event.pointerId;
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!tracking || phase !== "solve" || event.pointerId !== pointerId) return;
    const point = canvasPoint(event);
    if (!cursorMazeSegmentIsSafe(maze, currentPoint, point)) {
      resetAfterCollision();
      return;
    }
    currentPoint = point;
    currentCell = Math.min(maze.cells.length - 1, Math.max(0,
      Math.floor(point.y / (CURSOR_MAZE.height / maze.rows)) * maze.columns
      + Math.floor(point.x / (CURSOR_MAZE.width / maze.columns))
    ));
    trail.push(point);
    if (trail.length > 400) trail.shift();
    updateProgress(currentCell);
    drawMaze();
    if (currentCell === maze.goal && isNear(point, cellCenter(maze.goal), 27)) resolveRound(true);
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return;
    tracking = false;
    pointerId = null;
    if (phase === "solve") feedback.textContent = "Pokračuj z tmavé tečky, nebo se přepni na šipky.";
  }

  function moveByDirection(directionId) {
    if (finished || phase !== "solve") return;
    tracking = false;
    const nextCell = cursorMazeNeighbor(maze, currentCell, directionId);
    if (nextCell === null) {
      resetAfterCollision("Tudy vede zeď. Návrat na START.");
      return;
    }
    currentCell = nextCell;
    currentPoint = cellCenter(currentCell);
    trail.push(currentPoint);
    updateProgress(currentCell);
    drawMaze();
    feedback.textContent = currentCell === maze.goal ? "Cíl dosažen." : "Pokračuj. Každá šipka přesune kurzor o jedno políčko.";
    if (currentCell === maze.goal) resolveRound(true);
  }

  function onControlClick(event) {
    const button = event.target.closest("[data-maze-direction]");
    if (button && !button.disabled) moveByDirection(button.dataset.mazeDirection);
  }

  function onKeyDown(event) {
    const directionByKey = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" };
    const direction = directionByKey[event.key];
    if (!direction || phase !== "solve") return;
    event.preventDefault();
    moveByDirection(direction);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  controls.addEventListener("click", onControlClick);
  window.addEventListener("keydown", onKeyDown);
  publish();
  schedule(function () { startRound(0); }, 400);

  return {
    receiveNetwork: NOOP,
    cleanup: function () {
      finished = true;
      tracking = false;
      timers.forEach(window.clearTimeout);
      window.clearTimeout(roundTimer);
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      controls.removeEventListener("click", onControlClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
