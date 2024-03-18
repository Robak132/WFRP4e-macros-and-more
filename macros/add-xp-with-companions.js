/* ==========
* MACRO: Add XP (Characters and Companions)
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Adds a set amount of XP to all or targeted player character(s). Adds half XP to companion(s). Modified macro from GM Toolkit by Jagusti.
========== */

addXP();

function getCurrentDate() {
  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
  let day = ('0' + currentDate.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
}

async function addXP() {
  let awardees = [];
  let halfAwardees = [];
  if (game.user.targets.size < 1) {
    awardees = game.gmtoolkit.utility.getGroup('party');
    halfAwardees = game.actors.filter(a => a.hasPlayerOwner && a.type === 'character' && !awardees.includes(a));
  } else {
    awardees = game.canvas.tokens.placeables.filter(
        t => t.isTargeted && t.actor.hasPlayerOwner && t.actor.type === 'character').map(m => m.actor);
  }
  if (awardees.length < 1) return ui.notifications.error(game.i18n.localize('GMTOOLKIT.Token.TargetPCs'), {});

  const XP = Number(game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultAmount'));
  let reason = (game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultReason') === 'null') ? '' : game.settings.get(
      'wfrp4e-gm-toolkit', 'addXPDefaultReason');
  if (reason) {
    reason = game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultReason');
    const session = game.gmtoolkit.utility.getSession();
    reason = reason.replace('(%date%)', `(${getCurrentDate()})`);
    reason = (session.id !== 'null') ? reason.replace('%session%', session.id) : reason.replace('%session%', '');
  }

  if (game.settings.get('wfrp4e-gm-toolkit', 'addXPPrompt')) {
    let content = '<p>Full Experience will be awarded to:</p><ul>';
    awardees.forEach(pc => {
      content += `<li>${pc?.actor?.name || pc.name}</li>`;
    });
    content += '</ul>';
    if (halfAwardees.length) {
      content += '<p>Half Experience will be awarded to:</p><ul>';
      halfAwardees.forEach(pc => {
        content += `<li>${pc?.actor?.name || pc.name}</li>`;
      });
      content += '</ul>';
    }
    await new Dialog({
      title: game.i18n.localize('GMTOOLKIT.Dialog.AddXP.Title'),
      content: `<form>
              ${content}
              <div class="form-group">
                <label>${game.i18n.localize('GMTOOLKIT.Dialog.AddXP.Prompt')}</label> 
                <input type="text" id="add-xp" name="add-xp" value="${XP}" />
              </div>
              <div class="form-group">
                <label>${game.i18n.localize('GMTOOLKIT.Dialog.AddXP.Reason')}</label> 
                <input type="text" id="xp-reason" name="xp-reason" value="${reason}" />
              </div>
          </form>`,
      buttons: {
        yes: {
          icon: '<i class=\'fas fa-check\'></i>',
          label: game.i18n.localize('GMTOOLKIT.Dialog.Apply'),
          callback: html => {
            const XP = Math.round(html.find('#add-xp').val());
            if (isNaN(XP)) return ui.notifications.error(game.i18n.localize('GMTOOLKIT.Dialog.AddXP.InvalidXP'));
            const reason = html.find('#xp-reason').val();
            updateXP(XP, reason, awardees, halfAwardees);
          },
        },
        no: {
          icon: '<i class=\'fas fa-times\'></i>',
          label: game.i18n.localize('GMTOOLKIT.Dialog.Cancel'),
        },
      },
      default: 'yes',
    }).render(true);
  } else {
    updateXP(XP, reason, awardees, halfAwardees);
  }
}

function updateActorXP(XP, reason, pc) {
  const recipient = pc?.actor?.name || pc.name;
  const XPTotal = pc?.details?.experience?.total;
  const newXPTotal = Math.max(XPTotal + XP, 0);
  const XPCurrent = pc?.details?.experience?.current || 0;
  const newXPCurrent = Math.max(XPCurrent + XP, 0);

  pc?.actor ? pc.actor.awardExp(XP, reason) : pc.awardExp(XP, reason);

  return game.i18n.format('GMTOOLKIT.AddXP.Success', {
    recipient,
    XPTotal,
    newXPTotal,
    XPCurrent,
    newXPCurrent,
  });
}

function updateXP(XP, reason, awardees, halfAwardees = []) {
  let halfXP = Math.round(XP / 2);
  let chatContent = '';

  awardees.forEach(pc => {
    chatContent += updateActorXP(XP, reason, pc);
  });
  halfAwardees.forEach(pc => {
    chatContent += updateActorXP(halfXP, reason, pc);
  });
  const chatData = game.wfrp4e.utility.chatDataSetup(chatContent, 'gmroll', false);
  chatData.flavor = game.i18n.format('GMTOOLKIT.AddXP.Flavor', {
    XP,
    reason,
  });
  ChatMessage.create(chatData, {});
}
