# Sdílená Pokémon data

`snapshot.mjs` je verzovaný snapshot druhů s ID 1–151 z datového repozitáře PokeAPI. Obsahuje aktuální základní hodnoty HP, útoku, obrany a rychlosti. Výška je uložená v decimetrech a váha v hektogramech stejně jako v PokeAPI; pořadí pole `types` zachovává primární typ na první pozici.

Aktualizace snapshotu nevyžaduje žádnou závislost:

```sh
node duel/games/pokemon/update-snapshot.mjs
```

Skript stáhne několik zdrojových CSV souborů připnutých na aktuální commit a zapíše použitou revizi i čas do snapshotu. Hry importují pouze lokální `snapshot.mjs`; PokeAPI za běhu duelu nevolají.
