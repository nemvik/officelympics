import test from "node:test";
import assert from "node:assert/strict";

import {
  buildShredderSchedule,
  createPaperShredderPracticeResult,
  normalizePaperShredderResult,
  PAPER_SHREDDER,
  SHREDDER_DOCUMENTS,
  shredderClickScore
} from "../duel/games/paper-shredder.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Skartovačka vytváří deterministický rozpis bez kolize ve stejné dráze", function () {
  const first = buildShredderSchedule("skart-seed");
  const second = buildShredderSchedule("skart-seed");
  const different = buildShredderSchedule("jiny-skart");
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.ok(first.length >= 24);
  assert.ok(first.some(function (item) { return item.kind === "trash"; }));
  assert.ok(first.some(function (item) { return item.kind === "keep"; }));
  assert.ok(first.every(function (item) {
    return item.at >= 0 && item.at + item.travel < PAPER_SHREDDER.durationMs
      && item.lane >= 0 && item.lane < PAPER_SHREDDER.lanes
      && SHREDDER_DOCUMENTS.some(function (document) {
        return document.id === item.documentId && document.kind === item.kind;
      });
  }));
  for (let lane = 0; lane < PAPER_SHREDDER.lanes; lane += 1) {
    const laneItems = first.filter(function (item) { return item.lane === lane; });
    laneItems.forEach(function (item, index) {
      if (index > 0) assert.ok(laneItems[index - 1].at + laneItems[index - 1].travel < item.at);
    });
  }
});

test("Skartace odpadu buduje kombo a zničení originálu trestá", function () {
  assert.deepEqual(shredderClickScore(0, 0, "trash"), { score: 200, combo: 1, delta: 200 });
  assert.deepEqual(shredderClickScore(200, 1, "trash"), { score: 425, combo: 2, delta: 225 });
  assert.deepEqual(shredderClickScore(100, 8, "keep"), { score: 0, combo: 0, delta: -250 });
  assert.equal(shredderClickScore(Number.MAX_VALUE, 99, "trash").score, PAPER_SHREDDER.maximumScore);
});

test("Skartovačka normalizuje výsledek a practice bot je opakovatelný", function () {
  assert.ok(GAME_IDS.includes("paper-shredder"));
  assert.equal(getGameDefinition("paper-shredder").title, "Papírová skartovačka");
  assert.equal(getGame("paper-shredder").result.mode, "local");
  assert.equal(normalizePaperShredderResult({ score: NaN }), null);
  assert.deepEqual(normalizeGameResult("paper-shredder", {
    score: Number.MAX_VALUE,
    shredded: Number.MAX_VALUE,
    saved: Number.MAX_VALUE,
    mistakes: Number.MAX_VALUE,
    missed: Number.MAX_VALUE
  }), {
    score: PAPER_SHREDDER.maximumScore,
    shredded: 50,
    saved: 50,
    mistakes: 50,
    missed: 50
  });
  const bot = createPaperShredderPracticeResult("skart-bot");
  assert.deepEqual(bot, createPracticeResult("paper-shredder", "skart-bot"));
  assert.deepEqual(bot, createPaperShredderPracticeResult("skart-bot"));
  assert.match(formatGameResult("paper-shredder", bot), /^\d+ skartováno · \d+ /);
});
