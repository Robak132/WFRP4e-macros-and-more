export function handleLosingGroupAdvantage(combatants) {
  let DISPOSITION_LABELS = {
    "-1": game.i18n.localize("MACROS-AND-MORE.Enemies"),
    "0": game.i18n.localize("MACROS-AND-MORE.Neutral"),
    "1": game.i18n.localize("MACROS-AND-MORE.Allies"),
  };

  let content = {};
  for (let combatant of combatants.filter(c => c.actor.details.size)) {
    const disposition = combatant.token.disposition;
    const sizeValue = Math.pow(2, combatant.actor.sizeNum - 3);
    const drilled = combatant.actor._itemTypes.talent.some(t => t.name === game.i18n.localize("NAME.Drilled"));
    let lst = content[disposition] ?? [];
    lst.push({
      name: combatant.name,
      size: sizeValue * (drilled ? 2 : 1),
      drilled: drilled,
      defeated: combatant.defeated,
    });
    content[disposition] = lst;
  }
  let chatMsg = `<h1>${game.i18n.localize("MACROS-AND-MORE.LosingAdvantage")}</h1>`;
  for (let i = 1; i >= -1; i--) {
    if (content[i]) {
      chatMsg += `<h2>${DISPOSITION_LABELS[i]} [${content[i].filter(a => !a.defeated).reduce((a, c) => a + c.size, 0)}]</h2>`;
      let sortedActors = content[i].sort((a, b) => a.name.localeCompare(b.name, "pl")).sort((a, b) => a.size > b.size ? -1 : 1);
      for (let actor of sortedActors) {
        chatMsg += (actor.defeated) ? `<p><s>` : `<p>`;
        chatMsg += `${actor.name} `;
        chatMsg += (actor.drilled) ? `<abbr title="${game.i18n.localize("NAME.Drilled")}">` : ``;
        chatMsg += `[${actor.size}]`;
        chatMsg += (actor.drilled) ? `</abbr>` : ``;
        chatMsg += (actor.defeated) ? `</s></p>` : `</p>`;
      }
    }
  }
  ChatMessage.create({content: chatMsg});
}
