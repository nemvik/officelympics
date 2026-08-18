"use strict";

const DEFAULT_PARTICIPANT_COUNT = 8;
const STATE_VERSION = 3;
const STORAGE_KEY = "officelympicsScoreboardV2";
const LEGACY_STORAGE_KEY = "officelympicsScoreboard";
const POINTS = Object.freeze({ 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 });
const CONFETTI_COLORS = Object.freeze(["#ff0f7b", "#ffd51f", "#48a7ff", "#55e895", "#ff5b4d", "#ffffff"]);

const DISCIPLINES = Object.freeze([
  {
    id: "spins",
    short: "Otočky",
    name: "Otočky na židli",
    unit: "otoček",
    step: 1,
    min: 0,
    max: null,
    hint: "Zadej počet celých dokončených otoček z lepšího pokusu."
  },
  {
    id: "ride",
    short: "Jízda",
    name: "Jízda na židli",
    unit: "m",
    step: 0.01,
    min: 0,
    max: null,
    hint: "Zadej délku lepší platné jízdy v metrech."
  },
  {
    id: "jump",
    short: "Skok",
    name: "Skok nad dveře",
    unit: "cm",
    step: 0.1,
    min: 0,
    max: null,
    hint: "Zadej výšku dotyku minus dosah ve stoje v centimetrech."
  },
  {
    id: "plane",
    short: "Vlaštovka",
    name: "Vlaštovka do dálky",
    unit: "m",
    step: 0.01,
    min: 0,
    max: null,
    hint: "Zadej délku nejdelšího hodu v metrech."
  },
  {
    id: "basket",
    short: "Koš",
    name: "Hod papírem do koše",
    unit: "bodů",
    step: 1,
    min: 0,
    max: 12,
    hint: "Zadej součet zásahů. Povolený výsledek je 0 až 12 bodů."
  }
]);

let state = loadState();
let latestCalculations = {};
let latestStats = [];
let latestRanking = { ranked: [], finalGroups: [], byIndex: new Map() };
let confettiCleanupTimer = null;
let winnerRevealReturnFocus = null;

const refs = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  refs.participantGrid = document.getElementById("participant-grid");
  refs.participantCount = document.getElementById("participant-count");
  refs.storageStatus = document.getElementById("storage-status");
  refs.disciplineTabs = document.getElementById("discipline-tabs");
  refs.disciplinePanels = document.getElementById("discipline-panels");
  refs.scoreStatus = document.getElementById("score-status");
  refs.leaderboardList = document.getElementById("leaderboard-list");
  refs.leaderboardNote = document.getElementById("leaderboard-note");
  refs.leaderboardToggle = document.getElementById("leaderboard-toggle");
  refs.leaderboardContent = document.getElementById("leaderboard-content");
  refs.leaderboardTeaser = document.getElementById("leaderboard-teaser");
  refs.finalTiebreaks = document.getElementById("final-tiebreaks");
  refs.printScoreBody = document.getElementById("print-score-body");
  refs.winnerReveal = document.getElementById("winner-reveal");
  refs.winnerClose = refs.winnerReveal.querySelector(".winner-close");
  refs.confettiLayer = document.getElementById("confetti-layer");

  buildParticipantFields();
  buildDisciplineControls();
  bindEvents();
  hydrateControls();

  const requestedPrintMode = new URLSearchParams(window.location.search).get("print");
  if (requestedPrintMode === "scores") {
    document.body.dataset.printMode = "scores";
  }

  recalculate();
}

function createEmptyState(count) {
  const participantTotal = count === undefined ? DEFAULT_PARTICIPANT_COUNT : count;
  const results = {};
  const dnf = {};
  const tieBreaks = {};

  DISCIPLINES.forEach(function (discipline) {
    results[discipline.id] = emptyStringArray(participantTotal);
    dnf[discipline.id] = emptyBooleanArray(participantTotal);
    tieBreaks[discipline.id] = emptyStringArray(participantTotal);
  });

  return {
    version: STATE_VERSION,
    participantCount: participantTotal,
    names: emptyStringArray(participantTotal),
    results: results,
    dnf: dnf,
    tieBreaks: tieBreaks,
    finalTieBreaks: emptyStringArray(participantTotal),
    activeDiscipline: DISCIPLINES[0].id
  };
}

function emptyStringArray(count) {
  return Array.from({ length: count }, function () { return ""; });
}

function emptyBooleanArray(count) {
  return Array.from({ length: count }, function () { return false; });
}

function normalizeStringArray(value, count) {
  return Array.from({ length: count }, function (_, index) {
    return Array.isArray(value) && value[index] !== undefined && value[index] !== null
      ? String(value[index])
      : "";
  });
}

function normalizeBooleanArray(value, count) {
  return Array.from({ length: count }, function (_, index) {
    return Boolean(Array.isArray(value) && value[index]);
  });
}

function inferParticipantCount(saved) {
  if (saved && Number.isSafeInteger(saved.participantCount) && saved.participantCount >= 0) {
    return saved.participantCount;
  }

  const arrays = [saved && saved.names, saved && saved.finalTieBreaks];
  DISCIPLINES.forEach(function (discipline) {
    arrays.push(saved && saved.results && saved.results[discipline.id]);
    arrays.push(saved && saved.dnf && saved.dnf[discipline.id]);
    arrays.push(saved && saved.tieBreaks && saved.tieBreaks[discipline.id]);
  });

  return arrays.reduce(function (count, value) {
    return Array.isArray(value) ? Math.max(count, value.length) : count;
  }, DEFAULT_PARTICIPANT_COUNT);
}

function participantCount() {
  return state.names.length;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const count = inferParticipantCount(saved);
      const loaded = createEmptyState(count);
      loaded.names = normalizeStringArray(saved.names, count);
      loaded.finalTieBreaks = normalizeStringArray(saved.finalTieBreaks, count);

      DISCIPLINES.forEach(function (discipline) {
        loaded.results[discipline.id] = normalizeStringArray(saved.results && saved.results[discipline.id], count);
        loaded.dnf[discipline.id] = normalizeBooleanArray(saved.dnf && saved.dnf[discipline.id], count);
        loaded.tieBreaks[discipline.id] = normalizeStringArray(saved.tieBreaks && saved.tieBreaks[discipline.id], count);
      });

      if (DISCIPLINES.some(function (discipline) { return discipline.id === saved.activeDiscipline; })) {
        loaded.activeDiscipline = saved.activeDiscipline;
      }

      return loaded;
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyRows = JSON.parse(legacyRaw);
      if (Array.isArray(legacyRows)) {
        const count = Math.max(DEFAULT_PARTICIPANT_COUNT, legacyRows.length);
        const migrated = createEmptyState(count);
        migrated.names = normalizeStringArray(legacyRows.map(function (row) {
          return row && row.name ? row.name : "";
        }), count);
        return migrated;
      }
    }
  } catch (error) {
    // Poškozené úložiště nesmí zablokovat bodování.
  }

  return createEmptyState();
}

function saveState() {
  try {
    state.version = STATE_VERSION;
    state.participantCount = participantCount();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderStorageStatus("saved", "● Uloženo automaticky v tomto prohlížeči");
  } catch (error) {
    renderStorageStatus("error", "⚠ Automatické uložení se nepodařilo — výsledky zůstanou jen do obnovení stránky");
  }
}

function renderStorageStatus(status, message) {
  if (!refs.storageStatus || refs.storageStatus.dataset.state === status) return;
  refs.storageStatus.dataset.state = status;
  refs.storageStatus.textContent = message;
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function buildParticipantFields() {
  const fragment = document.createDocumentFragment();
  const count = participantCount();

  for (let index = 0; index < count; index += 1) {
    const field = makeElement("div", "participant-field");
    const label = makeElement("label", "participant-name-field");
    label.htmlFor = "participant-name-" + index;

    const number = makeElement("span", "participant-number", String(index + 1));
    number.setAttribute("aria-hidden", "true");

    const hiddenLabel = makeElement("span", "sr-only", "Jméno soutěžícího " + (index + 1));
    const input = makeElement("input");
    input.id = "participant-name-" + index;
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = "Jméno " + (index + 1);
    input.dataset.participantName = String(index);
    input.setAttribute("aria-label", "Jméno soutěžícího " + (index + 1));

    const removeButton = makeElement("button", "participant-remove", "×");
    removeButton.type = "button";
    removeButton.dataset.removeParticipant = String(index);
    removeButton.setAttribute("aria-label", "Odebrat " + participantName(index));
    removeButton.title = "Odebrat soutěžícího";

    label.append(hiddenLabel, input);
    field.append(number, label, removeButton);
    fragment.append(field);
  }

  if (!count) {
    fragment.append(makeElement("p", "participant-empty", "Zatím tu nikdo není. Přidej prvního soutěžícího."));
  }

  refs.participantGrid.append(fragment);
}

function buildDisciplineControls() {
  const tabsFragment = document.createDocumentFragment();
  const panelsFragment = document.createDocumentFragment();

  DISCIPLINES.forEach(function (discipline, disciplineIndex) {
    const tab = makeElement("button", "discipline-tab", (disciplineIndex + 1) + ". " + discipline.short);
    tab.type = "button";
    tab.id = "tab-" + discipline.id;
    tab.dataset.disciplineTab = discipline.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "panel-" + discipline.id);
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = -1;
    tabsFragment.append(tab);

    const panel = makeElement("section", "discipline-panel");
    panel.id = "panel-" + discipline.id;
    panel.dataset.disciplinePanel = discipline.id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.hidden = true;

    const intro = makeElement("div", "panel-intro");
    const introCopy = makeElement("div");
    introCopy.append(
      makeElement("h4", "", discipline.name),
      makeElement("p", "", discipline.hint)
    );
    intro.append(introCopy, makeElement("span", "unit-badge", "Jednotka: " + discipline.unit));

    const head = makeElement("div", "result-head");
    ["Soutěžící", "Výsledek", "DNF", "Místo", "Body"].forEach(function (heading) {
      head.append(makeElement("span", "", heading));
    });

    panel.append(intro, head);

    for (let participantIndex = 0; participantIndex < participantCount(); participantIndex += 1) {
      panel.append(buildResultRow(discipline, participantIndex));
    }

    const alert = makeElement("p", "panel-alert");
    alert.id = "alert-" + discipline.id;
    alert.dataset.panelAlert = discipline.id;
    alert.setAttribute("role", "status");
    alert.hidden = true;
    panel.append(alert);
    panelsFragment.append(panel);
  });

  refs.disciplineTabs.append(tabsFragment);
  refs.disciplinePanels.append(panelsFragment);
}

function buildResultRow(discipline, participantIndex) {
  const row = makeElement("div", "result-row");
  row.dataset.resultRow = String(participantIndex);
  row.dataset.discipline = discipline.id;

  const participant = makeElement("div", "participant-cell");
  const number = makeElement("span", "row-number", String(participantIndex + 1));
  number.setAttribute("aria-hidden", "true");
  const participantName = makeElement("span", "participant-label", fallbackName(participantIndex));
  participantName.dataset.rowParticipantName = String(participantIndex);
  participant.append(number, participantName);

  const resultField = makeElement("div", "result-field");
  resultField.append(makeElement("span", "mobile-field-label", "Výsledek"));

  const inputLabel = makeElement("label", "sr-only", discipline.name + " – výsledek – " + fallbackName(participantIndex));
  inputLabel.htmlFor = "result-" + discipline.id + "-" + participantIndex;
  inputLabel.dataset.resultInputLabel = String(participantIndex);

  const inputWrap = makeElement("span", "input-with-unit");
  const input = makeElement("input");
  input.id = "result-" + discipline.id + "-" + participantIndex;
  input.type = "number";
  input.inputMode = "decimal";
  input.min = String(discipline.min);
  input.step = String(discipline.step);
  if (discipline.max !== null) input.max = String(discipline.max);
  input.dataset.resultInput = discipline.id;
  input.dataset.participant = String(participantIndex);
  input.setAttribute("aria-label", discipline.name + " – výsledek – " + fallbackName(participantIndex));

  const unit = makeElement("span", "input-unit", discipline.unit);
  unit.setAttribute("aria-hidden", "true");
  inputWrap.append(input, unit);
  resultField.append(inputLabel, inputWrap);

  const dnfLabel = makeElement("label", "dnf-field");
  const dnfInput = makeElement("input");
  dnfInput.type = "checkbox";
  dnfInput.dataset.dnfInput = discipline.id;
  dnfInput.dataset.participant = String(participantIndex);
  dnfInput.setAttribute("aria-label", discipline.name + " – DNF – " + fallbackName(participantIndex));
  dnfLabel.append(dnfInput, document.createTextNode("DNF"));

  const place = makeElement("output", "place-cell", "—");
  place.dataset.placeOutput = String(participantIndex);
  place.setAttribute("aria-label", "Umístění");

  const points = makeElement("output", "points-cell", "—");
  points.dataset.pointsOutput = String(participantIndex);
  points.setAttribute("aria-label", "Body");

  const tieLabel = makeElement("label", "tiebreak-field");
  tieLabel.dataset.tiebreakField = String(participantIndex);
  tieLabel.hidden = true;
  tieLabel.append(makeElement("span", "", "Rozstřel: pořadí ve shodě"));

  const tieSelect = makeElement("select");
  tieSelect.dataset.tiebreakInput = discipline.id;
  tieSelect.dataset.participant = String(participantIndex);
  tieLabel.append(tieSelect);

  row.append(participant, resultField, dnfLabel, place, points, tieLabel);
  return row;
}

function bindEvents() {
  refs.participantGrid.addEventListener("input", function (event) {
    const input = event.target.closest("[data-participant-name]");
    if (!input) return;
    const participantIndex = Number(input.dataset.participantName);
    state.names[participantIndex] = input.value;
    const removeButton = input.closest(".participant-field").querySelector("[data-remove-participant]");
    removeButton.setAttribute("aria-label", "Odebrat " + participantName(participantIndex));
    recalculate();
  });

  refs.participantGrid.addEventListener("click", function (event) {
    const button = event.target.closest("[data-remove-participant]");
    if (!button) return;
    removeParticipant(Number(button.dataset.removeParticipant));
  });

  document.getElementById("add-participant").addEventListener("click", addParticipant);

  refs.disciplineTabs.addEventListener("click", function (event) {
    const tab = event.target.closest("[data-discipline-tab]");
    if (!tab) return;
    setActiveDiscipline(tab.dataset.disciplineTab, true);
  });

  refs.disciplineTabs.addEventListener("keydown", function (event) {
    const tab = event.target.closest("[data-discipline-tab]");
    if (!tab) return;
    const tabs = Array.from(refs.disciplineTabs.querySelectorAll("[role='tab']"));
    const currentIndex = tabs.indexOf(tab);
    let nextIndex = null;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    setActiveDiscipline(tabs[nextIndex].dataset.disciplineTab, true);
    tabs[nextIndex].focus();
  });

  refs.disciplinePanels.addEventListener("input", function (event) {
    const input = event.target.closest("[data-result-input]");
    if (!input) return;
    const disciplineId = input.dataset.resultInput;
    const participantIndex = Number(input.dataset.participant);
    state.results[disciplineId][participantIndex] = input.value;
    state.tieBreaks[disciplineId] = emptyStringArray(participantCount());
    state.finalTieBreaks = emptyStringArray(participantCount());
    recalculate();
  });

  refs.disciplinePanels.addEventListener("change", function (event) {
    const dnfInput = event.target.closest("[data-dnf-input]");
    if (dnfInput) {
      const disciplineId = dnfInput.dataset.dnfInput;
      const participantIndex = Number(dnfInput.dataset.participant);
      state.dnf[disciplineId][participantIndex] = dnfInput.checked;
      state.tieBreaks[disciplineId] = emptyStringArray(participantCount());
      state.finalTieBreaks = emptyStringArray(participantCount());
      recalculate();
      return;
    }

    const tieInput = event.target.closest("[data-tiebreak-input]");
    if (tieInput) {
      const disciplineId = tieInput.dataset.tiebreakInput;
      const participantIndex = Number(tieInput.dataset.participant);
      state.tieBreaks[disciplineId][participantIndex] = tieInput.value;
      state.finalTieBreaks = emptyStringArray(participantCount());
      recalculate();
    }
  });

  refs.finalTiebreaks.addEventListener("change", function (event) {
    const select = event.target.closest("[data-final-tiebreak]");
    if (!select) return;
    state.finalTieBreaks[Number(select.dataset.finalTiebreak)] = select.value;
    recalculate();
  });

  refs.leaderboardToggle.addEventListener("click", function () {
    setLeaderboardVisibility(refs.leaderboardToggle.getAttribute("aria-expanded") !== "true");
  });

  document.getElementById("announce-winners").addEventListener("click", announceWinners);
  document.getElementById("replay-confetti").addEventListener("click", launchConfetti);

  refs.winnerReveal.addEventListener("click", function (event) {
    if (event.target.closest("[data-close-winners]")) closeWinnerReveal();
  });

  document.addEventListener("keydown", handleWinnerRevealKeydown);

  document.getElementById("print-rules").addEventListener("click", function () {
    startPrint("rules");
  });

  document.getElementById("print-scores").addEventListener("click", function () {
    startPrint("scores");
  });

  document.getElementById("reset-scoreboard").addEventListener("click", resetScoreboard);

  window.addEventListener("beforeprint", function () {
    if (!document.body.dataset.printMode) {
      document.body.dataset.printMode = "rules";
    }
    updatePrintSheet();
  });

  window.addEventListener("afterprint", function () {
    if (new URLSearchParams(window.location.search).get("print") !== "scores") {
      delete document.body.dataset.printMode;
    }
  });
}

function hydrateControls() {
  refs.participantGrid.querySelectorAll("[data-participant-name]").forEach(function (input) {
    input.value = state.names[Number(input.dataset.participantName)];
  });

  DISCIPLINES.forEach(function (discipline) {
    const panel = document.getElementById("panel-" + discipline.id);
    panel.querySelectorAll("[data-result-input]").forEach(function (input) {
      input.value = state.results[discipline.id][Number(input.dataset.participant)];
    });
    panel.querySelectorAll("[data-dnf-input]").forEach(function (input) {
      input.checked = state.dnf[discipline.id][Number(input.dataset.participant)];
    });
  });

  setActiveDiscipline(state.activeDiscipline, false);
}

function rebuildParticipantControls() {
  refs.participantGrid.replaceChildren();
  refs.disciplineTabs.replaceChildren();
  refs.disciplinePanels.replaceChildren();
  buildParticipantFields();
  buildDisciplineControls();
  hydrateControls();
}

function addParticipant() {
  const newIndex = participantCount();
  state.names.push("");
  state.finalTieBreaks.push("");

  DISCIPLINES.forEach(function (discipline) {
    state.results[discipline.id].push("");
    state.dnf[discipline.id].push(false);
    state.tieBreaks[discipline.id].push("");
  });

  rebuildParticipantControls();
  recalculate();
  document.getElementById("participant-name-" + newIndex).focus();
}

function removeParticipant(index) {
  if (!Number.isInteger(index) || index < 0 || index >= participantCount()) return;

  const name = participantName(index);
  const hasData = Boolean(state.names[index].trim()) || DISCIPLINES.some(function (discipline) {
    return String(state.results[discipline.id][index]).trim() || state.dnf[discipline.id][index];
  });

  if (hasData && !window.confirm("Odebrat „" + name + "“? Smažou se i všechny jeho výsledky.")) return;

  state.names.splice(index, 1);
  DISCIPLINES.forEach(function (discipline) {
    state.results[discipline.id].splice(index, 1);
    state.dnf[discipline.id].splice(index, 1);
    state.tieBreaks[discipline.id].splice(index, 1);
  });
  state.finalTieBreaks = emptyStringArray(participantCount());

  rebuildParticipantControls();
  recalculate();

  const nextInput = document.getElementById("participant-name-" + Math.min(index, participantCount() - 1));
  (nextInput || document.getElementById("add-participant")).focus();
}

function setActiveDiscipline(disciplineId, shouldSave) {
  if (!DISCIPLINES.some(function (discipline) { return discipline.id === disciplineId; })) return;
  state.activeDiscipline = disciplineId;

  refs.disciplineTabs.querySelectorAll("[data-discipline-tab]").forEach(function (tab) {
    const active = tab.dataset.disciplineTab === disciplineId;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  refs.disciplinePanels.querySelectorAll("[data-discipline-panel]").forEach(function (panel) {
    panel.hidden = panel.dataset.disciplinePanel !== disciplineId;
  });

  if (shouldSave) saveState();
}

function recalculate() {
  latestCalculations = {};

  DISCIPLINES.forEach(function (discipline) {
    const calculation = calculateDiscipline(discipline);
    latestCalculations[discipline.id] = calculation;
    renderDiscipline(discipline, calculation);
  });

  latestStats = calculateParticipantStats(latestCalculations);
  latestRanking = rankParticipants(latestStats);
  renderLeaderboard(latestStats, latestRanking);
  renderScoreStatus(latestCalculations);
  renderParticipantCount();
  updatePrintSheet();
  saveState();
}

function calculateDiscipline(discipline) {
  const rows = Array.from({ length: participantCount() }, function (_, index) {
    const raw = state.results[discipline.id][index];
    const isDnf = state.dnf[discipline.id][index];
    const parsed = parseResult(raw, discipline);

    if (isDnf) {
      return {
        index: index,
        raw: raw,
        value: parsed.value,
        status: "dnf",
        place: null,
        points: 0,
        tieGroupSize: 0,
        tieResolved: false
      };
    }

    if (parsed.status === "empty") {
      return {
        index: index,
        raw: raw,
        value: null,
        status: "empty",
        place: null,
        points: null,
        tieGroupSize: 0,
        tieResolved: false
      };
    }

    if (parsed.status === "invalid") {
      return {
        index: index,
        raw: raw,
        value: parsed.value,
        status: "invalid",
        place: null,
        points: null,
        tieGroupSize: 0,
        tieResolved: false
      };
    }

    return {
      index: index,
      raw: raw,
      value: parsed.value,
      status: "ready",
      place: null,
      points: null,
      tieGroupSize: 0,
      tieResolved: false
    };
  });

  const entries = rows
    .filter(function (row) { return row.status === "ready"; })
    .sort(function (left, right) {
      return right.value - left.value || left.index - right.index;
    });

  const unresolvedGroups = [];
  let cursor = 1;
  let entryIndex = 0;

  while (entryIndex < entries.length) {
    const group = [entries[entryIndex]];
    let groupIndex = entryIndex + 1;

    while (
      groupIndex < entries.length &&
      Math.abs(entries[groupIndex].value - entries[entryIndex].value) < 0.000000001
    ) {
      group.push(entries[groupIndex]);
      groupIndex += 1;
    }

    if (group.length === 1) {
      assignPlace(group[0], cursor);
    } else {
      const tieValues = group.map(function (row) {
        return Number(state.tieBreaks[discipline.id][row.index]);
      });
      const validTieBreak = tieValues.every(function (value) {
        return Number.isInteger(value) && value >= 1 && value <= group.length;
      }) && new Set(tieValues).size === group.length;

      group.forEach(function (row) {
        row.tieGroupSize = group.length;
        row.tieResolved = validTieBreak;
      });

      if (validTieBreak) {
        group
          .slice()
          .sort(function (left, right) {
            return Number(state.tieBreaks[discipline.id][left.index]) -
              Number(state.tieBreaks[discipline.id][right.index]);
          })
          .forEach(function (row, tieIndex) {
            assignPlace(row, cursor + tieIndex);
          });
      } else {
        group.forEach(function (row) {
          row.status = "tie";
        });
        unresolvedGroups.push(group.map(function (row) { return row.index; }));
      }
    }

    cursor += group.length;
    entryIndex = groupIndex;
  }

  return {
    rows: rows,
    unresolvedGroups: unresolvedGroups,
    invalidIndices: rows.filter(function (row) { return row.status === "invalid"; }).map(function (row) { return row.index; })
  };
}

function parseResult(raw, discipline) {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { status: "empty", value: null };
  }

  const value = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(value) || value < discipline.min || (discipline.max !== null && value > discipline.max)) {
    return { status: "invalid", value: value };
  }

  return { status: "valid", value: value };
}

function assignPlace(row, place) {
  row.status = "scored";
  row.place = place;
  row.points = POINTS[place] || 0;
}

function renderDiscipline(discipline, calculation) {
  const panel = document.getElementById("panel-" + discipline.id);

  calculation.rows.forEach(function (rowState) {
    const row = panel.querySelector("[data-result-row='" + rowState.index + "']");
    const name = participantName(rowState.index);
    const resultInput = row.querySelector("[data-result-input]");
    const resultLabel = row.querySelector("[data-result-input-label]");
    const dnfInput = row.querySelector("[data-dnf-input]");
    const nameOutput = row.querySelector("[data-row-participant-name]");
    const placeOutput = row.querySelector("[data-place-output]");
    const pointsOutput = row.querySelector("[data-points-output]");
    const tieField = row.querySelector("[data-tiebreak-field]");
    const tieSelect = row.querySelector("[data-tiebreak-input]");

    nameOutput.textContent = name;
    resultLabel.textContent = discipline.name + " – výsledek – " + name;
    resultInput.setAttribute("aria-label", discipline.name + " – výsledek – " + name);
    dnfInput.setAttribute("aria-label", discipline.name + " – DNF – " + name);
    placeOutput.setAttribute("aria-label", discipline.name + " – umístění – " + name);
    pointsOutput.setAttribute("aria-label", discipline.name + " – body – " + name);
    dnfInput.checked = state.dnf[discipline.id][rowState.index];
    resultInput.disabled = dnfInput.checked;

    if (document.activeElement !== resultInput && resultInput.value !== state.results[discipline.id][rowState.index]) {
      resultInput.value = state.results[discipline.id][rowState.index];
    }

    resultInput.setAttribute("aria-invalid", String(rowState.status === "invalid"));
    row.classList.toggle("is-tie", rowState.status === "tie");
    row.classList.toggle("is-invalid", rowState.status === "invalid");
    row.classList.toggle("is-dnf", rowState.status === "dnf");

    if (rowState.status === "scored") {
      placeOutput.textContent = rowState.place + ".";
      pointsOutput.textContent = rowState.points + " b";
    } else if (rowState.status === "tie") {
      placeOutput.textContent = "shoda";
      pointsOutput.textContent = "čeká";
    } else if (rowState.status === "dnf") {
      placeOutput.textContent = "DNF";
      pointsOutput.textContent = "0 b";
    } else if (rowState.status === "invalid") {
      placeOutput.textContent = "chyba";
      pointsOutput.textContent = "—";
    } else {
      placeOutput.textContent = "—";
      pointsOutput.textContent = "—";
    }

    if (rowState.tieGroupSize > 1) {
      const savedTieValue = state.tieBreaks[discipline.id][rowState.index];
      if (Number(savedTieValue) > rowState.tieGroupSize) {
        state.tieBreaks[discipline.id][rowState.index] = "";
      }
      populatePlaceOptions(tieSelect, rowState.tieGroupSize, state.tieBreaks[discipline.id][rowState.index]);
      tieSelect.setAttribute("aria-label", discipline.name + " – pořadí rozstřelu – " + name);
      tieSelect.setAttribute("aria-invalid", String(!rowState.tieResolved));
      tieField.hidden = false;
    } else {
      tieField.hidden = true;
    }
  });

  const messages = [];
  calculation.unresolvedGroups.forEach(function (indices) {
    messages.push("⚖ Shoda: " + indices.map(participantName).join(", ") + ". Vyber pořadí rozstřelu.");
  });
  if (calculation.invalidIndices.length) {
    messages.push("Mimo povolený rozsah: " + calculation.invalidIndices.map(participantName).join(", ") + ".");
  }

  const alert = panel.querySelector("[data-panel-alert]");
  alert.textContent = messages.join(" ");
  alert.hidden = messages.length === 0;
}

function populatePlaceOptions(select, count, selectedValue) {
  select.replaceChildren();
  const placeholder = makeElement("option", "", "— rozhodnout —");
  placeholder.value = "";
  select.append(placeholder);

  for (let place = 1; place <= count; place += 1) {
    const option = makeElement("option", "", place + ". v rozstřelu");
    option.value = String(place);
    select.append(option);
  }

  select.value = selectedValue || "";
}

function calculateParticipantStats(calculations) {
  return Array.from({ length: participantCount() }, function (_, participantIndex) {
    const stat = {
      index: participantIndex,
      name: participantName(participantIndex),
      total: 0,
      firsts: 0,
      seconds: 0,
      completedCount: 0,
      hasAny: false,
      pending: false
    };

    DISCIPLINES.forEach(function (discipline) {
      const row = calculations[discipline.id].rows[participantIndex];

      if (row.status !== "empty") stat.hasAny = true;
      if (row.status === "tie" || row.status === "invalid") stat.pending = true;

      if (row.status === "scored") {
        stat.completedCount += 1;
        stat.total += row.points;
        if (row.place === 1) stat.firsts += 1;
        if (row.place === 2) stat.seconds += 1;
      }

      if (row.status === "dnf") {
        stat.completedCount += 1;
      }
    });

    return stat;
  });
}

function rankParticipants(stats) {
  const active = stats
    .filter(function (stat) { return stat.hasAny; })
    .sort(compareStats);

  const ranked = [];
  const finalGroups = [];
  let position = 1;
  let index = 0;

  while (index < active.length) {
    const group = [active[index]];
    let groupIndex = index + 1;

    while (groupIndex < active.length && sameTieKeys(active[index], active[groupIndex])) {
      group.push(active[groupIndex]);
      groupIndex += 1;
    }

    const finalReady = group.length > 1 && group.every(function (stat) {
      return stat.completedCount === DISCIPLINES.length && !stat.pending;
    });

    const finalValues = group.map(function (stat) {
      return Number(state.finalTieBreaks[stat.index]);
    });
    const finalResolved = finalReady &&
      finalValues.every(function (value) {
        return Number.isInteger(value) && value >= 1 && value <= group.length;
      }) &&
      new Set(finalValues).size === group.length;

    if (finalResolved) {
      group
        .slice()
        .sort(function (left, right) {
          return Number(state.finalTieBreaks[left.index]) - Number(state.finalTieBreaks[right.index]);
        })
        .forEach(function (stat, finalIndex) {
          ranked.push({
            stat: stat,
            rank: position + finalIndex,
            shared: false,
            finalReady: true
          });
        });
    } else {
      group.forEach(function (stat) {
        ranked.push({
          stat: stat,
          rank: position,
          shared: group.length > 1,
          finalReady: finalReady
        });
      });
    }

    if (finalReady) {
      finalGroups.push({
        stats: group,
        resolved: finalResolved
      });
    }

    position += group.length;
    index = groupIndex;
  }

  const byIndex = new Map();
  ranked.forEach(function (item) {
    byIndex.set(item.stat.index, item);
  });

  return {
    ranked: ranked,
    finalGroups: finalGroups,
    byIndex: byIndex
  };
}

function compareStats(left, right) {
  return right.total - left.total ||
    right.firsts - left.firsts ||
    right.seconds - left.seconds ||
    left.index - right.index;
}

function sameTieKeys(left, right) {
  return left.total === right.total &&
    left.firsts === right.firsts &&
    left.seconds === right.seconds;
}

function setLeaderboardVisibility(visible) {
  refs.leaderboardContent.hidden = !visible;
  refs.leaderboardTeaser.hidden = visible;
  refs.leaderboardToggle.setAttribute("aria-expanded", String(visible));
  refs.leaderboardToggle.setAttribute("aria-label", visible ? "Skrýt živý žebříček" : "Zobrazit živý žebříček");
  refs.leaderboardToggle.textContent = visible ? "🙈 Skrýt" : "👀 Ukázat";
}

function renderLeaderboard(stats, ranking) {
  refs.leaderboardList.replaceChildren();

  if (!ranking.ranked.length && !state.names.some(function (name) { return name.trim(); })) {
    refs.leaderboardList.append(
      makeElement("div", "leader-empty", "Zadej jména a první výkon. Tady se pak začne dít sportovní matematika.")
    );
  } else {
    ranking.ranked.forEach(function (item) {
      refs.leaderboardList.append(buildLeaderRow(item));
    });

    stats
      .filter(function (stat) {
        return !stat.hasAny && state.names[stat.index].trim();
      })
      .forEach(function (stat) {
        refs.leaderboardList.append(buildWaitingLeaderRow(stat));
      });
  }

  renderFinalTieBreaks(ranking.finalGroups);

  const unresolvedCount = DISCIPLINES.reduce(function (sum, discipline) {
    return sum + latestCalculations[discipline.id].unresolvedGroups.length;
  }, 0);

  if (unresolvedCount) {
    refs.leaderboardNote.textContent = "Pořadí je zatím orientační: některá disciplína čeká na rozstřel.";
  } else {
    refs.leaderboardNote.textContent = "Při shodě rozhoduje automaticky více vítězství, potom více druhých míst.";
  }
}

function buildLeaderRow(item) {
  const row = makeElement("div", "leader-row");
  row.dataset.ranked = "true";

  const rank = makeElement("div", "leader-rank", item.rank + ".");
  const copy = makeElement("div");
  copy.append(makeElement("div", "leader-name", item.stat.name));
  copy.append(
    makeElement(
      "span",
      "leader-meta",
      item.stat.completedCount + "/5 disciplín · " + item.stat.firsts + "× 1. · " + item.stat.seconds + "× 2."
    )
  );

  let badgeText = "";
  if (item.stat.pending) badgeText = "čeká na rozstřel";
  else if (item.shared && item.finalReady) badgeText = "celkový rozstřel";
  else if (item.shared) badgeText = "průběžná shoda";
  if (badgeText) copy.append(makeElement("span", "leader-badge", badgeText));

  const total = makeElement("div", "leader-total", item.stat.total + " b");
  row.append(rank, copy, total);
  return row;
}

function buildWaitingLeaderRow(stat) {
  const row = makeElement("div", "leader-row");
  row.dataset.ranked = "false";
  row.append(
    makeElement("div", "leader-rank", "—"),
    makeElement("div", "leader-name", stat.name),
    makeElement("div", "leader-total", "—")
  );
  return row;
}

function renderFinalTieBreaks(finalGroups) {
  refs.finalTiebreaks.replaceChildren();

  finalGroups.forEach(function (group) {
    const box = makeElement("div", "final-tiebreak-box");
    box.append(makeElement("strong", "", group.resolved ? "Celkový rozstřel je uložený" : "Celkový rozstřel je potřeba"));
    box.append(
      makeElement(
        "p",
        "",
        "Body, vítězství i druhá místa jsou shodná. Vyber konečné pořadí hodu papírem."
      )
    );

    group.stats.forEach(function (stat) {
      const row = makeElement("label", "final-tiebreak-row");
      row.append(makeElement("span", "", stat.name));

      const select = makeElement("select");
      select.dataset.finalTiebreak = String(stat.index);
      select.setAttribute("aria-label", "Celkový rozstřel – " + stat.name);
      populatePlaceOptions(select, group.stats.length, state.finalTieBreaks[stat.index]);
      select.setAttribute("aria-invalid", String(!group.resolved));
      row.append(select);
      box.append(row);
    });

    refs.finalTiebreaks.append(box);
  });
}

function renderScoreStatus(calculations) {
  let completed = 0;
  let unresolved = 0;
  let invalid = 0;

  DISCIPLINES.forEach(function (discipline) {
    const calculation = calculations[discipline.id];
    completed += calculation.rows.filter(function (row) {
      return row.status === "scored" || row.status === "dnf";
    }).length;
    unresolved += calculation.unresolvedGroups.length;
    invalid += calculation.invalidIndices.length;
  });

  const parts = [completed + "/" + (participantCount() * DISCIPLINES.length) + " výsledků uzavřeno"];
  if (unresolved) parts.push(unresolved + " rozstřel" + czechCountSuffix(unresolved, "", "y", "ů") + " čeká");
  if (invalid) parts.push(invalid + " chybn" + czechCountSuffix(invalid, "á hodnota", "é hodnoty", "ých hodnot"));
  refs.scoreStatus.removeAttribute("data-state");
  refs.scoreStatus.textContent = parts.join(" · ");
}

function renderParticipantCount() {
  const count = participantCount();
  refs.participantCount.textContent = "Živé výsledky · " + count + " " +
    czechCountSuffix(count, "soutěžící", "soutěžící", "soutěžících");
}

function czechCountSuffix(count, one, few, many) {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

function announceWinners() {
  const issue = winnerAnnouncementIssue();

  if (issue) {
    refs.scoreStatus.dataset.state = "warning";
    refs.scoreStatus.textContent = "🏁 " + issue;
    refs.scoreStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  [1, 2, 3].forEach(function (place) {
    const winner = latestRanking.ranked.find(function (item) { return item.rank === place; });
    refs.winnerReveal.querySelector("[data-winner-name='" + place + "']").textContent = winner.stat.name;
    refs.winnerReveal.querySelector("[data-winner-points='" + place + "']").textContent =
      winner.stat.total + " " + czechCountSuffix(winner.stat.total, "bod", "body", "bodů");
  });

  winnerRevealReturnFocus = document.activeElement;
  refs.winnerReveal.hidden = false;
  document.body.classList.add("winner-reveal-open");
  window.requestAnimationFrame(function () {
    refs.winnerReveal.classList.add("is-visible");
    refs.winnerClose.focus();
  });
  launchConfetti();
}

function winnerAnnouncementIssue() {
  const competitors = latestStats.filter(function (stat) {
    return stat.hasAny || state.names[stat.index].trim();
  });

  if (competitors.length < 3) {
    return "Pro stupně vítězů jsou potřeba alespoň tři soutěžící s výsledky.";
  }

  const incomplete = competitors.filter(function (stat) {
    return stat.completedCount < DISCIPLINES.length || stat.pending;
  });

  if (incomplete.length) {
    return "Nejdřív uzavři všech pět disciplín a jejich rozstřely.";
  }

  if (latestRanking.finalGroups.some(function (group) { return !group.resolved; })) {
    return "Otevři živý žebříček a rozhodni celkový rozstřel.";
  }

  const hasFullPodium = [1, 2, 3].every(function (place) {
    return latestRanking.ranked.some(function (item) { return item.rank === place && !item.shared; });
  });

  if (!hasFullPodium) {
    return "Konečné pořadí ještě není rozhodnuté.";
  }

  return "";
}

function closeWinnerReveal() {
  if (refs.winnerReveal.hidden) return;
  refs.winnerReveal.classList.remove("is-visible");
  refs.winnerReveal.hidden = true;
  document.body.classList.remove("winner-reveal-open");
  clearConfetti();

  if (winnerRevealReturnFocus && typeof winnerRevealReturnFocus.focus === "function") {
    winnerRevealReturnFocus.focus();
  }
  winnerRevealReturnFocus = null;
}

function handleWinnerRevealKeydown(event) {
  if (refs.winnerReveal.hidden) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeWinnerReveal();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = Array.from(refs.winnerReveal.querySelectorAll("button:not([disabled])"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function launchConfetti() {
  clearConfetti();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 150; index += 1) {
    const piece = makeElement("i", "confetti-piece");
    const size = 6 + Math.random() * 8;
    piece.style.left = Math.random() * 100 + "%";
    piece.style.width = size + "px";
    piece.style.height = size * (0.45 + Math.random() * 0.8) + "px";
    piece.style.background = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    piece.style.borderRadius = index % 4 === 0 ? "50%" : "2px";
    piece.style.setProperty("--confetti-drift", -150 + Math.random() * 300 + "px");
    piece.style.setProperty("--confetti-spin", 360 + Math.random() * 1080 + "deg");
    piece.style.animationDelay = Math.random() * 1.2 + "s";
    piece.style.animationDuration = 3 + Math.random() * 2.4 + "s";
    fragment.append(piece);
  }

  refs.confettiLayer.append(fragment);
  confettiCleanupTimer = window.setTimeout(clearConfetti, 7000);
}

function clearConfetti() {
  if (confettiCleanupTimer !== null) {
    window.clearTimeout(confettiCleanupTimer);
    confettiCleanupTimer = null;
  }
  if (refs.confettiLayer) refs.confettiLayer.replaceChildren();
}

function updatePrintSheet() {
  if (!refs.printScoreBody) return;
  refs.printScoreBody.replaceChildren();

  for (let participantIndex = 0; participantIndex < participantCount(); participantIndex += 1) {
    const row = makeElement("tr");
    const nameCell = makeElement(
      "td",
      state.names[participantIndex].trim() ? "paper-name" : "paper-placeholder",
      state.names[participantIndex].trim() || "Jméno " + (participantIndex + 1)
    );
    row.append(nameCell);

    DISCIPLINES.forEach(function (discipline) {
      const result = latestCalculations[discipline.id].rows[participantIndex];
      row.append(makeElement("td", "", printableResult(result)));
    });

    const stat = latestStats[participantIndex];
    const rankItem = latestRanking.byIndex.get(participantIndex);
    row.append(makeElement("td", "", stat && stat.hasAny ? stat.total + " b" + (stat.pending ? "*" : "") : ""));
    row.append(makeElement("td", "", rankItem ? rankItem.rank + "." + (rankItem.shared ? "*" : "") : ""));
    refs.printScoreBody.append(row);
  }
}

function printableResult(result) {
  if (!result) return "";
  if (result.status === "dnf") return "DNF";
  if (result.status === "invalid") return String(result.raw) + " / chyba";
  if (result.status === "tie") return formatNumber(result.value) + " / rozstřel";
  if (result.status === "scored") return formatNumber(result.value) + " / " + result.place + ".";
  return "";
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}

function participantName(index) {
  return state.names[index].trim() || fallbackName(index);
}

function fallbackName(index) {
  return "Soutěžící " + (index + 1);
}

function startPrint(mode) {
  document.body.dataset.printMode = mode;
  updatePrintSheet();
  window.requestAnimationFrame(function () {
    window.print();
  });
}

function resetScoreboard() {
  if (!window.confirm("Opravdu vynulovat všechny výsledky, DNF a rozstřely? Jména soutěžících zůstanou.")) return;

  const count = participantCount();
  DISCIPLINES.forEach(function (discipline) {
    state.results[discipline.id] = emptyStringArray(count);
    state.dnf[discipline.id] = emptyBooleanArray(count);
    state.tieBreaks[discipline.id] = emptyStringArray(count);
  });
  state.finalTieBreaks = emptyStringArray(count);

  hydrateControls();
  recalculate();
  refs.scoreStatus.textContent = "✓ Skóre bylo vynulováno a změna je uložená.";
}
