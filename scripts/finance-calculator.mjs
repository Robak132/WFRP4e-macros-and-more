import Utility from "./utility.mjs";

export class FinanceCalculator extends FormApplication {
  REGIONS = {
    empire: {
      key: "empire",
      name: "Empire",
      gold: game.i18n.localize("NAME.GC"),
      silver: game.i18n.localize("NAME.SS"),
      bronze: game.i18n.localize("NAME.BP")
    },
    bretonia: {
      key: "bretonia",
      name: "Bretonnia",
      gold: "Złote ecu",
      silver: "Srebrny denar",
      bronze: "Brązowy pens"
    },
    estalia: {
      key: "estalia",
      name: "Estalia",
      gold: "Złote excelente",
      silver: "Srebrny real",
      bronze: "Brązowe duro"
    },
    kislev: {
      key: "kislev",
      name: "Kislev",
      gold: "Złoty dukat",
      silver: "Srebrna denga",
      bronze: "Brązowe pulo"
    },
    norsca: {
      // In Norsca there are no gold coins, only silver and bronze.
      key: "norsca",
      name: "Norsca",
      silver: "Srebrna sceatta",
      bronze: "Brązowy fennig"
    },
    tilea: {
      key: "tilea",
      name: "Tilea",
      gold: game.i18n.localize("NAME.GC"),
      silver: game.i18n.localize("NAME.SS"),
      bronze: game.i18n.localize("NAME.BP")
    },
    dwarf: {
      key: "dwarf",
      name: "Dwarf Keeps",
      gold: "Złocisz",
      silver: "Srebrniak",
      bronze: "Miedziak"
    },
    elf: {
      // Elven kingdoms don't use silver coins in trade with humans.
      key: "elf",
      name: "Elf Kingdoms",
      gold: "Złoty suweren"
    },
    araby: {
      // Names are self-made as there are no official names for Arabyan coins except for rials.
      key: "araby",
      name: "Araby",
      gold: "Złoty rial",
      silver: "Srebrny dirham",
      bronze: "Brązowy fals"
    }
  };
  EXCHANGE_RATES = [
    [1.0, 1.05, 1.1, 1.1, 1.0, 0.8, 0.9, 1.05, 1.1],
    [0.95, 1.0, 1.05, 1.1, 1.0, 0.85, 0.85, 1.0, 1.05],
    [0.9, 0.95, 1.0, 0.9, 1.0, 0.9, 0.8, 1.0, 1.0],
    [0.9, 0.95, 1.1, 1.0, 1.0, 1.0, 0.9, 0.95, 0.9],
    [0.7, 0.8, 0.9, 0.95, 1.0, 0.95, 0.8, 0.9, 1.0],
    [0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 0.0, 0.8, 0.9],
    [1.2, 1.3, 1.4, 1.4, 1.0, 1.5, 1.0, 1.0, 1.2],
    [0.95, 1.0, 1.05, 1.05, 1.0, 1.2, 1.0, 1.0, 1.05],
    [0.9, 0.95, 1.0, 1.1, 1.0, 0.9, 0.8, 0.95, 1.0]
  ];

  constructor(object = {}, options = {}) {
    super(object, options);
    this.currentRegion = this.REGIONS[game.settings.get("wfrp4e-macros-and-more", "currentRegion")];
    this.selectedRegion = this.currentRegion;
    this.selectedRegionCurrencies = {
      gold: this.currentRegion.gold,
      silver: this.currentRegion.silver,
      bronze: this.currentRegion.bronze
    };
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "finance-calculator",
      title: "Finance Calculator",
      template: "modules/wfrp4e-macros-and-more/templates/finance-calculator.hbs"
    });
  }

  normaliseMoney(bronze) {
    const gold = Math.floor(bronze / 240);
    bronze = bronze % 240;
    const silver = Math.floor(bronze / 12);
    bronze = Math.floor(bronze % 12);
    return {
      gold,
      silver,
      bronze
    };
  }

  pay(opt) {
    const {gold, silver, bronze} = this.normaliseMoney(opt.gold * 240 + opt.silver * 12 + opt.bronze);
    if (gold > 0 || silver > 0 || bronze > 0) {
      new Macro({
        command:
          "/pay " +
          `${gold}${game.i18n.localize("MARKET.Abbrev.GC")}` +
          `${silver}${game.i18n.localize("MARKET.Abbrev.SS")}` +
          `${bronze}${game.i18n.localize("MARKET.Abbrev.BP")}`,
        type: "chat",
        name: "pay"
      }).execute();
    }
  }

  async credit(opt) {
    const {gold, silver, bronze} = this.normaliseMoney(opt.gold * 240 + opt.silver * 12 + opt.bronze);
    if (gold > 0 || silver > 0 || bronze > 0) {
      await new Macro({
        command:
          "/credit " +
          `${gold}${game.i18n.localize("MARKET.Abbrev.GC")}` +
          `${silver}${game.i18n.localize("MARKET.Abbrev.SS")}` +
          `${bronze}${game.i18n.localize("MARKET.Abbrev.BP")} ${opt.split ? "split" : "each"}`,
        type: "chat",
        name: "credit"
      }).execute();
    }
  }

  exchange() {
    let rows = [];
    for (const [key, region] of Object.entries(this.REGIONS)) {
      if (key === this.currentRegion.key) continue;
      let row = {
        currencySource: this.currentRegion.gold,
        currencyTarget: region.gold,
        modifier: this.EXCHANGE_RATES[this.getIdx(key)][this.getIdx(this.currentRegion.key)],
        region: region.name
      };
      if (this.currentRegion.gold == null && region.silver == null) {
        // Elven case, only gold coins.
        row.currencySource = this.currentRegion.silver;
        row.currencyTarget = region.gold;
        row.modifier = 20 * row.modifier;
      } else if (this.currentRegion.silver == null && region.gold == null) {
        // Elven case, only gold coins
        row.currencySource = this.currentRegion.gold;
        row.currencyTarget = region.silver;
        row.modifier = Utility.round((1 / 20) * row.modifier, 2);
      } else if (this.currentRegion.gold == null || region.gold == null) {
        // Norsca case, no gold coins.
        row.currencySource = this.currentRegion.silver;
        row.currencyTarget = region.silver;
      }
      rows.push(row);
    }
    renderTemplate("modules/wfrp4e-macros-and-more/templates/market-exchange.hbs", {
      currentRegion: this.currentRegion.name,
      rows
    }).then(async (html) => {
      await ChatMessage.create(WFRP_Utility.chatDataSetup(html, "roll"));
    });
  }

  getIdx(location) {
    return Object.keys(this.REGIONS).indexOf(location);
  }

  extractDataFromCoin(money) {
    const updates = {};
    const coinValue = money.system.coinValue.value;
    let location = money.flags["wfrp4e-macros-and-more"]?.moneyLocation;
    if (location === undefined) {
      updates["flags.wfrp4e-macros-and-more.moneyLocation"] = "empire";
      location = "empire";
    }
    let baseCoinValue = money.flags["wfrp4e-macros-and-more"]?.moneyBaseValue;
    if (baseCoinValue === undefined) {
      updates["flags.wfrp4e-macros-and-more.moneyBaseValue"] = money.system.coinValue.value;
      baseCoinValue = coinValue;
    }
    money.update(updates);
    return {
      location,
      coinValue,
      baseCoinValue
    };
  }

  async changeRegion(targetLocation) {
    this.currentRegion = this.REGIONS[targetLocation];
    await game.settings.set("wfrp4e-macros-and-more", "currentRegion", this.currentRegion.key);
    // const currentLocationIdx = this.getIdx(targetLocation); // let content = '<div
  }

  async onCurrencyChange(event) {
    let targetRegion = event.currentTarget.value;
    targetRegion = targetRegion === "any" ? this.currentRegion.key : targetRegion;

    this.selectedRegion = this.REGIONS[targetRegion];
    this.selectedRegionCurrencies = {
      gold: this.selectedRegion.gold,
      silver: this.selectedRegion.silver,
      bronze: this.selectedRegion.bronze
    };
    await this.render(true);
  }

  //       style = "overflow-y: scroll;max-height: 500px" >
  //         '; // // for (const actor of game.actors) { // if (!actor.itemTypes.money.length) { // continue; // } // // let
  //       moneyContent = ""; // for (const money of actor.itemTypes.money) { // const {location, coinValue, baseCoinValue} =
  //       this.extractDataFromCoin(money); // const convertedValue =
  //       Math.round(this.DATA[this.getIdx(location)][currentLocationIdx] * baseCoinValue); // // if
  //       (money.system.quantity.value === 0 || convertedValue === coinValue);
  //       { // continue; // } // // moneyContent += `<div
  //         class
  //
  //         = "form-group" > //
  //           < span;
  //         style = "flex: 5;text-align: center" >${money.name} < /span>;
  //         //
  //         <span style="flex: 3;text-align: center">${this.NATIONS[location].name}</span>;
  //         //
  //         <span style="flex: 1;text-align: center">${coinValue}</span>;
  //         //
  //         <span style="flex: 1;text-align: center">&#8594;</span>;
  //         //
  //         <span style="flex: 1;text-align: center">${convertedValue}</span>;
  //         //
  //       </div>
  //         `; // // coinUpdates.push({ // object: money, // value: convertedValue // }); // } // if (moneyContent !== "") {
  //   // content += ` < p;
  //         style = "text-align: center" >${actor.name} < /p>` + moneyContent; /;
  //         / } /;
  //         / } /;
  //         / content += "</div > "; //
  // // await new Dialog({ // title: `Changing location from ${this.NATIONS[this.currentRegion].name} to ${ //
  //         this.NATIONS[Object.keys(this.NATIONS)[currentLocationIdx]].name; // }`, // content, // buttons: { // no: { // icon: '<i
  //         class
  //
  //         = "fas fa-times" > < /i>', /;
  //         / label: "Cancel" /;
  //         / }, /;
  //         / yes: { /;
  //         / icon: '<i class="fas fa-check"></i > ', // label: "Proceed", // callback:
  //         async () => { // for (const entry of coinUpdates) { // await entry.object.update({"system.coinValue.value":
  //           entry.value;
  //         };
  //       )
  // } // } // } // }, // default: "yes" // }).render(true); }
  async changeRegionDialog() {
    let obj = await ItemDialog.create(
      Object.entries(this.REGIONS)
        .filter(([key, _]) => key !== this.currentRegion.key)
        .map(([key, region]) => ({
          id: key,
          name: region.name,
          img: "systems/wfrp4e/icons/blank.png"
        }))
    );
    await this.changeRegion(obj[0].id);
    await this.render(true);
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
    $(document).find($("select#currency")).val(this.selectedRegion.key);
  }

  getData(options = {}) {
    const data = super.getData();
    data.currentRegion = this.currentRegion;
    data.currentRegionName = this.currentRegion.name;
    data.targetCurrencyNames = this.selectedRegionCurrencies;
    data.currentRegionMainCurrency = this.currentRegion.gold ?? this.currentRegion.silver ?? this.currentRegion.bronze;
    data.currencies = Object.entries(this.REGIONS).map(([key, region]) => ({
      key,
      name: region.gold ?? region.silver ?? region.bronze,
      region: region.name
    }));
    return data;
  }

  async _updateObject(event, formData) {
    switch (event.submitter.id) {
      case "pay":
        return this.pay(formData);
      case "credit":
        return this.credit(formData);
      case "exchange":
        return this.exchange();
      case "changeRegion":
        return this.changeRegionDialog();
      default:
        return;
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", "button#changeRegion", this.changeRegionDialog.bind(this));
    html.on("change", "select#currency", this.onCurrencyChange.bind(this));
  }
}
