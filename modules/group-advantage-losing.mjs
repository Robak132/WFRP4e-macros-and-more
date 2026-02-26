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
    unstable
  };

  await ChatMessage.create({content: await renderTemplate("modules/wfrp4e-macros-and-more/templates/group-advantage-losing.hbs", cardData)});
}

function buildSection(list) {
  list = list.slice().sort((a, b) => a.actor.name.localeCompare(b.actor.name));
  const totalValue = list.filter((a) => !a.defeated).reduce((a, c) => a + c.getValue(), 0);
  return {
    total: totalValue,
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

  const random = list[Math.floor(CONFIG.Dice.randomUniform() * list.length)];
  const items = list.map((actor) => ({
    tokenId: actor.token.id,
    dmg,
    label: actor.token.name,
    isRandom: false
  }));
  items.push({
    tokenId: random.token.id,
    dmg,
    label: game.i18n.localize("MACROS-AND-MORE.Random"),
    isRandom: true
  });

  return {
    items
  };
}
