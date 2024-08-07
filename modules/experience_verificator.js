class LogEntryGroup {
  constructor(parent, name, type, category, index = undefined, entries = []) {
    this.parent = parent;
    this.name = name;
    this.type = type;
    this.category = category;
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
    if (this.parent.groupMode === 1 && this.parent.compactMode) {
      color = this.entryValueCount === this.count ? color : "yellow";
    }
    return color;
  }

  get value() {
    if (!this.entries.length) return null;
    return this.entries.reduce((acc, entry) => acc + entry.value, 0);
  }

  get count() {
    return this.entries.reduce((acc, entry) => acc + sign(entry.value), 0);
  }

  get entryValueCount() {
    switch (this.category) {
      case "Skill":
        return this.parent.actor.itemTypes.skill.find((i) => i.name === this.name)?.system?.advances?.value;
      case "Talent":
        return this.parent.actor.itemTypes.talent.filter((i) => i.name === this.name).length;
      case "Characteristic":
        let entry = Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === this.name);
        if (!entry) return 1;
        return this.parent.actor.system.characteristics[entry[0]].advances;
      default:
        return 1;
    }
  }

  get entriesStr() {
    return this.entries.map((entry) => entry.value).join(", ");
  }

  get tooltip() {
    let entryCount = this.entryValueCount;
    if (this.parent.groupMode === 1 && entryCount !== this.count) {
      return `Warning: Entry count does not match the expected value.\nRequired: ${entryCount}\nFound: ${this.count}`;
    }

    if (this.parent.groupMode !== 2 || this.entries.length === 1) return null;
    const uniqueNames = new Set(this.entries.map((entry) => entry.name));
    return Array.from(uniqueNames).join("\n");
  }
}

class LogEntry {
  constructor(parent, name, value, type, category, id = undefined, index = 0, spent = 0, total = 0) {
    this.parent = parent;
    this.value = Number(value);
    this.type = type;
    this.category = category;
    this.id = id;
    this.index = index;
    this.spent = spent;
    this.total = total;

    this.setName(name);
  }

  matchTemplate(template, str) {
    const regex = new RegExp(`^${template}$`);
    const match = str.match(regex);
    return match ? match[1] : undefined;
  }

  setName(name) {
    this.name = name;
    this.category = this.getCategory(name);
  }

  getCategory(name) {
    const {skill, talent, career, spell} = this.parent.actor.itemTypes;

    if (skill.find((i) => i.name === this.name)) return "Skill";
    if (talent.find((i) => i.name === this.name)) return "Talent";
    const careerTemplate = this.matchTemplate(game.i18n.localize("LOG.CareerChange").replace("{career}", "(.*)"), name);
    if (career.find((i) => i.name === careerTemplate)) return "Career Change";
    const spellTemplate = this.matchTemplate(game.i18n.localize("LOG.MemorizedSpell").replace("{name}", "(.*)"), name);
    if (spell.find((i) => i.name === spellTemplate)) return "Spell/Miracle";
    if (Object.values(game.wfrp4e.config.characteristics).includes(this.name)) return "Characteristic";

    return this.type === "total" ? this.category || "EXP Gain" : this.category || "Unknown";
  }

  static fromLog(parent, obj) {
    return new LogEntry(
      parent,
      obj.reason,
      obj.amount,
      obj.type,
      obj.category,
      obj.id,
      obj.index,
      obj.spent,
      obj.total
    );
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

export default class ExperienceVerificator extends FormApplication {
  static GROUP_MODES = ["Group: Time", "Group: Value", "Group: Category"];
  static COMPACT_MODES = ["Compact: On", "Compact: Off"];
  static VIEW_MODES = ["Mode: View", "Mode: Edit"];

  constructor(actor, object = {}, options = {}) {
    super(object, options);
    this.groupMode = 0;
    this.compactMode = true;
    this.editMode = false;
    if (!actor) {
      const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
      actor = actors[1];
    }
    this.init(actor);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "macro-and-more-verificator",
      template: "modules/wfrp4e-macros-and-more/templates/experience-verificator.hbs",
      width: 800,
      height: 660
    });
  }

  init(actor) {
    this.actor = actor;
    this.experience = foundry.utils.duplicate(this.actor.system.details.experience);
    this.parseLog();
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
      console.log(ungrouped);
      if (ungrouped.length === 1) {
        this.log.push(LogEntry.fromLog(this, ungrouped[0]));
      } else {
        this.log.push(...ungrouped.map((u) => LogEntry.fromLog(this, u)));
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
        group = new LogEntryGroup(this, nameFunc(entry), entry.type, entry.category, entry.index);
      }
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

  createGroupLog(log, groupMode) {
    let groupCondition;
    let nameFunc = (obj) => obj.name;
    let sortCondition;
    switch (groupMode) {
      case 0:
        groupCondition = (a, b) => !this.compactMode || a.name !== b.name || sign(a.value) !== sign(b.value);
        sortCondition = (obj) => obj.toSorted((a, b) => b.index - a.index);
        break;
      case 1:
        log = log.toSorted((a, b) => a.name.localeCompare(b.name));
        groupCondition = (a, b) => !this.compactMode || a.name !== b.name;
        sortCondition = (obj) => obj.toSorted((a, b) => b.index - a.index).toSorted((a, b) => b.value - a.value);
        break;
      case 2:
        log = log.toSorted((a, b) => a.category.localeCompare(b.category));
        nameFunc = (obj) => obj.category;
        groupCondition = (a, b) => !this.compactMode || a.category !== b.category;
        sortCondition = (obj) => obj.toSorted((a, b) => b.index - a.index).toSorted((a, b) => b.value - a.value);
        break;
    }
    return sortCondition(this.groupLogBy(log, nameFunc, groupCondition));
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", `button[id="prev"]`, async () => {
      await this.save();
      const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
      const index = actors.findIndex((a) => a.name === this.actor.name);
      this.init(actors[(index - 1 + actors.length) % actors.length]);
      this.render(true);
    });
    html.on("click", `button[id="next"]`, async () => {
      await this.save();
      const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
      const index = actors.findIndex((a) => a.name === this.actor.name);
      this.init(actors[(index + 1) % actors.length]);
      this.render(true);
    });
    html.on("click", `button[id="confirm"]`, async () => {
      await this.save();
      await this.close();
    });
    html.on("click", `button[id="group"]`, () => {
      this.groupMode = (this.groupMode + 1) % ExperienceVerificator.GROUP_MODES.length;
      this.render(true);
    });
    html.on("click", `button[id="compact"]`, () => {
      this.compactMode = !this.compactMode;
      this.render(true);
    });
    html.on("click", `button[id="edit"]`, () => {
      if (!game.user.isGM)
        return ui.notifications.warn("You don't have permission to edit this actor's experience log.");
      this.editMode = !this.editMode;
      this.render(true);
    });
    html.on("click", ".exp-row", async (ev) => {
      ev.preventDefault();
      if (!this.editMode) return;
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
      if (!this.editMode) return;
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
    let gainedLog = this.log.filter((entry) => entry.type !== "spent");
    let spentLog = this.log.filter((entry) => entry.type === "spent");

    this.gainedGroupLog = this.createGroupLog(gainedLog, this.groupMode);
    this.spentGroupLog = this.createGroupLog(spentLog, this.groupMode);
    for (let skill of this.actor.itemTypes.skill) {
      if (skill.system.advances.value !== 0 && !this.spentGroupLog.some((entry) => entry.name === skill.name)) {
        this.spentGroupLog.push(new LogEntryGroup(this, skill.name, "spent", "Skill"));
      }
    }
    for (let talent of this.actor.itemTypes.talent) {
      if (!this.spentGroupLog.some((entry) => entry.name === talent.name)) {
        this.spentGroupLog.push(new LogEntryGroup(this, talent.name, "spent", "Talent"));
      }
    }
    for (let spell of this.actor.itemTypes.spell) {
      let formattedName = game.i18n.format("LOG.MemorizedSpell", {name: spell.name});
      if (
        (spell.system.memorized.value || spell.system.lore.value === "petty") &&
        !this.spentGroupLog.some((entry) => entry.name === formattedName)
      ) {
        this.spentGroupLog.push(new LogEntryGroup(this, formattedName, "spent", "Spell/Miracle"));
      }
    }
    for (let career of this.actor.itemTypes.career) {
      let formattedName = game.i18n.format("LOG.CareerChange", {career: career.name});
      if (!this.spentGroupLog.some((entry) => entry.name === formattedName)) {
        this.spentGroupLog.push(new LogEntryGroup(this, formattedName, "spent", "Career Change"));
      }
    }
    this.spentGroupLog = this.spentGroupLog.filter((entry) => entry.value != null);

    options.title = `Experience Verificator: ${this.actor.name}`;

    data.groupModeDesc = ExperienceVerificator.GROUP_MODES[this.groupMode];
    data.compactModeDesc = this.compactMode
      ? ExperienceVerificator.COMPACT_MODES[0]
      : ExperienceVerificator.COMPACT_MODES[1];
    data.editModeDesc = this.editMode ? ExperienceVerificator.VIEW_MODES[1] : ExperienceVerificator.VIEW_MODES[0];
    data.gainedLog = this.gainedGroupLog;
    data.spentLog = this.spentGroupLog;
    data.experienceSpentCalculated = this.calcSpendExp;
    data.experienceGainedCalculated = this.calcGainedExp;
    data.experienceSpent = this.experience.spent;
    data.experienceGained = this.experience.total;
    return data;
  }

  async save() {
    if (!game.user.isGM) return;
    await this.runInitialSkillsCheck();
    await this.runInitialGainedExpCheck();
    let newExperienceLog = this.log
      .toSorted((a, b) => a.index - b.index)
      .map((entry) => {
        return {
          id: entry.id,
          amount: entry.value,
          reason: entry.name,
          category: entry.category,
          spent: entry.spent,
          total: entry.total,
          type: entry.type
        };
      });
    this.actor.update({"system.details.experience.log": newExperienceLog});
  }

  async runInitialGainedExpCheck() {
    let raceEntry = this.log.find((entry) => entry.id === "char-gen-exp-race");
    let professionEntry = this.log.find((entry) => entry.id === "char-gen-exp-profession");
    let attributesEntry = this.log.find((entry) => entry.id === "char-gen-exp-attributes");
    let starSignEntry = this.log.find((entry) => entry.id === "char-gen-exp-star-sign");
    if (raceEntry && professionEntry && attributesEntry && starSignEntry) return;

    let result = await ExpValidatorDialog.create({
      title: "Verification Error: Character Creation EXP",
      confirmLabel: "Add",
      data: [
        {
          label: `No player character creation info. Do you want to add one? Found unknown exp: <strong>${this.experience.total - this.calcGainedExp}</strong>`
        },
        {
          id: "race",
          label: "Race Selection:",
          type: "select",
          selected: raceEntry?.value,
          values: [
            {name: "Chosen [0]", value: 0},
            {name: "Random [20]", value: 20}
          ]
        },
        {
          id: "profession",
          label: "Profession Selection:",
          type: "select",
          selected: professionEntry?.value,
          values: [
            {name: "Chosen [0]", value: 0},
            {name: "Random (Choice from 3) [25]", value: 25},
            {name: "Random (First Choice) [50]", value: 50}
          ]
        },
        {
          id: "attributes",
          label: "Attribute Selection:",
          type: "select",
          selected: attributesEntry?.value,
          values: [
            {name: "Re-roll or Point-Buy [0]", value: 0},
            {name: "Random (Reordered) [25]", value: 25},
            {name: "Random [50]", value: 50}
          ]
        },
        {
          label: "Star Sign Selection:",
          id: "starSign",
          type: "select",
          selected: starSignEntry?.value,
          values: [
            {name: "Chosen [0]", value: 0},
            {name: "Random [25]", value: 25}
          ]
        }
      ]
    });
    if (!result) return;
    this.log = this.log.filter((entry) => !entry.id || !entry.id.startsWith("char-gen-exp"));
    this.log.unshift(
      new LogEntry(
        this,
        "Character Creation: Star Sign",
        result.starSign,
        "total",
        "Character Creation",
        "char-gen-exp-star-sign"
      )
    );
    this.log.unshift(
      new LogEntry(
        this,
        "Character Creation: Attributes",
        result.attributes,
        "total",
        "Character Creation",
        "char-gen-exp-attributes"
      )
    );
    this.log.unshift(
      new LogEntry(
        this,
        "Character Creation: Profession",
        result.profession,
        "total",
        "Character Creation",
        "char-gen-exp-profession"
      )
    );
    this.log.unshift(
      new LogEntry(
        this,
        "Character Creation: Race",
        Number(result.race),
        "total",
        "Character Creation",
        "char-gen-exp-race"
      )
    );
    this.log.forEach((entry, index) => (entry.index = index));
  }

  async runInitialSkillsCheck() {
    if (this.log.filter((entry) => entry.id === "char-gen-race-skill").length === 3 * 3 + 3 * 5) return;
    this.log = this.log.filter((entry) => entry.id !== "char-gen-race-skill");

    let species = this.actor.details.species;
    let {skills} = game.wfrp4e.utility.speciesSkillsTalents(species.value, species.subspecies);

    let carrerSkills = this.actor.itemTypes.career.toSorted((a, b) => b.sort - a.sort)[0].system.skills;

    let spentLog = this.log.filter((e) => e.type === "spent");
    let logSkills = this.createGroupLog(spentLog, 1).filter(
      (e) => e.category === "Skill" && e.entryValueCount !== e.count
    );

    for (let skill of this.actor.itemTypes.skill.filter((s) => s.system.advances.value !== 0)) {
      if (!this.log.find((s) => s.name === skill.name)) {
        logSkills.push(new LogEntryGroup(this, skill.name, "spent", "Skill"));
      }
    }
    logSkills = logSkills
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .toSorted((a, b) => a.entryValueCount - a.count - b.entryValueCount + b.count);
    let formattedLogSkills = logSkills.map((s) => {
      let text = `${s.name} (${s.entryValueCount})`;
      if (skills.includes(s.name)) return `<span style="color: limegreen">${text}</span>`;
      if (carrerSkills.includes(s.name)) return `<span style="color: yellow">${text}</span>`;
      return text;
    });

    let result = await ExpValidatorDialog.create({
      title: "Verification Error: Race Skills",
      confirmLabel: "Add",
      data: [
        {
          label: `No race skills info. Do you want to add one?`
        },
        {
          label: `<strong>Experience log contains unmatched skills:</strong><br>${formattedLogSkills.join(", ")}`
        },
        {
          label: `<span style="color: limegreen"><strong>Your race has those skills as racial:</strong></span><br>${skills.join(", ")}`
        },
        {
          label: `<span style="color: yellow"><strong>Your first career has those skills:</strong></span><br>${carrerSkills.join(", ")}`
        },
        ...Array(3)
          .fill()
          .map((_) => ({
            label: "Race Skill (3):",
            type: "select",
            values: logSkills.map((s) => ({
              name: `${s.name} (${s.entryValueCount - s.count})`,
              value: s.name
            }))
          })),
        ...Array(3)
          .fill()
          .map((_) => ({
            label: "Race Skill (5):",
            type: "select",
            values: logSkills.map((s) => ({
              name: `${s.name} (${s.entryValueCount - s.count})`,
              value: s.name
            }))
          }))
      ]
    });
    if (!result) return;
    Object.values(result).forEach((value, i) => {
      let max = i < 3 ? 3 : 5;
      for (let j = 0; j < max; j++) {
        this.log.unshift(new LogEntry(this, value, 0, "spent", "Skill", "char-gen-race-skill"));
      }
    });
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
        let type = field.inputType ?? "text";
        content += `<input ${style} id="${fieldId}" name="${fieldId}" type="${type}" value="${field.value}" />`;
        break;
      case "select":
        let options = field.values.map((e) => {
          let selected = field.selected === e.value ? "selected" : "";
          return `<option value="${e.value ?? e.name}" ${selected}>${e.name}</option>`;
        });
        content += `<select ${style} id="${fieldId}" name="${fieldId}">${options.join("")}</select>`;
        break;
    }
    content += `</div>`;
    return content;
  }

  static create({title, data = [], confirmLabel = "Fix", cancelLabel = "Ignore"}) {
    return Dialog.wait({
      title: title,
      content: `<form>${data.map((field, index) => this.createInput(index, field)).join("")}</form>`,
      buttons: {
        confirm: {
          label: confirmLabel,
          callback: (html) => {
            let dataObject = new FormDataExtended(html.find("form")[0]).object;
            return Object.fromEntries(
              Object.entries(dataObject).map(([key, value]) => [key, Number.isNumeric(value) ? Number(value) : value])
            );
          }
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
