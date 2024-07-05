export default class Utility {
  static #OWNERSHIP_OWNER = 3;
  static #OWNERSHIP_OBSERVER = 2;
  static #OWNERSHIP_LIMITED = 1;

  static HTML = class {
    static parser = new DOMParser();

    constructor(content, attributes) {
      this.content = content;
      this.attributes = attributes;
    }

    static getAttributes(content) {
      let attributes = {};
      for (let i = 0; i < content.attributes.length; i++) {
        attributes[content.attributes[i].name] = content.attributes[i].value;
      }
      return attributes;
    }
  };

  static TableHTML = class extends Utility.HTML {
    constructor(rows, attributes = {}) {
      super(rows, attributes);
    }

    static oneRow(cells, attributes = {}) {
      return new Utility.TableHTML([new Utility.RowHTML(cells)], attributes);
    }

    static parse(content) {
      if (!(content instanceof HTMLTableElement)) {
        let doc = this.parser.parseFromString(content, "text/html");
        content = doc.querySelector("table");
      }
      return new Utility.TableHTML(
        Array.from(content.rows).map((r) => Utility.RowHTML.parse(r)),
        this.getAttributes(content)
      );
    }

    toString() {
      const attributes = Object.entries(this.attributes)
        .map(([key, value]) => `${key}="${value}" `)
        .join("");
      return `<table ${attributes}><tbody>${this.content.map((r) => r.toString()).join("")}</tbody></table>`;
    }
  };

  static RowHTML = class extends Utility.HTML {
    constructor(cells, attributes = {}) {
      super(cells, attributes);
    }

    static parse(content) {
      if (!(content instanceof HTMLTableRowElement)) {
        let doc = this.parser.parseFromString(content, "text/html");
        content = doc.querySelector("tr");
      }

      return new Utility.RowHTML(
        Array.from(content.cells).map((r) => Utility.CellHTML.parse(r)),
        this.getAttributes(content)
      );
    }

    toString() {
      const attributes = Object.entries(this.attributes)
        .map(([key, value]) => `${key}="${value}" `)
        .join("");
      return `<tr ${attributes}>${this.content.map((c) => c.toString()).join("")}</tr>`;
    }
  };

  static CellHTML = class extends Utility.HTML {
    constructor(content, attributes = {}) {
      super(content, attributes);
    }

    static parse(content) {
      if (!(content instanceof HTMLTableCellElement)) {
        let doc = this.parser.parseFromString(content, "text/html");
        content = doc.querySelector("td");
      }
      return new Utility.CellHTML(content.innerHTML, this.getAttributes(content));
    }

    toString() {
      const attributes = Object.entries(this.attributes)
        .map(([key, value]) => `${key}="${value}" `)
        .join("");
      return `<td ${attributes}>${this.content}</td>`;
    }
  };

  static log(message, level = "info") {
    switch (level) {
      case "warn":
        console.warn("Robak's macros | " + message);
        break;
      case "debug":
        console.debug("Robak's macros | " + message);
        break;
      case "info":
      default:
        console.log("Robak's macros | " + message);
        break;
    }
  }

  static isObjectEqual(x, y, ignore, path = []) {
    const result = this.#isObjectEqualRaw(x, y, ignore, path);
    if (!result) {
      this.log(`${JSON.stringify(x)} vs ${JSON.stringify(y)}: false`, "debug");
    }
    return result;
  }

  static #isObjectEqualRaw(x, y, ignore, path = []) {
    if (ignore.includes(path.join(".")) || x === y) {
      return true;
    }
    if (typeof x === "object" && x != null && typeof y === "object" && y != null) {
      if (Object.keys(x).length !== Object.keys(y).length) {
        return false;
      }
      for (const prop in x) {
        if (!y.hasOwnProperty(prop) || !this.isObjectEqual(x[prop], y[prop], ignore, path.concat([prop]))) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  static round(num, spaces) {
    return +(Math.round(num + `e+${spaces}`) + `e-${spaces}`);
  }

  static isOwner(actor) {
    return this.checkOwnership(actor, this.#OWNERSHIP_OWNER);
  }

  static checkOwnership(actor, ownership) {
    return actor.ownership[game.user.id] >= ownership || actor.ownership.default >= ownership;
  }

  static clean(value) {
    if (value === 0 || value === "0") {
      return "";
    }
    return value;
  }

  static getStashableActors() {
    let actors = game.actors.filter((a) => a.hasPlayerOwner).filter((a) => this.isOwner(a));
    if (game.user.character !== null) {
      actors = actors.sort((a) => (a.id === game.user.character.id ? -1 : 1));
    }
    return actors;
  }

  static getTransferableActors() {
    return game.actors
      .filter((a) => a.hasPlayerOwner)
      .filter((a) => this.checkOwnership(a, this.#OWNERSHIP_LIMITED) && !this.checkOwnership(a, this.#OWNERSHIP_OWNER));
  }

  static getContainers(actor) {
    return actor.itemTypes.container.map((c) => {
      return {
        id: c.id,
        name: c.name,
        value: c
      };
    });
  }

  static async rollFromCodeObject({table, dice = "1d10", modifier = 0, amount = 1}) {
    const editedTable = [...table];
    const resultList = [];
    for (let i = 0; i < Math.min(table.length, amount); i++) {
      const minValue = editedTable.reduce((prev, current) => (prev.min < current.min ? prev : current)).min;
      const roll = Math.max((await new Roll(dice).roll()).total + modifier, minValue);
      const rolledObject = editedTable.reduce((prev, current) => (current.min <= roll ? current : prev));
      editedTable.splice(editedTable.indexOf(rolledObject), 1);
      resultList.push(rolledObject.result);
    }
    return amount === 1 ? resultList[0] : resultList;
  }

  static randomID() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}
