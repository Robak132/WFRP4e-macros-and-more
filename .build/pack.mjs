import path from "path";
import fs from "fs";
import {compilePack} from "@foundryvtt/foundryvtt-cli";

const inputPath = "../src/macros";
const jsonPath = "../src/packs/macros";
const outputPath = "../packs/macros";
const macrosData = JSON.parse(fs.readFileSync("macros.data.json"));

function transformData(macro) {
  const data = fs.readFileSync(path.join(inputPath, macro.codeFile), "utf8");
  macro.command = data.replaceAll("\r\n", "\n");
  macro.flags = {
    "wfrp4e-macros-and-more": {
      version: macro.version,
      sourceId: macro._id
    }
  };
  macro = Object.keys(macro)
    .sort()
    .reduce((acc, c) => {
      acc[c] = macro[c];
      return acc;
    }, {});
  macro._key = `!macros!${macro._id}`;
  delete macro.version;
  delete macro.codeFile;
  return macro;
}

for (let filepath of fs.readdirSync(jsonPath)) {
  fs.unlinkSync(path.join(jsonPath, filepath));
}
for (let filepath of fs.readdirSync(inputPath, {recursive: true, withFileTypes: true})) {
  if (!filepath.isFile() || !filepath.name.endsWith(".js")) {
    continue;
  }
  filepath = filepath.name;
  let macro = macrosData.macros.find((m) => m.codeFile === filepath);
  if (!macro) {
    console.error(`No entry for ${filepath}`);
    continue;
  }

  const fileName = `${macro.name.replace(/[^A-Za-z0-9]/gi, "_")}_${macro._id}.json`;
  let fileData = macrosData.common;
  fileData = Object.assign(fileData, macro);
  fileData = transformData(fileData);
  fs.writeFileSync(path.join(jsonPath, fileName), JSON.stringify(fileData, null, 2) + "\n", "utf8");
}
compilePack(jsonPath, outputPath, {log: false})
  .then(() => console.log("Pack compilation complete."))
  .catch((err) => console.log(err.message));
