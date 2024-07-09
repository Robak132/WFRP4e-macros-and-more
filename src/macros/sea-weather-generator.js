/* ==========
* MACRO: Sea Weather Generator
* AUTHOR: Robak132
* DESCRIPTION: Generates weather with Sea of Claws rules.
========== */

// Winds //
class Direction {
  static NORTH = new Direction(0, "North", "🔼");
  static EAST = new Direction(1, "East", "▶️");
  static SOUTH = new Direction(2, "South", "🔽");
  static WEST = new Direction(3, "West", "◀️");

  static values = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];

  constructor(key, value, icon) {
    this.key = key;
    this.value = value;
    this.icon = icon;
  }

  static fromValue(value) {
    return Direction.values.find((e) => e.value === value);
  }

  static getWindDirectionTable(prevailingWind) {
    return [
      {
        min: 1,
        result: Direction.fromValue(prevailingWind)
      },
      {
        min: 7,
        result: Direction.NORTH
      },
      {
        min: 8,
        result: Direction.SOUTH
      },
      {
        min: 9,
        result: Direction.EAST
      },
      {
        min: 10,
        result: Direction.WEST
      }
    ];
  }

  static async randomWindDirection(prevailingWind) {
    return await game.robakMacros.utils.rollFromCodeObject({
      table: this.getWindDirectionTable(prevailingWind),
      dice: "1d10"
    });
  }

  opposite() {
    return Direction.values[(this.key + 2) % 4];
  }

  getAdj() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR." + this.value + "Adj");
  }

  getName() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR." + this.value);
  }
}

class WindStrength {
  static DOLDRUMS = new WindStrength(0, "Doldrums", "0️⃣");
  static LIGHT_BREEZE = new WindStrength(1, "LightBreeze", "1️⃣");
  static FRESH_BREEZE = new WindStrength(2, "FreshBreeze", "2️⃣");
  static NEAR_GALE = new WindStrength(3, "NearGale", "3️⃣");
  static STRONG_GALE = new WindStrength(4, "StrongGale", "4️⃣");
  static VIOLENT_STORM = new WindStrength(5, "ViolentStorm", "5️⃣");

  static WIND_STRENGTH = [
    {
      min: 1,
      result: WindStrength.DOLDRUMS
    },
    {
      min: 2,
      result: WindStrength.LIGHT_BREEZE
    },
    {
      min: 3,
      result: WindStrength.FRESH_BREEZE
    },
    {
      min: 5,
      result: WindStrength.NEAR_GALE
    },
    {
      min: 7,
      result: WindStrength.STRONG_GALE
    },
    {
      min: 9,
      result: WindStrength.VIOLENT_STORM
    },
    {
      min: 10,
      result: WindStrength.NEAR_GALE
    },
    {
      min: 11,
      result: WindStrength.FRESH_BREEZE
    },
    {
      min: 13,
      result: WindStrength.LIGHT_BREEZE
    },
    {
      min: 14,
      result: WindStrength.DOLDRUMS
    }
  ];

  static values = [
    WindStrength.DOLDRUMS,
    WindStrength.LIGHT_BREEZE,
    WindStrength.FRESH_BREEZE,
    WindStrength.NEAR_GALE,
    WindStrength.STRONG_GALE,
    WindStrength.VIOLENT_STORM
  ];

  constructor(key, value, icon) {
    this.key = key;
    this.value = value;
    this.icon = icon;
  }

  static fromValue(value) {
    return WindStrength.values.find((e) => e.value === value);
  }

  static async random(seasonModifier) {
    return await game.robakMacros.utils.rollFromCodeObject({
      table: this.WIND_STRENGTH,
      dice: "1d10",
      modifier: seasonModifier
    });
  }

  increase() {
    return WindStrength.values[this.key + 1];
  }

  decrease() {
    return WindStrength.values[this.key - 1];
  }

  getName() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR." + this.value);
  }
}

class Wind {
  static WIND_EFFECT = {
    Sail: {
      Tailwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1.1},
        NearGale: {modifier: 1.25},
        StrongGale: {modifier: 1.25},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Sidewind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1.1, effect: "TACK"},
        NearGale: {modifier: 1.25, effect: "TACK"},
        StrongGale: {effect: "BATTEN_DOWN"},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Headwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 0.9},
        FreshBreeze: {modifier: 0.75},
        NearGale: {modifier: 0.5},
        StrongGale: {effect: "BATTEN_DOWN"},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      }
    },
    Other: {
      Tailwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 1},
        StrongGale: {modifier: 1.1},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Sidewind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 1},
        StrongGale: {modifier: 0.95},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Headwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 0.9},
        StrongGale: {modifier: 0.75},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      }
    }
  };
  static WIND_EFFECT_FLYING_JIB = {
    Sail: {
      Tailwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1.1},
        FreshBreeze: {modifier: 1.25},
        NearGale: {modifier: 1.25},
        StrongGale: {modifier: 1.5},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Sidewind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1.25, effect: "TACK"},
        NearGale: {modifier: 1.25, effect: "TACK"},
        StrongGale: {effect: "BATTEN_DOWN"},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Headwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 0.9},
        FreshBreeze: {modifier: 0.75},
        NearGale: {modifier: 0.5},
        StrongGale: {effect: "BATTEN_DOWN"},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      }
    },
    Other: {
      Tailwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 1},
        StrongGale: {modifier: 1.1},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Sidewind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 1},
        StrongGale: {modifier: 0.95},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      },
      Headwind: {
        Doldrums: {effect: "BECALMED"},
        LightBreeze: {modifier: 1},
        FreshBreeze: {modifier: 1},
        NearGale: {modifier: 0.9},
        StrongGale: {modifier: 0.75},
        ViolentStorm: {effect: "BATTEN_DOWN"}
      }
    }
  };

  constructor(windStrength, windDirection, shipDirection) {
    this.windStrength = windStrength;
    this.windDirection = windDirection;
    this.shipDirection = shipDirection;
  }

  static getRelativeName(shipDirection, windDirection) {
    if (shipDirection === windDirection) {
      return "Headwind";
    } else if (shipDirection === windDirection.opposite()) {
      return "Tailwind";
    } else {
      return "Sidewind";
    }
  }

  static getWindDirectionEffects(options, windDirection) {
    const WIND_EFFECT_TABLE = options.flyingJib === "true" ? Wind.WIND_EFFECT_FLYING_JIB : Wind.WIND_EFFECT;
    const relativeName = Wind.getRelativeName(Direction.fromValue(options.shipDirection), windDirection);
    return WIND_EFFECT_TABLE[options.shipPropulsion][relativeName];
  }

  async randomChange() {
    this.changeRoll = Math.ceil(CONFIG.Dice.randomUniform() * 10);
    if (this.changeRoll !== 1) return new Wind(this.windStrength, this.windDirection, this.shipDirection);

    if (this.windStrength === WindStrength.VIOLENT_STORM) {
      this.windStrength = this.windStrength.decrease();
    } else if (this.windStrength === WindStrength.DOLDRUMS) {
      this.windStrength = this.windStrength.increase();
    }
    if (Math.ceil(CONFIG.Dice.randomUniform() * 2) === 2) {
      this.windStrength = this.windStrength.decrease();
    } else {
      this.windStrength = this.windStrength.increase();
    }
    return new Wind(this.windStrength, this.windDirection, this.shipDirection);
  }

  getFullName() {
    if (this.windStrength !== WindStrength.DOLDRUMS) {
      return `${this.windDirection.getAdj()} ${this.windStrength.getName().toLowerCase()} (${Wind.getRelativeName(this.shipDirection, this.windDirection)})`;
    } else {
      return `${this.windStrength.getName()}`;
    }
  }

  getShipDistance(options) {
    const shiftDistance = options.shipSpeed * 4.5;
    const windEffect = Wind.getWindDirectionEffects(options, this.windDirection)[this.windStrength.value];
    const modifier = game.robakMacros.utils.round((windEffect?.modifier ?? 1) * 100, 2);

    switch (windEffect?.effect) {
      case "BECALMED":
        return {
          normal: 0,
          tack: 0,
          drift: 0,
          description: `<p><b>Distance Travelled:</b> 0 mi (0%)</p>`
        };
      case "TACK":
        const tack = game.robakMacros.utils.round(shiftDistance * (windEffect?.modifier - 1), 2);
        return {
          normal: shiftDistance,
          tack,
          drift: 0,
          description: `<p><b>Distance Travelled:</b> ${shiftDistance} mi (100%)</p><p><b>Distance Travelled (Tack):</b> +${tack} mi (+${modifier}%)</p>`
        };
      case "BATTEN_DOWN":
        const drift = game.robakMacros.utils.round(
          (Wind.getRelativeName(this.shipDirection, this.windDirection) === "Tailwind" ? 1 : -1) * shiftDistance * 0.25,
          2
        );
        return {
          normal: 0,
          tack: 0,
          drift,
          description: `<p><b>Distance Travelled:</b> 0 mi (0%)</p><p><b>Distance Travelled (Drift):</b> ${drift} mi (25%)</p>`
        };
      default:
        const normal = game.robakMacros.utils.round(shiftDistance * windEffect?.modifier, 2);
        return {
          normal,
          tack: 0,
          drift: 0,
          description: `<p><b>Distance Travelled:</b> ${normal} mi (${modifier}%)</p>`
        };
    }
  }

  getRaport(options) {
    let description = this.changeRoll ? `<p><b>Wind change roll:</b> ${this.changeRoll}</p>` : ``;
    description += `<p><b>Wind:</b> ${this.getFullName()}</p>`;
    if (this.windStrength === WindStrength.STRONG_GALE || this.windStrength === WindStrength.VIOLENT_STORM) {
      description += `<p><i>${game.i18n.localize("SEA-WEATHER-GENERATOR.SeaSickness")}</i></p>`;
    }
    const shipDistance = this.getShipDistance(options);
    shipDistance.description = description + shipDistance.description;
    return shipDistance;
  }

  getIcon() {
    if (this.windStrength === WindStrength.DOLDRUMS) {
      return this.windStrength.icon;
    }
    return this.windDirection.icon + this.windStrength.icon;
  }

  static async generate(options) {
    const seasonModifier = getSeasonModifier(options.season);

    const windDirection =
      options.windDirection !== "Random"
        ? Direction.fromValue(options.windDirection)
        : await Direction.randomWindDirection(options.prevailingWind);
    let windStrength;
    if (options.windStrength !== "Random") {
      windStrength = WindStrength.fromValue(options.windStrength);
    } else if (options.lastWindStrength !== "Random") {
      windStrength = WindStrength.fromValue(options.lastWindStrength);
    } else {
      windStrength = await WindStrength.random(seasonModifier);
    }

    return new Wind(windStrength, windDirection, Direction.fromValue(options.shipDirection));
  }
}

// Weather //
class Precipitation {
  static NONE = new Precipitation(0, "None", "☀️");
  static LIGHT = new Precipitation(1, "Light", "🌦️");
  static HEAVY = new Precipitation(2, "Heavy", "🌧️");
  static VERY_HEAVY = new Precipitation(3, "VeryHeavy", "⛈️");

  static PRECIPITATION = [
    {
      min: 1,
      result: Precipitation.NONE
    },
    {
      min: 7,
      result: Precipitation.LIGHT
    },
    {
      min: 10,
      result: Precipitation.HEAVY
    },
    {
      min: 11,
      result: Precipitation.VERY_HEAVY
    },
    {
      min: 13,
      result: Precipitation.HEAVY
    },
    {
      min: 14,
      result: Precipitation.NONE
    }
  ];

  static values = [Precipitation.NONE, Precipitation.LIGHT, Precipitation.HEAVY, Precipitation.VERY_HEAVY];

  constructor(key, value, icon) {
    this.key = key;
    this.value = value;
    this.icon = icon;
  }

  static fromValue(value) {
    return Precipitation.values.find((e) => e.value === value);
  }

  static async random(seasonModifier) {
    return await game.robakMacros.utils.rollFromCodeObject({
      table: this.PRECIPITATION,
      dice: "1d10",
      modifier: seasonModifier
    });
  }

  getName() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR.Precipitation." + this.value);
  }

  getFullNameStriped() {
    let descriptionStripped = this.getDescription().replace(/(<([^>]+)>)/gi, "");
    return `${this.getName()}\n${descriptionStripped}`;
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Precipitation.${this.value}Desc`);
  }
}

class Temperature {
  static SWELTERING = new Temperature(0, "Sweltering", "☀️☀️");
  static HOT = new Temperature(1, "Hot", "☀️");
  static COMFORTABLE = new Temperature(2, "Comfortable", "🙂");
  static CHILLY = new Temperature(3, "Chilly", "❄️");
  static BITTER = new Temperature(4, "Bitter", "❄️❄️");

  static TEMPERATURE = [
    {
      min: 1,
      result: Temperature.SWELTERING
    },
    {
      min: 2,
      result: Temperature.HOT
    },
    {
      min: 3,
      result: Temperature.COMFORTABLE
    },
    {
      min: 9,
      result: Temperature.CHILLY
    },
    {
      min: 13,
      result: Temperature.BITTER
    }
  ];

  static values = [
    Temperature.SWELTERING,
    Temperature.HOT,
    Temperature.COMFORTABLE,
    Temperature.CHILLY,
    Temperature.BITTER
  ];

  constructor(key, value, icon) {
    this.key = key;
    this.value = value;
    this.icon = icon;
  }

  static fromValue(value) {
    return Temperature.values.find((e) => e.value === value);
  }

  static async random(seasonModifier, seaTemperatureModifier) {
    return await game.robakMacros.utils.rollFromCodeObject({
      table: this.TEMPERATURE,
      dice: "1d10",
      modifier: seasonModifier + seaTemperatureModifier
    });
  }

  getName() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR.Temperature." + this.value);
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Temperature.${this.value}Desc`);
  }

  getFullNameStriped() {
    let descriptionStripped = this.getDescription().replace(/(<([^>]+)>)/gi, "");
    return `${this.getName()}\n${descriptionStripped}`;
  }
}

class Visibility {
  static CLEAR = new Visibility(0, "Clear", "☀️");
  static MISTY = new Visibility(1, "Misty", "🌫️");
  static FOGGY = new Visibility(2, "Foggy", "🌫️🌫️");
  static THICK_FOG = new Visibility(3, "ThickFog", "🌫️🌫️🌫️");

  static VISIBILITY = [
    {
      min: 1,
      result: Visibility.CLEAR
    },
    {
      min: 5,
      result: Visibility.MISTY
    },
    {
      min: 9,
      result: Visibility.FOGGY
    },
    {
      min: 10,
      result: Visibility.THICK_FOG
    },
    {
      min: 11,
      result: Visibility.MISTY
    },
    {
      min: 14,
      result: Visibility.CLEAR
    }
  ];

  static values = [Visibility.CLEAR, Visibility.MISTY, Visibility.FOGGY, Visibility.THICK_FOG];

  constructor(key, value, icon) {
    this.key = key;
    this.value = value;
    this.icon = icon;
  }

  static fromValue(value) {
    return Visibility.values.find((e) => e.value === value);
  }

  static async random(seasonModifier, seaTemperatureModifier) {
    return await game.robakMacros.utils.rollFromCodeObject({
      table: this.VISIBILITY,
      dice: "1d10",
      modifier: seasonModifier + seaTemperatureModifier
    });
  }

  getName() {
    return game.i18n.localize("SEA-WEATHER-GENERATOR.Visibility." + this.value);
  }

  getDescription() {
    return game.i18n.localize(`SEA-WEATHER-GENERATOR.Visibility.${this.value}Desc`);
  }

  getFullNameStriped() {
    let descriptionStripped = this.getDescription().replace(/(<([^>]+)>)/gi, "");
    return `${this.getName()}\n${descriptionStripped}`;
  }
}

class Weather {
  constructor(precipitation, temperature, visibility) {
    this.precipitation = precipitation;
    this.temperature = temperature;
    this.visibility = visibility;
  }

  static async generate(options) {
    const seasonModifier = getSeasonModifier(options.season);
    const seaTemperatureModifier = options.seaTemperature === "Cold" ? 0 : -2;

    const precipitation =
      options.precipitation !== "Random"
        ? Precipitation.fromValue(options.precipitation)
        : await Precipitation.random(seasonModifier);
    const temperature =
      options.temperature !== "Random"
        ? Temperature.fromValue(options.temperature)
        : await Temperature.random(seasonModifier, seaTemperatureModifier);
    const visibility =
      options.visibility !== "Random"
        ? Visibility.fromValue(options.visibility)
        : await Visibility.random(seasonModifier, seaTemperatureModifier);
    return new Weather(precipitation, temperature, visibility);
  }

  getReport() {
    return `
      <h1>Sea Weather Report</h1>
      <p><b>Precipitation:</b> ${this.precipitation.getName()}</p>
      <p><i>${this.precipitation.getDescription()}</i></p>
      <p><b>Temperature:</b> ${this.temperature.getName()}</p>
      <p><i>${this.temperature.getDescription()}</i></p>
      <p><b>Visibility:</b> ${this.visibility.getName()}</p>
      <p><i>${this.visibility.getDescription()}</i></p>`;
  }

  async applyModifiers(ship) {
    await ship.deleteEmbeddedDocuments(
      "ActiveEffect",
      ship.effects
        .filter((e) => e.flags["wfrp4e-soc"]?.precipitation || e.flags["wfrp4e-soc"]?.visibility)
        .map((e) => e._id)
    );

    if (this.precipitation !== Precipitation.NONE) {
      await ship.addSystemEffect(`precipitation${this.precipitation.key}`);
    }
    if (this.visibility !== Visibility.CLEAR) {
      await ship.addSystemEffect(`visibility${this.visibility.key}`);
    }
  }
}

const TIMES_OF_DAY = ["Dawn", "Midday", "Dusk", "Midnight"];
const STYLE_MIDDLE = "text-align:center;vertical-align:middle";
const STYLE_MIDDLE_13 = `${STYLE_MIDDLE};font-size:var(--font-size-13)`;

const TableHTML = game.robakMacros.utils.TableHTML;
const RowHTML = game.robakMacros.utils.RowHTML;
const CellHTML = game.robakMacros.utils.CellHTML;

function getSeasonModifier(season) {
  switch (season) {
    case "Spring":
    case "Autumn":
      return 2;
    case "Winter":
      return 4;
    default:
      return 0;
  }
}

function getDistanceReport(totalDistance, options) {
  const standardEffects = Wind.getWindDirectionEffects(options, Direction.fromValue(options.prevailingWind));
  const standardModifiers = Object.values(standardEffects)
    .filter((e) => !!e.modifier)
    .map((e) => parseFloat(e.modifier));
  const minTime = Math.ceil(options.distance / (options.shipSpeed * 18 * Math.max(...standardModifiers)));
  const maxTime = Math.ceil(options.distance / (options.shipSpeed * 18 * Math.min(...standardModifiers)));
  const estTime = maxTime === minTime ? maxTime : `${minTime}-${maxTime}`;

  return `
    <h1>Distance Travelled</h1>
    <p><b>Base:</b> ${totalDistance.normal} mi</p>
    ${totalDistance.tack === 0 ? "" : `<p><b>Additional Tack Distance:</b> ${totalDistance.tack} mi</p>`}
    ${totalDistance.drift === 0 ? "" : `<p><b>Drift Distance:</b> ${totalDistance.drift} mi</p>`}
    <hr>
    <p><b>Remaining distance:</b> ${options.distance} mi</p>
    <p><b>Estimated time to arrival:</b> ${estTime} day(s)</p>`;
}

function getWindsRaport(winds, options) {
  const totalDistance = {
    normal: 0,
    tack: 0,
    drift: 0
  };
  let windsReport = "<h1>Wind Report</h1>";
  for (let i = 0; i < TIMES_OF_DAY.length; i++) {
    const data = winds[i].getRaport(options);
    totalDistance.normal += data.normal;
    totalDistance.tack += data.tack;
    totalDistance.drift += data.drift;
    windsReport += `<h2>${TIMES_OF_DAY[i]}</h2>${data.description}`;
  }
  return {
    totalDistance,
    windsReport
  };
}

async function createMessage(content, visibility) {
  await ChatMessage.create({
    content,
    whisper: visibility === "ShowGM" ? game.users.filter((u) => u.isGM).map((u) => u.id) : []
  });
}

async function createJournal() {
  return await JournalEntry.create({
    name: "Dziennik kapitański",
    content: new TableHTML([
      new RowHTML([
        new CellHTML("<p><b>Day</b></p>", {style: `${STYLE_MIDDLE_13}`, rowspan: 2}),
        new CellHTML("<p><b>Precip.</b></p>", {style: `${STYLE_MIDDLE_13}`, rowspan: 2}),
        new CellHTML("<p><b>Temp.</b></p>", {style: `${STYLE_MIDDLE_13}`, rowspan: 2}),
        new CellHTML("<p><b>Visibility</b></p>", {style: `${STYLE_MIDDLE_13}`, rowspan: 2}),
        new CellHTML("<p><b>Winds</b></p>", {style: `${STYLE_MIDDLE_13}`, colspan: 4}),
        new CellHTML("<p><b>Distance</b></p>", {style: `${STYLE_MIDDLE_13}`, rowspan: 2})
      ]),
      new RowHTML([
        new CellHTML("<p><b>Dawn</b></p>", {style: `${STYLE_MIDDLE_13};width: 9%`}),
        new CellHTML("<p><b>Midday</b></p>", {style: `${STYLE_MIDDLE_13};width: 9%`}),
        new CellHTML("<p><b>Dusk</b></p>", {style: `${STYLE_MIDDLE_13};width: 9%`}),
        new CellHTML("<p><b>Midnight</b></p>", {style: `${STYLE_MIDDLE_13};width: 9%`})
      ])
    ]).toString()
  });
}

async function fillJournal(options, weather, winds, totalDistance) {
  const logbook =
    options.logbookJournal === "Generate" ? await createJournal(weather) : game.journal.get(options.logbookJournal);
  const content = logbook?.pages?.contents[0]?.text?.content;
  if (content == null) {
    ui.notifications.error("Journal not found!");
    return;
  }

  let distance = `${totalDistance.normal}`;
  if (totalDistance.tack !== 0) distance += ` (+${totalDistance.tack})`;
  if (totalDistance.drift !== 0) distance += ` (${totalDistance.drift > 0 ? "+" : ""}${totalDistance.drift})`;

  const table = TableHTML.parse(content);
  table.content.push(
    new RowHTML([
      new CellHTML(`<p>${options.currentDate}</p>`, {style: STYLE_MIDDLE}),
      new CellHTML(`<p>${weather.precipitation.icon}</p>`, {
        style: STYLE_MIDDLE,
        title: weather.precipitation.getFullNameStriped()
      }),
      new CellHTML(`<p>${weather.temperature.icon}</p>`, {
        style: STYLE_MIDDLE,
        title: weather.temperature.getFullNameStriped()
      }),
      new CellHTML(`<p>${weather.visibility.icon}</p>`, {
        style: STYLE_MIDDLE,
        title: weather.visibility.getFullNameStriped()
      }),
      ...winds
        .map((w) => {
          return new CellHTML(`<p>${w.getIcon()}</p>`, {
            style: STYLE_MIDDLE,
            title: w.getFullName()
          });
        })
        .join(""),
      new CellHTML(`<p>${distance}</p>`, {style: STYLE_MIDDLE})
    ])
  );

  await logbook.pages.contents[0].update({
    "text.content": table.toString()
  });
  options.logbookJournal = logbook.id;
  options.currentTimestamp = SimpleCalendar.api.timestampPlusInterval(options.currentTimestamp, {day: 1});
  options.currentDate = SimpleCalendar.api.formatTimestamp(options.currentTimestamp, "DD MMMM YYYY");
}

function calculateRemainingDistance(totalDistance, options) {
  let distance;
  switch (options.distanceCalculation) {
    case "Optimal":
      distance = totalDistance.normal + totalDistance.tack + Math.max(totalDistance.drift, 0);
      break;
    case "Standard":
      distance = options.distance - totalDistance.normal;
      break;
    default:
      distance = 0;
      break;
  }
  return Math.max(options.distance - distance, 0);
}

async function submit(options) {
  const weather = await Weather.generate(options);
  if (options.ship !== "") {
    await weather.applyModifiers(game.actors.get(options.ship));
  }

  let winds = [];
  let wind = await Wind.generate(options);
  if (options.windStrength === "Random" && options.lastWindStrength === "Random") {
    wind = await wind.randomChange();
    options.lastWindStrength = wind.windStrength.value;
  }
  winds.push(wind);

  for (let i = 0; i < TIMES_OF_DAY.length - 1; i++) {
    wind = await wind.randomChange();
    options.lastWindStrength = wind.windStrength.value;
    winds.push(wind);
  }

  const {totalDistance, windsReport} = getWindsRaport(winds, options);

  options.distance = calculateRemainingDistance(totalDistance, options);

  if (options.weatherRaport !== "Disabled") await createMessage(weather.getReport(), options.weatherRaport);
  if (options.windsRaport !== "Disabled") await createMessage(windsReport, options.windsRaport);
  if (options.distanceReport !== "Disabled") {
    await createMessage(getDistanceReport(totalDistance, options), options.distanceReport);
  }

  if (options.logbookJournal !== "Disabled") await fillJournal(options, weather, winds, totalDistance);
}

function getJournalWithFolders() {
  let results = {};
  let folders = {};
  for (let journal of game.journal.contents.sort((a, b) => a.sort - b.sort)) {
    folders[journal.folder?.name] = journal.folder ?? {
      name: "undefined",
      sort: Infinity
    };
    results[journal.folder?.name] = results[journal.folder?.name] ?? [];
    results[journal.folder?.name].push(journal);
  }
  return Object.fromEntries(
    Object.entries(results)
      .filter(([key, _]) => !key.startsWith("_"))
      .sort(([a, _], [b, __]) => folders[a].sort - folders[b].sort)
  );
}

function getJournals() {
  let options = [];
  for (let [folder, journals] of Object.entries(getJournalWithFolders())) {
    let prefix = "";
    if (folder !== "undefined") {
      prefix = `&nbsp;&nbsp;&nbsp;&nbsp;`;
      options.push(`<option disabled>${folder}</option>`);
    }
    for (let journal of journals) {
      options.push(`<option value="${journal._id}">${prefix}${journal.name}</option>`);
    }
  }
  return options;
}

function getCurrentTimestamp() {
  const dateTime = SimpleCalendar.api.currentDateTime();
  return SimpleCalendar.api.dateToTimestamp({
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day
  });
}

const localize = (value) => game.i18n.localize(value);

const options = game.user.getFlag("world", "sea-weather-generator-options") ?? {};
const DEFAULT_OPTIONS = {
  precipitation: "Random",
  temperature: "Random",
  visibility: "Random",
  windDirection: "Random",
  windStrength: "Random",
  weatherRaport: "ShowGM",
  windsRaport: "ShowGM",
  distanceReport: "ShowGM",
  lastWindStrength: "Random",
  prevailingWind: "West",
  seaTemperature: "Cold",
  season: "Spring",
  ship: "",
  shipDirection: "West",
  shipPropulsion: "Sail",
  shipSpeed: 8,
  flyingJib: false,
  logbookJournal: "Generate",
  distanceCalculation: "Optimal",
  currentDate: SimpleCalendar?.api?.currentDateTimeDisplay()?.date ?? "1",
  currentTimestamp: getCurrentTimestamp(),
  distance: 0
};
for (let [key, value] of Object.entries(DEFAULT_OPTIONS)) {
  if (options[key] == null) {
    options[key] = value;
  }
}

new Dialog(
  {
    title: `${localize("SEA-WEATHER-GENERATOR.Label")}`,
    content: `
      <form>
        <div style="display: flex;justify-content: space-between;">
          <div style="flex: 1;padding: 5px;">
            <div class="form-group section-title">
              <label class="section-title">${localize("MACROS-AND-MORE.Settings")}</label>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Precipitation.Label")}:</label>
              <select id="precipitation" name="precipitation">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${Precipitation.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Temperature.Label")}:</label>
              <select id="temperature" name="temperature">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${Temperature.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Visibility.Label")}:</label>
              <select id="visibility" name="visibility">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${Visibility.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.WindDirection")}:</label>
              <select style="width: 50%" id="windDirection" name="windDirection">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${Direction.values.map((e) => `<option value="${e.value}">${e.getAdj()} (${e.getName()} -> ${e.opposite().getName()})</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.WindStrength")}:</label>
              <select id="windStrength" name="windStrength">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${WindStrength.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.WeatherRaport")}:</label>
              <select id="weatherRaport" name="weatherRaport">
                <option value="ShowGM">${localize("SEA-WEATHER-GENERATOR.ShowGM")}</option>
                <option value="ShowAll">${localize("SEA-WEATHER-GENERATOR.ShowAll")}</option>
                <option value="Disabled">${localize("MACROS-AND-MORE.Disabled")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.WindsRaport")}:</label>
              <select id="windsRaport" name="windsRaport">
                <option value="ShowGM">${localize("SEA-WEATHER-GENERATOR.ShowGM")}</option>
                <option value="ShowAll">${localize("SEA-WEATHER-GENERATOR.ShowAll")}</option>
                <option value="Disabled">${localize("MACROS-AND-MORE.Disabled")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.DistanceRaport")}:</label>
              <select id="distanceReport" name="distanceReport">
                <option value="ShowGM">${localize("SEA-WEATHER-GENERATOR.ShowGM")}</option>
                <option value="ShowAll">${localize("SEA-WEATHER-GENERATOR.ShowAll")}</option>
                <option value="Disabled">${localize("MACROS-AND-MORE.Disabled")}</option>
              </select>
            </div>
            <div class="form-group">
              <label style="width: 50%">${localize("SEA-WEATHER-GENERATOR.Logbook")}:</label>
              <select style="width: 50%" id="logbookJournal" name="logbookJournal">
                <option value="Generate">${localize("MACROS-AND-MORE.Create")}</option>
                <option value="Disabled">${localize("MACROS-AND-MORE.Disabled")}</option>
                <option disabled>──────────</option>
                ${getJournals().join("")}
              </select>
            </div>
            <div class="form-group">
              <label style="width: 50%">${localize("SEA-WEATHER-GENERATOR.DistanceCalculation")}:</label>
              <select style="width: 50%" id="distanceCalculation" name="distanceCalculation">
                <option value="Disabled">${localize("SEA-WEATHER-GENERATOR.LogbookDisabled")}</option>
                <option value="Standard">${localize("SEA-WEATHER-GENERATOR.LogbookStandard")}</option>
                <option value="Optimal">${localize("SEA-WEATHER-GENERATOR.LogbookOptimal")}</option>
              </select>
            </div>
          </div>
          <div style="flex: 1;padding: 5px;">
            <div class="form-group section-title">
              <label class="section-title">${localize("SEA-WEATHER-GENERATOR.ExternalConditions")}</label>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Season")}:</label>
              <select id="season" name="season">
                <option value="Spring">${localize("SEA-WEATHER-GENERATOR.Spring")}</option>
                <option value="Summer">${localize("SEA-WEATHER-GENERATOR.Summer")}</option>
                <option value="Autumn">${localize("SEA-WEATHER-GENERATOR.Autumn")}</option>
                <option value="Winter">${localize("SEA-WEATHER-GENERATOR.Winter")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.SeaTemperature")}:</label>
              <select id="seaTemperature" name="seaTemperature">
                <option value="Cold">${localize("SEA-WEATHER-GENERATOR.Cold")}</option>
                <option value="Warm">${localize("SEA-WEATHER-GENERATOR.Warm")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.PrevailingWinds")}:</label>
              <select style="width: 50%" id="prevailingWind" name="prevailingWind">
                ${Direction.values.map((e) => `<option value="${e.value}">${e.getAdj()} (${e.getName()} -> ${e.opposite().getName()})</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label style="width: 50%">${localize("SEA-WEATHER-GENERATOR.WindMidnight")}:</label>
              <select style="width: 50%" id="lastWindStrength" name="lastWindStrength">
                <option value="Random">${localize("MACROS-AND-MORE.Random")}</option>
                ${WindStrength.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group section-title">
              <label class="section-title">${localize("SEA-WEATHER-GENERATOR.Ship")}</label>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Ship")}:</label>
              <select id="ship" name="ship">
                  <option value=""></option>
                  ${game.robakMacros.utils
                    .getStashableActors()
                    .filter((a) => a.type === "vehicle")
                    .map((a) => `<option value="${a.id}">${a.name}</option>`)
                    .join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.FlyingJib")}:</label>
              <select id="flyingJib" name="flyingJib">
                <option value="true">${localize("SEA-WEATHER-GENERATOR.True")}</option>
                <option value="false">${localize("SEA-WEATHER-GENERATOR.False")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Propulsion")}:</label>
              <select id="shipPropulsion" name="shipPropulsion">
                <option value="Sail">${localize("SEA-WEATHER-GENERATOR.Sail")}</option>
                <option value="Other">${localize("SEA-WEATHER-GENERATOR.Other")}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Speed")}:</label>
              <input name="shipSpeed" value="${options.shipSpeed}" type="number" min="0">
            </div>
            <div class="form-group section-title">
              <label class="section-title">${localize("SEA-WEATHER-GENERATOR.Journey")}</label>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.Direction")}:</label>
              <select id="shipDirection" name="shipDirection">
                  ${Direction.values.map((e) => `<option value="${e.value}">${e.getName()}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.DistanceToTarget")}:</label>
              <input name="distance" type="number" value="${options.distance}" min="0">
            </div>
            <div class="form-group">
              <label>${localize("SEA-WEATHER-GENERATOR.CurrentDay")}:</label>
              <input id="visibleDate" name="visibleDate" type="text" value="${options.currentDate}" readonly>
              <input id="currentDate" name="currentDate" type="hidden" value="${options.currentDate}" />
              <input id="currentTimestamp" name="currentTimestamp" type="hidden" value="${options.currentTimestamp}" />
            </div>
            <div class="form-group">
              <button name="updateDate" type="button">${localize("SEA-WEATHER-GENERATOR.SyncWithCalendar")}</button>
            </div>
          </div>
        </div>
      </form>
      <script>
        function setSelectValue(selectId, value) {
          const selectElement = document.getElementById(selectId);
          if (selectElement == null) return;
          selectElement.value = value;
          selectElement.dispatchEvent(new Event('change'));
        }
        $("button[name='updateDate']").on("click", function() {
          const dateTime = SimpleCalendar.api.currentDateTime();
          const date = SimpleCalendar?.api?.currentDateTimeDisplay()?.date
          document.getElementById("visibleDate").value = date;
          document.getElementById("currentDate").value = date;
          document.getElementById("currentTimestamp").value = SimpleCalendar.api.dateToTimestamp({year: dateTime.year, month: dateTime.month, day: dateTime.day});
        })
        ${Object.entries(options)
          .map(([key, value]) => `setSelectValue("${key}", "${value}")`)
          .join(";")}
      </script>`,
    buttons: {
      no: {
        icon: `<i class='fas fa-undo'></i>`,
        label: localize("SEA-WEATHER-GENERATOR.DefaultSettings"),
        callback: async () => {
          await game.user.setFlag("world", "sea-weather-generator-options", DEFAULT_OPTIONS);
        }
      },
      save: {
        icon: `<i class='fas fa-save'></i>`,
        label: localize("SEA-WEATHER-GENERATOR.SaveSettings"),
        callback: async (html) => {
          const options = new FormDataExtended(html[0].querySelector("form")).object;
          await game.user.setFlag("world", "sea-weather-generator-options", options);
        }
      },
      yes: {
        icon: `<i class='fas fa-check'></i>`,
        label: localize("Submit"),
        callback: async (html) => {
          const options = new FormDataExtended(html[0].querySelector("form")).object;
          await submit(options);
          await game.user.setFlag("world", "sea-weather-generator-options", options);
        }
      }
    },
    default: "yes"
  },
  {width: 750}
).render(true);
