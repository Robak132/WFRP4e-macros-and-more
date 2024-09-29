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
   * @param totalValue {number}
   * @param convertedValue {number}
   * @param modifier {number}
   */
  constructor(region, coins = [], totalValue = 0, convertedValue = 0, modifier = 1) {
    this.region = region;
    this.coins = coins;
    this.totalValue = totalValue;
    this.convertedValue = convertedValue;
    this.modifier = modifier;
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
  static async loadRegions() {
    let regions = await fetch("modules/wfrp4e-macros-and-more/data/regions.json").then((r) => r.json());
    RobakMarketWfrp4e.regions = Object.fromEntries(
      Object.entries(regions).map(([key, r]) => [key, Region.fromJson(r)])
    );
    RobakMarketWfrp4e.currentRegion = regions[game.settings.get("wfrp4e-macros-and-more", "current-region")];
    RobakMarketWfrp4e.regionLookupTable = RobakMarketWfrp4e.#createLookupTable(RobakMarketWfrp4e.regions);
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
   * @param {object} [options={}] - Additional options.
   * @returns {Promise<boolean>} Whether the payment was successful.
   */
  static async payCommand(cmd, actor, options = {}) {
    let [command, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
    strictMode ??= false;

    let moneyToPay = RobakMarketWfrp4e.parseMoneyTransactionString(command);
    if (!moneyToPay) {
      await RobakMarketWfrp4e.printPayWrongCommand(options);
      return false;
    }

    moneyToPay = RobakMarketWfrp4e.consolidate(moneyToPay);
    let {currencies, total} = RobakMarketWfrp4e.groupMoney(actor, requestedRegion);
    let requestedCurrency = currencies[requestedRegion.key];

    if (requestedCurrency?.totalValue >= moneyToPay?.total) {
      Utility.log("Paying with requested currency");
      await RobakMarketWfrp4e.validateMoney(actor, requestedRegion);
      let {payed, _} = await RobakMarketWfrp4e.payOrCreditCurrency(actor, requestedCurrency, -moneyToPay.total);
      RobakMarketWfrp4e.throwMoney(moneyToPay);
      await RobakMarketWfrp4e.printPaySummary(actor, [{region: requestedRegion, value: payed}]);
      return true;
    } else if (!strictMode && total >= moneyToPay?.total) {
      Utility.log("Paying with requested and/or converted currency");
      /** @type {Currency[]} **/
      let selectedCurrencies = await new Promise((resolve) => {
        new CurrencyApp(Object.values(currencies), moneyToPay.total, requestedRegion, resolve).render(true);
      });
      if (!selectedCurrencies) return false;

      let paySummary = [];
      for (let currency of selectedCurrencies) {
        if (moneyToPay.total === 0) break;
        await RobakMarketWfrp4e.validateMoney(actor, currency.region);
        let {payed, remaining} = await RobakMarketWfrp4e.payOrCreditCurrency(actor, currency, -moneyToPay.total);
        moneyToPay.total = remaining;
        paySummary.push({region: currency.region, value: payed});
        Utility.log(`Paid ${payed} ${currency.region.getMainCoin().name}`);
      }
      RobakMarketWfrp4e.throwMoney(moneyToPay);
      await RobakMarketWfrp4e.printPaySummary(actor, paySummary);
      return true;
    } else {
      Utility.log("Not enough money");
      await RobakMarketWfrp4e.printNotEnoughMoney(moneyToPay, requestedCurrency, Object.values(currencies), total);
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
   * Create a lookup table for regions.
   * @param {object} regions - The regions object.
   * @returns {object} The lookup table.
   * @private
   */
  static #createLookupTable(regions) {
    let lookupTable = {};
    for (let region of Object.values(regions)) {
      for (let coin of region.coins) {
        lookupTable[coin.name] = region;
      }
    }
    return lookupTable;
  }

  /**
   * @param value {number} value in pennies
   * @param targetRegion {Region} target region
   * @param sourceRegion {Region} source region
   * @param currentRegion {Region} current region
   * @returns {{converted: number, modifier: number}}
   */
  static exchange(value, targetRegion, sourceRegion, currentRegion = RobakMarketWfrp4e.currentRegion) {
    let modifier = 1;
    if (sourceRegion.key === targetRegion.key) return {converted: value, modifier};
    if (currentRegion.key !== sourceRegion.key) {
      modifier *= 1 / currentRegion.exchangeRates[sourceRegion.key];
    }
    if (currentRegion.key !== targetRegion.key) {
      modifier *= currentRegion.exchangeRates[targetRegion.key];
    }
    let converted = Math.floor(value * modifier);
    return {converted, modifier: Utility.round(modifier, 2)};
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
    for (let money of moneyItemInventory) {
      let otherMoneyRegion = RobakMarketWfrp4e.regionLookupTable[money.name];
      if (otherMoneyRegion) {
        let value = currencies[otherMoneyRegion.key] || new Currency(otherMoneyRegion);
        value.coins.push(money);
        value.totalValue += money.system.quantity.value * money.system.coinValue.value;
        currencies[otherMoneyRegion.key] = value;
      }
    }
    let total = 0;
    for (let [regionKey, currency] of Object.entries(currencies)) {
      const {converted, modifier} = RobakMarketWfrp4e.exchange(currency.totalValue, requestedRegion, currency.region);
      currencies[regionKey].convertedValue = converted;
      currencies[regionKey].modifier = modifier;
      total += converted;
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
   * @param actor {object}
   * @param requestedCurrency {Currency}
   * @param totalChange {number} total change to pay/credit
   * @returns {Promise<{payed: number, remaining: number}>} paid and remaining amount
   */
  static async payOrCreditCurrency(actor, requestedCurrency, totalChange) {
    const originalTotalChange = totalChange;
    let updates = [];
    let coins = requestedCurrency.coins.toSorted((a, b) => b.system.coinValue.value - a.system.coinValue.value);
    for (let coin of coins) {
      if (totalChange === 0) break;

      let coinValue = coin.system.coinValue.value;
      let currentQuantity = coin.system.quantity.value;
      let numToChange = Math.floor(Math.abs(totalChange) / coinValue);

      if (totalChange < 0) {
        numToChange = Math.min(currentQuantity, numToChange);
        if (numToChange > 0) {
          coin.system.quantity.value -= numToChange;
          totalChange += numToChange * coinValue;
          updates.push(coin);
        }
      } else if (numToChange > 0) {
        coin.system.quantity.value += numToChange;
        totalChange -= numToChange * coinValue;
        updates.push(coin);
      }
    }
    await actor.updateEmbeddedDocuments("Item", updates);
    return {
      payed: originalTotalChange - totalChange,
      remaining: totalChange
    };
  }

  /**
   * @param cmd {string} Command to parse
   * @param player {object}
   */
  static async generatePayCard(cmd, player) {
    let [payRequest, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
    strictMode ??= false;

    let parsedPayRequest = RobakMarketWfrp4e.parseMoneyTransactionString(payRequest);
    // If the /pay command has a syntax error, we display an error message to the gm
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.PayRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
        <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      await ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } else {
      // generate a card with a summary and a pay button
      let cardData = {
        payRequest: cmd,
        value: Utility.formatMoney(parsedPayRequest),
        label: requestedRegion.getMainCoin().name
      };
      renderTemplate("modules/wfrp4e-macros-and-more/templates/market-pay.hbs", cardData).then((html) => {
        let chatData = WFRP_Utility.chatDataSetup(html, "roll", false, {forceWhisper: player});
        ChatMessage.create(chatData);
      });
    }
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

  // ---------------------------- Helper functions ---------------------------- //
  /**
   * @param {Object} actor
   * @param {{region: Region, value: number}[]} paySummary
   */
  static printPaySummary(actor, paySummary) {
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3><b>Payment complete:</b>`;
    let currencyMsg = "";
    for (let {region, value} of paySummary) {
      currencyMsg += `<li>${Utility.formatMoney(value)} ${region.getMainCoin().name}</li>`;
    }
    msg += `<ul>${currencyMsg}</ul><b>${game.i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }

  /**
   * @param {*} moneyToPay
   * @param {Currency} requestedCurrency
   * @param {Currency[]} currencies
   * @param {number} total
   */
  static printNotEnoughMoney(moneyToPay, requestedCurrency, currencies, total) {
    const requestedRegion = requestedCurrency.region;
    const mainCoin = requestedRegion.getMainCoin();

    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>
      ${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
      <b>Needed Money:</b> ${Utility.formatMoney(moneyToPay)} ${mainCoin.name}<br>
      <b>Available money:</b> ${Utility.formatMoney(total)} ${mainCoin.name}`;
    let otherCurrencyMsg = "";
    for (let currency of currencies) {
      const region = currency.region;
      const regionMainCoin = region.getMainCoin();
      if (currency.convertedValue === 0) continue;
      otherCurrencyMsg += `<li>${Utility.formatMoney(currency.totalValue)} ${regionMainCoin.name} (${Utility.formatMoney(currency.convertedValue)} ${mainCoin.name}) [x${currency.modifier}]</li>`;
    }
    if (otherCurrencyMsg !== "") msg += `<ul>${otherCurrencyMsg}</ul>`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }

  static printPayWrongCommand() {
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>
      <p>${game.i18n.localize("MARKET.MoneyPayCommandWrongCommand")}</p>
      <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
  }
}
