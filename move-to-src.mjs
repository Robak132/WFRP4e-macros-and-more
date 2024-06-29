import path from "node:path";
import fs from "node:fs";

const input_path = "macros";
const output_path = "src/packs/macros";
const macrosData = JSON.parse(fs.readFileSync("macros.data.json"));

function transformData (macro) {
  const data = fs.readFileSync(path.join(input_path, macro.code_file), "utf8");
  macro.command = data.replace(/\r\n/g, "\n");
  macro.flags = {
    "wfrp4e-macros-and-more": {
      version: macro.version
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
  delete macro.code_file;
  return macro;
}

for (const macro of macrosData.macros) {
  const fileName = `${macro.name.replace(/[^A-Za-z0-9]/gi, "_")}_${macro._id}.json`;
  let fileData = macrosData.common;
  fileData = Object.assign(fileData, macro);
  fileData = transformData(fileData);
  fs.writeFileSync(path.join(output_path, fileName), JSON.stringify(fileData, null, 2) + "\n");
}
