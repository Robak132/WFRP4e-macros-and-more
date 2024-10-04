import Utility from "./utility.mjs";
import CurrencyApp from "./currency-app.mjs";

class Region {
  /**
   * @param key {string}
   * @param name {string}
   * @param coins {Coin[]}
   * @param exchangeRates {object}
   */
  constructor(key, name, coins, exchangeRates) {
    this.key = key;
    this.name = name;
    this.coins = coins;
    this.exchangeRates = exchangeRates;
  }

  /**
   * @param json {object}
   * @returns {Region}
   */
  static fromJson(json) {
    return new Region(
      json.key,
      game.i18n.localize(json.name),
      json.coins.map((c) => Coin.fromJson(c)),
      json.exchangeRates
    );
  }

  /**
   * @returns {Coin} main coin
   */
  getMainCoin() {
    return this.coins.reduce((prev, curr) => (prev.value > curr.value ? prev : curr));
  }
}

class Coin {
  /**
   * @param key {string}
   * @param name {string}
   * @param image {string}
   * @param value {number}
   */
  constructor(key, name, image, value) {
    this.key = key;
    this.name = name;
    this.image = image;
    this.value = value;
  }

  get img() {
    return this.image ?? "modules/wfrp4e-core/icons/currency/goldcrown.png";
  }

  /**
   * @param json {object}
   * @returns {Coin}
   */
  static fromJson(json) {
    return new Coin(json.key, game.i18n.localize(json.name), json.img, json.value);
  }
}

class Currency {
  /**
   * @param region {Region}
   * @param coins {object[]}
   */
  constructor(region, coins = []) {
    this.region = region;
    this.coins = coins;
  }

  /** @returns {number} */
  getValue() {
    return this.coins
      .map((coin) => coin.system.quantity.value * coin.system.coinValue.value)
      .reduce((acc, val) => acc + val, 0);
  }

  getExchangeModifier(targetRegion, currentRegion = RobakMarketWfrp4e.currentRegion) {
    return RobakMarketWfrp4e.getExchangeModifier(targetRegion, this.region, currentRegion);
  }

  getConvertedValue(targetRegion, currentRegion = RobakMarketWfrp4e.currentRegion) {
    return RobakMarketWfrp4e.getConvertedValue(this.getValue(), targetRegion, this.region, currentRegion);
  }
}

export async function overrideMarket() {
  libWrapper.register(
    "wfrp4e-macros-and-more",
    `ChatWFRP._onMarketButtonClicked`,
    async (wrapper, event) => {
      if (["payItem", "creditItem"].includes($(event.currentTarget).attr("data-button"))) {
        await onMarketButtonClicked.call(this, event);
      } else {
        wrapper.call(this, event);
      }
    },
    "MIXED"
  );

  for (let method of Utility.getMethods(MarketWfrp4e)) {
    Utility.log(`Registering ${method}`);
    libWrapper.register(
      "wfrp4e-macros-and-more",
      `MarketWfrp4e.${method}`,
      (wrapper, ...args) => {
        if (RobakMarketWfrp4e.hasOwnProperty(method)) return RobakMarketWfrp4e[method].call(this, ...args);
        return wrapper.call(this, ...args);
      },
      "MIXED"
    );
  }
  Utility.log("Market override succeeded");
}

export async function onMarketButtonClicked(event) {
  let msg = game.messages.get($(event.currentTarget).parents(".message").attr("data-message-id"));
  switch ($(event.currentTarget).attr("data-button")) {
    case "payItem":
      if (!game.user.isGM) {
        let actor = game.user.character;
        let itemData;
        if (msg.flags.transfer) itemData = JSON.parse(msg.flags.transfer).payload;
        if (actor) {
          let succeeded = await RobakMarketWfrp4e.payCommand($(event.currentTarget).attr("data-pay"), actor);
          if (succeeded) {
            WFRP_Audio.PlayContextAudio({item: {type: "money"}, action: "lose"});
            if (itemData) {
              actor.createEmbeddedDocuments("Item", [itemData]);
              ui.notifications.notify(game.i18n.format("MARKET.ItemAdded", {item: itemData.name, actor: actor.name}));
            }
          }
        } else {
          ui.notifications.notify(game.i18n.localize("MARKET.NotifyNoActor"));
        }
      } else {
        ui.notifications.notify(game.i18n.localize("MARKET.NotifyUserMustBePlayer"));
      }
      break;
    case "creditItem":
      if (!game.user.isGM) {
        let actor = game.user.character;
        if (actor) {
          let dataExchange = $(event.currentTarget).attr("data-amount");
          let money = await RobakMarketWfrp4e.creditCommand(dataExchange, actor);
          if (money) {
            WFRP_Audio.PlayContextAudio({item: {type: "money"}, action: "gain"});
            let instances = msg.getFlag("wfrp4e", "instances") - 1;
            let messageUpdate = {};

            // Only allow credit to be taken as many times as it has been split
            // This allows a player to take multiple times if they wish, but not more than the original total amount
            // This solution might fail if two or more players click the button at the same time and create a race condition
            if (instances <= 0) {
              messageUpdate = {content: `<p><strong>${game.i18n.localize("CHAT.NoMoreLeft")}</strong></p>`};
            } else {
              messageUpdate = {"flags.wfrp4e.instances": instances};
            }
            game.socket.emit("system.wfrp4e", {type: "updateMsg", payload: {id: msg.id, updateData: messageUpdate}});
          }
        } else {
          ui.notifications.notify(game.i18n.localize("MARKET.NotifyNoActor"));
        }
      } else {
        ui.notifications.notify(game.i18n.localize("MARKET.NotifyUserMustBePlayer"));
      }
      break;
  }
}

export default class RobakMarketWfrp4e extends MarketWfrp4e {
  static get currentRegion() {
    return RobakMarketWfrp4e.regions[game.settings.get("wfrp4e-macros-and-more", "current-region")];
  }

  static async loadRegions() {
    let regions = await fetch("modules/wfrp4e-macros-and-more/data/regions.json").then((r) => r.json());
    RobakMarketWfrp4e.regions = Object.fromEntries(
      Object.entries(regions).map(([key, r]) => [key, Region.fromJson(r)])
    );
  }

  // ---------------------------- Override ---------------------------- //
  /**
   * Directly execute the pay command.
   * @param amount {string} The amount to pay.
   * @param actor {object}  The actor making the payment.
   * @param options {object} Additional options.
   */
  static directPayCommand(amount, actor, options = {}) {
    RobakMarketWfrp4e.payCommand(amount, actor, options).then(() => Utility.log("Pay command executed"));
  }

  /**
   * Execute the pay command.
   * @param {string} cmd - The command string.
   * @param {object} actor - The actor making the payment.
   * @param {object} - Additional options.
   * @returns {Promise<boolean>} Whether the payment was successful.
   */
  static async payCommand(cmd, actor) {
    let [command, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
    strictMode ??= false;

    let moneyValue = RobakMarketWfrp4e.parseMoneyTransactionString(command);
    if (!moneyValue) {
      await RobakMarketWfrp4e.printPayWrongCommand();
      return false;
    }

    let {currencies, total} = RobakMarketWfrp4e.groupMoney(actor, requestedRegion);
    let requestedCurrency = currencies[requestedRegion.key];

    if (requestedCurrency?.getValue() >= moneyValue) {
      Utility.log("Paying with requested currency");
      await RobakMarketWfrp4e.validateMoney(actor, requestedRegion);
      let {paid} = RobakMarketWfrp4e.payInCurrency(actor, requestedRegion, requestedCurrency, moneyValue);
      RobakMarketWfrp4e.throwMoney(moneyValue);
      await RobakMarketWfrp4e.printPaySummary(actor, requestedRegion, [{currency: requestedCurrency, value: paid}]);
      return true;
    } else if (!strictMode && total >= moneyValue) {
      Utility.log("Paying with requested and/or converted currency");
      let selectedCurrencies = await RobakMarketWfrp4e.getCurrencyFromApp(
        Object.values(currencies),
        moneyValue,
        requestedRegion
      );
      if (!selectedCurrencies) return false;

      let paySummary = [];
      for (let currency of selectedCurrencies) {
        if (moneyValue === 0) break;
        await RobakMarketWfrp4e.validateMoney(actor, currency.region);
        let {paid, remaining} = RobakMarketWfrp4e.payInCurrency(actor, requestedRegion, currency, moneyValue);
        moneyValue = remaining;
        paySummary.push({currency, value: paid});
        Utility.log(`Paid ${RobakMarketWfrp4e.formatMoney(paid)} ${currency.region.getMainCoin().name}`);
      }
      RobakMarketWfrp4e.throwMoney(moneyValue);
      await RobakMarketWfrp4e.printPaySummary(actor, requestedRegion, paySummary);
      return true;
    } else {
      Utility.log("Not enough money");
      await RobakMarketWfrp4e.printNotEnoughMoney(moneyValue, requestedRegion, Object.values(currencies), total);
    }
    return false;
  }

  /**
   * Execute the credit command.
   * @param {string} amount - The amount to credit.
   * @param {object} actor - The actor receiving the credit.
   * @param {object} options - Additional options.
   * @returns {Promise<boolean>} The updated money inventory or false if an error occurred.
   */
  static async creditCommand(amount, actor, options = {}) {
    // First we parse the amount
    let moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let moneyToSend = RobakMarketWfrp4e.parseMoneyTransactionString(amount);
    let msg = `<h3><b>${game.i18n.localize("MARKET.CreditCommand")}</b></h3>`;
    let errorOccured = false;
    // Wrong amount
    if (!moneyToSend) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize(
        "MARKET.CreditCommandExample"
      )}</i></p>`;
      errorOccured = true;
    }
    // Command is ok, let's try to pay
    else {
      // We need to get the character money items for gc, ss and bp. This is a "best effort" lookup method. If it fails, we stop the amount to prevent any data loss.
      let characterMoney = RobakMarketWfrp4e.getCharacterMoney(moneyItemInventory);
      RobakMarketWfrp4e.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

      // If one money is missing, we stop here before doing anything bad
      if (Object.values(characterMoney).includes(false)) {
        msg += `<p>${game.i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
        errorOccured = true;
      } else {
        // Great, we can just deduce the quantity for each money
        moneyItemInventory[characterMoney.gc].system.quantity.value += moneyToSend.gc;
        moneyItemInventory[characterMoney.ss].system.quantity.value += moneyToSend.ss;
        moneyItemInventory[characterMoney.bp].system.quantity.value += moneyToSend.bp;
      }
    }
    if (errorOccured) {
      moneyItemInventory = false;
    } else {
      msg += game.i18n.format("MARKET.Credit", {
        number1: moneyToSend.gc,
        number2: moneyToSend.ss,
        number3: moneyToSend.bp
      });
      msg += `<br><b>${game.i18n.localize("MARKET.ReceivedBy")}</b> ${actor.name}`;
      RobakMarketWfrp4e.throwMoney(moneyToSend);
    }
    if (options.suppressMessage) {
      ui.notifications.notify(
        `${actor.name} received ${moneyToSend.gc}${game.i18n.localize(
          "MARKET.Abbrev.GC"
        )} ${moneyToSend.ss}${game.i18n.localize(
          "MARKET.Abbrev.SS"
        )} ${moneyToSend.bp}${game.i18n.localize("MARKET.Abbrev.BP")}`
      );
    } else {
      await ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    }
    return moneyItemInventory;
  }

  /**
   * Process a credit request.
   * @param {string} creditRequest - The credit request string.
   * @param {string} optionOrName - The option or player name.
   */
  static async processCredit(creditRequest, optionOrName) {
    let parsedPayRequest = RobakMarketWfrp4e.parseMoneyTransactionString(creditRequest);

    //If the /credit command has a syntax error, we display an error message to the gm
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.CreditRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize(
        "MARKET.CreditCommandExample"
      )}</i></p>`;
      await ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } //generate a card with a summary and a receive button
    else {
      let amount, message, forceWhisper;
      optionOrName = optionOrName || "split"; // Default behavior

      // Process split/each options
      let nbActivePlayers = Array.from(game.users).filter((u) => u.role !== 4 && u.active).length;
      if (optionOrName.toLowerCase() === "each" || optionOrName.toLowerCase() === "split") {
        if (nbActivePlayers === 0) {
          let message = game.i18n.localize("MARKET.NoPlayers");
          await ChatMessage.create({content: message});
          return;
        }
        if (optionOrName.toLowerCase() === "split") {
          amount = RobakMarketWfrp4e.splitAmountBetweenAllPlayers(parsedPayRequest, nbActivePlayers);
          message = game.i18n.format("MARKET.RequestMessageForSplitCredit", {
            activePlayerNumber: nbActivePlayers,
            initialAmount: RobakMarketWfrp4e.amountToString(parsedPayRequest)
          });
        } else if (optionOrName.toLowerCase() === "each") {
          amount = parsedPayRequest;
          message = game.i18n.format("MARKET.RequestMessageForEachCredit", {
            activePlayerNumber: nbActivePlayers,
            initialAmount: RobakMarketWfrp4e.amountToString(parsedPayRequest)
          });
        }
      } else {
        amount = parsedPayRequest;
        let paName = optionOrName.trim().toLowerCase();
        let player = game.users.players.filter((p) => p.name.toLowerCase() === paName);
        if (player[0]) {
          // Player found !
          forceWhisper = player[0].name;
          message = game.i18n.format("MARKET.CreditToUser", {
            userName: player[0].name,
            initialAmount: RobakMarketWfrp4e.amountToString(parsedPayRequest)
          });
        } else {
          let actor = game.actors.find((a) => a.name.toLowerCase().includes(paName.toLowerCase()));
          if (actor) {
            let money = RobakMarketWfrp4e.creditCommand(RobakMarketWfrp4e.amountToString(amount), actor); // Imediate processing!
            if (money) {
              await actor.updateEmbeddedDocuments("Item", money);
            }
            return;
          } else {
            message = game.i18n.localize("MARKET.NoMatchingPlayer");
            await ChatMessage.create({content: message});
            return;
          }
        }
      }
      let cardData = {
        digestMessage: message,
        amount: RobakMarketWfrp4e.amountToString(amount),
        QtGC: amount.gc,
        QtSS: amount.ss,
        QtBP: amount.bp
      };
      renderTemplate("modules/wfrp4e-macros-and-more/templates/market-credit.hbs", cardData).then((html) => {
        let chatData = WFRP_Utility.chatDataSetup(html, "roll", false, {forceWhisper});
        foundry.utils.setProperty(chatData, "flags.wfrp4e.instances", nbActivePlayers);
        ChatMessage.create(chatData);
      });
    }
  }

  /**
   * @param {Currency[]} currencies
   * @param {number} moneyValue
   * @param {Region} requestedRegion
   * @returns {Promise<Currency[]>}
   */
  static async getCurrencyFromApp(currencies, moneyValue, requestedRegion) {
    return await new Promise((resolve) => {
      new CurrencyApp(currencies, moneyValue, requestedRegion, resolve).render(true);
    });
  }

  /**
   * @returns {Object.<string, Region>} The lookup table.
   */
  static getLookupTable() {
    let lookupTable = {};
    for (let region of Object.values(RobakMarketWfrp4e.regions)) {
      for (let coin of region.coins) {
        lookupTable[coin.name] = region;
      }
    }
    return lookupTable;
  }

  /**
   * Parse a price string like "8gc6bp" or "74ss 12gc" etc.
   * @param {String} string - The string to parse
   * @returns {number|null} The parsed price
   */
  static parseMoneyTransactionString(string) {
    const expression = /((\d+)\s?(\p{L}+))/gu;
    let matches = [...string.matchAll(expression)];

    let price = 0;
    for (let match of matches) {
      if (match.length !== 4) return null;
      switch (match[3].toLowerCase()) {
        case game.i18n.localize("MARKET.Abbrev.GC").toLowerCase():
          price += parseInt(match[2], 10) * 240;
          break;
        case game.i18n.localize("MARKET.Abbrev.SS").toLowerCase():
          price += parseInt(match[2], 10) * 12;
          break;
        case game.i18n.localize("MARKET.Abbrev.BP").toLowerCase():
          price += parseInt(match[2], 10);
          break;
      }
    }
    return price === 0 ? null : price;
  }

  /**
   * @param value {number} value in pennies
   * @param targetRegion {Region} target region
   * @param sourceRegion {Region} source region
   * @param currentRegion {Region} current region
   * @returns {number} The exchange modifier
   */
  static getConvertedValue(value, targetRegion, sourceRegion, currentRegion = RobakMarketWfrp4e.currentRegion) {
    return Math.floor(value * RobakMarketWfrp4e.getExchangeModifier(targetRegion, sourceRegion, currentRegion));
  }

  /**
   * @param targetRegion {Region} target region
   * @param sourceRegion {Region} source region
   * @param currentRegion {Region} current region
   * @returns {number} The exchange modifier
   */
  static getExchangeModifier(targetRegion, sourceRegion, currentRegion = RobakMarketWfrp4e.currentRegion) {
    if (sourceRegion.key === targetRegion.key) return 1;

    let modifier = 1;
    if (currentRegion.key !== sourceRegion.key) modifier /= currentRegion.exchangeRates[sourceRegion.key];
    if (currentRegion.key !== targetRegion.key) modifier *= currentRegion.exchangeRates[targetRegion.key];

    return modifier;
  }

  static consolidate(moneyObject) {
    let total = (moneyObject?.gc ?? 0) * 240 + (moneyObject?.ss ?? 0) * 12 + (moneyObject?.bp ?? 0);
    let temp = total;
    let gc = Math.floor(temp / 240);
    temp = temp % 240;
    let ss = Math.floor(temp / 12);
    let bp = temp % 12;
    return {gc, ss, bp, total};
  }

  /**
   * @param {object} actor
   * @param {Region} requestedRegion
   * @returns {{currencies: Object.<string, Currency>, total: number}}
   */
  static groupMoney(actor, requestedRegion) {
    const moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());

    /** @type {Object.<string, Currency>} */
    let currencies = {};
    let lookupTable = RobakMarketWfrp4e.getLookupTable();
    for (let money of moneyItemInventory) {
      let otherMoneyRegion = lookupTable[money.name];
      if (otherMoneyRegion) {
        let value = currencies[otherMoneyRegion.key] || new Currency(otherMoneyRegion);
        value.coins.push(money);
        currencies[otherMoneyRegion.key] = value;
      }
    }
    let total = 0;
    for (let currency of Object.values(currencies)) {
      total += currency.getConvertedValue(requestedRegion);
    }
    return {currencies, total};
  }

  /**
   * @param actor {object}
   * @param requestedRegion {Region}
   */
  static async validateMoney(actor, requestedRegion) {
    const moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let result = [];
    for (let coin of requestedRegion.coins) {
      if (!moneyItemInventory.find((m) => m.name === coin.name)) {
        let found = await game.wfrp4e.utility.findItem(coin.name);
        if (found) {
          found = found.toObject();
          found["system.quantity.value"] = 0;
        } else {
          found = {
            name: coin.name,
            img: coin.img,
            type: "money",
            "system.description.value": "",
            "system.quantity.value": 0,
            "system.coinValue.value": coin.value,
            "system.encumbrance.value": 0.005
          };
        }
        result.push(found);
      }
    }
    if (result.length) {
      Utility.log(`Creating: `, result);
      await actor.createEmbeddedDocuments("Item", result);
    }
  }

  /**
   * Handles payment of currency for an actor.
   * @param {object} actor - The actor whose currency will be modified.
   * @param {Region} requestedRegion - The region to convert currency to.
   * @param {Currency} currency - The currency details to use for the transaction (local currency).
   * @param {number} gValue - The total change to pay (global currency).
   * @returns {Promise<{paid: number, remaining: number}>} An object containing the paid and remaining amounts.
   */
  static payInCurrency(actor, requestedRegion, currency, gValue) {
    // l - local currency, g - global currency
    let updates = [];
    const modifier = currency.getExchangeModifier(requestedRegion);
    let lValue = gValue / modifier;
    let lToPay = Math.max(0, gValue - RobakMarketWfrp4e.getConvertedValue(gValue, currency.region, requestedRegion)); // 3.44 remaining -> 4 to pay
    let lPaid = lValue - lToPay;

    // Lowest value of the currency coin
    let lMinCoinValue = currency.coins.reduce((p, c) => {
      return p.system.coinValue.value < c.system.coinValue.value ? p : c;
    }).system.coinValue.value;
    lPaid = Math.ceil(lPaid / lMinCoinValue); // 320 / 240 = 1.33 -> 2
    lToPay = Math.max(0, Math.ceil(lToPay / lMinCoinValue)); // 3.44 -> 4
    let lRemaining = currency.getValue() - lPaid;

    for (let coin of currency.coins.toSorted((a, b) => b.system.coinValue.value - a.system.coinValue.value)) {
      let coinValue = coin.system.coinValue.value;
      let q = Math.floor(lRemaining / coinValue);
      lRemaining = lRemaining % coinValue;
      updates.push({_id: coin._id, "system.quantity.value": q});
    }

    actor.updateEmbeddedDocuments("Item", updates);
    return {
      paid: lPaid,
      remaining: lToPay * modifier
    };
  }

  static makeSomeChange(amount, bpRemainder) {
    let gc = 0;
    let ss = 0;
    let bp = 0;
    if (amount >= 0) {
      gc = Math.floor(amount / 240);
      amount = amount % 240;
      ss = Math.floor(amount / 12);
      bp = amount % 12;
      bp = bp + (bpRemainder > 0 ? 1 : 0);
    }
    return {
      gc: gc,
      ss: ss,
      bp: bp
    };
  }

  static amountToString(amount) {
    let gc = game.i18n.localize("MARKET.Abbrev.GC");
    let ss = game.i18n.localize("MARKET.Abbrev.SS");
    let bp = game.i18n.localize("MARKET.Abbrev.BP");
    return `${amount.gc || amount.g || 0}${gc} ${amount.ss || amount.s || 0}${ss} ${amount.bp || amount.b || 0}${bp}`;
  }

  static splitAmountBetweenAllPlayers(initialAmount, nbOfPlayers) {
    // convert initialAmount in bp
    let bpAmount = initialAmount.gc * 240 + initialAmount.ss * 12 + initialAmount.bp;
    // divide bpAmount by nb of players and get the true remainder
    let bpRemainder = bpAmount % nbOfPlayers;
    bpAmount = Math.floor(bpAmount / nbOfPlayers);
    // rebuild an amount of gc/ss/bp from bpAmount
    return RobakMarketWfrp4e.makeSomeChange(bpAmount, bpRemainder);
  }

  static throwMoney(moneyValue) {
    let number = Math.floor(moneyValue / 240);
    moneyValue = moneyValue % 240;
    number = Math.max(number, Math.floor(moneyValue / 12));
    moneyValue = moneyValue % 12;
    number = Math.max(number, Math.floor(moneyValue));
    if (game.dice3d && game.settings.get("wfrp4e", "throwMoney")) {
      new Roll(`${number}dc`).evaluate().then((roll) => {
        game.dice3d.showForRoll(roll);
      });
    }
  }

  // ---------------------------- Money format functions ---------------------- //
  /**
   * Formats a given amount of money into a string representation.
   * @param value {number} The money to format.
   * @param region {Region|null} The region to use for formatting.
   * @returns {string} The formatted string representation of the money.
   */
  static formatMoney(value, region = null) {
    const goldCoin = region?.coins?.some((c) => c.key === "zk") ?? false;
    const silverCoin = region?.coins?.some((c) => c.key === "s") ?? false;
    const bronzeCoin = region?.coins?.some((c) => c.key === "p") ?? false;
    let formattedValue = RobakMarketWfrp4e.formatMoneyValue(value, {goldCoin, silverCoin, bronzeCoin});
    if (region) formattedValue += ` ${region.getMainCoin().name}`;
    return formattedValue;
  }

  /**
   * Formats a given amount of money into a string representation.
   * @param value {number} The money to format.
   * @param goldCoin {boolean} Whether to include gold coins.
   * @param silverCoin {boolean} Whether to include silver coins.
   * @param bronzeCoin {boolean} Whether to include bronze coins
   * @returns {string} The formatted string representation of the money.
   */
  static formatMoneyValue(value, {goldCoin = true, silverCoin = true, bronzeCoin = true}) {
    let moneyToPay = RobakMarketWfrp4e.consolidate({bp: value});

    if (goldCoin && !silverCoin && !bronzeCoin) {
      return `${moneyToPay.gc}`;
    }
    if (!goldCoin && silverCoin && bronzeCoin) {
      const ss = moneyToPay.ss || "-";
      const bp = moneyToPay.bp ? Math.floor(moneyToPay.bp) : "-";
      return `${ss}/${bp}`;
    }

    if (moneyToPay.gc === 0 && moneyToPay.ss === 0 && moneyToPay.bp === 0) return "0";

    let result = moneyToPay.gc ? `${moneyToPay.gc} ` : "";
    if (!moneyToPay.ss && !moneyToPay.bp) return result.trim();

    const ss = moneyToPay.ss || "-";
    const bp = moneyToPay.bp ? Math.floor(moneyToPay.bp) : "-";
    result += `${ss}/${bp}`;
    return result.trim();
  }

  // ---------------------------- Helper functions ---------------------------- //
  /**
   * @param cmd {string} Command to parse
   * @param player {object}
   */
  static generatePayCard(cmd, player) {
    let [payRequest, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
    strictMode ??= false;

    let parsedPayRequest = RobakMarketWfrp4e.parseMoneyTransactionString(payRequest);
    // If the /pay command has a syntax error, we display an error message to the gm
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.PayRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
        <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } else {
      // generate a card with a summary and a pay button
      let cardData = {
        payRequest: cmd,
        value: RobakMarketWfrp4e.formatMoney(parsedPayRequest),
        valueBP: parsedPayRequest,
        label: requestedRegion.getMainCoin().name
      };
      renderTemplate("modules/wfrp4e-macros-and-more/templates/market-pay.hbs", cardData).then((html) => {
        let chatData = WFRP_Utility.chatDataSetup(html, "roll", false, {forceWhisper: player});
        ChatMessage.create(chatData);
      });
    }
  }

  /**
   * @param {Object} actor
   * @param {Region} requestedRegion
   * @param {{currency: Currency, value: number}[]} paySummary
   */
  static printPaySummary(actor, requestedRegion, paySummary) {
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3><b>Payment complete:</b>`;
    let currencyMsg = "";
    for (let {currency, value} of paySummary) {
      const region = currency.region;
      const localMoney = RobakMarketWfrp4e.formatMoney(value, region);
      const convertedValue = Math.ceil(value * currency.getExchangeModifier(requestedRegion));
      const globalMoney = RobakMarketWfrp4e.formatMoney(convertedValue, requestedRegion);
      currencyMsg += `<li>${localMoney} (${value}) -> ${globalMoney} (${convertedValue})</li>`;
    }
    msg += `<ul>${currencyMsg}</ul><b>${game.i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }

  /**
   * @param {number} moneyValue
   * @param {Region} requestedRegion
   * @param {Currency[]} currencies
   * @param {number} total
   */
  static printNotEnoughMoney(moneyValue, requestedRegion, currencies, total) {
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>
      ${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
      <b>Needed Money:</b> ${RobakMarketWfrp4e.formatMoney(moneyValue, requestedRegion)} (${moneyValue})<br>
      <b>Available money:</b> ${RobakMarketWfrp4e.formatMoney(total, requestedRegion)} (${total})`;
    let otherCurrencyMsg = currencies
      .filter((currency) => currency.getValue() !== 0)
      .map((currency) => {
        const localMoney = RobakMarketWfrp4e.formatMoney(currency.getValue(), currency.region);
        const converted = currency.getConvertedValue(requestedRegion);
        const globalMoney = RobakMarketWfrp4e.formatMoney(converted, requestedRegion);
        return `<li>${localMoney} (${currency.getValue()}) -> ${globalMoney} (${converted})</li>`;
      })
      .join("");
    if (otherCurrencyMsg !== "") msg += `<ul>${otherCurrencyMsg}</ul>`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }

  static printPayWrongCommand() {
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>
      <p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
      <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }
}
