export default class MaintenanceWrapper extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "macros-and-more-maintenance",
    tag: "form",
    form: {
      handler: MaintenanceWrapper.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    position: {width: 600},
    window: {
      icon: "fas fa-gear",
      title: `Maintenance`,
      contentClasses: ["standard-form"]
    },
    actions: {
      cancel: MaintenanceWrapper.cancel,
      submit: MaintenanceWrapper.updateSelected
    }
  };

  static PARTS = {
    form: {
      template: "modules/wfrp4e-macros-and-more/templates/maintenance.hbs",
      classes: ["scrollable"]
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    context = Object.assign(context, await this.buildContent());
    context.buttons = [
      {
        type: "button",
        icon: "fa-solid fa-ban",
        label: "Cancel",
        action: "cancel"
      },
      {
        type: "button",
        icon: "fa-solid fa-code",
        label: "Update Selected",
        action: "submit"
      }
    ];
    return context;
  }

  static #resolveApp(event, fallbackThis) {
    if (fallbackThis instanceof MaintenanceWrapper) return fallbackThis;

    const appId = event?.target?.closest("[data-appid]")?.dataset?.appid;
    if (!appId) return null;
    return foundry.applications.instances.get(Number(appId));
  }

  static async cancel(event) {
    event?.preventDefault();
    event?.stopPropagation();

    const app = MaintenanceWrapper.#resolveApp(event, this);
    await app?.close();
  }

  static async updateSelected(event) {
    event?.preventDefault();
    event?.stopPropagation();

    const app = MaintenanceWrapper.#resolveApp(event, this);
    if (!app) return;

    const form = app.element?.querySelector("form");
    if (!form) return;

    if (!app.macros) app.macros = await app.buildContent();

    const formData = new FormDataExtended(form).object;
    await app._updateObject(event, formData);
  }

  hash(str) {
    const ZERO_HASH = "00000000";
    if (typeof str !== "string") return ZERO_HASH;

    const normalized = str.replaceAll("\r\n", "\n");
    if (!normalized.length) return ZERO_HASH;

    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.codePointAt(i) ?? 0;
      hash = (hash << 5) - hash + char;
      hash = Math.trunc(hash);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async _render(force, options) {
    this.folder = await this.getOrCreateFolder();
    this.macros = await this.buildContent();
    if (!this.macros.updated.length && !this.macros.added.length && !this.macros.removed.length) {
      return ui.notifications.notify("No updates needed, all macros are up to date");
    }
    options.height = 104;
    if (this.macros.updated.length) options.height += 34 + this.macros.updated.length * 27;
    if (this.macros.added.length) options.height += 34 + this.macros.added.length * 27;
    if (this.macros.removed.length) options.height += 34 + this.macros.removed.length * 27;
    await super._render(force, options);
  }

  async getData() {
    const data = super.getData();
    this.module = await fetch("modules/wfrp4e-macros-and-more/module.json").then((r) => r.json());
    Object.assign(data, this.macros);
    return data;
  }

  toArray(variable) {
    return variable == null ? [] : [variable].flat();
  }

  async _updateObject(event, formData) {
    if (!this.module) {
      this.module = await fetch("modules/wfrp4e-macros-and-more/module.json").then((r) => r.json());
    }
    if (!this.macros) {
      this.macros = await this.buildContent();
    }

    const selectedAdded = new Set(this.toArray(formData.added));
    const selectedUpdated = new Set(this.toArray(formData.updated));
    const selectedRemoved = new Set(this.toArray(formData.removed));

    const toCreate = this.macros.added.filter((entry) => selectedAdded.has(entry.compendium?._id)).map((entry) => entry.compendium);

    const toUpdate = this.macros.updated
      .filter((entry) => selectedUpdated.has(entry.compendium?._id))
      .map((entry) => ({
        _id: entry.existing._id,
        name: entry.compendium.name,
        img: entry.compendium.img,
        command: entry.compendium.command
      }));

    const toDelete = this.macros.removed
      .filter((entry) => selectedRemoved.has(entry.existing?._id))
      .map((entry) => entry.existing?._id)
      .filter(Boolean);

    const created = await Macro.createDocuments(toCreate);
    created.forEach((macro) =>
      toUpdate.push({
        _id: macro._id,
        folder: this.folder._id
      })
    );

    if (toUpdate.length) await Macro.updateDocuments(toUpdate);
    if (toDelete.length) await Macro.deleteDocuments(toDelete);

    ui.notifications.notify(
      `${game.i18n.format("UPDATER.Notification", {
        created: toCreate.length,
        updated: toUpdate.length,
        name: this.module.id
      })}`
    );

    await this.close();
  }

  getSourceId = (macro) => macro?.flags["wfrp4e-macros-and-more"]?.sourceId;

  async buildContent() {
    let macros = {};
    await this.collectExistingMacros(macros);
    macros = Object.fromEntries(Object.entries(macros).sort(([_, a], [__, b]) => this.getName(a).localeCompare(this.getName(b))));
    return this.buildContentDiff(macros);
  }

  async collectExistingMacros(macros) {
    if (!this.folder) this.folder = await this.getOrCreateFolder();

    const existing = game.macros.contents.filter((m) => !!m.flags?.["wfrp4e-macros-and-more"]);
    for (const macro of existing) {
      if (macro._source?.folder !== this.folder._id) {
        await macro.update({folder: this.folder._id});
      }
      macros[macro._id] = {existing: macro};
    }

    const pack = game.packs.get("wfrp4e-macros-and-more.macros");
    const documents = await pack.getDocuments();
    for (const macro of documents) {
      const sourceId = this.getSourceId(macro);
      const existingKey = Object.keys(macros).find((key) => this.getSourceId(macros[key].existing) === sourceId);
      if (existingKey) {
        macros[existingKey].compendium = macro;
        continue;
      }
      macros[sourceId] = {compendium: macro};
    }
  }

  buildContentDiff(macros) {
    const content = {updated: [], added: [], removed: []};

    for (const macro of Object.values(macros)) {
      if (macro.existing) macro.existing.hash = this.hash(macro.existing.command);
      if (macro.compendium) macro.compendium.hash = this.hash(macro.compendium.command);
      if (!(macro.existing?.name !== macro.compendium?.name || macro.existing?.hash !== macro.compendium?.hash)) continue;
      this.pushDiffEntry(content, macro);
    }

    return content;
  }

  pushDiffEntry(content, macro) {
    const data = {
      name: this.getName(macro),
      hash: this.getHash(macro),
      img: macro.existing?.img ?? macro.compendium?.img,
      compendium: macro.compendium,
      existing: macro.existing
    };
    if (macro.existing && macro.compendium) {
      content.updated.push(data);
      return;
    }

    if (macro.existing) {
      content.removed.push(data);
      return;
    }

    if (macro.compendium) {
      content.added.push(data);
    }
  }

  getName(macro) {
    if (!macro.existing?.name) return macro.compendium.name;
    if (!macro.compendium?.name) return macro.existing.name;
    if (macro.existing?.name === macro.compendium?.name) return macro.existing.name;
    return `${macro.existing.name} -> ${macro.compendium.name}`;
  }

  getHash(macro) {
    if (macro.existing?.hash == null) return macro.compendium?.hash;
    if (macro.compendium?.hash == null) return macro.existing?.hash;
    if (macro.existing?.hash === macro.compendium?.hash) return macro.existing?.hash;
    return `${macro.existing?.hash} -> ${macro.compendium?.hash}`;
  }

  async getOrCreateFolder() {
    let existingFolder = game.folders.find((f) => f.name === `Robak's Macros` && f.type === "Macro");
    if (!existingFolder) {
      existingFolder = await Folder.create({
        name: `Robak's Macros`,
        type: "Macro"
      });
    }
    return existingFolder;
  }
}
