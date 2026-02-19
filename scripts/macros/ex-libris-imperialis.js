// ============================================================
//   EX LIBRIS IMPERIALIS
//   Liber Fanatica III/IV
//   ============================================================ */

// ---------------- RNG & Dice ----------------
/**
 * Roll a single die with n faces.
 * @param {number} n
 * @returns {Promise<number>}
 */
async function d(n) {
  return await xd(1, n);
}

/**
 * Roll x dice with n faces, using Foundry Roll when available.
 * @param {number} x
 * @param {number} n
 * @returns {Promise<number>}
 */
async function xd(x, n) {
  try {
    let roll = await new Roll(`${x}d${n}`).roll({allowInteractive: false});
    return roll.total;
  } catch {
    let total = 0;
    for (let i = 0; i < x; i++) {
      total += Math.floor(Math.random() * n) + 1;
    }
    return total;
  }
}

/**
 * @template T
 * @param {TableEntry<T>[]} table
 * @param {number} [modifier=0]
 * @param {number} [dice=100]
 * @returns {Promise<T & { roll: number }>} **/

/**
 * @param {Array} table
 * @param {number} [modifier=0]
 * @param {number} [dice=100]
 * @param {(result: any) => boolean} [checkFn]
 * @param {number} [maxTries=20]
 */
async function rollFromTable(table, modifier = 0, dice = 100, checkFn = null, maxTries = 1000) {
  let lastResult = null;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    let roll = await d(dice);
    roll += modifier;

    const tableMin = Math.min(...table.map((e) => e.min));
    const tableMax = Math.max(...table.map((e) => e.max));

    let entry;
    if (roll < tableMin) {
      entry = table.find((e) => e.min === tableMin);
    } else if (roll > tableMax) {
      entry = table.find((e) => e.max === tableMax);
    } else {
      entry = table.find((e) => roll >= e.min && roll <= e.max);
    }
    if (!entry) throw new Error(`No table entry for roll ${roll}`);

    const {min, max, data, ...meta} = entry;
    const result = {
      roll,
      ...meta,
      ...(await data(roll))
    };

    lastResult = result;

    if (!checkFn || checkFn(result)) {
      return result;
    }
  }
  console.error(`Max tries exceeded in ${table}, returning last result`);
  return lastResult;
}

/**
 * Convert a word to a simple plural form.
 * @param {string} word
 * @returns {string}
 */
function pluralize(word) {
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s")) return word + "es";
  return word + "s";
}

/**
 * Create a deep clone of arrays and plain objects.
 * @param {*} value
 * @returns {*}
 */
function clone(value) {
  if (Array.isArray(value)) return value.map((v) => clone(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const k in value) out[k] = clone(value[k]);
    return out;
  }
  return value;
}

/**
 * @template T
 * @typedef {Object} TableEntry
 * @property {number} min
 * @property {number} max
 * @property {(roll:number)=>Promise<T & Partial<Record<string, any>>>} data
 */

// ---------------- Data Tables ---------------- //
/** @type {TableEntry<{ value: string }>[] } */
const CLASSIFICATION_TABLE = [
  {min: 1, max: 25, data: async () => ({value: "Biography"})},
  {min: 26, max: 30, data: async () => ({value: "Bestiary"})},
  {min: 31, max: 50, data: async () => ({value: "Cook Book"})},
  {min: 51, max: 60, data: async () => ({value: "Fiction"})},
  {min: 61, max: 70, data: async () => ({value: "Guidebook"})},
  {min: 71, max: 90, data: async () => ({value: "Religious Doctrine"})},
  {min: 91, max: 98, data: async () => ({value: "Scholarship"})},
  {min: 99, max: 100, data: async () => ({value: "Forbidden"})}
];

/** @type {TableEntry<{ name: string, valueMod: number }>[] } */
const QUALITY_TABLE = [
  {min: 1, max: 3, data: async () => ({name: "Best", valueMod: +900})},
  {min: 4, max: 10, data: async () => ({name: "Good", valueMod: +200})},
  {min: 11, max: 80, data: async () => ({name: "Common", valueMod: 0})},
  {min: 81, max: 100, data: async () => ({name: "Poor", valueMod: -25})}
];

const BOOK_TYPE_PRINTED = {type: "Printed", baseValue: 1};
const BOOK_TYPE_ILLUMINATED = {type: "Illuminated", baseValue: 3};
const BOOK_TYPE_ILLUSTRATED = {type: "Illustrated", baseValue: 2};

/** @type {TableEntry<{ type: string, enc: number, baseValue: number }>[] } */
const BOOK_TYPE_TABLE = [
  {min: 1, max: 30, data: async () => BOOK_TYPE_PRINTED},
  {min: 31, max: 90, data: async () => BOOK_TYPE_ILLUMINATED},
  {min: 91, max: 100, data: async () => BOOK_TYPE_ILLUSTRATED}
];

/**
 * @typedef {Object} BookAge
 * @property {string} label
 * @property {number} condMod
 * @property {string} age
 */
/** @type {TableEntry<BookAge>[] } */
const AGE_TABLE = [
  {min: 1, max: 10, data: async () => ({label: "New", condMod: -10, age: await d(10), unit: "month(s)"})},
  {min: 11, max: 60, data: async () => ({label: "Contemporary", condMod: 0, age: await d(10), unit: "year(s)"})},
  {min: 61, max: 95, data: async () => ({label: "Recent", condMod: +10, age: (await d(10)) * 5, unit: "year(s)"})},
  {min: 96, max: 99, data: async () => ({label: "Old", condMod: +20, age: (await d(10)) * 25, unit: "year(s)"})},
  {min: 100, max: 100, data: async () => ({label: "Ancient", condMod: +30, age: (await d(10)) * 100, unit: "year(s)"})}
];

/**
 * @typedef {Object} BookCondition
 * @property {string} label
 * @property {number} valueMod
 * @property {boolean} [oddSmell]
 * @property {boolean} [notes]
 * @property {number}  [missingPages]
 * @property {string}  [illegible]
 * @property {boolean} [spineBroken]
 * @property {boolean} [missingCover]
 */
/** @type {TableEntry<BookCondition>[] } */
const CONDITION_TABLE = [
  {min: 1, max: 19, data: async () => ({label: "Mint", valueMod: +100})},
  {min: 20, max: 70, data: async (roll) => ({label: "Used", oddSmell: roll === 22, notes: roll === 33, valueMod: 0})},
  {min: 71, max: 80, data: async (roll) => ({label: "Poor", missingPages: roll === 77 ? await d(10) : 0, valueMod: -50})},
  {
    min: 81,
    max: 100,
    data: async (roll) => ({
      label: "Crumbled",
      illegible: `${await d(100)}`,
      spineBroken: roll === 88,
      missingPages: roll === 99 ? await xd(3, 10) : 0,
      missingCover: roll === 100,
      valueMod: -90
    })
  }
];

/** @type {TableEntry<{ name: string, valueMod: number }>[] } */
const LANGUAGE_TABLE = [
  {min: 1, max: 2, data: async () => ({name: "Breton", code: "Bretoński", valueMod: 0})},
  {min: 3, max: 3, data: async () => ({name: "Estalian", code: "Estalijski", valueMod: 0})},
  {min: 4, max: 4, data: async () => ({name: "Kislevian", code: "Hospodarnyj", valueMod: 0})},
  {min: 5, max: 5, data: async () => ({name: "Tilean", code: "Tileański", valueMod: 0})},
  {min: 6, max: 6, data: async () => ({name: "Norse", code: "Norsmeński", valueMod: 0})},
  {min: 7, max: 7, data: async () => ({name: "Classical", code: "Klasyczny", valueMod: 50})},
  {min: 8, max: 8, data: async () => ({name: "Khazalid", code: "Khazalid", valueMod: 100})},
  {min: 9, max: 9, data: async () => ({name: "Elthárin", code: "Elthárin", valueMod: 100})},
  {min: 10, max: 10, data: async () => ({name: "Other", code: "???", valueMod: 200})},
  {
    min: 11,
    max: 100,
    data: async (roll) => ({
      name: roll % 11 === 0 || roll === 100 ? `Reikspiel (${(await rollFromTable(LANGUAGE_TABLE, 0, 10)).name})` : `Reikspiel`,
      code: "Reikspiel",
      valueMod: 0
    })
  }
];

/**
 * @typedef {Object} NotableFeature
 * @property {string} description
 * @property {number} [encumbranceMultiplier]
 * @property {boolean} [locked]
 * @property {boolean} [combine]
 */
/** @type {TableEntry<NotableFeature>[] } */
const NOTABLE_FEATURES_TABLE = [
  {min: 1, max: 5, data: async () => ({visible: "Lengthy foreword or dedication"})},
  {min: 6, max: 10, data: async () => ({visible: "Starts with a prayer to appropriate deity"})},
  {min: 11, max: 15, data: async () => ({visible: "First page has a portrait of the author"})},
  {min: 16, max: 20, data: async () => ({hidden: "Book unfinished, ends abruptly after three-quarters"})},
  {min: 21, max: 25, data: async () => ({visible: `Contains ${await xd(1, 10)} magnificent pictures`})},
  {min: 26, max: 30, data: async () => ({hidden: "Title does not match content"})},
  {min: 31, max: 35, data: async () => ({visible: `Part of a series of ${await xd(2, 10)} volumes`})},
  {min: 36, max: 40, data: async () => ({visible: "Bound in ornate leather"})},
  {min: 41, max: 45, data: async () => ({visible: "Colourful first page"})},
  {min: 46, max: 50, data: async () => ({visible: "Binding is plain and unadorned"})},
  {min: 51, max: 55, data: async () => ({visible: "Very ornate lettering throughout"})},
  {min: 56, max: 60, data: async () => ({visible: "Metal hinges and clasps", encMult: 2})},
  {
    min: 61,
    max: 65,
    data: async () => [
      {visible: "Metal hinges and clasps", encMult: 2},
      {visible: "Book is locked", locked: true}
    ]
  },
  {min: 66, max: 70, data: async () => ({visible: "Bound in heavy wooden frames", encMult: 2})},
  {min: 71, max: 75, data: async () => ({visible: "The book’s pages smell funky"})},
  {min: 76, max: 80, data: async () => ({visible: "Title embossed in large letters on cover"})},
  {min: 81, max: 85, data: async () => ({visible: "No binding – pages are in a box or cloth"})},
  {min: 86, max: 90, data: async () => ({visible: "Richly decorated pages"})},
  {min: 91, max: 95, data: async () => ({visible: "Something is found between two pages"})},
  {
    min: 96,
    max: 100,
    data: async () => [await rollFromTable(NOTABLE_FEATURES_TABLE, 0, 95), await rollFromTable(NOTABLE_FEATURES_TABLE, 0, 95)]
  }
];

/**
 * @typedef {Object} PenmanshipPeculiarity
 * @property {string} description
 * @property {number} [rwModifier]
 * @property {boolean} [combine]
 */
/** @type {TableEntry<PenmanshipPeculiarity>[] } */
const PENMANSHIP_PECULIARITIES_TABLE = [
  {min: 1, max: 25, data: async () => ({})},
  {min: 26, max: 30, data: async () => ({hidden: "Tone of author is haughty and authoritative"})},
  {min: 31, max: 35, data: async () => ({hidden: "Constant misuses of words and idioms"})},
  {min: 36, max: 40, data: async () => ({hidden: "Obviously not written in the author’s mother tongue"})},
  {min: 41, max: 45, data: async () => ({hidden: "Horrible spelling"})},
  {min: 46, max: 50, data: async () => ({hidden: "Synthetically archaic grammar, wording and spelling"})},
  {min: 51, max: 55, data: async () => ({hidden: "Simple, straightforward and unadorned language", rwModifier: +20})},
  {min: 56, max: 60, data: async () => ({hidden: "Unnecessarily convoluted grammar and vocabulary", rwModifier: -10})},
  {min: 61, max: 65, data: async () => ({hidden: "Text shows evidence of being the work of more than one author"})},
  {min: 66, max: 70, data: async () => ({hidden: "Book is a compilation or anthology (author = editor)"})},
  {min: 71, max: 75, data: async () => ({hidden: "Language is cryptic and archaic", rwModifier: -10})},
  {min: 76, max: 80, data: async () => ({hidden: "The dialect or social standing of the author is very obvious from the text"})},
  {min: 81, max: 85, data: async () => ({hidden: "Interesting notes are scribbled here and there throughout the book"})},
  {min: 86, max: 90, data: async () => ({hidden: "Lettering or handwriting is exceptionally ornate", rwModifier: -10})},
  {
    min: 91,
    max: 100,
    data: async () => [await rollFromTable(PENMANSHIP_PECULIARITIES_TABLE, 0, 90), await rollFromTable(PENMANSHIP_PECULIARITIES_TABLE, 0, 90)]
  }
];

/**
 * @typedef {Object} Origin
 * @property {string} name
 */
/** @type {TableEntry<Origin>[] } */
const ORIGIN_TABLE = [
  {min: 1, max: 25, data: async () => ({name: "Empire"})},
  {min: 26, max: 28, data: async () => ({name: "Averland"})},
  {min: 29, max: 31, data: async () => ({name: "Hochland"})},
  {min: 32, max: 34, data: async () => ({name: "Middenland"})},
  {min: 35, max: 36, data: async () => ({name: "Nordland"})},
  {min: 37, max: 38, data: async () => ({name: "Ostermark"})},
  {min: 39, max: 40, data: async () => ({name: "Ostland"})},
  {min: 41, max: 44, data: async () => ({name: "Reikland"})},
  {min: 45, max: 48, data: async () => ({name: "Stirland"})},
  {min: 49, max: 53, data: async () => ({name: "Talabecland"})},
  {min: 54, max: 56, data: async () => ({name: "Wissenland"})},
  {min: 57, max: 57, data: async () => ({name: "Sylvania"})},
  {min: 58, max: 59, data: async () => ({name: "The Moot"})},
  {min: 60, max: 64, data: async () => ({name: "Altdorf"})},
  {min: 65, max: 68, data: async () => ({name: "Nuln"})},
  {min: 69, max: 72, data: async () => ({name: "Middenheim"})},
  {min: 73, max: 76, data: async () => ({name: "Marienburg"})},
  {min: 77, max: 80, data: async () => ({name: "Bretonnia"})},
  {min: 81, max: 81, data: async () => ({name: "Border Princes"})},
  {min: 82, max: 82, data: async () => ({name: "Estalia"})},
  {min: 83, max: 84, data: async () => ({name: "Kislev"})},
  {min: 85, max: 86, data: async () => ({name: "Norsca"})},
  {min: 87, max: 88, data: async () => ({name: "Tilea"})},
  {min: 89, max: 89, data: async () => ({name: "Wasteland"})},
  {min: 90, max: 90, data: async () => ({name: "Grey Mountains"})},
  {min: 91, max: 91, data: async () => ({name: "Black Mountains"})},
  {min: 92, max: 92, data: async () => ({name: "The Vaults"})},
  {min: 93, max: 93, data: async () => ({name: "World’s Edge Mountains"})},
  {min: 94, max: 94, data: async () => ({name: "Middle Mountains"})},
  {min: 95, max: 95, data: async () => ({name: "The River Reik"})},
  {min: 96, max: 96, data: async () => ({name: "The River Soll"})},
  {min: 97, max: 97, data: async () => ({name: "The River Talabec"})},
  {min: 98, max: 98, data: async () => ({name: "The River Stir"})},
  {min: 99, max: 99, data: async () => ({name: "Drakwald"})},
  {min: 100, max: 100, data: async () => ({name: "Great Forest"})}
];

/**
 * @typedef {Object} Career
 * @property {string} name
 */
/** @type {TableEntry<Career>[] } */
const BASIC_CAREERS = [
  {min: 1, max: 2, data: async () => ({name: "Agitator"})},
  {min: 3, max: 4, data: async () => ({name: "Apprentice Wizard"})},
  {min: 5, max: 5, data: async () => ({name: "Bailiff"})},
  {min: 6, max: 6, data: async () => ({name: "Barber-Surgeon"})},
  {min: 7, max: 8, data: async () => ({name: "Boatman"})},
  {min: 9, max: 10, data: async () => ({name: "Bodyguard"})},
  {min: 11, max: 12, data: async () => ({name: "Bone Picker"})},
  {min: 13, max: 14, data: async () => ({name: "Bounty Hunter"})},
  {min: 15, max: 16, data: async () => ({name: "Burglar"})},
  {min: 17, max: 18, data: async () => ({name: "Camp Follower"})},
  {min: 19, max: 20, data: async () => ({name: "Charcoal-Burner"})},
  {min: 21, max: 22, data: async () => ({name: "Coachman"})},
  {min: 23, max: 24, data: async () => ({name: "Entertainer"})},
  {min: 25, max: 25, data: async () => ({name: "Envoy"})},
  {min: 26, max: 26, data: async () => ({name: "Estalian Diestro"})},
  {min: 27, max: 28, data: async () => ({name: "Ferryman"})},
  {min: 29, max: 30, data: async () => ({name: "Grave Robber"})},
  {min: 31, max: 31, data: async () => ({name: "Hedge Wizard"})},
  {min: 32, max: 33, data: async () => ({name: "Hunter"})},
  {min: 34, max: 35, data: async () => ({name: "Initiate"})},
  {min: 36, max: 36, data: async () => ({name: "Jailer"})},
  {min: 37, max: 37, data: async () => ({name: "Kislevite Kossar"})},
  {min: 38, max: 39, data: async () => ({name: "Marine"})},
  {min: 40, max: 41, data: async () => ({name: "Mercenary"})},
  {min: 42, max: 43, data: async () => ({name: "Messenger"})},
  {min: 44, max: 45, data: async () => ({name: "Militiaman"})},
  {min: 46, max: 47, data: async () => ({name: "Miner"})},
  {min: 48, max: 49, data: async () => ({name: "Noble"})},
  {min: 50, max: 50, data: async () => ({name: "Norse Berserker"})},
  {min: 51, max: 52, data: async () => ({name: "Outlaw"})},
  {min: 53, max: 54, data: async () => ({name: "Outrider"})},
  {min: 55, max: 56, data: async () => ({name: "Peasant"})},
  {min: 57, max: 58, data: async () => ({name: "Pit Fighter"})},
  {min: 59, max: 60, data: async () => ({name: "Protagonist"})},
  {min: 61, max: 62, data: async () => ({name: "Rat Catcher"})},
  {min: 63, max: 64, data: async () => ({name: "Roadwarden"})},
  {min: 65, max: 66, data: async () => ({name: "Rogue"})},
  {min: 67, max: 68, data: async () => ({name: "Scribe"})},
  {min: 69, max: 70, data: async () => ({name: "Seaman"})},
  {min: 71, max: 72, data: async () => ({name: "Servant"})},
  {min: 73, max: 74, data: async () => ({name: "Smuggler"})},
  {min: 75, max: 76, data: async () => ({name: "Soldier"})},
  {min: 77, max: 78, data: async () => ({name: "Squire"})},
  {min: 79, max: 80, data: async () => ({name: "Student"})},
  {min: 81, max: 82, data: async () => ({name: "Thief"})},
  {min: 83, max: 84, data: async () => ({name: "Thug"})},
  {min: 85, max: 86, data: async () => ({name: "Toll Keeper"})},
  {min: 87, max: 88, data: async () => ({name: "Tomb Robber"})},
  {min: 89, max: 90, data: async () => ({name: "Tradesman"})},
  {min: 91, max: 92, data: async () => ({name: "Vagabond"})},
  {min: 93, max: 94, data: async () => ({name: "Valet"})},
  {min: 95, max: 96, data: async () => ({name: "Watchman"})},
  {min: 97, max: 98, data: async () => ({name: "Woodsman"})},
  {min: 99, max: 100, data: async () => ({name: "Zealot"})}
];

// ---------------- Biography Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const BIO_ELEM_I = [
  {min: 1, max: 3, data: async () => ({text: ""})},
  {min: 4, max: 6, data: async () => ({text: "Admirable"})},
  {min: 7, max: 9, data: async () => ({text: "Blood-dimmed"})},
  {min: 10, max: 12, data: async () => ({text: "Celebrated"})},
  {min: 13, max: 15, data: async () => ({text: "Classical"})},
  {min: 16, max: 18, data: async () => ({text: "Collected"})},
  {min: 19, max: 21, data: async () => ({text: "Compiled"})},
  {min: 22, max: 24, data: async () => ({text: "Complete"})},
  {min: 25, max: 27, data: async () => ({text: "Comprehensive"})},
  {min: 28, max: 30, data: async () => ({text: "Empirical"})},
  {min: 31, max: 33, data: async () => ({text: "Exposed"})},
  {min: 34, max: 36, data: async () => ({text: "Faithful"})},
  {min: 37, max: 39, data: async () => ({text: "Final"})},
  {min: 40, max: 42, data: async () => ({text: "Finest"})},
  {min: 43, max: 45, data: async () => ({text: "Gallant"})},
  {min: 46, max: 48, data: async () => ({text: "Gathered"})},
  {min: 49, max: 51, data: async () => ({text: "Gilded"})},
  {min: 52, max: 54, data: async () => ({text: "Glorious"})},
  {min: 55, max: 57, data: async () => ({text: "Grandiose"})},
  {min: 58, max: 60, data: async () => ({text: "Great"})},
  {min: 61, max: 63, data: async () => ({text: "Heretical"})},
  {min: 64, max: 66, data: async () => ({text: "Honest"})},
  {min: 67, max: 68, data: async () => ({text: "Ill-fated"})},
  {min: 69, max: 70, data: async () => ({text: "Illuminative"})},
  {min: 71, max: 72, data: async () => ({text: "Laudable"})},
  {min: 73, max: 74, data: async () => ({text: "Misunderstood"})},
  {min: 75, max: 76, data: async () => ({text: "Noble"})},
  {min: 77, max: 78, data: async () => ({text: "Perfect"})},
  {min: 79, max: 80, data: async () => ({text: "Proven"})},
  {min: 81, max: 82, data: async () => ({text: "Revealed"})},
  {min: 83, max: 84, data: async () => ({text: "Fine"})},
  {min: 85, max: 86, data: async () => ({text: "Splendid"})},
  {min: 87, max: 88, data: async () => ({text: "Tempting"})},
  {min: 89, max: 90, data: async () => ({text: "Torturous"})},
  {min: 91, max: 92, data: async () => ({text: "Truthful"})},
  {min: 93, max: 94, data: async () => ({text: "Unambiguous"})},
  {min: 95, max: 96, data: async () => ({text: "Uncovered"})},
  {min: 97, max: 98, data: async () => ({text: "Unearthed"})},
  {min: 99, max: 100, data: async () => ({reroll: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BIO_ELEM_II = [
  {min: 1, max: 3, data: async () => ({text: "Accomplishments"})},
  {min: 4, max: 6, data: async () => ({text: "Accounts"})},
  {min: 7, max: 9, data: async () => ({text: "Achievements"})},
  {min: 10, max: 12, data: async () => ({text: "Ambition"})},
  {min: 13, max: 15, data: async () => ({text: "Annals"})},
  {min: 16, max: 18, data: async () => ({text: "Archives"})},
  {min: 19, max: 21, data: async () => ({text: "Aspirations"})},
  {min: 22, max: 24, data: async () => ({text: "Chronicles"})},
  {min: 25, max: 27, data: async () => ({text: "Confessions"})},
  {min: 28, max: 30, data: async () => ({text: "Conundrums"})},
  {min: 31, max: 33, data: async () => ({text: "Deeds"})},
  {min: 34, max: 36, data: async () => ({text: "Deliberations"})},
  {min: 37, max: 39, data: async () => ({text: "Desires"})},
  {min: 40, max: 42, data: async () => ({text: "Digest"})},
  {min: 43, max: 45, data: async () => ({text: "Efforts"})},
  {min: 46, max: 48, data: async () => ({text: "Endeavour"})},
  {min: 49, max: 51, data: async () => ({text: "Enquiry"})},
  {min: 52, max: 54, data: async () => ({text: "Essays"})},
  {min: 55, max: 57, data: async () => ({text: "Existence"})},
  {min: 58, max: 60, data: async () => ({text: "Exploits"})},
  {min: 61, max: 63, data: async () => ({text: "Feats"})},
  {min: 64, max: 66, data: async () => ({text: "Findings (on)"})},
  {min: 67, max: 68, data: async () => ({text: "History"})},
  {min: 69, max: 70, data: async () => ({text: "Labours"})},
  {min: 71, max: 72, data: async () => ({text: "Life"})},
  {min: 73, max: 74, data: async () => ({text: "Notes"})},
  {min: 75, max: 76, data: async () => ({text: "Opus"})},
  {min: 77, max: 78, data: async () => ({text: "Prophecies"})},
  {min: 79, max: 80, data: async () => ({text: "Records"})},
  {min: 81, max: 82, data: async () => ({text: "Revelations"})},
  {min: 83, max: 84, data: async () => ({text: "Study"})},
  {min: 85, max: 86, data: async () => ({text: "Tales"})},
  {min: 87, max: 88, data: async () => ({text: "Testimonies"})},
  {min: 89, max: 90, data: async () => ({text: "Transcripts"})},
  {min: 91, max: 92, data: async () => ({text: "Treatise (on)"})},
  {min: 93, max: 94, data: async () => ({text: "Triumphs"})},
  {min: 95, max: 96, data: async () => ({text: "Visions"})},
  {min: 97, max: 98, data: async () => ({text: "Vocation"})},
  {min: 99, max: 100, data: async () => ({reroll: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BIO_ELEM_III = [
  {min: 1, max: 3, data: async () => ({text: "of Emperor Karl Franz"})},
  {min: 4, max: 6, data: async () => ({text: "of Magnus the Pious"})},
  {min: 7, max: 9, data: async () => ({text: "of Sigmar Heldenhammer"})},
  {min: 10, max: 12, data: async () => ({text: "of the Todbringers of Middenheim"})},
  {min: 13, max: 15, data: async () => ({text: "of the Laudenhofs of Hochland"})},
  {min: 16, max: 18, data: async () => ({text: "of the Gaussers of Nordland"})},
  {min: 19, max: 21, data: async () => ({text: "of the Hertwigs of Ostermark"})},
  {min: 22, max: 24, data: async () => ({text: "of von Raukovs of Ostland"})},
  {min: 25, max: 27, data: async () => ({text: "of the Haupt-Anderssens of Stirland"})},
  {min: 28, max: 30, data: async () => ({text: "of the von Krieglitz-Untens of Talabheim"})},
  {min: 31, max: 33, data: async () => ({text: "of the von Krieglitz' of Talabheim"})},
  {min: 34, max: 36, data: async () => ({text: "of the von Liebewitz' of Wissenland"})},
  {min: 37, max: 39, data: async () => ({text: "of the Leitdörfers of Averland"})},
  {
    min: 40,
    max: 42,
    data: async () => ({
      text: `of ${await generateName()}, ${(await rollFromTable(BASIC_CAREERS)).name} from ${await generateOrigin()}`
    })
  },
  {min: 43, max: 45, data: async () => ({text: `of ${await generateName()}, Artisan from ${await generateOrigin()}`})},
  {min: 46, max: 48, data: async () => ({text: `of ${await generateName()}, Captain from ${await generateOrigin()}`})},
  {min: 49, max: 51, data: async () => ({text: `of ${await generateName()}, Champion from ${await generateOrigin()}`})},
  {
    min: 52,
    max: 54,
    data: async () => ({text: `of ${await generateName()}, Crime Lord from ${await generateOrigin()}`})
  },
  {
    min: 55,
    max: 57,
    data: async () => ({text: `of ${await generateName()}, Demagogue from ${await generateOrigin()}`})
  },
  {min: 58, max: 60, data: async () => ({text: `of ${await generateName()}, Duellist from ${await generateOrigin()}`})},
  {min: 61, max: 63, data: async () => ({text: `of ${await generateName()}, Engineer from ${await generateOrigin()}`})},
  {min: 64, max: 66, data: async () => ({text: `of ${await generateName()}, Exorcist from ${await generateOrigin()}`})},
  {min: 67, max: 68, data: async () => ({text: `of ${await generateName()}, Explorer from ${await generateOrigin()}`})},
  {min: 69, max: 70, data: async () => ({text: `of ${await generateName()}, Friar from ${await generateOrigin()}`})},
  {
    min: 71,
    max: 72,
    data: async () => ({text: `of ${await generateName()}, Guild Master from ${await generateOrigin()}`})
  },
  {
    min: 73,
    max: 74,
    data: async () => ({text: `of ${await generateName()}, Highwayman from ${await generateOrigin()}`})
  },
  {min: 75, max: 76, data: async () => ({text: `of ${await generateName()}, Knight from ${await generateOrigin()}`})},
  {min: 77, max: 78, data: async () => ({text: `of ${await generateName()}, Merchant from ${await generateOrigin()}`})},
  {min: 79, max: 80, data: async () => ({text: `of ${await generateName()}, Minstrel from ${await generateOrigin()}`})},
  {min: 81, max: 82, data: async () => ({text: `of ${await generateName()}, Noble from ${await generateOrigin()}`})},
  {
    min: 83,
    max: 84,
    data: async () => ({text: `of ${await generateName()}, Outlaw Chief from ${await generateOrigin()}`})
  },
  {
    min: 85,
    max: 86,
    data: async () => ({text: `of ${await generateName()}, Physician from ${await generateOrigin()}`})
  },
  {
    min: 87,
    max: 88,
    data: async () => ({text: `of ${await generateName()}, Politician from ${await generateOrigin()}`})
  },
  {min: 89, max: 90, data: async () => ({text: `of ${await generateName()}, Priest from ${await generateOrigin()}`})},
  {min: 91, max: 92, data: async () => ({text: `of ${await generateName()}, Scholar from ${await generateOrigin()}`})},
  {
    min: 93,
    max: 94,
    data: async () => ({text: `of ${await generateName()}, Sea Captain from ${await generateOrigin()}`})
  },
  {min: 95, max: 96, data: async () => ({text: `of ${await generateName()}, Veteran from ${await generateOrigin()}`})},
  {
    min: 97,
    max: 100,
    data: async () => ({text: `of ${await generateName()}, Witch Hunter from ${await generateOrigin()}`})
  }
];

/** @type {TableEntry<{ text: string }>[] } */
const BIO_ELEM_IV = [
  {min: 1, max: 7, data: async () => ({text: "For Which He Was Burnt"})},
  {min: 8, max: 14, data: async () => ({text: "Second Printing"})},
  {min: 15, max: 21, data: async () => ({text: "Third Printing"})},
  {min: 22, max: 28, data: async () => ({text: "A True Heir of Sigmar"})},
  {min: 29, max: 35, data: async () => ({text: "Now Edited and Enlarged"})},
  {min: 36, max: 42, data: async () => ({text: "Previously Unpublished"})},
  {min: 43, max: 49, data: async () => ({text: "The Complete Volume"})},
  {min: 50, max: 57, data: async () => ({text: "Recorded After His Death"})},
  {min: 58, max: 65, data: async () => ({text: "Published in Interest of All"})},
  {min: 66, max: 72, data: async () => ({text: "True and Honest Accounts"})},
  {min: 73, max: 80, data: async () => ({text: "A Fate Forfeit"})},
  {min: 81, max: 87, data: async () => ({text: "A Dangerous Mind"})},
  {min: 88, max: 93, data: async () => ({text: `Published by ${await generateName()}`})},
  {min: 94, max: 100, data: async () => ({text: `Edited by ${await generateName()}`})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BIO_ELEM_V = [
  {min: 1, max: 7, data: async () => ({text: "Slightly disapproving; thinks subject should have done better"})},
  {min: 8, max: 14, data: async () => ({text: "Biased, lauding, and flattering: a commissioned work?"})},
  {min: 15, max: 21, data: async () => ({text: "Ill-kept contempt and scorn: definitely no admirer of subject"})},
  {min: 22, max: 28, data: async () => ({text: "Believes subject is or was an agent of the Ruinous Powers"})},
  {min: 29, max: 35, data: async () => ({text: "Seems to believe subject is a direct descendant of Sigmar"})},
  {min: 36, max: 42, data: async () => ({text: "Uninterested and uncaring, but also quite unbiased"})},
  {min: 43, max: 49, data: async () => ({text: "Author seems more interested in the time-period than the subject"})},
  {min: 50, max: 57, data: async () => ({text: "Belittles and demeans subject rather ingeniously"})},
  {min: 58, max: 65, data: async () => ({text: "Written as if subject was a personal acquaintance"})},
  {min: 66, max: 72, data: async () => ({text: "It is evident that author disapproves of subject’s religiosity"})},
  {min: 73, max: 80, data: async () => ({text: "Constantly questions and mistrusts the subject’s acts"})},
  {min: 81, max: 87, data: async () => ({text: "Conspiracy-theorist; looks for ties to Outlaws (and worse)"})},
  {min: 88, max: 93, data: async () => ({text: "Written from a matter-of-fact and unemotional perspective"})},
  {min: 94, max: 100, data: async () => ({text: "Author seems to be a follower of the Ruinous Powers…"})}
];

// ---------------- Bestiary Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const BEST_ELEM_I = [
  {min: 1, max: 7, data: async () => ({text: ""})},
  {min: 8, max: 14, data: async () => ({text: "Detestable"})},
  {min: 15, max: 21, data: async () => ({text: "Enquiries on the"})},
  {min: 22, max: 28, data: async () => ({text: "Essays on the"})},
  {min: 29, max: 35, data: async () => ({text: "Facts of the"})},
  {min: 36, max: 42, data: async () => ({text: "Findings on the"})},
  {min: 43, max: 49, data: async () => ({text: "Horrifying"})},
  {min: 50, max: 56, data: async () => ({text: "Ideas on the"})},
  {min: 57, max: 63, data: async () => ({text: "Lectures on the"})},
  {min: 64, max: 70, data: async () => ({text: "Lessons on the"})},
  {min: 71, max: 73, data: async () => ({text: "Loathsome"})},
  {min: 74, max: 76, data: async () => ({text: "Opinions on the"})},
  {min: 77, max: 79, data: async () => ({text: "Reports on the"})},
  {min: 80, max: 82, data: async () => ({text: "Seminars on the"})},
  {min: 83, max: 85, data: async () => ({text: "Study on the"})},
  {min: 86, max: 88, data: async () => ({text: "Survey of the"})},
  {min: 89, max: 91, data: async () => ({text: "Theories on the"})},
  {min: 92, max: 94, data: async () => ({text: "Thesis on the"})},
  {min: 95, max: 97, data: async () => ({text: "Treatise on the"})},
  {min: 98, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BEST_ELEM_II = [
  {min: 1, max: 7, data: async () => ({text: "Animals"})},
  {min: 8, max: 14, data: async () => ({text: "Beasts"})},
  {min: 15, max: 21, data: async () => ({text: "Beings"})},
  {min: 22, max: 28, data: async () => ({text: "Childer"})},
  {min: 29, max: 35, data: async () => ({text: "Children"})},
  {min: 36, max: 42, data: async () => ({text: "Creatures"})},
  {min: 43, max: 49, data: async () => ({text: "Denizens"})},
  {min: 50, max: 56, data: async () => ({text: "Dwellers"})},
  {min: 57, max: 63, data: async () => ({text: "Inhabitants"})},
  {min: 64, max: 70, data: async () => ({text: "Lords"})},
  {min: 71, max: 73, data: async () => ({text: "Masters"})},
  {min: 74, max: 76, data: async () => ({text: "Minds"})},
  {min: 77, max: 79, data: async () => ({text: "Natives"})},
  {min: 80, max: 82, data: async () => ({text: "Residents"})},
  {min: 83, max: 85, data: async () => ({text: "Servants"})},
  {min: 86, max: 88, data: async () => ({text: "Sons"})},
  {min: 89, max: 91, data: async () => ({text: "Souls"})},
  {min: 92, max: 94, data: async () => ({text: "Spirits"})},
  {min: 95, max: 97, data: async () => ({text: "Tenants"})},
  {min: 98, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text?: string, species: string, combine?: boolean }>[] } */
const BEST_ELEM_III = [
  {min: 1, max: 7, data: async () => ({text: "Manaan", species: "Aquatic creatures: fish, crayfish, squid etc"})},
  {min: 8, max: 14, data: async () => ({text: "the Tooth", species: "Rodents: mice, rats, squirrels, beavers etc"})},
  {
    min: 15,
    max: 21,
    data: async () => ({text: "the Farm", species: "Domestic animals: cows, goats, dogs, chicken etc"})
  },
  {min: 22, max: 28, data: async () => ({text: "the Swamps", species: "Amphibians: lizards, snakes, frogs etc"})},
  {min: 29, max: 35, data: async () => ({text: "the Woods", species: "Wild mammals: bears, elk, rabbits, deer etc"})},
  {min: 36, max: 42, data: async () => ({text: "the Saddle", species: "Mounts: horses, donkeys, mules etc"})},
  {min: 43, max: 49, data: async () => ({text: "the Swarm", species: "Insects: ants, flies, butterflies etc"})},
  {min: 50, max: 56, data: async () => ({text: "the Skies", species: "Wild birds"})},
  {min: 57, max: 63, data: async () => ({text: "the Hive", species: "Bees and wasps"})},
  {min: 64, max: 70, data: async () => ({text: "Ulric", species: "Wolves"})},
  {min: 71, max: 73, data: async () => ({text: "Hunger", species: "Trolls"})},
  {min: 74, max: 76, data: async () => ({text: "Myth", species: "Mythical beasts (Probably a hoax)"})},
  {min: 77, max: 79, data: async () => ({text: "the Tomb", species: "Incorporeal undead: Ghosts, Spectres etc"})},
  {min: 80, max: 82, data: async () => ({text: "the Grave", species: "Material undead: Skeletons, Ghouls etc"})},
  {min: 83, max: 85, data: async () => ({text: "Savagery", species: "Goblinoid races: Orcs, Goblins etc"})},
  {min: 86, max: 88, data: async () => ({text: "Ruin", species: "Beastmen, Minotaurs and Mutants"})},
  {min: 89, max: 91, data: async () => ({text: "Blood", species: "Vampires"})},
  {min: 92, max: 94, data: async () => ({text: "the Horned Rat", species: "Skaven"})},
  {min: 95, max: 97, data: async () => ({text: "Chaos", species: "Chaos Warriors, Marauders and Dwarfs"})},
  {min: 98, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BEST_ELEM_IV = [
  {min: 1, max: 10, data: async () => ({text: ""})},
  {min: 11, max: 20, data: async () => ({text: "The Lore of Beasts"})},
  {min: 21, max: 30, data: async () => ({text: "Servants of Taal?"})},
  {min: 31, max: 40, data: async () => ({text: "Call of the Wild"})},
  {min: 41, max: 50, data: async () => ({text: "The Erudite Colloquia of Nuln"})},
  {min: 51, max: 60, data: async () => ({text: "Wonderful Wild"})},
  {min: 61, max: 70, data: async () => ({text: "Magnificent Creatures"})},
  {min: 71, max: 80, data: async () => ({text: "A Study of Creatures Fair and Foul"})},
  {min: 81, max: 90, data: async () => ({text: "A Hypothesis Most Remarkable"})},
  {min: 91, max: 100, data: async () => ({text: "A Natural Philosophy"})}
];

/** @type {TableEntry<{ text: string }>[] } */
const BEST_ELEM_V = [
  {min: 1, max: 10, data: async () => ({text: "None; overview of all aspects of the creatures"})},
  {min: 11, max: 20, data: async () => ({text: "Usage as food (not necessarily for Humans…)"})},
  {min: 21, max: 30, data: async () => ({text: "On how to train or interact with the beasts in question"})},
  {min: 31, max: 40, data: async () => ({text: "How the creature can be used as medicine (or poison)"})},
  {min: 41, max: 50, data: async () => ({text: "Feeding habits and preferred foods"})},
  {min: 51, max: 60, data: async () => ({text: "Mating rituals, selection of mates, rearing of the young"})},
  {min: 61, max: 70, data: async () => ({text: "A study of the creatures’ typical lairs and habitats"})},
  {min: 71, max: 80, data: async () => ({text: "Methods of defence and attack (where applicable)"})},
  {min: 81, max: 90, data: async () => ({text: "Social status and interaction within a group or horde"})},
  {min: 91, max: 100, data: async () => ({text: "Primarily deals with the creatures’ typical environment"})}
];

// ---------------- Cookbook Data ---------------- //
/** @type {TableEntry<{ text: string, combine?: boolean }>[] } */
const COOK_ELEM_I = [
  {min: 1, max: 5, data: async () => ({text: "Appetizing"})},
  {min: 6, max: 10, data: async () => ({text: "Customary"})},
  {min: 11, max: 15, data: async () => ({text: "Delicious"})},
  {min: 16, max: 20, data: async () => ({text: "Delightful"})},
  {min: 21, max: 25, data: async () => ({text: "Enticing"})},
  {min: 26, max: 30, data: async () => ({text: "Fabulous"})},
  {min: 31, max: 35, data: async () => ({text: "Favourite"})},
  {min: 36, max: 40, data: async () => ({text: "Forgotten"})},
  {min: 41, max: 45, data: async () => ({text: "Innovative"})},
  {min: 46, max: 50, data: async () => ({text: "Marvellous"})},
  {min: 51, max: 55, data: async () => ({text: "Overlooked"})},
  {min: 56, max: 60, data: async () => ({text: "Precious"})},
  {min: 61, max: 65, data: async () => ({text: "Quickening"})},
  {min: 66, max: 70, data: async () => ({text: "Scrumptious"})},
  {min: 71, max: 75, data: async () => ({text: "Splendid"})},
  {min: 76, max: 80, data: async () => ({text: "Tantalizing"})},
  {min: 81, max: 85, data: async () => ({text: "Tempting"})},
  {min: 86, max: 90, data: async () => ({text: "Time-honoured"})},
  {min: 91, max: 95, data: async () => ({text: "Traditional"})},
  {min: 96, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string, combine?: boolean }>[] } */
const COOK_ELEM_II = [
  {min: 1, max: 5, data: async () => ({text: "Beers"})},
  {min: 6, max: 10, data: async () => ({text: "Breads & Biscuits"})},
  {min: 11, max: 15, data: async () => ({text: "Cookery"})},
  {min: 16, max: 20, data: async () => ({text: "Delicacies"})},
  {min: 21, max: 25, data: async () => ({text: "Desserts"})},
  {min: 26, max: 30, data: async () => ({text: "Fare"})},
  {min: 31, max: 35, data: async () => ({text: "Foods"})},
  {min: 36, max: 40, data: async () => ({text: "Hostels"})},
  {min: 41, max: 45, data: async () => ({text: "Kitchen"})},
  {min: 46, max: 50, data: async () => ({text: "Meals"})},
  {min: 51, max: 55, data: async () => ({text: "Menus"})},
  {min: 56, max: 60, data: async () => ({text: "Pies"})},
  {min: 61, max: 65, data: async () => ({text: "Repasts"})},
  {min: 66, max: 70, data: async () => ({text: "Sausages"})},
  {min: 71, max: 75, data: async () => ({text: "Soups"})},
  {min: 76, max: 80, data: async () => ({text: "Stews"})},
  {min: 81, max: 85, data: async () => ({text: "Tables"})},
  {min: 86, max: 90, data: async () => ({text: "Treats"})},
  {min: 91, max: 95, data: async () => ({text: "Wines"})},
  {min: 96, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text?: string, prefix?: string, origin?: boolean }>[] } */
const COOK_ELEM_III = [
  {min: 1, max: 5, data: async () => ({text: "The Bounty of Esmeralda"})},
  {min: 6, max: 10, data: async () => ({text: "The Bretonnian’s Choice"})},
  {min: 11, max: 15, data: async () => ({text: "The Forgotten Fare"})},
  {min: 16, max: 20, data: async () => ({text: "The Garnet Guide"})},
  {min: 21, max: 25, data: async () => ({text: "A Horn of Plenty"})},
  {min: 26, max: 30, data: async () => ({text: "Contemporary Cuisine"})},
  {min: 31, max: 35, data: async () => ({text: "An Essential Guide to the Kitchen"})},
  {min: 36, max: 40, data: async () => ({text: "Secrets of the Hearth Revealed"})},
  {min: 41, max: 45, data: async () => ({text: "Prestigious Pots and Platters"})},
  {min: 46, max: 50, data: async () => ({text: "A Seductive Selection"})},
  {min: 51, max: 55, data: async () => ({prefix: `${await xd(3, 10)}`})},
  {min: 56, max: 60, data: async () => ({text: `By ${await generateName()}, Chef Appointed to the Court`})},
  {min: 61, max: 65, data: async () => ({text: `By the Famous Cook ${await generateName()}`})},
  {min: 66, max: 70, data: async () => ({origin: true, text: `The Cuisine of ${await generateOrigin()}`})},
  {min: 71, max: 75, data: async () => ({origin: true, text: `The Tastes of ${await generateOrigin()}`})},
  {min: 76, max: 80, data: async () => ({origin: true, text: `The Kitchen of ${await generateOrigin()}`})}
];

// ---------------- Guidebook Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const GUIDE_ELEM_I = [
  {min: 1, max: 4, data: async () => ({text: "Amazing"})},
  {min: 5, max: 8, data: async () => ({text: "Astonishing"})},
  {min: 9, max: 12, data: async () => ({text: "Beaten"})},
  {min: 13, max: 16, data: async () => ({text: "Classic"})},
  {min: 17, max: 20, data: async () => ({text: "Contemplative"})},
  {min: 21, max: 24, data: async () => ({text: "Dangerous"})},
  {min: 25, max: 28, data: async () => ({text: "Distant"})},
  {min: 29, max: 32, data: async () => ({text: "Dusty"})},
  {min: 33, max: 36, data: async () => ({text: "Evocative"})},
  {min: 37, max: 40, data: async () => ({text: "Faraway"})},
  {min: 41, max: 44, data: async () => ({text: "Lovely"})},
  {min: 45, max: 48, data: async () => ({text: "Memorable"})},
  {min: 49, max: 52, data: async () => ({text: "My"})},
  {min: 53, max: 56, data: async () => ({text: "Mysterious"})},
  {min: 57, max: 60, data: async () => ({text: "Noble"})},
  {min: 61, max: 64, data: async () => ({text: "Noteworthy"})},
  {min: 65, max: 68, data: async () => ({text: "Perilous"})},
  {min: 69, max: 72, data: async () => ({text: "Remarkable"})},
  {min: 73, max: 76, data: async () => ({text: "Strange"})},
  {min: 77, max: 80, data: async () => ({text: "Treacherous"})},
  {min: 81, max: 84, data: async () => ({text: "Unknown"})},
  {min: 85, max: 88, data: async () => ({text: "Weathered"})},
  {min: 89, max: 92, data: async () => ({text: "Wild"})},
  {min: 93, max: 96, data: async () => ({text: ""})},
  {min: 97, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const GUIDE_ELEM_II = [
  {min: 1, max: 4, data: async () => ({text: "Accounts from"})},
  {min: 5, max: 8, data: async () => ({text: "Adventures from"})},
  {min: 9, max: 12, data: async () => ({text: "Annals from"})},
  {min: 13, max: 16, data: async () => ({text: "Chronicles from"})},
  {min: 17, max: 20, data: async () => ({text: "Crossings of"})},
  {min: 21, max: 24, data: async () => ({text: "Domains of"})},
  {min: 25, max: 28, data: async () => ({text: "Footpaths of"})},
  {min: 29, max: 32, data: async () => ({text: "Footprints of"})},
  {min: 33, max: 36, data: async () => ({text: "Inns of"})},
  {min: 37, max: 40, data: async () => ({text: "Journals from"})},
  {min: 41, max: 44, data: async () => ({text: "Journey in"})},
  {min: 45, max: 48, data: async () => ({text: "Lands of"})},
  {min: 49, max: 52, data: async () => ({text: "Notes from"})},
  {min: 53, max: 56, data: async () => ({text: "Paths of"})},
  {min: 57, max: 60, data: async () => ({text: "Promenades of"})},
  {min: 61, max: 64, data: async () => ({text: "Roads of"})},
  {min: 65, max: 68, data: async () => ({text: "Steps of"})},
  {min: 69, max: 72, data: async () => ({text: "Streets of"})},
  {min: 73, max: 76, data: async () => ({text: "Sunrises of"})},
  {min: 77, max: 80, data: async () => ({text: "Sunsets of"})},
  {min: 81, max: 84, data: async () => ({text: "Tracks of"})},
  {min: 85, max: 88, data: async () => ({text: "Tracts of"})},
  {min: 89, max: 92, data: async () => ({text: "Travels in"})},
  {min: 93, max: 96, data: async () => ({text: "Voyages in"})},
  {min: 97, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text?: string, origin?: boolean }>[] } */
const GUIDE_ELEM_III = [
  {min: 1, max: 4, data: async () => ({text: "A Guidebook"})},
  {min: 5, max: 8, data: async () => ({text: "A Life on the Road Recalled"})},
  {min: 9, max: 12, data: async () => ({text: "A Walkabout in the Wild"})},
  {min: 13, max: 16, data: async () => ({text: "A Voyage Remembered"})},
  {min: 17, max: 20, data: async () => ({text: "Alleys & Aqueducts"})},
  {min: 21, max: 24, data: async () => ({text: "Being the True and Honest Accounts"})},
  {min: 25, max: 28, data: async () => ({text: "Castles & Cul de sacs"})},
  {min: 29, max: 32, data: async () => ({text: "Country of Boon and Bounty"})},
  {min: 33, max: 36, data: async () => ({text: "Crossroads of a Courier"})},
  {min: 37, max: 40, data: async () => ({text: "In the Footsteps of Our Most Revered Fathers"})},
  {min: 41, max: 44, data: async () => ({text: "Inroads of the Outback"})},
  {min: 45, max: 48, data: async () => ({text: "Journals of a Journey"})},
  {min: 49, max: 52, data: async () => ({text: "Manors & Mansions"})},
  {min: 53, max: 56, data: async () => ({text: "On the Road"})},
  {min: 57, max: 60, data: async () => ({text: "Perilous Paths of an Empire in Flames"})},
  {min: 61, max: 64, data: async () => ({text: "Perspectives on the Paths of the Damned"})},
  {min: 65, max: 68, data: async () => ({text: "Rivers and Rendezvous"})},
  {min: 69, max: 72, data: async () => ({text: "Rumours & Reports"})},
  {min: 73, max: 76, data: async () => ({text: "Tales of a Rover"})},
  {min: 77, max: 80, data: async () => ({text: "The Road to Redemption Revealed"})},
  {min: 81, max: 84, data: async () => ({text: "There and Back Again"})},
  {min: 85, max: 88, data: async () => ({text: "Troubled Trails of a Tract Most Terrible"})},
  {min: 89, max: 92, data: async () => ({origin: true, text: `Roads of ${await generateOrigin()}`})},
  {min: 93, max: 96, data: async () => ({origin: true, text: `Journeys in ${await generateOrigin()}`})},
  {min: 97, max: 100, data: async () => ({origin: true, text: `Perils of ${await generateOrigin()}`})}
];

// ---------------- Fiction Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const FICTION_ELEM_I = [
  {min: 1, max: 4, data: async () => ({text: "Black"})},
  {min: 5, max: 8, data: async () => ({text: "Colour of"})},
  {min: 9, max: 12, data: async () => ({text: "Dying"})},
  {min: 13, max: 16, data: async () => ({text: "First"})},
  {min: 17, max: 20, data: async () => ({text: "Glorious"})},
  {min: 21, max: 24, data: async () => ({text: "Golden"})},
  {min: 25, max: 28, data: async () => ({text: "Her"})},
  {min: 29, max: 32, data: async () => ({text: "His"})},
  {min: 33, max: 36, data: async () => ({text: "Last"})},
  {min: 37, max: 40, data: async () => ({text: "Laudable"})},
  {min: 41, max: 44, data: async () => ({text: "Ominous"})},
  {min: 45, max: 48, data: async () => ({text: "Penultimate"})},
  {min: 49, max: 52, data: async () => ({text: "Persistent"})},
  {min: 53, max: 56, data: async () => ({text: "Red"})},
  {min: 57, max: 60, data: async () => ({text: "Silent"})},
  {min: 61, max: 64, data: async () => ({text: "Soft"})},
  {min: 65, max: 68, data: async () => ({text: "Splendid"})},
  {min: 69, max: 72, data: async () => ({text: "White"})},
  {min: 73, max: 76, data: async () => ({text: "Wondrous"})},
  {min: 77, max: 80, data: async () => ({text: "Year of the"})},
  {min: 81, max: 84, data: async () => ({text: "The"})},
  {min: 85, max: 89, data: async () => ({text: `${await d(10)}`})},
  {min: 90, max: 95, data: async () => ({text: `${await generateName()}’s`})},
  {min: 96, max: 100, data: async () => ({text: "Career’s"})}
];

/** @type {TableEntry<{ text: string }>[] } */
const FICTION_ELEM_II = [
  {min: 1, max: 4, data: async () => ({text: "Autumn"})},
  {min: 5, max: 8, data: async () => ({text: "Awakening"})},
  {min: 9, max: 12, data: async () => ({text: "Crown"})},
  {min: 13, max: 16, data: async () => ({text: "Dawn"})},
  {min: 17, max: 20, data: async () => ({text: "Evening"})},
  {min: 21, max: 24, data: async () => ({text: "Flower"})},
  {min: 25, max: 28, data: async () => ({text: "Hand"})},
  {min: 29, max: 32, data: async () => ({text: "Heart"})},
  {min: 33, max: 36, data: async () => ({text: "Legend"})},
  {min: 37, max: 40, data: async () => ({text: "Light"})},
  {min: 41, max: 44, data: async () => ({text: "Memory"})},
  {min: 45, max: 48, data: async () => ({text: "Morning"})},
  {min: 49, max: 52, data: async () => ({text: "Prize"})},
  {min: 53, max: 56, data: async () => ({text: "Saga"})},
  {min: 57, max: 60, data: async () => ({text: "Shadow"})},
  {min: 61, max: 64, data: async () => ({text: "Spring"})},
  {min: 65, max: 68, data: async () => ({text: "Story"})},
  {min: 69, max: 72, data: async () => ({text: "Summer"})},
  {min: 73, max: 76, data: async () => ({text: "Tale"})},
  {min: 77, max: 80, data: async () => ({text: "Tear"})},
  {min: 81, max: 84, data: async () => ({text: "Time"})},
  {min: 85, max: 89, data: async () => ({text: "Water"})},
  {min: 90, max: 95, data: async () => ({text: "Wind"})},
  {min: 96, max: 100, data: async () => ({text: "Winter"})}
];

/** @type {TableEntry<{ text: string }>[] } */
const FICTION_ELEM_III = [
  {min: 1, max: 4, data: async () => ({text: "Sleazy 'love stories' (borderline pornographic)"})},
  {min: 5, max: 8, data: async () => ({text: "Instructive moral stories for young lovers"})},
  {min: 9, max: 12, data: async () => ({text: "Traditional fable or fairytale"})},
  {min: 13, max: 16, data: async () => ({text: "Ghost or horror story"})},
  {min: 17, max: 20, data: async () => ({text: "Classical novel by famous writer"})},
  {min: 21, max: 24, data: async () => ({text: "First part of an epic (and rather dry) love story"})},
  {min: 25, max: 28, data: async () => ({text: "Struggle of an emerging Marienburg merchant family"})},
  {min: 29, max: 32, data: async () => ({text: "A family feud that has gone on for generations"})},
  {min: 33, max: 36, data: async () => ({text: "A sad tale of the life of a destitute maiden"})},
  {min: 37, max: 40, data: async () => ({text: "Conformist story of a righteous baron and his reign"})},
  {min: 41, max: 44, data: async () => ({text: "A glamorous ball recalled by ten different people"})},
  {min: 45, max: 48, data: async () => ({text: "Recollection of a plague that afflicted a small town"})},
  {min: 49, max: 52, data: async () => ({text: "Dark folktale of a woman who was burnt as a witch"})},
  {min: 53, max: 56, data: async () => ({text: "Unblushing appraisal of Emperor Karl Franz"})},
  {
    min: 57,
    max: 60,
    data: async (roll) => ({
      text: `Collection of love poems on common theme${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""}`
    })
  },
  {min: 61, max: 64, data: async () => ({text: "Stage play (comedy)"})},
  {min: 65, max: 68, data: async () => ({text: "Stage play (tragedy)"})},
  {min: 69, max: 72, data: async () => ({text: "Stage play (drama)"})},
  {
    min: 73,
    max: 76,
    data: async (roll) => ({
      text: `Songbook${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (lullabies and children’s songs)`
    })
  },
  {
    min: 77,
    max: 80,
    data: async (roll) => ({
      text: `Songbook${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (traditional tunes)`
    })
  },
  {
    min: 81,
    max: 84,
    data: async (roll) => ({
      text: `Songbook${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (religious hymns)`
    })
  },
  {
    min: 85,
    max: 89,
    data: async (roll) => ({text: `Book on art${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (painting)`})
  },
  {
    min: 90,
    max: 95,
    data: async (roll) => ({
      text: `Book on art${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (calligraphy or illumination)`
    })
  },
  {
    min: 96,
    max: 100,
    data: async (roll) => ({
      text: `Book on art${roll % 2 === 0 ? " from " + (await generateOrigin()) : ""} (pottery or glassblowing)`
    })
  }
];

// ---------------- Scholarship Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const REL_ELEM_I = [
  {min: 1, max: 2, data: async () => ({text: ""})},
  {min: 3, max: 4, data: async () => ({text: "The"})},
  {min: 5, max: 6, data: async () => ({text: "A Study of the"})},
  {min: 7, max: 8, data: async () => ({text: "Absolute"})},
  {min: 9, max: 10, data: async () => ({text: "Ardent"})},
  {min: 11, max: 12, data: async () => ({text: "Blessed"})},
  {min: 13, max: 14, data: async () => ({text: "Categorical"})},
  {min: 15, max: 16, data: async () => ({text: "Collected"})},
  {min: 17, max: 18, data: async () => ({text: "Comprehensive"})},
  {min: 19, max: 20, data: async () => ({text: "Conclusive"})},
  {min: 21, max: 22, data: async () => ({text: "Consecrated"})},
  {min: 23, max: 24, data: async () => ({text: "Constant"})},
  {min: 25, max: 26, data: async () => ({text: "Essential"})},
  {min: 27, max: 28, data: async () => ({text: "Established"})},
  {min: 29, max: 30, data: async () => ({text: "Extreme"})},
  {min: 31, max: 32, data: async () => ({text: "Faithful"})},
  {min: 33, max: 34, data: async () => ({text: "Fervent"})},
  {min: 35, max: 36, data: async () => ({text: "Gathered"})},
  {min: 37, max: 38, data: async () => ({text: "Golden"})},
  {min: 39, max: 40, data: async () => ({text: "Hallowed"})},
  {min: 41, max: 42, data: async () => ({text: "Holy"})},
  {min: 43, max: 44, data: async () => ({text: "Humble"})},
  {min: 45, max: 46, data: async () => ({text: "Orthodox"})},
  {min: 47, max: 48, data: async () => ({text: "Pious"})},
  {min: 49, max: 50, data: async () => ({text: "Potent"})},
  {min: 51, max: 52, data: async () => ({text: "Primary"})},
  {min: 53, max: 54, data: async () => ({text: "Prime"})},
  {min: 55, max: 56, data: async () => ({text: "Principal"})},
  {min: 57, max: 58, data: async () => ({text: "Revered"})},
  {min: 59, max: 60, data: async () => ({text: "Reverent"})},
  {min: 61, max: 62, data: async () => ({text: "Righteous"})},
  {min: 63, max: 64, data: async () => ({text: "Rigorous"})},
  {min: 65, max: 66, data: async () => ({text: "Sacred"})},
  {min: 67, max: 68, data: async () => ({text: "Sacrosanct"})},
  {min: 69, max: 70, data: async () => ({text: "Sanctified"})},
  {min: 71, max: 72, data: async () => ({text: "Sanctimonious"})},
  {min: 73, max: 74, data: async () => ({text: "Scrupulous"})},
  {min: 75, max: 76, data: async () => ({text: "Stringent"})},
  {min: 77, max: 78, data: async () => ({text: "Summative"})},
  {min: 79, max: 80, data: async () => ({text: "Superlative"})},
  {min: 81, max: 82, data: async () => ({text: "Supreme"})},
  {min: 83, max: 84, data: async () => ({text: "Thoughts on the"})},
  {min: 85, max: 86, data: async () => ({text: "Time-Honoured"})},
  {min: 87, max: 88, data: async () => ({text: "Treatise on the"})},
  {min: 89, max: 90, data: async () => ({text: "True"})},
  {min: 91, max: 92, data: async () => ({text: "Ultimate"})},
  {min: 93, max: 94, data: async () => ({text: "Unconditional"})},
  {min: 95, max: 96, data: async () => ({text: "Virtuous"})},
  {min: 97, max: 98, data: async () => ({text: `Most ${await rollFromTable(REL_ELEM_I, 0, 96).text}`})},
  {min: 99, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const REL_ELEM_II = [
  {min: 1, max: 2, data: async () => ({text: "Addresses"})},
  {min: 3, max: 4, data: async () => ({text: "Articles"})},
  {min: 5, max: 6, data: async () => ({text: "Commandments"})},
  {min: 7, max: 8, data: async () => ({text: "Commands"})},
  {min: 9, max: 10, data: async () => ({text: "Condition"})},
  {min: 11, max: 12, data: async () => ({text: "Contradictions"})},
  {min: 13, max: 14, data: async () => ({text: "Course"})},
  {min: 15, max: 16, data: async () => ({text: "Decrees"})},
  {min: 17, max: 18, data: async () => ({text: "Deliberations"})},
  {min: 19, max: 20, data: async () => ({text: "Demands"})},
  {min: 21, max: 22, data: async () => ({text: "Demonstrations"})},
  {min: 23, max: 24, data: async () => ({text: "Dicta"})},
  {min: 25, max: 26, data: async () => ({text: "Direction"})},
  {min: 27, max: 28, data: async () => ({text: "Directives"})},
  {min: 29, max: 30, data: async () => ({text: "Discourses"})},
  {min: 31, max: 32, data: async () => ({text: "Elements"})},
  {min: 33, max: 34, data: async () => ({text: "Errors"})},
  {min: 35, max: 36, data: async () => ({text: "Exigencies"})},
  {min: 37, max: 38, data: async () => ({text: "Expositions"})},
  {min: 39, max: 40, data: async () => ({text: "Fundamentals"})},
  {min: 41, max: 42, data: async () => ({text: "Fundaments"})},
  {min: 43, max: 44, data: async () => ({text: "Imperatives"})},
  {min: 45, max: 46, data: async () => ({text: "Inconsistencies"})},
  {min: 47, max: 48, data: async () => ({text: "Instructions"})},
  {min: 49, max: 50, data: async () => ({text: "Lectures"})},
  {min: 51, max: 52, data: async () => ({text: "Mandates"})},
  {min: 53, max: 54, data: async () => ({text: "Miracles"})},
  {min: 55, max: 56, data: async () => ({text: "Mysteries"})},
  {min: 57, max: 58, data: async () => ({text: "Papers"})},
  {min: 59, max: 60, data: async () => ({text: "Paths"})},
  {min: 61, max: 62, data: async () => ({text: "Preaching"})},
  {min: 63, max: 64, data: async () => ({text: "Procedures"})},
  {min: 65, max: 66, data: async () => ({text: "Proof"})},
  {min: 67, max: 68, data: async () => ({text: "Prophecies"})},
  {min: 69, max: 70, data: async () => ({text: "Questions"})},
  {min: 71, max: 72, data: async () => ({text: "Requests"})},
  {min: 73, max: 74, data: async () => ({text: "Requirements"})},
  {min: 75, max: 76, data: async () => ({text: "Revelations"})},
  {min: 77, max: 78, data: async () => ({text: "Rudiments"})},
  {min: 79, max: 80, data: async () => ({text: "Salvation"})},
  {min: 81, max: 82, data: async () => ({text: "Sermons"})},
  {min: 83, max: 84, data: async () => ({text: "Stipulations"})},
  {min: 85, max: 86, data: async () => ({text: "Tablet"})},
  {min: 87, max: 88, data: async () => ({text: "Teachings"})},
  {min: 89, max: 90, data: async () => ({text: "Testimonies"})},
  {min: 91, max: 92, data: async () => ({text: "Transcripts"})},
  {min: 93, max: 94, data: async () => ({text: "Treatises"})},
  {min: 95, max: 96, data: async () => ({text: "Truths"})},
  {min: 97, max: 98, data: async () => ({text: `Visions`})},
  {min: 99, max: 100, data: async () => ({combine: true})}
];

/** @type {TableEntry<{ text: string }>[] } */
const REL_ELEM_III = [
  {min: 1, max: 2, data: async () => ({text: "Divinity (religion in general)"})},
  {min: 3, max: 4, data: async () => ({text: "Manaan (Lord of the Seas and King of Storms)"})},
  {min: 5, max: 6, data: async () => ({text: "Candle Dauphra (Matriarch of Manaan)"})},
  {min: 7, max: 8, data: async () => ({text: "On the Question of Stormfels (Aspect of Manaan?)"})},
  {min: 9, max: 10, data: async () => ({text: "Morr (God of the Dead and Dreams)"})},
  {min: 11, max: 12, data: async () => ({text: "Markwook (weird Stirlander doomsday cult)"})},
  {min: 13, max: 14, data: async () => ({text: "Order of the Shroud"})},
  {min: 15, max: 16, data: async () => ({text: "the Aurochs"})},
  {min: 17, max: 18, data: async () => ({text: "Fellowship of the Shroud (or Forsagh)"})},
  {min: 19, max: 20, data: async () => ({text: "Paul von Soleck (late Augur in the Cult of Morr)"})},
  {min: 21, max: 22, data: async () => ({text: "Myrmidia (Goddess of the Art and Science of War)"})},
  {min: 23, max: 24, data: async () => ({text: "the Order of the Eagle"})},
  {min: 25, max: 26, data: async () => ({text: "the Order of the Righteous Spear"})},
  {min: 27, max: 28, data: async () => ({text: "the Knights of the Blazing Sun"})},
  {min: 29, max: 30, data: async () => ({text: "Isabella Giovani (Chief Priest of Myrmidia)"})},
  {min: 31, max: 32, data: async () => ({text: "Juan Franco (Leader, Order of the Righteous Spear)"})},
  {min: 33, max: 34, data: async () => ({text: "Ranald (God of Tricksters, Thieves and Luck)"})},
  {min: 35, max: 36, data: async () => ({text: "Ranald the Dealer (or other aspect like the Prowler)"})},
  {min: 37, max: 38, data: async () => ({text: "Hans von Kleptor (powerful priest in Marienburg)"})},
  {min: 39, max: 40, data: async () => ({text: "Rhya and Taal (Lord of Nature, Mother of the Earth)"})},
  {min: 41, max: 42, data: async () => ({text: "Karog (or other aspect like Ramos or Haleth)"})},
  {min: 43, max: 44, data: async () => ({text: "Katrinelya (Hierarch of Rhya)"})},
  {min: 45, max: 46, data: async () => ({text: "Nya (Hierarch of Taal)"})},
  {min: 47, max: 48, data: async () => ({text: "Shallya (Goddess of Healing and Mercy)"})},
  {min: 49, max: 50, data: async () => ({text: "Order of the Bleeding Heart"})},
  {min: 51, max: 52, data: async () => ({text: "Shallya the Purifier (or other aspect like Salyak)"})},
  {min: 53, max: 54, data: async () => ({text: "Anja Gustavsson (High Priestess of Shallya)"})},
  {min: 55, max: 56, data: async () => ({text: "Sigmar (God of the Empire)"})},
  {min: 57, max: 58, data: async () => ({text: "Order of the Silver Hammer"})},
  {min: 59, max: 60, data: async () => ({text: "Order of the Torch"})},
  {min: 61, max: 62, data: async () => ({text: "Order of the Cleansing Flame"})},
  {min: 63, max: 64, data: async () => ({text: "Order of the Anvil"})},
  {min: 65, max: 66, data: async () => ({text: "Volkmar the Grim (previous Grand Theogonist)"})},
  {min: 67, max: 68, data: async () => ({text: "Johann Esmer (Grand Theogonist)"})},
  {min: 69, max: 70, data: async () => ({text: "Luthor Huss (a prophet of Sigmar)"})},
  {min: 71, max: 72, data: async () => ({text: "Valten (Sigmar reborn?)"})},
  {min: 73, max: 74, data: async () => ({text: "Ulric (Lord of Wolves, Winter and Battle)"})},
  {min: 75, max: 76, data: async () => ({text: "Order of the Howling Wolf"})},
  {min: 77, max: 78, data: async () => ({text: "Knights of the White Wolf"})},
  {min: 79, max: 80, data: async () => ({text: "Sons of Ulric"})},
  {min: 81, max: 82, data: async () => ({text: "Ursash (or other sub-cult, like the Snow King)"})},
  {min: 83, max: 84, data: async () => ({text: "Emil Valgeir (Arch-Priest of Ulric)"})},
  {min: 85, max: 86, data: async () => ({text: "Verena (Goddess of Wisdom and Justice)"})},
  {min: 87, max: 88, data: async () => ({text: "Order of Mysteries"})},
  {min: 89, max: 90, data: async () => ({text: "Clo (or other sub-cult like Renbaeth or Scriptsisti)"})},
  {min: 91, max: 92, data: async () => ({text: "Manfred Arcibald (High Priest of Verena)"})},
  {min: 93, max: 94, data: async () => ({text: "the Elves (Elven religion and pantheon)"})},
  {min: 95, max: 96, data: async () => ({text: "the Dwarfs (Dwarven religion and pantheon)"})},
  {min: 97, max: 98, data: async () => ({text: 'the Halflings (Halfling "religion" and "pantheon")'})},
  {min: 99, max: 100, data: async () => ({combine: true})}
];

// ---------------- Scholarship Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const SCHOLAR_ELEM_I = [
  {min: 1, max: 2, data: async () => ({text: ""})},
  {min: 3, max: 4, data: async () => ({text: "Accumulated"})},
  {min: 5, max: 6, data: async () => ({text: "Admirable"})},
  {min: 7, max: 8, data: async () => ({text: "Assembled"})},
  {min: 9, max: 10, data: async () => ({text: "Auspicious"})},
  {min: 11, max: 12, data: async () => ({text: "Celebrated"})},
  {min: 13, max: 14, data: async () => ({text: "Collected"})},
  {min: 15, max: 16, data: async () => ({text: "Compiled"})},
  {min: 17, max: 18, data: async () => ({text: "Complete"})},
  {min: 19, max: 20, data: async () => ({text: "Comprehensive"})},
  {min: 21, max: 22, data: async () => ({text: "Compulsory"})},
  {min: 23, max: 24, data: async () => ({text: "Elemental"})},
  {min: 25, max: 26, data: async () => ({text: "Empirical"})},
  {min: 27, max: 28, data: async () => ({text: "Essential"})},
  {min: 29, max: 30, data: async () => ({text: "Esteemed"})},
  {min: 31, max: 32, data: async () => ({text: "Experimental"})},
  {min: 33, max: 34, data: async () => ({text: "Exposed"})},
  {min: 35, max: 36, data: async () => ({text: "Faithful"})},
  {min: 37, max: 38, data: async () => ({text: "Final"})},
  {min: 39, max: 40, data: async () => ({text: "Finest"})},
  {min: 41, max: 42, data: async () => ({text: "First"})},
  {min: 43, max: 44, data: async () => ({text: "Fundamental"})},
  {min: 45, max: 46, data: async () => ({text: "Gallant"})},
  {min: 47, max: 48, data: async () => ({text: "Gathered"})},
  {min: 49, max: 50, data: async () => ({text: "Gilded"})},
  {min: 51, max: 52, data: async () => ({text: "Glorious"})},
  {min: 53, max: 54, data: async () => ({text: "Golden"})},
  {min: 55, max: 56, data: async () => ({text: "Grandiose"})},
  {min: 57, max: 58, data: async () => ({text: "Great"})},
  {min: 59, max: 60, data: async () => ({text: "Honest"})},
  {min: 61, max: 62, data: async () => ({text: "Illuminative"})},
  {min: 63, max: 64, data: async () => ({text: "Indispensable"})},
  {min: 65, max: 66, data: async () => ({text: "Laudable"})},
  {min: 67, max: 68, data: async () => ({text: "Noble"})},
  {min: 69, max: 70, data: async () => ({text: "Obligatory"})},
  {min: 71, max: 72, data: async () => ({text: "Perfect"})},
  {min: 73, max: 74, data: async () => ({text: "Primary"})},
  {min: 75, max: 76, data: async () => ({text: "Principals"})},
  {min: 77, max: 78, data: async () => ({text: "Required"})},
  {min: 79, max: 80, data: async () => ({text: "Respected"})},
  {min: 81, max: 82, data: async () => ({text: "Revealed"})},
  {min: 83, max: 84, data: async () => ({text: "Revered"})},
  {min: 85, max: 86, data: async () => ({text: "Rudimentary"})},
  {min: 87, max: 88, data: async () => ({text: "Splendid"})},
  {min: 89, max: 90, data: async () => ({text: "Tempting"})},
  {min: 91, max: 92, data: async () => ({text: "Truthful"})},
  {min: 93, max: 94, data: async () => ({text: "Unambiguous"})},
  {min: 95, max: 96, data: async () => ({text: "Uncovered"})},
  {min: 97, max: 98, data: async () => ({text: "Unearthed"})},
  {min: 99, max: 100, data: async () => ({text: "Valuable"})}
];

/** @type {TableEntry<{ text: string }>[] } */
const SCHOLAR_ELEM_II = [
  {min: 1, max: 2, data: async () => ({text: "Colloquia on"})},
  {min: 3, max: 4, data: async () => ({text: "Accounts of"})},
  {min: 5, max: 6, data: async () => ({text: "Arguments on"})},
  {min: 7, max: 8, data: async () => ({text: "Conceptions on"})},
  {min: 9, max: 10, data: async () => ({text: "Considerations on"})},
  {min: 11, max: 12, data: async () => ({text: "Demonstrations of"})},
  {min: 13, max: 14, data: async () => ({text: "Discourse on"})},
  {min: 15, max: 16, data: async () => ({text: "Dissertation on"})},
  {min: 17, max: 18, data: async () => ({text: "Elucidation of"})},
  {min: 19, max: 20, data: async () => ({text: "Enquiries on"})},
  {min: 21, max: 22, data: async () => ({text: "Erudition on"})},
  {min: 23, max: 24, data: async () => ({text: "Essays on"})},
  {min: 25, max: 26, data: async () => ({text: "Examinations of"})},
  {min: 27, max: 28, data: async () => ({text: "Exposé of"})},
  {min: 29, max: 30, data: async () => ({text: "Expositions of"})},
  {min: 31, max: 32, data: async () => ({text: "Findings on"})},
  {min: 33, max: 34, data: async () => ({text: "Foresights of"})},
  {min: 35, max: 36, data: async () => ({text: "Hypothesis on"})},
  {min: 37, max: 38, data: async () => ({text: "Insights into"})},
  {min: 39, max: 40, data: async () => ({text: "Knowledge of"})},
  {min: 41, max: 42, data: async () => ({text: "Labours on"})},
  {min: 43, max: 44, data: async () => ({text: "Laws of"})},
  {min: 45, max: 46, data: async () => ({text: "Learning on"})},
  {min: 47, max: 48, data: async () => ({text: "Lectures on"})},
  {min: 49, max: 50, data: async () => ({text: "Lessons on"})},
  {min: 51, max: 52, data: async () => ({text: "Notes on"})},
  {min: 53, max: 54, data: async () => ({text: "Observations on"})},
  {min: 55, max: 56, data: async () => ({text: "Papers on"})},
  {min: 57, max: 58, data: async () => ({text: "Perceptions of"})},
  {min: 59, max: 60, data: async () => ({text: "Perspectives on"})},
  {min: 61, max: 62, data: async () => ({text: "Procedures on"})},
  {min: 63, max: 64, data: async () => ({text: "Properties of"})},
  {min: 65, max: 66, data: async () => ({text: "Proposals on"})},
  {min: 67, max: 68, data: async () => ({text: "Records of"})},
  {min: 69, max: 70, data: async () => ({text: "Research on"})},
  {min: 71, max: 72, data: async () => ({text: "Revelations on"})},
  {min: 73, max: 74, data: async () => ({text: "Rudiments of"})},
  {min: 75, max: 76, data: async () => ({text: "Scholarship on"})},
  {min: 77, max: 78, data: async () => ({text: "Studies on"})},
  {min: 79, max: 80, data: async () => ({text: "Suggestions on"})},
  {min: 81, max: 82, data: async () => ({text: "Teachings on"})},
  {min: 83, max: 84, data: async () => ({text: "Testimonies of"})},
  {min: 85, max: 86, data: async () => ({text: "Theorems on"})},
  {min: 87, max: 88, data: async () => ({text: "Theories on"})},
  {min: 89, max: 90, data: async () => ({text: "Thesis on"})},
  {min: 91, max: 92, data: async () => ({text: "Treatise on"})},
  {min: 93, max: 94, data: async () => ({text: "Understanding of"})},
  {min: 95, max: 96, data: async () => ({text: "Wisdom of"})},
  {min: 97, max: 98, data: async () => ({text: "Visions of"})},
  {min: 99, max: 100, data: async () => ({text: "Writings on"})}
];

/** @type {TableEntry<{ text: string, combine?: boolean }>[] } */
const SCHOLAR_ELEM_III = [
  {min: 1, max: 2, data: async () => ({text: "the Contemporary Culture of the Dwarfs"})},
  {min: 3, max: 4, data: async () => ({text: "the History of the Dwarfs"})},
  {min: 5, max: 6, data: async () => ({text: "the Contemporary Culture of the Halflings"})},
  {min: 7, max: 8, data: async () => ({text: "the History of the Halflings"})},
  {min: 9, max: 10, data: async () => ({text: "the History of the Moot and the Halfling Elector"})},
  {min: 11, max: 12, data: async () => ({text: "the Contemporary Culture of the Elves"})},
  {min: 13, max: 14, data: async () => ({text: "the History of the Elves"})},
  {min: 15, max: 16, data: async () => ({text: "the Recent History of the Empire"})},
  {min: 17, max: 18, data: async () => ({text: "the Ancient History of the Empire"})},
  {min: 19, max: 20, data: async () => ({text: "the Pre-Sigmarite History of the Empire"})},
  {min: 21, max: 22, data: async () => ({text: "the Stubborn Defence of Ulric and Sigmar"})},
  {min: 23, max: 24, data: async () => ({text: "How to Raise Children"})},
  {min: 25, max: 26, data: async () => ({text: "the Imperial Electoral System"})},
  {min: 27, max: 28, data: async () => ({text: `${(await generateLanguage()).name} Lexicon`})},
  {min: 29, max: 30, data: async () => ({text: "Cartography"})},
  {min: 31, max: 32, data: async () => ({text: "Mining Engineering"})},
  {min: 33, max: 34, data: async () => ({text: "Astronomy"})},
  {min: 35, max: 36, data: async () => ({text: "Engineering"})},
  {min: 37, max: 38, data: async () => ({text: "Military Strategy"})},
  {min: 39, max: 40, data: async () => ({text: "Shipbuilding"})},
  {min: 41, max: 42, data: async () => ({text: "Embalming"})},
  {min: 43, max: 44, data: async () => ({text: "Candlemaking"})},
  {min: 45, max: 46, data: async () => ({text: "Fishing"})},
  {min: 47, max: 48, data: async () => ({text: "Boxing"})},
  {min: 49, max: 50, data: async () => ({text: "Calligraphy"})},
  {min: 51, max: 52, data: async () => ({text: "Cooping"})},
  {min: 53, max: 54, data: async () => ({text: "Stoneworking"})},
  {min: 55, max: 56, data: async () => ({text: "Tanning"})},
  {min: 57, max: 58, data: async () => ({text: "Goldsmithing"})},
  {min: 59, max: 60, data: async () => ({text: "Smithing"})},
  {min: 61, max: 62, data: async () => ({text: "Apothecary"})},
  {min: 63, max: 64, data: async () => ({text: "Architecture"})},
  {min: 65, max: 66, data: async () => ({text: "Art"})},
  {min: 67, max: 68, data: async () => ({text: "Brewery"})},
  {min: 69, max: 70, data: async () => ({text: "Carpentry"})},
  {min: 71, max: 72, data: async () => ({text: "Dancing"})},
  {min: 73, max: 74, data: async () => ({text: "Etiquette of the Bourgeoisie"})},
  {min: 75, max: 76, data: async () => ({text: "Farming"})},
  {min: 77, max: 78, data: async () => ({text: "Foreign Relations and Trade"})},
  {min: 79, max: 80, data: async () => ({text: "Genealogy and Heraldry"})},
  {min: 81, max: 82, data: async () => ({text: "Haute Culture"})},
  {min: 83, max: 84, data: async () => ({text: "Herbalism"})},
  {min: 85, max: 86, data: async () => ({text: "History"})},
  {min: 87, max: 88, data: async () => ({text: "Law"})},
  {min: 89, max: 90, data: async () => ({text: "Music"})},
  {min: 91, max: 92, data: async () => ({text: "Prospecting"})},
  {min: 93, max: 94, data: async () => ({text: "Trade"})},
  {min: 95, max: 96, data: async () => ({text: "Weather and Climate"})},
  {min: 97, max: 98, data: async () => ({text: "Weaving and Sewing"})},
  {min: 99, max: 100, data: async () => ({text: "Multidisciplinary Work", combine: true})}
];

// ---------------- Forbidden Book Data ---------------- //
/** @type {TableEntry<{ text: string }>[] } */
const FORBIDDEN_ELEM_I = [
  {min: 1, max: 4, data: async () => ({text: "The"})},
  {min: 5, max: 8, data: async () => ({text: "Absolute"})},
  {min: 9, max: 12, data: async () => ({text: "Auspicious"})},
  {min: 13, max: 16, data: async () => ({text: "Baneful"})},
  {min: 17, max: 20, data: async () => ({text: "Black"})},
  {min: 21, max: 24, data: async () => ({text: "Crimson"})},
  {min: 25, max: 28, data: async () => ({text: "Dark"})},
  {min: 29, max: 32, data: async () => ({text: "Essential"})},
  {min: 33, max: 36, data: async () => ({text: "Final"})},
  {min: 37, max: 40, data: async () => ({text: "Gilded"})},
  {min: 41, max: 44, data: async () => ({text: "Golden"})},
  {min: 45, max: 48, data: async () => ({text: "Grey"})},
  {min: 49, max: 52, data: async () => ({text: "Luminous"})},
  {min: 53, max: 56, data: async () => ({text: "Magic"})},
  {min: 57, max: 60, data: async () => ({text: "My Liege’s"})},
  {min: 61, max: 64, data: async () => ({text: "My Lord’s"})},
  {min: 65, max: 68, data: async () => ({text: "Ominous"})},
  {min: 69, max: 72, data: async () => ({text: "Portentous"})},
  {min: 73, max: 76, data: async () => ({text: "Primal"})},
  {min: 77, max: 80, data: async () => ({text: "Purple"})},
  {min: 81, max: 84, data: async () => ({text: "Red"})},
  {min: 85, max: 88, data: async () => ({text: "Shining"})},
  {min: 89, max: 92, data: async () => ({text: "Ultimate"})},
  {min: 93, max: 96, data: async () => ({text: "White"})},
  {min: 97, max: 100, data: async () => ({text: "Yellow"})}
];

/** @type {TableEntry<{ text: string }>[] } */
const FORBIDDEN_ELEM_II = [
  {min: 1, max: 4, data: async () => ({text: "Aethyr"})},
  {min: 5, max: 8, data: async () => ({text: "Bane"})},
  {min: 9, max: 12, data: async () => ({text: "Chronicles"})},
  {min: 13, max: 16, data: async () => ({text: "Confession"})},
  {min: 17, max: 20, data: async () => ({text: "Dawn"})},
  {min: 21, max: 24, data: async () => ({text: "Fang"})},
  {min: 25, max: 28, data: async () => ({text: "Heart"})},
  {min: 29, max: 32, data: async () => ({text: "Horn"})},
  {min: 33, max: 36, data: async () => ({text: "Light"})},
  {min: 37, max: 40, data: async () => ({text: "Maelstrom"})},
  {min: 41, max: 44, data: async () => ({text: "Moon"})},
  {min: 45, max: 48, data: async () => ({text: "Mysteries"})},
  {min: 49, max: 52, data: async () => ({text: "Omen"})},
  {min: 53, max: 56, data: async () => ({text: "Passion"})},
  {min: 57, max: 60, data: async () => ({text: "Principles"})},
  {min: 61, max: 64, data: async () => ({text: "Shadow"})},
  {min: 65, max: 68, data: async () => ({text: "Souls"})},
  {min: 69, max: 72, data: async () => ({text: "Sun"})},
  {min: 73, max: 76, data: async () => ({text: "Supremacy"})},
  {min: 77, max: 80, data: async () => ({text: "Tide"})},
  {min: 81, max: 84, data: async () => ({text: "Time"})},
  {min: 85, max: 88, data: async () => ({text: "Ultimatum"})},
  {min: 89, max: 92, data: async () => ({text: "Wake"})},
  {min: 93, max: 96, data: async () => ({text: "Wind"})},
  {min: 97, max: 100, data: async () => ({text: "Words"})}
];

/** @type {TableEntry<{ topic: string, insanity?: boolean, grimoires?: boolean }>[] } */
const FORBIDDEN_TOPIC = [
  {min: 1, max: 4, data: async () => ({topic: "Daemonology", insanity: true})},
  {min: 5, max: 8, data: async () => ({topic: "Necromancy", insanity: true})},
  {min: 9, max: 12, data: async () => ({topic: "Ruinous Powers", insanity: true})},
  {min: 13, max: 16, data: async () => ({topic: "Tzeentch (The Changer of the Ways)", insanity: true})},
  {min: 17, max: 20, data: async () => ({topic: "Nurgle (Lord of All Fevers and Plague)", insanity: true})},
  {min: 21, max: 24, data: async () => ({topic: "Khorne (The Angry Blood God)", insanity: true})},
  {min: 25, max: 28, data: async () => ({topic: "Slaanesh (Lord of Pleasures)", insanity: true})},
  {min: 29, max: 32, data: async () => ({topic: "Horned Rat", insanity: true})},
  {min: 33, max: 36, data: async () => ({topic: "Khaine (God of Murder, or an Aspect of Khorne?)", insanity: true})},
  {min: 37, max: 40, data: async () => ({topic: "Malal (Renegade Chaos deity)", insanity: true})},
  {min: 41, max: 44, data: async () => ({topic: "Stromfels (God of Wrecks and Piracy)", insanity: true})},
  {min: 45, max: 48, data: async () => ({topic: "Magic"})},
  {min: 49, max: 52, data: async () => ({topic: "Prayers and Miracles (Divine Magic?)"})},
  {min: 53, max: 56, data: async () => ({topic: "Grimoire (Magic Ritual)"})},
  {
    min: 57,
    max: 60,
    data: async () => ({
      topic: `Grimoire (Petty Magic, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 61,
    max: 64,
    data: async () => ({
      topic: `Grimoire (Beasts, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 65,
    max: 68,
    data: async () => ({
      topic: `Grimoire (Death, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 69,
    max: 72,
    data: async () => ({
      topic: `Grimoire (Fire, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 73,
    max: 76,
    data: async () => ({
      topic: `Grimoire (Heavens, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 77,
    max: 80,
    data: async () => ({
      topic: `Grimoire (Life, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 81,
    max: 84,
    data: async () => ({
      topic: `Grimoire (Light, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 85,
    max: 88,
    data: async () => ({
      topic: `Grimoire (Metal, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 89,
    max: 92,
    data: async () => ({
      topic: `Grimoire (Shadow, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`
    })
  },
  {
    min: 93,
    max: 96,
    data: async () => ({
      topic: `Grimoire (Chaos, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`,
      insanity: true
    })
  },
  {
    min: 97,
    max: 100,
    data: async () => ({
      topic: `Grimoire (Necromancy, ${(await rollFromTable(SPELL_NUMBER)).number} spells, ${(await rollFromTable(SPELL_CN)).number} CN)`,
      insanity: true
    })
  }
];

/** @type {TableEntry<{ number: number}>[] } */
const SPELL_NUMBER = [
  {min: 1, max: 40, data: async () => ({number: 3})},
  {min: 41, max: 80, data: async () => ({number: 4})},
  {min: 81, max: 95, data: async () => ({number: 5})},
  {min: 96, max: 100, data: async () => ({number: 6})}
];

/** @type {TableEntry<{ number: number}>[] } */
const SPELL_CN = [
  {min: 1, max: 30, data: async () => ({number: 3})},
  {min: 31, max: 50, data: async () => ({number: 4})},
  {min: 51, max: 60, data: async () => ({number: 5})},
  {min: 61, max: 70, data: async () => ({number: 6})},
  {min: 71, max: 80, data: async () => ({number: 7})},
  {min: 81, max: 85, data: async () => ({number: 8})},
  {min: 86, max: 90, data: async () => ({number: 9})},
  {min: 91, max: 95, data: async () => ({number: 10})},
  {min: 96, max: 100, data: async () => ({number: 12})}
];

// ---------------- Library Data ---------------- //
const LIBRARY_TYPES = {
  TEMPLE: {
    name: "Temple Library",
    topics: {
      Biography: {weight: 50 * 5.5},
      Bestiary: {weight: 50 * 5.5},
      Cookbook: {weight: 30 * 3},
      Guidebook: {weight: 50 * 5.5},
      Religious: {weight: 100 * 50.5},
      Scholarship: {weight: 70 * 11},
      Forbidden: {weight: 30 * 11}
    }
  },
  TOWN: {
    name: "Town’s Library",
    topics: {
      Biography: {weight: 50 * 5.5},
      Guidebook: {weight: 50 * 5.5},
      Religious: {weight: 50 * 3},
      Scholarship: {weight: 30 * 3},
      Records: {weight: 100 * 50.5}
    }
  },
  UNIVERSITY: {
    name: "University’s Library",
    topics: {
      Biography: {weight: 100 * 50.5},
      Bestiary: {weight: 100 * 50.5},
      Fiction: {weight: 100 * 50.5},
      Guidebook: {weight: 100 * 50.5},
      Religious: {weight: 100 * 50.5},
      Scholarship: {weight: 100 * 500.5},
      Records: {weight: 100 * 50.5},
      Forbidden: {weight: 50 * 50.5}
    }
  },
  PRIVATE: {
    name: "Private Library",
    topics: {
      Biography: {weight: 50 * 5.5},
      Bestiary: {weight: 30 * 3},
      Cookbook: {weight: 70 * 3},
      Fiction: {weight: 70 * 11},
      Guidebook: {weight: 30 * 3},
      Religious: {weight: 30 * 3},
      Scholarship: {weight: 20 * 3},
      Forbidden: {weight: 5 * 3}
    }
  },
  FORBIDDEN: {
    name: "Forbidden Library",
    topics: {
      Biography: {weight: 50 * 3},
      Bestiary: {weight: 50 * 3},
      Guidebook: {weight: 50 * 3},
      Religious: {weight: 50 * 3},
      Forbidden: {weight: 100 * 5.5}
    }
  }
};

// ---------------- Title Generators ---------------- //
async function generateData(classification) {
  switch (classification) {
    case "Biography":
      return generateBiographyData();
    case "Bestiary":
      return generateBestiaryData();
    case "Cookbook":
      return generateCookbookData();
    case "Guidebook":
      return generateGuidebookData();
    case "Fiction":
      return generateFictionData();
    case "Religious":
      return generateReligiousData();
    case "Scholarship":
      return generateScholarshipData();
    case "Forbidden":
      return generateForbiddenData();
  }
}

/**
 * Build title data for a biography.
 * @returns {Promise<{title: string, subtitle: string, authorsSentiment: string}>}
 */
async function generateBiographyData() {
  let e1 = await rollFromTable(BIO_ELEM_I);
  if (e1.reroll) {
    e1 = await rollFromTable(BIO_ELEM_I, 0, 96);
    e1.reversed = true;
  }
  let e2 = await rollFromTable(BIO_ELEM_II);
  if (e2.reroll) {
    e2 = await rollFromTable(BIO_ELEM_II, 0, 96);
    e2.reversed = true;
  }

  const e3 = await rollFromTable(BIO_ELEM_III);
  const e4 = await rollFromTable(BIO_ELEM_IV);
  const e5 = await rollFromTable(BIO_ELEM_V);

  let first = e1.text;
  let second = e2.text;

  if (e1.reversed || e2.reversed) {
    [first, second] = [second, first];
  }

  let main = [first, second, e3.text].filter(Boolean).join(" ");
  main = main.replace("(on) of", "on");
  return {
    title: main,
    subtitle: e4.text,
    hidden: {
      "Author's Sentiment": e5.text
    }
  };
}

/**
 * Build title data for a bestiary.
 * @returns {Promise<{title: string, subtitle: string, species: string, speciesFocus: string}>}
 */
async function generateBestiaryData() {
  let e1 = await rollFromTable(BEST_ELEM_I);
  let e2 = await rollFromTable(BEST_ELEM_II);
  let title = `${e1.text} ${e2.text}`;
  if (e1.combine || e2.combine) {
    let e1a = await rollFromTable(BEST_ELEM_I, 0, 97);
    let e1b = await rollFromTable(BEST_ELEM_II, 0, 97);
    let e2a = await rollFromTable(BEST_ELEM_I, 0, 97);
    let e2b = await rollFromTable(BEST_ELEM_II, 0, 97);
    title = `${e1a.text} ${e1b.text} and ${e2a.text} ${e2b.text}`;
  }
  let e3 = await rollFromTable(BEST_ELEM_III);
  if (e3.combine) {
    e3 = await rollFromTable(BEST_ELEM_III, 0, 97);
    const e3b = await rollFromTable(BEST_ELEM_III, 0, 97);
    e3.text = `${e3.text} and ${e3b.text}`;
    e3.species = `${e3.species}; ${e3b.species}`;
  }
  title = `${title} of ${e3.text}`;
  const e4 = await rollFromTable(BEST_ELEM_IV);
  const e5 = await rollFromTable(BEST_ELEM_V);
  return {
    title: title,
    subtitle: e4.text,
    hidden: {
      Species: e3.species,
      "Species Focus": e5.text
    }
  };
}

/**
 * Build title data for a cookbook.
 * @returns {Promise<{title: string, subtitle?: string}>}
 */
async function generateCookbookData() {
  let e1 = await rollFromTable(COOK_ELEM_I);
  let e2 = await rollFromTable(COOK_ELEM_II);
  let title = `${e1.text} ${e2.text}`;
  if (e1.combine || e2.combine) {
    let e1a = await rollFromTable(COOK_ELEM_I, 0, 95);
    let e1b = await rollFromTable(COOK_ELEM_II, 0, 95);
    let e2a = await rollFromTable(COOK_ELEM_I, 0, 95);
    let e2b = await rollFromTable(COOK_ELEM_II, 0, 95);
    title = `${e1a.text} ${e1b.text} and ${e2a.text} ${e2b.text}`;
  }
  let e3 = await rollFromTable(COOK_ELEM_III);
  if (e3.origin) return {title: `${title}: ${e3.text}`};
  if (e3.prefix) return {title: `${e3.prefix} ${title}`};
  return {
    title: `${title} from ${await generateOrigin()}`,
    subtitle: e3.text
  };
}

/**
 * Build title data for a guidebook.
 * @returns {Promise<{title: string, subtitle?: string}>}
 */
async function generateGuidebookData() {
  let e1 = await rollFromTable(GUIDE_ELEM_I);
  let e2 = await rollFromTable(GUIDE_ELEM_II);
  let title = `${e1.text} ${e2.text}`;
  if (e1.combine || e2.combine) {
    let e1a = await rollFromTable(GUIDE_ELEM_I, 0, 96);
    let e1b = await rollFromTable(GUIDE_ELEM_II, 0, 96);
    let e2a = await rollFromTable(GUIDE_ELEM_I, 0, 96);
    let e2b = await rollFromTable(GUIDE_ELEM_II, 0, 96);
    title = `${e1a.text} ${e1b.text} and ${e2a.text} ${e2b.text}`;
  }
  title = title.trim().replace("from and", "and");
  let e3 = await rollFromTable(GUIDE_ELEM_III);
  if (e3.origin) {
    title = title.trim().replace(/ in$| of$| from$/, "");
    return {title: `${title}: ${e3.text}`};
  }
  return {
    title: `${title} ${await generateOrigin()}`,
    subtitle: e3.text
  };
}

/**
 * Build title data for a fiction book.
 * @returns {Promise<{title: string, synopsis: string}>}
 */
async function generateFictionData() {
  const e1 = await rollFromTable(FICTION_ELEM_I);
  const e2 = await rollFromTable(FICTION_ELEM_II);
  const e3 = await rollFromTable(FICTION_ELEM_III);
  if (e2.roll % 2 === 0) e2.text = pluralize(e2.text);
  return {
    title: `${e1.text} ${e2.text}`,
    hidden: {
      Synopsis: e3.text
    }
  };
}

/**
 * Build title data for a religious text.
 * @returns {Promise<{title: string}>}
 */
async function generateReligiousData() {
  let e1 = await rollFromTable(REL_ELEM_I);
  let e2 = await rollFromTable(REL_ELEM_II);
  let e3 = await rollFromTable(REL_ELEM_III);
  if (e1.combine || e2.combine || e3.combine) {
    let e1a = await rollFromTable(REL_ELEM_I, 0, 98);
    let e1b = await rollFromTable(REL_ELEM_II, 0, 98);
    let e2a = await rollFromTable(REL_ELEM_I, 0, 98);
    let e2b = await rollFromTable(REL_ELEM_II, 0, 98);
    let e3 = await rollFromTable(REL_ELEM_III, 0, 98);
    return {title: `${e1a.text} ${e2a.text} of ${e1b.text} ${e2b.text} of ${e3.text}`};
  }
  return {title: `${e1.text} ${e2.text} of ${e3.text}`};
}

/**
 * Build title data for a scholarly text.
 * @returns {Promise<{title: string}>}
 */
async function generateScholarshipData() {
  let e1 = await rollFromTable(SCHOLAR_ELEM_I);
  let e2 = await rollFromTable(SCHOLAR_ELEM_II);
  let e3 = await rollFromTable(SCHOLAR_ELEM_III);
  if (e3.combine) {
    let e3a = await rollFromTable(SCHOLAR_ELEM_III, 0, 98);
    let e3b = await rollFromTable(SCHOLAR_ELEM_III, 0, 98);
    return {title: `${e1.text} ${e2.text} ${e3a.text} and ${e3b.text}`};
  }
  return {title: `${e1.text} ${e2.text} ${e3.text}`};
}

/**
 * Build title data for a forbidden text.
 * @returns {Promise<{title: string, topic: string, insanity: boolean}>}
 */
async function generateForbiddenData() {
  let e1 = await rollFromTable(FORBIDDEN_ELEM_I);
  let e2 = await rollFromTable(FORBIDDEN_ELEM_II);
  let e3 = await rollFromTable(FORBIDDEN_TOPIC);
  return {
    title: `${e1.text} ${e2.text}`,
    insanity: e3.insanity || false,
    hidden: {
      Topic: e3.topic
    }
  };
}

/**
 * Generate an author name.
 * @returns {Promise<string>}
 */
async function generateName() {
  try {
    return NameGenWfrp.generateName({species: "human"});
  } catch {
    return "Johann Schmidt";
  }
}

/**
 * Roll an origin location.
 * @returns {Promise<string>}
 */
async function generateOrigin() {
  return (await rollFromTable(ORIGIN_TABLE)).name;
}

/**
 * Roll a language name.
 * @returns {Promise<string>}
 */
async function generateLanguage() {
  return await rollFromTable(LANGUAGE_TABLE);
}

/**
 * @returns {Promise<{notableFeatures: (*&{roll: number})[]|*|{roll: number}, encumbrance: *, locked: *}>}
 */
async function generateNotableFeatures() {
  const feature = await rollFromTable(NOTABLE_FEATURES_TABLE);
  const notableFeatures = typeof feature === "object" ? [feature] : feature;
  const encumbrance = notableFeatures.reduce((acc, f) => acc * (f.encMult ?? 1), 1);
  const locked = notableFeatures.some((f) => f.locked);
  return {notableFeatures, encumbrance, locked};
}

/**
 * @returns {Promise<(*&{roll: number})[]>}
 */
async function generatePenmanshipPeculiarity() {
  const feature = await rollFromTable(PENMANSHIP_PECULIARITIES_TABLE);
  return typeof feature === "object" ? [feature] : feature;
}

async function generateAge(options) {
  return options?.minAge
    ? await rollFromTable(AGE_TABLE, 0, 100, (a) => a.age >= options?.minAge && a.unit === (options?.minAgeUnit ?? "year(s)"))
    : await rollFromTable(AGE_TABLE);
}

async function generateType(classification, age) {
  // Forbidden books are never printed
  // Printing only started less than 200 years ago
  return classification === "Forbidden" || (age.age >= 200 && age.unit === "year(s)") ? BOOK_TYPE_ILLUMINATED : await rollFromTable(BOOK_TYPE_TABLE);
}

// ---------------- Readable String Features ---------------- //
function polyglot(text, polyLang = undefined) {
  if (!polyLang) return text;
  return `<span class="polyglot-journal" data-tooltip="${polyLang}" data-tooltip-direction="UP" data-language="${polyLang.toLowerCase()}">${text}</span>`;
}

function addDynamicFeatures(features) {
  let description = "";
  for (let [key, value] of Object.entries(features)) {
    if (value === []) continue;
    value = Array.isArray(value) && value.length === 1 ? value[0] : value;
    if (Array.isArray(value)) {
      description += `<p><strong>${key}:</strong> <ul>${value.map((v) => `<li>${v}</li>`).join("")}</ul></p>`;
    } else {
      description += `<p><strong>${key}:</strong> ${value}</p>`;
    }
  }
  return description;
}

/**
 * @param {Book} book
 * @param {string} polyLang
 * @returns {string}
 */
function getReadableDescription(book, polyLang = undefined) {
  let title = book?.subtitle ? `${book.title}: ${book.subtitle}` : book.title;
  let type = `${book.classification} (${book.type})`;
  let pages = !book?.condition?.illegible ? book?.pages : `${book?.pages} (${Math.round((book?.pages * (100 - book?.condition.illegible)) / 100)})`;
  let age = `${book.age.label} (~${book.age.age} ${book.age.unit})`;

  let data =
    `<p><strong>Title:</strong> ${polyglot(title, polyLang)}</p>` +
    `<p><strong>Type:</strong> ${polyglot(type, polyLang)}</p>` +
    `<p><strong>Pages:</strong> ${pages}</p>` +
    `<p><strong>Age:</strong> ${age}</p>` +
    `<p><strong>Author:</strong> ${polyglot(book.author, polyLang)}</p>` +
    `<p><strong>Language:</strong> ${polyglot(book?.language?.name, polyLang)}</p>` +
    `<p><strong>Origin:</strong> ${polyglot(book.origin, polyLang)}</p>` +
    `<p><strong>Condition:</strong> ${book.condition.label}</p>` +
    `${addDynamicFeatures(book.visible)}`;
  return data;
}

/**
 * @param {Book} book
 * @returns {string}
 */
function getReadableGMDescription(book) {
  return `<p><strong>Quality:</strong> ${book.quality}</p>${addDynamicFeatures(book.hidden)}`;
}

// ---------------- Book Generator ---------------- //
/**
 * @typedef {Object} Book
 * @property {string} classification
 * @property {string} title
 * @property {number} pages
 * @property {string} quality
 * @property {string} type
 * @property {number} encumbrance
 * @property {BookAge} age
 * @property {BookCondition} condition
 * @property {string} language
 * @property {number} estimatedValueGC
 */
/**
 * @param options
 * @returns {Promise<Book>}
 */
async function generateBook(options = {}) {
  const classification = options?.classification ?? (await rollFromTable(CLASSIFICATION_TABLE).value);
  const quality = await rollFromTable(QUALITY_TABLE);
  const age = await generateAge(options);
  const type = await generateType(classification, age);
  const condition = await rollFromTable(CONDITION_TABLE, age.condMod);
  const language = await generateLanguage();
  const author = await generateName();
  const origin = await generateOrigin();
  const {notableFeatures, encumbrance, locked} = await generateNotableFeatures();
  const penmanshipPeculiarities = await generatePenmanshipPeculiarity();
  const rwModifier = penmanshipPeculiarities.reduce((acc, f) => acc + (f.rwModifier ?? 0), 0);

  const visible = {};
  const hidden = {
    "Read/Write Modifier": rwModifier >= 0 ? `+${rwModifier}` : rwModifier
  };
  let additionalData = await generateData(classification);
  for (let [key, value] of Object.entries(additionalData?.hidden ?? {})) {
    hidden[key] = value;
  }

  let conditionFeatures = [
    condition?.oddSmell ? {visible: `Odd Smell`} : null,
    condition?.notes ? {hidden: `Notes scribbled on some of the pages`} : null,
    condition?.illegible ? {visible: `${condition.illegible}% of the text is illegible`} : null,
    condition?.spineBroken ? {visible: `Spine is broken`} : null,
    condition?.missingPages ? {visible: `${condition.missingPages} pages are missing`} : null,
    condition?.missingCover ? {visible: `cover is missing`} : null
  ].filter(Boolean);

  const visibleFeatures = [...notableFeatures.map((f) => f?.visible).filter(Boolean), ...conditionFeatures.map((f) => f?.visible).filter(Boolean)];
  if (visibleFeatures?.length) visible["Features"] = visibleFeatures;

  const hiddenFeatures = [
    ...notableFeatures.map((f) => f?.hidden).filter(Boolean),
    ...penmanshipPeculiarities.map((f) => f?.hidden).filter(Boolean),
    ...conditionFeatures.map((f) => f?.hidden).filter(Boolean)
  ];
  if (hiddenFeatures?.length) hidden["Features"] = hiddenFeatures;
  if (additionalData?.insanity) hidden["Danger"] = `Prolonged reading may cause mental instability or corruption`;

  return {
    title: additionalData.title.trim(),
    subtitle: additionalData?.subtitle,
    classification,
    pages: (await d(10)) * 50,
    quality: quality.name,
    type: type.type,
    encumbrance,
    locked,
    age,
    condition,
    visible,
    hidden,
    origin,
    author,
    language: language,
    price: Math.max(0, type.baseValue * (1 + quality.valueMod / 100) * (1 + condition.valueMod / 100) * (1 + language.valueMod / 100))
  };
}

async function saveBook(book, options = {}) {
  let polyLang = game.modules.get("polyglot")?.active ? book.language?.code : undefined;

  let name = options?.index ? `Unknown Book ${options.index}` : "Unknown Book";
  await Item.create({
    name,
    img: "icons/sundries/books/book-worn-brown-grey.webp",
    type: "trapping",
    "system.encumbrance.value": book.encumbrance,
    "system.price.gc": Math.floor(book.price),
    "system.price.ss": Math.floor((book.price * 20) % 20),
    "system.price.bp": Math.floor((book.price * 240) % 12),
    "system.description.value": getReadableDescription(book, polyLang),
    "system.gmdescription.value": getReadableGMDescription(book),
    "system.trappingType.value": "booksAndDocuments",
    folder: options?.folder?.id
  });
  return book;
}

// ---------------- Library Generator ---------------- //
/**
 * Generate a library of books by topic distribution.
 * @param {string} typeKey
 * @param {number} size
 * @param {object} [options]
 * @returns {Promise<{name: string, topics: object}>}
 */
async function generateLibrary(typeKey, size, options = {}) {
  const {name, topics} = clone(LIBRARY_TYPES[typeKey]);

  const entries = Object.entries(topics);
  let sumWeight = 0;
  for (const [, t] of entries) sumWeight += t.weight;

  let allocated = 0;
  for (const [, info] of entries) {
    info.size = Math.floor((info.weight / sumWeight) * size);
    info.books = [];
    allocated += info.size;
  }

  let remainder = size - allocated;
  for (let i = 0; remainder > 0; i++, remainder--) {
    entries[i % entries.length][1].size++;
  }

  for (const [topic, info] of entries) {
    if (topic === "Records") continue;
    info.books = await Promise.all(Array.from({length: info.size}, () => generateBook({classification: topic, ...options})));
  }

  return {name, topics};
}

async function saveLibrary(typeKey, size, options = {}) {
  const library = await generateLibrary(typeKey, size, options);
  const libraryFolder = await Folder.create({name: "Library", type: "Item"});
  let index = 0;
  for (let [topic, info] of Object.entries(library.topics)) {
    let bookFolder = game.folders.find((f) => f.name === topic);
    if (!bookFolder) {
      bookFolder = await Folder.create({
        name: topic,
        type: "Item",
        folder: libraryFolder?.id
      });
    }
    for (const book of info.books) {
      await saveBook(book, {folder: bookFolder, index});
      index++;
    }
  }
}

// ---------------- Main ---------------- //
async function main() {
  await saveLibrary("FORBIDDEN", 30, {minAge: 200});
}

main();
