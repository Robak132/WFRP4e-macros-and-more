import Utility from "./utility.mjs";

export default class ConfigurableDialog extends Dialog {
  static createRow(fields, rowIndex) {
    let style = `style="max-width: ${Utility.round(100 / fields.length, 0)}%"`;
    return fields
      .map((field, columnIndex) => {
        field.style ??= style;
        return this.createCell(field, rowIndex, columnIndex);
      })
      .join("");
  }

  static createCell(field, rowIndex, columnIndex = 0) {
    const fieldId = field?.id ?? `field-${rowIndex}-${columnIndex}`;
    switch (field.type ?? "label") {
      case "label":
        return `<label ${field.style}>${field.value}</label>`;
      case "input":
        let type = field.inputType ?? "text";
        return `<input ${field.style} id="${fieldId}" name="${fieldId}" type="${type}" value="${field.value}" />`;
      case "select":
        let options = field.value.map((e) => {
          let selected = field.selected === e.value ? "selected" : "";
          return `<option value="${e.value ?? e.name}" ${selected}>${e.name}</option>`;
        });
        return `<select ${field.style} id="${fieldId}" name="${fieldId}">${options.join("")}</select>`;
      case "checkbox":
        return `<input ${field.style} id="${fieldId}" name="${fieldId}" type="checkbox" ${field.value ? "checked" : ""} />`;
    }
  }

  static async create({
    title,
    data = [],
    confirmLabel = game.i18n.localize("Confirm"),
    cancelLabel = game.i18n.localize("Cancel"),
    buttons,
    options
  }) {
    buttons ??= {
      confirm: {
        label: confirmLabel,
        callback: (html) => ConfigurableDialog.parseResult(html, options.forceList)
      },
      ignore: {
        label: cancelLabel,
        callback: () => null
      }
    };
    return await Dialog.wait(
      {
        title: title,
        content: `<form>${data
          .map((fields, index) => `<div class="form-group">${this.createRow(fields, index)}</div>`)
          .join("")}</form>`,
        buttons,
        default: "confirm",
        close: () => null
      },
      options
    );
  }

  static async oneColumn({
    title,
    data = [],
    confirmLabel = game.i18n.localize("Confirm"),
    cancelLabel = game.i18n.localize("Cancel"),
    buttons,
    options
  }) {
    buttons ??= {
      confirm: {
        label: confirmLabel,
        callback: (html) => ConfigurableDialog.parseResult(html, options.forceList)
      },
      ignore: {
        label: cancelLabel,
        callback: () => null
      }
    };
    return await Dialog.wait(
      {
        title: title,
        content: `<form>${data
          .map((field, index) => `<div class="form-group">${this.createCell(field, index, 0)}</div>`)
          .join("")}</form>`,
        buttons,
        default: "confirm",
        close: () => null
      },
      options
    );
  }

  static async oneRow({
    title,
    data = [],
    confirmLabel = game.i18n.localize("Confirm"),
    cancelLabel = game.i18n.localize("Cancel"),
    buttons,
    options
  }) {
    buttons ??= {
      confirm: {
        label: confirmLabel,
        callback: (html) => ConfigurableDialog.parseResult(html, options.forceList)
      },
      ignore: {
        label: cancelLabel,
        callback: () => null
      }
    };
    return await Dialog.wait(
      {
        title: title,
        content: `<form><div class="form-group">${data
          .map((field, index) => `${this.createCell(field, index, 0)}`)
          .join("")}</div></form>`,
        buttons,
        default: "confirm",
        close: () => null
      },
      options
    );
  }

  static parseResult(html, forceList = []) {
    let dataObject = new FormDataExtended(html.find("form")[0]).object;
    dataObject = Object.fromEntries(
      Object.entries(dataObject).map(([key, value]) => {
        if (Array.isArray(value)) {
          value = Object.entries(value).map(([k, v]) => (value[k] = Number.isNumeric(v) ? Number(v) : v));
        }
        value = Number.isNumeric(value) ? Number(value) : value;
        if (forceList.includes(key)) value = Array.isArray(value) ? value : [value];
        return [key, value];
      })
    );
    return dataObject;
  }
}
