import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildPokeShadowRounds,
  createPokeShadowPracticeResult,
  POKE_SHADOW,
  pokeShadowScore
} from "../duel/games/poke-shadow.mjs";
import { POKEMON_SNAPSHOT, POKEMON_SNAPSHOT_META } from "../duel/games/pokemon/snapshot.mjs";
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

test("Pokémon snapshot obsahuje právě druhy 1–151 a zobrazovaná jména", function () {
  assert.equal(POKEMON_SNAPSHOT_META.minimumId, 1);
  assert.equal(POKEMON_SNAPSHOT_META.maximumId, 151);
  assert.equal(POKEMON_SNAPSHOT_META.count, 151);
  assert.equal(POKEMON_SNAPSHOT.length, 151);
  assert.deepEqual(POKEMON_SNAPSHOT.map(function (pokemon) { return pokemon.id; }),
    Array.from({ length: 151 }, function (_, index) { return index + 1; }));

  POKEMON_SNAPSHOT.forEach(function (pokemon) {
    assert.ok(pokemon.name);
    assert.ok(/^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/[a-f0-9]{40}\//.test(pokemon.sprite));
    assert.ok(Array.isArray(pokemon.types) && pokemon.types.length >= 1);
    assert.ok(Number.isFinite(pokemon.hp) && pokemon.hp > 0);
    assert.ok(Number.isFinite(pokemon.attack) && pokemon.attack > 0);
    assert.ok(Number.isFinite(pokemon.defense) && pokemon.defense > 0);
    assert.ok(Number.isFinite(pokemon.speed) && pokemon.speed > 0);
    assert.ok(Number.isFinite(pokemon.height) && pokemon.height > 0);
    assert.ok(Number.isFinite(pokemon.weight) && pokemon.weight > 0);
    assert.ok(pokemon.color);
    assert.ok(pokemon.shape);
  });

  assert.equal(POKEMON_BY_ID.get(29).name, "Nidoran♀");
  assert.equal(POKEMON_BY_ID.get(32).name, "Nidoran♂");
  assert.equal(POKEMON_BY_ID.get(83).name, "Farfetch’d");
  assert.equal(POKEMON_BY_ID.get(122).name, "Mr. Mime");
});

test("PokéStín generuje podle seedu stejných osm platných kol", function () {
  const first = buildPokeShadowRounds("stiny-v-kancelari");
  const second = buildPokeShadowRounds("stiny-v-kancelari");
  const different = buildPokeShadowRounds("jiny-stin");

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, POKE_SHADOW.rounds);
  assert.equal(new Set(first.map(function (round) { return round.answerId; })).size, POKE_SHADOW.rounds);

  const answerPositions = first.map(function (round) {
    assert.ok(round.answerId >= 1 && round.answerId <= 151);
    assert.equal(round.options.length, POKE_SHADOW.optionCount);
    assert.equal(new Set(round.options).size, POKE_SHADOW.optionCount);
    assert.ok(round.options.includes(round.answerId));
    assert.ok(round.options.every(function (pokemonId) {
      return pokemonId >= 1 && pokemonId <= 151 && POKEMON_BY_ID.has(pokemonId);
    }));
    return round.options.indexOf(round.answerId);
  });

  assert.deepEqual(answerPositions.slice().sort(), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test("PokéStín preferuje matoucí možnosti před fallbackem", function () {
  buildPokeShadowRounds("matouci-volby").forEach(function (round) {
    const answer = POKEMON_BY_ID.get(round.answerId);
    round.options.filter(function (pokemonId) {
      return pokemonId !== round.answerId;
    }).forEach(function (pokemonId) {
      const candidate = POKEMON_BY_ID.get(pokemonId);
      const sharesPreferredTrait = candidate.types[0] === answer.types[0]
        || candidate.shape === answer.shape
        || candidate.color === answer.color;
      assert.equal(sharesPreferredTrait, true, answer.name + " dostal nevěrohodný fallback " + candidate.name);
    });
  });
});

test("PokéStín má deterministický fallback i bez podobných kandidátů", function () {
  const records = [
    { id: 1, name: "A", types: ["grass"], shape: "quadruped", color: "green" },
    { id: 2, name: "B", types: ["fire"], shape: "upright", color: "red" },
    { id: 3, name: "C", types: ["water"], shape: "fish", color: "blue" },
    { id: 4, name: "D", types: ["electric"], shape: "ball", color: "yellow" },
    { id: 152, name: "Mimo rozsah", types: ["normal"], shape: "blob", color: "white" }
  ];
  const first = buildPokeShadowRounds("fallback", 1, records);
  assert.deepEqual(first, buildPokeShadowRounds("fallback", 1, records));
  assert.equal(first.length, 1);
  assert.deepEqual(first[0].options.slice().sort(function (a, b) { return a - b; }), [1, 2, 3, 4]);
});

test("Skóre PokéStínu plynule klesá od 1000 do 100 bodů", function () {
  assert.equal(pokeShadowScore(0), 1000);
  assert.equal(pokeShadowScore(1000), 940);
  assert.equal(pokeShadowScore(7500), 550);
  assert.equal(pokeShadowScore(15000), 100);
  assert.equal(pokeShadowScore(60_000), 100);
  assert.equal(pokeShadowScore(-500), 1000);
  assert.equal(pokeShadowScore(NaN), 0);
  assert.equal(pokeShadowScore(Infinity), 0);
});

test("Výsledková hranice PokéStínu odmítá neplatná skóre a omezuje extrémy", function () {
  assert.equal(normalizeGameResult("poke-shadow", null), null);
  assert.equal(normalizeGameResult("poke-shadow", { score: NaN }), null);
  assert.equal(normalizeGameResult("poke-shadow", { score: Infinity }), null);
  assert.equal(normalizeGameResult("poke-shadow", { score: -Infinity }), null);
  assert.deepEqual(normalizeGameResult("poke-shadow", { score: -42, correct: -3, average: -1 }), {
    score: 0,
    correct: 0,
    average: 0
  });
  assert.deepEqual(normalizeGameResult("poke-shadow", {
    score: Number.MAX_VALUE,
    correct: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: POKE_SHADOW.maximumScore,
    correct: POKE_SHADOW.rounds,
    average: POKE_SHADOW.roundDurationMs
  });
  assert.deepEqual(normalizeGameResult("poke-shadow", { score: 8000, correct: 0, average: 1000 }), {
    score: 0,
    correct: 0,
    average: 0
  });
  assert.deepEqual(normalizeGameResult("poke-shadow", { score: 150, correct: 8, average: 1000 }), {
    score: 150,
    correct: 1,
    average: 1000
  });
});

test("PokéStín je registrovaná lokální hra s věrohodným deterministickým botem", function () {
  assert.ok(GAME_IDS.includes("poke-shadow"));
  assert.equal(getGameDefinition("poke-shadow").title, "PokéStín");
  assert.equal(getGame("poke-shadow").result.mode, "local");

  const first = createPokeShadowPracticeResult("kolega-bot");
  const second = createPracticeResult("poke-shadow", "kolega-bot");
  assert.deepEqual(first, second);
  assert.deepEqual(second, createPracticeResult("poke-shadow", "kolega-bot"));
  assert.ok(second.correct >= 4 && second.correct <= 7);
  assert.ok(second.score >= second.correct * 100 && second.score <= second.correct * 1000);
  assert.ok(second.average >= 2125 && second.average <= 11250);
  assert.match(formatGameResult("poke-shadow", second), /^\d\/8 Pokémonů poznáno · průměr \d,\d s$/);
});

test("Runtime modul PokéStínu neobsahuje síťové načítání dat", async function () {
  const gameSource = await readFile(new URL("../duel/games/poke-shadow.mjs", import.meta.url), "utf8");
  const snapshotSource = await readFile(new URL("../duel/games/pokemon/snapshot.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(gameSource, /\bfetch\s*\(/);
  assert.doesNotMatch(snapshotSource, /\bfetch\s*\(/);
});
