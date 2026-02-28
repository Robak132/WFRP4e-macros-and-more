export const getUpgradeItemContext = () => ({
  name: "Add Quality/Flaw",
  icon: `<i class="fas fa-angles-up"></i>`,
  condition: (header) => {
    const itemId = header?.dataset?.entryId;
    const item = game.items.get(itemId);
    return (game.user.isGM || game.user.isOwner) && item?.type && ["weapon", "armour", "trapping"].includes(item.type);
  },
  callback: async (header) => {
    const itemId = header?.dataset?.entryId;
    const item = game.items.get(itemId);
    new UpgradeItemApp(item).render(true);
  }
});

class UpgradeItemApp extends ItemProperties {
  /** @override */
  static PARTS = {
    form: {
      template: "modules/wfrp4e-macros-and-more/templates/upgrade-item.hbs",
      scrollable: [""]
    }
  };
}
