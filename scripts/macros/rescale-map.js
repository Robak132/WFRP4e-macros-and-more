/* ==========
* MACRO: Rescale Map
* AUTHORS: Originally by @luvaderaposa, modified by @Robak132
* DESCRIPTION: Rescale map with walls, lights, tokens, notes, and drawings.
========== */

const ConfigurableDialog = game.robakMacros.configurableDialog;

let result = await ConfigurableDialog.oneRow({
  title: "Rescale Map",
  data: [
    {value: "Enter scale factor:"},
    {
      id: "scale",
      type: "input",
      value: "1",
      inputType: "number",
      style: `style="text-align: center" min="0.25" step="0.25"`
    }
  ]
});
if (!result) return;

let scale = Number(result.scale);
await canvas.scene.update({
  height: canvas.scene.height * scale,
  width: canvas.scene.width * scale,
  "grid.distance": canvas.scene.grid.distance / scale
});
await canvas.scene.updateEmbeddedDocuments(
  "Wall",
  canvas.scene.walls.map((w) => {
    return {_id: w.id, c: w.c.map((i) => i * scale)};
  })
);
await canvas.scene.updateEmbeddedDocuments(
  "AmbientLight",
  canvas.scene.lights.map((light) => {
    return {
      _id: light.id,
      "config.dim": light.config.dim * scale,
      "config.bright": light.config.bright * scale,
      x: light.x * scale,
      y: light.y * scale
    };
  })
);
await canvas.scene.updateEmbeddedDocuments(
  "Token",
  canvas.scene.tokens.map((token) => {
    return {_id: token.id, x: token.x * scale, y: token.y * scale};
  })
);
await canvas.scene.updateEmbeddedDocuments(
  "Note",
  canvas.scene.notes.map((note) => {
    return {_id: note.id, x: note.x * scale, y: note.y * scale};
  })
);
await canvas.scene.updateEmbeddedDocuments(
  "Drawing",
  canvas.scene.drawings.map((drawing) => {
    return {
      _id: drawing.id,
      x: drawing.x * scale,
      y: drawing.y * scale,
      "shape.height": drawing.shape.height * scale,
      "shape.width": drawing.shape.width * scale
    };
  })
);
