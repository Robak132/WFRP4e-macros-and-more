class Combatant {
  /**
   * Creates an instance of Combatant.
   * @param {Object} combatant - The combatant object.
   * @property {Object} actor - The actor object.
   * @property {Object} token - The token object.
   * @property {number} disposition - The disposition of the token.
   * @property {number} size - The size of the actor.
   * @property {boolean} drilled - The drilled talent.
   * @property {boolean} unstable - The unstable trait.
   * @property {boolean} defeated - The defeated status.
   */
  constructor(combatant) {
    this.actor = combatant.actor;
    this.token = combatant.token;
    this.disposition = combatant.token.disposition;
    this.size = combatant.actor.sizeNum;
    this.drilled = combatant.actor.itemTypes.talent.some((t) => t.name === game.i18n.localize("NAME.Drilled"));
    this.defeated = combatant.defeated || combatant.actor.statuses.has("dead");
    this.unstable = combatant.actor.itemTypes.trait.some((t) => t.name === game.i18n.localize("NAME.Unstable"));
  }

  /** @returns {number} */
  getValue() {
    return Math.pow(2, this.size - 3) * (this.drilled ? 2 : 1);
  }
}

export async function handleLosingGroupAdvantage(combatants) {
  const combatantList = combatants.filter((c) => c?.actor && c?.token).map((c) => new Combatant(c));
  const allies = combatantList.filter((c) => c.disposition === 1);
  const neutral = combatantList.filter((c) => c.disposition === 0);
  const enemies = combatantList.filter((c) => c.disposition === -1);
  const notAllies = [...neutral, ...enemies];

  const alliesSection = buildSection(allies);
  const neutralSection = buildSection(neutral);
  const enemiesSection = buildSection(enemies);
  let resolution;
  let priority = 0;

  if (alliesSection.total > neutralSection.total + enemiesSection.total) {
    resolution = `Players win by ${alliesSection.total - neutralSection.total - enemiesSection.total}`;
    priority = 1;
  } else if (alliesSection.total < neutralSection.total + enemiesSection.total) {
    resolution = `Enemies win by ${neutralSection.total + enemiesSection.total - alliesSection.total}`;
    priority = -1;
  } else {
    resolution = "Tie";
  }

  const advantage = game.settings.get("wfrp4e", "groupAdvantageValues");
  const alliesAdvantage = advantage.players;
  const notAlliesAdvantage = advantage.enemies;

  let dmg = alliesAdvantage - notAlliesAdvantage;
  let unstable = null;
  if (dmg > 0) {
    unstable = buildUnstableSection(notAllies, dmg);
  } else if (dmg < 0) {
    unstable = buildUnstableSection(allies, -dmg);
  }

  const cardData = {
    alliesSection,
    neutralSection,
    enemiesSection,
    unstable,
    resolution,
    priority
  };

  await ChatMessage.create({content: await renderTemplate("modules/wfrp4e-macros-and-more/templates/group-advantage-losing.hbs", cardData)});
}

function buildSection(list) {
  list = list.slice().sort((a, b) => a.actor.name.localeCompare(b.actor.name));
  const totalValue = list.filter((a) => !a.defeated).reduce((a, c) => a + c.getValue(), 0);
  return {
    total: totalValue ?? 0,
    items: list.map((actor) => {
      const value = actor.getValue();
      return {
        name: actor.actor.name,
        value,
        drilled: actor.drilled,
        defeated: actor.defeated
      };
    })
  };
}

function buildUnstableSection(list, dmg) {
  list = list.filter((a) => !!a.unstable);
  if (!list.length) return null;
  const items = list.map((actor) => ({
    tokenId: actor.token.id,
    dmg,
    label: actor.token.name
  }));
  const random = list[Math.floor(CONFIG.Dice.randomUniform() * list.length)];
  items.push({
    tokenId: random.token.id,
    dmg,
    label: `<strong>${game.i18n.localize("MACROS-AND-MORE.Random")}</strong>`
  });

  return {
    items
  };
}

Hooks.on("renderChatMessageHTML", (chatMessage, html) => {
  const advantageButton = html.querySelectorAll(".advantage-button");
  advantageButton.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!game.user.isGM) return;
      let advantage = game.settings.get("wfrp4e", "groupAdvantageValues");
      switch ($(event.currentTarget).attr("data-action")) {
        case "enemies":
          advantage.enemies += 1;
          advantage.players = Math.max(0, advantage.players - 1);
          break;
        case "allies":
          advantage.players += 1;
          advantage.enemies = Math.max(0, advantage.enemies - 1);
          break;
      }
      await game.settings.set("wfrp4e", "groupAdvantageValues", advantage);
    });
  });
});
