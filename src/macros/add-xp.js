/* ==========
* MACRO: Add XP
* AUTHOR: Robak132
* DESCRIPTION: Adds a set amount of XP to all or targeted player character(s). Adds half XP to companion(s). Modified macro from GM Toolkit by Jagusti.
========== */

addXP();

function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
  const day = ("0" + currentDate.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

async function addXP() {
  let awardees = [];
  let halfAwardees = [];
  if (game.user.targets.size < 1) {
    awardees = game.users.filter((u) => u.character).map((g) => g.character);
    halfAwardees = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character" && !awardees.includes(a));
  } else {
    const group = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
    const targeted = game.canvas.tokens.placeables.filter((t) => t.isTargeted).map((t) => t.actor);
    awardees = group.filter((a) => targeted.includes(a));
  }
  if (awardees.length < 1) {
    return ui.notifications.error(game.i18n.localize("GMTOOLKIT.Token.TargetPCs"), {});
  }

  const XP = Number(game.settings.get("wfrp4e-gm-toolkit", "addXPDefaultAmount"));
  let reason =
    game.settings.get("wfrp4e-gm-toolkit", "addXPDefaultReason") === "null"
      ? ""
      : game.settings.get("wfrp4e-gm-toolkit", "addXPDefaultReason");
  if (reason) {
    reason = game.settings.get("wfrp4e-gm-toolkit", "addXPDefaultReason");
    const session = game.gmtoolkit.utility.getSession();
    reason = reason.replace("(%date%)", `(${getCurrentDate()})`);
    reason = session.id !== "null" ? reason.replace("%session%", session.id) : reason.replace("%session%", "");
  }

  if (game.settings.get("wfrp4e-gm-toolkit", "addXPPrompt")) {
    let awardeeList = `
      <div class="form-group">
        <label style="font-variant: small-caps;font-weight: bold;">Full Experience will be awarded to:</label>
      </div>`;
    awardeeList += awardees
      .map((pc) => {
        return `<div class="form-group">
            <input type="checkbox" checked/>
            <label>${pc?.actor?.name || pc.name}</label>
          </div>`;
      })
      .join("");
    let halfAwardeeList = `
      <div class="form-group">
        <label style="font-variant: small-caps;font-weight: bold;">Half Experience will be awarded to:</label>
      </div>`;
    halfAwardeeList += halfAwardees
      .map((pc) => {
        return `<div class="form-group">
            <input type="checkbox" checked />
            <label>${pc?.actor?.name || pc.name}</label>
          </div>`;
      })
      .join("");
    await new Dialog({
      title: game.i18n.localize("GMTOOLKIT.Dialog.AddXP.Title"),
      content: `<form>
          <div>
            ${awardeeList}
            ${halfAwardees.length ? halfAwardeeList : ""}
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("GMTOOLKIT.Dialog.AddXP.Prompt")}</label>
            <input type="text" id="add-xp" name="add-xp" value="${XP}" />
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("GMTOOLKIT.Dialog.AddXP.Reason")}</label>
            <input type="text" id="xp-reason" name="xp-reason" value="${reason}" />
          </div>
        </form>`,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("GMTOOLKIT.Dialog.Apply"),
          callback: async (html) => {
            const XP = Math.round(html.find("#add-xp").val());
            if (isNaN(XP)) {
              return ui.notifications.error(game.i18n.localize("GMTOOLKIT.Dialog.AddXP.InvalidXP"));
            }
            const reason = html.find("#xp-reason").val();
            await updateXP(awardees, halfAwardees, XP, reason);
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("GMTOOLKIT.Dialog.Cancel")
        }
      },
      default: "yes"
    }).render(true);
  } else {
    await updateXP(awardees, halfAwardees, XP, reason);
  }
}

function updateActorXP(pc, XP, reason) {
  const recipient = pc?.actor?.name || pc.name;
  const XPTotal = pc?.details?.experience?.total;
  const newXPTotal = Math.max(XPTotal + XP, 0);
  const XPCurrent = pc?.details?.experience?.current || 0;
  const newXPCurrent = Math.max(XPCurrent + XP, 0);

  pc?.actor ? pc.actor.awardExp(XP, reason) : pc.awardExp(XP, reason);

  return game.i18n.format("GMTOOLKIT.AddXP.Success", {
    recipient,
    XPTotal,
    newXPTotal,
    XPCurrent,
    newXPCurrent
  });
}

async function updateXP(awardees, halfAwardees = [], XP, reason) {
  const halfXP = Math.round(XP / 2);
  let chatContent = "";

  awardees.forEach((pc) => {
    chatContent += updateActorXP(pc, XP, reason);
  });
  halfAwardees.forEach((pc) => {
    chatContent += updateActorXP(pc, halfXP, reason);
  });
  const chatData = game.wfrp4e.utility.chatDataSetup(chatContent, "gmroll", false);
  chatData.flavor = game.i18n.format("GMTOOLKIT.AddXP.Flavor", {XP, reason});
  await ChatMessage.create(chatData, {});
}
