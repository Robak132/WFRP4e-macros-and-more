/* ==========
* MACRO: Inventory Manager
* AUTHOR: Robak132
* DESCRIPTION: Allows for easy item movement between containers and actors.
========== */

class InventoryManager {
  constructor() {
    new Dialog(
      {
        title: "Inventory Manager",
        content: this.getHTMLForm(),
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          },
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Move Items",
            callback: (html) => this.transferItems(html)
          }
        },
        default: "confirm"
      },
      {width: 750}
    ).render(true);
  }

  formatItemEnc(x) {
    const sourceItem = x._source;
    const lightweightBonus =
      sourceItem.system.qualities != null && sourceItem.system.qualities.value.some((q) => q.name === "lightweight")
        ? -1
        : 0;
    const fullValue = Number(
      (Math.max(sourceItem.system.encumbrance.value + lightweightBonus, 0) * x.system.quantity.value).toFixed(2)
    );
    const currentValue = Number((x.system.encumbrance.value * x.system.quantity.value).toFixed(2));
    if (fullValue === currentValue) {
      return `${currentValue}`;
    } else {
      return `${currentValue} (${fullValue})`;
    }
  }

  groupBy(list, func) {
    return list.reduce((rv, x) => {
      rv[func(x)] = rv[func(x)] ?? [];
      rv[func(x)].push(x);
      return rv;
    }, {});
  }

  getItemType(x) {
    const type = x.type === "trapping" ? x.system.trappingType.value : x.type;
    return type === "" ? "misc" : type;
  }

  getCategoryOrder(x) {
    switch (x) {
      case "weapon":
        return 3;
      case "ammunition":
        return 2;
      case "armour":
        return 1;
      default:
        return 0;
    }
  }

  groupActorItems(actor) {
    const items = [
      ...actor.itemTypes.weapon,
      ...actor.itemTypes.ammunition,
      ...actor.itemTypes.armour,
      ...actor.itemTypes.money,
      ...actor.itemTypes.trapping
    ]
      .sort((a, b) => a.name.localeCompare(b.name, "pl"))
      .sort((a, b) => (a.encumbrance.value > b.encumbrance.value ? -1 : 1));

    const itemsCategorised = this.groupBy(items, (x) => game.robakMacros.utils.clean(x.location.value));
    for (let [key, value] of Object.entries(itemsCategorised)) {
      value = this.groupBy(value, (x) => this.getItemType(x));
      itemsCategorised[key] = Object.fromEntries(
        Object.entries(value).sort((a, b) => {
          if (this.getCategoryOrder(a[0]) === this.getCategoryOrder(b[0])) {
            return game.i18n
              .localize(WFRP4E.trappingCategories[b[0]])
              .localeCompare(game.i18n.localize(WFRP4E.trappingCategories[a[0]]), "pl");
          }
          return this.getCategoryOrder(a[0]) < this.getCategoryOrder(b[0]) ? 1 : -1;
        })
      );
    }
    return itemsCategorised;
  }

  getHTMLActorHeader(actor) {
    return `
      <h1 style="text-align: center;font-family: CaslonAntique,serif;font-variant: small-caps;font-weight: bold">
        ${actor.name.toLocaleUpperCase("pl")}
        (${actor.system.status.encumbrance.current}/${actor.system.status.encumbrance.max})
      </h1>`;
  }

  getHTMLContainerHeader(containerItems, container, actorId) {
    let containerItemsEnc = Number(
      Object.values(containerItems).reduce(
        (sum, cat) => sum + Number(cat.reduce((catSum, i) => catSum + Number(i.encumbrance.value), 0)),
        0
      )
    );
    if (containerItemsEnc % 1 !== 0) {
      containerItemsEnc = containerItemsEnc.toFixed(2);
    }
    return `
      <div class="form-group">
        <h2 style="max-width: 10%;text-align: center;font-family: CaslonAntique,serif;">${this.formatItemEnc(container.value)}</h2>
        <h2 style="max-width: 90%;text-align: center;font-family: CaslonAntique,serif;font-variant: small-caps;font-weight: bold;">
          ${container.name} (${containerItemsEnc}/${container.value.carries.value ?? "-"})
        </h2>
      </div>`;
  }

  getHTMLItemList(containerItems, containerId, actorId) {
    let form = "";
    for (const [_, categoryList] of Object.entries(containerItems)) {
      if (categoryList.length > 0) {
        let categoryEnc = Number(categoryList.reduce((acc, x) => acc + Number(x.encumbrance.value), 0));
        if (categoryEnc % 1 !== 0) {
          categoryEnc = categoryEnc.toFixed(2);
        }
        for (const item of categoryList) {
          form += `
              <div class="form-group">
                <span style="max-width: 10%;text-align: center">${this.formatItemEnc(item)}</span>
                <span style="max-width: 30%;text-align: center">${item.name}</span>
                <span style="max-width: 5%;text-align: center">${item.quantity.value}</span>
                <input style="max-width: 20%" class="slider" name="${item.id}" min="0" max="${item.system.quantity.value}" value="0" type="range">
                <input style="max-width: 5%;text-align: center" name="${item.id}" min="0" max="${item.system.quantity.value}" value="0" type="number">
                <span style="max-width: 5%;text-align: center">&#8594;</span>
                <select style="max-width: 25%" 
                        name="${item.id}"
                        data-item="${item.id}"
                        data-source-actor="${actorId}"
                        data-source-container="${containerId}">
                <option selected label=""></option>
                  ${game.robakMacros.transferItem.createSelectTag(actorId, containerId)}
                </select>
              </div>`;
        }
      }
    }
    return form;
  }

  getHTMLForm() {
    let form = '<form><div style="overflow-y: scroll;height: 500px">';
    for (const actor of game.robakMacros.utils.getStashableActors()) {
      const items = this.groupActorItems(actor);
      const actorItems = items[""] ?? {};

      form += this.getHTMLActorHeader(actor);
      form += this.getHTMLItemList(actorItems, "", actor.id);
      for (const container of game.robakMacros.utils.getContainers(actor)) {
        const containerItems = items[container.id] ?? {};
        if (Object.values(containerItems).length === 0) {
          continue;
        }

        form += this.getHTMLContainerHeader(containerItems, container, actor.id);
        form += this.getHTMLItemList(containerItems, container.id, actor.id);
      }
    }
    form += `</div></form>
      <script>
        $("input[type=range]").on("input", function() {
          document.getElementsByName(this.name)[1].value = this.value
        });
        $("input[type=number]").on("input", function() {
          document.getElementsByName(this.name)[0].value = this.value
        });
        $("select").on("input", function() {
          let slider = document.getElementsByName(this.name)[0]
          let input = document.getElementsByName(this.name)[1]
          if (input.value === "0") {
            slider.value = slider.max
            input.value = slider.max
          }
          if (this.options[this.options.selectedIndex].label === "") {
            slider.value = slider.min
            input.value = slider.min
          }
        });
      </script>`;
    return form;
  }

  async transferItems(html) {
    const itemTransfers = $(html)
      .find("select")
      .map((_, e) => {
        return {
          item: game.actors.get(e.dataset.sourceActor).items.get(e.dataset.item),
          targetActorId: e.options[e.options.selectedIndex].dataset.targetActor,
          targetContainerId: e.options[e.options.selectedIndex].dataset.targetContainer,
          sourceActorId: e.dataset.sourceActor,
          sourceContainerId: e.dataset.sourceContainer,
          quantity: Number($(html).find(`input[type=number][name=${e.dataset.item}]`).val())
        };
      })
      .get()
      .filter((s) => s.targetContainerId != null && s.targetActorId != null);
    game.robakMacros.utils.log(itemTransfers);
    await game.robakMacros.transferItem.transferItems(itemTransfers);
  }
}

new InventoryManager();
