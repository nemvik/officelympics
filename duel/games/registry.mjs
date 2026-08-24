import { pickTournamentGameIds } from "../game-core.mjs";
import { altTabDuelGame } from "./alt-tab-duel.mjs";
import { calendarSqueezeGame } from "./calendar-squeeze.mjs";
import { coffeeRelayGame } from "./coffee-relay.mjs";
import { deadlineChickenGame } from "./deadline-chicken.mjs";
import { evolutionMemoryGame } from "./evolution-memory.mjs";
import { inboxPongGame } from "./inbox-pong.mjs";
import { jargonDecoderGame } from "./jargon-decoder.mjs";
import { kantoTrumfGame } from "./kanto-trumf.mjs";
import { meetingEscapeGame } from "./meeting-escape.mjs";
import { officePanicGame } from "./office-panic.mjs";
import { officePictionaryGame } from "./office-pictionary.mjs";
import { paperCurlingGame } from "./paper-curling.mjs";
import { pokeShadowGame } from "./poke-shadow.mjs";
import { printerExorcistGame } from "./printer-exorcist.mjs";
import { spreadsheetBattleshipGame } from "./spreadsheet-battleship.mjs";
import { taskStackGame } from "./task-stack.mjs";

// Nová hra potřebuje vlastní modul a jednu položku v tomto explicitním pořadí.
// Povinný kontrakt a checklist jsou v ./README.md.
export const GAMES = Object.freeze([
  officePanicGame,
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
  kantoTrumfGame,
  officePictionaryGame
]);

export const GAME_IDS = Object.freeze(GAMES.map(function (game) { return game.id; }));

if (new Set(GAME_IDS).size !== GAME_IDS.length) {
  throw new Error("Každá hra musí mít unikátní id.");
}

const GAME_BY_ID = new Map(GAMES.map(function (game) { return [game.id, game]; }));

export const GAME_DEFINITIONS = Object.freeze(GAMES.map(function (game) {
  return Object.freeze({ ...game.meta, id: game.id });
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
