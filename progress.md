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
- Hotový local controller: 8 kol, lineární skóre 1 000–100, nápovědy ve 2/4 s, timeout v 6 s, jeden pokus, reveal, klávesy 1–4, aria-live, focus a úplný cleanup.
- Jednotkové a kontraktové testy: 30/30 prošlo.
- Browser: dokončen celý skutečný practice tok, desktop keyboard, mobile touch i celý duel ve viewportu 480×320; bez horizontálního přetečení, bez konzolových chyb a s 0 requesty na PokeAPI. Záměrně zpožděný sprite potvrdil, že 6s limit začíná až po načtení.
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
