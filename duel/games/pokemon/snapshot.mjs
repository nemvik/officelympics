// Vygenerováno skriptem update-snapshot.mjs; ruční změny budou při příští aktualizaci přepsány.
export const POKEMON_SNAPSHOT_META = Object.freeze({
  "source": "https://github.com/PokeAPI/pokeapi/tree/b963af2b78a33e12fd38e96ccd74a8387bdda574/data/v2/csv",
  "sourceRevision": "b963af2b78a33e12fd38e96ccd74a8387bdda574",
  "spriteSource": "https://github.com/PokeAPI/sprites/tree/c10459b9b0129eaca5c5d9b1cac65336debb1d08",
  "spriteRevision": "c10459b9b0129eaca5c5d9b1cac65336debb1d08",
  "generatedAt": "2026-08-24T11:33:28.465Z",
  "minimumId": 1,
  "maximumId": 151,
  "count": 151,
  "statKind": "base_stat",
  "heightUnit": "decimetre",
  "weightUnit": "hectogram"
});

const POKEMON_RECORDS = [
  {
    "id": 1,
    "name": "Bulbasaur",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/1.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "speed": 45,
    "height": 7,
    "weight": 69,
    "color": "green",
    "shape": "quadruped"
  },
  {
    "id": 2,
    "name": "Ivysaur",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/2.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 60,
    "attack": 62,
    "defense": 63,
    "speed": 60,
    "height": 10,
    "weight": 130,
    "color": "green",
    "shape": "quadruped"
  },
  {
    "id": 3,
    "name": "Venusaur",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/3.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 80,
    "attack": 82,
    "defense": 83,
    "speed": 80,
    "height": 20,
    "weight": 1000,
    "color": "green",
    "shape": "quadruped"
  },
  {
    "id": 4,
    "name": "Charmander",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/4.png",
    "types": [
      "fire"
    ],
    "hp": 39,
    "attack": 52,
    "defense": 43,
    "speed": 65,
    "height": 6,
    "weight": 85,
    "color": "red",
    "shape": "upright"
  },
  {
    "id": 5,
    "name": "Charmeleon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/5.png",
    "types": [
      "fire"
    ],
    "hp": 58,
    "attack": 64,
    "defense": 58,
    "speed": 80,
    "height": 11,
    "weight": 190,
    "color": "red",
    "shape": "upright"
  },
  {
    "id": 6,
    "name": "Charizard",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/6.png",
    "types": [
      "fire",
      "flying"
    ],
    "hp": 78,
    "attack": 84,
    "defense": 78,
    "speed": 100,
    "height": 17,
    "weight": 905,
    "color": "red",
    "shape": "upright"
  },
  {
    "id": 7,
    "name": "Squirtle",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/7.png",
    "types": [
      "water"
    ],
    "hp": 44,
    "attack": 48,
    "defense": 65,
    "speed": 43,
    "height": 5,
    "weight": 90,
    "color": "blue",
    "shape": "upright"
  },
  {
    "id": 8,
    "name": "Wartortle",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/8.png",
    "types": [
      "water"
    ],
    "hp": 59,
    "attack": 63,
    "defense": 80,
    "speed": 58,
    "height": 10,
    "weight": 225,
    "color": "blue",
    "shape": "upright"
  },
  {
    "id": 9,
    "name": "Blastoise",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/9.png",
    "types": [
      "water"
    ],
    "hp": 79,
    "attack": 83,
    "defense": 100,
    "speed": 78,
    "height": 16,
    "weight": 855,
    "color": "blue",
    "shape": "upright"
  },
  {
    "id": 10,
    "name": "Caterpie",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/10.png",
    "types": [
      "bug"
    ],
    "hp": 45,
    "attack": 30,
    "defense": 35,
    "speed": 45,
    "height": 3,
    "weight": 29,
    "color": "green",
    "shape": "armor"
  },
  {
    "id": 11,
    "name": "Metapod",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/11.png",
    "types": [
      "bug"
    ],
    "hp": 50,
    "attack": 20,
    "defense": 55,
    "speed": 30,
    "height": 7,
    "weight": 99,
    "color": "green",
    "shape": "squiggle"
  },
  {
    "id": 12,
    "name": "Butterfree",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/12.png",
    "types": [
      "bug",
      "flying"
    ],
    "hp": 60,
    "attack": 45,
    "defense": 50,
    "speed": 70,
    "height": 11,
    "weight": 320,
    "color": "white",
    "shape": "bug-wings"
  },
  {
    "id": 13,
    "name": "Weedle",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/13.png",
    "types": [
      "bug",
      "poison"
    ],
    "hp": 40,
    "attack": 35,
    "defense": 30,
    "speed": 50,
    "height": 3,
    "weight": 32,
    "color": "brown",
    "shape": "armor"
  },
  {
    "id": 14,
    "name": "Kakuna",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/14.png",
    "types": [
      "bug",
      "poison"
    ],
    "hp": 45,
    "attack": 25,
    "defense": 50,
    "speed": 35,
    "height": 6,
    "weight": 100,
    "color": "yellow",
    "shape": "squiggle"
  },
  {
    "id": 15,
    "name": "Beedrill",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/15.png",
    "types": [
      "bug",
      "poison"
    ],
    "hp": 65,
    "attack": 90,
    "defense": 40,
    "speed": 75,
    "height": 10,
    "weight": 295,
    "color": "yellow",
    "shape": "bug-wings"
  },
  {
    "id": 16,
    "name": "Pidgey",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/16.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 40,
    "attack": 45,
    "defense": 40,
    "speed": 56,
    "height": 3,
    "weight": 18,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 17,
    "name": "Pidgeotto",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/17.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 63,
    "attack": 60,
    "defense": 55,
    "speed": 71,
    "height": 11,
    "weight": 300,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 18,
    "name": "Pidgeot",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/18.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 83,
    "attack": 80,
    "defense": 75,
    "speed": 101,
    "height": 15,
    "weight": 395,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 19,
    "name": "Rattata",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/19.png",
    "types": [
      "normal"
    ],
    "hp": 30,
    "attack": 56,
    "defense": 35,
    "speed": 72,
    "height": 3,
    "weight": 35,
    "color": "purple",
    "shape": "quadruped"
  },
  {
    "id": 20,
    "name": "Raticate",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/20.png",
    "types": [
      "normal"
    ],
    "hp": 55,
    "attack": 81,
    "defense": 60,
    "speed": 97,
    "height": 7,
    "weight": 185,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 21,
    "name": "Spearow",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/21.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 40,
    "attack": 60,
    "defense": 30,
    "speed": 70,
    "height": 3,
    "weight": 20,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 22,
    "name": "Fearow",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/22.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 65,
    "attack": 90,
    "defense": 65,
    "speed": 100,
    "height": 12,
    "weight": 380,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 23,
    "name": "Ekans",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/23.png",
    "types": [
      "poison"
    ],
    "hp": 35,
    "attack": 60,
    "defense": 44,
    "speed": 55,
    "height": 20,
    "weight": 69,
    "color": "purple",
    "shape": "squiggle"
  },
  {
    "id": 24,
    "name": "Arbok",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/24.png",
    "types": [
      "poison"
    ],
    "hp": 60,
    "attack": 95,
    "defense": 69,
    "speed": 80,
    "height": 35,
    "weight": 650,
    "color": "purple",
    "shape": "squiggle"
  },
  {
    "id": 25,
    "name": "Pikachu",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/25.png",
    "types": [
      "electric"
    ],
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "speed": 90,
    "height": 4,
    "weight": 60,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 26,
    "name": "Raichu",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/26.png",
    "types": [
      "electric"
    ],
    "hp": 60,
    "attack": 90,
    "defense": 55,
    "speed": 110,
    "height": 8,
    "weight": 300,
    "color": "yellow",
    "shape": "upright"
  },
  {
    "id": 27,
    "name": "Sandshrew",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/27.png",
    "types": [
      "ground"
    ],
    "hp": 50,
    "attack": 75,
    "defense": 85,
    "speed": 40,
    "height": 6,
    "weight": 120,
    "color": "yellow",
    "shape": "upright"
  },
  {
    "id": 28,
    "name": "Sandslash",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/28.png",
    "types": [
      "ground"
    ],
    "hp": 75,
    "attack": 100,
    "defense": 110,
    "speed": 65,
    "height": 10,
    "weight": 295,
    "color": "yellow",
    "shape": "upright"
  },
  {
    "id": 29,
    "name": "Nidoran♀",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/29.png",
    "types": [
      "poison"
    ],
    "hp": 55,
    "attack": 47,
    "defense": 52,
    "speed": 41,
    "height": 4,
    "weight": 70,
    "color": "blue",
    "shape": "quadruped"
  },
  {
    "id": 30,
    "name": "Nidorina",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/30.png",
    "types": [
      "poison"
    ],
    "hp": 70,
    "attack": 62,
    "defense": 67,
    "speed": 56,
    "height": 8,
    "weight": 200,
    "color": "blue",
    "shape": "quadruped"
  },
  {
    "id": 31,
    "name": "Nidoqueen",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/31.png",
    "types": [
      "poison",
      "ground"
    ],
    "hp": 90,
    "attack": 92,
    "defense": 87,
    "speed": 76,
    "height": 13,
    "weight": 600,
    "color": "blue",
    "shape": "upright"
  },
  {
    "id": 32,
    "name": "Nidoran♂",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/32.png",
    "types": [
      "poison"
    ],
    "hp": 46,
    "attack": 57,
    "defense": 40,
    "speed": 50,
    "height": 5,
    "weight": 90,
    "color": "purple",
    "shape": "quadruped"
  },
  {
    "id": 33,
    "name": "Nidorino",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/33.png",
    "types": [
      "poison"
    ],
    "hp": 61,
    "attack": 72,
    "defense": 57,
    "speed": 65,
    "height": 9,
    "weight": 195,
    "color": "purple",
    "shape": "quadruped"
  },
  {
    "id": 34,
    "name": "Nidoking",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/34.png",
    "types": [
      "poison",
      "ground"
    ],
    "hp": 81,
    "attack": 102,
    "defense": 77,
    "speed": 85,
    "height": 14,
    "weight": 620,
    "color": "purple",
    "shape": "upright"
  },
  {
    "id": 35,
    "name": "Clefairy",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/35.png",
    "types": [
      "fairy"
    ],
    "hp": 70,
    "attack": 45,
    "defense": 48,
    "speed": 35,
    "height": 6,
    "weight": 75,
    "color": "pink",
    "shape": "upright"
  },
  {
    "id": 36,
    "name": "Clefable",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/36.png",
    "types": [
      "fairy"
    ],
    "hp": 95,
    "attack": 70,
    "defense": 73,
    "speed": 60,
    "height": 13,
    "weight": 400,
    "color": "pink",
    "shape": "upright"
  },
  {
    "id": 37,
    "name": "Vulpix",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/37.png",
    "types": [
      "fire"
    ],
    "hp": 38,
    "attack": 41,
    "defense": 40,
    "speed": 65,
    "height": 6,
    "weight": 99,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 38,
    "name": "Ninetales",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/38.png",
    "types": [
      "fire"
    ],
    "hp": 73,
    "attack": 76,
    "defense": 75,
    "speed": 100,
    "height": 11,
    "weight": 199,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 39,
    "name": "Jigglypuff",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/39.png",
    "types": [
      "normal",
      "fairy"
    ],
    "hp": 115,
    "attack": 45,
    "defense": 20,
    "speed": 20,
    "height": 5,
    "weight": 55,
    "color": "pink",
    "shape": "humanoid"
  },
  {
    "id": 40,
    "name": "Wigglytuff",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/40.png",
    "types": [
      "normal",
      "fairy"
    ],
    "hp": 140,
    "attack": 70,
    "defense": 45,
    "speed": 45,
    "height": 10,
    "weight": 120,
    "color": "pink",
    "shape": "humanoid"
  },
  {
    "id": 41,
    "name": "Zubat",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/41.png",
    "types": [
      "poison",
      "flying"
    ],
    "hp": 40,
    "attack": 45,
    "defense": 35,
    "speed": 55,
    "height": 8,
    "weight": 75,
    "color": "purple",
    "shape": "wings"
  },
  {
    "id": 42,
    "name": "Golbat",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/42.png",
    "types": [
      "poison",
      "flying"
    ],
    "hp": 75,
    "attack": 80,
    "defense": 70,
    "speed": 90,
    "height": 16,
    "weight": 550,
    "color": "purple",
    "shape": "wings"
  },
  {
    "id": 43,
    "name": "Oddish",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/43.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 45,
    "attack": 50,
    "defense": 55,
    "speed": 30,
    "height": 5,
    "weight": 54,
    "color": "blue",
    "shape": "legs"
  },
  {
    "id": 44,
    "name": "Gloom",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/44.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 60,
    "attack": 65,
    "defense": 70,
    "speed": 40,
    "height": 8,
    "weight": 86,
    "color": "blue",
    "shape": "humanoid"
  },
  {
    "id": 45,
    "name": "Vileplume",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/45.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 75,
    "attack": 80,
    "defense": 85,
    "speed": 50,
    "height": 12,
    "weight": 186,
    "color": "red",
    "shape": "humanoid"
  },
  {
    "id": 46,
    "name": "Paras",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/46.png",
    "types": [
      "bug",
      "grass"
    ],
    "hp": 35,
    "attack": 70,
    "defense": 55,
    "speed": 25,
    "height": 3,
    "weight": 54,
    "color": "red",
    "shape": "armor"
  },
  {
    "id": 47,
    "name": "Parasect",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/47.png",
    "types": [
      "bug",
      "grass"
    ],
    "hp": 60,
    "attack": 95,
    "defense": 80,
    "speed": 30,
    "height": 10,
    "weight": 295,
    "color": "red",
    "shape": "armor"
  },
  {
    "id": 48,
    "name": "Venonat",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/48.png",
    "types": [
      "bug",
      "poison"
    ],
    "hp": 60,
    "attack": 55,
    "defense": 50,
    "speed": 45,
    "height": 10,
    "weight": 300,
    "color": "purple",
    "shape": "humanoid"
  },
  {
    "id": 49,
    "name": "Venomoth",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/49.png",
    "types": [
      "bug",
      "poison"
    ],
    "hp": 70,
    "attack": 65,
    "defense": 60,
    "speed": 90,
    "height": 15,
    "weight": 125,
    "color": "purple",
    "shape": "bug-wings"
  },
  {
    "id": 50,
    "name": "Diglett",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/50.png",
    "types": [
      "ground"
    ],
    "hp": 10,
    "attack": 55,
    "defense": 25,
    "speed": 95,
    "height": 2,
    "weight": 8,
    "color": "brown",
    "shape": "blob"
  },
  {
    "id": 51,
    "name": "Dugtrio",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/51.png",
    "types": [
      "ground"
    ],
    "hp": 35,
    "attack": 100,
    "defense": 50,
    "speed": 120,
    "height": 7,
    "weight": 333,
    "color": "brown",
    "shape": "heads"
  },
  {
    "id": 52,
    "name": "Meowth",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/52.png",
    "types": [
      "normal"
    ],
    "hp": 40,
    "attack": 45,
    "defense": 35,
    "speed": 90,
    "height": 4,
    "weight": 42,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 53,
    "name": "Persian",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/53.png",
    "types": [
      "normal"
    ],
    "hp": 65,
    "attack": 70,
    "defense": 60,
    "speed": 115,
    "height": 10,
    "weight": 320,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 54,
    "name": "Psyduck",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/54.png",
    "types": [
      "water"
    ],
    "hp": 50,
    "attack": 52,
    "defense": 48,
    "speed": 55,
    "height": 8,
    "weight": 196,
    "color": "yellow",
    "shape": "upright"
  },
  {
    "id": 55,
    "name": "Golduck",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/55.png",
    "types": [
      "water"
    ],
    "hp": 80,
    "attack": 82,
    "defense": 78,
    "speed": 85,
    "height": 17,
    "weight": 766,
    "color": "blue",
    "shape": "upright"
  },
  {
    "id": 56,
    "name": "Mankey",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/56.png",
    "types": [
      "fighting"
    ],
    "hp": 40,
    "attack": 80,
    "defense": 35,
    "speed": 70,
    "height": 5,
    "weight": 280,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 57,
    "name": "Primeape",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/57.png",
    "types": [
      "fighting"
    ],
    "hp": 65,
    "attack": 105,
    "defense": 60,
    "speed": 95,
    "height": 10,
    "weight": 320,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 58,
    "name": "Growlithe",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/58.png",
    "types": [
      "fire"
    ],
    "hp": 55,
    "attack": 70,
    "defense": 45,
    "speed": 60,
    "height": 7,
    "weight": 190,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 59,
    "name": "Arcanine",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/59.png",
    "types": [
      "fire"
    ],
    "hp": 90,
    "attack": 110,
    "defense": 80,
    "speed": 95,
    "height": 19,
    "weight": 1550,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 60,
    "name": "Poliwag",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/60.png",
    "types": [
      "water"
    ],
    "hp": 40,
    "attack": 50,
    "defense": 40,
    "speed": 90,
    "height": 6,
    "weight": 124,
    "color": "blue",
    "shape": "legs"
  },
  {
    "id": 61,
    "name": "Poliwhirl",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/61.png",
    "types": [
      "water"
    ],
    "hp": 65,
    "attack": 65,
    "defense": 65,
    "speed": 90,
    "height": 10,
    "weight": 200,
    "color": "blue",
    "shape": "humanoid"
  },
  {
    "id": 62,
    "name": "Poliwrath",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/62.png",
    "types": [
      "water",
      "fighting"
    ],
    "hp": 90,
    "attack": 95,
    "defense": 95,
    "speed": 70,
    "height": 13,
    "weight": 540,
    "color": "blue",
    "shape": "humanoid"
  },
  {
    "id": 63,
    "name": "Abra",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/63.png",
    "types": [
      "psychic"
    ],
    "hp": 25,
    "attack": 20,
    "defense": 15,
    "speed": 90,
    "height": 9,
    "weight": 195,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 64,
    "name": "Kadabra",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/64.png",
    "types": [
      "psychic"
    ],
    "hp": 40,
    "attack": 35,
    "defense": 30,
    "speed": 105,
    "height": 13,
    "weight": 565,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 65,
    "name": "Alakazam",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/65.png",
    "types": [
      "psychic"
    ],
    "hp": 55,
    "attack": 50,
    "defense": 45,
    "speed": 120,
    "height": 15,
    "weight": 480,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 66,
    "name": "Machop",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/66.png",
    "types": [
      "fighting"
    ],
    "hp": 70,
    "attack": 80,
    "defense": 50,
    "speed": 35,
    "height": 8,
    "weight": 195,
    "color": "gray",
    "shape": "upright"
  },
  {
    "id": 67,
    "name": "Machoke",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/67.png",
    "types": [
      "fighting"
    ],
    "hp": 80,
    "attack": 100,
    "defense": 70,
    "speed": 45,
    "height": 15,
    "weight": 705,
    "color": "gray",
    "shape": "humanoid"
  },
  {
    "id": 68,
    "name": "Machamp",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/68.png",
    "types": [
      "fighting"
    ],
    "hp": 90,
    "attack": 130,
    "defense": 80,
    "speed": 55,
    "height": 16,
    "weight": 1300,
    "color": "gray",
    "shape": "humanoid"
  },
  {
    "id": 69,
    "name": "Bellsprout",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/69.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 50,
    "attack": 75,
    "defense": 35,
    "speed": 40,
    "height": 7,
    "weight": 40,
    "color": "green",
    "shape": "humanoid"
  },
  {
    "id": 70,
    "name": "Weepinbell",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/70.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 65,
    "attack": 90,
    "defense": 50,
    "speed": 55,
    "height": 10,
    "weight": 64,
    "color": "green",
    "shape": "blob"
  },
  {
    "id": 71,
    "name": "Victreebel",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/71.png",
    "types": [
      "grass",
      "poison"
    ],
    "hp": 80,
    "attack": 105,
    "defense": 65,
    "speed": 70,
    "height": 17,
    "weight": 155,
    "color": "green",
    "shape": "blob"
  },
  {
    "id": 72,
    "name": "Tentacool",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/72.png",
    "types": [
      "water",
      "poison"
    ],
    "hp": 40,
    "attack": 40,
    "defense": 35,
    "speed": 70,
    "height": 9,
    "weight": 455,
    "color": "blue",
    "shape": "tentacles"
  },
  {
    "id": 73,
    "name": "Tentacruel",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/73.png",
    "types": [
      "water",
      "poison"
    ],
    "hp": 80,
    "attack": 70,
    "defense": 65,
    "speed": 100,
    "height": 16,
    "weight": 550,
    "color": "blue",
    "shape": "tentacles"
  },
  {
    "id": 74,
    "name": "Geodude",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/74.png",
    "types": [
      "rock",
      "ground"
    ],
    "hp": 40,
    "attack": 80,
    "defense": 100,
    "speed": 20,
    "height": 4,
    "weight": 200,
    "color": "brown",
    "shape": "arms"
  },
  {
    "id": 75,
    "name": "Graveler",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/75.png",
    "types": [
      "rock",
      "ground"
    ],
    "hp": 55,
    "attack": 95,
    "defense": 115,
    "speed": 35,
    "height": 10,
    "weight": 1050,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 76,
    "name": "Golem",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/76.png",
    "types": [
      "rock",
      "ground"
    ],
    "hp": 80,
    "attack": 120,
    "defense": 130,
    "speed": 45,
    "height": 14,
    "weight": 3000,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 77,
    "name": "Ponyta",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/77.png",
    "types": [
      "fire"
    ],
    "hp": 50,
    "attack": 85,
    "defense": 55,
    "speed": 90,
    "height": 10,
    "weight": 300,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 78,
    "name": "Rapidash",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/78.png",
    "types": [
      "fire"
    ],
    "hp": 65,
    "attack": 100,
    "defense": 70,
    "speed": 105,
    "height": 17,
    "weight": 950,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 79,
    "name": "Slowpoke",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/79.png",
    "types": [
      "water",
      "psychic"
    ],
    "hp": 90,
    "attack": 65,
    "defense": 65,
    "speed": 15,
    "height": 12,
    "weight": 360,
    "color": "pink",
    "shape": "quadruped"
  },
  {
    "id": 80,
    "name": "Slowbro",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/80.png",
    "types": [
      "water",
      "psychic"
    ],
    "hp": 95,
    "attack": 75,
    "defense": 110,
    "speed": 30,
    "height": 16,
    "weight": 785,
    "color": "pink",
    "shape": "upright"
  },
  {
    "id": 81,
    "name": "Magnemite",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/81.png",
    "types": [
      "electric",
      "steel"
    ],
    "hp": 25,
    "attack": 35,
    "defense": 70,
    "speed": 45,
    "height": 3,
    "weight": 60,
    "color": "gray",
    "shape": "arms"
  },
  {
    "id": 82,
    "name": "Magneton",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/82.png",
    "types": [
      "electric",
      "steel"
    ],
    "hp": 50,
    "attack": 60,
    "defense": 95,
    "speed": 70,
    "height": 10,
    "weight": 600,
    "color": "gray",
    "shape": "heads"
  },
  {
    "id": 83,
    "name": "Farfetch’d",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/83.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 52,
    "attack": 90,
    "defense": 55,
    "speed": 60,
    "height": 8,
    "weight": 150,
    "color": "brown",
    "shape": "wings"
  },
  {
    "id": 84,
    "name": "Doduo",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/84.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 35,
    "attack": 85,
    "defense": 45,
    "speed": 75,
    "height": 14,
    "weight": 392,
    "color": "brown",
    "shape": "legs"
  },
  {
    "id": 85,
    "name": "Dodrio",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/85.png",
    "types": [
      "normal",
      "flying"
    ],
    "hp": 60,
    "attack": 110,
    "defense": 70,
    "speed": 110,
    "height": 18,
    "weight": 852,
    "color": "brown",
    "shape": "legs"
  },
  {
    "id": 86,
    "name": "Seel",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/86.png",
    "types": [
      "water"
    ],
    "hp": 65,
    "attack": 45,
    "defense": 55,
    "speed": 45,
    "height": 11,
    "weight": 900,
    "color": "white",
    "shape": "fish"
  },
  {
    "id": 87,
    "name": "Dewgong",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/87.png",
    "types": [
      "water",
      "ice"
    ],
    "hp": 90,
    "attack": 70,
    "defense": 80,
    "speed": 70,
    "height": 17,
    "weight": 1200,
    "color": "white",
    "shape": "fish"
  },
  {
    "id": 88,
    "name": "Grimer",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/88.png",
    "types": [
      "poison"
    ],
    "hp": 80,
    "attack": 80,
    "defense": 50,
    "speed": 25,
    "height": 9,
    "weight": 300,
    "color": "purple",
    "shape": "arms"
  },
  {
    "id": 89,
    "name": "Muk",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/89.png",
    "types": [
      "poison"
    ],
    "hp": 105,
    "attack": 105,
    "defense": 75,
    "speed": 50,
    "height": 12,
    "weight": 300,
    "color": "purple",
    "shape": "arms"
  },
  {
    "id": 90,
    "name": "Shellder",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/90.png",
    "types": [
      "water"
    ],
    "hp": 30,
    "attack": 65,
    "defense": 100,
    "speed": 40,
    "height": 3,
    "weight": 40,
    "color": "purple",
    "shape": "ball"
  },
  {
    "id": 91,
    "name": "Cloyster",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/91.png",
    "types": [
      "water",
      "ice"
    ],
    "hp": 50,
    "attack": 95,
    "defense": 180,
    "speed": 70,
    "height": 15,
    "weight": 1325,
    "color": "purple",
    "shape": "ball"
  },
  {
    "id": 92,
    "name": "Gastly",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/92.png",
    "types": [
      "ghost",
      "poison"
    ],
    "hp": 30,
    "attack": 35,
    "defense": 30,
    "speed": 80,
    "height": 13,
    "weight": 1,
    "color": "purple",
    "shape": "ball"
  },
  {
    "id": 93,
    "name": "Haunter",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/93.png",
    "types": [
      "ghost",
      "poison"
    ],
    "hp": 45,
    "attack": 50,
    "defense": 45,
    "speed": 95,
    "height": 16,
    "weight": 1,
    "color": "purple",
    "shape": "arms"
  },
  {
    "id": 94,
    "name": "Gengar",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/94.png",
    "types": [
      "ghost",
      "poison"
    ],
    "hp": 60,
    "attack": 65,
    "defense": 60,
    "speed": 110,
    "height": 15,
    "weight": 405,
    "color": "purple",
    "shape": "upright"
  },
  {
    "id": 95,
    "name": "Onix",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/95.png",
    "types": [
      "rock",
      "ground"
    ],
    "hp": 35,
    "attack": 45,
    "defense": 160,
    "speed": 70,
    "height": 88,
    "weight": 2100,
    "color": "gray",
    "shape": "squiggle"
  },
  {
    "id": 96,
    "name": "Drowzee",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/96.png",
    "types": [
      "psychic"
    ],
    "hp": 60,
    "attack": 48,
    "defense": 45,
    "speed": 42,
    "height": 10,
    "weight": 324,
    "color": "yellow",
    "shape": "humanoid"
  },
  {
    "id": 97,
    "name": "Hypno",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/97.png",
    "types": [
      "psychic"
    ],
    "hp": 85,
    "attack": 73,
    "defense": 70,
    "speed": 67,
    "height": 16,
    "weight": 756,
    "color": "yellow",
    "shape": "humanoid"
  },
  {
    "id": 98,
    "name": "Krabby",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/98.png",
    "types": [
      "water"
    ],
    "hp": 30,
    "attack": 105,
    "defense": 90,
    "speed": 50,
    "height": 4,
    "weight": 65,
    "color": "red",
    "shape": "armor"
  },
  {
    "id": 99,
    "name": "Kingler",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/99.png",
    "types": [
      "water"
    ],
    "hp": 55,
    "attack": 130,
    "defense": 115,
    "speed": 75,
    "height": 13,
    "weight": 600,
    "color": "red",
    "shape": "armor"
  },
  {
    "id": 100,
    "name": "Voltorb",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/100.png",
    "types": [
      "electric"
    ],
    "hp": 40,
    "attack": 30,
    "defense": 50,
    "speed": 100,
    "height": 5,
    "weight": 104,
    "color": "red",
    "shape": "ball"
  },
  {
    "id": 101,
    "name": "Electrode",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/101.png",
    "types": [
      "electric"
    ],
    "hp": 60,
    "attack": 50,
    "defense": 70,
    "speed": 150,
    "height": 12,
    "weight": 666,
    "color": "red",
    "shape": "ball"
  },
  {
    "id": 102,
    "name": "Exeggcute",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/102.png",
    "types": [
      "grass",
      "psychic"
    ],
    "hp": 60,
    "attack": 40,
    "defense": 80,
    "speed": 40,
    "height": 4,
    "weight": 25,
    "color": "pink",
    "shape": "heads"
  },
  {
    "id": 103,
    "name": "Exeggutor",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/103.png",
    "types": [
      "grass",
      "psychic"
    ],
    "hp": 95,
    "attack": 95,
    "defense": 85,
    "speed": 55,
    "height": 20,
    "weight": 1200,
    "color": "yellow",
    "shape": "legs"
  },
  {
    "id": 104,
    "name": "Cubone",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/104.png",
    "types": [
      "ground"
    ],
    "hp": 50,
    "attack": 50,
    "defense": 95,
    "speed": 35,
    "height": 4,
    "weight": 65,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 105,
    "name": "Marowak",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/105.png",
    "types": [
      "ground"
    ],
    "hp": 60,
    "attack": 80,
    "defense": 110,
    "speed": 45,
    "height": 10,
    "weight": 450,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 106,
    "name": "Hitmonlee",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/106.png",
    "types": [
      "fighting"
    ],
    "hp": 50,
    "attack": 120,
    "defense": 53,
    "speed": 87,
    "height": 15,
    "weight": 498,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 107,
    "name": "Hitmonchan",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/107.png",
    "types": [
      "fighting"
    ],
    "hp": 50,
    "attack": 105,
    "defense": 79,
    "speed": 76,
    "height": 14,
    "weight": 502,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 108,
    "name": "Lickitung",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/108.png",
    "types": [
      "normal"
    ],
    "hp": 90,
    "attack": 55,
    "defense": 75,
    "speed": 30,
    "height": 12,
    "weight": 655,
    "color": "pink",
    "shape": "upright"
  },
  {
    "id": 109,
    "name": "Koffing",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/109.png",
    "types": [
      "poison"
    ],
    "hp": 40,
    "attack": 65,
    "defense": 95,
    "speed": 35,
    "height": 6,
    "weight": 10,
    "color": "purple",
    "shape": "ball"
  },
  {
    "id": 110,
    "name": "Weezing",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/110.png",
    "types": [
      "poison"
    ],
    "hp": 65,
    "attack": 90,
    "defense": 120,
    "speed": 60,
    "height": 12,
    "weight": 95,
    "color": "purple",
    "shape": "heads"
  },
  {
    "id": 111,
    "name": "Rhyhorn",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/111.png",
    "types": [
      "ground",
      "rock"
    ],
    "hp": 80,
    "attack": 85,
    "defense": 95,
    "speed": 25,
    "height": 10,
    "weight": 1150,
    "color": "gray",
    "shape": "quadruped"
  },
  {
    "id": 112,
    "name": "Rhydon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/112.png",
    "types": [
      "ground",
      "rock"
    ],
    "hp": 105,
    "attack": 130,
    "defense": 120,
    "speed": 40,
    "height": 19,
    "weight": 1200,
    "color": "gray",
    "shape": "upright"
  },
  {
    "id": 113,
    "name": "Chansey",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/113.png",
    "types": [
      "normal"
    ],
    "hp": 250,
    "attack": 5,
    "defense": 5,
    "speed": 50,
    "height": 11,
    "weight": 346,
    "color": "pink",
    "shape": "upright"
  },
  {
    "id": 114,
    "name": "Tangela",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/114.png",
    "types": [
      "grass"
    ],
    "hp": 65,
    "attack": 55,
    "defense": 115,
    "speed": 60,
    "height": 10,
    "weight": 350,
    "color": "blue",
    "shape": "legs"
  },
  {
    "id": 115,
    "name": "Kangaskhan",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/115.png",
    "types": [
      "normal"
    ],
    "hp": 105,
    "attack": 95,
    "defense": 80,
    "speed": 90,
    "height": 22,
    "weight": 800,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 116,
    "name": "Horsea",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/116.png",
    "types": [
      "water"
    ],
    "hp": 30,
    "attack": 40,
    "defense": 70,
    "speed": 60,
    "height": 4,
    "weight": 80,
    "color": "blue",
    "shape": "blob"
  },
  {
    "id": 117,
    "name": "Seadra",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/117.png",
    "types": [
      "water"
    ],
    "hp": 55,
    "attack": 65,
    "defense": 95,
    "speed": 85,
    "height": 12,
    "weight": 250,
    "color": "blue",
    "shape": "blob"
  },
  {
    "id": 118,
    "name": "Goldeen",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/118.png",
    "types": [
      "water"
    ],
    "hp": 45,
    "attack": 67,
    "defense": 60,
    "speed": 63,
    "height": 6,
    "weight": 150,
    "color": "red",
    "shape": "fish"
  },
  {
    "id": 119,
    "name": "Seaking",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/119.png",
    "types": [
      "water"
    ],
    "hp": 80,
    "attack": 92,
    "defense": 65,
    "speed": 68,
    "height": 13,
    "weight": 390,
    "color": "red",
    "shape": "fish"
  },
  {
    "id": 120,
    "name": "Staryu",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/120.png",
    "types": [
      "water"
    ],
    "hp": 30,
    "attack": 45,
    "defense": 55,
    "speed": 85,
    "height": 8,
    "weight": 345,
    "color": "brown",
    "shape": "blob"
  },
  {
    "id": 121,
    "name": "Starmie",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/121.png",
    "types": [
      "water",
      "psychic"
    ],
    "hp": 60,
    "attack": 75,
    "defense": 85,
    "speed": 115,
    "height": 11,
    "weight": 800,
    "color": "purple",
    "shape": "blob"
  },
  {
    "id": 122,
    "name": "Mr. Mime",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/122.png",
    "types": [
      "psychic",
      "fairy"
    ],
    "hp": 40,
    "attack": 45,
    "defense": 65,
    "speed": 90,
    "height": 13,
    "weight": 545,
    "color": "pink",
    "shape": "humanoid"
  },
  {
    "id": 123,
    "name": "Scyther",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/123.png",
    "types": [
      "bug",
      "flying"
    ],
    "hp": 70,
    "attack": 110,
    "defense": 80,
    "speed": 105,
    "height": 15,
    "weight": 560,
    "color": "green",
    "shape": "bug-wings"
  },
  {
    "id": 124,
    "name": "Jynx",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/124.png",
    "types": [
      "ice",
      "psychic"
    ],
    "hp": 65,
    "attack": 50,
    "defense": 35,
    "speed": 95,
    "height": 14,
    "weight": 406,
    "color": "red",
    "shape": "humanoid"
  },
  {
    "id": 125,
    "name": "Electabuzz",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/125.png",
    "types": [
      "electric"
    ],
    "hp": 65,
    "attack": 83,
    "defense": 57,
    "speed": 105,
    "height": 11,
    "weight": 300,
    "color": "yellow",
    "shape": "upright"
  },
  {
    "id": 126,
    "name": "Magmar",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/126.png",
    "types": [
      "fire"
    ],
    "hp": 65,
    "attack": 95,
    "defense": 57,
    "speed": 93,
    "height": 13,
    "weight": 445,
    "color": "red",
    "shape": "upright"
  },
  {
    "id": 127,
    "name": "Pinsir",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/127.png",
    "types": [
      "bug"
    ],
    "hp": 65,
    "attack": 125,
    "defense": 100,
    "speed": 85,
    "height": 15,
    "weight": 550,
    "color": "brown",
    "shape": "humanoid"
  },
  {
    "id": 128,
    "name": "Tauros",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/128.png",
    "types": [
      "normal"
    ],
    "hp": 75,
    "attack": 100,
    "defense": 95,
    "speed": 110,
    "height": 14,
    "weight": 884,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 129,
    "name": "Magikarp",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/129.png",
    "types": [
      "water"
    ],
    "hp": 20,
    "attack": 10,
    "defense": 55,
    "speed": 80,
    "height": 9,
    "weight": 100,
    "color": "red",
    "shape": "fish"
  },
  {
    "id": 130,
    "name": "Gyarados",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/130.png",
    "types": [
      "water",
      "flying"
    ],
    "hp": 95,
    "attack": 125,
    "defense": 79,
    "speed": 81,
    "height": 65,
    "weight": 2350,
    "color": "blue",
    "shape": "squiggle"
  },
  {
    "id": 131,
    "name": "Lapras",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/131.png",
    "types": [
      "water",
      "ice"
    ],
    "hp": 130,
    "attack": 85,
    "defense": 80,
    "speed": 60,
    "height": 25,
    "weight": 2200,
    "color": "blue",
    "shape": "fish"
  },
  {
    "id": 132,
    "name": "Ditto",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/132.png",
    "types": [
      "normal"
    ],
    "hp": 48,
    "attack": 48,
    "defense": 48,
    "speed": 48,
    "height": 3,
    "weight": 40,
    "color": "purple",
    "shape": "ball"
  },
  {
    "id": 133,
    "name": "Eevee",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/133.png",
    "types": [
      "normal"
    ],
    "hp": 55,
    "attack": 55,
    "defense": 50,
    "speed": 55,
    "height": 3,
    "weight": 65,
    "color": "brown",
    "shape": "quadruped"
  },
  {
    "id": 134,
    "name": "Vaporeon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/134.png",
    "types": [
      "water"
    ],
    "hp": 130,
    "attack": 65,
    "defense": 60,
    "speed": 65,
    "height": 10,
    "weight": 290,
    "color": "blue",
    "shape": "quadruped"
  },
  {
    "id": 135,
    "name": "Jolteon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/135.png",
    "types": [
      "electric"
    ],
    "hp": 65,
    "attack": 65,
    "defense": 60,
    "speed": 130,
    "height": 8,
    "weight": 245,
    "color": "yellow",
    "shape": "quadruped"
  },
  {
    "id": 136,
    "name": "Flareon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/136.png",
    "types": [
      "fire"
    ],
    "hp": 65,
    "attack": 130,
    "defense": 60,
    "speed": 65,
    "height": 9,
    "weight": 250,
    "color": "red",
    "shape": "quadruped"
  },
  {
    "id": 137,
    "name": "Porygon",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/137.png",
    "types": [
      "normal"
    ],
    "hp": 65,
    "attack": 60,
    "defense": 70,
    "speed": 40,
    "height": 8,
    "weight": 365,
    "color": "pink",
    "shape": "legs"
  },
  {
    "id": 138,
    "name": "Omanyte",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/138.png",
    "types": [
      "rock",
      "water"
    ],
    "hp": 35,
    "attack": 40,
    "defense": 100,
    "speed": 35,
    "height": 4,
    "weight": 75,
    "color": "blue",
    "shape": "tentacles"
  },
  {
    "id": 139,
    "name": "Omastar",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/139.png",
    "types": [
      "rock",
      "water"
    ],
    "hp": 70,
    "attack": 60,
    "defense": 125,
    "speed": 55,
    "height": 10,
    "weight": 350,
    "color": "blue",
    "shape": "tentacles"
  },
  {
    "id": 140,
    "name": "Kabuto",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/140.png",
    "types": [
      "rock",
      "water"
    ],
    "hp": 30,
    "attack": 80,
    "defense": 90,
    "speed": 55,
    "height": 5,
    "weight": 115,
    "color": "brown",
    "shape": "armor"
  },
  {
    "id": 141,
    "name": "Kabutops",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/141.png",
    "types": [
      "rock",
      "water"
    ],
    "hp": 60,
    "attack": 115,
    "defense": 105,
    "speed": 80,
    "height": 13,
    "weight": 405,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 142,
    "name": "Aerodactyl",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/142.png",
    "types": [
      "rock",
      "flying"
    ],
    "hp": 80,
    "attack": 105,
    "defense": 65,
    "speed": 130,
    "height": 18,
    "weight": 590,
    "color": "purple",
    "shape": "wings"
  },
  {
    "id": 143,
    "name": "Snorlax",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/143.png",
    "types": [
      "normal"
    ],
    "hp": 160,
    "attack": 110,
    "defense": 65,
    "speed": 30,
    "height": 21,
    "weight": 4600,
    "color": "black",
    "shape": "humanoid"
  },
  {
    "id": 144,
    "name": "Articuno",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/144.png",
    "types": [
      "ice",
      "flying"
    ],
    "hp": 90,
    "attack": 85,
    "defense": 100,
    "speed": 85,
    "height": 17,
    "weight": 554,
    "color": "blue",
    "shape": "wings"
  },
  {
    "id": 145,
    "name": "Zapdos",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/145.png",
    "types": [
      "electric",
      "flying"
    ],
    "hp": 90,
    "attack": 90,
    "defense": 85,
    "speed": 100,
    "height": 16,
    "weight": 526,
    "color": "yellow",
    "shape": "wings"
  },
  {
    "id": 146,
    "name": "Moltres",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/146.png",
    "types": [
      "fire",
      "flying"
    ],
    "hp": 90,
    "attack": 100,
    "defense": 90,
    "speed": 90,
    "height": 20,
    "weight": 600,
    "color": "yellow",
    "shape": "wings"
  },
  {
    "id": 147,
    "name": "Dratini",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/147.png",
    "types": [
      "dragon"
    ],
    "hp": 41,
    "attack": 64,
    "defense": 45,
    "speed": 50,
    "height": 18,
    "weight": 33,
    "color": "blue",
    "shape": "squiggle"
  },
  {
    "id": 148,
    "name": "Dragonair",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/148.png",
    "types": [
      "dragon"
    ],
    "hp": 61,
    "attack": 84,
    "defense": 65,
    "speed": 70,
    "height": 40,
    "weight": 165,
    "color": "blue",
    "shape": "squiggle"
  },
  {
    "id": 149,
    "name": "Dragonite",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/149.png",
    "types": [
      "dragon",
      "flying"
    ],
    "hp": 91,
    "attack": 134,
    "defense": 95,
    "speed": 80,
    "height": 22,
    "weight": 2100,
    "color": "brown",
    "shape": "upright"
  },
  {
    "id": 150,
    "name": "Mewtwo",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/150.png",
    "types": [
      "psychic"
    ],
    "hp": 106,
    "attack": 110,
    "defense": 90,
    "speed": 130,
    "height": 20,
    "weight": 1220,
    "color": "purple",
    "shape": "upright"
  },
  {
    "id": 151,
    "name": "Mew",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/c10459b9b0129eaca5c5d9b1cac65336debb1d08/sprites/pokemon/other/official-artwork/151.png",
    "types": [
      "psychic"
    ],
    "hp": 100,
    "attack": 100,
    "defense": 100,
    "speed": 100,
    "height": 4,
    "weight": 40,
    "color": "pink",
    "shape": "upright"
  }
];

export const POKEMON_SNAPSHOT = Object.freeze(POKEMON_RECORDS.map(function (pokemon) {
  return Object.freeze({ ...pokemon, types: Object.freeze(pokemon.types.slice()) });
}));
