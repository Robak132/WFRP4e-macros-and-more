import ItemTransfer from "./modules/item-transfer.mjs";
import {handleLosingGroupAdvantage} from "./modules/group-advantage-losing.mjs";
import Utility from "./modules/utility.mjs";
import MaintenanceWrapper from "./modules/maintenance.mjs";
import {addActorContextOptions, addItemContextOptions} from "./modules/convert.mjs";
import RobakMarketWfrp4e from "./modules/robak-market.js";
import {FinanceCalculator} from "./modules/finance-calculator.mjs";

async function registerSettings() {
  await game.settings.register("wfrp4e-macros-and-more", "transfer-item-gui", {
    name: "Enable Transfer Item",
    hint: "Enables Transfer Item button in character sheets.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  await game.settings.register("wfrp4e-macros-and-more", "losing-advantage", {
    name: 'Enable "Losing Advantage" rule',
    hint: 'Prints reminder of "Losing Advantage" rule every combat round if using Group Advantage.',
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  await game.settings.register("wfrp4e-macros-and-more", "currency-market", {
    name: "Currencies in Pay/Credit commands",
    hint: 'Control currency usage in Pay/Credit commands.\n"Disabled" will disable other currencies.\n"Compatibility Mode" will use default WFRP4e system.\n"Override Mode" will use custom currency system',
    scope: "world",
    config: true,
    default: "override",
    type: String,
    choices: {
      disable: "Disabled",
      compatibility: "Compatibility Mode",
      override: "Override Mode"
    }
  });
  await game.settings.registerMenu("wfrp4e-macros-and-more", "menu-maintenance", {
    name: "MACROS-AND-MORE.SettingsMaintenanceMenuName",
    label: "MACROS-AND-MORE.SettingsMaintenanceMenuLabel",
    hint: "MACROS-AND-MORE.SettingsMaintenanceMenuHint",
    icon: "fas fa-cog",
    type: MaintenanceWrapper,
    onChange: debouncedReload,
    restricted: true
  });
  await game.settings.register("wfrp4e-macros-and-more", "current-region", {
    scope: "world",
    config: false,
    default: "empire"
  });
}

// Hooks
Hooks.once("init", async function () {
  Utility.log("Initializing");
  game.robakMacros = {
    financeCalculator: FinanceCalculator,
    transferItem: ItemTransfer,
    maintenance: MaintenanceWrapper,
    utils: Utility
  };

  // Register settings
  await registerSettings();

  // Load scripts
  fetch("modules/wfrp4e-macros-and-more/data/effects.json")
    .then((r) => r.json())
    .then(async (effects) => {
      mergeObject(game.wfrp4e.config.effectScripts, effects);
    });
});

Hooks.once("ready", async function () {
  game.socket.on("module.wfrp4e-macros-and-more", async ({type, data}) => {
    Utility.log("Received transfer object", data);
    if (!game.user.isUniqueGM) {
      return;
    }
    switch (type) {
      case "transferItem":
        return ItemTransfer.handleTransfer(data);
      case "darkWhispers":
        await Utility.darkWhispersDialog(data);
    }
  });

  if (game.settings.get("wfrp4e-macros-and-more", "currency-market") === "override") {
    let market = game.wfrp4e.market;
    for (let method of Utility.getMethods(RobakMarketWfrp4e)) {
      try {
        Utility.log(`Setting ${method} succeeded`);
        market[method] = RobakMarketWfrp4e[method] ?? market[method];
      } catch (e) {
        Utility.warn(`Setting ${method} failed`);
      }
    }
    Utility.log("Market override succeeded");
    await RobakMarketWfrp4e.loadRegions();
    Utility.log("Regions loaded");
  }
});

Hooks.on("updateCombat", (combat, updates, _, __) => {
  if (
    game.settings.get("wfrp4e-macros-and-more", "losing-advantage") &&
    game.user.isUniqueGM &&
    foundry.utils.hasProperty(updates, "round")
  ) {
    handleLosingGroupAdvantage(combat.combatants);
  }
});

Hooks.on("getItemDirectoryEntryContext", addItemContextOptions);

Hooks.on("getActorDirectoryEntryContext", addActorContextOptions);

Hooks.on("renderActorSheetWfrp4e", (sheet, html, _) => ItemTransfer.setupItemHandler(sheet, html));

Hooks.on("renderChatLog", (log, html, _) => {
  html.on("click", ".robak-darkwhisper-button", async (event) => {
    event.preventDefault();
    if (!game.user.isGM) {
      let actor = game.user.character;
      let characters = JSON.parse($(event.currentTarget).attr("data-characters"));
      let authorId = $(event.currentTarget).attr("data-author");
      if (actor && characters.includes(actor._id)) {
        let response = "";
        switch ($(event.currentTarget).attr("data-button")) {
          case "actOnWhisper":
            response = `${game.i18n.format("GMTOOLKIT.Message.DarkWhispers.Accepted", {currentUser: actor.name})}`;
            break;
          case "denyDarkGods":
            response = `${game.i18n.format("GMTOOLKIT.Message.DarkWhispers.Rejected", {currentUser: actor.name})}`;
            break;
        }
        response += `<blockquote>${$(event.currentTarget).attr("data-ask")}</blockquote>`;

        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({actor: game.user.character}),
          content: response,
          whisper: [authorId, ...ChatMessage.getWhisperRecipients("GM")]
        });
      } else {
        ui.notifications.notify(game.i18n.format("GMTOOLKIT.Notification.NoActor", {currentUser: game.user.name}));
      }
    } else {
      ui.notifications.notify(
        game.i18n.format("GMTOOLKIT.Notification.UserMustBePlayer", {action: event.currentTarget.text})
      );
    }
  });
});
