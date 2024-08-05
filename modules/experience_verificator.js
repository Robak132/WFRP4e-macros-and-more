class LogEntryGroup {
  constructor(name, type, expType, index, value = 0, entries = []) {
    this.name = name;
    this.type = type;
    this.expType = expType;
    this.value = value;
    this.entries = entries;
    this.index = index;
  }

  setName(name) {
    this.name = name;
    this.entries.forEach((entry) => entry.setName(name));
  }

  get color() {
    if (this.type === "spent") {
      let count = this.entries.reduce((acc, entry) => acc + Math.sign(entry.value), 0);
      let color = this.entries[0]?.link?.system?.advances?.value !== count ? "yellow" : "white";
      return this.entries.every((entry) => entry.link) ? color : "red";
    } else {
      return "white";
    }
  }

  get entriesStr() {
    return this.entries.map((entry) => entry.value).join(", ");
  }

  get length() {
    return this.entries.reduce((acc, entry) => acc + Math.sign(entry.value), 0);
  }
}

class LogEntry {
  constructor(name, value, type, actor, index = 0, spent = 0, total = 0) {
    this.value = Number(value);
    this.type = type;
    this.actor = actor;
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
    this.link = this.actor.itemTypes.skill.find((i) => i.name === this.name);
    if (this.link) {
      this.expType = "Skill";
      return;
    }
    this.link = this.actor.itemTypes.talent.find((i) => i.name === this.name);
    if (this.link) {
      this.expType = "Talent";
      return;
    }
    let template = this.fillTemplate(game.i18n.localize("LOG.CareerChange").replace("{career}", "(.*)"), name);
    this.link = this.actor.itemTypes.career.find((i) => i.name === template);
    if (this.link) {
      this.expType = "Career Change";
      return;
    }
    template = this.fillTemplate(game.i18n.localize("LOG.MemorizedSpell").replace("{name}", "(.*)"), name);
    this.link = this.actor.itemTypes.spell.find((i) => i.name === template);
    if (this.link) {
      this.expType = "Spell/Miracle";
      return;
    }
    let entry = Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === this.name);
    if (entry) {
      this.link = this.actor.system.characteristics[entry[0]];
      this.expType = "Characteristic";
      return;
    }
    this.expType = "Other";
  }

  static fromLog(obj, actor) {
    return new LogEntry(obj.reason, obj.amount, obj.type, actor, obj.index, obj.spent, obj.total);
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

const GROUP_MODES = ["Group: Time", "Group: Value", "Group: Type"];

export default class ExperienceVerificator extends FormApplication {
  constructor(actor, object = {}, options = {}) {
    super(object, options);
    const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
    this.actor = actor ?? actors[0];
    this.experience = foundry.utils.duplicate(this.actor.system.details.experience);
    this.currentMode = 0;
    this.compactMode = true;
    this.modeDesc = GROUP_MODES[this.currentMode];
    this.parseLog();
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "macro-and-more-verificator",
      template: "modules/wfrp4e-macros-and-more/templates/experience-verificator.hbs",
      title: "Experience Verificator",
      width: 800,
      height: 660
    });
  }

  splitExp(sum, length, baseExp) {
    const x = (i) => baseExp + 5 * Math.ceil(i / 5);
    const negX = (i) => -baseExp - 5 * Math.ceil(i / 5);
    let seq = [];
    let testSum = 0;
    let i = 1;

    const updateSeq = (val) => {
      seq.push(val);
      testSum += val;
      if (i >= Math.abs(length)) testSum -= seq.shift();
      i++;
    };

    if (sum > 0) {
      while (testSum < sum) updateSeq(x(i));
    } else {
      while (testSum > sum) updateSeq(negX(i));
    }

    return testSum === sum ? seq : undefined;
  }

  parseLog() {
    this.log = [];
    this.calcSpendExp = 0;
    this.calcGainedExp = 0;
    for (let entry of this.experience.log) {
      let ungrouped = this.ungroupEntry(entry);
      if (ungrouped.length === 1) {
        this.log.push(LogEntry.fromLog(ungrouped[0], this.actor));
      } else {
        this.log.push(...ungrouped.map((u) => LogEntry.fromLog(u, this.actor)));
      }
    }
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
        group = new LogEntryGroup(nameFunc(entry), entry.type, entry.expType, entry.index);
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
    switch (this.currentMode) {
      case 0:
        this.log.sort((a, b) => a.index - b.index);
        this.spentGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type === "spent"),
          (obj) => obj.name,
          (a, b) => !this.compactMode || a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.name,
          (a, b) => !this.compactMode || a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        break;
      case 1:
        this.log.sort((a, b) => a.name.localeCompare(b.name));
        this.spentGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type === "spent"),
          (obj) => obj.name,
          (a, b) => !this.compactMode || a.name !== b.name
        ).toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.name,
          (a, b) => !this.compactMode || a.name !== b.name
        ).toSorted((a, b) => b.value - a.value);
        break;
      case 2:
        this.log.sort((a, b) => a.expType.localeCompare(b.expType));
        this.spentGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type === "spent"),
          (obj) => obj.expType,
          (a, b) => !this.compactMode || a.expType !== b.expType
        ).toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.expType,
          (a, b) => !this.compactMode || a.expType !== b.expType
        ).toSorted((a, b) => b.value - a.value);
        break;
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", `button[id="group"]`, () => {
      this.currentMode = (this.currentMode + 1) % GROUP_MODES.length;
      this.modeDesc = GROUP_MODES[this.currentMode];
      this.render(true);
    });
    html.on("click", `button[id="compact"]`, () => {
      this.compactMode = !this.compactMode;
      this.render(true);
    });
    html.on("click", ".exp-row", async (ev) => {
      let index = Number($(ev.currentTarget).attr("name"));
      let name = this.log[index].name;
      let newName = await ValueDialog.create("Insert new name for the entry", "Change Entry's Name");
      if (newName && newName !== name) {
        this.log[index].setName(newName);
        this.render(true);
      }
    });
  }

  async getData(options = {}) {
    const data = super.getData();
    this.createGroupLog();

    data.modeDesc = this.modeDesc;
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
    if (this.calcGainedExp !== this.experience.total) await this.runInitialGainedExpCheck();
    let newExperienceLog = this.log
      .toSorted((a, b) => a.index - b.index)
      .map((entry) => {
        return {
          amount: entry.value,
          reason: entry.name,
          spent: entry.spent,
          total: entry.total,
          type: entry.type
        };
      });
    // this.actor.update({"system.details.experience.log": newExperienceLog});
  }

  async runInitialGainedExpCheck() {
    let firstEntry = this.log.toSorted((a, b) => a.index - b.index)[0];
    let result = await ExpValidatorDialog.create({
      title: "Initial Exp",
      confirmLabel: "Add",
      data: [
        {
          label: `No player character creation info. Do you want to add one? Found unknown exp from character creation: <strong>${
            firstEntry.total - firstEntry.value
          }</strong>`
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
    if (Number(result.starSign) !== 0) {
      this.log.unshift(new LogEntry("Character Creation: Star Sign", Number(result.starSign), "total", this.actor));
    }
    if (Number(result.attributes) !== 0) {
      this.log.unshift(new LogEntry("Character Creation: Attributes", Number(result.attributes), "total", this.actor));
    }
    if (Number(result.profession) !== 0) {
      this.log.unshift(new LogEntry("Character Creation: Profession", Number(result.profession), "total", this.actor));
    }
    if (Number(result.race) !== 0) {
      this.log.unshift(new LogEntry("Character Creation: Race", Number(result.race), "total", this.actor));
    }
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
        ignore: {
          label: cancelLabel,
          callback: () => null
        },
        fix: {
          label: confirmLabel,
          callback: (html) => {
            return new FormDataExtended(html.find("form")[0]).object;
          }
        }
      },
      default: "fix",
      close: () => null
    });
  }
}
