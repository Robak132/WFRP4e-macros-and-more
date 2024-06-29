if (!game.user.isUniqueGM) return;

effectsToCreate = [];
effectsToDelete = [];
for (let weapon of this.actor._itemTypes.weapon ?? []) {
  const weaponEffect = this.actor.effects.find((value) => value.name === `${weapon.name} (${weapon.id})`);
  if (weapon.equipped && weaponEffect === undefined) {
    effectsToCreate.push({
      name: `${weapon.name} (${weapon.id})`,
      icon: weapon.img,
      statuses: ["show-item"]
    });
  } else if (!weapon.equipped && weaponEffect !== undefined) {
    effectsToDelete.push(weaponEffect._id);
  }
}
this.actor.createEmbeddedDocuments("ActiveEffect", effectsToCreate);
if (effectsToDelete.length) {
  this.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
}
