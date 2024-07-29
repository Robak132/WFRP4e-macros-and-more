class LogEntryGroup {
  constructor(name, type, expType, value = 0, entries = []) {
    this.name = name;
    this.type = type;
    this.expType = expType;
    this.value = value;
    this.entries = entries;
  }

  setName(name) {
    this.name = name;
    this.entries.forEach((entry) => entry.setName(name));
  }

  get color() {
    if (this.type === "spent") {
      let count = this.entries.reduce((acc, entry) => acc + Math.sign(entry.value), 0);
      let color = this.entries[0].link?.system?.advances?.value !== count ? "yellow" : "white";
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
  constructor(name, value, type, index, actor) {
    this.value = Number(value);
    this.type = type;
    this.actor = actor;
    this.index = index;
    this.spent = 0;
    this.total = 0;

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
    return new LogEntry(obj.reason, obj.amount, obj.type, obj.index, actor);
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

export default class ExperienceVerificator extends FormApplication {
  constructor(actor, object = {}, options = {}) {
    super(object, options);
    const actors = game.actors.filter((a) => a.hasPlayerOwner && a.type === "character");
    this.actor = actor ?? actors[0];
    this.experience = foundry.utils.duplicate(this.actor.system.details.experience);
    this.groupModes = ["Group by Time", "Group by Value", "Group by Type"];
    this.currentMode = 0;
    this.nextModeDesc = this.groupModes[(this.currentMode + 1) % this.groupModes.length];
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
      entry.spent = this.calcSpendExp;
      entry.total = this.calcGainedExp;
    });
  }

  groupLogBy(log, nameFunc, condition) {
    if (log.length === 0) return [];
    let groupLog = [];
    let group = new LogEntryGroup(nameFunc(log[0]), log[0].type, log[0].expType);
    for (let entry of log) {
      if (condition(entry, group)) {
        groupLog.push(group);
        group = new LogEntryGroup(nameFunc(entry), entry.type, entry.expType);
      }
      group.value += entry.value;
      group.entries.push(entry);
    }
    groupLog.push(group);
    return groupLog;
  }

  ungroupEntry(entry) {
    let stack = [];
    for (let i = entry.reason.length - 1; i >= 0; i--) {
      if (entry.reason[i] === ")") stack.push(i);
      else if (entry.reason[i] === "(" && stack.length) {
        let j = stack.pop();
        let length = Number(entry.reason.substring(i + 1, j));
        if (!length) return [entry];
        let baseExp = Object.values(game.wfrp4e.config.characteristics).find((value) => value === this.name) ? 20 : 5;
        let ungrouped = this.splitExp(entry.amount, length, baseExp);
        if (!ungrouped) return [entry];
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
          (a, b) => a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.name,
          (a, b) => a.name !== b.name || sign(a.value) !== sign(b.value)
        ).toReversed();
        break;
      case 1:
        this.log.sort((a, b) => a.name.localeCompare(b.name));
        this.spentGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type === "spent"),
          (obj) => obj.name,
          (a, b) => a.name !== b.name
        ).toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.name,
          (a, b) => a.name !== b.name
        ).toSorted((a, b) => b.value - a.value);
        break;
      case 2:
        this.log.sort((a, b) => a.expType.localeCompare(b.expType));
        this.spentGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type === "spent"),
          (obj) => obj.expType,
          (a, b) => a.expType !== b.expType
        ).toSorted((a, b) => b.value - a.value);
        this.gainedGroupLog = this.groupLogBy(
          this.log.filter((entry) => entry.type !== "spent"),
          (obj) => obj.expType,
          (a, b) => a.expType !== b.expType
        ).toSorted((a, b) => b.value - a.value);
        break;
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", `button[id="group"]`, () => {
      this.currentMode = (this.currentMode + 1) % this.groupModes.length;
      this.nextModeDesc = this.groupModes[(this.currentMode + 1) % this.groupModes.length];
      this.render(true);
    });
    html.on("click", ".exp-row", async (ev) => {
      let index = Number($(ev.currentTarget).attr("name"));
      let name = this.spentGroupLog[index].name;
      let newName = await ValueDialog.create("Insert new name for the entry", "Change Entry's Name", name);
      if (newName && newName !== name) {
        this.spentGroupLog[index].setName(newName);
        this.render(true);
      }
    });
  }

  async getData(options = {}) {
    const data = super.getData();
    this.createGroupLog();

    data.nextModeDesc = this.nextModeDesc;
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
        this.actor.update({"system.details.experience.log": newExperienceLog});
        return;
    }
  }
}
