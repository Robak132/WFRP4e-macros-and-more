/* ==========
* MACRO: Roll Passive Talent
* AUTHOR: Robak132
* DESCRIPTION: Allows for easier interaction with passive talents like Sixth Sense and Trapper.
========== */

new Dialog({
  title: "Random Vampire Weaknesses",
  content: `
    <form>
      <div class="form-group">
        <label>Do you want to hide all Dialogs?</label>
    </form>
    `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: "Yes",
      callback: async () => await passiveTalentMacro(true)
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: "No",
      callback: async () => await passiveTalentMacro(false)
    }
  },
  default: "yes"
}).render(true);

const PASSIVE_TALENTS = [
  {
    talent: game.i18n.localize("NAME.SixthSense"),
    skill: game.i18n.localize("NAME.Intuition")
  },
  {
    talent: game.i18n.localize("NAME.Trapper"),
    skill: game.i18n.localize("NAME.Perception")
  },
  {
    talent: game.i18n.localize("NAME.NoseForTrouble"),
    skill: game.i18n.localize("NAME.Intuition")
  }
];

async function passiveTalentMacro(hideDialogs) {
  if (!game.user.isGM) {
    ui.notifications.error(game.i18n.localize("MACROS-AND-MORE.NoPermission"));
    return;
  }
  let msg = "";
  for (const {skill, talent} of PASSIVE_TALENTS) {
    const targetGroup = game.actors
      .filter((a) => a.hasPlayerOwner && a.type !== "vehicle" && a.itemTypes.talent.some((i) => i.name === talent))
      .map((g) => g.uuid);
    if (targetGroup.length === 0) {
      continue;
    }

    await game.settings.set("wfrp4e-macros-and-more", "passiveTests", []);
    for (const member of targetGroup) {
      if (member === null) {
        continue;
      }
      let actor = await fromUuid(member);
      actor = actor?.actor ? actor.actor : actor;
      await runActorTest(actor, skill, talent, hideDialogs);
    }
    msg += await catchGroupTestResults(skill, talent);
  }

  await ChatMessage.create({
    content: msg,
    whisper: game.users.filter((u) => u.isGM).map((u) => u.id)
  });
}

async function catchGroupTestResults(skill, talent) {
  let groupTestResultsMessage = `<h3>${talent}: <strong>${skill}</strong></h3>`;
  for (const testResult of await game.settings.get("wfrp4e-macros-and-more", "passiveTests")) {
    groupTestResultsMessage += `${testResult.outcome !== "success" ? "" : "<i class='fas fa-check'></i> "}
      <strong>${testResult.actor.name}:</strong> <strong>${testResult.sl} SL</strong> (${testResult.roll} vs ${testResult.target})</br>`;
  }
  return groupTestResultsMessage;
}

async function runActorTest(actor, skill, talent, hideDialogs) {
  let actorSkill = actor.items.find((i) => i.type === "skill" && i.name === skill);
  const actorTalentLevel = actor.items.filter((i) => i.type === "talent" && i.name === talent).length;
  const setupData = {
    bypass: hideDialogs,
    testModifier: 0,
    rollMode: "blindroll",
    absolute: {
      difficulty: "challenging",
      successBonus: actorTalentLevel
    },
    passiveTest: true,
    title: `Test: ${talent} (${actorSkill?.name})`
  };

  if (actorSkill !== undefined) {
    return (await actor.setupSkill(actorSkill, setupData)).roll();
  } else {
    actorSkill = await game.wfrp4e.utility.findSkill(skill);
    const skillCharacteristic = game.wfrp4e.config.characteristics[actorSkill.characteristic.value];
    setupData.title = `${talent} (${skillCharacteristic})`;

    return (await actor.setupCharacteristic(actorSkill.characteristic.value, setupData)).roll();
  }
}
