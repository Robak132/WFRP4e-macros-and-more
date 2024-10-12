/* ==========
* MACRO: Roll Passive Talent
* AUTHOR: Robak132
* DESCRIPTION: Allows for easier interaction with passive talents like Sixth Sense and Trapper.
========== */

const PASSIVE_TALENTS = [
  {
    skill: game.i18n.localize("NAME.Perception")
  },
  {
    talent: game.i18n.localize("NAME.SixthSense"),
    skill: game.i18n.localize("NAME.Intuition")
  },
  {
    talent: game.i18n.localize("NAME.Trapper"),
    skill: game.i18n.localize("NAME.Perception")
  }
];

async function passiveTalentMacro() {
  if (!game.user.isGM) {
    ui.notifications.error(game.i18n.localize("MACROS-AND-MORE.NoPermission"));
    return;
  }
  let msg = "";
  for (const {skill, talent} of PASSIVE_TALENTS) {
    const targetGroup = game.actors.filter((a) => {
      return (
        a.hasPlayerOwner &&
        a.type !== "vehicle" &&
        (talent == null || a.itemTypes.talent.some((i) => i.name === talent))
      );
    });
    if (targetGroup.length === 0) {
      continue;
    }

    let icon = `<i class='fas fa-xmark'></i>`;
    let contentMsg = ``;
    for (const actor of targetGroup) {
      if (actor == null) continue;
      let testResult = await runActorTest(actor, skill, talent);
      if (testResult.outcome === "success") {
        contentMsg += `<span style="color: green"><i class='fas fa-check'></i> <strong>${actor.name}: ${testResult["SL"]} SL</strong> (${testResult.roll} vs ${testResult.target})</span></br>`;
        icon = `<i class='fas fa-check'></i>`;
      } else {
        contentMsg += `<span style="color: red"><i class='fas fa-xmark'></i> <strong>${actor.name}: ${testResult["SL"]} SL</strong> (${testResult.roll} vs ${testResult.target})</span></br>`;
      }
    }
    msg += `<h3>${icon} ${talent ? talent : skill}</h3><p>${contentMsg}</p>`;
  }

  await ChatMessage.create({
    content: msg,
    whisper: game.users.filter((u) => u.isGM).map((u) => u.id)
  });
}

async function runActorTest(actor, skill, talent) {
  let actorSkill = actor.items.find((i) => i.type === "skill" && i.name === skill);
  const setupData = {
    testModifier: 0,
    fields: {
      rollMode: "blindroll",
      difficulty: "challenging"
    },
    passiveTest: true,
    title: talent ? `${talent} (${actorSkill?.name})` : `${skill} (${actorSkill?.name}}`
  };
  if (actorSkill !== undefined) {
    let test = await actor.setupSkill(actorSkill, setupData);
    await test.roll();
    return test.result;
  } else {
    actorSkill = await game.wfrp4e.utility.findSkill(skill);
    const skillCharacteristic = game.wfrp4e.config.characteristics[actorSkill.characteristic.value];
    setupData.title = talent ? `${talent} (${skillCharacteristic})` : skillCharacteristic;

    let test = await actor.setupCharacteristic(actorSkill.characteristic.value, setupData);
    await test.roll();
    return test.result;
  }
}

passiveTalentMacro();
