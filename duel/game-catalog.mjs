export const GAME_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "panic",
    icon: "🔥",
    title: "Office Panic",
    teaser: "20 sekund inboxového chaosu",
    difficulty: "rychlost",
    instruction: "Klikni na užitečné události, pasti ignoruj. Kombo přidává body.",
    scoreLabel: "bodů"
  }),
  Object.freeze({
    id: "deadline",
    icon: "⏱️",
    title: "Deadline Chicken",
    teaser: "Pusť práci těsně před vyhořením",
    difficulty: "odhad",
    instruction: "Drž práci, za hranicí mlhy odhaduj a pusť ji těsně před 100 %.",
    scoreLabel: "bodů z 500"
  }),
  Object.freeze({
    id: "curling",
    icon: "🗑️",
    title: "Papírový curling",
    teaser: "Tři koule, jeden kancelářský koš",
    difficulty: "taktika",
    instruction: "Střídejte se po jednom hodu. Bodují koule nejblíž středu kancelářského koše.",
    scoreLabel: "curlingových bodů"
  }),
  Object.freeze({
    id: "alttab",
    icon: "👔",
    title: "Alt+Tab Duel",
    teaser: "Přepni okno dřív, než šéf něco uvidí",
    difficulty: "reflex",
    instruction: "Přepni okno jen ve chvíli, kdy se objeví šéf. Falešné poplachy ignoruj.",
    scoreLabel: "bodů za krytí"
  }),
  Object.freeze({
    id: "battleship",
    icon: "📊",
    title: "Tabulková námořní bitva",
    teaser: "Potop meetingy v kolegově kalendáři",
    difficulty: "strategie",
    instruction: "Najdi dvě schované řady meetingů v soupeřově kalendáři. Zásah dává další tah.",
    scoreLabel: "potopených flotil"
  }),
  Object.freeze({
    id: "taskstack",
    icon: "🧱",
    title: "Task Stack",
    teaser: "Tetris s urgentními úkoly",
    difficulty: "arkáda",
    instruction: "Skládej padající úkoly. Smazané řádky pošlou soupeři urgentní práci.",
    scoreLabel: "bodů za úkoly"
  }),
  Object.freeze({
    id: "pong",
    icon: "📧",
    title: "Inbox Pong",
    teaser: "Nenech urgentní e-mail propadnout",
    difficulty: "duel",
    instruction: "Pohybuj inboxem nahoru a dolů. První, kdo zachrání pět urgentních e-mailů, vítězí.",
    scoreLabel: "zachráněných e-mailů"
  }),
  Object.freeze({
    id: "escape",
    icon: "🏃",
    title: "Meeting Escape",
    teaser: "Uteč meetingům a sbírej kávu",
    difficulty: "běh",
    instruction: "Přeskakuj meetingy, skrč se pod Reply All a cestou sbírej kávu.",
    scoreLabel: "bodů za útěk"
  }),
  Object.freeze({
    id: "jargon",
    icon: "🧩",
    title: "Jargon Decoder",
    teaser: "Poskládej korporátní moudro",
    difficulty: "slova",
    instruction: "Zapamatuj si větu a poskládej rozházená korporátní slova ve správném pořadí.",
    scoreLabel: "bodů za synergii"
  }),
  Object.freeze({
    id: "coffee",
    icon: "☕",
    title: "Kávová štafeta",
    teaser: "Namíchej objednávku zpaměti",
    difficulty: "paměť",
    instruction: "Zapamatuj si objednávku a namíchej správnou velikost, základ, mléko i přísadu.",
    scoreLabel: "bodů za kofein"
  }),
  Object.freeze({
    id: "calendar",
    icon: "🗓️",
    title: "Kalendářový squeeze",
    teaser: "Vmáčkni meeting do plného dne",
    difficulty: "postřeh",
    instruction: "Najdi v přeplněném dni souvislé volné okno pro další naprosto nezbytný meeting.",
    scoreLabel: "bodů za plánování"
  }),
  Object.freeze({
    id: "printer",
    icon: "🖨️",
    title: "Tiskárnový exorcista",
    teaser: "Zkroť kancelářského démona",
    difficulty: "diagnostika",
    instruction: "Přečti závadu a co nejrychleji vyber správný zásah, než si tiskárna vyžádá oběť.",
    scoreLabel: "bodů za servis"
  }),
  Object.freeze({
    id: "pictionary",
    icon: "🎨",
    title: "Kancelářský Pictionary",
    teaser: "Nakresli zadání a poznej soupeřovo dílo",
    difficulty: "kreslení",
    instruction: "Nakresli vlastní pojem a potom poznej soupeřův obrázek. Písmena a číslice jsou zakázaná.",
    scoreLabel: "bodů za umění"
  })
]);

export const GAME_IDS = Object.freeze(GAME_DEFINITIONS.map(function (game) { return game.id; }));

const GAME_BY_ID = new Map(GAME_DEFINITIONS.map(function (game) { return [game.id, game]; }));

export function getGameDefinition(gameId) {
  return GAME_BY_ID.get(gameId) || null;
}
