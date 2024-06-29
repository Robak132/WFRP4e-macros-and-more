/* ==========
* MACRO: Potion Spoilage Macro
* VERSION: 1.0.0
* AUTHOR: Robak132
========== */

const fail = [
  [11, 10,  9,  8,  7,  6,  5], // 1
  [22, 20, 18, 16, 13, 13, 10], // 2
  [33, 30, 27, 24, 21, 18, 15], // 3
  [33, 30, 27, 24, 21, 18, 15], // 4
  [45, 40, 36, 32, 28, 24, 20], // 5
  [45, 40, 36, 32, 28, 24, 20], // 6
  [45, 40, 36, 32, 28, 24, 20], // 7
  [45, 40, 36, 32, 28, 24, 20], // 8
  [50, 50, 45, 40, 35, 30, 25], // 9
  [50, 50, 45, 40, 35, 30, 25], // 10
  [50, 50, 45, 40, 35, 30, 25], // 11
  [50, 50, 45, 40, 35, 30, 25], // 12
  [50, 50, 45, 40, 35, 30, 25], // 13
  [50, 50, 45, 40, 35, 30, 25], // 14
  [50, 50, 45, 40, 35, 30, 25], // 15
  [50, 50, 45, 40, 35, 30, 25], // 16
  [65, 50, 50, 50, 42, 36, 30]] // 17

const partialFail = [
  [22, 20, 18, 16, 14, 12, 10], // 1
  [44, 40, 36, 32, 28, 24, 20], // 2
  [66, 60, 54, 48, 42, 36, 30], // 3
  [66, 60, 54, 48, 42, 36, 30], // 4
  [88, 80, 72, 64, 56, 48, 40], // 5
  [88, 80, 72, 64, 56, 48, 40], // 6
  [88, 80, 72, 64, 56, 48, 40], // 7
  [88, 80, 72, 64, 56, 48, 40], // 8
  [95, 95, 90, 80, 70, 60, 50], // 9
  [95, 95, 90, 80, 70, 60, 50], // 10
  [95, 95, 90, 80, 70, 60, 50], // 11
  [95, 95, 90, 80, 70, 60, 50], // 12
  [95, 95, 90, 80, 70, 60, 50], // 13
  [95, 95, 90, 80, 70, 60, 50], // 14
  [95, 95, 90, 80, 70, 60, 50], // 15
  [95, 95, 90, 80, 70, 60, 50], // 16
  [95, 95, 95, 95, 84, 72, 60]] // 17

function getCheckSpoilage(table, seasons, sl) {
  if (seasons > 17) seasons = 17;
  if (sl < 0) sl = 0;
  if (sl > 6) sl = 6;

  let failProcent = fail[seasons - 1][sl];
  let partialFailProcent = partialFail[seasons - 1][sl];

  let roll = new Roll('1d100').roll().total;
  if (roll <= failProcent) {
    return -1;
  } else if (roll <= partialFailProcent) {
    return 0;
  } else {
    return 1;
  }
}

new Dialog({
  title: 'Potion Spoilage', content: `<form>
    <div class="form-group">
      <p style="flex: 1" class="section-title">Age in seasons</p>
      <input style="flex: 1" type="number" min="1" value="1">
    </div>
    <div class="form-group">
      <p style="flex: 1" class="section-title">Potion's SL</p>
      <input style="flex: 1" type="number" min="0" value="0">
    </div>
  </form>`, buttons: {
    yes: {
      icon: `<i class='fas fa-check'></i>`, label: game.i18n.localize('Apply'), callback: async (html) => {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: game.user.character }),
          content: `Rolling for potion spoilage...`,
        });
      }
    }
  }, no: {
    icon: `<i class='fas fa-times'></i>`, label: game.i18n.localize('Cancel'),
  }, default: 'yes'
}).render(true);