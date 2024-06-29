/* ==========
* MACRO: Pay/Credit Helper
* AUTHOR: Robak132
* DESCRIPTION: Allows for easier money transactions
========== */

MAIN_STYLE = "flex: 1;text-align: center;font-family: CaslonPro;font-weight: 600;font-variant: small-caps";

function normaliseMoney(bp) {
  const gc = Math.floor(bp / 240);
  bp = bp % 240;
  const ss = Math.floor(bp / 12);
  bp = Math.floor(bp % 12);
  return {gc, ss, bp};
}

function pay(html) {
  const form = new FormDataExtended(html[0].querySelector("form")).object;
  const {gc, ss, bp} = normaliseMoney(form.gc * 240 + form.ss * 12 + form.bp);
  if (gc > 0 || ss > 0 || bp > 0) {
    new Macro({
      command:
        "/pay " +
        `${gc}${game.i18n.localize("MARKET.Abbrev.GC")}` +
        `${ss}${game.i18n.localize("MARKET.Abbrev.SS")}` +
        `${bp}${game.i18n.localize("MARKET.Abbrev.BP")}`,
      type: "chat",
      name: "pay"
    }).execute();
  }
}

function credit(html) {
  const form = new FormDataExtended(html[0].querySelector("form")).object;
  const {gc, ss, bp} = normaliseMoney(form.gc * 240 + form.ss * 12 + form.bp);
  if (gc > 0 || ss > 0 || bp > 0) {
    new Macro({
      command:
        "/credit " +
        `${gc}${game.i18n.localize("MARKET.Abbrev.GC")}` +
        `${ss}${game.i18n.localize("MARKET.Abbrev.SS")}` +
        `${bp}${game.i18n.localize("MARKET.Abbrev.BP")} ${form.split ? "split" : "each"}`,
      type: "chat",
      name: "credit"
    }).execute();
  }
}

function main() {
  new Dialog({
    title: "Pay/Credit Helper",
    content: `<form>
              <div class="form-group">
                <p style="${MAIN_STYLE}">GC</p>
                <p style="${MAIN_STYLE}">SS</p>
                <p style="${MAIN_STYLE}">BP</p>
                <p style="${MAIN_STYLE}">Split?</p>
              </div>
              <div class="form-group">
                <input style="flex: 1;text-align: center" type="number" id="gc" name="gc" value="0" min="0" />
                <input style="flex: 1;text-align: center" type="number" id="ss" name="ss" value="0" min="0" />
                <input style="flex: 1;text-align: center" type="number" id="bp" name="bp" value="0" min="0" />
                <input style="flex: 1;text-align: center" type="checkbox" id="split" name="split" checked/>
              </div>
              <div class="form-group"></div>
          </form>`,
    buttons: {
      pay: {
        label: "Pay",
        callback: (html) => pay(html)
      },
      credit: {
        label: "Credit",
        callback: (html) => credit(html)
      }
    },
    default: "pay"
  }).render(true);
}

main();
