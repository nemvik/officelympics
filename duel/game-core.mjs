export const GAME_IDS = Object.freeze([
  "panic",
  "deadline",
  "curling",
  "alttab",
  "battleship",
  "taskstack",
  "pong",
  "escape",
  "jargon"
]);

export const ALT_TAB_ROUNDS = 8;

export const BATTLESHIP = Object.freeze({
  size: 6,
  fleetLengths: Object.freeze([3, 2]),
  totalDecks: 5
});

export const TASK_STACK = Object.freeze({
  columns: 10,
  rows: 18,
  durationMs: 40_000
});

export const TASK_PIECES = Object.freeze({
  I: Object.freeze([[1, 1, 1, 1]]),
  O: Object.freeze([[1, 1], [1, 1]]),
  T: Object.freeze([[0, 1, 0], [1, 1, 1]]),
  L: Object.freeze([[0, 0, 1], [1, 1, 1]]),
  J: Object.freeze([[1, 0, 0], [1, 1, 1]]),
  S: Object.freeze([[0, 1, 1], [1, 1, 0]]),
  Z: Object.freeze([[1, 1, 0], [0, 1, 1]])
});

export const PONG = Object.freeze({
  width: 800,
  height: 450,
  paddleWidth: 14,
  paddleHeight: 96,
  paddleInset: 24,
  ballRadius: 11,
  startSpeed: 315,
  maximumSpeed: 540,
  winningScore: 5
});

export const ESCAPE = Object.freeze({
  width: 900,
  height: 360,
  groundY: 292,
  playerX: 132,
  playerWidth: 42,
  playerHeight: 58,
  duckHeight: 31,
  durationMs: 35_000,
  scrollSpeed: 0.27
});

export const JARGON_ROUNDS = 6;

export const JARGON_PHRASES = Object.freeze([
  "Musíme sladit očekávání napříč stakeholdery",
  "Pojďme zaparkovat detail a řešit kontext",
  "Potřebujeme škálovat synergii bez dalšího headcountu",
  "Tenhle quick win otevře nové příležitosti",
  "Uděláme hlubší ponor do priorit kvartálu",
  "Zkusme to uchopit více end to end",
  "Na roadmapě chybí vlastník tohoto akčního bodu",
  "Přenesme diskusi do menší pracovní skupiny",
  "Data potřebují trochu kreativnější interpretaci",
  "Nejdřív si pojďme srovnat společný sever",
  "Tohle téma potřebuje robustnější governance",
  "Musíme odemknout potenciál napříč celou organizací"
]);

export const PANIC_DURATION_MS = 20_000;

export const PANIC_EVENTS = Object.freeze([
  Object.freeze({ emoji: "🔥", label: "Produkce hoří", kind: "good", points: 3 }),
  Object.freeze({ emoji: "☕", label: "Doplnit kávu", kind: "good", points: 1 }),
  Object.freeze({ emoji: "💾", label: "Uložit dokument", kind: "good", points: 2 }),
  Object.freeze({ emoji: "📞", label: "Zvednout klienta", kind: "good", points: 2 }),
  Object.freeze({ emoji: "✅", label: "Schválit dovolenou", kind: "good", points: 1 }),
  Object.freeze({ emoji: "📣", label: "Odpovědět všem", kind: "bad", points: -2 }),
  Object.freeze({ emoji: "🎣", label: "Faktura_FINAL.zip", kind: "bad", points: -3 }),
  Object.freeze({ emoji: "🗓️", label: "Meeting bez agendy", kind: "bad", points: -2 }),
  Object.freeze({ emoji: "🔔", label: "Náhodný Slack", kind: "bad", points: -1 })
]);

export const CURLING = Object.freeze({
  width: 720,
  height: 880,
  ballRadius: 19,
  houseRadius: 108,
  targetX: 360,
  targetY: 166,
  launchX: 360,
  launchY: 730,
  inset: 24,
  friction: 190,
  wallBounce: 0.62,
  collisionBounce: 0.88,
  stopSpeed: 7,
  maxShotSpeed: 570,
  shotsPerPlayer: 3
});

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createRng(seed) {
  let value = hashString(seed) || 0x6d2b79f5;

  return function random() {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return values[0].toString(36) + values[1].toString(36);
  }

  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function buildAltTabRounds(seed) {
  const random = createRng("alt-tab:" + seed);
  const kinds = ["boss", "boss", "boss", "boss", "boss", "safe", "safe", "safe"];

  for (let index = kinds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = kinds[index];
    kinds[index] = kinds[swapIndex];
    kinds[swapIndex] = value;
  }

  return kinds.map(function (kind, index) {
    return {
      id: index,
      kind,
      wait: Math.round(1050 + random() * 1250),
      window: kind === "boss" ? 1450 : 1050
    };
  });
}

export function altTabReactionScore(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 0;
  return Math.max(100, Math.min(900, Math.round(1100 - milliseconds)));
}

export function buildBattleshipFleet(seed, owner) {
  const random = createRng("battleship:" + seed + ":" + owner);
  const occupied = new Set();
  const fleet = [];

  BATTLESHIP.fleetLengths.forEach(function (length) {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const horizontal = random() < 0.5;
      const maxX = horizontal ? BATTLESHIP.size - length : BATTLESHIP.size - 1;
      const maxY = horizontal ? BATTLESHIP.size - 1 : BATTLESHIP.size - length;
      const x = Math.floor(random() * (maxX + 1));
      const y = Math.floor(random() * (maxY + 1));
      const cells = Array.from({ length }, function (_, offset) {
        const cellX = horizontal ? x + offset : x;
        const cellY = horizontal ? y : y + offset;
        return cellY * BATTLESHIP.size + cellX;
      });

      if (cells.some(function (cell) { return occupied.has(cell); })) continue;
      cells.forEach(function (cell) { occupied.add(cell); });
      fleet.push(cells);
      return;
    }
  });

  return fleet;
}

export function battleshipShotResult(fleet, shots, cell) {
  const safeShots = shots instanceof Set ? shots : new Set(Array.isArray(shots) ? shots : []);
  const shipIndex = fleet.findIndex(function (ship) { return ship.includes(cell); });
  const hit = shipIndex >= 0;
  const sunk = hit && fleet[shipIndex].every(function (shipCell) { return safeShots.has(shipCell); });
  const allCells = fleet.flat();

  return {
    hit,
    sunk,
    fleetSunk: allCells.length > 0 && allCells.every(function (shipCell) { return safeShots.has(shipCell); })
  };
}

export function buildTaskBag(seed, bagIndex) {
  const random = createRng("task-bag:" + seed + ":" + bagIndex);
  const bag = Object.keys(TASK_PIECES);

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = bag[index];
    bag[index] = bag[swapIndex];
    bag[swapIndex] = value;
  }

  return bag;
}

export function clearTaskRows(board) {
  const columns = board[0] ? board[0].length : TASK_STACK.columns;
  const remaining = board.filter(function (row) {
    return !row.every(Boolean);
  }).map(function (row) { return row.slice(); });
  const cleared = board.length - remaining.length;

  while (remaining.length < board.length) {
    remaining.unshift(Array(columns).fill(0));
  }

  return { board: remaining, cleared };
}

export function addTaskGarbage(board, lines, hole) {
  const next = board.map(function (row) { return row.slice(); });
  const columns = next[0] ? next[0].length : TASK_STACK.columns;
  const safeLines = Math.min(4, Math.max(0, Math.floor(Number(lines) || 0)));
  const safeHole = Math.min(columns - 1, Math.max(0, Math.floor(Number(hole) || 0)));
  let overflow = false;

  for (let line = 0; line < safeLines; line += 1) {
    if (next[0] && next[0].some(Boolean)) overflow = true;
    next.shift();
    next.push(Array.from({ length: columns }, function (_, column) {
      return column === safeHole ? 0 : "garbage";
    }));
  }

  return { board: next, overflow };
}

export function createPongBall(seed, serveNumber = 0) {
  const random = createRng("pong-serve:" + seed + ":" + serveNumber);
  const direction = random() < 0.5 ? -1 : 1;
  const angle = (random() - 0.5) * 0.9;

  return {
    x: PONG.width / 2,
    y: PONG.height / 2,
    vx: Math.cos(angle) * PONG.startSpeed * direction,
    vy: Math.sin(angle) * PONG.startSpeed
  };
}

export function stepPong(state, dt) {
  if (!state || !state.ball || !Array.isArray(state.paddles) || state.paddles.length !== 2) return null;
  const safeDt = Math.min(1 / 30, Math.max(0, Number(dt) || 0));
  const ball = state.ball;
  ball.x += ball.vx * safeDt;
  ball.y += ball.vy * safeDt;

  if (ball.y - PONG.ballRadius < 0) {
    ball.y = PONG.ballRadius;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + PONG.ballRadius > PONG.height) {
    ball.y = PONG.height - PONG.ballRadius;
    ball.vy = -Math.abs(ball.vy);
  }

  const leftEdge = PONG.paddleInset + PONG.paddleWidth;
  const rightEdge = PONG.width - PONG.paddleInset - PONG.paddleWidth;
  const paddleHit = function (owner) {
    const paddleY = state.paddles[owner];
    return ball.y + PONG.ballRadius >= paddleY && ball.y - PONG.ballRadius <= paddleY + PONG.paddleHeight;
  };

  if (ball.vx < 0 && ball.x - PONG.ballRadius <= leftEdge && ball.x > PONG.paddleInset - PONG.ballRadius && paddleHit(0)) {
    const relative = (ball.y - (state.paddles[0] + PONG.paddleHeight / 2)) / (PONG.paddleHeight / 2);
    const speed = Math.min(PONG.maximumSpeed, Math.hypot(ball.vx, ball.vy) * 1.045);
    ball.x = leftEdge + PONG.ballRadius;
    ball.vx = Math.max(190, speed * Math.cos(relative * 0.85));
    ball.vy = speed * Math.sin(relative * 0.85);
    return { hit: 0, scored: null };
  }

  if (ball.vx > 0 && ball.x + PONG.ballRadius >= rightEdge && ball.x < PONG.width - PONG.paddleInset + PONG.ballRadius && paddleHit(1)) {
    const relative = (ball.y - (state.paddles[1] + PONG.paddleHeight / 2)) / (PONG.paddleHeight / 2);
    const speed = Math.min(PONG.maximumSpeed, Math.hypot(ball.vx, ball.vy) * 1.045);
    ball.x = rightEdge - PONG.ballRadius;
    ball.vx = -Math.max(190, speed * Math.cos(relative * 0.85));
    ball.vy = speed * Math.sin(relative * 0.85);
    return { hit: 1, scored: null };
  }

  if (ball.x + PONG.ballRadius < 0) return { hit: null, scored: 1 };
  if (ball.x - PONG.ballRadius > PONG.width) return { hit: null, scored: 0 };
  return { hit: null, scored: null };
}

export function buildEscapeCourse(seed, durationMs = ESCAPE.durationMs) {
  const random = createRng("meeting-escape:" + seed);
  const course = [];
  let at = 1700;

  while (at < durationMs - 900) {
    const roll = random();
    const type = roll < 0.56 ? "meeting" : roll < 0.84 ? "reply" : "coffee";
    course.push({
      id: course.length,
      at: Math.round(at),
      type,
      variant: Math.floor(random() * 3)
    });
    at += 920 + random() * 720;
  }

  return course;
}

export function rectanglesOverlap(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

export function buildJargonRounds(seed, count = JARGON_ROUNDS) {
  const random = createRng("jargon:" + seed);
  const indexes = JARGON_PHRASES.map(function (_, index) { return index; });

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = indexes[index];
    indexes[index] = indexes[swapIndex];
    indexes[swapIndex] = value;
  }

  return indexes.slice(0, Math.min(count, indexes.length)).map(function (phraseIndex, roundIndex) {
    const phrase = JARGON_PHRASES[phraseIndex];
    const answer = phrase.split(" ");
    const words = answer.slice();
    for (let index = words.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const value = words[index];
      words[index] = words[swapIndex];
      words[swapIndex] = value;
    }
    if (words.every(function (word, index) { return word === answer[index]; })) words.push(words.shift());

    return { id: roundIndex, phrase, answer, words };
  });
}

export function buildPanicSchedule(seed, durationMs = PANIC_DURATION_MS) {
  const random = createRng("panic:" + seed);
  const schedule = [];
  let at = 450;
  let previousSlot = -1;

  while (at < durationMs - 650) {
    const good = random() < 0.68;
    const poolStart = good ? 0 : 5;
    const poolLength = good ? 5 : 4;
    let slot = Math.floor(random() * 9);

    if (slot === previousSlot) slot = (slot + 1 + Math.floor(random() * 7)) % 9;
    previousSlot = slot;

    schedule.push({
      id: schedule.length,
      at: Math.round(at),
      slot,
      eventIndex: poolStart + Math.floor(random() * poolLength),
      lifetime: Math.round(900 + random() * 500),
      tilt: Math.round((random() * 8 - 4) * 10) / 10
    });

    at += 470 + random() * 340;
  }

  return schedule;
}

export function panicClickScore(currentScore, combo, event) {
  if (!event || event.kind !== "good") {
    return {
      score: Math.max(0, currentScore + (event ? event.points : 0)),
      combo: 0,
      delta: event ? event.points : 0
    };
  }

  const nextCombo = combo + 1;
  const bonus = Math.min(3, Math.floor(nextCombo / 3));
  const delta = event.points + bonus;

  return { score: currentScore + delta, combo: nextCombo, delta };
}

export function deadlineRoundConfig(seed, roundIndex) {
  const random = createRng("deadline:" + seed + ":" + roundIndex);

  return {
    speed: 27 + random() * 10,
    wobble: 0.08 + random() * 0.08,
    frequency: 2.1 + random() * 1.7,
    phase: random() * Math.PI * 2,
    fogAt: 69 + random() * 6
  };
}

export function deadlineProgress(config, heldMs) {
  const seconds = Math.max(0, heldMs) / 1000;
  const wave = Math.sin(seconds * config.frequency + config.phase) - Math.sin(config.phase);
  const progress = config.speed * seconds + config.speed * config.wobble * wave / config.frequency;
  return Math.max(0, progress);
}

export function deadlineRoundScore(progress) {
  if (!Number.isFinite(progress) || progress > 100) return 0;
  return Math.max(0, Math.round(100 - Math.abs(100 - progress) * 5));
}

export function createCurlingStone(owner, shotNumber) {
  return {
    id: "stone-" + shotNumber,
    owner,
    x: CURLING.launchX,
    y: CURLING.launchY,
    vx: 0,
    vy: 0,
    radius: CURLING.ballRadius
  };
}

export function clampShotVelocity(vx, vy) {
  let safeX = Number.isFinite(vx) ? vx : 0;
  let safeY = Number.isFinite(vy) ? vy : 0;
  const speed = Math.hypot(safeX, safeY);

  if (speed > CURLING.maxShotSpeed) {
    const scale = CURLING.maxShotSpeed / speed;
    safeX *= scale;
    safeY *= scale;
  }

  return { vx: safeX, vy: safeY };
}

function resolveWallCollision(stone) {
  const radius = stone.radius || CURLING.ballRadius;
  const minX = CURLING.inset + radius;
  const maxX = CURLING.width - CURLING.inset - radius;
  const minY = CURLING.inset + radius;
  const maxY = CURLING.height - CURLING.inset - radius;

  if (stone.x < minX) {
    stone.x = minX;
    stone.vx = Math.abs(stone.vx) * CURLING.wallBounce;
  } else if (stone.x > maxX) {
    stone.x = maxX;
    stone.vx = -Math.abs(stone.vx) * CURLING.wallBounce;
  }

  if (stone.y < minY) {
    stone.y = minY;
    stone.vy = Math.abs(stone.vy) * CURLING.wallBounce;
  } else if (stone.y > maxY) {
    stone.y = maxY;
    stone.vy = -Math.abs(stone.vy) * CURLING.wallBounce;
  }
}

function resolveStoneCollision(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  const minimum = (first.radius || CURLING.ballRadius) + (second.radius || CURLING.ballRadius);

  if (distance >= minimum) return;

  const safeDistance = distance || 0.0001;
  const nx = dx / safeDistance;
  const ny = dy / safeDistance;
  const overlap = minimum - safeDistance;

  first.x -= nx * overlap * 0.5;
  first.y -= ny * overlap * 0.5;
  second.x += nx * overlap * 0.5;
  second.y += ny * overlap * 0.5;

  const relativeX = second.vx - first.vx;
  const relativeY = second.vy - first.vy;
  const normalSpeed = relativeX * nx + relativeY * ny;

  if (normalSpeed >= 0) return;

  const impulse = -(1 + CURLING.collisionBounce) * normalSpeed / 2;
  const impulseX = impulse * nx;
  const impulseY = impulse * ny;

  first.vx -= impulseX;
  first.vy -= impulseY;
  second.vx += impulseX;
  second.vy += impulseY;
}

export function stepCurling(stones, dt) {
  const safeDt = Math.min(Math.max(Number(dt) || 0, 0), 1 / 30);

  stones.forEach(function (stone) {
    stone.x += stone.vx * safeDt;
    stone.y += stone.vy * safeDt;

    const speed = Math.hypot(stone.vx, stone.vy);
    if (speed > 0) {
      const nextSpeed = Math.max(0, speed - CURLING.friction * safeDt);
      const scale = nextSpeed / speed;
      stone.vx *= scale;
      stone.vy *= scale;
    }

    resolveWallCollision(stone);
  });

  for (let firstIndex = 0; firstIndex < stones.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < stones.length; secondIndex += 1) {
      resolveStoneCollision(stones[firstIndex], stones[secondIndex]);
    }
  }

  let moving = false;
  stones.forEach(function (stone) {
    const speed = Math.hypot(stone.vx, stone.vy);
    if (speed < CURLING.stopSpeed) {
      stone.vx = 0;
      stone.vy = 0;
    } else {
      moving = true;
    }
  });

  return moving;
}

export function sanitizeCurlingStones(value) {
  if (!Array.isArray(value)) return null;
  const maxStones = CURLING.shotsPerPlayer * 2;
  if (value.length > maxStones) return null;

  const stones = [];
  for (let index = 0; index < value.length; index += 1) {
    const source = value[index];
    if (!source || (source.owner !== 0 && source.owner !== 1)) return null;
    if (![source.x, source.y, source.vx, source.vy].every(Number.isFinite)) return null;

    stones.push({
      id: "stone-" + index,
      owner: source.owner,
      x: Math.min(CURLING.width, Math.max(0, source.x)),
      y: Math.min(CURLING.height, Math.max(0, source.y)),
      vx: 0,
      vy: 0,
      radius: CURLING.ballRadius
    });
  }

  return stones;
}

export function calculateCurlingScore(stones) {
  const inHouse = stones
    .map(function (stone) {
      return {
        owner: stone.owner,
        distance: Math.hypot(stone.x - CURLING.targetX, stone.y - CURLING.targetY)
      };
    })
    .filter(function (stone) { return stone.distance <= CURLING.houseRadius + CURLING.ballRadius; })
    .sort(function (first, second) { return first.distance - second.distance; });

  if (!inHouse.length) return { scores: [0, 0], winner: null, nearest: null };
  if (inHouse.length > 1 && Math.abs(inHouse[0].distance - inHouse[1].distance) < 0.5 && inHouse[0].owner !== inHouse[1].owner) {
    return { scores: [0, 0], winner: null, nearest: inHouse[0].distance };
  }

  const winner = inHouse[0].owner;
  const nearestOpponent = inHouse.find(function (stone) { return stone.owner !== winner; });
  const cutoff = nearestOpponent ? nearestOpponent.distance : Infinity;
  const points = inHouse.filter(function (stone) {
    return stone.owner === winner && stone.distance < cutoff;
  }).length;
  const scores = [0, 0];
  scores[winner] = points;

  return { scores, winner, nearest: inHouse[0].distance };
}

export function makeBotCurlingShot(seed, shotNumber, stones) {
  const random = createRng("curling-bot:" + seed + ":" + shotNumber);
  const opponentStone = stones
    .filter(function (stone) { return stone.owner === 0; })
    .sort(function (first, second) {
      const firstDistance = Math.hypot(first.x - CURLING.targetX, first.y - CURLING.targetY);
      const secondDistance = Math.hypot(second.x - CURLING.targetX, second.y - CURLING.targetY);
      return firstDistance - secondDistance;
    })[0];

  const attacksOpponent = opponentStone && random() < 0.32;
  const targetX = attacksOpponent ? opponentStone.x : CURLING.targetX + (random() - 0.5) * 54;
  const targetY = attacksOpponent ? opponentStone.y : CURLING.targetY + (random() - 0.5) * 42;
  const dx = targetX - CURLING.launchX;
  const dy = targetY - CURLING.launchY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const idealSpeed = Math.sqrt(2 * CURLING.friction * distance) * (0.98 + random() * 0.08);

  return clampShotVelocity(
    dx / distance * idealSpeed + (random() - 0.5) * 18,
    dy / distance * idealSpeed + (random() - 0.5) * 12
  );
}
