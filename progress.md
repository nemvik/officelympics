Original prompt: ok, udělej kancelářskou věž, tichou kopírku a kancelářský pictionary

## Průběh

- Zmapování existujících fyzických disciplín, bodování a síťového protokolu digitálních duelů dokončeno.
- Kancelářská věž a Tichá kopírka mají pravidla, vstupy v bodovacím centru, migraci uloženého stavu a sloupce v tiskovém archu.
- Kancelářský Pictionary je hotový ve třech kolech pro sólo i online režim, včetně kreslení, mazání, hádání, bodování a jednoduchých kreseb bota.
- Jednotkové testy: 19/19 prošlo. Vizuálně ověřen desktop, mobil, celý sólo tok a simulované propojení dvou online klientů; bez chyb v konzoli.
- Závěrečná kontrola syntaxe a `git diff --check` prošla. Do plakátu byl doplněn viditelný aktualizační štítek se sedmi disciplínami.

## TODO / doporučení

- Pro větší slovník Pictionary přesunout čárové šablony a zadání do samostatného datového modulu.
- Pokud bude Pictionary soutěžně důležitý, doplnit test proti skutečnému PeerJS spojení přes internet; lokálně byl protokol ověřen propojením dvou klientů.

## Turnaj — 3 náhodné hry

- Přidán centrální `game-catalog.mjs`; oba výběry her se z něj generují a metadata už nejsou duplikovaná v HTML a aplikační logice.
- Původní téměř čtyřtisícový `games.mjs` byl mechanicky rozdělen na 13 samostatných modulů v `duel/games/`; agregátor zachovává stejné veřejné API.
- Přidán formát „Turnaj“: deterministický los tří různých her, jeden bod za výhru, půl bodu za remízu, průběžný stav a potvrzení obou hráčů před dalším kolem.
- Síťový protokol zvýšen na verzi 2 a přenáší ověřenou turnajovou obálku (ID, pořadí her a index kola).
- Syntaxe všech modulů a 20/20 jednotkových testů prošly.

## TODO turnaje

- Celý sólo průchod třemi deterministicky vylosovanými hrami (`printer → deadline → alttab`) ověřen na desktopu; výsledný stav 2:1, všechny přechody a finální verdikt fungují.
- Mobilní setup turnaje (390 × 844) vizuálně ověřen; bez přetečení a s čitelným pořadím voleb.
- Dva skutečné PeerJS klienty v oddělených stránkách dostaly stejný los; po první hře host čekal, dokud pokračování nepotvrdil i host, i hostovaný hráč, a oba synchronně přešli do druhé hry.
- Finální běh: 20/20 jednotkových testů, `node --check`, `git diff --check` a prohlížeč bez konzolových chyb.

## Zbývající doporučení

- Generování výsledku bota, normalizace výsledků a text detailu zůstávají v centrálních `if` větvích. Při dalším přidávání hry je vhodné přesunout i tyto tři adaptéry k příslušnému hernímu modulu.
