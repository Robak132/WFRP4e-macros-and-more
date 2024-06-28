import {Utility} from "./utility.mjs";

export default class MaintenanceWrapper extends FormApplication {
  async render() {
    let content = [];
    content.macros = await this.#buildLocalizedContent(game.macros);

    await new Dialog({
      title: `Maintenance`,
      content: await renderTemplate("modules/wfrp4e-macros-and-more/templates/maintenance.html", content), buttons: {
        macros: {
          label: "Update Macros", callback: async () => {
            // Delete macros
            await Macro.deleteDocuments(game.macros.filter(m => m.folder?.name === `Robak's Macros`).map(m => m.id));
            // Delete Macro folder
            await Folder.deleteDocuments(
                game.folders.filter(f => f.name === `Robak's Macros` && f.type === "Macro").map(f => f.id));

            // Import macros from compendium
            Utility.log(await game.packs.get(`wfrp4e-macros-and-more.macros`).importAll({
              folderName: `Robak's Macros`, options: {keepId: true},
            }));
          },
        },
      },
    }, {
      popOut: true, width: 560, resizable: true,
    }).render(true);
  }

  async #buildLocalizedContent(documentType) {
    const toolkitContent = documentType.filter(m => m.folder?.name === `Robak's Macros`).
        sort((a, b) => a.name.localeCompare(b.name));
    let pack = game.packs.get(`wfrp4e-macros-and-more.macros`);
    let documents = await pack.getDocuments();
    let contentArray = [];

    for (const content of toolkitContent) {
      content.compendiumVersion = documents.
          filter(d => d.name === content.name).
          map(i => i.flags["wfrp4e-macros-and-more"]?.version ?? "null");
      contentArray.push(content);
    }
    return contentArray;
  }
}