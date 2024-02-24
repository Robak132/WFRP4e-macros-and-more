export class Utility {
  static #OWNERSHIP_OWNER = 3;
  static #OWNERSHIP_OBSERVER = 2;
  static #OWNERSHIP_LIMITED = 1;

  static log(message, level="info") {
    switch (level) {
      case 'warn':
        console.warn(`Robak's macros | ` + message);
        break;
      case 'debug':
        console.debug(`Robak's macros | ` + message);
        break;
      case 'info':
      default:
        console.log(`Robak's macros | ` + message);
        break;
    }
  }

  static isObjectEqual({
    x,
    y,
    ignore,
    path = [],
  }) {
    const result = this.#isObjectEqualRaw({
      x,
      y,
      ignore,
      path,
    });
    if (!result) this.log(`${JSON.stringify(x)} vs ${JSON.stringify(y)}: false`, 'debug');
    return result;
  }

  static #isObjectEqualRaw({
    x,
    y,
    ignore,
    path = [],
  }) {
    if (ignore.includes(path.join('.')) || x === y) return true;
    if (typeof x == 'object' && x != null && typeof y == 'object' && y != null) {
      if (Object.keys(x).length !== Object.keys(y).length) return false;
      for (let prop in x) {
        if (!y.hasOwnProperty(prop) || !this.isObjectEqual({
          x: x[prop],
          y: y[prop],
          ignore,
          path: path.concat([prop]),
        })) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  static isOwner(actor) {
    return this.checkOwnership(actor, this.#OWNERSHIP_OWNER);
  }

  static checkOwnership(actor, ownership) {
    return actor.ownership[game.user.id] >= ownership || actor.ownership['default'] >= ownership;
  }

  static clean(value) {
    if (value === 0 || value === '0') {
      return '';
    }
    return value;
  }

  static getStashableActors() {
    let actors = game.actors.filter(a => a.hasPlayerOwner).filter(a => this.isOwner(a));
    if (game.user.character !== null) {
      actors = actors.sort(a => a.id === game.user.character.id ? -1 : 1);
    }
    return actors;
  }

  static getTransferableActors() {
    return game.actors.filter(a => a.hasPlayerOwner).
        filter(a => this.checkOwnership(a, this.#OWNERSHIP_LIMITED) && !this.checkOwnership(a, this.#OWNERSHIP_OWNER));
  }

  static getContainers(actor) {
    return actor.itemTypes.container.map((c) => {
      return {
        id: c.id,
        name: c.name,
        value: c,
      };
    });
  }

  static async rollFromCodeObject({
    table,
    dice = '1d10',
    modifier = 0,
    amount = 1,
  }) {
    let editedTable = [...table];
    let resultList = [];
    for (let i = 0; i < Math.min(table.length, amount); i++) {
      const minValue = editedTable.reduce((prev, current) => (prev.min < current.min) ? prev : current).min;
      let roll = Math.max((await new Roll(dice).roll()).total + modifier, minValue);
      let rolledObject = editedTable.reduce((prev, current) => current.min <= roll ? current : prev);
      editedTable.splice(editedTable.indexOf(rolledObject), 1);
      resultList.push(rolledObject.result);
    }
    return resultList;
  }
}