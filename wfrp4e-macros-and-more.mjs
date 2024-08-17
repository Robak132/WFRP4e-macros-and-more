import ItemTransfer from "./modules/item-transfer.mjs";
import {handleLosingGroupAdvantage} from "./modules/group-advantage-losing.mjs";
import Utility from "./modules/utility.mjs";
import MaintenanceWrapper from "./modules/maintenance.mjs";
import {addActorContextOptions, addItemContextOptions} from "./modules/convert.mjs";
import ExperienceVerificator from "./modules/experience-verificator.mjs";
import ConfigurableDialog from "./modules/configurable-dialog.mjs";

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
  await game.settings.registerMenu("wfrp4e-macros-and-more", "menu-maintenance", {
    name: "MACROS-AND-MORE.SettingsMaintenanceMenuName",
    label: "MACROS-AND-MORE.SettingsMaintenanceMenuLabel",
    hint: "MACROS-AND-MORE.SettingsMaintenanceMenuHint",
    icon: "fas fa-cog",
    type: MaintenanceWrapper,
    onChange: debouncedReload,
    restricted: true
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
    transferItem: ItemTransfer,
    maintenance: MaintenanceWrapper,
    experienceVerificator: ExperienceVerificator,
    utils: Utility,
    configurableDialog: ConfigurableDialog
  };

  // Register settings
  await registerSettings();

  // Register handlebars
  await registerHandlebars();

  // Load scripts
  fetch("modules/wfrp4e-macros-and-more/packs/effects.json")
    .then((r) => r.json())
    .then(async (effects) => {
      mergeObject(game.wfrp4e.config.effectScripts, effects);
    });
});

Hooks.once("ready", async () => {
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
