import ItemTransfer from "./modules/item-transfer.mjs";
import {handleLosingGroupAdvantage} from "./modules/group-advantage-losing.mjs";
import Utility from "./modules/utility.mjs";
import MaintenanceWrapper from "./modules/maintenance.mjs";
import {CHANGE_ACTOR_TYPE_CONTEXT, CHANGE_ITEM_TYPE_CONTEXT} from "./modules/convert.mjs";
import {getUpgradeItemContext} from "./modules/upgrade-item.mjs";
import RobakMarketWfrp4e, {overrideMarket} from "./modules/market.mjs";
import ExperienceVerificator from "./modules/experience-verificator.mjs";
import ConfigurableDialog from "./modules/configurable-dialog.mjs";
import {setupAutoEngaged} from "./modules/auto-engage.mjs";

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
  game.settings.register("wfrp4e-macros-and-more", "currency-market", {
    name: "[Experimental] Currencies in Pay/Credit commands",
    hint: "Enables advanced currency handling in Pay/Credit commands.",
    scope: "world",
    config: true,
    onChange: foundry.utils.debouncedReload,
    default: false,
    restricted: true,
    type: Boolean
  });
  game.settings.register("wfrp4e-macros-and-more", "current-region", {
    name: "Current region",
    hint: "Current region for currency conversion.",
    scope: "world",
    config: true,
    default: "empire",
    onChange: foundry.utils.debouncedReload,
    restricted: true,
    choices: RobakMarketWfrp4e.getKeyValueRegions(),
    type: String
  });
  game.settings.register("wfrp4e-macros-and-more", "auto-engaged", {
    name: "Enable Auto-Engaging",
    hint: "Automatically set 'Engaged' condition when rolling attacks.",
    scope: "world",
    config: true,
    onChange: foundry.utils.debouncedReload,
    default: false,
    restricted: true,
    type: Boolean
  });
  game.settings.registerMenu("wfrp4e-macros-and-more", "menu-maintenance", {
    name: "MACROS-AND-MORE.SettingsMaintenanceMenuName",
    label: "MACROS-AND-MORE.SettingsMaintenanceMenuLabel",
    hint: "MACROS-AND-MORE.SettingsMaintenanceMenuHint",
    icon: "fas fa-cog",
    type: MaintenanceWrapper,
    onChange: foundry.utils.debouncedReload,
    restricted: true
  });
}

function registerHandlebars() {
  Handlebars.registerHelper("isOne", (value) => value === 1);
  Handlebars.registerHelper("isTwo", (value) => value === 2);
  Handlebars.registerHelper("isThreePlus", (value) => value > 2);
  Handlebars.registerHelper("isTie", (value) => value.length > 1);
  Handlebars.registerHelper("isLast", (index, length) => {
    if (length - index === 1) {
      return true;
    }
  });
  Handlebars.registerHelper("isSecondLast", (index, length) => {
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

  // Load regions
  await RobakMarketWfrp4e.loadRegions();

  // Register settings
  registerSettings();

  // Register handlebars
  registerHandlebars();

  // Register
  if (game.settings.get("wfrp4e-macros-and-more", "auto-engaged")) {
    setupAutoEngaged();
  }

  // Register market
  if (game.settings.get("wfrp4e-macros-and-more", "currency-market")) {
    await overrideMarket();
  }

  // Load scripts
  await fetch("modules/wfrp4e-macros-and-more/packs/effects.json")
    .then((r) => r.json())
    .then(async (effects) => {
      foundry.utils.mergeObject(game.wfrp4e.config.effectScripts, effects);
    });

  SocketHandlers.sendRollToUserAndWait = async function (userId, actorId, skill, options) {
    return SocketHandlers.executeOnUserAndWait(userId, "rollSkill", {actorId, skill, options});
  };

  SocketHandlers.rollSkill = async function ({actorId, skill, options}) {
    let actor = game.actors.get(actorId);
    let test = await actor.setupSkill(skill, options);
    await test.roll();
    return test;
  };

  game.socket.on(`module.wfrp4e-macros-and-more`, (data) => {
    if (!game.user.isUniqueGM) return;
    switch (data.type) {
      case "transferItem":
        Utility.log("Received transfer object", data);
        return ItemTransfer.handleTransfer(data.payload);
      case "darkWhispers":
        Utility.log("Received dark whispers", data);
        return Utility.darkWhispersDialog(data.payload);
    }
  });
});

Hooks.on("updateCombat", async (combat, updates, _, __) => {
  let setting = game.settings.get("wfrp4e-macros-and-more", "losing-advantage");
  if (setting && game.user.isUniqueGM && foundry.utils.hasProperty(updates, "round")) {
    await handleLosingGroupAdvantage(combat.combatants);
  }
});

Hooks.on("getActorContextOptions", (_, options) => {
  options.push(CHANGE_ACTOR_TYPE_CONTEXT());
});

Hooks.on("getItemContextOptions", (_, options) => {
  options.push(CHANGE_ITEM_TYPE_CONTEXT(), getUpgradeItemContext());
});

Hooks.on("renderActorSheetWFRP4eCharacter", (sheet, html, _) => {
  console.log(sheet);
  ItemTransfer.setupItemHandler(sheet, html);
});

Hooks.on("renderActorSheetWFRP4eCreature", (sheet, html, _) => ItemTransfer.setupItemHandler(sheet, html));

Hooks.on("renderActorSheetWFRP4eNPC", (sheet, html, _) => ItemTransfer.setupItemHandler(sheet, html));

Hooks.on("renderActorSheetWFRP4eVehicle", (sheet, html, _) => ItemTransfer.setupItemHandler(sheet, html));

Hooks.on("renderChatMessageHTML", async (app, html) => {
  let unstableActor = html.querySelector(".unstable-actor");
  if (unstableActor) {
    unstableActor.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        if (!game.user.isGM) return;

        const $target = $(event.currentTarget);
        const dmgRaw = $target.data("damage") ?? $target.attr("data-damage");
        const dmg = Number(dmgRaw) || 0;
        const tokenId = $target.data("token") ?? $target.attr("data-token");

        const token = canvas.tokens.get(tokenId);
        const actor = token.actor;
        await actor.applyBasicDamage(dmg, {damageType: game.wfrp4e?.config?.DAMAGE_TYPE?.IGNORE_ALL});
      } catch (err) {
        console.error("Error handling unstable-actor click", err);
        ui.notifications.error("Error applying damage");
      }
    });
  }
});
