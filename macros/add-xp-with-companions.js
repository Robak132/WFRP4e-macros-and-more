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
    awardees = game.gmtoolkit.utility.getGroup('party')
    halfAwardees = game.gmtoolkit.utility.getGroup('company').filter(g => g.type === 'character' && !awardees.includes(g));
  } else {
    awardees = game.gmtoolkit.utility.getGroup('company', {interaction: 'targeted'}).filter(g => g.type === 'character');
  }
  if (awardees.length < 1) return ui.notifications.error(game.i18n.localize('GMTOOLKIT.Token.TargetPCs'), {});

  const XP = Number(game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultAmount'));
  let reason = (game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultReason') === 'null') ? ''
      : game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultReason');
  if (reason) {
    reason = game.settings.get('wfrp4e-gm-toolkit', 'addXPDefaultReason');
    const session = game.gmtoolkit.utility.getSession();
    reason = reason.replace('(%date%)', `(${getCurrentDate()})`);
    reason = (session.id !== 'null') ?
        reason.replace('%session%', session.id) :
        reason.replace('%session%', '');
  }

  // Prompt for XP if option is set
  if (game.settings.get('wfrp4e-gm-toolkit', 'addXPPrompt')) {
    let awardeeList = '<ul>';
    awardees.forEach(pc => {
      awardeeList += `<li>${pc?.actor?.name || pc.name}</li>`;
    });
    awardeeList += '</ul>';
    let halfAwardeeList = '<ul>';
    halfAwardees.forEach(pc => {
      halfAwardeeList += `<li>${pc?.actor?.name || pc.name}</li>`;
    });
    halfAwardeeList += '</ul>';
    new Dialog({
      title: game.i18n.localize('GMTOOLKIT.Dialog.AddXP.Title'),
      content: `<form>
              <p>Full Experience will be awarded to:</p>
              ${awardeeList}
              <p>Half Experience will be awarded to:</p>
              ${halfAwardeeList}
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
            updateXP(awardees, halfAwardees, XP, reason);
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
    updateXP(awardees, halfAwardees, XP, reason);
  }
}

function updateActorXP(pc, XP, reason) {
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

function updateXP(awardees, halfAwardees  = [], XP, reason) {
  let halfXP = Math.round(XP / 2);
  let chatContent = '';

  awardees.forEach(pc => {
    chatContent += updateActorXP(pc, XP, reason);
  });
  halfAwardees.forEach(pc => {
    chatContent += updateActorXP(pc, halfXP, reason)
  })
  const chatData = game.wfrp4e.utility.chatDataSetup(chatContent, 'gmroll', false);
  chatData.flavor = game.i18n.format('GMTOOLKIT.AddXP.Flavor', {
    XP,
    reason,
  });
  ChatMessage.create(chatData, {});
  console.log(chatContent);
}
