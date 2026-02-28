/* ==========
* MACRO: Initial Advantage Calculator
* AUTHOR: Robak132
* DESCRIPTION: Calculate initial advantage and applies it to actors.
========== */

function calculateAdvantage(html) {
  const advantage = $(html)
    .find("input[type='radio']:checked")
    .map((_, e) => {
      return {
        players: e.dataset.players ?? 0,
        enemy: e.dataset.enemies ?? 0
      };
    })
    .get();

  return {
    players: advantage.reduce((acc, x) => acc + Number(x.players), 0),
    enemies: advantage.reduce((acc, x) => acc + Number(x.enemy), 0)
  };
}

function renderLiveTotals(html) {
  const {players, enemies} = calculateAdvantage(html);
  $(html).find("#ia-live-players").text(players);
  $(html).find("#ia-live-enemies").text(enemies);
}

new Dialog(
  {
    title: "Initial Advantage",
    content: `<form class="ia-form">
  <style>
    .ia-form {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 0.2rem;
    }
    .ia-live {
      display: flex;
      gap: 1.2rem;
      align-items: center;
      padding: 0.35rem 0.5rem;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.35);
      font-weight: 700;
      justify-content: center;
    }
    .ia-live__value {
      font-weight: 700;
      min-width: 1.2rem;
      display: inline-block;
      text-align: center;
    }
    .ia-group {
      padding-bottom: 0.35rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    }
    .ia-title {
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.1rem;
      text-align: center;
    }
    .ia-desc {
      color: #4e463f;
      font-size: 0.82rem;
      line-height: 1.2;
      margin-bottom: 0.25rem;
    }
    .ia-options {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.7rem;
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 0.05rem;
    }
    .ia-option {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      margin: 0;
      font-size: 0.88rem;
    }
    .ia-option input {
      margin: 0;
    }
  </style>

  <div class="ia-group">
    <div class="ia-title">Manoeuvrability</div>
    <div class="ia-desc">One side possessing an advantage in movement such as being mounted or facing giant spiders in trees.</div>
    <div class="ia-options">
      <label class="ia-option"><input type="radio" name="manoeuvrability" data-players="2">Mobile Players</label>
      <label class="ia-option"><input type="radio" name="manoeuvrability" checked>Static forces</label>
      <label class="ia-option"><input type="radio" name="manoeuvrability" data-enemies="2">Mobile Enemies</label>
    </div>
  </div>

  <div class="ia-group">
    <div class="ia-title">Surprise</div>
    <div class="ia-desc">One side has achieved an unexpected assault.</div>
    <div class="ia-options">
      <label class="ia-option"><input type="radio" name="surprise" data-players="2">Surprised Enemies</label>
      <label class="ia-option"><input type="radio" name="surprise" checked>No surprise</label>
      <label class="ia-option"><input type="radio" name="surprise" data-enemies="2">Surprised Players</label>
    </div>
  </div>

  <div class="ia-group">
    <div class="ia-title">Outnumbering</div>
    <div class="ia-desc">Relative force size advantage.</div>
    <div class="ia-options">
      <label class="ia-option"><input type="radio" name="outnumbering" data-players="3">Players (>=3:1)</label>
      <label class="ia-option"><input type="radio" name="outnumbering" data-players="2">Players (>=2:1)</label>
      <label class="ia-option"><input type="radio" name="outnumbering" data-players="1">Players (>=1:1)</label>
      <label class="ia-option"><input type="radio" name="outnumbering" checked>Equal forces</label>
      <label class="ia-option"><input type="radio" name="outnumbering" data-enemies="1">Enemies (>=1:1)</label>
      <label class="ia-option"><input type="radio" name="outnumbering" data-enemies="2">Enemies (>=2:1)</label>
      <label class="ia-option"><input type="radio" name="outnumbering" data-enemies="3">Enemies (>=3:1)</label>
    </div>
  </div>

  <div class="ia-group">
    <div class="ia-title">Terrain</div>
    <div class="ia-desc">Light: Light fortification/cover or holding a beneficial position, such as a hill.<br>Heavy: Heavy cover or holding a key position such as a bridge.</div>
    <div class="ia-options">
      <label class="ia-option"><input type="radio" name="terrain" data-players="2">Heavy (Players)</label>
      <label class="ia-option"><input type="radio" name="terrain" data-players="1">Light (Players)</label>
      <label class="ia-option"><input type="radio" name="terrain" checked>Equal</label>
      <label class="ia-option"><input type="radio" name="terrain" data-enemies="1">Light (Enemies)</label>
      <label class="ia-option"><input type="radio" name="terrain" data-enemies="2">Heavy (Enemies)</label>
    </div>
  </div>

  <div class="ia-group">
    <div class="ia-title">Threat</div>
    <div class="ia-desc">Dangerous: A side possesses a dangerous threat such as a warpfire thrower, Ogre, or Troll.</br>Hazardous: A side possesses a hazardous threat, a match for several foes such as an organ gun, Manticore, or Griffon.<br>Extreme: A side possesses an extremely dangerous threat, a match for a dozen lesser foes such as a Dragon or Greater Daemon.</div>
    <div class="ia-options">
      <label class="ia-option"><input type="radio" name="threat" data-players="3">Extreme (Players)</label>
      <label class="ia-option"><input type="radio" name="threat" data-players="2">Hazardous (Players)</label>
      <label class="ia-option"><input type="radio" name="threat" data-players="1">Dangerous (Players)</label>
      <label class="ia-option"><input type="radio" name="threat" checked>None</label>
      <label class="ia-option"><input type="radio" name="threat" data-enemies="1">Dangerous (Enemies)</label>
      <label class="ia-option"><input type="radio" name="threat" data-enemies="2">Hazardous (Enemies)</label>
      <label class="ia-option"><input type="radio" name="threat" data-enemies="3">Extreme (Enemies)</label>
    </div>
  </div>

  <div class="ia-live">
    <span>Players: <span id="ia-live-players" class="ia-live__value">0</span></span>
    <span>Enemies: <span id="ia-live-enemies" class="ia-live__value">0</span></span>
  </div>
</form>`,
    buttons: {
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: game.i18n.localize("Cancel")
      },
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: game.i18n.localize("Apply"),
        callback: async (html) => await game.settings.set("wfrp4e", "groupAdvantageValues", calculateAdvantage(html))
      }
    },
    default: "no",
    render: (html) => {
      renderLiveTotals(html);
      $(html).on("change", "input[type='radio']", () => renderLiveTotals(html));
    }
  },
  {
    width: 980
  }
).render(true);
