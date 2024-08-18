let scale = 2;

await canvas.scene.update({"grid.distance": canvas.scene.grid.distance / scale});
await canvas.scene.update({height: canvas.scene.height * scale, width: canvas.scene.width * scale});
await canvas.scene.updateEmbeddedDocuments("Wall", canvas.scene.walls.map(w => {
  return {_id: w.id, c: w.c.map(i => i * scale)};
}));
await canvas.scene.updateEmbeddedDocuments("AmbientLight", canvas.scene.lights.map(light => {
  return {
    _id: light.id,
    "config.dim": light.config.dim * scale,
    "config.bright": light.config.bright * scale,
    x: light.x * scale,
    y: light.y * scale
  };
}));
await canvas.scene.updateEmbeddedDocuments("Token", canvas.scene.tokens.map(token => {
  return {_id: token.id, x: token.x * scale, y: token.y * scale};
}));
await canvas.scene.updateEmbeddedDocuments("Note", canvas.scene.notes.map(note => {
  return {_id: note.id, x: note.x * scale, y: note.y * scale};
}));
await canvas.scene.updateEmbeddedDocuments("Tile", canvas.scene.tiles.map(tile => {
  return {_id: tile.id, x: tile.x * scale, y: tile.y * scale};
}));