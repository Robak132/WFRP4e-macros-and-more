/* ==========
* MACRO: Reveal Fog of War
* AUTHORS: Originally by @mxzf, modified by @Robak132
* DESCRIPTION: Reveal Fog of War for all players.
========== */

const dimensions = canvas.scene.dimensions;
let [created_light] = await canvas.scene.createEmbeddedDocuments("AmbientLight", [
  {dim: dimensions.maxR, vision: true, walls: false, x: dimensions.width / 2, y: dimensions.height / 2}
]);
await new Promise((r) => setTimeout(r, 100));
await created_light.update({hidden: true});
await created_light.delete();
