import MarketWfrp4e from "./market.js";
import Utility from "./utility.mjs";

export class RobakMarketWfrp4e extends MarketWfrp4e {
  static async loadRegions() {
    this.regions = await fetch("modules/wfrp4e-macros-and-more/regions.json").then((r) => r.json());
    for (let region in this.regions) {
      this.regions[region].name = game.i18n.localize(this.regions[region].name);
      this.regions[region].currency.gc = game.i18n.localize(this.regions[region].currency.gc);
      this.regions[region].currency.ss = game.i18n.localize(this.regions[region].currency.ss);
      this.regions[region].currency.bp = game.i18n.localize(this.regions[region].currency.bp);
    }
  }

  static consolidateMoney(money) {
    //We sort the money from the highest BP value to the lowest (so gc => ss => bp)
    //This allow us to deal with custom money too and to not be dependent on the money name
    // (translation errors could break the code otherwise)
    money.sort((a, b) => b.system.coinValue.value - a.system.coinValue.value);

    let brass = 0;
    //First we calculate the BP value
    for (let m of money) brass += m.system.quantity.value * m.system.coinValue.value;

    //Then we consolidate the coins
    for (let m of money) {
      //We don't know what players could create as a custom money and we dont want to divide by zero, ever.
      // It would kill a kitten somewhere, probably.
      if (m.system.coinValue.value <= 0) break;
      m.system.quantity.value = Math.trunc(brass / m.system.coinValue.value);
      brass = brass % m.system.coinValue.value;
    }

    return money;
  }

  static creditCommand(amount, actor, options = {}) {
    //First we parse the amount
    let moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let moneyToSend = this.parseMoneyTransactionString(amount);
    let msg = `<h3><b>${game.i18n.localize("MARKET.CreditCommand")}</b></h3>`;
    let errorOccured = false;
    //Wrong amount
    if (!moneyToSend) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize(
        "MARKET.CreditCommandExample"
      )}</i></p>`;
      errorOccured = true;
    }
    //Command is ok, let's try to pay
    else {
      //We need to get the character money items for gc, ss and bp. This is a "best effort" lookup method. If it fails, we stop the amount to prevent any data loss.
      let characterMoney = this.getCharacterMoney(moneyItemInventory);
      this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

      //If one money is missing, we stop here before doing anything bad
      if (Object.values(characterMoney).includes(false)) {
        msg += `<p>${game.i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
        errorOccured = true;
      } else {
        //Great, we can just deduce the quantity for each money
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
      this.throwMoney(moneyToSend);
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
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    }
    return moneyItemInventory;
  }

  static createLookupTable() {
    return Object.entries(this.getLocalizedRegionsTable()).reduce((list, [key, {currency}]) => {
      Object.values(currency).forEach((coin) => (list[coin] = key));
      return list;
    }, {});
  }

  static printMessageToChat(msg, options) {
    if (options.suppressMessage) {
      ui.notifications.notify(msg);
    } else {
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    }
  }

  static convert(value, currentRegion, targetMoneyRegion, sourceMoneyRegion) {
    let modifier = 1;
    if (sourceMoneyRegion === targetMoneyRegion) return {value, modifier};
    if (currentRegion !== sourceMoneyRegion) {
      modifier *= 1 / this.regions[currentRegion].exchangeRates[sourceMoneyRegion];
    }
    if (currentRegion !== targetMoneyRegion) {
      modifier *= this.regions[currentRegion].exchangeRates[targetMoneyRegion];
    }
    return {value: Math.floor(value * modifier), modifier: Utility.round(modifier, 2)};
  }

  static countMoney(moneyItemInventory, requestedMoneyRegion, currentRegion) {
    const regionLookupTable = this.createLookupTable();
    let requestedMoney = {gc: 0, ss: 0, bp: 0, totalBP: 0};
    let otherMoney = {};
    for (let money of moneyItemInventory) {
      switch (money.name) {
        case requestedMoneyRegion.currency.gc:
          requestedMoney.gc += money.system.quantity.value;
          requestedMoney.totalBP += money.system.quantity.value * money.system.coinValue.value;
          break;
        case requestedMoneyRegion.currency.ss:
          requestedMoney.ss += money.system.quantity.value;
          requestedMoney.totalBP += money.system.quantity.value * money.system.coinValue.value;
          break;
        case requestedMoneyRegion.currency.bp:
          requestedMoney.bp += money.system.quantity.value;
          requestedMoney.totalBP += money.system.quantity.value * money.system.coinValue.value;
          break;
        default:
          let otherMoneyRegion = regionLookupTable[money.name];
          if (otherMoneyRegion) {
            let value = otherMoney[otherMoneyRegion] || 0;
            value += money.system.quantity.value * money.system.coinValue.value;
            otherMoney[otherMoneyRegion] = value;
          }
          break;
      }
    }
    for (let [key, value] of Object.entries(otherMoney)) {
      let {converted, modifier} = this.convert(value, currentRegion.key, requestedMoneyRegion.key, key);
      otherMoney[key] = {converted, value, modifier};
      let total = otherMoney["totalBP"] || 0;
      total += converted;
      otherMoney["totalBP"] = total;
    }

    return {requestedMoney, otherMoney};
  }

  static payCommand(cmd, actor, options = {}) {
    const currentRegion = this.regions[game.settings.get("wfrp4e-macros-and-more", "currentRegion")];
    const moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());

    let [command, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? currentRegion : this.regions[regionKey];
    strictMode ??= false;

    let moneyToPay = this.parseMoneyTransactionString(command);
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>`;

    if (!moneyToPay) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
        <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      return this.printMessageToChat(msg, options);
    }

    let {requestedMoney, otherMoney} = this.countMoney(moneyItemInventory, requestedRegion, currentRegion);
    let totalBPToPay = moneyToPay.gc * 240 + moneyToPay.ss * 12 + moneyToPay.bp;

    if (requestedMoney.totalBP >= totalBPToPay) {
      // We can pay with requested money
    } else if (!strictMode && requestedMoney.totalBP + otherMoney.totalBP >= totalBPToPay) {
      // We can pay with requested and other money
    } else {
      // We can't pay
      msg += `${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
            <b>${game.i18n.localize("MARKET.MoneyNeeded")}</b> ${totalBPToPay} ${requestedRegion.currency.bp}<br>
            <b>${game.i18n.localize("MARKET.MoneyAvailable")}</b> ${requestedMoney.totalBP} ${requestedRegion.currency.bp}<br>
            <b>${game.i18n.localize("MARKET.OtherMoneyAvailable")}</b> ${otherMoney.totalBP} ${requestedRegion.currency.bp}<br>`;
      let otherCurrencyMsg = "";
      for (let [key, value] of Object.entries(otherMoney).filter(([key, _]) => key !== "totalBP")) {
        let region = this.regions[key];
        otherCurrencyMsg += `<li>${region.name}: ${value.converted} ${region.currency.bp} (x${value.modifier})</li>`;
      }
      if (otherCurrencyMsg !== "") msg += `<ul>${otherCurrencyMsg}</ul>`;

      return this.printMessageToChat(msg, options);
    }

    msg += game.i18n.format("MARKET.Paid", {
      number1: moneyToPay.gc,
      number2: moneyToPay.ss,
      number3: moneyToPay.bp
    });
    msg += `<br><b>${game.i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;
    this.throwMoney(moneyToPay);
    this.printMessageToChat(msg, options);
    return moneyItemInventory;
  }

  static generatePayCard(cmd, player) {
    const currentRegion = this.regions[game.settings.get("wfrp4e-macros-and-more", "currentRegion")];

    let [payRequest, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? currentRegion : this.regions[regionKey];
    strictMode ??= false;

    let parsedPayRequest = this.parseMoneyTransactionString(payRequest);
    // If the /pay command has a syntax error, we display an error message to the gm
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.format("MARKET.PayRequest", {currency: region.gc ?? region.ss})}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
        <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } else {
      // generate a card with a summary and a pay button
      let cardData = {
        payRequest: payRequest,
        quantityGold: parsedPayRequest.gc,
        labelGold: requestedRegion.currency.gc,
        quantitySilver: parsedPayRequest.ss,
        labelSilver: requestedRegion.currency.ss,
        quantityBronze: parsedPayRequest.bp,
        labelBronze: requestedRegion.currency.bp
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
    return this.makeSomeChange(bpAmount, bpRemainder);
  }

  static processCredit(creditRequest, optionOrName) {
    let parsedPayRequest = this.parseMoneyTransactionString(creditRequest);

    //If the /credit command has a syntax error, we display an error message to the gm
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.CreditRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize(
        "MARKET.CreditCommandExample"
      )}</i></p>`;
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } //generate a card with a summary and a receive button
    else {
      let amount, message, forceWhisper;
      optionOrName = optionOrName || "split"; // Default behavior

      // Process split/each options
      let nbActivePlayers = Array.from(game.users).filter((u) => u.role !== 4 && u.active).length;
      if (optionOrName.toLowerCase() === "each" || optionOrName.toLowerCase() === "split") {
        if (nbActivePlayers === 0) {
          let message = game.i18n.localize("MARKET.NoPlayers");
          ChatMessage.create({content: message});
          return;
        }
        if (optionOrName.toLowerCase() === "split") {
          amount = this.splitAmountBetweenAllPlayers(parsedPayRequest, nbActivePlayers);
          message = game.i18n.format("MARKET.RequestMessageForSplitCredit", {
            activePlayerNumber: nbActivePlayers,
            initialAmount: this.amountToString(parsedPayRequest)
          });
        } else if (optionOrName.toLowerCase() === "each") {
          amount = parsedPayRequest;
          message = game.i18n.format("MARKET.RequestMessageForEachCredit", {
            activePlayerNumber: nbActivePlayers,
            initialAmount: this.amountToString(parsedPayRequest)
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
            initialAmount: this.amountToString(parsedPayRequest)
          });
        } else {
          let actor = game.actors.find((a) => a.name.toLowerCase().includes(paName.toLowerCase()));
          if (actor) {
            let money = this.creditCommand(this.amountToString(amount), actor); // Imediate processing!
            if (money) {
              actor.updateEmbeddedDocuments("Item", money);
            }
            return;
          } else {
            message = game.i18n.localize("MARKET.NoMatchingPlayer");
            ChatMessage.create({content: message});
            return;
          }
        }
      }
      let cardData = {
        digestMessage: message,
        amount: this.amountToString(amount),
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

  static addGold(actor, region) {
    return {
      img: "modules/wfrp4e-core/icons/currency/goldcrown.png",
      name: region.gc,
      "system.quantity.value": 1,
      "system.encumbrance.value": 0.005,
      "system.coinValue.value": 240,
      type: "money"
    };
  }
}
