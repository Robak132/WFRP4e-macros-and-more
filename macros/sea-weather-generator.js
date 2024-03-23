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

  opposite() {
    return Direction.values[(this.key + 2) % 4];
  }

  getLocalisedAdj() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.' + this.value + 'Adj');
  }

  getLocalisedName() {
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

  getLocalisedName() {
    return game.i18n.localize('SEA-WEATHER-GENERATOR.' + this.value);
  }
}

// Tables
const MACRO = this;
const PRECIPITATION = [
  {
    min: 1,
    result: {
      value: 'None',
      description: '',
    },
  }, {
    min: 7,
    result: {
      value: 'Light',
      description: `–10 to Athletics, Climb, and Ranged (Blackpowder) Tests`,
    },
  }, {
    min: 10,
    result: {
      value: 'Heavy',
      description: `–20 to Athletics, Climb, and Ranged (Blackpowder) Tests, –10 to Leadership, Navigation, Perception, Row, and Sail Tests`,
    },
  }, {
    min: 11,
    result: {
      value: 'Very Heavy',
      description: `–30 to Athletics, Climb, and Ranged (Blackpowder) Tests, -20 to Leadership, Navigation, Perception, Row, and Sail Tests, –10 to all other Tests`,
    },
  }, {
    min: 13,
    result: {
      value: 'Heavy',
      description: `–20 to Athletics, Climb, and Ranged (Blackpowder) Tests, –10 to Leadership, Navigation, Perception, Row, and Sail Tests`,
    },
  }, {
    min: 14,
    result: {
      value: 'None',
      description: '',
    },
  }];
const TEMPERATURE = [
  {
    min: 1,
    result: {
      value: 'Sweltering',
      description: 'Every two hours, make a <b>Challenging (+0) Endurance</b> Test. If the Test is failed, suffer the effects of Heat Exposure. Crew members must drink two gallons of water a day or else suffer from Thirst',
    },
  }, {
    min: 2,
    result: {
      value: 'Hot',
      description: 'Every four hours, make an <b>Average (+20) Endurance</b> Test. If the Test is failed, suffer the effects of Heat Exposure. Crew members must drink two gallons of water a day or else suffer from Thirst.',
    },
  }, {
    min: 3,
    result: {
      value: 'Comfortable',
      description: 'Moderately cool or warm, the temperature is tolerable and has no effect on the crew.',
    },
  }, {
    min: 9,
    result: {
      value: 'Chilly',
      description: 'Every four hours, make an <b>Average (+20) Endurance</b> Test. If the Test is failed, suffer the effects of Cold Exposure.',
    },
  }, {
    min: 13,
    result: {
      value: 'Bitter',
      description: 'Every two hours, make a <b>Challenging (+0) Endurance</b> Test. If the Test is failed, suffer effects of Cold Exposure.',
    },
  }];
const VISIBILITY = [
  {
    min: 1,
    result: {
      value: 'Clear',
      description: '',
    },
  }, {
    min: 5,
    result: {
      value: 'Misty',
      description: 'Ranged Tests, Navigation Tests, and Perception Tests based on sight suffer from a –1 SL penalty if the target is more than 20 yards away.',
    },
  }, {
    min: 9,
    result: {
      value: 'Foggy',
      description: 'Ranged Tests, Navigation Tests, and Perception Tests based on sight suffer from a –2 SL penalty if the target is more than 10 yards away.',
    },
  }, {
    min: 10,
    result: {
      value: 'Thick Fog',
      description: 'Ranged Tests, Navigation Tests, and Perception Tests based on sight suffer from a –3 SL penalty if the target is more than 5 yards away.',
    },
  }, {
    min: 11,
    result: {
      value: 'Misty',
      description: 'Ranged Tests, Navigation Tests, and Perception Tests based on sight suffer from a –1 SL penalty if the target is more than 20 yards away.',
    },
  }, {
    min: 14,
    result: {
      value: 'Clear',
      description: '',
    },
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

function getWindDirectionTable(prevailingWind) {
  return [
    {
      min: 1,
      result: Direction.fromKey(prevailingWind),
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
  let seasonModifier = 0;
  switch (season) {
    case 'spring':
    case 'autumn':
      seasonModifier = 2;
      break;
    case 'winter':
      seasonModifier = 4;
      break;
  }
  return seasonModifier;
}

function addWindRaport(windStrength, windDirection, shipPropulsion, shipDirection, shipSpeed, windReports) {
  let shiftDistance = shipSpeed * 6 + (shipSpeed % 2 === 1 ? 0.5 : 0);
  let windName = getWindName(shipDirection, windDirection);
  let windEffect = WIND_EFFECT[windStrength.value][windName][shipPropulsion];
  let modifier = game.robakMacros.utils.round((windEffect?.modifier ?? 1) * 100, 2);

  const windDirectionDesc= `<abbr title="${windDirection.getLocalisedName()} -> ${windDirection.opposite().getLocalisedName()}">${windDirection.getLocalisedAdj()}</abbr>`;
  const windStrengthDesc = windStrength.getLocalisedName()
  if (windStrength !== WindStrength.DOLDRUMS) {
    windReports.description += `<p><b>Wind:</b> ${windDirectionDesc} ${windStrengthDesc} (${windName})</p>`;
  } else {
    windReports.description += `<p><b>Wind:</b> ${windStrengthDesc}</p>`;
  }

  switch (windEffect?.effect) {
    case 'BECALMED':
      windReports.description += `<p><b>Distance Travelled:</b> 0 mi (0%)</p>`;
      break;
    case 'TACK':
      let tack = game.robakMacros.utils.round(shiftDistance * windEffect?.modifier, 2)
      windReports.tack = game.robakMacros.utils.round(windReports.tack + tack, 2);
      windReports.normal += shiftDistance;
      windReports.description += `
        <p><b>Distance Travelled:</b> ${shiftDistance} mi (100%)</p>
        <p><b>Distance Travelled (Tack):</b> +${tack} mi (+${modifier}%)</p>`;
      break;
    case 'BATTEN_DOWN':
      let drift = game.robakMacros.utils.round((windName.value === 'Tailwind' ? 1 : -1) * shiftDistance * 0.25, 2)
      windReports.drift = game.robakMacros.utils.round(windReports.drift + drift, 2);
      windReports.description += `
        <p><b>Distance Travelled:</b> 0 mi (0%)</p>
        <p><b>Distance Travelled (Drift):</b> ${drift} mi (25%)</p>`;
      break;
    default:
      windReports.normal += shiftDistance;
      windReports.description += `<p><b>Distance Travelled:</b> ${shiftDistance} mi (${modifier}%)</p>`;
      break;
  }
  if (windStrength === WindStrength.STRONG_GALE || windStrength === WindStrength.VIOLENT_STORM) {
    windReports.description += `<p><i>Every Human, Dwarf, Halfling, or Ogre Character should make a <b>Challenging (+0) Endurance</b> Test or suffer from sea sickness.</i></p>`;
  }
  return windReports;
}

async function submit(html) {
  let options = new FormDataExtended(html[0].querySelector('form')).object;
  let seasonModifier = getSeasonModifier(options.season);
  let shipDirection = Direction.fromKey(parseInt(options.shipDirection));
  let seaTemperatureModifier = options.seaTemperature === 'cold' ? 0 : -2;

  let precipitation = (await game.robakMacros.utils.rollFromCodeObject({
    table: PRECIPITATION,
    dice: '1d10',
    modifier: seasonModifier,
  }))[0];
  let temperature = (await game.robakMacros.utils.rollFromCodeObject({
    table: TEMPERATURE,
    dice: '1d10',
    modifier: seasonModifier + seaTemperatureModifier,
  }))[0];
  let visibility = (await game.robakMacros.utils.rollFromCodeObject({
    table: VISIBILITY,
    dice: '1d10',
    modifier: seasonModifier + seaTemperatureModifier,
  }))[0];
  let windDirection = (await game.robakMacros.utils.rollFromCodeObject({
    table: getWindDirectionTable(options.prevailingWind),
    dice: '1d10',
  }))[0];
  let windStrength = options.lastWindStrength !== '-1'
      ? WindStrength.fromKey(parseInt(options.lastWindStrength))
      : (await game.robakMacros.utils.rollFromCodeObject({
        table: WIND_STRENGTH,
        dice: '1d10',
        modifier: seasonModifier,
      }))[0];

  let changeRoll;
  let windReports = {
    description: '',
    normal: 0,
    tack: 0,
    drift: 0,
  };
  for (let timeOfDay of ['Dawn', 'Midday', 'Dusk', 'Midnight']) {
    windReports.description += `<h2>${timeOfDay} ${changeRoll ? `(${changeRoll})` : ``}</h2>`;
    windReports = addWindRaport(windStrength, windDirection, options.shipPropulsion, shipDirection, options.shipSpeed,
        windReports);
    changeRoll = (await new Roll('d10').roll()).total;
    if (changeRoll === 1) {
      windStrength = await windStrength.randomChange();
    }
    options.lastWindStrength = `${windStrength.key}`;
  }

  await MACRO.setFlag('world', 'sea-weather-generator-options', options);
  ChatMessage.create({
    content: `
		<h1>Sea Weather Report</h1>
		<p><b>Preciptation:</b> ${precipitation.value}</p>
		<p><i>${precipitation.description}</i></p>
		<p><b>Temperature:</b> ${temperature.value}</p>
	  <p><i>${temperature.description}</i></p>
		<p><b>Visibility:</b> ${visibility.value}</p>
	  <p><i>${visibility.description}</i></p>
		<h1>Winds</h1>
    ${windReports.description}		
    <h1>Total Distance</h1>
    <p><b>Distance Travelled:</b> ${windReports.normal} mi</p>
    <p><b>Distance Travelled (Tack):</b> ${windReports.tack} mi</p>
    <p><b>Distance Travelled (Drift):</b> ${windReports.drift} mi</p>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
  });
}

function main() {
  const options = MACRO.getFlag('world', 'sea-weather-generator-options') ?? {
    lastWindStrength: '-1',
    prevailingWind: '3',
    seaTemperature: 'cold',
    season: 'spring',
    shipDirection: '3',
    shipPropulsion: 'sail',
    shipSpeed: 8,
  };
  new Dialog({
    title: `Random Sea Weather Generator`,
    content: `<form>
      <h3>External Conditions</h3>
      <div class="form-group">
        <label>Season:</label>
        <select name="season">
          <option value="spring" ${options.season === "spring" ? "selected" : ""}>Spring</option>
          <option value="summer" ${options.season === "summer" ? "selected" : ""}>Summer</option>
          <option value="autumn" ${options.season === "autumn" ? "selected" : ""}>Autumn</option>
          <option value="winter" ${options.season === "winter" ? "selected" : ""}>Winter</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sea Temperature:</label>
        <select name="seaTemperature">
          <option value="cold" ${options.seaTemperature === "cold" ? "selected" : ""}>Cold</option>
          <option value="warm" ${options.seaTemperature === "warm" ? "selected" : ""}>Warm</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prevailing Winds Direction:</label>
        <select name="prevailingWind">
          <option value="3" ${options.prevailingWind === "3" ? "selected" : ""}>Westerly</option>
          <option value="2" ${options.prevailingWind === "2" ? "selected" : ""}>Southerly</option>
          <option value="1" ${options.prevailingWind === "1" ? "selected" : ""}>Easterly</option>
          <option value="0" ${options.prevailingWind === "0" ? "selected" : ""}>Northerly</option>
        </select>
      </div>
      <div class="form-group">
        <label>Wind Strength at Midnight:</label>
        <select id="last-wind-strength" name="lastWindStrength">
          <option value="-1" ${options.lastWindStrength === "-1" ? "selected" : ""}>Random</option>
          <option value="0" ${options.lastWindStrength === "0" ? "selected" : ""}>Doldrums</option>
          <option value="1" ${options.lastWindStrength === "1" ? "selected" : ""}>Light Breeze</option>
          <option value="2" ${options.lastWindStrength === "2" ? "selected" : ""}>Fresh Breeze</option>
          <option value="3" ${options.lastWindStrength === "3" ? "selected" : ""}>Near Gale</option>
          <option value="4" ${options.lastWindStrength === "4" ? "selected" : ""}>Strong Gale</option>
          <option value="5" ${options.lastWindStrength === "5" ? "selected" : ""}>Violent Storm</option>
        </select>
      </div>
      <h3>Ship</h3>
      <div class="form-group">
        <label>Ship Direction:</label>
        <select name="shipDirection">
          <option value="3" ${options.shipDirection === "3" ? "selected" : ""}>West</option>
          <option value="2" ${options.shipDirection === "2" ? "selected" : ""}>South</option>
          <option value="1" ${options.shipDirection === "1" ? "selected" : ""}>East</option>
          <option value="0" ${options.shipDirection === "0" ? "selected" : ""}>North</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ship Propulsion:</label>
        <select name="shipPropulsion">
          <option value="sail" ${options.shipPropulsion === "sail" ? "selected" : ""}>Sail</option>
          <option value="other" ${options.shipPropulsion === "other" ? "selected" : ""}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ship Speed:</label>
        <input name="shipSpeed" value=${options.shipSpeed} type="number" min="0">
      </div>
    </form>`,
    buttons: {
      yes: {
        icon: `<i class='fas fa-check'></i>`,
        label: `Submit`,
        callback: async (html) => await submit(html),
      },
      no: {
        icon: `<i class='fas fa-times'></i>`,
        label: `Cancel`,
      },
    },
    default: 'yes',
  }).render(true);
}

main();
