class LogEntryGroup {
  constructor(name, value, entries) {
    this.name = name;
    this.value = value;
    this.entries = entries;
  }

  setName(name) {
    this.name = name;
    this.entries.forEach((entry) => entry.setName(name));
  }

  get color() {
    return this.entries.every((entry) => entry.link) ? "white" : "red";
  }
}

class LogEntry {
  constructor(name, value, type, index, actor, spent = 0, total = 0) {
    this.value = Number(value);
    this.type = type;
    this.spent = spent;
    this.actor = actor;
    this.index = index;
    this.total = total;

    this.setName(name);
  }

  setName(name) {
    this.name = name;
    this.link = this.actor.items.find((i) => i.name === this.name);
    if (this.link) {
      this.linkType = "item";
    } else {
      let entry = Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === this.name);
      if (entry) {
        this.link = this.actor.system.characteristics[entry[0]];
        this.linkType = "characteristic";
      }
    }
  }

  static fromLog(obj, actor) {
    return new LogEntry(obj.reason, obj.amount, obj.type, obj.index, actor, obj.spent, obj.total);
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

export default class ExperienceVerificator extends FormApplication {
  constructor(actor, object = {}, options = {}) {
    super(object, options);
    this.actor = foundry.utils.duplicate(actor);
    this.experience = foundry.utils.duplicate(this.actor.system.details.experience);
    this.parseLog();
  }

  splitExp(sum, length) {
    const x = (i) => 10 + 5 * Math.ceil(i / 5);

    let seq = [];
    let testSum = 0;
    let i = 0;
    while (testSum < sum) {
      let val = x(i);
      seq.push(val);
      testSum += val;

      if (i >= length) testSum -= seq.shift();
      i++;
    }
    return testSum === sum ? seq : undefined;
  }

  mapExpGained(log) {
    let sum = 0;
    return log.map((data) => {
      sum += data.amount;
      return `<tr>
      <td style="text-align: center">${data.amount} / ${sum}</td>
      <td style="text-align: center">${data.reason}</td>
    </tr>`;
    });
  }

  mapExpSpent(log) {
    return Object.entries(log)
      .filter(([_, data]) => data.amount !== 0)
      .sort(([_, a], [__, b]) => b.value - a.value)
      .map(([reason, data]) => {
        let colorStyle;
        if (data.notInData) {
          colorStyle = `yellow`;
        } else if (
          (data.linkType === "item" && data.link.system?.advances?.value === data.amount) ||
          (data.linkType === "characteristic" && data.link.advances === data.amount)
        ) {
          colorStyle = "greenyellow";
        } else if (data.link) {
          colorStyle = "yellow";
        } else {
          colorStyle = `red`;
          brokenEntries.push(data);
        }
        return `<tr>
      <td style="text-align: center; color: ${colorStyle}" title="${data.data.map((v) => v.amount).join(", ")}">${data.value}</td>
      <td style="text-align: center; color: ${colorStyle}"><span></span>${reason} (+${data.amount})</td>
    </tr>`;
      });
  }

  group(expList) {
    return expList.reduce(function (acc, exp) {
      let data = acc[exp.reason] ?? {
        value: 0,
        amount: 0,
        link,
        linkType,
        notInData: false,
        data: []
      };
      data.notInData = exp.noInData;
      data.value += Number(exp.amount);
      data.amount += exp.advances;
      data.data.push(exp);
      acc[exp.reason] = data;
      return acc;
    }, {});
  }

  parseLog() {
    this.log = [];
    this.spentLog = [];
    this.gainedLog = [];
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
    this.log.sort((a, b) => a.index - b.index);
    this.log.forEach((entry, index) => {
      entry.index = index;
      if (entry.type === "spent") {
        this.calcSpendExp += entry.value;
        this.spentLog.push(entry);
      } else {
        this.calcGainedExp += entry.value;
        this.gainedLog.push(entry);
      }
      entry.spent = this.calcSpendExp;
      entry.total = this.calcGainedExp;
    });
  }

  groupLogBy(log, condition) {
    if (log.length === 0) return [];
    let groupLog = [];
    let group = new LogEntryGroup(log[0].name, 0, []);
    for (let entry of log) {
      if (condition(entry, group)) {
        groupLog.push(group);
        group = new LogEntryGroup(entry.name, 0, []);
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
        let ungrouped = this.splitExp(entry.amount, length);
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

  fix() {
    for (let entry of brokenEntries) {
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    // html.on("click", ".exp-row", async (ev) => {
    //   let index = Number($(ev.currentTarget).attr("name"));
    //   let name = this.spentGroupLog[index].name;
    //   let newName = await ValueDialog.create("Insert new name for the entry", "Change Entry's Name", name);
    //   if (newName && newName !== name) {
    //     this.spentGroupLog[index].setName(newName);
    //     this.render(true);
    //   }
    // });
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "macro-and-more-verificator",
      template: "modules/wfrp4e-macros-and-more/templates/experience-verificator.hbs",
      width: 800,
      height: 660
    });
  }

  async getData(options = {}) {
    const data = super.getData();
    this.spentGroupLog = this.groupLogBy(
      this.spentLog,
      (a, b) => a.name !== b?.name || sign(a.value) !== sign(b.value)
    );
    this.gainedGroupLog = this.groupLogBy(
      this.gainedLog,
      (a, b) => a.name !== b?.name || sign(a.value) !== sign(b.value)
    );
    data.gainedLog = this.gainedGroupLog.toReversed();
    data.spentLog = this.spentGroupLog.toReversed();
    data.experienceSpentCalculated = this.calcSpendExp;
    data.experienceGainedCalculated = this.calcGainedExp;
    data.experienceSpent = this.experience.spent;
    data.experienceGained = this.experience.total;
    return data;
  }

  async _updateObject(event, formData) {
    switch (event.submitter.id) {
      case "fix":
        return this.fix();
      case "next":
        break;
      default:
        return;
    }
  }
}
