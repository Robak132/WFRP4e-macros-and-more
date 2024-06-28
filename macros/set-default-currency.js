/* ==========
* MACRO: Coin converter
* AUTHOR: Robak132
* DESCRIPTION: Sets multipliers on player's currencies based on current location. Based on Old World Armoury rules [2ed].
========== */

const NATIONS = {
  empire: "Empire",
  bretonnia: "Bretonnia",
  estalia: "Estalia",
  kislev: "Kislev",
  norsca: "Norsca",
  tilea: "Tilea",
  dwarf: "Dwarf Keeps",
  elf: "Elf Kingdoms",
  araby: "Araby",
};
const DATA = [
  [1.00, 1.05, 1.10, 1.10, 1.00, 0.80, 0.90, 1.05, 1.10],
  [0.95, 1.00, 1.05, 1.10, 1.00, 0.85, 0.85, 1.00, 1.05],
  [0.90, 0.95, 1.00, 0.90, 1.00, 0.90, 0.80, 1.00, 1.00],
  [0.90, 0.95, 1.10, 1.00, 0.95, 0.90, 0.90, 1.05, 1.10],
  [0.70, 0.80, 0.90, 0.95, 1.00, 1.00, 0.80, 0.90, 1.00],
  [0.50, 0.70, 0.80, 0.90, 1.00, 1.00, 0.00, 1.20, 0.90],
  [1.20, 1.30, 1.40, 1.00, 0.80, 1.50, 1.00, 1.00, 0.80],
  [0.95, 1.00, 1.05, 1.05, 0.95, 1.20, 1.00, 1.00, 0.95],
  [0.90, 0.95, 1.00, 1.10, 1.00, 0.90, 1.20, 1.05, 1.00],
];

main();

function getIdx(location) {
  return Object.keys(NATIONS).indexOf(location);
}

async function main() {
  await new Dialog({
    title: "Coin converter",
    content: `
     <form>
      <div class="form-group">
        <select style="text-align: center" name="currentLocation">
          ${Object.entries(NATIONS).map((entry) => `<option value="${entry[0]}">${entry[1]}</option>`).join("")}
        </select>
      </div>
    </form>`,
    buttons: {
      no: {
        icon: `<i class="fas fa-times"></i>`,
        label: "Cancel",
      },
      yes: {
        icon: `<i class="fas fa-check"></i>`,
        label: "Next",
        callback: async (html) => {
          let currentLocation = html.find("[name=\"currentLocation\"]").val();
          await submit(currentLocation);
        },
      },
    },
    default: "yes",
  }).render(true);
}

function extractDataFromCoin(money) {
  let updates = {};
  let coinValue = money.system.coinValue.value;
  let location = money.flags["wfrp4e-macros-and-more"].moneyLocation;
  if (location === undefined) {
    updates["flags.wfrp4e-macros-and-more.moneyLocation"] = "empire";
    location = "empire";
  }
  let baseCoinValue = money.flags["wfrp4e-macros-and-more"].moneyBaseValue;
  if (baseCoinValue === undefined) {
    updates["flags.wfrp4e-macros-and-more.moneyBaseValue"] = money.system.coinValue.value;
    baseCoinValue = coinValue;
  }
  money.update(updates);
  return {
    location,
    coinValue,
    baseCoinValue,
  };
}

async function submit(currentLocation) {
  let coinUpdates = [];

  let currentLocationIdx = getIdx(currentLocation);
  let content = `<div style="overflow-y: scroll;max-height: 500px">`;
  for (let actor of game.actors) {
    if (!actor._itemTypes.money.length) {
      continue;
    }

    let moneyContent = "";
    for (let money of actor._itemTypes.money) {
      const {
        location,
        coinValue,
        baseCoinValue,
      } = extractDataFromCoin(money);
      let convertedValue = Math.round(DATA[getIdx(location)][currentLocationIdx] * baseCoinValue);

      if (money.system.quantity.value === 0 || convertedValue === coinValue) {
        continue;
      }

      moneyContent += `<div class="form-group">
        <span style="flex: 5;text-align: center">${money.name}</span>
        <span style="flex: 3;text-align: center">${NATIONS[location]}</span>
        <span style="flex: 1;text-align: center">${coinValue}</span>
        <span style="flex: 1;text-align: center">&#8594;</span>
        <span style="flex: 1;text-align: center">${convertedValue}</span>
      </div>`;

      coinUpdates.push({object: money, value: convertedValue});
    }
    if (moneyContent !== "") {
      content += `<p style="text-align: center">${actor.name}</p>` + moneyContent;
    }
  }
  content += "</div>";

  await new Dialog({
    title: `Current Location: ${NATIONS[currentLocation]}`,
    content: content,
    buttons: {
      no: {
        icon: `<i class="fas fa-times"></i>`,
        label: "Cancel",
      },
      yes: {
        icon: `<i class="fas fa-check"></i>`,
        label: "Proceed",
        callback: async () => {
          for (let entry of coinUpdates) {
            await entry.object.update({"system.coinValue.value": entry.value});
          }
        },
      },
    },
    default: "yes",
  }).render(true);

}