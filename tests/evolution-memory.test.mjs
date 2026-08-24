import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyEvolutionMemoryFlip,
  applyEvolutionMemoryNetworkFlip,
  availableEvolutionMemoryCardIndexes,
  buildEvolutionMemoryBoard,
  createEvolutionMemoryState,
  EVOLUTION_MEMORY,
  EVOLUTION_MEMORY_MESSAGE_TYPE,
  evolutionMemoryStartingPlayer,
  formatEvolutionMemoryResult,
  isEvolutionMemoryPair,
  normalizeEvolutionMemoryResult,
  pickEvolutionMemoryBotCard,
  pickEvolutionMemoryTimeoutCard,
  resolveEvolutionMemoryPair,
  validateEvolutionMemoryFlipMessage
} from "../duel/games/evolution-memory.mjs";
import {
  POKEMON_EVOLUTION_EDGES,
  POKEMON_SNAPSHOT,
  POKEMON_SNAPSHOT_META
} from "../duel/games/pokemon/snapshot.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

function groupedPairs(board) {
  const groups = new Map();
  board.forEach(function (card, index) {
    if (!groups.has(card.pairId)) groups.set(card.pairId, []);
    groups.get(card.pairId).push(index);
  });
  return Array.from(groups.values());
}

function firstMismatch(board, excluded = new Set()) {
  for (let first = 0; first < board.length; first += 1) {
    if (excluded.has(first)) continue;
    for (let second = first + 1; second < board.length; second += 1) {
      if (!excluded.has(second) && !isEvolutionMemoryPair(board[first], board[second])) return [first, second];
    }
  }
  return null;
}

test("Evoluční pexeso má pro stejný seed stejný výběr, layout i začínající roli", function () {
  const first = buildEvolutionMemoryBoard("laborator-a");
  const second = buildEvolutionMemoryBoard("laborator-a");
  const different = buildEvolutionMemoryBoard("laborator-b");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(evolutionMemoryStartingPlayer("laborator-a"), evolutionMemoryStartingPlayer("laborator-a"));
  assert.ok([0, 1].includes(evolutionMemoryStartingPlayer("laborator-a")));
});

test("Deska obsahuje přesně osm platných nevětvených přímých evolučních párů", function () {
  const branchedPairIds = new Set(POKEMON_EVOLUTION_EDGES.filter(function (edge) {
    return edge.branched;
  }).map(function (edge) {
    return edge.parentId + ":" + edge.childId;
  }));

  ["páry-1", "páry-2", "páry-3", "páry-4"].forEach(function (seed) {
    const board = buildEvolutionMemoryBoard(seed);
    const pairs = groupedPairs(board);
    assert.equal(pairs.length, EVOLUTION_MEMORY.pairCount);
    pairs.forEach(function (indexes) {
      assert.equal(indexes.length, 2);
      assert.equal(isEvolutionMemoryPair(board[indexes[0]], board[indexes[1]]), true);
      assert.equal(branchedPairIds.has(board[indexes[0]].pairId), false);
    });
  });
});

test("Všech šestnáct Pokémonů na desce je unikátních a z rozsahu 1–151", function () {
  const knownIds = new Set(POKEMON_SNAPSHOT.map(function (pokemon) { return pokemon.id; }));
  const board = buildEvolutionMemoryBoard("unikátní-deska");
  const ids = board.map(function (card) { return card.id; });

  assert.equal(board.length, EVOLUTION_MEMORY.cardCount);
  assert.equal(new Set(ids).size, EVOLUTION_MEMORY.cardCount);
  assert.ok(ids.every(function (id) { return id >= 1 && id <= 151 && knownIds.has(id); }));
  assert.equal(POKEMON_EVOLUTION_EDGES.length, POKEMON_SNAPSHOT_META.evolutionEdgeCount);
});

test("Rozpoznání páru přijme obě pořadí přímé evoluce a odmítne jinou dvojici", function () {
  assert.equal(isEvolutionMemoryPair({ id: 1 }, { id: 2 }), true);
  assert.equal(isEvolutionMemoryPair({ id: 2 }, { id: 1 }), true);
  assert.equal(isEvolutionMemoryPair({ id: 1 }, { id: 3 }), false);
  assert.equal(isEvolutionMemoryPair({ id: 25 }, { id: 25 }), false);
  assert.equal(isEvolutionMemoryPair({ id: 133 }, { id: 134 }), true);
});

test("Správný pár přidá bod a zachová tah, chybný pár tah předá", function () {
  const board = buildEvolutionMemoryBoard("pravidla-tahu");
  const state = createEvolutionMemoryState("pravidla-tahu");
  const owner = state.turnOwner;
  const pair = groupedPairs(board)[0];

  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[0]), true);
  assert.equal(state.phase, "await-second");
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[1]), true);
  assert.equal(state.phase, "evaluating");
  assert.deepEqual(resolveEvolutionMemoryPair(state, board), {
    match: true,
    owner,
    indexes: pair,
    finished: false
  });
  assert.equal(state.turnOwner, owner);
  assert.equal(state.scores[owner], 1);

  const mismatch = firstMismatch(board, state.matched);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, mismatch[0]), true);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, mismatch[1]), true);
  const result = resolveEvolutionMemoryPair(state, board);
  assert.equal(result.match, false);
  assert.equal(state.turnOwner, 1 - owner);
  assert.deepEqual(state.scores, owner === 0 ? [1, 0] : [0, 1]);
});

test("Stejnou otočenou ani již nalezenou kartu nelze použít znovu", function () {
  const board = buildEvolutionMemoryBoard("blokace-karet");
  const state = createEvolutionMemoryState("blokace-karet");
  const owner = state.turnOwner;
  const pair = groupedPairs(board)[0];

  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[0]), true);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[0]), false);
  assert.equal(state.action, 1);
  assert.equal(applyEvolutionMemoryFlip(state, board, 1 - owner, pair[1]), false);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[1]), true);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[1]), false);
  resolveEvolutionMemoryPair(state, board);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[0]), false);
  assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[1]), false);
});

test("Po osmi nalezených párech končí stav přesným skóre 8:0", function () {
  const board = buildEvolutionMemoryBoard("úplný-průchod");
  const state = createEvolutionMemoryState("úplný-průchod");
  const owner = state.turnOwner;

  groupedPairs(board).forEach(function (pair, pairIndex) {
    assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[0]), true);
    assert.equal(applyEvolutionMemoryFlip(state, board, owner, pair[1]), true);
    const result = resolveEvolutionMemoryPair(state, board);
    assert.equal(result.match, true);
    assert.equal(result.finished, pairIndex === EVOLUTION_MEMORY.pairCount - 1);
  });

  assert.equal(state.phase, "finished");
  assert.equal(state.matched.size, EVOLUTION_MEMORY.cardCount);
  assert.deepEqual(state.scores, owner === 0 ? [8, 0] : [0, 8]);
});

test("Timeout vybírá deterministicky jen platnou dostupnou kartu", function () {
  const board = buildEvolutionMemoryBoard("timeout-deska");
  const state = createEvolutionMemoryState("timeout-deska");
  const pair = groupedPairs(board)[0];
  state.matched.add(pair[0]);
  state.matched.add(pair[1]);
  assert.equal(applyEvolutionMemoryFlip(state, board, state.turnOwner, groupedPairs(board)[1][0]), true);

  const first = pickEvolutionMemoryTimeoutCard("timeout-deska", state);
  assert.equal(first, pickEvolutionMemoryTimeoutCard("timeout-deska", state));
  assert.ok(availableEvolutionMemoryCardIndexes(state).includes(first));
  assert.equal(state.matched.has(first), false);
  assert.equal(state.flipped.includes(first), false);

  const fullState = createEvolutionMemoryState("plná-deska");
  Array.from({ length: EVOLUTION_MEMORY.cardCount }, function (_, index) { return index; }).forEach(function (index) {
    fullState.matched.add(index);
  });
  assert.equal(pickEvolutionMemoryTimeoutCard("plná-deska", fullState), null);
});

test("Síťová zpráva vyžaduje přesný typ, pořadí, celé číslo akce a platný index", function () {
  const valid = { type: EVOLUTION_MEMORY_MESSAGE_TYPE, action: 7, index: 15 };
  assert.equal(validateEvolutionMemoryFlipMessage(valid, 7), true);
  assert.equal(validateEvolutionMemoryFlipMessage({ ...valid, role: 0, matchId: "match" }, 7), true);

  [
    null,
    [],
    { ...valid, type: "game:other-flip" },
    { ...valid, action: 6 },
    { ...valid, action: 8 },
    { ...valid, action: "7" },
    { ...valid, action: 7.5 },
    { ...valid, action: EVOLUTION_MEMORY.maximumActionNumber },
    { ...valid, index: -1 },
    { ...valid, index: 16 },
    { ...valid, index: 1.5 },
    { ...valid, index: NaN }
  ].forEach(function (message) {
    assert.equal(validateEvolutionMemoryFlipMessage(message, 7), false);
  });
});

test("Receiver odvozuje vzdálenou identitu z kontextu a odmítá duplicity, budoucnost i špatnou fázi", function () {
  const board = buildEvolutionMemoryBoard("síťový-reducer");
  const state = createEvolutionMemoryState("síťový-reducer");
  const remoteRole = state.turnOwner;
  const first = { type: EVOLUTION_MEMORY_MESSAGE_TYPE, action: 0, index: 0, role: 1 - remoteRole };

  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, remoteRole, first), true);
  assert.equal(state.action, 1);
  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, remoteRole, first), false);
  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, remoteRole, {
    type: EVOLUTION_MEMORY_MESSAGE_TYPE,
    action: 2,
    index: 1
  }), false);
  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, 1 - remoteRole, {
    type: EVOLUTION_MEMORY_MESSAGE_TYPE,
    action: 1,
    index: 1
  }), false);

  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, remoteRole, {
    type: EVOLUTION_MEMORY_MESSAGE_TYPE,
    action: 1,
    index: 1
  }), true);
  assert.equal(state.phase, "evaluating");
  assert.equal(applyEvolutionMemoryNetworkFlip(state, board, remoteRole, {
    type: EVOLUTION_MEMORY_MESSAGE_TYPE,
    action: 2,
    index: 2
  }), false);
});

test("Practice bot využije známý pár, jinak seedovaně zkoumá jen neznámé karty", function () {
  const memory = new Map([[0, 1], [1, 2], [2, 25]]);
  assert.equal(pickEvolutionMemoryBotCard("bot", 4, [0, 1, 2, 3], memory), 0);
  assert.equal(pickEvolutionMemoryBotCard("bot", 5, [1, 2, 3], memory, 0), 1);

  const exploratory = pickEvolutionMemoryBotCard("bot", 6, [2, 3, 4], memory, 2);
  assert.ok([3, 4].includes(exploratory));
  assert.equal(exploratory, pickEvolutionMemoryBotCard("bot", 6, [2, 3, 4], memory, 2));
  assert.equal(pickEvolutionMemoryBotCard("bot", 7, [], memory), null);
});

test("Výsledková hranice odmítá nečíselné hodnoty a omezuje skóre na 0–8", function () {
  assert.equal(normalizeEvolutionMemoryResult(null), null);
  assert.equal(normalizeEvolutionMemoryResult({ score: NaN }), null);
  assert.equal(normalizeEvolutionMemoryResult({ score: Infinity }), null);
  assert.equal(normalizeEvolutionMemoryResult({ score: -Infinity }), null);
  assert.deepEqual(normalizeEvolutionMemoryResult({ score: -999 }), { score: 0 });
  assert.deepEqual(normalizeEvolutionMemoryResult({ score: 3.6 }), { score: 4 });
  assert.deepEqual(normalizeEvolutionMemoryResult({ score: Number.MAX_VALUE }), { score: 8 });
  assert.equal(formatEvolutionMemoryResult({ score: 1 }), "1 nalezený pár");
  assert.equal(formatEvolutionMemoryResult({ score: 3 }), "3 nalezené páry");
  assert.equal(formatEvolutionMemoryResult({ score: 8 }), "8 nalezených párů");
});

test("Evoluční pexeso je registrovaná shared hra a používá lokální snapshot bez runtime fetch", async function () {
  assert.ok(GAME_IDS.includes("evolution-memory"));
  assert.equal(getGameDefinition("evolution-memory").title, "Evoluční pexeso");
  assert.equal(getGame("evolution-memory").result.mode, "shared");
  assert.deepEqual(normalizeGameResult("evolution-memory", { score: 99 }), { score: 8 });
  assert.equal(formatGameResult("evolution-memory", { score: 2 }), "2 nalezené páry");
  assert.throws(function () { createPracticeResult("evolution-memory", "seed"); }, /sdílený výsledek/);

  const source = await readFile(new URL("../duel/games/evolution-memory.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.match(source, /from "\.\/pokemon\/snapshot\.mjs"/);
});
