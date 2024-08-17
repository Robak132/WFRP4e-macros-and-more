import fs from "fs";
import {outputFileSync} from "fs-extra/esm";
import path from "path";

const inputPath = "scripts/macros";
const jsonPath = "src/macros";
const macrosData = JSON.parse(fs.readFileSync(".build/macros.data.json"));
let macrosCount = 0;

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

if (fs.existsSync(jsonPath)) {
  for (let filepath of fs.readdirSync(jsonPath)) {
    fs.unlinkSync(path.join(jsonPath, filepath));
  }
}
let files = [];
for (let filepath of fs.readdirSync(inputPath, {recursive: true, withFileTypes: true})) {
  if (!filepath.isFile() || !filepath.name.endsWith(".js")) {
    continue;
  }
  files.push(filepath.name);
}
for (let macro of macrosData.macros) {
  if (!files.includes(macro.codeFile)) {
    console.error(`No file for ${macro.codeFile}`);
  }
}
for (let file of files) {
  let macro = macrosData.macros.find((m) => m.codeFile === file);
  if (!macro) {
    console.error(`No entry for ${file}`);
    continue;
  }

  const fileName = `${macro.name.replace(/[^A-Za-z0-9]/gi, "_")}_${macro._id}.json`;
  let fileData = macrosData.common;
  fileData = Object.assign(fileData, macro);
  fileData = transformData(fileData);
  outputFileSync(path.join(jsonPath, fileName), JSON.stringify(fileData, null, 2) + "\n", "utf8");
  macrosCount++;
}
console.log(`Saved ${macrosCount} macros`);
