/* ==========
* MACRO: Show Weapons
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Shows actor's equipped weapons in form of status effects.
========== */

showWeapons();

function showWeapons() {
  const macro_effect = `
  effectsToCreate = [];
  effectsToDelete = [];
  for (let weapon of this.actor.itemCategories.weapon) {
    let weapon_effect = this.actor.effects.find((value) => value.name === weapon.name);
    if (weapon.equipped && weapon_effect === undefined) {
      effectsToCreate.push({
          name: weapon.name,
          icon: weapon.img,
          statuses: ['show-item'],
          transfer: true,
          flags: {
            wfrp4e: {
              preventDuplicateEffects: true,
            },
          },
        });
    } else if (!weapon.equipped && weapon_effect !== undefined) {
      effectsToDelete.push(weapon_effect._id);
    }
  }
  this.actor.createEmbeddedDocuments('ActiveEffect', effectsToCreate);
  if (effectsToDelete.length) {
    character.actor.deleteEmbeddedDocuments('ActiveEffect', effectsToDelete);
  }`

  if (canvas.tokens.controlled.length) {
    for (let character of canvas.tokens.controlled) {
      if (!character.actor.effects.find((e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons')))) {
        character.actor.createEmbeddedDocuments('ActiveEffect', [
          {
            name: game.i18n.localize('MACROS-AND-MORE.ShowWeapons'),
            flags: {
              wfrp4e: {
                'effectTrigger': 'prePrepareItems',
                'effectApplication': 'actor',
                'script': macro_effect,
              },
            },
          }]);
      }
    }
  } else {
    return ui.notifications.error('Select one or more characters on which you want to run this macro');
  }
}

