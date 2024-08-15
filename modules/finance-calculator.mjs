import RobakMarketWfrp4e from "./robak-market.js";
import Utility from "./utility.mjs";

export default class FinanceCalculator extends FormApplication {
  constructor(object = {}, options = {}) {
    super(object, options);
    this.regions = RobakMarketWfrp4e.regions;
    this.currentRegion = this.regions[game.settings.get("wfrp4e-macros-and-more", "current-region")];
    this.selectedRegion = this.regions[this.currentRegion.key];
    this.selectedRegionCurrency = this.selectedRegion.currency;
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
    const {gold, silver, bronze} = this.normaliseMoney(opt.gc * 240 + opt.ss * 12 + opt.bp);
    let amount = `${gold}${game.i18n.localize("MARKET.Abbrev.GC")}
      ${silver}${game.i18n.localize("MARKET.Abbrev.SS")}
      ${bronze}${game.i18n.localize("MARKET.Abbrev.BP")}@${this.selectedRegionId}`;
    RobakMarketWfrp4e.generatePayCard(amount);
  }

  async credit(opt) {
    const {gold, silver, bronze} = this.normaliseMoney(opt.gc * 240 + opt.ss * 12 + opt.bp);
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
    let data = {
      currentRegion: this.currentRegion.name,
      rows: Object.entries(this.currentRegion.exchangeRates).map(([key, modifier]) => {
        const region = this.regions[key];
        rows.push({
          currencySource: this.getMainCurrency(this.currentRegion),
          currencyTarget: this.getMainCurrency(region),
          modifier: modifier * this.adjustModifier(this.currentRegion.currency, region.currency),
          region: region.name
        });
      })
    };
    renderTemplate("modules/wfrp4e-macros-and-more/templates/market-exchange.hbs", data).then(
      async (html) => await ChatMessage.create(WFRP_Utility.chatDataSetup(html, "roll"))
    );
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
    this.currentRegion = this.regions[targetLocation];
    await game.settings.set("wfrp4e-macros-and-more", "current-region", this.currentRegion.key);
    this.selectedRegion = this.currentRegion;
  }

  async onCurrencyChange(event) {
    this.selectedRegion = this.regions[event.currentTarget.value];
    this.selectedRegionCurrency = this.selectedRegion.currency;
    await this.render(true);
  }

  async changeRegionDialog() {
    let obj = await ItemDialog.create(
      Object.entries(this.regions)
        .filter(([key, _]) => key !== this.currentRegion.key)
        .map(([key, region]) => ({
          id: key,
          name: `${region.name} (${this.getMainCurrency(region)})`,
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
    data.currentRegionMainCurrency = this.getMainCurrency(this.currentRegion);
    data.selectedRegionCurrency = this.selectedRegionCurrency;
    data.currencyList = Object.entries(this.regions).map(([key, region]) => ({
      key,
      name: this.getMainCurrency(region),
      region: region.name
    }));
    return data;
  }

  getMainCurrency(region) {
    return region.currency.gc ?? region.currency.ss ?? region.currency.bp;
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

  adjustModifier(currentCurrency, targetCurrency) {
    let currentCurrencyModifier = 240;
    if (currentCurrency.gc != null) currentCurrencyModifier = 1;
    else if (currentCurrency.ss != null) currentCurrencyModifier = 20;
    else if (currentCurrency.bp == null) Utility.error("No base currency found");

    let targetCurrencyModifier = 240;
    if (targetCurrency.gc != null) targetCurrencyModifier = 1;
    else if (targetCurrency.ss != null) targetCurrencyModifier = 20;
    else if (targetCurrency.bp == null) Utility.error("No base currency found");

    return targetCurrencyModifier / currentCurrencyModifier;
  }
}
