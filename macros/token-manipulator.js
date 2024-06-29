/* ==========
* MACRO: Token Manipulator
* AUTHOR: Robak132
* DESCRIPTION: Allows for quick token manipulations (disposition changes, system effects, showing weapons etc.)
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

let OPERATIONS = [
  {
    id: "show-weapons",
    name: "Show Weapons",
    function: (token) => {
      if (token.actor.effects.find((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeapons")) === undefined) {
        token.actor.createEmbeddedDocuments("ActiveEffect", [SHOW_WEAPONS_EFFECT]);
      }
    }
  },
  {
    id: "hide-weapons",
    name: "Hide Weapons",
    function: (token) => {
      let effects = token.actor.effects
        .filter((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeapons"))
        .map((e) => e._id);
      effects = effects.concat(token.actor.effects.filter((e) => e.statuses.has("show-item")).map((e) => e._id));
      if (effects.length) {
        token.actor.deleteEmbeddedDocuments("ActiveEffect", effects);
      }
    }
  },
  {
    id: "toggle-weapons",
    name: 'Toggle Weapons"',
    function: (token) => {
      if (token.actor.effects.find((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeapons")) === undefined) {
        token.actor.createEmbeddedDocuments("ActiveEffect", [SHOW_WEAPONS_EFFECT]);
      } else {
        let effects = token.actor.effects
          .filter((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeapons"))
          .map((e) => e._id);
        effects = effects.concat(token.actor.effects.filter((e) => e.statuses.has("show-item")).map((e) => e._id));
        token.actor.deleteEmbeddedDocuments("ActiveEffect", effects);
      }
    }
  },
  {
    disabled: true
  },
  {
    id: "delete-token-magic-filters",
    function: async () => {
      await TokenMagic.deleteFiltersOnSelected();
    },
    name: "Delete TokenMagic Filters"
  },
  {
    disabled: true
  },
  {
    id: "link-token",
    function: async (token) => {
      await token.document.update({linkActor: true});
      await game.actors.get(token.actor.id).prototypeToken.update({actorLink: true});
    },
    name: "Link Token"
  },
  {
    disabled: true
  },
  {
    id: "set-friendly-token",
    function: async (token) => {
      await token.document.update({disposition: 1});
      token.refresh(true);
    },
    name: "Set Friendly (Token only)"
  },
  {
    id: "set-friendly",
    function: async (token) => {
      await game.actors.get(token.actor.id).prototypeToken.update({disposition: 1});
      await token.document.update({disposition: 1});
      token.refresh(true);
    },
    name: "Set Friendly"
  },
  {
    id: "set-neutral-token",
    function: async (token) => {
      await token.document.update({disposition: 0});
      token.refresh(true);
    },
    name: "Set Neutral (Token only)"
  },
  {
    id: "set-neutral",
    function: async (token) => {
      await game.actors.get(token.actor.id).prototypeToken.update({disposition: 0});
      await token.document.update({disposition: 0});
      token.refresh(true);
    },
    name: "Set Neutral"
  },
  {
    id: "set-hostile-token",
    function: async (token) => {
      await token.document.update({disposition: -1});
      token.refresh(true);
    },
    name: "Set Hostile (Token only)"
  },
  {
    id: "set-hostile",
    function: async (token) => {
      await game.actors.get(token.actor.id).prototypeToken.update({disposition: -1});
      await token.document.update({disposition: -1});
      token.refresh(true);
    },
    name: "Set Hostile"
  },
  {
    disabled: true
  },
  {
    id: "set-infighting",
    function: (token) => token.actor.addSystemEffect("infighting"),
    name: "Set Infighting"
  }
];

if (canvas.tokens.controlled.length) {
  new Dialog({
    title: "Select operation",
    content: `
   <form>
    <div class="form-group">
      <select style="text-align: center" name="operation">
      ${OPERATIONS.map((op) => {
        return op.disabled === true
          ? "<option disabled>──────────</option>"
          : `<option value="${op.id}">${op.name}</option>`;
      }).join()}
      </select>
    </div>
  </form>`,
    buttons: {
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      },
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: "Confirm",
        callback: async (html) => {
          const operationId = html.find('[name="operation"]').val();
          const operation = OPERATIONS.find((op) => op.id === operationId);
          canvas.tokens.controlled.forEach((token) => operation.function());
        }
      }
    },
    default: "yes"
  }).render(true);
} else {
  return ui.notifications.error("Select one or more tokens on which you want to run this macro");
}
