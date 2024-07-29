let actor = foundry.utils.duplicate(token.actor);
let experience = actor.system.details.experience;
let log = experience.log;
let brokenEntries = [];

function mapExpGained(log) {
  let sum = 0;
  return log.map((data) => {
    sum += data.amount;
    return `<tr>
      <td style="text-align: center">${data.amount} / ${sum}</td>
      <td style="text-align: center">${data.reason}</td>
    </tr>`;
  });
}

function mapExpSpent(log) {
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

function group(expList) {
  return expList.reduce(function (acc, exp) {
    let linkType;
    let link = actor.items.find((i) => i.name === exp.reason);
    if (link) {
      linkType = "item";
    } else {
      let entry = Object.entries(game.wfrp4e.config.characteristics).find(([_, value]) => value === exp.reason);
      if (entry) {
        link = actor.system.characteristics[entry[0]];
        linkType = "characteristic";
      }
    }

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

function findGroupedLogs(str) {
  let stack = [];
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === ")") stack.push(i);
    else if (str[i] === "(" && stack.length) {
      let j = stack.pop();
      let number = Number(str.substring(i + 1, j));
      if (!number) return undefined;
      return {number, i, j};
    }
  }
  return undefined;
}

let spentExpLog = [];
for (let exp of log.filter((exp) => exp.type === "spent")) {
  let data = findGroupedLogs(exp.reason);
  if (data) {
    exp.reason = exp.reason.substring(0, data.i - 1);
    exp.advances = data.number;
  } else {
    exp.advances = Number(exp.amount) >= 0 ? 1 : -1;
  }
  spentExpLog.push(exp);
}
let spentExp = spentExpLog.reduce((acc, exp) => acc + Number(exp.amount), 0);

let gainedExpLog = log.filter((exp) => exp.type === "total");
let gainedExp = gainedExpLog.reduce((acc, exp) => acc + Number(exp.amount), 0);

for (const skill of actor.items.filter((item) => item.type === "skill" && item.system.advances.value > 0)) {
  if (!spentExpLog.map((exp) => exp.reason).includes(skill.name)) {
    for (let i = 0; i < skill.system.advances.value; i++) {
      spentExpLog.push({
        reason: skill.name,
        amount: 0,
        advances: 1,
        noInData: true
      });
    }
  }
}

spentExpLog = group(spentExpLog, spentExp);

function fix() {
  for (let entry of brokenEntries) {
  }
}
