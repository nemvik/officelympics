Original prompt: ok, udělej kancelářskou věž, tichou kopírku a kancelářský pictionary

## Průběh

- Zmapování existujících fyzických disciplín, bodování a síťového protokolu digitálních duelů dokončeno.
- Kancelářská věž a Tichá kopírka mají pravidla, vstupy v bodovacím centru, migraci uloženého stavu a sloupce v tiskovém archu.
- Kancelářský Pictionary je hotový ve třech kolech pro sólo i online režim, včetně kreslení, mazání, hádání, bodování a jednoduchých kreseb bota.
- Jednotkové testy: 19/19 prošlo. Vizuálně ověřen desktop, mobil, celý sólo tok a simulované propojení dvou online klientů; bez chyb v konzoli.
- Závěrečná kontrola syntaxe a `git diff --check` prošla. Do plakátu byl doplněn viditelný aktualizační štítek se sedmi disciplínami.

## TODO / doporučení

- Pro větší slovník Pictionary přesunout čárové šablony a zadání do pomocného modulu v podsložce `duel/games/office-pictionary/`.
- Pokud bude Pictionary soutěžně důležitý, doplnit test proti skutečnému PeerJS spojení přes internet; lokálně byl protokol ověřen propojením dvou klientů.

## Turnaj — 3 náhodné hry

- Přidán centrální `game-catalog.mjs`; oba výběry her se z něj generují a metadata už nejsou duplikovaná v HTML a aplikační logice.
- Původní téměř čtyřtisícový `games.mjs` byl mechanicky rozdělen na 13 samostatných modulů v `duel/games/`; agregátor zachovává stejné veřejné API.
- Přidán formát „Turnaj“: deterministický los tří různých her, jeden bod za výhru, půl bodu za remízu, průběžný stav a potvrzení obou hráčů před dalším kolem.
- Síťový protokol zvýšen na verzi 2 a přenáší ověřenou turnajovou obálku (ID, pořadí her a index kola).
- Syntaxe všech modulů a 20/20 jednotkových testů prošly.

## Ověření turnaje

- Celý sólo průchod třemi deterministicky vylosovanými hrami (`printer → deadline → alttab`) ověřen na desktopu; výsledný stav 2:1, všechny přechody a finální verdikt fungují.
- Mobilní setup turnaje (390 × 844) vizuálně ověřen; bez přetečení a s čitelným pořadím voleb.
- Dva skutečné PeerJS klienty v oddělených stránkách dostaly stejný los; po první hře host čekal, dokud pokračování nepotvrdil i host, i hostovaný hráč, a oba synchronně přešli do druhé hry.
- Finální běh: 20/20 jednotkových testů, `node --check`, `git diff --check` a prohlížeč bez konzolových chyb.

## PokéStín — aktuální úkol

Original prompt: Kompletně implementovat lokální duelovou hru „PokéStín“ (`poke-shadow`) s 8 deterministickými koly, verzovaným snapshotem PokeAPI pro ID 1–151, časovanými nápovědami, skóre 1 000–100, přístupným responzivním UI, practice botem, registrací, testy a ověřením.

- Přečten `duel/games/README.md`; kořenový `AGENTS.md` v pracovním stromu není, použity jsou instrukce vložené v zadání.
- Výchozí stav: čistý worktree a 22/22 testů prochází.
- Nejbližší implementační vzor je `printer-exorcist.mjs`; sdílená Pokémon data budou v `duel/games/pokemon/`, obecná aplikace ani `game-core.mjs` změnu nepotřebují.
- Přidán snapshot 151 druhů z revize PokeAPI `b963af2b78a3` a sprite revize `c10459b9b012`; runtime hra nemá `fetch()` a přednačítá jen osm obrázků vybraného zápasu.
- Hotový local controller: 8 kol, lineární skóre 1 000–100, nápovědy v 5/10 s, timeout v 15 s, jeden pokus, reveal, klávesy 1–4, aria-live, focus a úplný cleanup.
- Jednotkové a kontraktové testy: 30/30 prošlo.
- Browser původní 6s varianty: dokončen celý skutečný practice tok, desktop keyboard, mobile touch i celý duel ve viewportu 480×320; bez horizontálního přetečení, bez konzolových chyb a s 0 requesty na PokeAPI. Následná drobná změna zpomalila kolo na 15 s s nápovědami v 5/10 s; na výslovný pokyn uživatele nebyl tento timing-only commit znovu testován.
- Nezávislé review vedlo k loading gate pro sprite, ochraně proti stale vstupu, konzistentnější normalizaci výsledku, klidnějším aria-live oznámením, úplnému cleanupu obrázků a kompaktnímu landscape layoutu. Re-review nenašlo blocker, P1 ani P2.
- Finální ověření: 30/30 testů, syntax všech `.mjs`, `git diff --check`, celý practice tok a předepsaný Playwright klient bez chyb.

## Splněné doporučení

- Generování výsledku bota, normalizace výsledků a text detailu byly přesunuty z centrálních `if` větví k příslušným herním modulům.

## Modularizace her

- Dokončen jednotný descriptor hry: metadata, `start`, režim výsledku, normalizace, výsledek tréninkového bota a text výsledku nyní vlastní příslušný modul v `duel/games/`.
- Přidán jediný explicitní `games/registry.mjs`, který kontroluje unikátní ID a povinné hooky, odvozuje katalog i whitelist pro síťový protokol a nemá obecné fallbacky pro neúplnou hru.
- `app.mjs` deleguje start, normalizaci, bot výsledek a formátování registru; Battleship compact title se přesunul z výjimky v shellu do metadat hry.
- Herně specifické konstanty a čistá pravidla jsou u svých her; `game-core.mjs` klesl z 950 na 54 řádků sdílených RNG, seed a turnajových utilit. Staré paralelní registry `game-catalog.mjs` a `games.mjs` byly odstraněny.
- Přidán `duel/games/README.md` s kontraktem a checklistem nové hry. Kontraktový test automaticky projde všechny registrované hry a neobsahuje natvrdo počet 13.
- Finální ověření: syntaxe všech modulů, 22/22 jednotkových testů, výběr všech 13 her v browseru, start local/shared hry, turnajový los a celý Office Panic průchod až k výsledku bota; bez konzolových chyb.

## Kanto Trumf — aktuální úkol

Original prompt: Kompletně implementovat sdílenou duelovou hru „Kanto Trumf“ (`kanto-trumf`) se seedovanou rukou sedmi Pokémonů, šesti unikátními disciplínami, tajnou volbou přes commit–reveal, osmivteřinovým timeoutem, practice botem, přístupným responzivním UI, registrací, testy a úplným ověřením.

- Přečten `duel/games/README.md`; kořenový `AGENTS.md` v pracovním stromu není, použity jsou instrukce vložené v zadání.
- Snapshot `duel/games/pokemon/snapshot.mjs` zůstává jediným runtime zdrojem 151 druhů a nově obsahuje PokeAPI base staty HP, útok, obrana a rychlost; výška a váha používají původní jednotky snapshotu. Produkční hra nemá PokeAPI `fetch()`.
- Hotový shared controller: stejná seedovaná ruka sedmi karet, šest disciplín právě jednou, aktuální i následující hodnota, osmivteřinová deterministická volba, Ditto/tie/win bodování a role-ordered `finishShared()` s maximem 12 bodů.
- Online volby používají SHA-256 commit–reveal s 128bit nonce, vazbou na roli a kolo, validací ruky/spotřeby/pořadí a bounded frontami pro zpožděný commit dalšího kola i souběžné reveal ověřování. Practice bot vybírá seedovaně z nejlepších dostupných karet bez síťového protokolu.
- Bezpečnostní review reprodukovalo podvržení generic shared výsledku a oprava v `duel/app.mjs` nyní vzdálené `result` zprávy u shared her ignoruje; stejný browser PoC po opravě ponechal kanonické skóre beze změny.
- UI je responzivní a přístupné: skutečná tlačítka, klávesy 1–7 a Enter, aria-live stav, accessible názvy obou disciplín, focus preservation, touch layout a fullscreen. Na 375×812 je CTA celé ve viewportu a nevzniká horizontální overflow.
- Finální ověření: 45/45 Node testů, syntax změněných modulů a `git diff --check`; celý practice zápas, dva online klienty, oba timeouty, commit-before-reveal, malformed/duplicate zprávy, delayed-reveal race, invalid→valid reveal race, idempotentní cleanup a podvržený finální výsledek byly ověřeny v headless Chromium. Produkční PokeAPI requesty: 0, browser console errors: 0.

## Evoluční pexeso — aktuální úkol

Original prompt: Kompletně implementovat shared duelovou hru „Evoluční pexeso“ (`evolution-memory`) s 16 kartami tvořícími osm disjunktních přímých evolučních párů z Kanto Pokémonů, seedovanou deskou a začínajícím hráčem, validovanou synchronní sítí, timeouty, poctivým practice botem, přístupným responzivním UI, registrací, testy a úplným ověřením.

- Lokální `AGENTS.md` v pracovním stromu není; použity jsou instrukce vložené v zadání. Přečten `duel/games/README.md` a skill `develop-web-game`.
- Snapshot Pokémonů byl rozšířen bez duplicity o 72 přímých parent–child vazeb a příznak větveného řetězce; generátor snapshotu udržuje stejný kontrakt. Runtime hra nepoužívá `fetch()`.
- Hotový shared controller: osm disjunktních párů a layout ze seedu, seedovaný začínající hráč, 15s timeout každého otočení, blokace při 900ms vyhodnocení, role-ordered `finishShared()`, průběžné skóre a plný cleanup.
- Online protokol posílá jen namespacovaný `{ type, action, index }`, odvozuje vzdálenou roli z kontextu, odmítá duplicity/future/late/invalid zprávy a má omezenou validovanou frontu nejvýše jednoho následujícího páru pro síťovou latenci během vyhodnocení.
- Practice bot dostává pouze vlastní mapu skutečně odhalených indexů a neznámé karty zkoumá seedovaně; známý kompletní pár vždy využije.
- Přístupné UI používá 16 skutečných tlačítek, bezpečné hidden aria labely, focus, aria-live, touch/keyboard, responzivní desktop/mobile/landscape layout a stav tahu/skóre/časovače.
- Finální ověření: 58/58 Node testů, syntax všech herních `.mjs` a `git diff --check`; skill Playwright klient i vlastní celý practice/online/mobile průchod. Practice 8:0, online 0:8 shodně na obou klientech, oba rychlé flipy následujícího páru se po síťové prodlevě synchronizovaly, timeout/Enter/touch/cleanup prošly, 0 console/page errors a 0 runtime PokeAPI requestů.

## TODO / doporučení

- Pokud repozitář později dostane standardní Playwright dev dependency a CI job, převést současné browser harness scénáře na automaticky spouštěný e2e test; produkční kód kvůli tomu další změnu nepotřebuje.
