/* ==========
* MACRO: Random Sea Weather Generator
* VERSION: 2.0.0
* AUTHOR: Robak132
* DESCRIPTION: Generates weather with Sea of Claws rules.
========== */

class Direction {
  static NORTH = new Direction(0, 'North');
  static EAST = new Direction(1, 'East');
  static SOUTH = new Direction(2, 'South');
  static WEST = new Direction(3, 'West');

  static values = [
    Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];

  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  static fromKey(key) {
    return Direction.values[key];
  }

  static fromValue(value) {
    return Direction.values.find(e => e.value === value);
  }

  opposite() {
    return Direction.values[(this.key + 2) % 4];
  }

  getAdj() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.' + this.value + 'Adj');
  }

  getName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.' + this.value);
  }
}

class WindStrength {
  static DOLDRUMS = new WindStrength(0, 'Doldrums');
  static LIGHT_BREEZE = new WindStrength(1, 'LightBreeze');
  static FRESH_BREEZE = new WindStrength(2, 'FreshBreeze');
  static NEAR_GALE = new WindStrength(3, 'NearGale');
  static STRONG_GALE = new WindStrength(4, 'StrongGale');
  static VIOLENT_STORM = new WindStrength(5, 'ViolentStorm');

  static values = [
    WindStrength.DOLDRUMS,
    WindStrength.LIGHT_BREEZE,
    WindStrength.FRESH_BREEZE,
    WindStrength.NEAR_GALE,
    WindStrength.STRONG_GALE,
    WindStrength.VIOLENT_STORM];

  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  static fromKey(key) {
    return WindStrength.values[key];
  }

  static fromValue(value) {
    return WindStrength.values.find(e => e.value === value);
  }

  async randomChange() {
    if (this.key === WindStrength.values.length - 1) {
      return WindStrength.values[this.key - 1];
    } else if (this.key === 0) {
      return WindStrength.values[this.key + 1];
    }

    // Random change
    if ((await new Roll('d2').roll()).total === 1) {
      return WindStrength.values[this.key - 1];
    } else {
      return WindStrength.values[this.key + 1];
    }
  }

  getName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.' + this.value);
  }
}

class Precipitation {
  static NONE = new Precipitation(0, 'None');
  static LIGHT = new Precipitation(1, 'Light');
  static HEAVY = new Precipitation(2, 'Heavy');
  static VERY_HEAVY = new Precipitation(3, 'VeryHeavy');

  static values = [
    Precipitation.NONE, Precipitation.LIGHT, Precipitation.HEAVY, Precipitation.VERY_HEAVY];

  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  static fromKey(key) {
    return Precipitation.values[key];
  }

  static fromValue(value) {
    return Precipitation.values.find(e => e.value === value);
  }

  getName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.Precipitation.' + this.value);
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Precipitation.${this.value}Desc`);
  }
}

class Temperature {
  static SWELTERING = new Temperature(0, 'Sweltering');
  static HOT = new Temperature(1, 'Hot');
  static COMFORTABLE = new Temperature(2, 'Comfortable');
  static CHILLY = new Temperature(3, 'Chilly');
  static BITTER = new Temperature(4, 'Bitter');

  static values = [
    Temperature.SWELTERING, Temperature.HOT, Temperature.COMFORTABLE, Temperature.CHILLY, Temperature.BITTER];

  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  static fromKey(key) {
    return Temperature.values[key];
  }

  static fromValue(value) {
    return Temperature.values.find(e => e.value === value);
  }

  getName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.Temperature.' + this.value);
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Temperature.${this.value}Desc`);
  }
}

class Visibility {
  static CLEAR = new Visibility(0, 'Clear');
  static MISTY = new Visibility(1, 'Misty');
  static FOGGY = new Visibility(2, 'Foggy');
  static THICK_FOG = new Visibility(3, 'ThickFog');

  static values = [
    Visibility.CLEAR, Visibility.MISTY, Visibility.FOGGY, Visibility.THICK_FOG];

  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  static fromKey(key) {
    return Visibility.values[key];
  }

  static fromValue(value) {
    return Visibility.values.find(e => e.value === value);
  }

  getName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.Visibility.' + this.value);
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Visibility.${this.value}Desc`);
  }
}

// Tables
const MACRO = this;
const PRECIPITATION = [
  {
    min: 1,
    result: Precipitation.NONE,
  }, {
    min: 7,
    result: Precipitation.LIGHT,
  }, {
    min: 10,
    result: Precipitation.HEAVY,
  }, {
    min: 11,
    result: Precipitation.VERY_HEAVY,
  }, {
    min: 13,
    result: Precipitation.HEAVY,
  }, {
    min: 14,
    result: Precipitation.NONE,
  }];
const TEMPERATURE = [
  {
    min: 1,
    result: Temperature.SWELTERING,
  }, {
    min: 2,
    result: Temperature.HOT,
  }, {
    min: 3,
    result: Temperature.COMFORTABLE,
  }, {
    min: 9,
    result: Temperature.CHILLY,
  }, {
    min: 13,
    result: Temperature.BITTER,
  }];
const VISIBILITY = [
  {
    min: 1,
    result: Visibility.CLEAR,
  }, {
    min: 5,
    result: Visibility.MISTY,
  }, {
    min: 9,
    result: Visibility.FOGGY,
  }, {
    min: 10,
    result: Visibility.THICK_FOG,
  }, {
    min: 11,
    result: Visibility.MISTY,
  }, {
    min: 14,
    result: Visibility.CLEAR,
  }];
const WIND_STRENGTH = [
  {
    min: 1,
    result: WindStrength.DOLDRUMS,
  }, {
    min: 2,
    result: WindStrength.LIGHT_BREEZE,
  }, {
    min: 3,
    result: WindStrength.FRESH_BREEZE,
  }, {
    min: 5,
    result: WindStrength.NEAR_GALE,
  }, {
    min: 7,
    result: WindStrength.STRONG_GALE,
  }, {
    min: 9,
    result: WindStrength.VIOLENT_STORM,
  }, {
    min: 10,
    result: WindStrength.NEAR_GALE,
  }, {
    min: 11,
    result: WindStrength.FRESH_BREEZE,
  }, {
    min: 13,
    result: WindStrength.LIGHT_BREEZE,
  }, {
    min: 14,
    result: WindStrength.DOLDRUMS,
  }];
const WIND_EFFECT = {
  'Doldrums': {
    'Tailwind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
    'Sidewind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
    'Headwind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
  },
  'LightBreeze': {
    'Tailwind': {
      sail: {modifier: 1},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {modifier: 1},
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.9},
      other: {modifier: 1},
    },
  },
  'FreshBreeze': {
    'Tailwind': {
      sail: {modifier: 1.1},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {
        modifier: 0.1,
        effect: 'TACK',
      },
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.75},
      other: {modifier: 1},
    },
  },
  'NearGale': {
    'Tailwind': {
      sail: {modifier: 1.25},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {
        modifier: 0.25,
        effect: 'TACK',
      },
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.5},
      other: {modifier: 0.9},
    },
  },
  'StrongGale': {
    'Tailwind': {
      sail: {modifier: 1.25},
      other: {modifier: 1.1},
    },
    'Sidewind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {modifier: 0.95},
    },
    'Headwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {modifier: 0.75},
    },
  },
  'ViolentStorm': {
    'Tailwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
    'Sidewind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
    'Headwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
  },
};
const WIND_EFFECT_FLYING_JIB = {
  'Doldrums': {
    'Tailwind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
    'Sidewind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
    'Headwind': {
      sail: {effect: 'BECALMED'},
      other: {effect: 'BECALMED'},
    },
  },
  'LightBreeze': {
    'Tailwind': {
      sail: {modifier: 1.1},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {modifier: 1},
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.9},
      other: {modifier: 1},
    },
  },
  'FreshBreeze': {
    'Tailwind': {
      sail: {modifier: 1.25},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {
        modifier: 0.25,
        effect: 'TACK',
      },
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.75},
      other: {modifier: 1},
    },
  },
  'NearGale': {
    'Tailwind': {
      sail: {modifier: 1.25},
      other: {modifier: 1},
    },
    'Sidewind': {
      sail: {
        modifier: 0.25,
        effect: 'TACK',
      },
      other: {modifier: 1},
    },
    'Headwind': {
      sail: {modifier: 0.5},
      other: {modifier: 0.9},
    },
  },
  'StrongGale': {
    'Tailwind': {
      sail: {modifier: 1.5},
      other: {modifier: 1.1},
    },
    'Sidewind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {modifier: 0.95},
    },
    'Headwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {modifier: 0.75},
    },
  },
  'ViolentStorm': {
    'Tailwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
    'Sidewind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
    'Headwind': {
      sail: {effect: 'BATTEN_DOWN'},
      other: {effect: 'BATTEN_DOWN'},
    },
  },
};

function getWindDirectionTable(prevailingWind) {
  return [
    {
      min: 1,
      result: Direction.fromValue(prevailingWind),
    }, {
      min: 7,
      result: Direction.NORTH,
    }, {
      min: 8,
      result: Direction.SOUTH,
    }, {
      min: 9,
      result: Direction.EAST,
    }, {
      min: 10,
      result: Direction.WEST,
    }];
}

function getWindName(shipDirection, windDirection) {
  if (shipDirection === windDirection) {
    return 'Headwind';
  } else if (shipDirection === windDirection.opposite()) {
    return 'Tailwind';
  } else {
    return 'Sidewind';
  }
}

function getSeasonModifier(season) {
  switch (season) {
    case 'spring':
    case 'autumn':
      return 2;
    case 'winter':
      return 4;
    default:
      return 0;
  }
}

function createWindRaport(windStrength, windDirection, windChangeRoll, timeOfDay, options) {
  const shipDirection = Direction.fromValue(options.shipDirection);
  const shiftDistance = options.shipSpeed * 6 + (options.shipSpeed % 2 === 1 ? 0.5 : 0);
  const windName = getWindName(shipDirection, windDirection);
  const WIND_EFFECT_TABLE = options.flyingJib === 'true' ? WIND_EFFECT_FLYING_JIB : WIND_EFFECT;
  const windEffect = WIND_EFFECT_TABLE[windStrength.value][windName][options.shipPropulsion];
  const modifier = game.robakMacros.utils.round((windEffect?.modifier ?? 1) * 100, 2);

  let description = `<h2>${timeOfDay}</h2>`;
  if (windChangeRoll) {
    description += `<p><b>Wind change roll:</b> ${windChangeRoll}</p>`;
  }
  if (windStrength !== WindStrength.DOLDRUMS) {
    description += `<p><b>Wind:</b> ${windDirection.getAdj()} ${windStrength.getName().toLowerCase()} (${windName})</p>`;
  } else {
    description += `<p><b>Wind:</b> ${windStrength.getName()}</p>`;
  }
  if (windStrength === WindStrength.STRONG_GALE || windStrength === WindStrength.VIOLENT_STORM) {
    description += `<p><i>Every Human, Dwarf, Halfling, or Ogre Character should make a <b>Challenging (+0) Endurance</b> Test or suffer from sea sickness.</i></p>`;
  }

  switch (windEffect?.effect) {
    case 'BECALMED':
      description += `<p><b>Distance Travelled:</b> 0 mi (0%)</p>`;
      return {
        description,
        normal: 0,
        tack: 0,
        drift: 0,
      };
    case 'TACK':
      let tack = game.robakMacros.utils.round(shiftDistance * windEffect?.modifier, 2);
      description += `
        <p><b>Distance Travelled:</b> ${shiftDistance} mi (100%)</p>
        <p><b>Distance Travelled (Tack):</b> +${tack} mi (+${modifier}%)</p>`;
      return {
        description,
        normal: shiftDistance,
        tack,
        drift: 0,
      };
    case 'BATTEN_DOWN':
      let drift = game.robakMacros.utils.round((windName.value === 'Tailwind' ? 1 : -1) * shiftDistance * 0.25, 2);
      description += `
        <p><b>Distance Travelled:</b> 0 mi (0%)</p>
        <p><b>Distance Travelled (Drift):</b> ${drift} mi (25%)</p>`;
      return {
        description,
        normal: 0,
        tack: 0,
        drift,
      };
    default:
      description += `<p><b>Distance Travelled:</b> ${shiftDistance} mi (${modifier}%)</p>`;
      return {
        description,
        normal: shiftDistance,
        tack: 0,
        drift: 0,
      };
  }
}

async function submit(html) {
  let options = new FormDataExtended(html[0].querySelector('form')).object;
  let seasonModifier = getSeasonModifier(options.season);
  let seaTemperatureModifier = options.seaTemperature === 'cold' ? 0 : -2;

  let precipitation = options.precipitation !== 'Random'
      ? Precipitation.fromValue(options.precipitation)
      : (await game.robakMacros.utils.rollFromCodeObject({
        table: PRECIPITATION,
        dice: '1d10',
        modifier: seasonModifier,
      }))[0];
  let temperature = options.temperature !== 'Random'
      ? Temperature.fromValue(options.temperature)
      : (await game.robakMacros.utils.rollFromCodeObject({
        table: TEMPERATURE,
        dice: '1d10',
        modifier: seasonModifier + seaTemperatureModifier,
      }))[0];
  let visibility = options.visibility !== 'Random'
      ? Visibility.fromValue(options.visibility)
      : (await game.robakMacros.utils.rollFromCodeObject({
        table: VISIBILITY,
        dice: '1d10',
        modifier: seasonModifier + seaTemperatureModifier,
      }))[0];
  let windDirection = options.windDirection !== 'Random'
      ? Direction.fromValue(options.windDirection)
      : (await game.robakMacros.utils.rollFromCodeObject({
        table: getWindDirectionTable(options.prevailingWind),
        dice: '1d10',
      }))[0];
  let windStrength = (await game.robakMacros.utils.rollFromCodeObject({
    table: WIND_STRENGTH,
    dice: '1d10',
    modifier: seasonModifier,
  }))[0];
  if (options.lastWindStrength !== "Random") {
    windStrength = WindStrength.fromValue(options.lastWindStrength)
  }
  if (options.windStrength !== "Random") {
    windStrength = WindStrength.fromValue(options.windStrength)
  }

  let changeRoll = options.windStrength !== "Random" || options.lastWindStrength === 'Random' ? undefined : (await new Roll('d10').roll()).total;
  let totalDistance = {
    normal: 0,
    tack: 0,
    drift: 0,
  };
  let windReportsDesc = '';

  for (let timeOfDay of ['Dawn', 'Midday', 'Dusk', 'Midnight']) {
    if (changeRoll === 1) {
      windStrength = await windStrength.randomChange();
      options.lastWindStrength = `${windStrength.value}`;
    }
    let windReport = createWindRaport(windStrength, windDirection, changeRoll, timeOfDay, options);
    totalDistance.normal += windReport.normal;
    totalDistance.tack += windReport.tack;
    totalDistance.drift += windReport.drift;
    windReportsDesc += windReport.description;

    changeRoll = (await new Roll('d10').roll()).total;
  }

  await MACRO.setFlag('world', 'sea-weather-generator-options', options);
  ChatMessage.create({
    content: `
      <h1>Sea Weather Report</h1>
      <p><b>Precipitation:</b> ${precipitation.getName()}</p>
      <p><i>${precipitation.getDescription()}</i></p>
      <p><b>Temperature:</b> ${temperature.getName()}</p>
      <p><i>${temperature.getDescription()}</i></p>
      <p><b>Visibility:</b> ${visibility.getName()}</p>
      <p><i>${visibility.getDescription()}</i></p>
      <h1>Wind Report</h1>
      ${windReportsDesc}
      <h1>Total Distance Travelled</h1>
      <p><b>Base:</b> ${totalDistance.normal} mi</p>
      ${totalDistance.tack === 0 ? '' : `<p><b>Additional Tack Distance:</b> ${totalDistance.tack} mi</p>`}
      ${totalDistance.drift === 0 ? '' : `<p><b>Drift Distance:</b> ${totalDistance.drift} mi</p>`}`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
  });
}

const options = MACRO.getFlag('world', 'sea-weather-generator-options') ?? {
  precipitation: 'Random',
  temperature: 'Random',
  visibility: 'Random',
  windDirection: 'Random',
  windStrength: 'Random',
  lastWindStrength: 'Random',
  prevailingWind: 'West',
  seaTemperature: 'cold',
  season: 'spring',
  shipDirection: 'West',
  shipPropulsion: 'sail',
  shipSpeed: 8,
  flyingJib: false,
};

new Dialog({
  title: `Random Sea Weather Generator`,
  content: `<form>
      <div class="form-group section-title">
        <label class="section-title">Sea Weather Elements</label>
      </div>
      <div class="form-group">
        <label>Precipitation:</label>
        <select name="precipitation">
          <option value="Random" ${options.precipitation === 'Random' ? 'selected' : ''}>Random</option>
          ${Precipitation.values.map(e => {
            return `<option value="${e.value}" ${options.precipitation === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group">
        <label>Temperature:</label>
        <select name="temperature">
          <option value="Random" ${options.temperature === 'Random' ? 'selected' : ''}>Random</option>
          ${Temperature.values.map(e => {
            return `<option value="${e.value}" ${options.temperature === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group">
        <label>Visibility:</label>
        <select name="visibility">
          <option value="Random" ${options.visibility === 'Random' ? 'selected' : ''}>Random</option>
          ${Visibility.values.map(e => {
            return `<option value="${e.value}" ${options.visibility === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group">
        <label>Wind Direction:</label>
        <select name="windDirection">
          <option value="Random" ${options.windDirection === 'Random' ? 'selected' : ''}>Random</option>
          ${Direction.values.map(e => {
            return `<option value="${e.value}" ${options.windDirection === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group">
        <label>Wind Strength:</label>
        <select name="windStrength">
          <option value="Random" ${options.windStrength === 'Random' ? 'selected' : ''}>Random</option>
          ${WindStrength.values.map(e => {
            return `<option value="${e.value}" ${options.windStrength === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group section-title">
        <label class="section-title">External Conditions</label>
      </div>
      <div class="form-group">
        <label>Season:</label>
        <select name="season">
          <option value="spring" ${options.season === 'spring' ? 'selected' : ''}>Spring</option>
          <option value="summer" ${options.season === 'summer' ? 'selected' : ''}>Summer</option>
          <option value="autumn" ${options.season === 'autumn' ? 'selected' : ''}>Autumn</option>
          <option value="winter" ${options.season === 'winter' ? 'selected' : ''}>Winter</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sea Temperature:</label>
        <select name="seaTemperature">
          <option value="cold" ${options.seaTemperature === 'cold' ? 'selected' : ''}>Cold</option>
          <option value="warm" ${options.seaTemperature === 'warm' ? 'selected' : ''}>Warm</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prevailing Winds Direction:</label>
        <select name="prevailingWind">
          <option value="West" ${options.prevailingWind === 'West' ? 'selected' : ''}>Westerly</option>
          <option value="South" ${options.prevailingWind === 'South' ? 'selected' : ''}>Southerly</option>
          <option value="East" ${options.prevailingWind === 'East' ? 'selected' : ''}>Easterly</option>
          <option value="North" ${options.prevailingWind === 'North' ? 'selected' : ''}>Northerly</option>
        </select>
      </div>
      <div class="form-group">
        <label>Wind Strength at Midnight:</label>
        <select name="lastWindStrength">
          <option value="Random" ${options.lastWindStrength === 'Random' ? 'selected' : ''}>Random</option>
          ${WindStrength.values.map(e => {
            return `<option value="${e.value}" ${options.lastWindStrength === e.value ? 'selected' : ''}>${e.getName()}</option>`;
          })}.join()
        </select>
      </div>
      <div class="form-group section-title">
        <label class="section-title">Ship</label>
      </div>
      <div class="form-group">
        <label>Ship Direction:</label>
        <select name="shipDirection">
          <option value="West" ${options.shipDirection === 'West' ? 'selected' : ''}>West</option>
          <option value="South" ${options.shipDirection === 'South' ? 'selected' : ''}>South</option>
          <option value="East" ${options.shipDirection === 'East' ? 'selected' : ''}>East</option>
          <option value="North" ${options.shipDirection === 'North' ? 'selected' : ''}>North</option>
        </select>
      </div>
      <div class="form-group">
        <label>Flying Jib:</label>
        <select name="flyingJib">
          <option value="true" ${options.flyingJib === "true" ? 'selected' : ''}>Equipped</option>
          <option value="false" ${options.flyingJib !== "true" ? 'selected' : ''}>Not Equipped</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ship Propulsion:</label>
        <select name="shipPropulsion">
          <option value="sail" ${options.shipPropulsion === 'sail' ? 'selected' : ''}>Sail</option>
          <option value="other" ${options.shipPropulsion === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ship Speed:</label>
        <input name="shipSpeed" value=${options.shipSpeed} type="number" min="0">
      </div>
    </form>`,
  buttons: {
    no: {
      icon: `<i class='fas fa-times'></i>`,
      label: `Cancel`,
    },
    yes: {
      icon: `<i class='fas fa-check'></i>`,
      label: `Submit`,
      callback: async (html) => await submit(html),
    },
  },
  default: 'yes',
}).render(true);
