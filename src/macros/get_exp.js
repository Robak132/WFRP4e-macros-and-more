if (canvas.tokens.controlled.length) {
  for (const token of canvas.tokens.controlled) {
    const actor = token.actor;
    const log = actor.system.details.experience.log;
    let entries = {};
    for (let entry of log) {
      entries[entry.reason] = entries[entry.reason] ?? [];
      entries[entry.reason].push(entry);
    }
    for (let [key, value] of Object.entries(entries)) {
      let newValue = [];
      for (let i = 0; i < value.length; i++) {
        let current = value[i];
        let last = value[i - 1];
        if (current.amount !== -last?.amount) {
          newValue = newValue.slice(0, -1);
        } else {
          newValue.push(current);
        }
      }
      value = newValue;
    }
    console.log(entries);
  }
}
