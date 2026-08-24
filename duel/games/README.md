# Přidání digitální hry

1. Zkopíruj nejpodobnější modul v této složce a ponech v něm metadata, UI, pravidla i výsledkové adaptéry.
2. Exportuj descriptor vytvořený přes `defineGame()`.
3. Přidej jeho import a položku do `GAMES` v `registry.mjs`; pořadí pole určuje pořadí v nabídce.
4. Přidej herní styly do označeného bloku v `duel.css` a samostatný test do `tests/`.

Každý `.mjs` soubor přímo v této složce kromě `registry.mjs` a `shared.mjs` představuje právě jednu hru. Pomocná data a dílčí moduly dávej do podsložky dané hry, například `office-pictionary/words.mjs`; kontraktový test tak pozná zapomenutou registraci nové hry.

Minimální kontrakt:

```js
export const newGame = defineGame({
  id: "new-game",
  meta: {
    icon: "🎮",
    title: "Nová hra",
    teaser: "Krátký popis",
    difficulty: "postřeh",
    instruction: "Co má hráč udělat.",
    scoreLabel: "bodů"
  },
  start: startNewGame,
  result: {
    mode: "local",
    createPractice: createPracticeResult,
    normalize: normalizeResult,
    format: formatResult
  }
});
```

- `local`: každý klient dokončí vlastní výsledek přes `context.finish()`; `createPractice` je povinný pro soupeře-bota.
- `shared`: controller dokončí oba výsledky přes `context.finishShared()`; `createPractice` se neuvádí, protože bot je součástí controlleru.
- `start()` musí vrátit `{ receiveNetwork(message), cleanup() }`.
- `normalize()` je bezpečnostní hranice pro data od soupeře; musí omezit skóre, počty i velikost polí.
- Pro nové síťové zprávy používej typ `game:<id>-<event>` a vždy validuj payload i pořadí zpráv.
- Obecná aplikace ani `game-core.mjs` se při přidání hry neupravují. `game-core.mjs` obsahuje jen sdílené RNG, seed a turnajové utility.

`start(context)` dostane toto API:

- `stage`: DOM element určený pro UI hry.
- `seed`: seed zápasu; veškerou náhodnost odvozuj z něj, aby oba klienti dostali stejný průběh.
- `localRole`: role tohoto klienta (`0` nebo `1`), `mode`: `practice` nebo `online`, `names`: jména podle role.
- `setRoundLabel(text)`: popisek kola; `publishScore(score)`: průběžné skóre lokální hry.
- `setScores(local, remote)`: průběžná skóre sdílené hry v pořadí tohoto klienta.
- `finish(result)`: dokončení lokální hry; `finishShared([role0, role1])`: dokončení sdílené hry.
- `send(message)`: odeslání validované herní zprávy soupeři; `matchId` doplní aplikace.

Ověření:

- Kromě běžného průchodu otestuj `normalize()` s `null`, `NaN`, nekonečnem, zápornými a extrémně velkými hodnotami a přerostlými poli či texty, které hra přijímá.

```sh
node --test tests/*.test.mjs
```
