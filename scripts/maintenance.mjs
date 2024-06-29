import module from "../module.json" assert {type: "json"};

export default class MaintenanceWrapper extends FormApplication {
  async render () {
    let content = [];
    content.macros = await this.#buildLocalizedContent();

    await new Dialog(
      {
        title: `Maintenance`,
        content: await renderTemplate("modules/wfrp4e-macros-and-more/templates/maintenance.html", content),
        buttons: {
          update: {
            label: "Update Macros",
            callback: async () => await this.createOrUpdateDocuments()
          }
        }
      },
      {popOut: true, width: 560, height: 200 + content.macros.length * 22}
    ).render(true);
  }

  async #buildLocalizedContent () {
    const existingFolder = game.folders.find((f) => f.name === `Robak's Macros` && f.type === "Macro");
    const existingMacros = game.macros
      .filter((m) => m.folder?.id === existingFolder?.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    const compendiumMacros = await game.packs.get(`wfrp4e-macros-and-more.macros`).getDocuments();

    let contentArray = [];
    if (existingFolder) {
      for (let content of existingMacros) {
        content.existingVersion = content.flags["wfrp4e-macros-and-more"]?.version ?? "null";
        content.compendiumVersion =
          compendiumMacros.find((d) => d.id === content.id)?.flags["wfrp4e-macros-and-more"]?.version ?? "null";
        if (content.existingVersion !== content.compendiumVersion) {
          contentArray.push(content);
        }
      }
    }
    let newMacros = compendiumMacros.filter((i) => !existingMacros.some((m) => m.id === i.id));
    for (let content of newMacros) {
      content.existingVersion = "null";
      content.compendiumVersion = content.flags["wfrp4e-macros-and-more"]?.version ?? "null";
      contentArray.push(content);
    }
    return contentArray;
  }

  async createOrUpdateDocuments () {
    let documents = await game.packs.get(`${module.id}.macros`).getDocuments();
    let existingFolder = game.folders.find((f) => f.name === `Robak's Macros` && f.type === "Macro");
    if (!existingFolder) {
      existingFolder = await Folder.create({
        name: `Robak's Macros`,
        type: "Macro"
      });
    }
    let existingDocuments = documents.filter((i) => game.macros.has(i.id));
    let newDocuments = documents.filter((i) => !game.macros.has(i.id));
    this.updateFolder(newDocuments, existingFolder.id);
    this.updateFolder(existingDocuments, existingFolder.id);

    let toUpdate = [];
    for (let doc of existingDocuments) {
      if (
        game.macros.get(doc.id).flags["wfrp4e-macros-and-more"]?.version !==
        doc.flags["wfrp4e-macros-and-more"]?.version
      ) {
        toUpdate.push(doc.toObject());
      }
    }

    await Macro.updateDocuments(toUpdate, {keepId: true});
    await Macro.createDocuments(newDocuments, {keepId: true});

    ui.notifications.notify(
      `${game.i18n.format("UPDATER.Notification", {
        created: newDocuments.length,
        updated: toUpdate.length,
        name: module.id,
        version: module.version
      })}`
    );
  }

  updateFolder (documents, folderId) {
    return documents.map((d) => {
      if (!d.folder) {
        d.updateSource({folder: folderId});
      }
      return d;
    });
  }
}
