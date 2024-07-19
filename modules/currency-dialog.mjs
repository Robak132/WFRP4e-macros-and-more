import RobakMarketWfrp4e from "./robak-market.js";

export default class CurrencyApp extends FormApplication {
  constructor(fields, needed, currency) {
    super();
    this.fields = fields;
    this.needed = needed;
    this.currency = currency;
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

  async _updateObject(event, formData) {
    console.log(event);
    console.log(formData);
  }

  getData({options = {}}) {
    let data = super.getData(options);
    data.fields = this.fields;
    data.neededText = RobakMarketWfrp4e.format({bp: this.needed});
    data.totalText = RobakMarketWfrp4e.format({bp: this.total});
    data.currency = this.currency;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".document-name").click((ev) => {
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
    html.find("button").click((ev) => {
      if ($(ev.currentTarget).data("action") === "submit") {
        this.submit();
      } else {
        this.close();
      }
    });
  }
}
