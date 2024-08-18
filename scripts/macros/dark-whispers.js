/* ==========
* MACRO: Send Dark Whispers
* DESCRIPTION: Open a dialog to send a Dark Whisper (WFRP p183) to one or more selected player character(s).
* TIP: Only player-assigned or player-owned characters with Corruption can be sent a Dark Whisper.
* TIP: The placeholder whisper is drawn from the Dark Whispers table. Change this for different random whispers.
* TIP: The whisper can be edited in the dialog, regardless of what is pre-filled from the Dark Whispers table.
* TIP: Actor tokens that are targeted in a scene are pre-selected in the Send Dark Whisper dialog.
========== */

formDarkWhispers();

async function formDarkWhispers() {
  // Setup: determine group of actors to be whispered to
  const group = game.gmtoolkit.utility
    .getGroup(game.settings.get("wfrp4e-gm-toolkit", "defaultGroupDarkWhispers"))
    .filter((g) => g.type === "character");
  const targeted = game.gmtoolkit.utility
    .getGroup(game.settings.get("wfrp4e-gm-toolkit", "defaultGroupDarkWhispers"), {interaction: "targeted"})
    .filter((g) => g.type === "character");
  // Setup: exit with notice if there are no player-assigned characters
  if (!group) {
    return ui.notifications.error(game.i18n.localize("GMTOOLKIT.Message.DarkWhispers.NoEligibleCharacters"));
  }
  // Setup: exit with notice if there are no player-assigned characters with Corruption
  if (!group.some((g) => g.system?.status?.corruption?.value > 0)) {
    return ui.notifications.error(game.i18n.localize("GMTOOLKIT.Message.DarkWhispers.NoEligibleCharacters"));
  }

  // Setup dialog content
  // Build list of characters to select via dialog
  let characters = group.reduce((acc, actor) => {
    const actorId = actor?.actor?.id || actor.id;
    if (!acc.some((c) => c.actorId === actorId)) {
      acc.push({
        actorId,
        name: actor?.actor?.name || actor.name,
        corruption: actor.system?.status?.corruption,
        assignedUser: game.users.players.find((p) => p.character === actor),
        owners: game.users.players.filter((p) => p.id in actor.ownership),
        targeted: targeted.includes(actor)
      });
    }
    return acc;
  }, []);

  // Build dialog content
  let checkOptions = "";
  for (const actor of characters) {
    const canWhisperTo = actor.corruption.value
      ? `enabled title="${game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.HasCorruption")}"`
      : `disabled title="${game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.NoCorruption")}"`;
    const checked = actor.targeted && actor.corruption.value ? "checked" : "";
    const playerOwners = actor.owners.map((m) => m.name).join(", ");
    checkOptions += `
      <div class="form-group">
        <input type="checkbox" id="${actor.actorId}" name="${actor.actorId}" value="${actor.name}" ${canWhisperTo} ${checked}>
        <label for="${actor.actorId}" title="${game.i18n.format("GMTOOLKIT.Dialog.DarkWhispers.PlayerTooltip", {
          assignedUser: actor.assignedUser?.name || game.i18n.localize("GMTOOLKIT.Dialog.None"),
          playerOwners: playerOwners
        })}">
          <strong>${actor.name}</strong><br>
          (${actor.assignedUser?.name || game.i18n.localize("GMTOOLKIT.Dialog.NotAssigned")})
        </label>
        <label for="${actor.actorId}"> ${actor.corruption.value} / ${actor.corruption.max} ${game.i18n.localize("NAME.Corruption")} </label>
      </div>
    `;
  }

  const message = game.tables.getName(game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.Title"))
    ? await game.tables
        .getName(game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.Title"))
        .draw({displayChat: false})
        .then((w) => w.results[0].text)
    : "";

  new Dialog(
    {
      title: game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.Title"),
      content: `
        <div class="form-group ">
          <label for="targets">${game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.WhisperTargets")} </label>
        </div>
        ${checkOptions} 
        <div class="form-group message">
          <label for="message">${game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.WhisperMessage")}</label>
        </div>
        <div class="form-group">
          <textarea id="message" name="message" rows="4" cols="50">${message}</textarea>
        </div>
        <div class="form-group">
          <input type="checkbox" id="sendToOwners" name="sendToOwners">
          <label for="sendToOwners">${game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.SendToOwners")}</label>
        </div>`,
      buttons: {
        cancel: {
          label: game.i18n.localize("GMTOOLKIT.Dialog.Cancel"),
          callback: () => abortWhisper()
        },
        whisper: {
          label: game.i18n.localize("GMTOOLKIT.Dialog.DarkWhispers.SendWhisper"),
          callback: (html) => {
            const sendToOwners = html.find('[name="sendToOwners"]')[0].checked;
            const message = html.find('[name="message"]')[0].value;
            characters = characters.filter((c) => html.find(`[name = "${c.actorId}"]`)[0].checked);
            if (!characters.length || !message) return abortWhisper();

            let data = {
              currentUser: game.user,
              message,
              characters,
              sendToOwners
            };
            if (data.currentUser.isGM) {
              game.robakMacros.utils.acceptDarkWhispersRequest(data);
            } else {
              return game.robakMacros.utils.sendMessage("darkWhispers", data);
            }
          }
        }
      }
    },
    {width: 500}
  ).render(true);
}

function abortWhisper() {
  return ui.notifications.warn(
    game.i18n.format("GMTOOLKIT.Message.DarkWhispers.WhisperAborted", {currentUser: game.user.name}),
    {console: false}
  );
}
