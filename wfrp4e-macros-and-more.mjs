// noinspection JSUnresolvedReference

import {ItemTransfer} from './scripts/item-transfer.mjs';
import {handleLosingGroupAdvantage} from './scripts/group-advantage-losing.js';
import {Utility} from './scripts/utility.mjs';
import MaintenanceWrapper from './scripts/maintenance.js';

Hooks.once("init", function () {
  game.robakMacros = {
    transferItem: ItemTransfer,
    maintenance: MaintenanceWrapper,
    utils: Utility
  }

  game.settings.register('wfrp4e-macros-and-more', 'transfer-item-gui', {
    name: 'Enable Transfer Item',
    hint: 'Enables Transfer Item button in character sheets.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });
  game.settings.register('wfrp4e-macros-and-more', 'losing-advantage', {
    name: 'Enable "Losing Advantage" rule',
    hint: 'Prints reminder of "Losing Advantage" rule every combat round if using Group Advantage.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });
  game.settings.registerMenu('wfrp4e-macros-and-more', "menuMaintenance", {
    name: "MACROS-AND-MORE.Settings.Maintenance.menu.name",
    label: "MACROS-AND-MORE.Settings.Maintenance.menu.label",
    hint: "MACROS-AND-MORE.Settings.Maintenance.menu.hint",
    icon: "fas fa-cog",
    type: MaintenanceWrapper,
    restricted: true
  })
});

Hooks.once('ready', function() {
  game.socket.on('module.wfrp4e-macros-and-more', async (transferObject) => {
    if (!game.user.isUniqueGM) return;
    await ItemTransfer.handleTransfer(transferObject)
  })
});

Hooks.on("updateCombat", (combat, updates, _, __) => {
  if (game.settings.get('wfrp4e-macros-and-more', 'losing-advantage') && game.user.isUniqueGM && foundry.utils.hasProperty(updates, 'round')) {
    handleLosingGroupAdvantage(combat.combatants);
  }
});