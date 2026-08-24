import { BATTLESHIP, battleshipShotResult, buildBattleshipFleet, createRng } from "../game-core.mjs";

export function startSpreadsheetBattleship(context) {
  const localRole = context.localRole;
  const fleets = [buildBattleshipFleet(context.seed, 0), buildBattleshipFleet(context.seed, 1)];
  const shots = [new Set(), new Set()];
  const timers = [];
  const botRandom = createRng("battleship-bot:" + context.seed);
  let turnOwner = 0;
  let sequence = 0;
  let finished = false;

  context.setRoundLabel("2 lodě · mřížka 6 × 6");
  context.stage.innerHTML = `
    <div class="battleship-shell">
      <div class="battleship-status" role="status" aria-live="polite">
        <span class="eyebrow">Tabulková námořní bitva</span>
        <h3>Růžový tým zahajuje audit</h3>
        <p>Zásah dává další tah. Minutí předává slovo soupeři.</p>
      </div>
      <div class="battleship-boards">
        <section>
          <div class="battleship-board-heading"><strong>Cizí kalendář</strong><span class="enemy-fleet">5 bloků zbývá</span></div>
          <div class="battleship-grid enemy-grid" role="grid" aria-label="Mřížka soupeře"></div>
        </section>
        <section>
          <div class="battleship-board-heading"><strong>Tvůj kalendář</strong><span class="own-fleet">2 meetingy plují</span></div>
          <div class="battleship-grid own-grid" role="grid" aria-label="Vlastní mřížka"></div>
        </section>
      </div>
      <div class="battleship-legend"><span><i class="ship"></i> meeting</span><span><i class="hit"></i> zásah</span><span><i class="miss"></i> voda</span></div>
    </div>`;

  const heading = context.stage.querySelector(".battleship-status h3");
  const status = context.stage.querySelector(".battleship-status p");
  const enemyGrid = context.stage.querySelector(".enemy-grid");
  const ownGrid = context.stage.querySelector(".own-grid");
  const enemyFleetLabel = context.stage.querySelector(".enemy-fleet");
  const ownFleetLabel = context.stage.querySelector(".own-fleet");

  function ownerName(owner) {
    return owner === localRole ? "Ty" : context.names[owner];
  }

  function targetFleet(owner) {
    return fleets[1 - owner];
  }

  function hitCount(owner) {
    const occupied = new Set(targetFleet(owner).flat());
    let hits = 0;
    shots[owner].forEach(function (cell) { if (occupied.has(cell)) hits += 1; });
    return hits;
  }

  function sunkCount(owner) {
    return targetFleet(owner).filter(function (ship) {
      return ship.every(function (cell) { return shots[owner].has(cell); });
    }).length;
  }

  function cellLabel(cell) {
    const column = String.fromCharCode(65 + cell % BATTLESHIP.size);
    const row = Math.floor(cell / BATTLESHIP.size) + 1;
    return column + row;
  }

  function isSunkCell(fleet, receivedShots, cell) {
    return fleet.some(function (ship) {
      return ship.includes(cell) && ship.every(function (shipCell) { return receivedShots.has(shipCell); });
    });
  }

  function renderGrid(container, shotOwner, fleetOwner, interactive) {
    const fragment = document.createDocumentFragment();
    const fired = shots[shotOwner];
    const fleet = fleets[fleetOwner];
    const occupied = new Set(fleet.flat());

    for (let cell = 0; cell < BATTLESHIP.size * BATTLESHIP.size; cell += 1) {
      const button = document.createElement("button");
      const wasFired = fired.has(cell);
      const hit = wasFired && occupied.has(cell);
      button.type = "button";
      button.className = "battleship-cell";
      button.dataset.cell = String(cell);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", cellLabel(cell) + (wasFired ? hit ? ", zásah" : ", voda" : interactive ? ", vystřelit" : occupied.has(cell) ? ", vlastní meeting" : ", prázdné"));

      if (!interactive && occupied.has(cell)) button.classList.add("is-ship");
      if (wasFired) button.classList.add(hit ? "is-hit" : "is-miss");
      if (hit && isSunkCell(fleet, fired, cell)) button.classList.add("is-sunk");
      if (!interactive || finished || turnOwner !== localRole || wasFired) button.setAttribute("aria-disabled", "true");
      if (interactive) {
        button.addEventListener("click", function () {
          performShot(localRole, sequence, cell, true);
        });
      }
      fragment.append(button);
    }
    container.replaceChildren(fragment);
  }

  function render() {
    renderGrid(enemyGrid, localRole, 1 - localRole, true);
    renderGrid(ownGrid, 1 - localRole, localRole, false);
    const enemyRemaining = BATTLESHIP.totalDecks - hitCount(localRole);
    const ownRemaining = BATTLESHIP.totalDecks - hitCount(1 - localRole);
    enemyFleetLabel.textContent = enemyRemaining + " " + (enemyRemaining === 1 ? "blok zbývá" : "bloků zbývá");
    ownFleetLabel.textContent = ownRemaining + " " + (ownRemaining === 1 ? "blok zbývá" : "bloků zbývá");
    context.setScores(hitCount(localRole), hitCount(1 - localRole));
  }

  function complete(winner) {
    if (finished) return;
    finished = true;
    render();
    heading.textContent = ownerName(winner) + (winner === localRole ? " potápíš poslední meeting!" : " potápí poslední meeting!");
    status.textContent = "Audit uzavřen. Všechny pozvánky byly nenávratně archivovány.";
    timers.push(window.setTimeout(function () {
      const results = [0, 1].map(function (owner) {
        return {
          score: owner === winner ? 1 : 0,
          hits: hitCount(owner),
          shots: shots[owner].size,
          sunk: sunkCount(owner)
        };
      });
      context.finishShared(results);
    }, 750));
  }

  function scheduleBot() {
    if (context.mode !== "practice" || finished || turnOwner !== 1) return;
    timers.push(window.setTimeout(function () {
      if (finished || turnOwner !== 1) return;
      const available = [];
      for (let cell = 0; cell < BATTLESHIP.size * BATTLESHIP.size; cell += 1) {
        if (!shots[1].has(cell)) available.push(cell);
      }
      if (!available.length) return;

      const possibleNeighbors = [];
      shots[1].forEach(function (cell) {
        if (!fleets[0].flat().includes(cell)) return;
        const x = cell % BATTLESHIP.size;
        const y = Math.floor(cell / BATTLESHIP.size);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (offset) {
          const nextX = x + offset[0];
          const nextY = y + offset[1];
          const next = nextY * BATTLESHIP.size + nextX;
          if (nextX >= 0 && nextX < BATTLESHIP.size && nextY >= 0 && nextY < BATTLESHIP.size && !shots[1].has(next)) {
            possibleNeighbors.push(next);
          }
        });
      });
      const pool = possibleNeighbors.length ? possibleNeighbors : available;
      const cell = pool[Math.floor(botRandom() * pool.length)];
      performShot(1, sequence, cell, false);
    }, 620 + Math.round(botRandom() * 520)));
  }

  function performShot(owner, incomingSequence, cell, shouldSend) {
    if (finished || owner !== turnOwner || incomingSequence !== sequence || !Number.isInteger(cell) || cell < 0 || cell >= BATTLESHIP.size * BATTLESHIP.size || shots[owner].has(cell)) return false;
    shots[owner].add(cell);
    const result = battleshipShotResult(targetFleet(owner), shots[owner], cell);

    if (shouldSend && context.mode === "online") {
      context.send({ type: "game:battleship-shot", owner, sequence, cell });
    }
    sequence += 1;

    if (result.hit) {
      heading.textContent = result.sunk ? "Meeting potopen!" : "Zásah do kalendáře!";
      status.textContent = ownerName(owner) + " trefuje " + cellLabel(cell) + " a pokračuje dalším tahem.";
    } else {
      turnOwner = 1 - turnOwner;
      heading.textContent = turnOwner === localRole ? "Jsi na tahu" : "Na tahu je " + ownerName(turnOwner);
      status.textContent = ownerName(owner) + " na " + cellLabel(cell) + " našel jen volný čas. Tah se střídá.";
    }

    render();
    if (result.fleetSunk) {
      complete(owner);
    } else {
      scheduleBot();
    }
    return true;
  }

  heading.textContent = turnOwner === localRole ? "Jsi na tahu" : "Začíná " + ownerName(turnOwner);
  status.textContent = turnOwner === localRole
    ? "Klikni do soupeřova kalendáře. Zásah ti nechá další tah."
    : "Soupeř vybírá první podezřelý blok v tabulce.";
  render();
  scheduleBot();

  return {
    receiveNetwork: function (message) {
      if (!message || message.type !== "game:battleship-shot" || message.owner !== 1 - localRole) return;
      performShot(message.owner, message.sequence, message.cell, false);
    },
    cleanup: function () {
      finished = true;
      timers.forEach(window.clearTimeout);
    }
  };
}
