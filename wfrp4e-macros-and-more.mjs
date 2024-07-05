import effects from "./effects.json" assert {type: "json"};
import {ItemTransfer} from "./scripts/item-transfer.mjs";
import {handleLosingGroupAdvantage} from "./scripts/group-advantage-losing.mjs";
import Utility from "./scripts/utility.mjs";
import MaintenanceWrapper from "./scripts/maintenance.mjs";
import {addActorContextOptions, addItemContextOptions} from "./scripts/convert.mjs";
import {RobakMarketWfrp4e} from "./scripts/robak-market.js";
import {FinanceCalculator} from "./scripts/finance-calculator.mjs";

function registerSettings() {
  game.settings.register("wfrp4e-macros-and-more", "transfer-item-gui", {
    name: "Enable Transfer Item",
    hint: "Enables Transfer Item button in character sheets.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("wfrp4e-macros-and-more", "losing-advantage", {
    name: 'Enable "Losing Advantage" rule',
    hint: 'Prints reminder of "Losing Advantage" rule every combat round if using Group Advantage.',
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.registerMenu("wfrp4e-macros-and-more", "menuMaintenance", {
    name: "MACROS-AND-MORE.SettingsMaintenanceMenuName",
    label: "MACROS-AND-MORE.SettingsMaintenanceMenuLabel",
    hint: "MACROS-AND-MORE.SettingsMaintenanceMenuHint",
    icon: "fas fa-cog",
    type: MaintenanceWrapper,
    restricted: true
  });
  game.settings.register("wfrp4e-macros-and-more", "passiveTests", {
    scope: "world",
    config: false,
    default: []
  });
  game.settings.register("wfrp4e-macros-and-more", "currentRegion", {
    scope: "world",
    config: false,
    default: "empire"
  });
}

Hooks.once("init", function () {
  game.robakMacros = {
    financeCalculator: FinanceCalculator,
    transferItem: ItemTransfer,
    maintenance: MaintenanceWrapper,
    utils: Utility
  };

  // Register settings
  registerSettings();

  // Load scripts
  mergeObject(game.wfrp4e.config.effectScripts, effects);

  // Overwrite system market
  game.wfrp4e.market = RobakMarketWfrp4e;
});

Hooks.once("ready", function () {
  game.socket.on("module.wfrp4e-macros-and-more", async (transferObject) => {
    if (!game.user.isUniqueGM) {
      return;
    }
    await ItemTransfer.handleTransfer(transferObject);
  });
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

Hooks.on("wfrp4e:rollTest", async function (testData, _) {
  if (testData.options.passiveTest) {
    return await game.settings.set("wfrp4e-macros-and-more", "passiveTests", [
      ...game.settings.get("wfrp4e-macros-and-more", "passiveTests"),
      {
        actor: testData.token || testData.actor,
        skill: testData?.skill,
        characteristic: testData?.characteristic,
        outcome: testData.outcome,
        sl: testData.result.SL,
        description: testData.result.description,
        roll: testData.result.roll,
        target: testData.target
      }
    ]);
  }
});

Hooks.on("getItemDirectoryEntryContext", addItemContextOptions);

Hooks.on("getActorDirectoryEntryContext", addActorContextOptions);
