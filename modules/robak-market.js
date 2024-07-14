import Utility from "./utility.mjs";

export class RobakMarketWfrp4e {
  static async loadRegions() {
    let regions = await fetch("modules/wfrp4e-macros-and-more/data/regions.json").then((r) => r.json());
    let currentRegion = regions[game.settings.get("wfrp4e-macros-and-more", "current-region")];
    for (let region of Object.keys(regions)) {
      regions[region].name = game.i18n.localize(regions[region].name);
      regions[region].currency.gc = game.i18n.localize(regions[region].currency.gc);
      regions[region].currency.ss = game.i18n.localize(regions[region].currency.ss);
      regions[region].currency.bp = game.i18n.localize(regions[region].currency.bp);
    }
    RobakMarketWfrp4e.regions = regions;
    RobakMarketWfrp4e.currentRegion = currentRegion;
    RobakMarketWfrp4e.regionLookupTable = this.createLookupTable(regions);
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

  static createLookupTable(regions) {
    return Object.entries(regions).reduce((list, [key, {currency}]) => {
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

  static exchange(value, currentRegion, targetMoneyRegion, sourceMoneyRegion) {
    let modifier = 1;
    if (sourceMoneyRegion === targetMoneyRegion) return {value, modifier};
    if (currentRegion !== sourceMoneyRegion) {
      modifier *= 1 / RobakMarketWfrp4e.regions[currentRegion].exchangeRates[sourceMoneyRegion];
    }
    if (currentRegion !== targetMoneyRegion) {
      modifier *= RobakMarketWfrp4e.regions[currentRegion].exchangeRates[targetMoneyRegion];
    }
    let converted = Math.floor(value * modifier);
    return {converted, modifier: Utility.round(modifier, 2)};
  }

  static consolidate(moneyToPay) {
    let total = moneyToPay.gc * 240 + moneyToPay.ss * 12 + moneyToPay.bp;
    let temp = total;
    let gc = Math.floor(temp / 240);
    temp = temp % 240;
    let ss = Math.floor(temp / 12);
    let bp = temp % 12;
    return {gc, ss, bp, total};
  }

  static format(moneyToPay) {
    moneyToPay = this.consolidate(moneyToPay);
    let result = "";
    if (moneyToPay.gc === 0 && moneyToPay.ss === 0 && moneyToPay.bp === 0) return "0";
    if (moneyToPay.gc > 0) result += `${moneyToPay.gc} `;
    if (moneyToPay.ss === 0 && moneyToPay.bp === 0) return result.trim();

    let bp = moneyToPay.bp > 0 ? moneyToPay.bp : "-";
    if (moneyToPay.bp > 0 && moneyToPay.ss === 0) result += `${moneyToPay.bp}p`;
    else result += `${moneyToPay.ss}/${bp}`;
    return result.trim();
  }

  static groupMoney(actor, requestedRegion) {
    const moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());

    let requestedMoney = {gc: [], ss: [], bp: [], total: 0};
    let otherMoney = {};
    for (let money of moneyItemInventory) {
      if (money.name === requestedRegion.currency.gc) {
        requestedMoney.gc.push(money);
        requestedMoney.total += money.system.quantity.value * money.system.coinValue.value;
      } else if (money.name === requestedRegion.currency.ss) {
        requestedMoney.ss.push(money);
        requestedMoney.total += money.system.quantity.value * money.system.coinValue.value;
      } else if (money.name === requestedRegion.currency.bp) {
        requestedMoney.bp.push(money);
        requestedMoney.total += money.system.quantity.value * money.system.coinValue.value;
      } else {
        let otherMoneyRegion = RobakMarketWfrp4e.regionLookupTable[money.name];
        Utility.log(otherMoneyRegion);
        if (otherMoneyRegion) {
          let value = otherMoney[otherMoneyRegion] || {gc: [], ss: [], bp: [], total: 0};
          if (money.name === RobakMarketWfrp4e.regions[otherMoneyRegion].currency.gc) {
            value.gc.push(money);
            value.total += money.system.quantity.value * money.system.coinValue.value;
          } else if (money.name === RobakMarketWfrp4e.regions[otherMoneyRegion].currency.ss) {
            value.ss.push(money);
            value.total += money.system.quantity.value * money.system.coinValue.value;
          } else if (money.name === RobakMarketWfrp4e.regions[otherMoneyRegion].currency.bp) {
            value.bp.push(money);
            value.total += money.system.quantity.value * money.system.coinValue.value;
          }
          otherMoney[otherMoneyRegion] = value;
        }
      }
    }
    for (let [key, {total}] of Object.entries(otherMoney)) {
      let {converted, modifier} = this.exchange(total, RobakMarketWfrp4e.currentRegion.key, requestedRegion.key, key);
      otherMoney[key].converted = converted;
      otherMoney[key].modifier = modifier;
    }
    return {requestedMoney, otherMoney};
  }

  static async validateMoney(actor, requestedRegion) {
    const moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    const coins = [
      {name: requestedRegion.currency.gc, img: "modules/wfrp4e-core/icons/currency/goldcrown.png", value: 240},
      {name: requestedRegion.currency.ss, img: "modules/wfrp4e-core/icons/currency/silvershilling.png", value: 12},
      {name: requestedRegion.currency.bp, img: "modules/wfrp4e-core/icons/currency/brasspenny.png", value: 1}
    ];
    let result = [];
    for (let coin of coins) {
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

  static directPayCommand(amount, actor, options = {}) {
    this.payCommand(amount, actor, options).then(() => Utility.log("Pay command executed"));
  }

  static async payCommand(cmd, actor, options = {}) {
    let [command, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
    strictMode ??= false;

    let moneyToPay = this.parseMoneyTransactionString(command);
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>`;
    if (!moneyToPay) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p>
        <p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      return this.printMessageToChat(msg, options);
    }
    moneyToPay = this.consolidate(moneyToPay);
    let {requestedMoney, otherMoney} = this.groupMoney(actor, requestedRegion);
    Utility.log(requestedMoney, otherMoney);

    let updates;
    if (requestedMoney.total >= moneyToPay.total) {
      // We can pay with requested money
      let moneyChange = duplicate(moneyToPay);
      await this.validateMoney(actor, requestedRegion);
      updates = await this.changeWithRequestedMoney(requestedMoney, moneyChange);
    } else if (!strictMode && requestedMoney.total + otherMoney.total >= moneyToPay.total) {
      // We can pay with requested and other money
      let moneyChange = duplicate(moneyToPay);
      await this.validateMoney(actor, requestedRegion);
      updates = await this.changeWithRequestedMoney(requestedMoney, moneyChange);
    } else {
      // We can't pay
      msg += `${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
            <b>Local money needed:</b> ${this.format(moneyToPay)} ${requestedRegion.currency.gc}<br>
            <b>Local money available:</b> ${this.format(requestedMoney)} ${requestedRegion.currency.gc}<br>`;
      let otherCurrencyMsg = "";
      for (let [key, value] of Object.entries(otherMoney).filter(([key, _]) => key !== "total")) {
        let region = RobakMarketWfrp4e.regions[key];
        otherCurrencyMsg += `<li><strong>${region.name}:</strong> ${value.converted} ${requestedRegion.currency.bp} (x${value.modifier})</li>`;
      }
      if (otherCurrencyMsg !== "") {
        msg += `<b>Other (converted):</b><ul>${otherCurrencyMsg}<li><strong>Total:</strong> ${otherMoney.total} ${requestedRegion.currency.bp}</li></ul>`;
      }
      return this.printMessageToChat(msg, options);
    }
    await actor.updateEmbeddedDocuments("Item", updates);

    msg += game.i18n.format("MARKET.Paid", {
      number1: moneyToPay.gc,
      number2: moneyToPay.ss,
      number3: moneyToPay.bp
    });
    msg += `<br><b>${game.i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;
    this.throwMoney(moneyToPay);
    return this.printMessageToChat(msg, options);
  }

  static async changeWithRequestedMoney(requestedMoney, moneyChange) {
    let updates = [];
    for (let i = 0; i < requestedMoney.bp.length; i++) {
      if (moneyChange.bp === 0) {
        break;
      }
      let money = requestedMoney.bp[i];
      if (money.system.quantity.value >= moneyChange.bp) {
        money.system.quantity.value -= moneyChange.bp;
        moneyChange.bp = 0;
      } else {
        moneyChange.bp -= money.system.quantity.value;
        money.system.quantity.value = 0;
      }
      if (i === requestedMoney.bp.length - 1 && moneyChange.bp > 0) {
        // No more BP try to get SS
        money.system.quantity.value = Math.ceil(moneyChange.bp / 12) * 12 - moneyChange.bp;
        moneyChange.ss += Math.ceil(moneyChange.bp / 12);
        moneyChange.bp = 0;
      }
      updates.push(money);
    }
    for (let i = 0; i < requestedMoney.ss.length; i++) {
      if (moneyChange.ss === 0) {
        break;
      }
      let money = requestedMoney.ss[i];
      if (money.system.quantity.value >= moneyChange.ss) {
        money.system.quantity.value -= moneyChange.ss;
        moneyChange.ss = 0;
      } else {
        moneyChange.ss -= money.system.quantity.value;
        money.system.quantity.value = 0;
      }
      if (i === requestedMoney.ss.length - 1 && moneyChange.ss > 0) {
        // No more SS try to get GC
        money.system.quantity.value = Math.ceil(moneyChange.ss / 20) * 20 - moneyChange.ss;
        moneyChange.gc += Math.ceil(moneyChange.ss / 20);
        moneyChange.ss = 0;
      }
      updates.push(money);
    }
    for (let i = 0; i < requestedMoney.gc.length; i++) {
      if (moneyChange.gc === 0) {
        break;
      }
      let money = requestedMoney.gc[i];
      if (money.system.quantity.value >= moneyChange.gc) {
        money.system.quantity.value -= moneyChange.gc;
        moneyChange.gc = 0;
      } else {
        moneyChange.gc -= money.system.quantity.value;
        money.system.quantity.value = 0;
      }
      updates.push(money);
    }
    return updates;
  }

  static generatePayCard(cmd, player) {
    let [payRequest, regionKey, strictMode] = cmd.split("@");
    let requestedRegion = regionKey == null ? RobakMarketWfrp4e.currentRegion : RobakMarketWfrp4e.regions[regionKey];
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
