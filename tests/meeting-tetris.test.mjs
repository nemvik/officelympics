import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMeetingTetrisRounds,
  canPlaceMeeting,
  createMeetingTetrisPracticeResult,
  MEETING_TETRIS,
  meetingTetrisRoundScore,
  normalizeMeetingTetrisResult
} from "../duel/games/meeting-tetris.mjs";
import {
  createPracticeResult,
  formatGameResult,
  GAME_IDS,
  getGame,
  getGameDefinition,
  normalizeGameResult
} from "../duel/games/registry.mjs";

test("Meeting Tetris generuje čtyři deterministické a řešitelné pracovní dny", function () {
  const first = buildMeetingTetrisRounds("meeting-seed");
  const second = buildMeetingTetrisRounds("meeting-seed");
  const different = buildMeetingTetrisRounds("jiny-meeting");
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.equal(first.length, MEETING_TETRIS.rounds);
  assert.equal(first.reduce(function (sum, round) { return sum + round.meetings.length; }, 0), MEETING_TETRIS.totalMeetings);

  first.forEach(function (round) {
    const occupied = Array(MEETING_TETRIS.slots).fill(false);
    round.busy.forEach(function (slot) { occupied[slot] = true; });
    round.meetings.forEach(function (meeting) {
      assert.equal(canPlaceMeeting(occupied, meeting.solutionStart, meeting.duration), true);
      for (let offset = 0; offset < meeting.duration; offset += 1) occupied[meeting.solutionStart + offset] = true;
    });
    assert.equal(occupied.every(Boolean), true);
  });
});

test("Meeting Tetris odmítá překryv a přetečení kalendáře", function () {
  assert.equal(canPlaceMeeting([false, false, true, false], 0, 2), true);
  assert.equal(canPlaceMeeting([false, false, true, false], 1, 2), false);
  assert.equal(canPlaceMeeting([false, false, false, false], 3, 2), false);
  assert.equal(canPlaceMeeting([false, false], -1, 1), false);
  assert.equal(canPlaceMeeting(null, 0, 1), false);
});

test("Bodování Meeting Tetrisu zvýhodňuje rychlé úplné řešení bez kolizí", function () {
  assert.equal(meetingTetrisRoundScore(0, 0, 6, 6, true), 1_800);
  assert.ok(meetingTetrisRoundScore(3_000, 0, 6, 6, true)
    > meetingTetrisRoundScore(12_000, 0, 6, 6, true));
  assert.ok(meetingTetrisRoundScore(5_000, 0, 6, 6, true)
    > meetingTetrisRoundScore(5_000, 3, 6, 6, true));
  assert.equal(meetingTetrisRoundScore(15_000, 0, 3, 6, false), 360);
});

test("Meeting Tetris má omezený výsledek a deterministického bota", function () {
  assert.ok(GAME_IDS.includes("meeting-tetris"));
  assert.equal(getGameDefinition("meeting-tetris").title, "Meeting Tetris");
  assert.equal(getGame("meeting-tetris").result.mode, "local");
  assert.equal(normalizeMeetingTetrisResult(null), null);
  assert.deepEqual(normalizeGameResult("meeting-tetris", {
    score: Number.MAX_VALUE,
    completed: Number.MAX_VALUE,
    scheduled: Number.MAX_VALUE,
    mistakes: Number.MAX_VALUE,
    average: Infinity
  }), {
    score: MEETING_TETRIS.maximumScore,
    completed: MEETING_TETRIS.rounds,
    scheduled: MEETING_TETRIS.totalMeetings,
    mistakes: 99,
    average: MEETING_TETRIS.roundDurationMs
  });
  const bot = createMeetingTetrisPracticeResult("calendar-bot");
  assert.deepEqual(bot, createPracticeResult("meeting-tetris", "calendar-bot"));
  assert.deepEqual(bot, createMeetingTetrisPracticeResult("calendar-bot"));
  assert.match(formatGameResult("meeting-tetris", bot), /^\d+\/22 meetingů · \d+ (kolize|kolizí)$/);
});
