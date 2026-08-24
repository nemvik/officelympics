import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";

import {
  createPracticeResult,
  formatGameResult,
  GAME_DEFINITIONS,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";
import { defineGame } from "../duel/games/shared.mjs";

const TEST_META = Object.freeze({
  icon: "🎮",
  title: "Testovací hra",
  teaser: "Test",
  difficulty: "test",
  instruction: "Otestuj kontrakt.",
  scoreLabel: "bodů"
});

function testResult(overrides = {}) {
  return {
    mode: "local",
    createPractice: function () { return { score: 0 }; },
    normalize: function (result) { return result; },
    format: function () { return "0 bodů"; },
    ...overrides
  };
}

test("defineGame odmítne neúplný nebo rozporný výsledkový kontrakt", function () {
  assert.throws(function () {
    defineGame({
      id: "missing-practice",
      meta: TEST_META,
      start: function () {},
      result: testResult({ createPractice: undefined })
    });
  }, /výsledek bota/);

  assert.throws(function () {
    defineGame({
      id: "shared-with-practice",
      meta: TEST_META,
      start: function () {},
      result: testResult({ mode: "shared" })
    });
  }, /nesmí mít/);
});

test("Každý herní modul s descriptorem je uvedený v registru", async function () {
  const gameDirectory = new URL("../duel/games/", import.meta.url);
  const moduleFiles = (await readdir(gameDirectory)).filter(function (file) {
    return file.endsWith(".mjs") && !["registry.mjs", "shared.mjs"].includes(file);
  });
  const moduleGameIds = [];

  for (const file of moduleFiles) {
    const gameModule = await import(new URL(file, gameDirectory));
    const descriptors = Object.values(gameModule).filter(function (value) {
      return value && typeof value === "object" && typeof value.id === "string"
        && value.meta && value.result && typeof value.start === "function";
    });
    assert.equal(descriptors.length, 1, file + " musí exportovat právě jeden descriptor hry");
    moduleGameIds.push(descriptors[0].id);
  }

  assert.deepEqual(moduleGameIds.sort(), GAME_IDS.slice().sort());
});

test("Registr obsahuje úplné a navzájem konzistentní definice her", function () {
  assert.ok(GAME_IDS.length > 0);
  assert.equal(GAME_DEFINITIONS.length, GAME_IDS.length);
  assert.equal(new Set(GAME_IDS).size, GAME_IDS.length);
  assert.deepEqual(GAME_DEFINITIONS.map(function (game) { return game.id; }), GAME_IDS);
  assert.equal(getGameDefinition("pictionary").title, "Kancelářský Pictionary");

  GAME_IDS.forEach(function (gameId) {
    const game = getGame(gameId);
    assert.equal(typeof game.start, "function");
    assert.ok(["local", "shared"].includes(game.result.mode));
    assert.equal(normalizeGameResult(gameId, null), null);

    const normalized = normalizeGameResult(gameId, { score: 0 });
    assert.ok(normalized && Number.isFinite(normalized.score));
    assert.ok(formatGameResult(gameId, normalized).length > 0);

    [NaN, Infinity, -Infinity].forEach(function (score) {
      assert.equal(normalizeGameResult(gameId, { score }), null);
    });
    assert.equal(normalizeGameResult(gameId, { score: -1 }).score, 0);
    const bounded = normalizeGameResult(gameId, { score: Number.MAX_VALUE });
    assert.ok(bounded && Number.isFinite(bounded.score));
    assert.ok(bounded.score >= 0 && bounded.score <= 9999);

    if (game.result.mode === "local") {
      assert.deepEqual(
        createPracticeResult(gameId, "contract-seed"),
        createPracticeResult(gameId, "contract-seed")
      );
    } else {
      assert.throws(function () { createPracticeResult(gameId, "contract-seed"); }, /sdílený výsledek/);
    }
  });

  assert.equal(getGame("missing"), null);
  assert.equal(getGameDefinition("missing"), null);
  assert.equal(normalizeGameResult("missing", { score: 1 }), null);
  assert.throws(function () { formatGameResult("missing", { score: 1 }); }, /Neznámá hra/);
});
