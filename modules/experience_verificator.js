class LogEntryGroup {
  constructor(name, type, category, index = undefined, value = 0, entries = []) {
    this.name = name;
    this.type = type;
    this.category = category;
    this.value = value;
    this.entries = entries;
    this.index = index;
  }

  setName(name) {
    this.name = name;
    this.entries.forEach((entry) => entry.setName(name));
  }

  get color() {
    // Gained exp is always white
    if (this.type === "total") return "white";
    if (this.category === "Unknown") return "orangered";

    let color = "white";
    if (ExperienceVerificator.groupMode === 1 && ExperienceVerificator.compactMode) {
      let count = this.entries.reduce((acc, entry) => acc + Math.sign(entry.value), 0);
      color = this.getEntryValueCount() === count ? color : "yellow";
    }
    return color;
  }

  getEntryValueCount() {
    switch (this.category) {
      case "Skill":
        return ExperienceVerificator.actor.itemTypes.skill.find((i) => i.name === this.name)?.system?.advances?.value;
      case "Talent":
        return ExperienceVerificator.actor.itemTypes.talent.filter((i) => i.name === this.name).length;
      case "Characteristic":
        let [char, _] = Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === this.name);
        return ExperienceVerificator.actor.system.characteristics[char].advances;
      default:
        return 1;
    }
  }

  get entriesStr() {
    return this.entries.map((entry) => entry.value).join(", ");
  }

  get tooltip() {
    let count = this.entries.reduce((acc, entry) => acc + Math.sign(entry.value), 0);
    let entryCount = this.getEntryValueCount();
    if (ExperienceVerificator.groupMode === 1 && entryCount !== count) {
      if (entryCount !== count) {
        return `Warning: Entry count does not match the expected value.\nRequired: ${entryCount}\nFound: ${count}`;
      }
    }

    if (ExperienceVerificator.groupMode !== 2 || this.entries.length === 1) return null;
    const uniqueNames = new Set(this.entries.map((entry) => entry.name));
    return Array.from(uniqueNames).join("\n");
  }

  get length() {
    return this.entries.reduce((acc, entry) => acc + sign(entry.value), 0);
  }
}

class LogEntry {
  constructor(name, value, type, category, index = 0, spent = 0, total = 0) {
    this.value = Number(value);
    this.type = type;
    this.category = category;
    this.spent = spent;
    this.total = total;
    this.index = index;

    this.setName(name);
  }

  fillTemplate(template, str) {
    const regex = new RegExp(`^${template}$`);
    const match = str.match(regex);
    return match ? match[1] : undefined;
  }

  setName(name) {
    this.name = name;
    if (ExperienceVerificator.actor.itemTypes.skill.find((i) => i.name === this.name)) {
      this.category = "Skill";
      return;
    }
    if (ExperienceVerificator.actor.itemTypes.talent.find((i) => i.name === this.name)) {
      this.category = "Talent";
      return;
    }
    let template = this.fillTemplate(game.i18n.localize("LOG.CareerChange").replace("{career}", "(.*)"), name);
    if (ExperienceVerificator.actor.itemTypes.career.find((i) => i.name === template)) {
      this.category = "Career Change";
      return;
    }
    template = this.fillTemplate(game.i18n.localize("LOG.MemorizedSpell").replace("{name}", "(.*)"), name);
    if (ExperienceVerificator.actor.itemTypes.spell.find((i) => i.name === template)) {
      this.category = "Spell/Miracle";
      return;
    }
    if (Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === this.name)) {
      this.category = "Characteristic";
      return;
    }
    if (this.type === "total") {
      this.category ??= "EXP Gain";
    } else {
      this.category ??= "Unknown";
    }
  }

  static fromLog(obj) {
    return new LogEntry(obj.reason, obj.amount, obj.type, obj.category, obj.index, obj.spent, obj.total);
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

const GROUP_MODES = ["Group: Time", "Group: Value", "Group: Category"];
const COMPACT_MODES = ["Compact: On", "Compact: Off"];
const VIEW_MODES = ["Mode: View", "Mode: Edit"];

export default class ExperienceVerificator extends FormApplication {
  static groupMode = 0;
  static compactMode = true;
  static editMode = false;
  static actor;

  constructor(actor, object = {}, options = {}) {
    super(object, options);
    const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
    ExperienceVerificator.actor = actor ?? actors[1];
    this.experience = foundry.utils.duplicate(ExperienceVerificator.actor.system.details.experience);
    this.parseLog();
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "macro-and-more-verificator",
      template: "modules/wfrp4e-macros-and-more/templates/experience-verificator.hbs",
      width: 800,
      height: 660
    });
  }

  splitExp(sum, length, baseExp) {
    const x = (i) => baseExp + 5 * Math.ceil(i / 5);
    let absLength = Math.abs(length);
    let absSum = Math.abs(sum);
    let seq = [];
    let testSum = 0;
    let i = 1;

    while (testSum < absSum) {
      seq.push(x(i));
      testSum += x(i);
      if (i > absLength) {
        testSum -= seq.shift();
      }
      i++;
    }

    if (sum < 0 && length < 0) {
      seq = seq.map((val) => -val);
    }

    return testSum === absSum ? seq : undefined;
  }

  parseLog() {
    this.log = [];
    for (let entry of this.experience.log) {
      let ungrouped = this.ungroupEntry(entry);
      if (ungrouped.length === 1) {
        this.log.push(LogEntry.fromLog(ungrouped[0]));
      } else {
        this.log.push(...ungrouped.map((u) => LogEntry.fromLog(u)));
      }
    }
    this.refreshCalculatedStats();
  }

  refreshCalculatedStats() {
    this.calcSpendExp = 0;
    this.calcGainedExp = 0;
    this.log.forEach((entry, index) => {
      entry.index = index;
      if (entry.type === "spent") {
        this.calcSpendExp += entry.value;
      } else {
        this.calcGainedExp += entry.value;
      }
      entry.calcSpent = this.calcSpendExp;
      entry.calcTotal = this.calcGainedExp;
    });
  }

  groupLogBy(log, nameFunc, condition) {
    if (log.length === 0) return [];
    let groupLog = [];
    let group = null;
    for (let entry of log) {
      if (!group || condition(entry, group)) {
        if (group) groupLog.push(group);
        group = new LogEntryGroup(nameFunc(entry), entry.type, entry.category, entry.index);
      }
      group.value += entry.value;
      group.entries.push(entry);
    }
    if (group) groupLog.push(group);
    return groupLog;
  }

  ungroupEntry(entry) {
    let stack = [];
    for (let i = entry.reason.length - 1; i >= 0; i--) {
      if (entry.reason[i] === ")") {
        stack.push(i);
      } else if (entry.reason[i] === "(" && stack.length) {
        let j = stack.pop();
        let length = Number(entry.reason.substring(i + 1, j));
        if (!length) {
          return [entry];
        }
        let baseExp = Object.values(game.wfrp4e.config.characteristics).find((value) => value === this.name) ? 20 : 5;
        let ungrouped = this.splitExp(entry.amount, length, baseExp);
        if (!ungrouped) {
          return [entry];
        }
        return ungrouped.map((v) => {
          let duplicatedEntry = foundry.utils.duplicate(entry);
          duplicatedEntry.amount = v;
          duplicatedEntry.reason = entry.reason.substring(0, i - 1);
          return duplicatedEntry;
        });
      }
    }
    return [entry];
  }

  createGroupLog() {
    let spentLog = this.log.filter((entry) => entry.type === "spent");
    let gainedLog = this.log.filter((entry) => entry.type !== "spent");
    switch (ExperienceVerificator.groupMode) {
      case 0:
        this.spentGroupLog = this.groupLogBy(
          spentLog,
          (obj) => obj.name,
          (a, b) => !ExperienceVerificator.compactMode || a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        this.gainedGroupLog = this.groupLogBy(
          gainedLog,
          (obj) => obj.name,
          (a, b) => !ExperienceVerificator.compactMode || a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        break;
      case 1:
        let spentGroupLog = this.groupLogBy(
          spentLog.toSorted((a, b) => a.name.localeCompare(b.name)),
          (obj) => obj.name,
          (a, b) => !ExperienceVerificator.compactMode || a.name !== b.name
        );
        for (let skill of ExperienceVerificator.actor.itemTypes.skill) {
          if (skill.system.advances.value !== 0 && !spentGroupLog.some((entry) => entry.name === skill.name)) {
            spentGroupLog.push(new LogEntryGroup(skill.name, "spent", "Skill"));
          }
        }
        this.spentGroupLog = spentGroupLog.toSorted((a, b) => b.index - a.index).toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          gainedLog.toSorted((a, b) => a.name.localeCompare(b.name)),
          (obj) => obj.name,
          (a, b) => !ExperienceVerificator.compactMode || a.name !== b.name
        )
          .toSorted((a, b) => b.index - a.index)
          .toSorted((a, b) => b.value - a.value);
        break;
      case 2:
        this.spentGroupLog = this.groupLogBy(
          spentLog.toSorted((a, b) => a.category.localeCompare(b.category)),
          (obj) => obj.category,
          (a, b) => !ExperienceVerificator.compactMode || a.category !== b.category
        )
          .toSorted((a, b) => b.index - a.index)
          .toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          gainedLog.toSorted((a, b) => a.category.localeCompare(b.category)),
          (obj) => obj.category,
          (a, b) => !ExperienceVerificator.compactMode || a.category !== b.category
        )
          .toSorted((a, b) => b.index - a.index)
          .toSorted((a, b) => b.value - a.value);
        break;
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", `button[id="group"]`, () => {
      ExperienceVerificator.groupMode = (ExperienceVerificator.groupMode + 1) % GROUP_MODES.length;
      this.render(true);
    });
    html.on("click", `button[id="compact"]`, () => {
      ExperienceVerificator.compactMode = !ExperienceVerificator.compactMode;
      this.render(true);
    });
    html.on("click", `button[id="edit"]`, () => {
      if (!game.user.isGM)
        return ui.notifications.warn("You don't have permission to edit this actor's experience log.");
      ExperienceVerificator.editMode = !ExperienceVerificator.editMode;
      this.render(true);
    });
    html.on("click", ".exp-row", async (ev) => {
      ev.preventDefault();
      if (!ExperienceVerificator.editMode) return;
      let index = Number($(ev.currentTarget).attr("name"));
      let name = this.log[index].name;
      let newName = await ValueDialog.create("Insert new name for the entry", "Change Entry's Name", name);
      if (newName && newName !== name) {
        this.log[index].setName(newName);
        this.render(true);
      }
    });
    html.on("contextmenu", ".exp-row", async (ev) => {
      ev.preventDefault();
      if (!ExperienceVerificator.editMode) return;
      let index = Number($(ev.currentTarget).attr("name"));
      let name = this.log[index].name;
      let confirm = await Dialog.confirm({
        title: "Delete Entry",
        content: `<div class="form-group"><label>Are you sure you want to delete: ${name}?</label></div>`
      });
      if (confirm) {
        this.log = this.log.filter((entry) => entry.index !== index);
        this.refreshCalculatedStats();
        this.render(true);
      }
    });
  }

  async getData(options = {}) {
    const data = super.getData();
    this.createGroupLog();
    options.title = `Experience Verificator: ${ExperienceVerificator.actor.name}`;

    data.groupModeDesc = GROUP_MODES[ExperienceVerificator.groupMode];
    data.compactModeDesc = ExperienceVerificator.compactMode ? COMPACT_MODES[0] : COMPACT_MODES[1];
    data.editModeDesc = ExperienceVerificator.editMode ? VIEW_MODES[1] : VIEW_MODES[0];
    data.gainedLog = this.gainedGroupLog;
    data.spentLog = this.spentGroupLog;
    data.experienceSpentCalculated = this.calcSpendExp;
    data.experienceGainedCalculated = this.calcGainedExp;
    data.experienceSpent = this.experience.spent;
    data.experienceGained = this.experience.total;
    return data;
  }

  async _updateObject(event, formData) {
    switch (event.submitter.id) {
      case "close":
        return;
      case "confirm":
        return await this.save();
    }
  }

  async save() {
    if (!game.user.isGM) return;
    if (this.calcGainedExp !== this.experience.total) await this.runInitialGainedExpCheck();
    let newExperienceLog = this.log
      .toSorted((a, b) => a.index - b.index)
      .map((entry) => {
        return {
          amount: entry.value,
          reason: entry.name,
          category: entry.category,
          spent: entry.spent,
          total: entry.total,
          type: entry.type
        };
      });
    ExperienceVerificator.actor.update({"system.details.experience.log": newExperienceLog});
  }

  async runInitialGainedExpCheck() {
    let result = await ExpValidatorDialog.create({
      title: "Verification Error",
      confirmLabel: "Add",
      data: [
        {
          label: `No player character creation info. Do you want to add one? Found unknown exp: <strong>${this.experience.total - this.calcGainedExp}</strong>`
        },
        {
          id: "race",
          label: "Race Selection:",
          type: "select",
          values: [
            {name: "Random [20]", value: 20},
            {name: "Chosen [0]", value: 0, selected: true}
          ]
        },
        {
          id: "profession",
          label: "Profession Selection:",
          type: "select",
          values: [
            {name: "Random (First Choice) [50]", value: 50},
            {name: "Random (Choice from 3) [25]", value: 25},
            {name: "Chosen [0]", value: 0, selected: true}
          ]
        },
        {
          id: "attributes",
          label: "Attribute Selection:",
          type: "select",
          values: [
            {name: "Random [50]", value: 50},
            {name: "Random (Reordered) [25]", value: 25},
            {name: "Re-roll or Point-Buy [0]", value: 0, selected: true}
          ]
        },
        {
          label: "Star Sign Selection:",
          id: "starSign",
          type: "select",
          values: [
            {name: "Random [25]", value: 25},
            {name: "Chosen [0]", value: 0, selected: true}
          ]
        }
      ]
    });
    if (!result) return;
    this.log.unshift(
      new LogEntry("Character Creation: Star Sign", Number(result.starSign), "total", "Character Creation")
    );
    this.log.unshift(
      new LogEntry("Character Creation: Attributes", Number(result.attributes), "total", "Character Creation")
    );
    this.log.unshift(
      new LogEntry("Character Creation: Profession", Number(result.profession), "total", "Character Creation")
    );
    this.log.unshift(new LogEntry("Character Creation: Race", Number(result.race), "total", "Character Creation"));
    this.log.forEach((entry, index) => (entry.index = index));
  }
}

export class ExpValidatorDialog extends Dialog {
  static createInput(index, field) {
    let style = field.type !== "label" ? `style="width: 50%"` : "";
    let content = `<div class="form-group"><label ${style}>${field.label}</label>`;
    const fieldId = field?.id ?? "field-" + index;
    switch (field.type) {
      case "input":
        content += `<input ${style} id="${fieldId}" name="${fieldId}" type="${
          field.inputType ?? "text"
        }" value="${field.value}" />`;
        break;
      case "select":
        content += `<select ${style} id="${fieldId}" name="${fieldId}">${field.values
          .map((e) => `<option value="${e.value}" ${e.selected ? "selected" : ""}>${e.name}</option>`)
          .join("")}</select>`;
        break;
    }
    content += `</div>`;
    return content;
  }

  static create({title, data = [], confirmLabel = "Fix", cancelLabel = "Ignore"}) {
    return Dialog.wait({
      title: `Experience Validator: ${title}`,
      content: `<form>${data.map((field, index) => this.createInput(index, field)).join("")}</form>`,
      buttons: {
        confirm: {
          label: confirmLabel,
          callback: (html) => new FormDataExtended(html.find("form")[0]).object
        },
        ignore: {
          label: cancelLabel,
          callback: () => null
        }
      },
      default: "confirm",
      close: () => null
    });
  }
}
