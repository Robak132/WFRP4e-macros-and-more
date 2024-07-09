export default class MarketWfrp4e {
  static async testForAvailability({settlement, rarity, modifier}) {
    let validSettlements = Object.getOwnPropertyNames(game.wfrp4e.config.availabilityTable);
    let validSettlementsLocalized = {};
    let validRarityLocalized = {};

    validSettlements.forEach(function (index) {
      validSettlementsLocalized[game.i18n.localize(index).toLowerCase()] = index;
    });

    if (settlement && validSettlementsLocalized.hasOwnProperty(settlement)) {
      let validRarity = Object.getOwnPropertyNames(
        game.wfrp4e.config.availabilityTable[validSettlementsLocalized[settlement]]
      );
      validRarity.forEach(function (index) {
        validRarityLocalized[game.i18n.localize(index).toLowerCase()] = index;
      });
    }

    let msg = `<h3><b>${game.i18n.localize("MARKET.AvailabilityTest")}</b></h3>`;

    if (
      !settlement ||
      !rarity ||
      !validSettlementsLocalized.hasOwnProperty(settlement) ||
      !validRarityLocalized.hasOwnProperty(rarity)
    ) {
      msg += `<p>${game.i18n.localize("MARKET.AvailWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.AvailCommandExample")}</i></p>`;
    } else {
      let roll = await new Roll("1d100 - @modifier", {modifier: modifier}).roll();

      let availabilityLookup =
        game.wfrp4e.config.availabilityTable[validSettlementsLocalized[settlement]][validRarityLocalized[rarity]];
      let isAvailable = availabilityLookup.test > 0 && roll.total <= availabilityLookup.test;

      let finalResult = {
        settlement: settlement.charAt(0).toUpperCase() + settlement.slice(1),
        rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
        instock: isAvailable ? game.i18n.localize("Yes") : game.i18n.localize("No"),
        quantity: isAvailable ? availabilityLookup.stock : 0,
        roll: roll.total
      };

      if (availabilityLookup.stock.includes("d")) {
        let stockRoll = await new Roll(availabilityLookup.stock).roll();
        finalResult.quantity = stockRoll.total;
      }

      msg += this.formatTestForChat(finalResult);
    }
    ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll", true));
  }

  static formatTestForChat(result) {
    return `
        <b>${game.i18n.localize("MARKET.SettlementSize")}</b> ${result.settlement}<br>
        <b>${game.i18n.localize("MARKET.Rarity")}</b> ${result.rarity}<br><br>
        <b>${game.i18n.localize("MARKET.InStock")}</b> ${result.instock}<br>
        <b>${game.i18n.localize("MARKET.QuantityAvailable")}</b> ${result.quantity}<br>
        <b>${game.i18n.localize("Roll")}:</b> ${result.roll}
      `;
  }

  static generateSettlementChoice(rarity) {
    let cardData = {rarity: game.wfrp4e.config.availability[rarity]};
    renderTemplate("systems/wfrp4e/templates/chat/market/market-settlement.hbs", cardData).then((html) => {
      let chatData = WFRP_Utility.chatDataSetup(html, "selfroll");
      ChatMessage.create(chatData);
    });
  }

  static consolidateMoney(money) {
    money.sort((a, b) => b.system.coinValue.value - a.system.coinValue.value);

    let brass = 0;

    for (let m of money) brass += m.system.quantity.value * m.system.coinValue.value;

    for (let m of money) {
      if (m.system.coinValue.value <= 0) break;
      m.system.quantity.value = Math.trunc(brass / m.system.coinValue.value);
      brass = brass % m.system.coinValue.value;
    }

    return money;
  }

  static creditCommand(amount, actor, options = {}) {
    let moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let moneyToSend = this.parseMoneyTransactionString(amount);
    let msg = `<h3><b>${game.i18n.localize("MARKET.CreditCommand")}</b></h3>`;
    let errorOccured = false;

    if (!moneyToSend) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.CreditCommandExample")}</i></p>`;
      errorOccured = true;
    } else {
      let characterMoney = this.getCharacterMoney(moneyItemInventory);
      this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

      if (Object.values(characterMoney).includes(false)) {
        msg += `<p>${game.i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
        errorOccured = true;
      } else {
        moneyItemInventory[characterMoney.gc].system.quantity.value += moneyToSend.gc;
        moneyItemInventory[characterMoney.ss].system.quantity.value += moneyToSend.ss;
        moneyItemInventory[characterMoney.bp].system.quantity.value += moneyToSend.bp;
      }
    }
    if (errorOccured) moneyItemInventory = false;
    else {
      msg += game.i18n.format("MARKET.Credit", {
        number1: moneyToSend.gc,
        number2: moneyToSend.ss,
        number3: moneyToSend.bp
      });
      msg += `<br><b>${game.i18n.localize("MARKET.ReceivedBy")}</b> ${actor.name}`;
      this.throwMoney(moneyToSend);
    }
    if (options.suppressMessage)
      ui.notifications.notify(
        `${actor.name} received ${moneyToSend.gc}${game.i18n.localize("MARKET.Abbrev.GC")} ${moneyToSend.ss}${game.i18n.localize("MARKET.Abbrev.SS")} ${moneyToSend.bp}${game.i18n.localize("MARKET.Abbrev.BP")}`
      );
    else ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    return moneyItemInventory;
  }

  static directPayCommand(amount, actor, options = {}) {
    let moneyPaid = this.payCommand(amount, actor);
    if (moneyPaid) {
      actor.updateEmbeddedDocuments("Item", moneyPaid);
    }
  }

  static payCommand(command, actor, options = {}) {
    let moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let moneyToPay = this.parseMoneyTransactionString(command);
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>`;
    let errorOccured = false;

    if (!moneyToPay) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      errorOccured = true;
    } else {
      let characterMoney = this.getCharacterMoney(moneyItemInventory);
      this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

      if (Object.values(characterMoney).includes(false)) {
        msg += `<p>${game.i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
        errorOccured = true;
      } else {
        if (
          moneyToPay.gc <= moneyItemInventory[characterMoney.gc].system.quantity.value &&
          moneyToPay.ss <= moneyItemInventory[characterMoney.ss].system.quantity.value &&
          moneyToPay.bp <= moneyItemInventory[characterMoney.bp].system.quantity.value
        ) {
          moneyItemInventory[characterMoney.gc].system.quantity.value -= moneyToPay.gc;
          moneyItemInventory[characterMoney.ss].system.quantity.value -= moneyToPay.ss;
          moneyItemInventory[characterMoney.bp].system.quantity.value -= moneyToPay.bp;
        } else {
          let totalBPAvailable = 0;
          for (let m of moneyItemInventory) totalBPAvailable += m.system.quantity.value * m.system.coinValue.value;

          let totalBPPay = moneyToPay.gc * 240 + moneyToPay.ss * 12 + moneyToPay.bp;

          if (totalBPAvailable < totalBPPay) {
            msg += `${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
              <b>${game.i18n.localize("MARKET.MoneyNeeded")}</b> ${totalBPPay} ${game.i18n.localize("NAME.BP")}<br>
              <b>${game.i18n.localize("MARKET.MoneyAvailable")}</b> ${totalBPAvailable} ${game.i18n.localize("NAME.BP")}`;
            errorOccured = true;
          } else {
            totalBPAvailable -= totalBPPay;
            moneyItemInventory[characterMoney.gc].system.quantity.value = 0;
            moneyItemInventory[characterMoney.ss].system.quantity.value = 0;
            moneyItemInventory[characterMoney.bp].system.quantity.value = totalBPAvailable;

            moneyItemInventory = this.consolidateMoney(moneyItemInventory);
          }
        }
      }
    }
    if (errorOccured) {
      moneyItemInventory = false;
    } else {
      msg += game.i18n.format("MARKET.Paid", {
        number1: moneyToPay.gc,
        number2: moneyToPay.ss,
        number3: moneyToPay.bp
      });
      msg += `<br><b>${game.i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;

      this.throwMoney(moneyToPay);
    }
    if (options.suppressMessage) ui.notifications.notify(msg);
    else ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    return moneyItemInventory;
  }

  static checkCharacterMoneyValidity(moneyItemInventory, characterMoney) {
    for (let m = 0; m < moneyItemInventory.length; m++) {
      switch (moneyItemInventory[m].system.coinValue.value) {
        case 240:
          if (characterMoney.gc === false) characterMoney.gc = m;
          break;
        case 12:
          if (characterMoney.ss === false) characterMoney.ss = m;
          break;
        case 1:
          if (characterMoney.bp === false) characterMoney.bp = m;
          break;
      }
    }
  }

  static getCharacterMoney(moneyItemInventory) {
    let moneyTypeIndex = {
      gc: false,
      ss: false,
      bp: false
    };

    for (let m = 0; m < moneyItemInventory.length; m++) {
      switch (moneyItemInventory[m].name) {
        case game.i18n.localize("NAME.GC"):
          moneyTypeIndex.gc = m;
          break;
        case game.i18n.localize("NAME.SS"):
          moneyTypeIndex.ss = m;
          break;
        case game.i18n.localize("NAME.BP"):
          moneyTypeIndex.bp = m;
          break;
      }
    }
    return moneyTypeIndex;
  }

  static throwMoney(moneyValues) {
    let number = moneyValues.gc || 0;
    if ((moneyValues.ss || 0) > number) number = moneyValues.ss || 0;
    if ((moneyValues.bp || 0) > number) number = moneyValues.bp || 0;

    if (game.dice3d && game.settings.get("wfrp4e", "throwMoney")) {
      new Roll(`${number}dc`).evaluate().then((roll) => {
        game.dice3d.showForRoll(roll);
      });
    }
  }

  static parseMoneyTransactionString(string) {
    const expression = /((\d+)\s?(\p{L}+))/gu;
    let matches = [...string.matchAll(expression)];

    let payRecap = {
      gc: 0,
      ss: 0,
      bp: 0
    };
    let isValid = matches.length;
    for (let match of matches) {
      if (match.length !== 4) {
        isValid = false;
        break;
      }

      switch (match[3].toLowerCase()) {
        case game.i18n.localize("MARKET.Abbrev.GC").toLowerCase():
          payRecap.gc += parseInt(match[2], 10);
          break;
        case game.i18n.localize("MARKET.Abbrev.SS").toLowerCase():
          payRecap.ss += parseInt(match[2], 10);
          break;
        case game.i18n.localize("MARKET.Abbrev.BP").toLowerCase():
          payRecap.bp += parseInt(match[2], 10);
          break;
      }
    }
    if (isValid && payRecap.gc + payRecap.ss + payRecap.bp === 0) isValid = false;
    if (isValid && payRecap.gc + payRecap.ss + payRecap.bp === 0) isValid = false;
    return isValid ? payRecap : false;
  }

  static generatePayCard(payRequest, player) {
    let parsedPayRequest = this.parseMoneyTransactionString(payRequest);

    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.PayRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } else {
      let cardData = {
        payRequest: payRequest,
        QtGC: parsedPayRequest.gc,
        QtSS: parsedPayRequest.ss,
        QtBP: parsedPayRequest.bp
      };
      renderTemplate("systems/wfrp4e/templates/chat/market/market-pay.hbs", cardData).then((html) => {
        let chatData = WFRP_Utility.chatDataSetup(html, "roll", false, {forceWhisper: player});
        ChatMessage.create(chatData);
      });
    }
  }

  static makeSomeChange(amount, bpRemainder) {
    let gc = 0,
      ss = 0,
      bp = 0;
    if (amount >= 0) {
      gc = Math.floor(amount / 240);
      amount = amount % 240;
      ss = Math.floor(amount / 12);
      bp = amount % 12;
      bp = bp + (bpRemainder > 0 ? 1 : 0);
    }
    return {gc: gc, ss: ss, bp: bp};
  }

  static amountToString(amount) {
    let gc = game.i18n.localize("MARKET.Abbrev.GC");
    let ss = game.i18n.localize("MARKET.Abbrev.SS");
    let bp = game.i18n.localize("MARKET.Abbrev.BP");
    return `${amount.gc || amount.g || 0}${gc} ${amount.ss || amount.s || 0}${ss} ${amount.bp || amount.b || 0}${bp}`;
  }

  static splitAmountBetweenAllPlayers(initialAmount, nbOfPlayers) {
    let bpAmount = initialAmount.gc * 240 + initialAmount.ss * 12 + initialAmount.bp;

    let bpRemainder = bpAmount % nbOfPlayers;
    bpAmount = Math.floor(bpAmount / nbOfPlayers);

    let amount = this.makeSomeChange(bpAmount, bpRemainder);
    return amount;
  }

  static processCredit(creditRequest, optionOrName) {
    let parsedPayRequest = this.parseMoneyTransactionString(creditRequest);
    if (!parsedPayRequest) {
      let msg = `<h3><b>${game.i18n.localize("MARKET.CreditRequest")}</b></h3>`;
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.CreditCommandExample")}</i></p>`;
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "gmroll"));
    } else {
      let amount, message, forceWhisper;
      optionOrName = optionOrName || "split";

      let nbActivePlayers = Array.from(game.users).filter((u) => u.role != 4 && u.active).length;
      if (optionOrName.toLowerCase() == "each" || optionOrName.toLowerCase() == "split") {
        if (nbActivePlayers == 0) {
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
        let player = game.users.players.filter((p) => p.name.toLowerCase() == paName);
        if (player[0]) {
          forceWhisper = player[0].name;
          message = game.i18n.format("MARKET.CreditToUser", {
            userName: player[0].name,
            initialAmount: this.amountToString(parsedPayRequest)
          });
        } else {
          let actor = game.actors.find((a) => a.name.toLowerCase().includes(paName.toLowerCase()));
          if (actor) {
            let money = this.creditCommand(this.amountToString(amount), actor);
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
      renderTemplate("systems/wfrp4e/templates/chat/market/market-credit.hbs", cardData).then((html) => {
        let chatData = WFRP_Utility.chatDataSetup(html, "roll", false, {forceWhisper});
        foundry.utils.setProperty(chatData, "flags.wfrp4e.instances", nbActivePlayers);
        ChatMessage.create(chatData);
      });
    }
  }
}
