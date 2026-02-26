// Adapted from @silentmark repo
// https://github.com/silentmark/wfrp4e-pl-addons/blob/main/scripts/auto-engaged.mjs

class EngagementMemory {
  constructor() {
    this.groups = [];
  }

  reset() {
    this.groups = [];
  }

  /**
   * @param {Token[]} tokens
   * @param {string[]} [preferredTokenIds]
   */
  add(tokens, preferredTokenIds = []) {
    const tokenIds = [];
    for (const tokenId of tokens.map((t) => t?.id).filter(Boolean)) {
      if (!tokenIds.includes(tokenId)) tokenIds.push(tokenId);
    }
    if (tokenIds.length < 2) return;

    const existingGroups = this.groups.filter((group) => tokenIds.some((tokenId) => group.contains(tokenId)));
    const preferredGroups = existingGroups.filter((group) => preferredTokenIds.some((tokenId) => group.contains(tokenId)));
    const group = preferredGroups[0] ?? existingGroups[0] ?? new Engagement();
    if (!existingGroups.length) {
      this.groups.push(group);
    }

    for (const tokenId of tokenIds) {
      group.addToken(tokenId);
    }

    for (const oldGroup of existingGroups) {
      if (oldGroup === group) continue;
      for (const tokenId of oldGroup.tokens()) {
        group.addToken(tokenId);
      }
      this.groups = this.groups.filter((g) => g !== oldGroup);
    }

    // Invariant: one token can belong to one engagement only.
    for (const otherGroup of this.groups) {
      if (otherGroup === group) continue;
      for (const tokenId of tokenIds) {
        otherGroup.removeToken(tokenId);
      }
    }
    this.groups = this.groups.filter((g) => g.size() >= 2);
  }

  /**
   * @param {string} tokenId
   * @returns {string[]}
   */
  combatants(tokenId) {
    const group = this.groups.find((g) => g.contains(tokenId));
    if (!group) return [];
    return group.combatants(tokenId);
  }

  /**
   * @param {string} tokenId
   * @returns {string[]}
   */
  remove(tokenId) {
    const group = this.groups.find((g) => g.contains(tokenId));
    if (!group) return [];

    group.removeToken(tokenId);
    if (group.size() >= 2) return [];

    const orphaned = group.tokens();
    this.groups = this.groups.filter((g) => g !== group);
    return orphaned;
  }
}

class Engagement {
  constructor() {
    this.tokenIds = [];
  }

  /**
   * @param {string} tokenId
   */
  addToken(tokenId) {
    if (!this.tokenIds.includes(tokenId)) {
      this.tokenIds.push(tokenId);
    }
  }

  /**
   * @param {string} tokenId
   * @returns {boolean}
   */
  contains(tokenId) {
    return this.tokenIds.includes(tokenId);
  }

  /**
   * @param {string} tokenId
   */
  removeToken(tokenId) {
    this.tokenIds = this.tokenIds.filter((id) => id !== tokenId);
  }

  /**
   * @param {string} tokenId
   * @returns {string[]}
   */
  combatants(tokenId) {
    return this.tokenIds.filter((id) => id !== tokenId);
  }

  /**
   * @returns {number}
   */
  size() {
    return this.tokenIds.length;
  }

  /**
   * @returns {string[]}
   */
  tokens() {
    return [...this.tokenIds];
  }
}

const engagementMemory = new EngagementMemory();

/**
 * @param {Token} token
 * @param {number} [x]
 * @param {number} [y]
 * @returns {{x:number,y:number,w:number,h:number}}
 */
function tokenBox(token, x = token.x, y = token.y) {
  return {
    x,
    y,
    w: token.hitArea?.width ?? token.w ?? 0,
    h: token.hitArea?.height ?? token.h ?? 0
  };
}

/**
 * @param {{x:number,y:number,w:number,h:number}} a
 * @param {{x:number,y:number,w:number,h:number}} b
 * @returns {boolean}
 */
function intersects(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

/**
 * @param {Token} movedToken
 * @param {Token} otherToken
 * @param {number} movedX
 * @param {number} movedY
 * @returns {boolean}
 */
function areAdjacent(movedToken, otherToken, movedX, movedY) {
  if (!movedToken?.hitArea || !otherToken?.hitArea) return false;

  const gridX = canvas.grid?.grid?.w ?? canvas.grid?.size ?? 0;
  const gridY = canvas.grid?.grid?.h ?? canvas.grid?.size ?? 0;
  const margin = 5;
  const a = tokenBox(movedToken, movedX, movedY);
  const b = tokenBox(otherToken);
  const expanded = {
    x: a.x - gridX + margin,
    y: a.y - gridY + margin,
    w: a.w + 2 * gridX - 2 * margin,
    h: a.h + 2 * gridY - 2 * margin
  };
  return intersects(expanded, b);
}

/**
 * @param {Object} test
 * @returns {Token[]}
 */
function resolveAttackerTokens(test) {
  const activeTokens = test.actor?.getActiveTokens?.(true, true) ?? [];
  if (activeTokens.length) return activeTokens;

  const tokenId = test.context?.speaker?.token;
  const token = tokenId ? canvas.tokens.get(tokenId) : null;
  return token ? [token] : [];
}

/**
 * @param {Object} test
 * @returns {Token[]}
 */
function resolveTargetTokens(test) {
  return (test.context?.targets ?? []).map((target) => game.wfrp4e.utility.getToken(target)).filter((t) => !!t?.actor);
}

/**
 * @param {Object} test
 */
function rememberEngagement(test) {
  const attackers = resolveAttackerTokens(test);
  const targets = resolveTargetTokens(test);
  const participants = [...attackers, ...targets];
  engagementMemory.add(
    participants,
    targets.map((t) => t.id)
  );
}

/**
 * @param {Token} token
 * @param {number} newX
 * @param {number} newY
 * @returns {Promise<void>}
 */
async function clearIfDisengaged(token, newX, newY) {
  const combatants = engagementMemory
    .combatants(token.id)
    .map((id) => canvas.tokens.get(id))
    .filter(Boolean);

  if (!combatants.length) return;
  if (combatants.some((combatant) => areAdjacent(token, combatant, newX, newY))) return;

  const orphaned = engagementMemory.remove(token.id);
  await token.actor?.removeCondition("engaged");
  for (const peerId of orphaned) {
    await canvas.tokens.get(peerId)?.actor?.removeCondition("engaged");
  }
}

/**
 * @param {Token[]} targets
 */
function applyEngagedToTargets(targets) {
  if (game.user.isGM) {
    targets.forEach((token) => token.actor.addCondition("engaged"));
  } else {
    targets.forEach((token) => SocketHandlers.executeOnOwner(token.actor, "addCondition", {condition: "engaged", actorId: token.actor.id}));
  }
}

/**
 * @param {Object} test
 */
function onMeleeRoll(test) {
  if (test.item.attackType !== "melee" || !test.context.targets?.length) return;

  const targets = resolveTargetTokens(test);
  if (!targets.length) return;

  rememberEngagement(test);
  test.actor.addCondition("engaged");
  applyEngagedToTargets(targets);
}

/**
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
function isEngagedEffect(effect) {
  if (!effect) return false;
  if (effect.conditionId === "engaged") return true;
  if (effect.getFlag?.("core", "statusId") === "engaged") return true;
  return effect.statuses?.has?.("engaged") ?? false;
}

/**
 * Removes all active tokens of actor from engagement memory.
 * @param {Actor} actor
 */
function removeActorFromEngagements(actor) {
  if (!actor) return;
  const tokens = actor.getActiveTokens?.(true, true) ?? [];
  for (const token of tokens) {
    const orphaned = engagementMemory.remove(token.id);
    for (const orphanId of orphaned) {
      canvas.tokens.get(orphanId)?.actor?.removeCondition("engaged");
    }
  }
}

export function setupAutoEngaged() {
  SocketHandlers.addCondition = async function ({condition, actorId}) {
    const actor = game.actors.get(actorId);
    const owner = actor ? game.wfrp4e.utility.getActiveDocumentOwner(actor) : null;
    if (owner?.id === game.user.id) {
      await actor.addCondition(condition);
    }
  };

  Hooks.on("canvasReady", () => engagementMemory.reset());
  Hooks.on("deleteToken", (tokenDocument) => engagementMemory.remove(tokenDocument.id));
  Hooks.on("updateToken", async (tokenDocument, data) => {
    if (!game.user.isGM) return;

    const moved = Object.prototype.hasOwnProperty.call(data, "x") || Object.prototype.hasOwnProperty.call(data, "y");
    if (!moved) return;

    const token = canvas.tokens.get(tokenDocument.id);
    if (!token?.hitArea) return;

    const tokenX = data.x ?? token.x;
    const tokenY = data.y ?? token.y;
    await clearIfDisengaged(token, tokenX, tokenY);
  });

  Hooks.on("deleteActiveEffect", (effect) => {
    if (!isEngagedEffect(effect)) return;
    removeActorFromEngagements(effect.parent);
  });

  Hooks.on("updateActiveEffect", (effect, changes) => {
    if (!isEngagedEffect(effect)) return;
    const disabledChanged = Object.prototype.hasOwnProperty.call(changes, "disabled");
    const statusRemoved = Object.prototype.hasOwnProperty.call(changes, "statuses") && !(changes.statuses ?? []).includes?.("engaged");
    if ((disabledChanged && effect.disabled) || statusRemoved) {
      removeActorFromEngagements(effect.parent);
    }
  });

  Hooks.on("wfrp4e:rollWeaponTest", onMeleeRoll);
  Hooks.on("wfrp4e:rollTraitTest", onMeleeRoll);
}
