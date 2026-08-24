import { GAME_DEFINITIONS, GAME_IDS, getGameDefinition } from "./game-catalog.mjs";
import {
  createRng,
  makeSeed,
  pickTournamentGames,
  tournamentRoundPoints
} from "./game-core.mjs";
import { createPracticeResult, startGame } from "./games.mjs";

const APP_VERSION = 2;
const NAME_STORAGE_KEY = "officelympicsDuelName";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_LENGTH = 6;
const PEER_PREFIX = "officelympics-2026-";
const MATCH_FORMATS = Object.freeze(["single", "tournament"]);

const GAME_META = Object.freeze(Object.fromEntries(GAME_DEFINITIONS.map(function (game) {
  return [game.id, game];
})));

const refs = {};
const state = {
  mode: null,
  role: null,
  peer: null,
  connection: null,
  suppressConnectionClose: false,
  roomCode: "",
  selectedFormat: "single",
  selectedGame: "panic",
  local: { name: "", ready: false },
  remote: null,
  pendingMatch: null,
  match: null,
  tournament: null,
  controller: null,
  countdownTimers: [],
  prepareTimer: 0,
  resultTimer: 0,
  confettiTimer: 0
};

document.addEventListener("DOMContentLoaded", init);
window.render_game_to_text = renderGameToText;

function init() {
  [
    "connection-pill", "notice-banner", "setup-screen", "lobby-screen", "game-screen", "result-screen",
    "setup-game-picker", "lobby-game-picker", "setup-format-picker", "lobby-format-picker",
    "setup-tournament-note", "lobby-tournament-note", "player-name", "create-room", "join-form",
    "room-code", "practice-button", "lobby-copy",
    "lobby-room-code", "copy-link", "copy-code", "player-one-name", "player-two-name",
    "player-one-ready", "player-two-ready", "selection-help", "leave-room", "ready-button",
    "start-button", "lobby-status", "match-local-name", "match-remote-name", "match-local-score",
    "match-remote-score", "game-round-label", "game-title", "game-stage", "exit-game",
    "result-emoji", "result-kicker", "result-title", "result-copy", "result-local-name",
    "result-remote-name", "result-local-score", "result-remote-score", "result-local-detail",
    "result-remote-detail", "tournament-track", "tournament-result", "rematch-button", "lobby-button",
    "home-button", "confetti"
  ].forEach(function (id) {
    refs[toCamel(id)] = document.getElementById(id);
  });

  refs.localColorDot = document.querySelector(".local-player .color-dot");
  refs.remoteColorDot = document.querySelector(".remote-player .color-dot");

  try {
    state.local.name = sanitizeName(localStorage.getItem(NAME_STORAGE_KEY) || "");
  } catch (error) {
    state.local.name = "";
  }
  refs.playerName.value = state.local.name;
  renderGamePickers();

  const requestedRoom = normalizeRoomCode(new URLSearchParams(window.location.search).get("room") || "");
  if (requestedRoom) {
    refs.roomCode.value = requestedRoom;
    showNotice("Pozvánka načtena. Doplň jméno a klikni na Připojit.", "success", false);
  }

  document.querySelectorAll("[data-game-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      chooseGame(button.dataset.gameChoice, true);
    });
  });

  document.querySelectorAll("[data-format-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      chooseFormat(button.dataset.formatChoice, true);
    });
  });

  refs.createRoom.addEventListener("click", createRoom);
  refs.joinForm.addEventListener("submit", joinRoom);
  refs.practiceButton.addEventListener("click", startPractice);
  refs.roomCode.addEventListener("input", normalizeRoomInput);
  refs.copyLink.addEventListener("click", copyInviteLink);
  refs.copyCode.addEventListener("click", copyRoomCode);
  refs.leaveRoom.addEventListener("click", leaveToSetup);
  refs.readyButton.addEventListener("click", toggleReady);
  refs.startButton.addEventListener("click", prepareOnlineMatch);
  refs.exitGame.addEventListener("click", returnToLobbyFromGame);
  refs.rematchButton.addEventListener("click", requestRematch);
  refs.lobbyButton.addEventListener("click", returnToGamePicker);
  refs.homeButton.addEventListener("click", leaveToSetup);
  window.addEventListener("beforeunload", destroyPeer);

  chooseGame("panic", false);
  chooseFormat("single", false);
  showScreen("setup");
}

function renderGamePickers() {
  [
    { container: refs.setupGamePicker, compact: false },
    { container: refs.lobbyGamePicker, compact: true }
  ].forEach(function ({ container, compact }) {
    const fragment = document.createDocumentFragment();
    GAME_DEFINITIONS.forEach(function (game, index) {
      const button = document.createElement("button");
      button.className = "game-card" + (index === 0 ? " is-selected" : "");
      button.type = "button";
      button.dataset.gameChoice = game.id;
      button.setAttribute("aria-pressed", String(index === 0));

      const icon = document.createElement("span");
      icon.className = "game-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = game.icon;

      const copy = document.createElement("span");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = compact && game.id === "battleship" ? "Námořní bitva" : game.title;
      detail.textContent = compact ? game.difficulty : game.teaser;
      copy.append(title, detail);
      button.append(icon, copy);

      if (!compact) {
        const difficulty = document.createElement("span");
        difficulty.className = "difficulty";
        difficulty.textContent = game.difficulty;
        button.append(difficulty);
      }
      fragment.append(button);
    });
    container.replaceChildren(fragment);
  });
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
}

function renderGameToText() {
  return JSON.stringify({
    screen: document.body ? document.body.dataset.screen || "loading" : "loading",
    mode: state.mode,
    format: state.selectedFormat,
    selectedGame: state.selectedGame,
    match: state.match ? {
      game: state.match.game,
      localScore: state.match.localScore,
      remoteScore: state.match.remoteScore,
      finished: Boolean(state.match.shown)
    } : null,
    tournament: state.tournament ? {
      games: state.tournament.games,
      currentGame: state.tournament.currentIndex + 1,
      localPoints: state.tournament.localPoints,
      remotePoints: state.tournament.remotePoints,
      completedGames: state.tournament.rounds.length
    } : null,
    controls: "Rozhraní používá DOM tlačítka; souřadnicový herní svět poskytují jen canvasové disciplíny."
  });
}

function sanitizeName(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
}

function requirePlayerName() {
  const name = sanitizeName(refs.playerName.value);
  if (!name) {
    showNotice("Nejdřív napiš jméno. Anonymní hrdinství se nepočítá.", "error");
    refs.playerName.focus();
    return null;
  }

  state.local.name = name;
  refs.playerName.value = name;
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch (error) {
    // Jméno je pohodlí, ne podmínka hry.
  }
  return name;
}

function normalizeRoomCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, ROOM_LENGTH);
}

function normalizeRoomInput() {
  const normalized = normalizeRoomCode(refs.roomCode.value);
  if (refs.roomCode.value !== normalized) refs.roomCode.value = normalized;
}

function validRoomCode(value) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}

function randomRoomCode() {
  const bytes = new Uint8Array(ROOM_LENGTH);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, function (value) { return ROOM_ALPHABET[value % ROOM_ALPHABET.length]; }).join("");
}

function peerIdForRoom(code) {
  return PEER_PREFIX + code.toLowerCase();
}

function showNotice(message, status, autoHide = true) {
  window.clearTimeout(showNotice.timer);
  refs.noticeBanner.textContent = message;
  refs.noticeBanner.dataset.state = status || "info";
  refs.noticeBanner.hidden = false;
  if (autoHide) {
    showNotice.timer = window.setTimeout(function () { refs.noticeBanner.hidden = true; }, 5200);
  }
}

function setConnectionStatus(status, text) {
  refs.connectionPill.dataset.state = status;
  refs.connectionPill.textContent = text;
}

function showScreen(name) {
  refs.setupScreen.hidden = name !== "setup";
  refs.lobbyScreen.hidden = name !== "lobby";
  refs.gameScreen.hidden = name !== "game";
  refs.resultScreen.hidden = name !== "result";
  document.body.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function chooseGame(gameId, broadcast) {
  if (!GAME_IDS.includes(gameId)) return;
  if (broadcast && state.mode === "online" && state.role === 1 && !refs.lobbyScreen.hidden) return;

  state.selectedGame = gameId;
  document.querySelectorAll("[data-game-choice]").forEach(function (button) {
    const selected = button.dataset.gameChoice === gameId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  if (broadcast && state.mode === "online" && state.role === 0) {
    broadcastSelection();
  }
}

function chooseFormat(format, broadcast) {
  if (!MATCH_FORMATS.includes(format)) return;
  if (broadcast && state.mode === "online" && state.role === 1 && !refs.lobbyScreen.hidden) return;

  state.selectedFormat = format;
  document.querySelectorAll("[data-format-choice]").forEach(function (button) {
    const selected = button.dataset.formatChoice === format;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const tournament = format === "tournament";
  refs.setupGamePicker.hidden = tournament;
  refs.lobbyGamePicker.hidden = tournament;
  refs.setupTournamentNote.hidden = !tournament;
  refs.lobbyTournamentNote.hidden = !tournament;
  refs.practiceButton.textContent = tournament ? "🏆 Spustit turnaj s botem" : "🕶️ Spustit trénink";

  if (broadcast && state.mode === "online" && state.role === 0) broadcastSelection();
  if (!refs.lobbyScreen.hidden) renderLobby();
}

function broadcastSelection() {
  state.local.ready = false;
  if (state.remote) state.remote.ready = false;
  sendMessage({ type: "selection", game: state.selectedGame, format: state.selectedFormat });
  sendLobbySnapshot();
  renderLobby();
}

function createPeer(peerId) {
  if (typeof window.Peer !== "function") {
    showNotice("Nepodařilo se načíst síťovou knihovnu. Zkontroluj připojení nebo spusť trénink.", "error", false);
    return null;
  }

  return new window.Peer(peerId, {
    debug: 1,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
      sdpSemantics: "unified-plan"
    }
  });
}

function createRoom() {
  const name = requirePlayerName();
  if (!name) return;
  resetSession(false);

  const code = randomRoomCode();
  state.mode = "online";
  state.role = 0;
  state.roomCode = code;
  state.local = { name, ready: false };
  state.remote = null;
  enterLobby();
  setConnectionStatus("connecting", "● Zakládám místnost");
  refs.lobbyStatus.textContent = "Rezervuji zasedačku v internetu…";

  const peer = createPeer(peerIdForRoom(code));
  if (!peer) {
    returnAfterNetworkFailure();
    return;
  }
  state.peer = peer;
  bindPeerEvents(peer);
  peer.on("open", function () {
    if (state.peer !== peer) return;
    setConnectionStatus("connecting", "● Čekám na kolegu");
    refs.lobbyStatus.textContent = "Místnost je připravená. Pošli odkaz nebo kód kolegovi.";
    updateInviteUrl();
    renderLobby();
  });
  peer.on("connection", function (connection) {
    if (state.peer !== peer) return;
    if (state.connection && state.connection.open) {
      connection.on("open", function () {
        connection.send({ v: APP_VERSION, type: "room-full" });
        window.setTimeout(function () { connection.close(); }, 120);
      });
      return;
    }
    attachConnection(connection);
  });
}

function joinRoom(event) {
  event.preventDefault();
  const name = requirePlayerName();
  if (!name) return;
  const code = normalizeRoomCode(refs.roomCode.value);
  refs.roomCode.value = code;
  if (!validRoomCode(code)) {
    showNotice("Kód místnosti má šest znaků a vyhýbá se podezřelým nulám.", "error");
    refs.roomCode.focus();
    return;
  }

  resetSession(false);
  state.mode = "online";
  state.role = 1;
  state.roomCode = code;
  state.local = { name, ready: false };
  state.remote = null;
  enterLobby();
  setConnectionStatus("connecting", "● Připojuji se");
  refs.lobbyStatus.textContent = "Klepu na digitální dveře místnosti " + code + "…";

  const peer = createPeer();
  if (!peer) {
    returnAfterNetworkFailure();
    return;
  }
  state.peer = peer;
  bindPeerEvents(peer);
  peer.on("open", function () {
    if (state.peer !== peer) return;
    const connection = peer.connect(peerIdForRoom(code), {
      label: "office-duel",
      metadata: { name, version: APP_VERSION },
      serialization: "json",
      reliable: true
    });
    attachConnection(connection);
  });
}

function bindPeerEvents(peer) {
  peer.on("error", function (error) {
    if (state.peer !== peer || state.suppressConnectionClose) return;
    const type = error && error.type;
    if (type === "peer-unavailable") {
      failConnection("Místnost neexistuje nebo ji hostitel už zavřel.");
    } else if (type === "unavailable-id") {
      failConnection("Tenhle kód právě používá jiná kancelář. Založ novou místnost.");
    } else if (type === "network" || type === "server-error" || type === "socket-error") {
      failConnection("Síť odmítla kancelářskou zábavu. Zkus to znovu nebo použij trénink.");
    } else {
      setConnectionStatus("error", "● Chyba spojení");
      showNotice("Spojení se nepovedlo: " + friendlyPeerError(type), "error", false);
    }
  });

  peer.on("disconnected", function () {
    if (state.peer !== peer || state.suppressConnectionClose) return;
    if (state.connection && state.connection.open) {
      setConnectionStatus("online", "● Přímé spojení");
      return;
    }
    setConnectionStatus("error", "● Signál vypadl");
  });
}

function friendlyPeerError(type) {
  const messages = {
    "browser-incompatible": "prohlížeč nepodporuje WebRTC",
    disconnected: "signalizační server se odpojil",
    "invalid-id": "kód místnosti není platný",
    "ssl-unavailable": "zabezpečené spojení není dostupné",
    webrtc: "prohlížeče nedokázaly navázat přímé spojení"
  };
  return messages[type] || "neznámá síťová překážka";
}

function failConnection(message) {
  setConnectionStatus("error", "● Spojení selhalo");
  refs.lobbyStatus.textContent = message;
  showNotice(message, "error", false);
}

function attachConnection(connection) {
  state.connection = connection;
  if (connection.metadata && connection.metadata.name) {
    state.remote = { name: sanitizeName(connection.metadata.name) || "Kolega", ready: false };
  }

  connection.on("open", function () {
    if (state.connection !== connection) return;
    if (!state.remote) state.remote = { name: "Kolega", ready: false };
    setConnectionStatus("online", "● Přímé spojení");
    refs.lobbyStatus.textContent = "Spojení drží. Teď už jen předstírat, že je to teambuilding.";
    sendMessage({ type: "hello", name: state.local.name });
    if (state.role === 0) sendLobbySnapshot();
    updateInviteUrl();
    renderLobby();
  });

  connection.on("data", function (message) {
    if (state.connection === connection) receiveMessage(message);
  });

  connection.on("close", function () {
    if (state.connection !== connection || state.suppressConnectionClose) return;
    state.connection = null;
    state.remote = null;
    state.local.ready = false;
    clearMatchTimers();
    cleanupController();
    showNotice("Kolega se odpojil. Zřejmě ho dostihla práce.", "error", false);

    if (state.role === 0) {
      setConnectionStatus("connecting", "● Čekám na kolegu");
      enterLobby();
      refs.lobbyStatus.textContent = "Místnost stále běží. Stejným kódem se může připojit další kolega.";
    } else {
      setConnectionStatus("error", "● Hostitel odešel");
      showScreen("setup");
      clearInviteUrl();
    }
  });

  connection.on("error", function () {
    if (state.connection !== connection || state.suppressConnectionClose) return;
    showNotice("Přímé spojení se zakuckalo. Zkus založit novou místnost.", "error", false);
  });
}

function sendMessage(message) {
  if (!state.connection || !state.connection.open) return false;
  try {
    state.connection.send({ ...message, v: APP_VERSION });
    return true;
  } catch (error) {
    showNotice("Zpráva se cestou ztratila v interní poště.", "error");
    return false;
  }
}

function receiveMessage(message) {
  if (!message || typeof message !== "object" || message.v !== APP_VERSION || typeof message.type !== "string") return;

  if (message.type === "room-full") {
    failConnection("Místnost už má dva hráče. Třetí kolega musí založit vlastní drama.");
    return;
  }

  if (message.type === "hello") {
    const name = sanitizeName(message.name);
    state.remote = { name: name || "Kolega", ready: state.remote ? state.remote.ready : false };
    if (state.role === 0) sendLobbySnapshot();
    renderLobby();
    return;
  }

  if (message.type === "lobby" && state.role === 1) {
    receiveLobbySnapshot(message);
    return;
  }

  if (message.type === "selection" && state.role === 1 && GAME_IDS.includes(message.game)
    && MATCH_FORMATS.includes(message.format)) {
    state.selectedGame = message.game;
    state.selectedFormat = message.format;
    state.local.ready = false;
    if (state.remote) state.remote.ready = false;
    chooseGame(message.game, false);
    chooseFormat(message.format, false);
    sendMessage({ type: "ready", ready: false });
    renderLobby();
    return;
  }

  if (message.type === "ready" && typeof message.ready === "boolean") {
    if (!state.remote) state.remote = { name: "Kolega", ready: false };
    state.remote.ready = message.ready;
    if (state.role === 0) sendLobbySnapshot();
    renderLobby();
    return;
  }

  if (message.type === "prepare" && state.role === 1) {
    receivePrepare(message);
    return;
  }

  if (message.type === "prepared" && state.role === 0) {
    if (state.pendingMatch && message.matchId === state.pendingMatch.id) dispatchOnlineStart();
    return;
  }

  if (message.type === "start" && state.role === 1) {
    receiveStart(message);
    return;
  }

  if (message.type === "score") {
    receiveRemoteScore(message);
    return;
  }

  if (message.type === "result") {
    receiveRemoteResult(message);
    return;
  }

  if (message.type === "tournament-ready") {
    receiveTournamentReady(message);
    return;
  }

  if ((message.type === "curling-shot" || message.type === "curling-settle" || message.type.startsWith("game:"))
    && state.match && message.matchId === state.match.id) {
    if (state.controller) state.controller.receiveNetwork(message);
    return;
  }

  if (message.type === "return-lobby") {
    receiveReturnToLobby(message);
  }
}

function sendLobbySnapshot() {
  if (state.role !== 0) return;
  sendMessage({
    type: "lobby",
    game: state.selectedGame,
    format: state.selectedFormat,
    players: [
      { name: state.local.name, ready: state.local.ready },
      state.remote ? { name: state.remote.name, ready: state.remote.ready } : null
    ]
  });
}

function receiveLobbySnapshot(message) {
  if (MATCH_FORMATS.includes(message.format)) {
    state.selectedFormat = message.format;
    chooseFormat(message.format, false);
  }
  if (GAME_IDS.includes(message.game)) {
    state.selectedGame = message.game;
    chooseGame(message.game, false);
  }
  if (!Array.isArray(message.players) || message.players.length !== 2) return;

  const host = message.players[0];
  const guest = message.players[1];
  if (host && typeof host === "object") {
    state.remote = { name: sanitizeName(host.name) || "Hostitel", ready: Boolean(host.ready) };
  }
  if (guest && typeof guest === "object") state.local.ready = Boolean(guest.ready);
  renderLobby();
}

function enterLobby() {
  cleanupController();
  clearMatchTimers();
  state.match = null;
  state.pendingMatch = null;
  showScreen("lobby");
  refs.lobbyRoomCode.textContent = state.roomCode || "TRÉNINK";
  renderLobby();
}

function renderLobby() {
  if (refs.lobbyScreen.hidden && state.mode !== "online") return;
  const players = playersByRole();
  refs.playerOneName.textContent = players[0] ? players[0].name : "Čekám…";
  refs.playerTwoName.textContent = players[1] ? players[1].name : "Čekám na kolegu…";
  renderReadyState(refs.playerOneReady, players[0], 0);
  renderReadyState(refs.playerTwoReady, players[1], 1);
  refs.lobbyRoomCode.textContent = state.roomCode || "—";

  const connected = Boolean(state.connection && state.connection.open && state.remote);
  refs.lobbyCopy.textContent = connected ? "Oba jste uvnitř. Teď už není cesty zpět." : "Čekáme na druhého soutěžícího.";
  refs.readyButton.disabled = !connected;
  refs.readyButton.classList.toggle("is-ready", state.local.ready);
  refs.readyButton.textContent = state.local.ready ? "✓ Jsem připraven" : "Jsem připraven";
  refs.startButton.hidden = state.role !== 0;
  refs.startButton.disabled = !(connected && state.local.ready && state.remote && state.remote.ready) || Boolean(state.pendingMatch);
  refs.startButton.textContent = state.selectedFormat === "tournament" ? "🏆 Rozlosovat turnaj" : "🚀 Spustit duel";
  refs.selectionHelp.textContent = state.role === 0
    ? "Hostitel vybírá formát, demokracie začne až po pracovní době."
    : "Formát vybírá hostitel. Protest lze podat po skončení.";

  document.querySelectorAll("#lobby-game-picker [data-game-choice]").forEach(function (button) {
    button.disabled = state.role === 1;
  });
  document.querySelectorAll("#lobby-format-picker [data-format-choice]").forEach(function (button) {
    button.disabled = state.role === 1;
  });
}

function playersByRole() {
  if (state.role === 0) return [state.local, state.remote];
  if (state.role === 1) return [state.remote, state.local];
  return [state.local, state.remote];
}

function renderReadyState(element, player, role) {
  const connected = Boolean(player) && (role === state.role || Boolean(state.connection && state.connection.open));
  element.classList.toggle("is-ready", connected && player.ready);
  element.textContent = !connected ? "Nepřipojen" : player.ready ? "Připraven" : "Nepřipraven";
}

function toggleReady() {
  if (!state.connection || !state.connection.open || state.pendingMatch) return;
  state.local.ready = !state.local.ready;
  sendMessage({ type: "ready", ready: state.local.ready });
  if (state.role === 0) sendLobbySnapshot();
  renderLobby();
}

function createTournament(id, games, index) {
  return {
    id,
    games: games.slice(),
    currentIndex: index,
    rounds: [],
    localPoints: 0,
    remotePoints: 0,
    localReady: false,
    remoteReady: false
  };
}

function tournamentEnvelope(tournament) {
  if (!tournament) return null;
  return {
    id: tournament.id,
    games: tournament.games.slice(),
    index: tournament.currentIndex
  };
}

function normalizeTournamentEnvelope(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string"
    || value.id.length < 1 || value.id.length > 40) return null;
  if (!Array.isArray(value.games) || value.games.length !== 3 || new Set(value.games).size !== 3) return null;
  if (!value.games.every(function (game) { return GAME_IDS.includes(game); })) return null;
  if (!Number.isInteger(value.index) || value.index < 0 || value.index >= value.games.length) return null;
  return { id: value.id, games: value.games.slice(), index: value.index };
}

function applyTournamentEnvelope(envelope) {
  if (!envelope) return false;
  const sameTournament = state.tournament
    && state.tournament.id === envelope.id
    && state.tournament.games.join(":") === envelope.games.join(":");
  if (!sameTournament) state.tournament = createTournament(envelope.id, envelope.games, envelope.index);
  state.tournament.currentIndex = envelope.index;
  state.tournament.localReady = false;
  state.tournament.remoteReady = false;
  return true;
}

function prepareOnlineMatch() {
  if (state.role !== 0 || !state.connection || !state.connection.open || !state.local.ready || !state.remote || !state.remote.ready) return;
  let game = state.selectedGame;
  let tournament = null;
  if (state.selectedFormat === "tournament") {
    const tournamentId = makeSeed();
    const games = pickTournamentGames(tournamentId);
    state.tournament = createTournament(tournamentId, games, 0);
    game = games[0];
    tournament = tournamentEnvelope(state.tournament);
  } else {
    state.tournament = null;
  }
  const pending = {
    id: makeSeed(),
    game,
    seed: makeSeed(),
    format: state.selectedFormat,
    tournament
  };
  state.pendingMatch = pending;
  refs.lobbyStatus.textContent = state.selectedFormat === "tournament"
    ? "Losuji tři disciplíny a kontroluji, zda HR opravdu nekouká…"
    : "Oba připraveni. Kontroluji, zda HR opravdu nekouká…";
  renderLobby();
  sendMessage({
    type: "prepare",
    matchId: pending.id,
    game: pending.game,
    seed: pending.seed,
    format: pending.format,
    tournament: pending.tournament
  });
  window.clearTimeout(state.prepareTimer);
  state.prepareTimer = window.setTimeout(function () {
    if (!state.pendingMatch || state.pendingMatch.id !== pending.id) return;
    state.pendingMatch = null;
    refs.lobbyStatus.textContent = "Soupeř nepotvrdil start. Zkuste tlačítko znovu.";
    renderLobby();
  }, 7000);
}

function receivePrepare(message) {
  if (!validMatchEnvelope(message)) return;
  const tournament = normalizeTournamentEnvelope(message.tournament);
  if (message.format === "tournament") applyTournamentEnvelope(tournament);
  else state.tournament = null;
  state.selectedFormat = message.format;
  chooseFormat(message.format, false);
  state.pendingMatch = {
    id: message.matchId,
    game: message.game,
    seed: message.seed,
    format: message.format,
    tournament
  };
  refs.lobbyStatus.textContent = "Hostitel spouští " + GAME_META[message.game].title + "…";
  sendMessage({ type: "prepared", matchId: message.matchId });
}

function dispatchOnlineStart() {
  if (!state.pendingMatch) return;
  const pending = state.pendingMatch;
  const delay = 2800;
  window.clearTimeout(state.prepareTimer);
  sendMessage({
    type: "start",
    matchId: pending.id,
    game: pending.game,
    seed: pending.seed,
    format: pending.format,
    tournament: pending.tournament,
    delay
  });
  queueMatch(pending, delay);
}

function receiveStart(message) {
  if (!validMatchEnvelope(message)) return;
  const delay = Number.isFinite(message.delay) ? Math.min(4000, Math.max(1600, message.delay)) : 2800;
  const tournament = normalizeTournamentEnvelope(message.tournament);
  if (message.format === "tournament") applyTournamentEnvelope(tournament);
  const pending = {
    id: message.matchId,
    game: message.game,
    seed: message.seed,
    format: message.format,
    tournament
  };
  queueMatch(pending, delay);
}

function validMatchEnvelope(message) {
  const baseValid = typeof message.matchId === "string" && message.matchId.length >= 1 && message.matchId.length <= 40
    && GAME_IDS.includes(message.game)
    && typeof message.seed === "string" && message.seed.length >= 1 && message.seed.length <= 40
    && MATCH_FORMATS.includes(message.format);
  if (!baseValid) return false;
  if (message.format === "single") return message.tournament === null || message.tournament === undefined;
  const tournament = normalizeTournamentEnvelope(message.tournament);
  return Boolean(tournament && tournament.games[tournament.index] === message.game);
}

function startPractice() {
  const name = requirePlayerName();
  if (!name) return;
  resetSession(false);
  state.mode = "practice";
  state.role = 0;
  state.local = { name, ready: true };
  state.remote = { name: "Kolega-bot", ready: true };
  setConnectionStatus("offline", "● Trénink");
  if (state.selectedFormat === "tournament") {
    const tournamentId = makeSeed();
    const games = pickTournamentGames(tournamentId);
    state.tournament = createTournament(tournamentId, games, 0);
    queueMatch({
      id: makeSeed(),
      game: games[0],
      seed: makeSeed(),
      format: "tournament",
      tournament: tournamentEnvelope(state.tournament)
    }, 2200);
  } else {
    state.tournament = null;
    queueMatch({ id: makeSeed(), game: state.selectedGame, seed: makeSeed(), format: "single", tournament: null }, 2200);
  }
}

function queueMatch(matchData, delay) {
  cleanupController();
  clearMatchTimers();
  state.pendingMatch = null;
  state.local.ready = false;
  if (state.remote) state.remote.ready = false;
  state.selectedFormat = matchData.format;
  state.selectedGame = matchData.game;
  if (matchData.format === "tournament") applyTournamentEnvelope(matchData.tournament);
  state.match = {
    id: matchData.id,
    game: matchData.game,
    seed: matchData.seed,
    format: matchData.format,
    tournamentIndex: state.tournament ? state.tournament.currentIndex : null,
    localScore: 0,
    remoteScore: 0,
    localResult: null,
    remoteResult: null,
    shown: false
  };

  renderMatchHeader();
  showScreen("game");
  renderCountdown(delay);
  state.countdownTimers.push(window.setTimeout(function () {
    if (!state.match || state.match.id !== matchData.id) return;
    launchCurrentGame();
  }, delay));
}

function renderCountdown(delay) {
  const meta = GAME_META[state.match.game];
  refs.gameStage.innerHTML = `
    <div class="game-intro">
      <div>
        <span class="game-intro-count" aria-live="polite">3</span>
        <p></p>
      </div>
    </div>`;
  const count = refs.gameStage.querySelector(".game-intro-count");
  refs.gameStage.querySelector("p").textContent = meta.instruction;

  const moments = [
    { at: Math.round(delay * .27), text: "2" },
    { at: Math.round(delay * .54), text: "1" },
    { at: Math.round(delay * .79), text: "TEĎ!" }
  ];
  moments.forEach(function (moment) {
    state.countdownTimers.push(window.setTimeout(function () {
      count.textContent = moment.text;
    }, moment.at));
  });
}

function launchCurrentGame() {
  if (!state.match) return;
  const matchId = state.match.id;
  const rolePlayers = playersByRole();
  const names = [
    rolePlayers[0] ? rolePlayers[0].name : "Růžový hráč",
    rolePlayers[1] ? rolePlayers[1].name : "Modrý hráč"
  ];

  state.controller = startGame(state.match.game, {
    stage: refs.gameStage,
    seed: state.match.seed,
    localRole: state.role,
    mode: state.mode,
    names,
    setRoundLabel: function (label) {
      refs.gameRoundLabel.textContent = state.tournament
        ? "Turnaj " + (state.tournament.currentIndex + 1) + "/3 · " + label
        : label;
    },
    publishScore: function (score) {
      if (!state.match || state.match.id !== matchId) return;
      state.match.localScore = safeScore(score);
      renderMatchScores();
      sendMessage({ type: "score", matchId, game: state.match.game, score: state.match.localScore });
    },
    setScores: function (localScore, remoteScore) {
      if (!state.match || state.match.id !== matchId) return;
      state.match.localScore = safeScore(localScore);
      state.match.remoteScore = safeScore(remoteScore);
      renderMatchScores();
    },
    finish: function (result) { submitLocalResult(matchId, result); },
    finishShared: function (results) { submitSharedResults(matchId, results); },
    send: function (message) { sendMessage({ ...message, matchId }); }
  });
}

function safeScore(value) {
  return Math.min(9999, Math.max(0, Math.round(Number(value) || 0)));
}

function renderMatchHeader() {
  const meta = GAME_META[state.match.game];
  const localName = state.local.name || "Ty";
  const remoteName = state.remote ? state.remote.name : "Kolega";
  refs.gameTitle.textContent = meta.title;
  refs.gameRoundLabel.textContent = state.tournament
    ? "Turnaj · hra " + (state.tournament.currentIndex + 1) + "/3"
    : "Duel";
  refs.matchLocalName.textContent = localName;
  refs.matchRemoteName.textContent = remoteName;
  refs.localColorDot.className = "color-dot " + (state.role === 1 ? "blue" : "pink");
  refs.remoteColorDot.className = "color-dot " + (state.role === 1 ? "pink" : "blue");
  renderTournamentTracker();
  renderMatchScores();
}

function renderTournamentTracker() {
  refs.tournamentTrack.replaceChildren();
  refs.tournamentTrack.hidden = !state.tournament;
  if (!state.tournament) return;

  state.tournament.games.forEach(function (gameId, index) {
    const game = getGameDefinition(gameId);
    const chip = document.createElement("span");
    chip.className = "tournament-game";
    if (index === state.tournament.currentIndex) chip.classList.add("is-current");
    const round = state.tournament.rounds[index];
    if (round) {
      chip.classList.add(round.localPoints === round.remotePoints
        ? "is-draw"
        : round.localPoints > round.remotePoints ? "is-won" : "is-lost");
    }
    chip.textContent = (game ? game.icon : "🎮") + " " + (index + 1);
    chip.title = game ? game.title : gameId;
    refs.tournamentTrack.append(chip);
  });
}

function renderMatchScores() {
  refs.matchLocalScore.textContent = state.match ? String(state.match.localScore) : "0";
  refs.matchRemoteScore.textContent = state.match ? String(state.match.remoteScore) : "0";
}

function receiveRemoteScore(message) {
  if (!state.match || message.matchId !== state.match.id || message.game !== state.match.game || !Number.isFinite(message.score)) return;
  state.match.remoteScore = safeScore(message.score);
  renderMatchScores();
}

function normalizeResult(game, result) {
  if (!result || typeof result !== "object" || !Number.isFinite(result.score)) return null;
  const normalized = { score: safeScore(result.score) };

  if (game === "panic") {
    normalized.hits = safeSmallInteger(result.hits, 60);
    normalized.mistakes = safeSmallInteger(result.mistakes, 60);
    normalized.misses = safeSmallInteger(result.misses, 60);
  } else if (game === "deadline") {
    normalized.score = Math.min(500, normalized.score);
    normalized.rounds = Array.isArray(result.rounds)
      ? result.rounds.slice(0, 5).map(function (round) {
        return {
          progress: Number.isFinite(round && round.progress) ? Math.min(120, Math.max(0, round.progress)) : 0,
          points: safeSmallInteger(round && round.points, 100)
        };
      })
      : [];
  } else if (game === "curling") {
    normalized.score = Math.min(3, normalized.score);
    normalized.nearest = Number.isFinite(result.nearest) ? Math.min(1000, Math.max(0, result.nearest)) : null;
  } else if (game === "alttab") {
    normalized.score = Math.min(6000, normalized.score);
    normalized.reactions = Array.isArray(result.reactions)
      ? result.reactions.slice(0, 5).map(function (reaction) { return safeSmallInteger(reaction, 5000); })
      : [];
    normalized.mistakes = safeSmallInteger(result.mistakes, 8);
    normalized.missed = safeSmallInteger(result.missed, 8);
    normalized.average = safeSmallInteger(result.average, 5000);
  } else if (game === "battleship") {
    normalized.score = Math.min(1, normalized.score);
    normalized.hits = safeSmallInteger(result.hits, 5);
    normalized.shots = safeSmallInteger(result.shots, 36);
    normalized.sunk = safeSmallInteger(result.sunk, 2);
  } else if (game === "taskstack") {
    normalized.lines = safeSmallInteger(result.lines, 100);
    normalized.sent = safeSmallInteger(result.sent, 100);
    normalized.topOut = Boolean(result.topOut);
  } else if (game === "pong") {
    normalized.score = Math.min(5, normalized.score);
    normalized.winner = result.winner === 0 || result.winner === 1 ? result.winner : null;
    normalized.bestRally = safeSmallInteger(result.bestRally, 999);
  } else if (game === "escape") {
    normalized.distance = safeSmallInteger(result.distance, 5000);
    normalized.crashes = safeSmallInteger(result.crashes, 50);
    normalized.coffees = safeSmallInteger(result.coffees, 50);
  } else if (game === "jargon") {
    normalized.score = Math.min(6000, normalized.score);
    normalized.solved = safeSmallInteger(result.solved, 6);
    normalized.mistakes = safeSmallInteger(result.mistakes, 50);
    normalized.average = safeSmallInteger(result.average, 20_000);
  } else if (game === "coffee") {
    normalized.score = Math.min(4500, normalized.score);
    normalized.served = safeSmallInteger(result.served, 5);
    normalized.mistakes = safeSmallInteger(result.mistakes, 50);
    normalized.average = safeSmallInteger(result.average, 20_000);
  } else if (game === "calendar") {
    normalized.score = Math.min(5100, normalized.score);
    normalized.booked = safeSmallInteger(result.booked, 6);
    normalized.mistakes = safeSmallInteger(result.mistakes, 50);
    normalized.average = safeSmallInteger(result.average, 20_000);
  } else if (game === "printer") {
    normalized.score = Math.min(5600, normalized.score);
    normalized.repaired = safeSmallInteger(result.repaired, 10);
    normalized.mistakes = safeSmallInteger(result.mistakes, 50);
    normalized.average = safeSmallInteger(result.average, 10_000);
  } else if (game === "pictionary") {
    normalized.score = Math.min(3000, normalized.score);
    normalized.guessed = safeSmallInteger(result.guessed, 3);
    normalized.understood = safeSmallInteger(result.understood, 3);
    normalized.rounds = safeSmallInteger(result.rounds, 3);
  }

  return normalized;
}

function safeSmallInteger(value, maximum) {
  return Math.min(maximum, Math.max(0, Math.round(Number(value) || 0)));
}

function submitLocalResult(matchId, result) {
  if (!state.match || state.match.id !== matchId || state.match.localResult) return;
  const normalized = normalizeResult(state.match.game, result);
  if (!normalized) return;
  state.match.localResult = normalized;
  state.match.localScore = normalized.score;
  renderMatchScores();
  sendMessage({ type: "result", matchId, game: state.match.game, result: normalized });

  if (state.mode === "practice") {
    refs.gameRoundLabel.textContent = "Bot dopočítává výmluvu";
    window.clearTimeout(state.resultTimer);
    state.resultTimer = window.setTimeout(function () {
      if (!state.match || state.match.id !== matchId) return;
      state.match.remoteResult = normalizeResult(state.match.game, createPracticeResult(state.match.game, state.match.seed));
      state.match.remoteScore = state.match.remoteResult.score;
      renderMatchScores();
      maybeShowResult();
    }, 850);
  } else {
    refs.gameRoundLabel.textContent = state.match.remoteResult ? "Vyhodnocuji" : "Čekám na soupeře";
  }
  maybeShowResult();
}

function submitSharedResults(matchId, results) {
  if (!state.match || state.match.id !== matchId || !Array.isArray(results) || results.length !== 2) return;
  const game = state.match.game;
  const localResult = normalizeResult(game, results[state.role]);
  const remoteResult = normalizeResult(game, results[1 - state.role]);
  if (!localResult || !remoteResult) return;
  state.match.localResult = localResult;
  state.match.remoteResult = remoteResult;
  state.match.localScore = localResult.score;
  state.match.remoteScore = remoteResult.score;
  renderMatchScores();
  sendMessage({ type: "result", matchId, game, result: localResult });
  maybeShowResult();
}

function receiveRemoteResult(message) {
  if (!state.match || message.matchId !== state.match.id || message.game !== state.match.game) return;
  const normalized = normalizeResult(state.match.game, message.result);
  if (!normalized) return;
  state.match.remoteResult = normalized;
  state.match.remoteScore = normalized.score;
  renderMatchScores();
  maybeShowResult();
}

function maybeShowResult() {
  if (!state.match || state.match.shown || !state.match.localResult || !state.match.remoteResult) return;
  state.match.shown = true;
  window.clearTimeout(state.resultTimer);
  state.resultTimer = window.setTimeout(showResult, 650);
}

function recordTournamentRound(match) {
  if (!state.tournament || match.tournamentIndex === null || state.tournament.rounds[match.tournamentIndex]) return;
  const points = tournamentRoundPoints(match.localResult.score, match.remoteResult.score);
  state.tournament.rounds[match.tournamentIndex] = {
    game: match.game,
    localScore: match.localResult.score,
    remoteScore: match.remoteResult.score,
    localPoints: points[0],
    remotePoints: points[1]
  };
  state.tournament.localPoints += points[0];
  state.tournament.remotePoints += points[1];
}

function formatTournamentPoints(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function renderTournamentResult() {
  refs.tournamentResult.replaceChildren();
  refs.tournamentResult.hidden = !state.tournament;
  if (!state.tournament) return;

  const score = document.createElement("div");
  score.className = "tournament-scoreline";
  const local = document.createElement("strong");
  const label = document.createElement("span");
  const remote = document.createElement("strong");
  local.textContent = formatTournamentPoints(state.tournament.localPoints);
  label.textContent = "stav turnaje";
  remote.textContent = formatTournamentPoints(state.tournament.remotePoints);
  score.append(local, label, remote);

  const games = document.createElement("div");
  games.className = "tournament-result-games";
  state.tournament.games.forEach(function (gameId, index) {
    const meta = getGameDefinition(gameId);
    const round = state.tournament.rounds[index];
    const item = document.createElement("span");
    item.className = "tournament-result-game";
    if (round) {
      item.classList.add(round.localPoints === round.remotePoints
        ? "is-draw"
        : round.localPoints > round.remotePoints ? "is-won" : "is-lost");
    } else if (index === state.tournament.currentIndex + 1) {
      item.classList.add("is-next");
    }
    item.textContent = (meta ? meta.icon : "🎮") + " " + (meta ? meta.title : gameId);
    games.append(item);
  });
  refs.tournamentResult.append(score, games);
}

function showResult() {
  if (!state.match || !state.match.localResult || !state.match.remoteResult) return;
  const match = state.match;
  const localScore = match.localResult.score;
  const remoteScore = match.remoteResult.score;
  const localWon = localScore > remoteScore;
  const tied = localScore === remoteScore;
  const remoteName = state.remote ? state.remote.name : "Kolega";

  cleanupController();
  recordTournamentRound(match);
  refs.resultLocalName.textContent = state.local.name || "Ty";
  refs.resultRemoteName.textContent = remoteName;
  refs.resultLocalScore.textContent = String(localScore);
  refs.resultRemoteScore.textContent = String(remoteScore);
  refs.resultLocalDetail.textContent = resultDetail(match.game, match.localResult);
  refs.resultRemoteDetail.textContent = resultDetail(match.game, match.remoteResult);

  if (tied) {
    refs.resultEmoji.textContent = "🤝";
    refs.resultKicker.textContent = "Diplomatická katastrofa";
    refs.resultTitle.textContent = "Remíza!";
    refs.resultCopy.textContent = "Stejný výkon. Rozhoduje odveta, nebo hlasitější interpretace pravidel.";
  } else if (localWon) {
    refs.resultEmoji.textContent = "🏆";
    refs.resultKicker.textContent = "Konečný verdikt";
    refs.resultTitle.textContent = "Vyhráváš!";
    refs.resultCopy.textContent = "Výkon byl oficiálně uznán. Produktivita utrpěla, legenda vznikla.";
  } else {
    refs.resultEmoji.textContent = "🫠";
    refs.resultKicker.textContent = "Konečný verdikt";
    refs.resultTitle.textContent = "Vyhrává " + remoteName;
    refs.resultCopy.textContent = "Tentokrát. Odveta je společensky přijatelnější než hledání výmluv.";
  }

  refs.rematchButton.disabled = false;
  refs.rematchButton.textContent = "🔁 Odveta";
  refs.lobbyButton.textContent = "Vybrat jinou hru";
  refs.tournamentResult.hidden = true;
  let celebrate = localWon || tied;

  if (state.tournament) {
    const tournamentFinished = state.tournament.currentIndex === state.tournament.games.length - 1;
    renderTournamentResult();
    refs.lobbyButton.textContent = tournamentFinished ? "Vybrat jiný formát" : "Ukončit turnaj";

    if (!tournamentFinished) {
      const nextGame = getGameDefinition(state.tournament.games[state.tournament.currentIndex + 1]);
      refs.resultKicker.textContent = "Turnaj · hra " + (state.tournament.currentIndex + 1) + "/3";
      refs.resultTitle.textContent = tied ? "Tahle hra nerozhodla" : localWon ? "Bod pro tebe!" : "Bod pro soupeře";
      refs.resultCopy.textContent = "Další disciplína: " + (nextGame ? nextGame.title : "překvapení") + ". Pokračujete, až oba potvrdíte připravenost.";
      refs.rematchButton.textContent = "Další hra →";
    } else {
      const localTournamentWon = state.tournament.localPoints > state.tournament.remotePoints;
      const tournamentTied = state.tournament.localPoints === state.tournament.remotePoints;
      refs.resultLocalScore.textContent = formatTournamentPoints(state.tournament.localPoints);
      refs.resultRemoteScore.textContent = formatTournamentPoints(state.tournament.remotePoints);
      refs.resultLocalDetail.textContent = "turnajových bodů";
      refs.resultRemoteDetail.textContent = "turnajových bodů";
      refs.resultKicker.textContent = "Turnaj dokončen";
      refs.rematchButton.textContent = "🏆 Nový turnaj";
      celebrate = localTournamentWon || tournamentTied;

      if (tournamentTied) {
        refs.resultEmoji.textContent = "🤝";
        refs.resultTitle.textContent = "Turnaj končí remízou";
        refs.resultCopy.textContent = "Tři hry nestačily. HR doporučuje rozstřel, nebo společný oběd.";
      } else if (localTournamentWon) {
        refs.resultEmoji.textContent = "🏆";
        refs.resultTitle.textContent = "Vyhráváš turnaj!";
        refs.resultCopy.textContent = "Tři disciplíny, jedna kancelářská legenda. Produktivita se zotaví později.";
      } else {
        refs.resultEmoji.textContent = "🫠";
        refs.resultTitle.textContent = "Turnaj vyhrává " + remoteName;
        refs.resultCopy.textContent = "Kolega bere pohár i právo připomínat výsledek na každém stand-upu.";
      }
    }
  }

  showScreen("result");
  if (celebrate) launchConfetti();
}

function resultDetail(game, result) {
  if (game === "panic") {
    return result.hits + " zásahů · " + result.mistakes + " přešlapů";
  }
  if (game === "deadline") {
    const busts = Array.isArray(result.rounds)
      ? result.rounds.filter(function (round) { return round.progress > 100; }).length
      : 0;
    return busts ? busts + "× vyhoření" : "bez vyhoření";
  }
  if (game === "curling") {
    return result.score === 1 ? "1 curlingový bod" : result.score + " curlingové body";
  }
  if (game === "alttab") {
    return (result.average ? "průměr " + result.average + " ms" : "bez reakce") + " · " + result.mistakes + " pastí";
  }
  if (game === "battleship") {
    return result.hits + " zásahů z " + result.shots + " pokusů";
  }
  if (game === "taskstack") {
    return result.lines + " řádků · " + result.sent + " odesláno";
  }
  if (game === "pong") {
    return "nejdelší výměna " + result.bestRally;
  }
  if (game === "escape") {
    return result.distance + " m · " + result.coffees + "× káva · " + result.crashes + " kolizí";
  }
  if (game === "jargon") {
    return result.solved + "/6 vět · průměr " + (result.average || "—") + (result.average ? " ms" : "");
  }
  if (game === "coffee") {
    return result.served + "/5 káv · " + result.mistakes + " "
      + czechCount(result.mistakes, "reklamace", "reklamace", "reklamací");
  }
  if (game === "calendar") {
    return result.booked + "/6 meetingů · " + result.mistakes + " "
      + czechCount(result.mistakes, "kolize", "kolize", "kolizí");
  }
  if (game === "pictionary") {
    const rounds = result.rounds || 3;
    return result.guessed + "/" + rounds + " uhádnuto · " + result.understood + "/" + rounds + " obrázků rozpoznáno";
  }
  return result.repaired + "/10 oprav · průměr " + (result.average || "—") + (result.average ? " ms" : "");
}

function czechCount(value, one, few, many) {
  if (value === 1) return one;
  if (value >= 2 && value <= 4) return few;
  return many;
}

function launchConfetti() {
  refs.confetti.replaceChildren();
  window.clearTimeout(state.confettiTimer);
  const colors = ["#ff0f7b", "#ffd51f", "#48a7ff", "#55e895", "#ff5b4d", "#071a3d"];
  const random = createRng("confetti:" + (state.match ? state.match.id : Date.now()));
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 65; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    piece.style.left = Math.round(random() * 100) + "%";
    piece.style.background = colors[Math.floor(random() * colors.length)];
    piece.style.setProperty("--duration", (2.2 + random() * 2.2).toFixed(2) + "s");
    piece.style.setProperty("--delay", (random() * .8).toFixed(2) + "s");
    piece.style.setProperty("--drift", Math.round((random() - .5) * 170) + "px");
    fragment.append(piece);
  }
  refs.confetti.append(fragment);
  state.confettiTimer = window.setTimeout(function () { refs.confetti.replaceChildren(); }, 5200);
}

function requestRematch() {
  if (!state.match) return;
  if (state.tournament) {
    if (state.tournament.currentIndex < state.tournament.games.length - 1) {
      requestTournamentNext();
      return;
    }
    startNewTournament();
    return;
  }
  const game = state.match.game;
  if (state.mode === "practice") {
    queueMatch({ id: makeSeed(), game, seed: makeSeed(), format: "single", tournament: null }, 2200);
    return;
  }
  backToOnlineLobby(true, true);
}

function requestTournamentNext() {
  if (!state.tournament || state.tournament.localReady) return;
  state.tournament.localReady = true;
  refs.rematchButton.disabled = true;
  refs.rematchButton.textContent = state.mode === "practice" ? "Losuji další hru…" : "Čekám na kolegu…";

  if (state.mode === "practice") {
    state.tournament.remoteReady = true;
    state.resultTimer = window.setTimeout(prepareNextTournamentRound, 650);
    return;
  }

  sendMessage({
    type: "tournament-ready",
    tournamentId: state.tournament.id,
    index: state.tournament.currentIndex
  });
  maybePrepareNextTournamentRound();
}

function receiveTournamentReady(message) {
  if (!state.tournament || typeof message.tournamentId !== "string"
    || message.tournamentId !== state.tournament.id || message.index !== state.tournament.currentIndex) return;
  state.tournament.remoteReady = true;
  if (!state.tournament.localReady && !refs.resultScreen.hidden) {
    refs.resultCopy.textContent = "Soupeř je připravený. Další hra čeká už jen na tebe.";
  }
  maybePrepareNextTournamentRound();
}

function maybePrepareNextTournamentRound() {
  if (state.mode !== "online" || state.role !== 0 || !state.tournament
    || !state.tournament.localReady || !state.tournament.remoteReady || state.pendingMatch) return;
  prepareNextTournamentRound();
}

function prepareNextTournamentRound() {
  if (!state.tournament || state.tournament.currentIndex >= state.tournament.games.length - 1) return;
  state.tournament.currentIndex += 1;
  state.tournament.localReady = false;
  state.tournament.remoteReady = false;
  const pending = {
    id: makeSeed(),
    game: state.tournament.games[state.tournament.currentIndex],
    seed: makeSeed(),
    format: "tournament",
    tournament: tournamentEnvelope(state.tournament)
  };

  if (state.mode === "practice") {
    queueMatch(pending, 1800);
    return;
  }

  state.pendingMatch = pending;
  refs.resultCopy.textContent = "Oba připraveni. Přesouváme se na " + GAME_META[pending.game].title + ".";
  sendMessage({
    type: "prepare",
    matchId: pending.id,
    game: pending.game,
    seed: pending.seed,
    format: pending.format,
    tournament: pending.tournament
  });
  window.clearTimeout(state.prepareTimer);
  state.prepareTimer = window.setTimeout(function () {
    if (!state.pendingMatch || state.pendingMatch.id !== pending.id) return;
    state.pendingMatch = null;
    state.tournament.currentIndex -= 1;
    state.tournament.localReady = false;
    state.tournament.remoteReady = false;
    refs.rematchButton.disabled = false;
    refs.rematchButton.textContent = "Zkusit další hru znovu";
    refs.resultCopy.textContent = "Soupeř nepotvrdil další hru. Zkuste pokračování znovu.";
  }, 7000);
}

function startNewTournament() {
  if (state.mode === "practice") {
    const tournamentId = makeSeed();
    const games = pickTournamentGames(tournamentId);
    state.tournament = createTournament(tournamentId, games, 0);
    queueMatch({
      id: makeSeed(),
      game: games[0],
      seed: makeSeed(),
      format: "tournament",
      tournament: tournamentEnvelope(state.tournament)
    }, 2200);
    return;
  }
  state.tournament = null;
  state.selectedFormat = "tournament";
  backToOnlineLobby(true, true);
}

function returnToGamePicker() {
  if (state.mode === "practice") {
    cleanupController();
    clearMatchTimers();
    state.match = null;
    state.tournament = null;
    state.mode = null;
    state.role = null;
    state.remote = null;
    setConnectionStatus("offline", "● Bez spojení");
    showScreen("setup");
    return;
  }
  backToOnlineLobby(false, true);
}

function returnToLobbyFromGame() {
  if (state.mode === "practice") {
    returnToGamePicker();
    return;
  }
  backToOnlineLobby(false, true);
}

function backToOnlineLobby(ready, notify) {
  const game = state.match ? state.match.game : state.selectedGame;
  const format = state.selectedFormat;
  cleanupController();
  clearMatchTimers();
  state.match = null;
  state.pendingMatch = null;
  state.tournament = null;
  state.local.ready = Boolean(ready);
  if (state.remote) state.remote.ready = false;
  chooseGame(game, false);
  chooseFormat(format, false);
  showScreen("lobby");
  renderLobby();
  if (notify) sendMessage({ type: "return-lobby", game, format, ready: Boolean(ready) });
  sendMessage({ type: "ready", ready: state.local.ready });
  if (state.role === 0) sendLobbySnapshot();
  refs.lobbyStatus.textContent = ready ? "Odveta vyžádána. Čekám, až soupeř najde odvahu." : "Vyberte disciplínu a připravte se znovu.";
}

function receiveReturnToLobby(message) {
  const game = GAME_IDS.includes(message.game) ? message.game : state.selectedGame;
  const format = MATCH_FORMATS.includes(message.format) ? message.format : state.selectedFormat;
  cleanupController();
  clearMatchTimers();
  state.match = null;
  state.pendingMatch = null;
  state.tournament = null;
  state.selectedGame = game;
  state.selectedFormat = format;
  state.local.ready = false;
  if (!state.remote) state.remote = { name: "Kolega", ready: false };
  state.remote.ready = Boolean(message.ready);
  chooseGame(game, false);
  chooseFormat(format, false);
  showScreen("lobby");
  renderLobby();
  refs.lobbyStatus.textContent = message.ready
    ? "Soupeř požaduje odvetu. Můžeš se připravit."
    : "Soupeř se vrátil do čekárny.";
  if (state.role === 0) sendLobbySnapshot();
}

function copyInviteLink() {
  copyText(inviteUrl(), refs.copyLink, "✓ Odkaz zkopírován");
}

function copyRoomCode() {
  copyText(state.roomCode, refs.copyCode, "✓ Kód zkopírován");
}

async function copyText(value, button, successText) {
  if (!value) return;
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  button.textContent = successText;
  window.setTimeout(function () { button.textContent = original; }, 1600);
}

function inviteUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("room", state.roomCode);
  url.hash = "";
  return url.toString();
}

function updateInviteUrl() {
  if (!state.roomCode) return;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("room", state.roomCode);
  history.replaceState(null, "", url);
}

function clearInviteUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  history.replaceState(null, "", url);
}

function returnAfterNetworkFailure() {
  resetSession(true);
  showScreen("setup");
  clearInviteUrl();
  setConnectionStatus("error", "● Síť nedostupná");
}

function leaveToSetup() {
  resetSession(true);
  showScreen("setup");
  clearInviteUrl();
  setConnectionStatus("offline", "● Bez spojení");
  refs.noticeBanner.hidden = true;
}

function resetSession(destroyConnection) {
  cleanupController();
  clearMatchTimers();
  refs.confetti.replaceChildren();
  state.suppressConnectionClose = true;
  if (destroyConnection) destroyPeer();
  else destroyPeer();
  state.suppressConnectionClose = false;
  state.mode = null;
  state.role = null;
  state.roomCode = "";
  state.local.ready = false;
  state.remote = null;
  state.pendingMatch = null;
  state.match = null;
  state.tournament = null;
}

function destroyPeer() {
  state.suppressConnectionClose = true;
  try {
    if (state.connection) state.connection.close();
  } catch (error) {
    // Spojení už mohlo být zavřené z druhé strany.
  }
  try {
    if (state.peer && !state.peer.destroyed) state.peer.destroy();
  } catch (error) {
    // Při zavírání stránky není co zachraňovat.
  }
  state.connection = null;
  state.peer = null;
}

function cleanupController() {
  if (state.controller && typeof state.controller.cleanup === "function") state.controller.cleanup();
  state.controller = null;
}

function clearMatchTimers() {
  state.countdownTimers.forEach(window.clearTimeout);
  state.countdownTimers = [];
  window.clearTimeout(state.prepareTimer);
  window.clearTimeout(state.resultTimer);
  state.prepareTimer = 0;
  state.resultTimer = 0;
}
