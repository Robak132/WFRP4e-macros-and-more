effectsToCreate = [];
effectsToDelete = [];
for (const weapon of this.actor._itemTypes.weapon) {
  const weapon_effect = this.actor.effects.find((value) => value.name === weapon.name);
  if (weapon.equipped && weapon_effect === undefined) {
    effectsToCreate.push({
      name: weapon.name,
      icon: weapon.img,
      statuses: ["show-item"],
      transfer: true,
      flags: {
        wfrp4e: {
          preventDuplicateEffects: true
        }
      }
    });
  } else if (!weapon.equipped && weapon_effect !== undefined) {
    effectsToDelete.push(weapon_effect._id);
  }
}
this.actor.createEmbeddedDocuments("ActiveEffect", effectsToCreate);
if (effectsToDelete.length) {
  character.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
}
