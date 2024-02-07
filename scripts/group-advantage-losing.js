// noinspection JSUnresolvedReference

const NAMES = {
  '-1': 'Enemies',
  '0': 'Neutral',
  '1': 'Allies',
};
const DRILLED = "Drilled"

export function handleLosingGroupAdvantage(combatants) {
  let content = {};
  for (let combatant of combatants.filter(c => c.actor.details.size)) {
    const disposition = combatant.token.disposition;
    const sizeValue = Math.pow(2, combatant.actor.sizeNum - 3);
    const drilled = combatant.actor.itemCategories.talent.some(t => t.name === DRILLED);
    let lst = content[disposition] ?? [];
    lst.push({
      name: combatant.name,
      size: sizeValue * (drilled ? 2 : 1),
      drilled: drilled,
    });
    content[disposition] = lst;
  }
  let chatMsg = `<h1>Losing Advantage</h1>`;
  for (let i = 1; i >= -1; i--) {
    if (content[i]) {
      chatMsg += `<h2>${NAMES[i]} [${content[i].reduce((a, c) => a + c.size, 0)}]</h2>`;
      let sortedActors = content[i].sort((a, b) => a.name.localeCompare(b.name, 'pl')).
          sort((a, b) => a.size > b.size ? -1 : 1);
      for (let actor of sortedActors) {
        chatMsg += `<p>${actor.name} [${actor.size}${actor.drilled ? `; ${DRILLED}` : ''}]</p>`;
      }
    }
  }
  ChatMessage.create({content: chatMsg});
}
