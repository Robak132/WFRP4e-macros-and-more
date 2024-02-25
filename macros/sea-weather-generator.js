/* ==========
* MACRO: Random Weather Generator (Sea)
* VERSION: 1.1.1
* AUTHOR: Robak132
* DESCRIPTION: Generate weather by Sea of Claws rules.
========== */

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
      description: `–20 to Athletics, Climb, and Ranged (Blackpowder) Tests,<br>–10 to Leadership, Navigation, Perception, Row, and Sail Tests`,
    },
  }, {
    min: 11,
    result: {
      value: 'Very Heavy',
      description: `–30 to Athletics, Climb, and Ranged (Blackpowder) Tests,<br>-20 to Leadership, Navigation, Perception, Row, and Sail Tests,<br>–10 to all other Tests`,
    },
  }, {
    min: 13,
    result: {
      value: 'Heavy',
      description: `–20 to Athletics, Climb, and Ranged (Blackpowder) Tests,<br>–10 to Leadership, Navigation, Perception, Row, and Sail Tests`,
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
      description: 'Every two hours, make a Challenging (+0) Endurance Test. If the Test is failed, suffer the effects of Heat Exposure. Crew members must drink two gallons of water a day or else suffer from Thirst',
    },
  }, {
    min: 2,
    result: {
      value: 'Hot',
      description: 'Every four hours, make an Average (+20) Endurance Test. If the Test is failed, suffer the effects of Heat Exposure. Crew members must drink two gallons of water a day or else suffer from Thirst.',
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
      description: 'Every four hours, make an Average (+20) Endurance Test. If the Test is failed, suffer the effects of Cold Exposure.',
    },
  }, {
    min: 13,
    result: {
      value: 'Bitter',
      description: 'Every two hours, make a Challenging (+0) Endurance Test. If the Test is failed, suffer effects of Cold Exposure.',
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
    result: {
      value: 'Doldrums',
      description: '',
    },
  }, {
    min: 2,
    result: {
      value: 'Light Breeze',
      description: '',
    },
  }, {
    min: 3,
    result: {
      value: 'Fresh Breeze',
      description: '',
    },
  }, {
    min: 5,
    result: {
      value: 'Near Gale',
      description: '',
    },
  }, {
    min: 7,
    result: {
      value: 'Strong Gale',
      description: '',
    },
  }, {
    min: 9,
    result: {
      value: 'Violent Storm',
      description: '',
    },
  }, {
    min: 10,
    result: {
      value: 'Near Gale',
      description: '',
    },
  }, {
    min: 11,
    result: {
      value: 'Fresh Breeze',
      description: '',
    },
  }, {
    min: 13,
    result: {
      value: 'Light Breeze',
      description: '',
    },
  }, {
    min: 14,
    result: {
      value: 'Doldrums',
      description: '',
    },
  }];
const WIND_DIRECTION = [
  {
    min: 1,
    result: {
      value: 'Prevailing',
      description: '',
    },
  }, {
    min: 7,
    result: {
      value: 'Northerly',
      description: '',
    },
  }, {
    min: 8,
    result: {
      value: 'Southerly',
      description: '',
    },
  }, {
    min: 9,
    result: {
      value: 'Easterly',
      description: '',
    },
  }, {
    min: 10,
    result: {
      value: 'Westerly',
      description: '',
    },
  }];
const WIND_NAME = {
  'North': {
    'Northerly': 'Headwind',
    'Southerly': 'Tailwind',
    'Easterly': 'Sidewind',
    'Westerly': 'Sidewind',
  },
  'South': {
    'Northerly': 'Tailwind',
    'Southerly': 'Headwind',
    'Easterly': 'Sidewind',
    'Westerly': 'Sidewind',
  },
  'East': {
    'Northerly': 'Sidewind',
    'Southerly': 'Sidewind',
    'Easterly': 'Headwind',
    'Westerly': 'Tailwind',
  },
  'West': {
    'Northerly': 'Sidewind',
    'Southerly': 'Sidewind',
    'Easterly': 'Tailwind',
    'Westerly': 'Headwind',
  },
};
const WIND_EFFECT = {
  'Doldrums': {
    'Tailwind': 'Becalmed',
    'Sidewind': 'Becalmed',
    'Headwind': 'Becalmed',
  },
  'Light Breeze': {
    'Tailwind': '+0%/+0%',
    'Sidewind': '+0%/+0%',
    'Headwind': '-10%/+0%',
  },
  'Fresh Breeze': {
    'Tailwind': '+10%/+0%',
    'Sidewind': 'Tack +10%/+0%',
    'Headwind': '-25%/+0%',
  },
  'Near Gale': {
    'Tailwind': '+25%/+0%',
    'Sidewind': 'Tack +25%/+0%',
    'Headwind': '-50%/-10%',
  },
  'Strong Gale': {
    'Tailwind': '+25%/+10%',
    'Sidewind': 'Batten Down/-5%',
    'Headwind': 'Batten Down/-25%',
  },
  'Violent Storm': {
    'Tailwind': 'Batten Down',
    'Sidewind': 'Batten Down',
    'Headwind': 'Batten Down',
  },
};

async function submit(html) {
  let seasonModifier = 0;
  const {
    season,
    boatDirection,
    prevailingWindsDirection,
    seaTemperature,
  } = new FormDataExtended(html[0].querySelector('form')).object;
  switch (season) {
    case 'spring':
    case 'autumn':
      seasonModifier = 2;
      break;
    case 'winter':
      seasonModifier = 4;
      break;
  }
  let seaTemperatureModifier = seaTemperature === 'cold' ? 0 : -2;

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
  let windStrength = (await game.robakMacros.utils.rollFromCodeObject({
    table: WIND_STRENGTH,
    dice: '1d10',
    modifier: seasonModifier,
  }))[0];
  let windDirection = (await game.robakMacros.utils.rollFromCodeObject({
    table: WIND_DIRECTION,
    dice: '1d10',
  }))[0];
  if (windDirection.value === 'Prevailing') {
    windDirection.value = prevailingWindsDirection;
  }
  let windName = WIND_NAME[boatDirection][windDirection.value];
  let weatherReport = `
		<h1>Weather Report</h1>
		<p><b>Preciptation:</b> ${precipitation.value}</p>
		<p><i>${precipitation.description}</i></p>
		<p><b>Temperature:</b> ${temperature.value}</p>
	  <p><i>${temperature.description}</i></p>
		<p><b>Visibility:</b> ${visibility.value}</p>
	  <p><i>${visibility.description}</i></p>
		<h2>Winds</h2>
		<p><b>Strength:</b> ${windStrength.value}</p>
		<p><b>Direction:</b> ${windDirection.value} (${windName})</p>
	  <p><b>Effect:</b> ${WIND_EFFECT[windStrength.value][windName]}</p>`;
  if (windStrength.value === "Strong Gale" || windStrength.value === "Violent Storm") {
    weatherReport += `Every Human, Dwarf, Halfling, or Ogre Character should make a <b>Challenging (+0) Endurance</b> Test or suffer from sea sickness.`
  }
  ChatMessage.create({
    content: weatherReport,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
  }, false);
}

new Dialog({
  title: `Random Wind Generator`,
  content: `
    <form>
      <div class="form-group">
        <label>Season:</label>
        <select id="season" name="season">
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="winter">Winter</option>
        </select>
      </div>
      <div class="form-group">
        <label>Boat Direction:</label>
        <select id="boat-direction" name="boatDirection">
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prevailing Winds Direction:</label>
        <select id="prevailing-winds-direction" name="prevailingWindsDirection">
          <option value="Westerly">Westerly</option>
          <option value="Northerly">Northerly</option>
          <option value="Southerly">Southerly</option>
          <option value="Easterly">Easterly</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sea Temperature:</label>
        <select id="sea-temperature" name="seaTemperature">
          <option value="cold">Cold</option>
          <option value="warm">Warm</option>
        </select>
      </div>
    </form>
    `,
  buttons: {
    yes: {
      icon: '<i class=\'fas fa-check\'></i>',
      label: `Submit`,
      callback: async (html) => await submit(html),
    },
    no: {
      icon: '<i class=\'fas fa-times\'></i>',
      label: `Cancel`,
    },
  },
  default: 'yes',
}).render(true);