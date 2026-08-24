export const NOOP = function () {};

const REQUIRED_META_FIELDS = Object.freeze([
  "icon",
  "title",
  "teaser",
  "difficulty",
  "instruction",
  "scoreLabel"
]);

export function defineGame(definition) {
  if (!definition || typeof definition !== "object") throw new TypeError("Definice hry musí být objekt.");
  if (!/^[a-z][a-z0-9-]*$/.test(definition.id || "")) {
    throw new TypeError("Hra musí mít platné id.");
  }
  if (typeof definition.start !== "function") {
    throw new TypeError("Hra " + definition.id + " musí mít start().");
  }

  const meta = definition.meta;
  if (!meta || typeof meta !== "object") {
    throw new TypeError("Hra " + definition.id + " musí mít metadata.");
  }
  REQUIRED_META_FIELDS.forEach(function (field) {
    if (typeof meta[field] !== "string" || !meta[field].trim()) {
      throw new TypeError("Hra " + definition.id + " nemá platné meta." + field + ".");
    }
  });
  if (meta.compactTitle !== undefined && (typeof meta.compactTitle !== "string" || !meta.compactTitle.trim())) {
    throw new TypeError("Hra " + definition.id + " nemá platné meta.compactTitle.");
  }

  const result = definition.result;
  if (!result || !["local", "shared"].includes(result.mode)) {
    throw new TypeError("Hra " + definition.id + " musí určit result.mode.");
  }
  if (typeof result.normalize !== "function" || typeof result.format !== "function") {
    throw new TypeError("Hra " + definition.id + " musí mít normalizaci a formátování výsledku.");
  }
  if (result.mode === "local" && typeof result.createPractice !== "function") {
    throw new TypeError("Lokální hra " + definition.id + " musí umět vytvořit výsledek bota.");
  }
  if (result.mode === "shared" && result.createPractice !== undefined) {
    throw new TypeError("Sdílená hra " + definition.id + " nesmí mít samostatný výsledek bota.");
  }

  return Object.freeze({
    id: definition.id,
    meta: Object.freeze({ ...meta }),
    start: definition.start,
    result: Object.freeze({ ...result })
  });
}

export function safeScore(value, maximum = 9999) {
  return Math.min(maximum, Math.max(0, Math.round(Number(value) || 0)));
}

export function safeSmallInteger(value, maximum = 9999) {
  return Math.min(maximum, Math.max(0, Math.round(Number(value) || 0)));
}

export function normalizeScoreResult(result, maximum = 9999) {
  if (!result || typeof result !== "object" || !Number.isFinite(result.score)) return null;
  return { score: safeScore(result.score, maximum) };
}

export function czechCount(value, one, few, many) {
  if (value === 1) return one;
  if (value >= 2 && value <= 4) return few;
  return many;
}

export function pointsWord(value) {
  return value === 1 ? "bod" : value >= 2 && value <= 4 ? "body" : "bodů";
}
