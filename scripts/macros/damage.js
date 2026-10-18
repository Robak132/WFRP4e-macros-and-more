/* ==========
* MACRO: Damage
* AUTHOR: Robak132, Codex
* DESCRIPTION: Apply basic damage to selected player characters with formula and hit location options.
========== */

const Utility = game.robakMacros?.utils;

function getPlayerCharacters() {
  const chars = game.users.map((user) => user.character).filter(Boolean);

  const unique = new Map();
  for (const actor of chars) {
    if (!unique.has(actor.id)) unique.set(actor.id, actor);
  }
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getTargetedActorIds() {
  return new Set(
    Array.from(game.user.targets || [])
      .map((token) => token?.actor?.id)
      .filter(Boolean)
  );
}

function getDamageType({ignoreAP, ignoreTB}) {
  if (ignoreAP && ignoreTB) return game.wfrp4e.config.DAMAGE_TYPE.IGNORE_ALL;
  if (ignoreAP) return game.wfrp4e.config.DAMAGE_TYPE.IGNORE_AP;
  if (ignoreTB) return game.wfrp4e.config.DAMAGE_TYPE.IGNORE_TB;
  return game.wfrp4e.config.DAMAGE_TYPE.NORMAL;
}

async function evaluateDamageFormula(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

async function isDeterministicFormula(formula) {
  try {
    const roll = await new Roll(formula).evaluate();
    return roll.isDeterministic;
  } catch {
    return true;
  }
}

function explainDamageMessage(msg, actor, options, finalDamage, hitLocation) {
  if (!msg) return `${actor.name}: could not apply damage.`;

  let output = msg;

  if (Number.isNaN(Number(options.damageFormula))) {
    const rollResult = `${options.damageFormula}: ${finalDamage}`;
    const appliedDamage = output.substring(0, output.search(" "));
    const explainedDamage = `<abbr title="${rollResult}"><i class="fas fa-dice"></i></abbr> <strong>${appliedDamage}</strong>`;
    output = output.replace(appliedDamage, explainedDamage);
  }

  if (!options.ignoreAP) {
    const hitLocationLabel = game.i18n.localize(game.wfrp4e.config.locations?.[hitLocation] || hitLocation);
    output = output.replace("AP", `<abbr title="${hitLocationLabel}">AP</abbr>`);
  }

  if (actor.system.status.wounds.value <= 0) {
    output += ` <abbr title="At 0 Wounds"><i class="fas fa-heartbeat"></i></abbr>`;
  }

  return `${actor.name}: ${output}`;
}

async function processActorDamage(actor, options, sharedHitLocation, sharedDamage) {
  const damage = options.randomiseDamage ? await evaluateDamageFormula(options.damageFormula) : sharedDamage;
  const hitLocation = options.randomiseHitLocation ? await Utility.resolveHitLocation("roll", actor) : sharedHitLocation;

  const msg = await actor.applyBasicDamage(Number(damage), {
    damageType: options.damageType,
    minimumOne: options.minimumOne,
    loc: hitLocation,
    suppressMsg: true
  });

  await Utility.applyBasicDamage(actor, Number(damage), hitLocation);
  return explainDamageMessage(msg, actor, options, damage, hitLocation);
}

async function applyDamageToActors(options, actorIds) {
  const actors = actorIds.map((id) => game.actors.get(id)).filter(Boolean);
  if (!actors.length) return ui.notifications.error("Select at least one character.");

  let sharedDamage = null;
  if (!options.randomiseDamage) sharedDamage = await evaluateDamageFormula(options.damageFormula);

  let sharedHitLocation = options.selectedHitLocation;
  if (!options.randomiseHitLocation && options.selectedHitLocation === "roll") {
    sharedHitLocation = await Utility.resolveHitLocation("roll", actors[0]);
  }

  const results = [];
  for (const actor of actors) {
    results.push(await processActorDamage(actor, options, sharedHitLocation, sharedDamage));
  }

  await ChatMessage.create({
    content: results.join("<br>"),
    whisper: game.users.filter((u) => u.isGM).map((u) => u.id)
  });
}

function buildTargetListHtml() {
  const characters = getPlayerCharacters();
  const targeted = getTargetedActorIds();
  if (!characters.length) return "<div class='target-empty'>No player characters assigned.</div>";

  const hasTargetedPlayer = characters.some((actor) => targeted.has(actor.id));

  return characters
    .map((actor) => {
      const checked = hasTargetedPlayer ? targeted.has(actor.id) : true;
      return `<div class="flexrow target-line">
        <input type="checkbox" name="targetActors" value="${actor.id}" id="target-${actor.id}" ${checked ? "checked" : ""}>
        <label for="target-${actor.id}" class="checkbox-label">${actor.name}</label>
      </div>`;
    })
    .join("");
}

const style = `
<style>
.macro-damage { row-gap: 0.6rem; color: var(--color-text-dark-primary); }
.macro-damage.console.flexrow { align-items: flex-start; gap: 0.75rem; }
.macro-damage #parameters, .macro-damage #app-targets { flex: 1; min-width: 0; }
.macro-damage .form-group.flexcol {
  display: flow-root;
  border: 1px solid var(--color-border-dark-3);
  border-radius: 4px;
  padding: 0.45rem 0.6rem;
  margin-bottom: 0.6rem;
  background: rgba(255, 255, 255, 0.55);
}
.macro-damage .section-title { font-variant: small-caps; font-weight: 700; margin-bottom: 0.35rem; }
.macro-damage .section-title > label {
  display: block;
  text-align: center;
  border: 1px solid var(--color-border-dark-3);
  border-radius: 4px;
  padding: 0.25rem;
  font-size: 1.05rem;
  color: var(--color-text-dark-primary);
}
.macro-damage .flexrow.parameter { align-items: center; justify-content: space-between; gap: 0.5rem; padding-block: 0.2rem; }
.macro-damage .flexrow.parameter label { margin: 0; color: var(--color-text-dark-primary); }
.macro-damage .member-list {
  max-height: 235px;
  overflow-y: auto;
  border: 1px solid var(--color-border-dark-3);
  border-radius: 4px;
  padding: 0.35rem;
  background: rgba(255, 255, 255, 0.7);
}
.macro-damage .target-line { align-items: center; gap: 0.45rem; padding: 0.15rem 0.1rem; }
.macro-damage .target-line .checkbox-label { margin: 0; border: none; color: var(--color-text-dark-primary); }
.macro-damage .target-empty { opacity: 0.8; font-style: italic; color: var(--color-text-dark-primary); }
.macro-damage input:disabled { opacity: 0.7; }
</style>`;

const content = `
${style}
<form>
  <div class="console flexrow macro-damage">
    <div id="parameters">
      <div class="form-group flexcol" id="damage-criteria">
        <div class="form-group section-title"><label>Set Damage Criteria</label></div>

        <div class="form-group">
          <label for="damageFormula">Damage Formula</label>
          <input type="text" id="damageFormula" name="damageFormula" value="1d10" />
        </div>

        <div class="flexrow parameter option" id="option-randomDamage">
          <label for="randomiseDamage">Randomise Damage</label>
          <input type="checkbox" id="randomiseDamage" name="randomiseDamage" />
        </div>

        <div class="form-group custom-select">
          <label for="selectedHitLocation">Hit Location</label>
          <select name="selectedHitLocation" id="selectedHitLocation">
            ${Utility.getHitLocationOptions()
              .map((o) => `<option value="${o.value}">${o.label}</option>`)
              .join("")}
          </select>
        </div>

        <div class="flexrow parameter option" id="option-randomHitLocation">
          <label for="randomiseHitLocation">Randomise Hit Location</label>
          <input type="checkbox" id="randomiseHitLocation" name="randomiseHitLocation" />
        </div>
      </div>

      <div class="form-group flexcol" id="damage-options">
        <div class="form-group section-title"><label>Set Options</label></div>

        <div class="flexrow parameter" id="option-ignoreTB">
          <label for="ignoreTB">Ignore TB</label>
          <input type="checkbox" id="ignoreTB" name="ignoreTB" />
        </div>

        <div class="flexrow parameter" id="option-ignoreAP">
          <label for="ignoreAP">Ignore AP</label>
          <input type="checkbox" id="ignoreAP" name="ignoreAP" />
        </div>

        <div class="flexrow parameter" id="option-minimumOne">
          <label for="minimumOne">Minimum 1 Damage</label>
          <input type="checkbox" id="minimumOne" name="minimumOne" checked />
        </div>
      </div>
    </div>

    <div id="app-targets">
      <div class="form-group flexcol" id="group-members">
        <div class="form-group section-title"><label>Choose Targets</label></div>
        <div class="member-list">${buildTargetListHtml()}</div>
      </div>
    </div>
  </div>
</form>`;

new Dialog(
  {
    title: "Damage",
    content,
    render: async (html) => {
      const form = html[0].querySelector("form");
      const damageInput = form.querySelector("#damageFormula");
      const randomiseDamage = form.querySelector("#randomiseDamage");
      const hitLocation = form.querySelector("#selectedHitLocation");
      const randomiseHitLocation = form.querySelector("#randomiseHitLocation");

      const syncDamageRandomization = async () => {
        const deterministic = await isDeterministicFormula(damageInput.value || "0");
        randomiseDamage.disabled = deterministic;
        if (deterministic) randomiseDamage.checked = false;
      };

      const syncHitLocationRandomization = () => {
        randomiseHitLocation.disabled = hitLocation.value !== "roll";
        if (hitLocation.value !== "roll") randomiseHitLocation.checked = false;
      };

      damageInput.addEventListener("change", () => {
        syncDamageRandomization();
      });
      hitLocation.addEventListener("change", () => {
        syncHitLocationRandomization();
      });

      await syncDamageRandomization();
      syncHitLocationRandomization();
    },
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: "Apply",
        callback: async (html) => {
          const data = new FormDataExtended(html[0].querySelector("form")).object;

          if (!data.damageFormula || `${data.damageFormula}`.trim() === "") {
            return ui.notifications.error("Damage formula is required.");
          }

          try {
            await evaluateDamageFormula(`${data.damageFormula}`);
          } catch {
            return ui.notifications.error("Invalid damage formula.");
          }

          const selected = data.targetActors;
          const actorIds = (Array.isArray(selected) ? selected : [selected]).filter((id) => typeof id === "string" && id.length > 0);
          if (!actorIds.length) {
            return ui.notifications.error("Select at least one character.");
          }

          const options = {
            damageFormula: `${data.damageFormula}`,
            randomiseDamage: Boolean(data.randomiseDamage),
            selectedHitLocation: data.selectedHitLocation || "roll",
            randomiseHitLocation: Boolean(data.randomiseHitLocation),
            ignoreAP: Boolean(data.ignoreAP),
            ignoreTB: Boolean(data.ignoreTB),
            minimumOne: Boolean(data.minimumOne)
          };
          options.damageType = getDamageType(options);

          await applyDamageToActors(options, actorIds);
        }
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: "Cancel"
      }
    },
    default: "yes"
  },
  {
    width: 740,
    classes: ["standard-form"]
  }
).render(true);
