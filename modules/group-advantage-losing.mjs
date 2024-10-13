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
  const combatantList = combatants.map((c) => new Combatant(c));
  const allies = combatantList.filter((c) => c.disposition === 1);
  const neutral = combatantList.filter((c) => c.disposition === 0);
  const enemies = combatantList.filter((c) => c.disposition === -1);
  const notAllies = [...neutral, ...enemies];

  let chatMsg = `<h1>${game.i18n.localize("MACROS-AND-MORE.LosingAdvantage")}</h1>`;
  chatMsg += addSection(allies, game.i18n.localize("MACROS-AND-MORE.Allies"));
  chatMsg += addSection(neutral, game.i18n.localize("MACROS-AND-MORE.Neutral"));
  chatMsg += addSection(enemies, game.i18n.localize("MACROS-AND-MORE.Enemies"));

  const advantage = game.settings.get("wfrp4e", "groupAdvantageValues");
  const alliesAdvantage = advantage.players;
  const notAlliesAdvantage = advantage.enemies;

  let dmg = alliesAdvantage - notAlliesAdvantage;
  if (dmg > 0) {
    chatMsg += addUnstableSection(notAllies, dmg);
  } else if (dmg < 0) {
    chatMsg += addUnstableSection(allies, -dmg);
  }
  await ChatMessage.create({content: chatMsg});
}

function addSection(list, header) {
  let chatMsg = "";
  list = list.toSorted((a, b) => a.actor.name.localeCompare(b.actor.name));
  if (list.length) {
    const alliesValue = list.filter((a) => !a.defeated).reduce((a, c) => a + c.getValue(), 0);
    chatMsg += `<h2>${header} [${alliesValue}]</h2><ul>`;
    for (const actor of list) {
      chatMsg += "<li>";
      chatMsg += actor.defeated ? "<s>" : "";
      chatMsg += `${actor.actor.name} `;
      chatMsg += actor.drilled ? `<abbr title="${game.i18n.localize("NAME.Drilled")}">` : "";
      chatMsg += `[${actor.getValue()}]`;
      chatMsg += actor.drilled ? "</abbr>" : "";
      chatMsg += actor.defeated ? "</s>" : "";
      chatMsg += "</li>";
    }
    chatMsg += "</ul>";
  }
  return chatMsg;
}

function addUnstableSection(list, dmg) {
  list = list.filter((a) => !!a.unstable);
  if (!list.length) return "";
  const random = list[Math.floor(CONFIG.Dice.randomUniform() * list.length)];
  let msg = `<h2>Unstable Trait</h2><p>Some combatants are Unstable and may take damage:</p><ul>`;
  msg += list.map((a) => getLink(a.token.id, dmg, a.token.name)).join("");
  msg += getLink(random.token.id, dmg, "<b>Random</b>");
  msg += `</ul>`;
  return msg;
}

function getLink(tokenId, dmg, label) {
  return `<li><a class="unstable-actor" data-token="${tokenId}" data-damage="${dmg}">${label}</a></li>`;
}
