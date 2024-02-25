/* ==========
* MACRO: Roll Passive Talent
* VERSION: 1.0.0
* AUTHOR: Robak132
* DESCRIPTION: Allows for easier interaction with passive talents like Sixth Sense and Trapper. Uses features of GM Toolkit by Jagusti.
========== */

passive_talent_macro(
'Szósty Zmysł' /* <-- Write talent name here */,
'Intuicja'      /* <-- Write skill name here */
);

function passive_talent_macro(talent, skill) {
  const targetGroup = game.actors.filter(a => {
    return a.hasPlayerOwner && a.type !== 'vehicle' && a.itemCategories.talent.find(i => i.name === talent) !== undefined;
  }).map(g => g.uuid);

  if (targetGroup.length === 0) {
    ui.notifications.error(game.i18n.localize('MACROS-AND-MORE.Message.MakeSecretGroupTest.NoGroup'), {console: true});
    return;
  }

  const testOptions = {
    bypass: true,
    rollMode: 'blindroll',
    fallback: true,
    difficulty: 'challenging',
    testModifier: 0,
    targetGroup: targetGroup,
  };

  if (!game.user.isGM) {
    ui.notifications.error(game.i18n.localize('MACROS-AND-MORE.Message.MakeSecretGroupTest.NoPermission'));
    return;
  }

  return game.gmtoolkit.grouptest.run(skill, testOptions);
}