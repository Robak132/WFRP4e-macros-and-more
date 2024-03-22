/* ==========
* MACRO: Show Weapons (Remove)
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Shows actor's equipped weapons in form of status effects.
========== */

showWeapons();

function showWeapons() {
  if (canvas.tokens.controlled.length) {
    for (let character of canvas.tokens.controlled) {
      let effects = []
      effects = effects.concat(
          character.actor.effects.filter((e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons'))).map(e => e._id))
      effects = effects.concat(character.actor.effects.filter((e => e.statuses.has('show-item'))).map(e => e._id))
      if (effects.length) {
        character.actor.deleteEmbeddedDocuments('ActiveEffect', effects);
      }
    }
  } else {
    return ui.notifications.error('Select one or more characters on which you want to run this macro');
  }
}

