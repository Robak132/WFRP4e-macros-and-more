/* ==========
* MACRO: Show Weapons
* AUTHOR: Robak132
* DESCRIPTION: Shows actor's equipped weapons in form of status effects.
========== */
const SHOW_WEAPONS_EFFECT = {
  "flags.wfrp4e.scriptData": [
    {
      label: game.i18n.localize("MACROS-AND-MORE.ShowWeapons"),
      trigger: "prePrepareItems",
      script: "[Script.1jX37MkxtB6uzViV]"
    }
  ],
  name: game.i18n.localize("MACROS-AND-MORE.ShowWeapons"),
  icon: "modules/wfrp4e-macros-and-more/assets/icons/show-weapons-show.svg"
};

showWeapons();

function showWeapons() {
  if (canvas.tokens.controlled.length) {
    for (let character of canvas.tokens.controlled) {
      if (!character.actor.effects.find((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeapons"))) {
        character.actor.createEmbeddedDocuments("ActiveEffect", [SHOW_WEAPONS_EFFECT]);
      }
    }
  } else {
    return ui.notifications.error("Select one or more characters on which you want to run this macro");
  }
}
