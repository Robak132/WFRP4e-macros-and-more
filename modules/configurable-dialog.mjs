import Utility from "./utility.mjs";

export default class ConfigurableDialog extends Dialog {
  static createRow(rowIndex, fields) {
    let style = `style="max-width: ${Utility.round(100 / fields.length, 0)}%"`;
    let content = `<div class="form-group">`;
    content += fields
      .map((field, columnIndex) => this.createCell(field, rowIndex, columnIndex, field.style ?? style))
      .join("");
    content += `</div>`;
    return content;
  }

  static createCell(field, rowIndex, columnIndex, style) {
    const fieldId = field?.id ?? `field-${rowIndex}-${columnIndex}`;
    switch (field.type ?? "label") {
      case "label":
        return `<label ${style}>${field.value}</label>`;
      case "input":
        let type = field.inputType ?? "text";
        return `<input ${style} id="${fieldId}" name="${fieldId}" type="${type}" value="${field.value}" />`;
      case "select":
        let options = field.value.map((e) => {
          let selected = field.selected === e.value ? "selected" : "";
          return `<option value="${e.value ?? e.name}" ${selected}>${e.name}</option>`;
        });
        return `<select ${style} id="${fieldId}" name="${fieldId}">${options.join("")}</select>`;
      case "checkbox":
        return `<input ${style} id="${fieldId}" name="${fieldId}" type="checkbox" ${field.value ? "checked" : ""} />`;
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
        callback: (html) => {
          let dataObject = new FormDataExtended(html.find("form")[0]).object;
          return Object.fromEntries(
            Object.entries(dataObject).map(([key, value]) => {
              if (Array.isArray(value)) {
                value = Object.entries(value).map(([k, v]) => (value[k] = Number.isNumeric(v) ? Number(v) : v));
              }
              return [key, Number.isNumeric(value) ? Number(value) : value];
            })
          );
        }
      },
      ignore: {
        label: cancelLabel,
        callback: () => null
      }
    };
    return await Dialog.wait(
      {
        title: title,
        content: `<form>${data.map((fields, index) => this.createRow(index, fields)).join("")}</form>`,
        buttons,
        default: "confirm",
        close: () => null
      },
      options
    );
  }
}
