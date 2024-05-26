const localiseType = type => game.i18n.localize(`TYPES.Item.${type}`);

const getDefaultIcon = type => {
  switch (type) {
    case "career":
    case "critical":
    case "extendedTest":
      return null
    case "ammunition":
    case "container":
    case "trapping":
    case "weapon":
    case "money":
    case "cargo":
    case "vehicleMod":
      return `modules/wfrp4e-core/icons/equipment/trapping.png`
    case "armour":
      return `modules/wfrp4e-core/icons/armour/armour.png`
    case "injury":
      return `modules/wfrp4e-core/icons/injuries/injury.png`
    case "psychology":
      return `modules/wfrp4e-core/icons/psychologies/psychology.png`
    case "disease":
    case "prayer":
    case "skill":
    case "talent":
    case "spell":
    case "trait":
    case "mutation":
      return `modules/wfrp4e-core/icons/${type}s/${type}.png`
  }
}

const hasDefaultIcon = item => {
  if (item.type === "weapon" && (item.img === "modules/wfrp4e-core/icons/equipment/melee-weapon.png" || "modules/wfrp4e-core/icons/equipment/ranged-weapon.png")) {
    return true
  }
  return item.img === getDefaultIcon(item.type);
}

export async function addContextOptions(html, options) {
  options.push({
    name: game.i18n.localize("MACROS-AND-MORE.ChangeItemType"),
    icon: `<i class="far fa-exchange"></i>`,
    condition: () => game.user.isGM || game.user.isOwner,
    callback: async (header) => {
      const itemId = header.data("document-id");
      let item = game.items.get(itemId);
      const originalTypeLocalised = localiseType(item.type);
      const options = game.system.template.Item.types.filter(t => t !== item.type).
        sort((a, b) => localiseType(a).localeCompare(localiseType(b))).
        map(t => `<option value="${t}">${localiseType(t)}</option>`);

      await new Dialog({
        title: game.i18n.localize("MACROS-AND-MORE.ChangeItemType"),
        content: `<form>
          <div class="form-group">
            <p style="flex: 1" class="section-title">${originalTypeLocalised}</p>
            <span style="flex: 1;text-align: center">&#8594;</span>
            <select style="flex: 1" name="convert-type">
              ${options}
            </select>
          </div>
        </form>`,
        buttons: {
          no: {
            icon: `<i class="fas fa-times"></i>`,
            label: "Cancel",
          },
          yes: {
            icon: `<i class="fas fa-check"></i>`,
            label: "Confirm",
            callback: async (html) => {
              let convertType = html.find('[name="convert-type"]').val();
              if (hasDefaultIcon(item)) {
                item.img = getDefaultIcon(convertType) ?? item.img
              }
              await item.update({type: convertType, img: item.img});
            },
          },
        },
        default: "yes",
      }).render(true);
    },
  });
}