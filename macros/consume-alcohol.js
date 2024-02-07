/* ==========
* MACRO: Consume Alcohol Macro
* VERSION: 1.0
* AUTHORS: @Robak132
* DESCRIPTION: Automatically counts failures and adds modifiers when drunk.
========== */

getDrunk();

function findFailures() {
  let ca1 = actor.actorEffects.filter(e => e.conditionId === 'consumealcohol1');
  if (!!ca1.length) return 1;
  let ca2 = actor.actorEffects.filter(e => e.conditionId === 'consumealcohol2');
  if (!!ca2.length) return 2;
  let ca3 = actor.actorEffects.filter(e => e.conditionId === 'consumealcohol3');
  if (!!ca3.length) return ca3.length + 2;
  return 0;
}

async function addAlcoholModifiers(actor) {
  let failures = findFailures();
  if (failures === 0) {
    actor.addSystemEffect('consumealcohol1');
  } else if (failures < 3) {
    actor.removeSystemEffect(`consumealcohol${failures}`);
    actor.addSystemEffect(`consumealcohol${failures + 1}`);
  } else {
    await actor.updateEmbeddedDocuments('ActiveEffect', [
      {
        '_id': actor.actorEffects.find(e => e.conditionId === 'consumealcohol3' && e.disabled === false).id,
        'disabled': true,
      }]);
    actor.addSystemEffect('consumealcohol3');
  }
  if (actor.characteristics.t.bonus <= failures + 1) {
    game.tables.find(table => table.getFlag('wfrp4e', 'key') === 'stinking-drunk').draw();
  }
}

async function getDrunk() {
  let characters = [];
  if (game.user.character) {
    // Get player's main character
    characters.push(game.user.character);
  } else if (canvas.tokens.controlled.length) {
    // Get selected characters
    characters = canvas.tokens.controlled.map(t => t.actor);
  } else {
    return ui.notifications.error('Select one or more characters on which you want to run this macro');
  }

  new Dialog({
    title: 'Determine Beverage',
    content: `
     <form>
      <div class="form-group">
        <select style="text-align: center" name="inputStrength">
          <option value="easy">Small Beer (+40)</option>
          <option value="average">Ale/Dwarf Beer/Wine (+20)</option>
          <option value="challenging">Strong Ale/Spirit/Brandy (+0)</option>
          <option disabled>──────────</option>
          <option value="bugman">Bugman’s XXXXXX (+20x4)</option>
        </select>
      </div>
    </form>`,
    buttons: {
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Cancel',
      },
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: 'Drink',
        callback: async (html) => {
          let brewStrength = html.find('[name="inputStrength"]').val();
          let tests = 1;
          if (brewStrength === 'bugman') {
            tests = 4;
            brewStrength = 'average';
          }

          for (const actor of characters) {
            for (let i = 0; i < tests; i++) {
              let test = await actor.setupSkill(game.i18n.localize('NAME.ConsumeAlcohol'), {
                bypass: false,
                absolute: {difficulty: brewStrength},
              });
              await test.roll();
              if (test.result.outcome === 'failure') {
                await addAlcoholModifiers(actor);
              }
            }
          }
        },
      },
    },
    default: 'yes',
  }).render(true);
}