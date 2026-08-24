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

export function pickTournamentGameIds(seed, gameIds, count = 3) {
  if (!Array.isArray(gameIds) || !gameIds.length) return [];
  const tournamentSize = Math.min(gameIds.length, Math.max(1, Math.floor(Number(count) || 3)));
  const random = createRng("tournament:" + seed);
  const games = gameIds.slice();

  for (let index = games.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [games[index], games[target]] = [games[target], games[index]];
  }

  return games.slice(0, tournamentSize);
}

export function tournamentRoundPoints(firstScore, secondScore) {
  const first = Number(firstScore) || 0;
  const second = Number(secondScore) || 0;
  if (first === second) return [0.5, 0.5];
  return first > second ? [1, 0] : [0, 1];
}

export function makeSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return values[0].toString(36) + values[1].toString(36);
  }

  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
