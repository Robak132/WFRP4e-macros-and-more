import Utility from "./utility.mjs";

export default class CurrencyApp extends FormApplication {
  constructor(fields, needed, currency, resolve) {
    super();
    this.fields = fields;
    this.needed = needed;
    this.currency = currency;
    this.resolve = resolve;
    this.total = 0;
  }

  static get defaultOptions() {
    const options = mergeObject(super.defaultOptions, {
      id: "currency-app",
      title: "Select currency to pay",
      resizable: false,
      width: 400,
      template: "modules/wfrp4e-macros-and-more/templates/currency-dialog.hbs"
    });
    options.classes.push("dialog");
    options.classes.push("item-dialog");
    return options;
  }

  submit(options) {
    this.resolve();
    return super.close(options);
  }

  close(options) {
    this.resolve(null);
    return super.close(options);
  }

  getData({options = {}}) {
    let data = super.getData(options);
    data.fields = this.fields;
    data.neededText = Utility.formatMoney({bp: this.needed});
    data.totalText = Utility.formatMoney({bp: this.total});
    data.currency = this.currency;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", ".document-name", (ev) => {
      let document = $(ev.currentTarget).parents(".document")[0];
      if (document.classList.contains("active")) {
        this.fields[document.dataset.index].active = "";
        this.total -= parseInt(document.dataset["converted"]);
      } else {
        this.fields[document.dataset.index].active = "active";
        this.total += parseInt(document.dataset["converted"]);
      }
      this.render(true);
    });
    html.on("click", `button[id="pay"]`, async () => await this.submit());
    html.on("click", `button[id="cancel"]`, async () => await this.close());
  }
}
