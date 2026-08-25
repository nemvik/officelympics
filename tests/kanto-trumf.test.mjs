import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildKantoTrumfSetup,
  consumeKantoTrumfCards,
  formatKantoTrumfResult,
  hashKantoTrumfChoice,
  KANTO_TRUMF,
  KANTO_TRUMF_DISCIPLINES,
  KANTO_TRUMF_MESSAGE_TYPES,
  normalizeKantoTrumfResult,
  pickKantoTrumfBotCard,
  pickKantoTrumfTimeoutCard,
  scoreKantoTrumfRound,
  validateKantoTrumfCommit,
  validateKantoTrumfReveal
} from "../duel/games/kanto-trumf.mjs";
import { POKEMON_SNAPSHOT } from "../duel/games/pokemon/snapshot.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

const POKEMON_BY_ID = new Map(POKEMON_SNAPSHOT.map(function (pokemon) {
  return [pokemon.id, pokemon];
}));

test("Kanto Trumf dává oběma klientům pro stejný seed stejnou ruku a pořadí", function () {
  const first = buildKantoTrumfSetup("paletove-mesto");
  const second = buildKantoTrumfSetup("paletove-mesto");
  const different = buildKantoTrumfSetup("rumelkové-město");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.pokemonIds.length, KANTO_TRUMF.handSize);
  assert.equal(new Set(first.pokemonIds).size, KANTO_TRUMF.handSize);
  assert.ok(first.pokemonIds.every(function (pokemonId) {
    return pokemonId >= 1 && pokemonId <= 151 && POKEMON_BY_ID.has(pokemonId);
  }));
});

test("Kanto Trumf nechává patnáct sekund na volbu", function () {
  assert.equal(KANTO_TRUMF.choiceDurationMs, 15_000);
});

test("Kanto Trumf použije všech šest disciplín právě jednou", function () {
  const expected = KANTO_TRUMF_DISCIPLINES.map(function (discipline) { return discipline.id; }).sort();
  ["disciplíny-a", "disciplíny-b", "disciplíny-c"].forEach(function (seed) {
    const setup = buildKantoTrumfSetup(seed);
    assert.equal(setup.disciplines.length, KANTO_TRUMF.rounds);
    assert.equal(new Set(setup.disciplines).size, KANTO_TRUMF.rounds);
    assert.deepEqual(setup.disciplines.slice().sort(), expected);
  });
});

test("Snapshot obsahuje současné PokeAPI base staty potřebné pro trumfy", function () {
  const bulbasaur = POKEMON_BY_ID.get(1);
  assert.deepEqual({
    hp: bulbasaur.hp,
    attack: bulbasaur.attack,
    defense: bulbasaur.defense,
    speed: bulbasaur.speed,
    height: bulbasaur.height,
    weight: bulbasaur.weight
  }, {
    hp: 45,
    attack: 49,
    defense: 49,
    speed: 45,
    height: 7,
    weight: 69
  });

  POKEMON_SNAPSHOT.forEach(function (pokemon) {
    ["hp", "attack", "defense", "speed", "height", "weight"].forEach(function (stat) {
      assert.ok(Number.isFinite(pokemon[stat]) && pokemon[stat] > 0, pokemon.name + " nemá " + stat);
    });
  });
});

test("Vyšší hodnota dostane dva body a nižší nulu", function () {
  assert.deepEqual(scoreKantoTrumfRound({ id: 1, hp: 80 }, { id: 2, hp: 40 }, "hp"), {
    points: [2, 0], winner: 0, kind: "win", values: [80, 40]
  });
  assert.deepEqual(scoreKantoTrumfRound({ id: 1, speed: 30 }, { id: 2, speed: 90 }, "speed"), {
    points: [0, 2], winner: 1, kind: "win", values: [30, 90]
  });
});

test("Přesná shoda rozdělí po bodu", function () {
  assert.deepEqual(scoreKantoTrumfRound({ id: 1, defense: 55 }, { id: 2, defense: 55 }, "defense"), {
    points: [1, 1], winner: null, kind: "tie", values: [55, 55]
  });
});

test("Stejný Pokémon způsobí Ditto kolizi bez ohledu na hodnotu", function () {
  assert.deepEqual(scoreKantoTrumfRound({ id: 25, attack: 55 }, { id: 25, attack: 55 }, "attack"), {
    points: [0, 0], winner: null, kind: "ditto", values: [55, 55]
  });
});

test("Každá role spotřebovává vlastní kopii karty a opakované použití je atomicky odmítnuté", function () {
  const used = [new Set(), new Set()];
  assert.equal(consumeKantoTrumfCards(used, [25, 25]), true);
  assert.deepEqual(Array.from(used[0]), [25]);
  assert.deepEqual(Array.from(used[1]), [25]);

  assert.equal(consumeKantoTrumfCards(used, [25, 1]), false);
  assert.equal(used[1].has(1), false);
  assert.equal(consumeKantoTrumfCards(used, [1, 25]), false);
  assert.equal(used[0].has(1), false);
  assert.equal(consumeKantoTrumfCards(used, [1, 2]), true);
});

test("Timeout vybírá deterministicky pouze z dostupných karet", function () {
  const available = [151, 8, 42, 8];
  const first = pickKantoTrumfTimeoutCard("časový-seed", 0, 3, available);
  assert.equal(first, pickKantoTrumfTimeoutCard("časový-seed", 0, 3, available));
  assert.ok([8, 42, 151].includes(first));
  assert.equal(pickKantoTrumfTimeoutCard("časový-seed", 0, 3, []), null);
});

test("Practice bot je seedovaný a vybírá mezi třemi nejlepšími dostupnými kartami", function () {
  const setup = buildKantoTrumfSetup("botova-ruka");
  const available = setup.pokemonIds.slice();
  const rankedTopThree = available.slice().sort(function (firstId, secondId) {
    return POKEMON_BY_ID.get(secondId).attack - POKEMON_BY_ID.get(firstId).attack || firstId - secondId;
  }).slice(0, 3);
  const first = pickKantoTrumfBotCard("botova-ruka", 0, "attack", available);
  assert.equal(first, pickKantoTrumfBotCard("botova-ruka", 0, "attack", available));
  assert.ok(rankedTopThree.includes(first));
});

test("Commit skryje volbu a validátor odmítá duplicitu, špatné kolo, roli i hash", async function () {
  const nonce = "ab".repeat(KANTO_TRUMF.nonceBytes);
  const hash = await hashKantoTrumfChoice(2, 0, 25, nonce);
  const commit = { type: KANTO_TRUMF_MESSAGE_TYPES.commit, round: 2, role: 0, hash };

  assert.deepEqual(Object.keys(commit).sort(), ["hash", "role", "round", "type"]);
  assert.equal(validateKantoTrumfCommit(commit, { role: 0, round: 2, received: false }), true);
  assert.equal(validateKantoTrumfCommit(commit, { role: 0, round: 2, received: true }), false);
  assert.equal(validateKantoTrumfCommit(commit, { role: 0, round: 3, received: false }), false);
  assert.equal(validateKantoTrumfCommit(commit, { role: 1, round: 2, received: false }), false);
  assert.equal(validateKantoTrumfCommit({ ...commit, hash: "ne-hash" }, { role: 0, round: 2 }), false);
  [
    null,
    [],
    { ...commit, type: KANTO_TRUMF_MESSAGE_TYPES.reveal },
    { ...commit, round: "2" },
    { ...commit, round: 2.5 },
    { ...commit, role: "0" },
    { ...commit, role: 0.5 },
    { ...commit, hash: "a".repeat(63) },
    { ...commit, hash: "A".repeat(64) },
    { ...commit, hash: "z".repeat(64) }
  ].forEach(function (invalid) {
    assert.equal(validateKantoTrumfCommit(invalid, { role: 0, round: 2, received: false }), false);
  });
  assert.equal(validateKantoTrumfCommit({ ...commit, v: 2, matchId: "match" }, {
    role: 0, round: 2, received: false
  }), true);
  assert.notEqual(hash, await hashKantoTrumfChoice(2, 0, 26, nonce));
  assert.notEqual(hash, await hashKantoTrumfChoice(2, 1, 25, nonce));
});

test("Reveal ověří hash, pořadí, kolo, nonce, dostupnost i ID", async function () {
  const nonce = "cd".repeat(KANTO_TRUMF.nonceBytes);
  const hash = await hashKantoTrumfChoice(1, 1, 42, nonce);
  const reveal = {
    type: KANTO_TRUMF_MESSAGE_TYPES.reveal,
    round: 1,
    role: 1,
    pokemonId: 42,
    nonce
  };
  const expected = {
    role: 1,
    round: 1,
    commitsReady: true,
    received: false,
    allowedIds: [7, 42, 151],
    usedIds: new Set(),
    commitHash: hash
  };

  assert.equal(await validateKantoTrumfReveal(reveal, expected), true);
  assert.equal(await validateKantoTrumfReveal(reveal, { ...expected, commitsReady: false }), false);
  assert.equal(await validateKantoTrumfReveal(reveal, { ...expected, received: true }), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, round: 2 }, expected), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, role: 0 }, expected), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, pokemonId: 999 }, expected), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, pokemonId: 41 }, expected), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, nonce: "x".repeat(32) }, expected), false);
  assert.equal(await validateKantoTrumfReveal({ ...reveal, nonce: "ef".repeat(KANTO_TRUMF.nonceBytes) }, expected), false);
  assert.equal(await validateKantoTrumfReveal(reveal, { ...expected, usedIds: new Set([42]) }), false);
  assert.equal(await validateKantoTrumfReveal(reveal, { ...expected, commitHash: "0".repeat(64) }), false);
  const invalidReveals = [
    { ...reveal, type: KANTO_TRUMF_MESSAGE_TYPES.commit },
    { ...reveal, round: "1" },
    { ...reveal, round: 1.5 },
    { ...reveal, role: "1" },
    { ...reveal, pokemonId: "42" },
    { ...reveal, pokemonId: 42.5 },
    { ...reveal, pokemonId: NaN }
  ];
  for (const invalid of invalidReveals) {
    assert.equal(await validateKantoTrumfReveal(invalid, expected), false);
  }
  assert.equal(await validateKantoTrumfReveal({ ...reveal, v: 2, matchId: "match" }, expected), true);
});

test("Výsledková hranice odmítá nečíselné skóre a omezuje celý rozsah na 0–12", function () {
  assert.equal(normalizeKantoTrumfResult(null), null);
  assert.equal(normalizeKantoTrumfResult({ score: NaN }), null);
  assert.equal(normalizeKantoTrumfResult({ score: Infinity }), null);
  assert.equal(normalizeKantoTrumfResult({ score: -Infinity }), null);
  assert.deepEqual(normalizeKantoTrumfResult({ score: -999 }), { score: 0 });
  assert.deepEqual(normalizeKantoTrumfResult({ score: 5.6 }), { score: 6 });
  assert.deepEqual(normalizeKantoTrumfResult({ score: Number.MAX_VALUE }), { score: KANTO_TRUMF.maximumScore });
  assert.equal(formatKantoTrumfResult({ score: 9 }), "9/12 trumfových bodů");
});

test("Kanto Trumf je registrovaná shared hra bez samostatného practice výsledku", function () {
  assert.ok(GAME_IDS.includes("kanto-trumf"));
  assert.equal(getGameDefinition("kanto-trumf").title, "Kanto Trumf");
  assert.equal(getGame("kanto-trumf").result.mode, "shared");
  assert.deepEqual(normalizeGameResult("kanto-trumf", { score: 18 }), { score: 12 });
  assert.equal(formatGameResult("kanto-trumf", { score: 12 }), "12/12 trumfových bodů");
  assert.throws(function () { createPracticeResult("kanto-trumf", "seed"); }, /sdílený výsledek/);
});

test("Runtime Kanto Trumfu používá jen lokální snapshot bez fetch requestů", async function () {
  const gameSource = await readFile(new URL("../duel/games/kanto-trumf.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(gameSource, /\bfetch\s*\(/);
});

test("Shared výsledek zůstává lokálně kanonický a app odmítá vzdálené result zprávy", async function () {
  const appSource = await readFile(new URL("../duel/app.mjs", import.meta.url), "utf8");
  assert.match(appSource, /getGame\(state\.match\.game\)\.result\.mode === "shared"\) return;/);
});
