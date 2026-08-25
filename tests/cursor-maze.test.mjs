import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCursorMaze,
  buildCursorMazeRounds,
  createCursorMazePracticeResult,
  CURSOR_MAZE,
  cursorMazeCanMove,
  cursorMazePointIsSafe,
  cursorMazeRoundScore,
  cursorMazeSegmentIsSafe,
  normalizeCursorMazeResult
} from "../duel/games/cursor-maze.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

function pathStepIsValid(maze, from, to) {
  return ["up", "right", "down", "left"].some(function (direction) {
    if (!cursorMazeCanMove(maze, from, direction)) return false;
    if (direction === "up") return from - maze.columns === to;
    if (direction === "right") return from + 1 === to;
    if (direction === "down") return from + maze.columns === to;
    return from - 1 === to;
  });
}

test("Kurzorový labyrint je deterministický, propojený a má platnou cestu", function () {
  const first = buildCursorMazeRounds("mysi-seed");
  const second = buildCursorMazeRounds("mysi-seed");
  const different = buildCursorMazeRounds("jina-mys");
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, CURSOR_MAZE.rounds);
  first.forEach(function (maze) {
    assert.equal(maze.cells.length, CURSOR_MAZE.columns * CURSOR_MAZE.rows);
    assert.equal(maze.solution[0], maze.start);
    assert.equal(maze.solution.at(-1), maze.goal);
    assert.equal(new Set(maze.solution).size, maze.solution.length);
    assert.ok(maze.solution.every(function (cell, index) {
      return index === 0 || pathStepIsValid(maze, maze.solution[index - 1], cell);
    }));
  });
});

test("Detekce pohybu pustí kurzor otevřenou chodbou a zastaví ho o zeď", function () {
  const maze = {
    columns: 2,
    rows: 2,
    start: 0,
    goal: 3,
    cells: [
      { top: true, right: false, bottom: true, left: true },
      { top: true, right: true, bottom: true, left: false },
      { top: true, right: true, bottom: true, left: true },
      { top: true, right: true, bottom: true, left: true }
    ]
  };
  assert.equal(cursorMazePointIsSafe(maze, 160, 100), true);
  assert.equal(cursorMazePointIsSafe(maze, -1, 100), false);
  assert.equal(cursorMazeSegmentIsSafe(maze, { x: 160, y: 100 }, { x: 480, y: 100 }), true);
  assert.equal(cursorMazeSegmentIsSafe(maze, { x: 160, y: 100 }, { x: 160, y: 300 }), false);
});

test("Skóre labyrintu zvýhodňuje rychlost, čistou jízdu a dokončení", function () {
  assert.equal(cursorMazeRoundScore(0, 0, 1, true), 3_000);
  assert.ok(cursorMazeRoundScore(4_000, 0, 1, true) > cursorMazeRoundScore(12_000, 0, 1, true));
  assert.ok(cursorMazeRoundScore(8_000, 0, 1, true) > cursorMazeRoundScore(8_000, 4, 1, true));
  assert.equal(cursorMazeRoundScore(0, 0, .5, false), 200);
});

test("Kurzorový labyrint má omezený výsledek a deterministického bota", function () {
  assert.ok(GAME_IDS.includes("cursor-maze"));
  assert.equal(getGameDefinition("cursor-maze").title, "Kurzorový labyrint");
  assert.equal(getGame("cursor-maze").result.mode, "local");
  assert.equal(normalizeCursorMazeResult(null), null);
  assert.deepEqual(normalizeGameResult("cursor-maze", {
    score: Number.MAX_VALUE,
    completed: Number.MAX_VALUE,
    collisions: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: CURSOR_MAZE.maximumScore,
    completed: CURSOR_MAZE.rounds,
    collisions: 99,
    average: CURSOR_MAZE.roundDurationMs
  });
  const bot = createCursorMazePracticeResult("kurzor-bot");
  assert.deepEqual(bot, createPracticeResult("cursor-maze", "kurzor-bot"));
  assert.deepEqual(bot, createCursorMazePracticeResult("kurzor-bot"));
  assert.match(formatGameResult("cursor-maze", bot), /^\d+\/2 labyrinty · \d+ (náraz|nárazy|nárazů)$/);
  assert.notDeepEqual(buildCursorMaze("a"), buildCursorMaze("b"));
});
