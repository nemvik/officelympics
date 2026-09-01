import { pickTournamentGameIds } from "../game-core.mjs";
import { accessDeniedGame } from "./access-denied.mjs";
import { altTabDuelGame } from "./alt-tab-duel.mjs";
import { calendarSqueezeGame } from "./calendar-squeeze.mjs";
import { coffeeRelayGame } from "./coffee-relay.mjs";
import { cursorMazeGame } from "./cursor-maze.mjs";
import { deadlineChickenGame } from "./deadline-chicken.mjs";
import { evolutionMemoryGame } from "./evolution-memory.mjs";
import { harcovPriceGame } from "./harcov-price.mjs";
import { inboxZeroGame } from "./inbox-zero.mjs";
import { inboxPongGame } from "./inbox-pong.mjs";
import { jargonDecoderGame } from "./jargon-decoder.mjs";
import { kantoTrumfGame } from "./kanto-trumf.mjs";
import { kpiRouletteGame } from "./kpi-roulette.mjs";
import { meetingEscapeGame } from "./meeting-escape.mjs";
import { meetingTetrisGame } from "./meeting-tetris.mjs";
import { oakBingoGame } from "./oak-bingo.mjs";
import { officePanicGame } from "./office-panic.mjs";
import { officePictionaryGame } from "./office-pictionary.mjs";
import { paperShredderGame } from "./paper-shredder.mjs";
import { paperCurlingGame } from "./paper-curling.mjs";
import { pokeShadowGame } from "./poke-shadow.mjs";
import { postitSprintGame } from "./postit-sprint.mjs";
import { printerExorcistGame } from "./printer-exorcist.mjs";
import { safariDraftGame } from "./safari-draft.mjs";
import { spreadsheetBattleshipGame } from "./spreadsheet-battleship.mjs";
import { taskStackGame } from "./task-stack.mjs";

// Nová hra potřebuje vlastní modul a jednu položku v tomto explicitním pořadí.
// Povinný kontrakt a checklist jsou v ./README.md.
export const GAMES = Object.freeze([
  officePanicGame,
  postitSprintGame,
  inboxZeroGame,
  cursorMazeGame,
  paperShredderGame,
  meetingTetrisGame,
  kpiRouletteGame,
  deadlineChickenGame,
  evolutionMemoryGame,
  paperCurlingGame,
  altTabDuelGame,
  spreadsheetBattleshipGame,
  taskStackGame,
  inboxPongGame,
  meetingEscapeGame,
  jargonDecoderGame,
  coffeeRelayGame,
  calendarSqueezeGame,
  printerExorcistGame,
  pokeShadowGame,
  oakBingoGame,
  kantoTrumfGame,
  safariDraftGame,
  officePictionaryGame,
  accessDeniedGame,
  harcovPriceGame
]);

export const GAME_IDS = Object.freeze(GAMES.map(function (game) { return game.id; }));

if (new Set(GAME_IDS).size !== GAME_IDS.length) {
  throw new Error("Každá hra musí mít unikátní id.");
}

export const GAME_CATEGORIES = Object.freeze([
  Object.freeze({
    id: "perception",
    icon: "⚡",
    label: "Postřeh & rychlost",
    description: "Rychlé reakce, přesné kliknutí a rozhodování pod tlakem.",
    gameIds: Object.freeze([
      "panic", "postit-sprint", "inbox-zero", "paper-shredder", "deadline",
      "alttab", "calendar", "printer", "poke-shadow", "kpi-roulette"
    ])
  }),
  Object.freeze({
    id: "strategy",
    icon: "♟️",
    label: "Strategie & logika",
    description: "Plánování, dedukce, taktika a pár rozhodnutí s následky.",
    gameIds: Object.freeze([
      "meeting-tetris", "curling", "battleship", "oak-bingo",
      "kanto-trumf", "safari-draft", "access-denied"
    ])
  }),
  Object.freeze({
    id: "memory",
    icon: "🧠",
    label: "Paměť & odhad",
    description: "Zapamatování, znalosti a kvalifikované tipování od oka.",
    gameIds: Object.freeze(["evolution-memory", "jargon", "coffee", "harcov-price"])
  }),
  Object.freeze({
    id: "action",
    icon: "🎮",
    label: "Akce & kreativita",
    description: "Pohyb, arkádové souboje a prostor pro vlastní tvorbu.",
    gameIds: Object.freeze(["cursor-maze", "taskstack", "pong", "escape", "pictionary"])
  })
]);

const GAME_CATEGORY_BY_ID = new Map(GAME_CATEGORIES.map(function (category) {
  return [category.id, category];
}));
const GAME_CATEGORY_ID_BY_GAME_ID = new Map();

GAME_CATEGORIES.forEach(function (category) {
  category.gameIds.forEach(function (gameId) {
    if (!GAME_IDS.includes(gameId)) throw new Error("Kategorie " + category.id + " obsahuje neznámou hru: " + gameId);
    if (GAME_CATEGORY_ID_BY_GAME_ID.has(gameId)) throw new Error("Hra " + gameId + " je ve více kategoriích.");
    GAME_CATEGORY_ID_BY_GAME_ID.set(gameId, category.id);
  });
});

if (GAME_CATEGORY_ID_BY_GAME_ID.size !== GAME_IDS.length) {
  const missingGames = GAME_IDS.filter(function (gameId) { return !GAME_CATEGORY_ID_BY_GAME_ID.has(gameId); });
  throw new Error("Hry bez kategorie: " + missingGames.join(", "));
}

const GAME_BY_ID = new Map(GAMES.map(function (game) { return [game.id, game]; }));

export const GAME_DEFINITIONS = Object.freeze(GAMES.map(function (game) {
  return Object.freeze({ ...game.meta, id: game.id, category: GAME_CATEGORY_ID_BY_GAME_ID.get(game.id) });
}));

const GAME_DEFINITION_BY_ID = new Map(GAME_DEFINITIONS.map(function (game) {
  return [game.id, game];
}));

export function getGame(gameId) {
  return GAME_BY_ID.get(gameId) || null;
}

export function getGameDefinition(gameId) {
  return GAME_DEFINITION_BY_ID.get(gameId) || null;
}

export function getGameCategoryDefinition(categoryId) {
  return GAME_CATEGORY_BY_ID.get(categoryId) || null;
}

function requireGame(gameId) {
  const game = getGame(gameId);
  if (!game) throw new Error("Neznámá hra: " + gameId);
  return game;
}

export function startGame(gameId, context) {
  const controller = requireGame(gameId).start(context);
  if (!controller || typeof controller.receiveNetwork !== "function" || typeof controller.cleanup !== "function") {
    throw new TypeError("Hra " + gameId + " musí vrátit controller s receiveNetwork() a cleanup().");
  }
  return controller;
}

export function normalizeGameResult(gameId, result) {
  const game = getGame(gameId);
  return game ? game.result.normalize(result) : null;
}

export function createPracticeResult(gameId, seed) {
  const game = requireGame(gameId);
  if (game.result.mode !== "local") {
    throw new Error("Hra " + gameId + " vytváří sdílený výsledek a nepotřebuje výsledek bota.");
  }
  const normalized = game.result.normalize(game.result.createPractice(seed));
  if (!normalized) throw new TypeError("Hra " + gameId + " vytvořila neplatný výsledek bota.");
  return normalized;
}

export function formatGameResult(gameId, result) {
  const formatted = requireGame(gameId).result.format(result);
  if (typeof formatted !== "string" || !formatted.trim()) {
    throw new TypeError("Hra " + gameId + " musí vrátit neprázdný text výsledku.");
  }
  return formatted;
}

export function pickTournamentGames(seed, count = 3) {
  return pickTournamentGameIds(seed, GAME_IDS, count);
}
