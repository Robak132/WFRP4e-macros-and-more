/* ==========
* MACRO: Token Manipulator
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Allows for quick token manipulations (disposition changes, system effects, showing weapons etc.)
========== */

const SHOW_WEAPONS_EFFECT = {
  name: game.i18n.localize('MACROS-AND-MORE.ShowWeapons'),
  flags: {
    wfrp4e: {
      effectTrigger: 'prePrepareItems',
      effectApplication: 'actor',
      script: `
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
          token.actor.deleteEmbeddedDocuments('ActiveEffect', effectsToDelete);
        }`,
    },
  },
}

const OPERATIONS = [
  {
    id: 'show-weapons',
    name: 'Show Weapons',
    function: (token) => {
      if (token.actor.effects.find(e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons')) === undefined) {
        token.actor.createEmbeddedDocuments('ActiveEffect', [SHOW_WEAPONS_EFFECT]);
      }
    }
  }, {
    id: 'hide-weapons',
    name: 'Hide Weapons',
    function: (token) => {
      let effects = token.actor.effects.filter((e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons'))).map(e => e._id)
      effects = effects.concat(token.actor.effects.filter((e => e.statuses.has('show-item'))).map(e => e._id))
      if (effects.length) {
        token.actor.deleteEmbeddedDocuments('ActiveEffect', effects);
      }
    }
  }, {
    id: 'toggle-weapons',
    name: 'Toggle Weapons',
    function: (token) => {
      if (token.actor.effects.find(e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons')) === undefined) {
        token.actor.createEmbeddedDocuments('ActiveEffect', [SHOW_WEAPONS_EFFECT]);
      } else {
        let effects = token.actor.effects.filter((e => e.name === game.i18n.localize('MACROS-AND-MORE.ShowWeapons'))).map(e => e._id)
        effects = effects.concat(token.actor.effects.filter((e => e.statuses.has('show-item'))).map(e => e._id))
        token.actor.deleteEmbeddedDocuments('ActiveEffect', effects);
      }
    }
  }, {
    disabled: true
  }, {
    id: 'set-friendly',
    function: async (token) => {
      await token.document.update({disposition: 1});
      token.refresh(true);
    },
    name: 'Set Token Friendly'
  }, {
    id: 'set-neutral',
    function: async (token) => {
      await token.document.update({disposition: 0});
      token.refresh(true);
    },
    name: 'Set Token Neutral'
  }, {
    id: 'set-hostile',
    function: async (token) => {
      await token.document.update({disposition: -1});
      token.refresh(true);
    },
    name: 'Set Token Hostile'
  }, {
    disabled: true
  }, {
    id: 'set-infighting',
    function: (token) => token.actor.addSystemEffect("infighting"),
    name: 'Set Infighting'
  }
];

main();

function main() {
  if (canvas.tokens.controlled.length) {
    new Dialog({
      title: 'Select operation',
      content: `
     <form>
      <div class="form-group">
        <select style="text-align: center" name="operation">
        ${OPERATIONS.map(op => {
        return op.disabled === true ? `<option disabled>──────────</option>` : `<option value="${op.id}">${op.name}</option>`;
      }).join()}
        </select>
      </div>
    </form>`,
      buttons: {
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        },
        yes: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Confirm',
          callback: async (html) => {
            const operationId = html.find('[name="operation"]').val();
            const operation = OPERATIONS.find(op => op.id === operationId)
            canvas.tokens.controlled.forEach(token => operation.function(token))
          }
        }
      },
      default: 'yes'
    }).render(true);
  } else {
    return ui.notifications.error('Select one or more tokens on which you want to run this macro');
  }
}