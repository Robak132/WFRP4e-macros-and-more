/* ==========
* MACRO: Token manipulator
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Allows for quick token manipulations (disposition changes, system effects, showing weapons etc.)
========== */

async function setTokenDisposition(token, disposition) {
  await token.document.update({ disposition: disposition });
  token.refresh(true);
}

function addSystemEffect(token, effect) {
  let actor = token.actor;
  actor.addSystemEffect(effect)
}

const OPERATIONS = [
  {
    id: 'show-weapons',
    name: 'Show Weapons'
  }, {
    id: 'hide-weapons',
    name: 'Hide Weapons'
  }, {
    id: 'toggle-weapons',
    name: 'Toggle Weapons'
  }, {
    disabled: true
  }, {
    id: 'set-friendly',
    function: (token) => setTokenDisposition(token, 1),
    name: 'Set Token Friendly'
  }, {
    id: 'set-neutral',
    function: (token) => setTokenDisposition(token, 0),
    name: 'Set Token Neutral'
  }, {
    id: 'set-hostile',
    function: (token) => setTokenDisposition(token, -1),
    name: 'Set Token Hostile'
  }, {
    disabled: true
  }, {
    id: 'set-infighting',
    function: (token) => addSystemEffect(token, "infighting"),
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