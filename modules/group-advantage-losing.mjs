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
    this.defeated = combatant.defeated;
    this.unstable = combatant.actor.itemTypes.trait.some((t) => t.name === game.i18n.localize("NAME.Unstable"));
  }

  /** @returns {number} */
  getValue() {
    return Math.pow(2, this.size - 3) * (this.drilled ? 2 : 1);
  }
}

export async function handleLosingGroupAdvantage(combatants) {
  const combatantList = combatants.map((c) => new Combatant(c));
  const allies = combatantList.filter((c) => c.disposition === 1);
  const neutral = combatantList.filter((c) => c.disposition === 0);
  const enemies = combatantList.filter((c) => c.disposition === -1);
  const notAllies = [...neutral, ...enemies];

  let chatMsg = `<h1>${game.i18n.localize("MACROS-AND-MORE.LosingAdvantage")}</h1>`;
  chatMsg += addSection(allies, game.i18n.localize("MACROS-AND-MORE.Allies"));
  chatMsg += addSection(neutral, game.i18n.localize("MACROS-AND-MORE.Neutral"));
  chatMsg += addSection(enemies, game.i18n.localize("MACROS-AND-MORE.Enemies"));

  const alliesAdvantage = allies?.[0]?.actor?.system?.status?.advantage?.value ?? 0;
  const notAlliesAdvantage = notAllies?.[0]?.actor?.system?.status?.advantage?.value ?? 0;

  let dmg = alliesAdvantage - notAlliesAdvantage;
  if (dmg > 0) {
    chatMsg += addUnstableSection(notAllies, dmg);
  } else {
    chatMsg += addUnstableSection(allies, -dmg);
  }
  await ChatMessage.create({content: chatMsg});
}

function addSection(list, header) {
  let chatMsg = "";
  if (list.length) {
    const alliesValue = list.filter((a) => !a.defeated).reduce((a, c) => a + c.getValue(), 0);
    chatMsg += `<h2>${header} [${alliesValue}]</h2>`;
    for (const actor of list) {
      chatMsg += actor.defeated ? "<p><s>" : "<p>";
      chatMsg += `${actor.actor.name} `;
      chatMsg += actor.drilled ? `<abbr title="${game.i18n.localize("NAME.Drilled")}">` : "";
      chatMsg += `[${actor.getValue()}]`;
      chatMsg += actor.drilled ? "</abbr>" : "";
      chatMsg += actor.defeated ? "</s></p>" : "</p>";
    }
  }
  return chatMsg;
}

function addUnstableSection(list, dmg) {
  list = list.filter((a) => a.unstable);
  if (!list.length) return "";
  let item = list[Math.floor(CONFIG.Dice.randomUniform() * list.length)];

  let msg = `<h2>Unstable Trait</h2>`;
  msg += `<p><b>${item.actor.name}</b> weakens.</p>`;
  msg += `<a class="apply-unstable-damage" data-actor="${item.actor.id}" data-damage="${dmg}">${game.i18n.localize("CHATOPT.ApplyDamage")}</a>`;
  return msg;
}
