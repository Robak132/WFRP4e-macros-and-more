import MarketWfrp4e from "./market.js";

function getMethodsRecursive(x) {
  return (
    x &&
    x !== Object.prototype &&
    Object.getOwnPropertyNames(x)
      .filter((name) => (Object.getOwnPropertyDescriptor(x, name) || {}).get || typeof x[name] === "function")
      .concat(getMethodsRecursive(Object.getPrototypeOf(x)) || [])
  );
}

function getMethods(obj) {
  return Array.from(new Set(getMethodsRecursive(obj))).filter((name) => name !== "constructor" && !~name.indexOf("__"));
}

export class RobakMarketWfrp4e extends MarketWfrp4e {
  static getRegions() {
    return {
      empire: {
        key: "empire",
        name: "Empire",
        gc: game.i18n.localize("NAME.GC"),
        ss: game.i18n.localize("NAME.SS"),
        bp: game.i18n.localize("NAME.BP")
      },
      bretonia: {
        key: "bretonia",
        name: "Bretonnia",
        gc: "Złote ecu",
        ss: "Srebrny denar",
        bp: "Bretoński brązowy pens"
      },
      estalia: {
        key: "estalia",
        name: "Estalia",
        gc: "Złote excelente",
        ss: "Srebrny real",
        bp: "Brązowe duro"
      },
      kislev: {
        key: "kislev",
        name: "Kislev",
        gc: "Złoty dukat",
        ss: "Srebrna denga",
        bp: "Brązowe pulo"
      },
      norsca: {
        // In Norsca there are no gc coins, only ss and bp.
        key: "norsca",
        name: "Norsca",
        ss: "Srebrna sceatta",
        bp: "Brązowy fennig"
      },
      tilea: {
        key: "tilea",
        name: "Tilea",
        gc: "Tileańska złota korona",
        ss: "Tileański srebrny szyling",
        bp: "Tileański brązowy pens"
      },
      dwarf: {
        key: "dwarf",
        name: "Dwarf Keeps",
        gc: "Złocisz",
        ss: "Srebrniak",
        bp: "Miedziak"
      },
      elf: {
        // Elven kingdoms don't use ss coins in trade with humans.
        key: "elf",
        name: "Elf Kingdoms",
        gc: "Złoty suweren"
      },
      araby: {
        // Names are self-made as there are no official names for Arabyan coins except for rials.
        key: "araby",
        name: "Araby",
        gc: "Złoty rial",
        ss: "Srebrny dirham",
        bp: "Brązowy fals"
      }
    };
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

  static payCommand(command, actor, options = {}) {
    let regionKey = command.split("@")[1] ?? game.settings.get("wfrp4e-macros-and-more", "currentRegion");
    let region = this.getRegions()[regionKey];
    command = command.split("@")[0];

    // First we parse the command
    let moneyItemInventory = actor.getItemTypes("money").map((i) => i.toObject());
    let moneyToPay = this.parseMoneyTransactionString(command);
    let msg = `<h3><b>${game.i18n.localize("MARKET.PayCommand")}</b></h3>`;
    let errorOccured = false;

    // Wrong command
    if (!moneyToPay) {
      msg += `<p>${game.i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${game.i18n.localize("MARKET.PayCommandExample")}</i></p>`;
      errorOccured = true;
    } else {
      // We need to get the character money items for gc, ss and bp.
      // This is a "best effort" lookup method. If it fails, we stop the command to prevent any data loss.
      let characterMoney = this.getCharacterMoney(moneyItemInventory);
      this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

      console.log(moneyItemInventory);
      console.log(characterMoney);

      // If one money is missing, we stop here before doing anything bad
      if (Object.values(characterMoney).includes(false)) {
        msg += `<p>${game.i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
        errorOccured = true;
      } else {
        // Now its time to check if the actor has enough money to pay
        // We'll start by trying to pay without consolidating the money
        if (
          moneyToPay.gc <= moneyItemInventory[characterMoney.gc].system.quantity.value &&
          moneyToPay.ss <= moneyItemInventory[characterMoney.ss].system.quantity.value &&
          moneyToPay.bp <= moneyItemInventory[characterMoney.bp].system.quantity.value
        ) {
          // Great, we can just deduce the quantity for each money
          moneyItemInventory[characterMoney.gc].system.quantity.value -= moneyToPay.gc;
          moneyItemInventory[characterMoney.ss].system.quantity.value -= moneyToPay.ss;
          moneyItemInventory[characterMoney.bp].system.quantity.value -= moneyToPay.bp;
        } else {
          // We'll need to calculate the brass value on both the pay command and the actor inventory, and then consolidate
          let totalBPAvailable = 0;
          for (let m of moneyItemInventory) totalBPAvailable += m.system.quantity.value * m.system.coinValue.value;

          let totalBPPay = moneyToPay.gc * 240 + moneyToPay.ss * 12 + moneyToPay.bp;

          // Does we have enough money in the end?
          if (totalBPAvailable < totalBPPay) {
            // No
            msg += `${game.i18n.localize("MARKET.NotEnoughMoney")}<br>
              <b>${game.i18n.localize("MARKET.MoneyNeeded")}</b> ${totalBPPay} ${game.i18n.localize("NAME.BP")}<br>
              <b>${game.i18n.localize("MARKET.MoneyAvailable")}</b> ${totalBPAvailable} ${game.i18n.localize("NAME.BP")}`;
            errorOccured = true;
          } else {
            // Yes!
            totalBPAvailable -= totalBPPay;
            moneyItemInventory[characterMoney.gc].system.quantity.value = 0;
            moneyItemInventory[characterMoney.ss].system.quantity.value = 0;
            moneyItemInventory[characterMoney.bp].system.quantity.value = totalBPAvailable;

            // Then we consolidate
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
    if (options.suppressMessage) {
      ui.notifications.notify(msg);
    } else {
      ChatMessage.create(WFRP_Utility.chatDataSetup(msg, "roll"));
    }
    return moneyItemInventory;
  }

  static checkCharacterMoneyValidity(moneyItemInventory, characterMoney) {
    for (let m = 0; m < moneyItemInventory.length; m++) {
      switch (moneyItemInventory[m].system.coinValue.value) {
        case 240: //gc
          if (characterMoney.gc === false) characterMoney.gc = m;
          break;
        case 12: //ss
          if (characterMoney.ss === false) characterMoney.ss = m;
          break;
        case 1: //bp
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
    // First we'll try to look at the localized name
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
    //Regular expression to match any number followed by any abbreviation. Ignore whitespaces
    const expression = /((\d+)\s?(\p{L}+))/gu;
    let matches = [...string.matchAll(expression)];

    let payRecap = {
      gc: 0,
      ss: 0,
      bp: 0
    };
    let isValid = matches.length;
    for (let match of matches) {
      //Check if we have a valid command. We should have 4 groups per match
      if (match.length !== 4) {
        isValid = false;
        break;
      }
      //Should contains the abbreviated money (like "gc")
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
    let regionKey = payRequest.split("@")[1] ?? game.settings.get("wfrp4e-macros-and-more", "currentRegion");
    let region = this.getRegions()[regionKey];
    payRequest = payRequest.split("@")[0];

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
        labelGold: region.gc,
        quantitySilver: parsedPayRequest.ss,
        labelSilver: region.ss,
        quantityBronze: parsedPayRequest.bp,
        labelBronze: region.bp
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

Hooks.once("ready", function () {
  let market = game.wfrp4e.market;

  for (let method of getMethods(RobakMarketWfrp4e)) {
    try {
      market[method] = RobakMarketWfrp4e[method] ?? market[method];
    } catch (e) {
      console.log(`Setting ${method} failed`);
    }
  }
});
