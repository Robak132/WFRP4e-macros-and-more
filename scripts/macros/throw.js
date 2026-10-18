let targets = game.user.targets;
if (targets.size !== 1) {
  return ui.notifications.error("Select 1 target.");
}
const [target] = targets;
console.log(target);

const opposedTest = {
  attacker: args.actor,
  result: {
    damage: {value: args.actor.system.characteristics.wp.bonus + 1},
    hitloc: {value: (await new Roll(`d2`).roll()).total === 1 ? "lLeg" : "rLeg"},
    damaging: false
  },
  attackerTest: {
    item: {
      properties: {},
      runScripts: () => []
    },
    weapon: {attackType: "other"},
    result: {roll: 1, critical: false},
    damageEffects: [],
    message: {id: null}
  },
  defenderTest: {
    context: {unopposed: true},
    weapon: null,
    failed: false
  }
};

await target.actor.applyDamage(opposedTest);
