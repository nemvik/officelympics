import { writeFile } from "node:fs/promises";

const DATA_REPOSITORY = "PokeAPI/pokeapi";
const SPRITE_REPOSITORY = "PokeAPI/sprites";
const DATA_FILES = Object.freeze([
  "pokemon.csv",
  "pokemon_species.csv",
  "pokemon_species_names.csv",
  "pokemon_stats.csv",
  "pokemon_types.csv",
  "stats.csv",
  "types.csv",
  "pokemon_colors.csv",
  "pokemon_shapes.csv"
]);

async function fetchChecked(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Stažení " + url + " selhalo: HTTP " + response.status);
  return response;
}

async function githubRevision(repository) {
  const response = await fetchChecked("https://api.github.com/repos/" + repository + "/commits/master", {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "officelympics-pokemon-snapshot"
    }
  });
  const commit = await response.json();
  if (!/^[a-f0-9]{40}$/.test(commit.sha || "")) throw new Error("GitHub nevrátil platnou revizi pro " + repository + ".");
  return commit.sha;
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers || !headers.length) return [];
  return rows.filter(function (values) {
    return values.some(Boolean);
  }).map(function (values) {
    return Object.fromEntries(headers.map(function (header, index) {
      return [header, values[index] || ""];
    }));
  });
}

function mapById(rows) {
  return new Map(rows.map(function (row) { return [Number(row.id), row]; }));
}

const [dataRevision, spriteRevision] = await Promise.all([
  githubRevision(DATA_REPOSITORY),
  githubRevision(SPRITE_REPOSITORY)
]);
const dataBase = "https://raw.githubusercontent.com/" + DATA_REPOSITORY + "/" + dataRevision + "/data/v2/csv/";
const sources = await Promise.all(DATA_FILES.map(async function (filename) {
  const response = await fetchChecked(dataBase + filename);
  return [filename, parseCsv(await response.text())];
}));
const tables = new Map(sources);

const pokemonById = mapById(tables.get("pokemon.csv"));
const speciesById = mapById(tables.get("pokemon_species.csv"));
const statById = mapById(tables.get("stats.csv"));
const typeById = mapById(tables.get("types.csv"));
const colorById = mapById(tables.get("pokemon_colors.csv"));
const shapeById = mapById(tables.get("pokemon_shapes.csv"));
const englishNameById = new Map(tables.get("pokemon_species_names.csv")
  .filter(function (row) { return row.local_language_id === "9"; })
  .map(function (row) { return [Number(row.pokemon_species_id), row.name]; }));
const typesByPokemonId = new Map();
const statsByPokemonId = new Map();
const childCountByParentId = new Map();

tables.get("pokemon_species.csv").forEach(function (species) {
  const parentId = Number(species.evolves_from_species_id);
  if (!Number.isInteger(parentId) || parentId < 1) return;
  childCountByParentId.set(parentId, (childCountByParentId.get(parentId) || 0) + 1);
});

const branchingChainIds = new Set(tables.get("pokemon_species.csv").filter(function (species) {
  const parentId = Number(species.evolves_from_species_id);
  return Number.isInteger(parentId) && childCountByParentId.get(parentId) > 1;
}).map(function (species) {
  return Number(species.evolution_chain_id);
}));

const evolutionEdges = tables.get("pokemon_species.csv").filter(function (species) {
  const childId = Number(species.id);
  const parentId = Number(species.evolves_from_species_id);
  return childId >= 1 && childId <= 151 && parentId >= 1 && parentId <= 151;
}).map(function (species) {
  return {
    parentId: Number(species.evolves_from_species_id),
    childId: Number(species.id),
    branched: branchingChainIds.has(Number(species.evolution_chain_id))
  };
});

tables.get("pokemon_stats.csv").forEach(function (row) {
  const pokemonId = Number(row.pokemon_id);
  if (pokemonId < 1 || pokemonId > 151) return;
  const stat = statById.get(Number(row.stat_id));
  if (!stat || !["hp", "attack", "defense", "speed"].includes(stat.identifier)) return;
  if (!statsByPokemonId.has(pokemonId)) statsByPokemonId.set(pokemonId, {});
  statsByPokemonId.get(pokemonId)[stat.identifier] = Number(row.base_stat);
});

tables.get("pokemon_types.csv").forEach(function (row) {
  const pokemonId = Number(row.pokemon_id);
  if (pokemonId < 1 || pokemonId > 151) return;
  if (!typesByPokemonId.has(pokemonId)) typesByPokemonId.set(pokemonId, []);
  typesByPokemonId.get(pokemonId).push({ id: Number(row.type_id), slot: Number(row.slot) });
});

const spriteBase = "https://raw.githubusercontent.com/" + SPRITE_REPOSITORY + "/" + spriteRevision
  + "/sprites/pokemon/other/official-artwork/";
const pokemon = Array.from({ length: 151 }, function (_, index) {
  const id = index + 1;
  const record = pokemonById.get(id);
  const species = speciesById.get(id);
  const name = englishNameById.get(id);
  const stats = statsByPokemonId.get(id);
  const types = (typesByPokemonId.get(id) || []).sort(function (first, second) {
    return first.slot - second.slot;
  }).map(function (type) {
    const typeRecord = typeById.get(type.id);
    return typeRecord && typeRecord.identifier;
  }).filter(Boolean);
  const color = species && colorById.get(Number(species.color_id));
  const shape = species && shapeById.get(Number(species.shape_id));
  const hasEvolutionParent = Boolean(species && Number(species.evolves_from_species_id) > 0);
  const hasEvolutionChild = childCountByParentId.has(id);
  const evolutionStage = hasEvolutionParent
    ? hasEvolutionChild ? "middle" : "final"
    : hasEvolutionChild ? "base" : "single";

  if (!record || !species || !name || !types.length || !color || !shape || !stats
    || !["hp", "attack", "defense", "speed"].every(function (stat) {
      return Number.isFinite(stats[stat]) && stats[stat] > 0;
    })) {
    throw new Error("Neúplná PokeAPI data pro Pokémon ID " + id + ".");
  }

  return {
    id,
    name,
    sprite: spriteBase + id + ".png",
    types,
    hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    height: Number(record.height),
    weight: Number(record.weight),
    color: color.identifier,
    evolutionStage,
    shape: shape.identifier
  };
});

if (pokemon.length !== 151 || new Set(pokemon.map(function (item) { return item.id; })).size !== 151) {
  throw new Error("Snapshot musí obsahovat právě 151 unikátních Pokémonů.");
}
if (!evolutionEdges.length || new Set(evolutionEdges.map(function (edge) {
  return edge.parentId + ":" + edge.childId;
})).size !== evolutionEdges.length) {
  throw new Error("Snapshot musí obsahovat unikátní přímé evoluční vazby.");
}

const generatedAt = new Date().toISOString();
const compactEvolutionEdges = "[\n" + evolutionEdges.map(function (edge) {
  return "  { \"parentId\": " + edge.parentId + ", \"childId\": " + edge.childId
    + ", \"branched\": " + edge.branched + " }";
}).join(",\n") + "\n]";
const snapshot = `// Vygenerováno skriptem update-snapshot.mjs; ruční změny budou při příští aktualizaci přepsány.
export const POKEMON_SNAPSHOT_META = Object.freeze(${JSON.stringify({
  source: "https://github.com/PokeAPI/pokeapi/tree/" + dataRevision + "/data/v2/csv",
  sourceRevision: dataRevision,
  spriteSource: "https://github.com/PokeAPI/sprites/tree/" + spriteRevision,
  spriteRevision,
  generatedAt,
  minimumId: 1,
  maximumId: 151,
  count: pokemon.length,
  evolutionKind: "direct_species_parent",
  evolutionEdgeCount: evolutionEdges.length,
  evolutionStageKind: "full_species_chain_position",
  statKind: "base_stat",
  heightUnit: "decimetre",
  weightUnit: "hectogram"
}, null, 2)});

const POKEMON_RECORDS = ${JSON.stringify(pokemon, null, 2)};

const EVOLUTION_EDGES = ${compactEvolutionEdges};

export const POKEMON_SNAPSHOT = Object.freeze(POKEMON_RECORDS.map(function (pokemon) {
  return Object.freeze({ ...pokemon, types: Object.freeze(pokemon.types.slice()) });
}));

export const POKEMON_EVOLUTION_EDGES = Object.freeze(EVOLUTION_EDGES.map(function (edge) {
  return Object.freeze({ ...edge });
}));
`;

await writeFile(new URL("./snapshot.mjs", import.meta.url), snapshot, "utf8");
console.log("Uložen snapshot " + pokemon.length + " Pokémonů z revize " + dataRevision.slice(0, 12) + ".");
