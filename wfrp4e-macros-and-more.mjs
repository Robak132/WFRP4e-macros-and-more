import ItemTransfer from "./modules/item-transfer.mjs";
import {handleLosingGroupAdvantage} from "./modules/group-advantage-losing.mjs";
import Utility from "./modules/utility.mjs";
import {RollTracker, RollTrackerDialog} from "./modules/roll-tracker.mjs";
import MaintenanceWrapper from "./modules/maintenance.mjs";
import {addActorContextOptions, addItemContextOptions} from "./modules/convert.mjs";
import RobakMarketWfrp4e, {overrideMarket} from "./modules/market.mjs";
import FinanceCalculator from "./modules/finance-calculator.mjs";
import ExperienceVerificator from "./modules/experience-verificator.mjs";
import ConfigurableDialog from "./modules/configurable-dialog.mjs";
import {setupAutoEngaged} from "./modules/auto-engaged.mjs";

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
    name: "[Experimental] Currencies in Pay/Credit commands",
    hint: "Enables advanced currency handling in Pay/Credit commands.",
    scope: "world",
    config: true,
    onChange: debouncedReload,
    default: false,
    restricted: true,
    type: Boolean
  });
  await game.settings.register("wfrp4e-macros-and-more", "current-region", {
    name: "Current region",
    hint: "Current region for currency conversion.",
    scope: "world",
    config: true,
    default: "empire",
    onChange: debouncedReload,
    restricted: true,
    choices: RobakMarketWfrp4e.getKeyValueRegions(),
    type: String
  });
  await game.settings.register("wfrp4e-macros-and-more", "auto-engaged", {
    name: "Enable Auto-Engaging",
    hint: "Automatically set 'Engaged' condition when rolling attacks.",
    scope: "world",
    config: true,
    onChange: debouncedReload,
    default: false,
    restricted: true,
    type: Boolean
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
  await game.settings.register("wfrp4e-macros-and-more", "gm_see_players", {
    name: `MACROS-AND-MORE.settings.gm_see_players.Name`,
    default: true,
    type: Boolean,
    scope: "world",
    config: true,
    hint: `MACROS-AND-MORE.settings.gm_see_players.Hint`,
    onChange: () => ui.players.render()
  });
}

async function registerHandlebars() {
  await Handlebars.registerHelper("isOne", (value) => value === 1);
  await Handlebars.registerHelper("isTwo", (value) => value === 2);
  await Handlebars.registerHelper("isThreePlus", (value) => value > 2);
  await Handlebars.registerHelper("isTie", (value) => value.length > 1);
  await Handlebars.registerHelper("isLast", (index, length) => {
    if (length - index === 1) {
      return true;
    }
  });
  await Handlebars.registerHelper("isSecondLast", (index, length) => {
    if (length - index === 2) {
      return true;
    }
  });
}

// Hooks
Hooks.once("init", async function () {
  Utility.log("Initializing");
  game.robakMacros = {
    financeCalculator: FinanceCalculator,
    transferItem: ItemTransfer,
    maintenance: MaintenanceWrapper,
    experienceVerificator: ExperienceVerificator,
    utils: Utility,
    configurableDialog: ConfigurableDialog,
    rollTracker: new RollTracker()
  };

  // Load regions
  await RobakMarketWfrp4e.loadRegions();

  // Register settings
  await registerSettings();

  // Register handlebars
  await registerHandlebars();

  // Register
  if (game.settings.get("wfrp4e-macros-and-more", "auto-engaged")) {
    setupAutoEngaged();
  }

  // Register market
  if (game.settings.get("wfrp4e-macros-and-more", "currency-market")) {
    await overrideMarket();
  }

  // Load scripts
  fetch("modules/wfrp4e-macros-and-more/packs/effects.json")
    .then((r) => r.json())
    .then(async (effects) => {
      mergeObject(game.wfrp4e.config.effectScripts, effects);
    });
});

Hooks.once("babele.ready", async () => {
  game.socket.on("module.wfrp4e-macros-and-more", async ({type, data}) => {
    Utility.log("Received transfer object", data);
    if (!game.user.isUniqueGM) {
      return;
    }
    switch (type) {
      case "transferItems":
        return ItemTransfer.handleTransfer(data);
      case "darkWhispers":
        await Utility.darkWhispersDialog(data);
    }
  });
});

Hooks.once("devModeReady", ({registerPackageDebugFlag}) => {
  registerPackageDebugFlag("wfrp4e-macros-and-more");
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

Hooks.on("updateChatMessage", async (chatMessage) => {
  const isBlind = chatMessage.blind;
  if (!chatMessage.flags.testData) return;
  if (
    !isBlind ||
    (isBlind && game.settings.get("wfrp4e-macros-and-more", "count_hidden")) ||
    (isBlind && chatMessage.user.isGM)
  ) {
    await game.robakMacros.rollTracker.saveTrackedRoll(chatMessage.user.id, chatMessage);
  }
});

Hooks.on("createChatMessage", async (chatMessage) => {
  const isBlind = chatMessage.blind;
  if (
    !isBlind ||
    (isBlind && game.settings.get("wfrp4e-macros-and-more", "count_hidden")) ||
    (isBlind && chatMessage.user.isGM)
  ) {
    if (chatMessage.isRoll && chatMessage.rolls[0]?.dice[0]?.faces === 100) {
      await game.robakMacros.rollTracker.saveSimpleRoll(chatMessage.user.id, chatMessage);
    } else {
      await game.robakMacros.rollTracker.saveReRoll(chatMessage.user.id, chatMessage);
    }
  }
});

Hooks.on("renderPlayerList", (playerList, html) => {
  if (game.user.isGM) {
    if (game.settings.get("wfrp4e-macros-and-more", "gm_see_players")) {
      // This adds our icon to ALL players on the player list, if the setting is toggled
      const tooltip = game.i18n.localize("MACROS-AND-MORE.button-title");
      // create the button where we want it to be
      for (let user of game.users) {
        const buttonPlacement = html.find(`[data-user-id="${user.id}"]`);
        buttonPlacement.append(
          `<button type="button" title='${tooltip}' class="roll-tracker-item-button flex0" id="${user.id}"><i class="fas fa-dice-d20"></i></button>`
        );
        html.on("click", `#${user.id}`, () => {
          new RollTrackerDialog(user.id).render(true);
        });
      }
    } else {
      // Put the roll tracker icon only beside the GM's name
      const loggedInUser = html.find(`[data-user-id="${game.userId}"]`);
      const tooltip = game.i18n.localize("MACROS-AND-MORE.button-title");
      loggedInUser.append(
        `<button type="button" title='${tooltip}' class="roll-tracker-item-button flex0" id="${game.userId}"><i class="fas fa-dice-d20"></i></button>`
      );
      html.on("click", `#${game.userId}`, () => {
        new RollTrackerDialog(game.userId).render(true);
      });
    }
  } else if (game.settings.get("wfrp4e-macros-and-more", "players_see_players")) {
    // find the element which has our logged in user's id
    const loggedInUser = html.find(`[data-user-id="${game.userId}"]`);
    const tooltip = game.i18n.localize("MACROS-AND-MORE.button-title");
    loggedInUser.append(
      `<button type="button" title='${tooltip}' class="roll-tracker-item-button flex0" id="${game.userId}"><i class="fas fa-dice-d20"></i></button>`
    );
    html.on("click", `#${game.userId}`, () => {
      new RollTrackerDialog(game.userId).render(true);
    });
  }
});
