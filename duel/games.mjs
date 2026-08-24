import { altTabReactionScore, createRng, deadlineRoundScore } from "./game-core.mjs";
import { startOfficePanic } from "./games/office-panic.mjs";
import { startDeadlineChicken } from "./games/deadline-chicken.mjs";
import { startPaperCurling } from "./games/paper-curling.mjs";
import { startAltTabDuel } from "./games/alt-tab-duel.mjs";
import { startSpreadsheetBattleship } from "./games/spreadsheet-battleship.mjs";
import { startTaskStack } from "./games/task-stack.mjs";
import { startInboxPong } from "./games/inbox-pong.mjs";
import { startMeetingEscape } from "./games/meeting-escape.mjs";
import { startJargonDecoder } from "./games/jargon-decoder.mjs";
import { startCoffeeRelay } from "./games/coffee-relay.mjs";
import { startCalendarSqueeze } from "./games/calendar-squeeze.mjs";
import { startPrinterExorcist } from "./games/printer-exorcist.mjs";
import { startOfficePictionary } from "./games/office-pictionary.mjs";

const GAME_STARTERS = Object.freeze({
  panic: startOfficePanic,
  deadline: startDeadlineChicken,
  curling: startPaperCurling,
  alttab: startAltTabDuel,
  battleship: startSpreadsheetBattleship,
  taskstack: startTaskStack,
  pong: startInboxPong,
  escape: startMeetingEscape,
  jargon: startJargonDecoder,
  coffee: startCoffeeRelay,
  calendar: startCalendarSqueeze,
  printer: startPrinterExorcist,
  pictionary: startOfficePictionary
});

export const IMPLEMENTED_GAME_IDS = Object.freeze(Object.keys(GAME_STARTERS));

export function startGame(gameId, context) {
  const start = GAME_STARTERS[gameId];
  if (!start) throw new Error("Chybí implementace hry: " + gameId);
  return start(context);
}

export function createPracticeResult(gameId, seed) {
  const random = createRng("practice-result:" + gameId + ":" + seed);

  if (gameId === "deadline") {
    const rounds = Array.from({ length: 5 }, function () {
      const progress = 91 + random() * 12;
      return {
        progress,
        points: deadlineRoundScore(progress)
      };
    });
    return {
      score: rounds.reduce(function (total, round) { return total + round.points; }, 0),
      rounds
    };
  }

  if (gameId === "alttab") {
    const reactions = Array.from({ length: 5 }, function () {
      return Math.round(285 + random() * 520);
    });
    const mistakes = random() < 0.45 ? 1 : 0;
    return {
      score: reactions.reduce(function (total, reaction) {
        return total + altTabReactionScore(reaction);
      }, 3 * 350) - mistakes * 350,
      reactions,
      mistakes,
      missed: random() < 0.22 ? 1 : 0,
      average: Math.round(reactions.reduce(function (total, value) { return total + value; }, 0) / reactions.length)
    };
  }

  if (gameId === "taskstack") {
    const lines = 3 + Math.floor(random() * 7);
    return {
      score: lines * 115 + Math.floor(random() * 420),
      lines,
      sent: Math.max(0, lines - 2),
      topOut: random() < 0.18
    };
  }

  if (gameId === "escape") {
    const crashes = Math.floor(random() * 4);
    const coffees = 1 + Math.floor(random() * 4);
    const distance = 2850 + Math.floor(random() * 1050);
    return {
      score: Math.max(0, distance + coffees * 150 - crashes * 250),
      distance,
      crashes,
      coffees
    };
  }

  if (gameId === "jargon") {
    const solved = 3 + Math.floor(random() * 4);
    const average = 2300 + Math.floor(random() * 3300);
    return {
      score: solved * 520 + Math.floor(random() * 850),
      solved,
      mistakes: Math.floor(random() * 5),
      average
    };
  }

  if (gameId === "coffee") {
    const served = 3 + Math.floor(random() * 3);
    const mistakes = Math.floor(random() * 4);
    const average = 1900 + Math.floor(random() * 2800);
    return {
      score: served * 610 + Math.floor(random() * 620),
      served,
      mistakes,
      average
    };
  }

  if (gameId === "calendar") {
    const booked = 4 + Math.floor(random() * 3);
    const mistakes = Math.floor(random() * 4);
    const average = 1400 + Math.floor(random() * 2600);
    return {
      score: booked * 650 + Math.floor(random() * 700),
      booked,
      mistakes,
      average
    };
  }

  if (gameId === "printer") {
    const repaired = 7 + Math.floor(random() * 4);
    const mistakes = Math.floor(random() * 5);
    const average = 620 + Math.floor(random() * 1250);
    return {
      score: repaired * 390 + Math.floor(random() * 650),
      repaired,
      mistakes,
      average
    };
  }

  return {
    score: 48 + Math.floor(random() * 34),
    hits: 13 + Math.floor(random() * 8),
    mistakes: Math.floor(random() * 5),
    misses: 3 + Math.floor(random() * 7)
  };
}
