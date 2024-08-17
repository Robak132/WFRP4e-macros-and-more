/* ==========
* MACRO: Token Manipulator
* AUTHOR: Robak132
* DESCRIPTION: Allows for quick token manipulations (disposition changes, system effects, showing weapons etc.)
========== */

class TokenManipulator extends Dialog {
  static OPERATIONS = [
    {
      id: "show-weapons",
      name: "Show Weapons",
      function: async (token) => {
        if (!token.actor.items.find((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeaponsEffect"))) {
          await this.createShowWeaponsEffect(token);
        }
      }
    },
    {
      id: "hide-weapons",
      name: "Hide Weapons",
      function: async (token) => {
        await this.removeShowWeaponsEffect(token);
      }
    },
    {
      id: "toggle-weapons",
      name: "Toggle Weapons",
      function: async (token) => {
        if (!token.actor.items.find((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeaponsEffect"))) {
          await this.createShowWeaponsEffect(token);
        } else {
          await this.removeShowWeaponsEffect(token);
        }
      }
    },
    {
      id: "delete-token-magic-filters",
      name: "Delete TokenMagic Filters",
      function: async () => {
        await TokenMagic.deleteFiltersOnSelected();
      }
    },
    {
      id: "link-token",
      name: "Link Token",
      function: async (token) => {
        console.log(token.document);
        await token.document.update({actorLink: true});
        await game.actors.get(token.actor.id).prototypeToken.update({actorLink: true});
      }
    },
    {
      id: "set-friendly-token",
      name: "Set Friendly (Token only)",
      function: async (token) => {
        await token.document.update({disposition: 1});
        token.refresh(true);
      }
    },
    {
      id: "set-friendly",
      name: "Set Friendly",
      function: async (token) => {
        await game.actors.get(token.actor.id).prototypeToken.update({disposition: 1});
        await token.document.update({disposition: 1});
        token.refresh(true);
      }
    },
    {
      id: "set-neutral-token",
      function: async (token) => {
        await token.document.update({disposition: 0});
        token.refresh(true);
      },
      name: "Set Neutral (Token only)"
    },
    {
      id: "set-neutral",
      name: "Set Neutral",
      function: async (token) => {
        await game.actors.get(token.actor.id).prototypeToken.update({disposition: 0});
        await token.document.update({disposition: 0});
        token.refresh(true);
      }
    },
    {
      id: "set-hostile-token",
      name: "Set Hostile (Token only)",
      function: async (token) => {
        await token.document.update({disposition: -1});
        token.refresh(true);
      }
    },
    {
      id: "set-hostile",
      name: "Set Hostile",
      function: async (token) => {
        await game.actors.get(token.actor.id).prototypeToken.update({disposition: -1});
        await token.document.update({disposition: -1});
        token.refresh(true);
      }
    },
    {
      id: "toggle-infighting",
      name: "Toggle Infighting",
      function: (token) => {
        console.log(token.actor.effects);
        if (token.actor.effects.find((e) => e.statuses.has("infighting"))) {
          token.actor.removeSystemEffect("infighting");
        } else {
          token.actor.addSystemEffect("infighting");
        }
      }
    }
  ];

  static async run() {
    return await this.wait(
      {
        title: "Token Manipulator",
        content: `<div class="directory">
            <ol class="directory-list">
              ${this.OPERATIONS.map((item, i) => {
                return `<li class="directory-item document flexrow" data-index="${i}" data-id="${item.id}">
                    <h4 class="document-name"><a>${item.name}</a></h4>
                  </li>`;
              }).join("")}
            </ol>
          </div>`,
        buttons: [],
        close: () => null
      },
      {
        width: 250
      }
    );
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", ".document-name", async (ev) => {
      if (canvas.tokens.controlled.length) {
        let document = $(ev.currentTarget).parents(".document")[0];
        let id = document.dataset.id;
        const operation = TokenManipulator.OPERATIONS.find((op) => op.id === id);
        await this.close();
        for (let token of canvas.tokens.controlled) {
          await operation.function(token);
        }
      } else {
        return ui.notifications.error("Select one or more tokens on which you want to run this macro");
      }
    });
  }

  static async createShowWeaponsEffect(token) {
    let data = (await fromUuid("Compendium.wfrp4e-macros-and-more.traits.Item.BGMmJNl1vemQuN7a")).toObject();
    data.name = game.i18n.localize("MACROS-AND-MORE.ShowWeaponsEffect");
    for (let effect of data.effects) {
      effect.name = game.i18n.localize("MACROS-AND-MORE.ShowWeapons");
    }
    await token.actor.createEmbeddedDocuments("Item", [data]);
  }

  static async removeShowWeaponsEffect(token) {
    let items = token.actor.items
      .filter((e) => e.name === game.i18n.localize("MACROS-AND-MORE.ShowWeaponsEffect"))
      .map((e) => e._id);
    if (items.length) {
      await token.actor.deleteEmbeddedDocuments("Item", items);
    }

    let effects = token.actor.effects.filter((e) => e.statuses.has("show-item")).map((e) => e._id);
    if (effects.length) {
      await token.actor.deleteEmbeddedDocuments("ActiveEffect", effects);
    }
  }
}

await TokenManipulator.run();
