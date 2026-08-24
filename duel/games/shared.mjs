export const NOOP = function () {};

export function pointsWord(value) {
  return value === 1 ? "bod" : value >= 2 && value <= 4 ? "body" : "bodů";
}
