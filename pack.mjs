import path from "path";
import fs from "fs";
import {compilePack} from "@foundryvtt/foundryvtt-cli";

const input_path = "macros";
const json_path = "src/packs/macros";
const output_path = "packs/macros";
const macrosData = JSON.parse(fs.readFileSync("macros.data.json"));

function transformData(macro) {
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

for (let filepath of fs.readdirSync(json_path)) {
  fs.unlinkSync(path.join(json_path, filepath));
}
for (const macro of macrosData.macros) {
  const fileName = `${macro.name.replace(/[^A-Za-z0-9]/gi, "_")}_${macro._id}.json`;
  let fileData = macrosData.common;
  fileData = Object.assign(fileData, macro);
  fileData = transformData(fileData);
  fs.writeFileSync(path.join(json_path, fileName), JSON.stringify(fileData, null, 2) + "\n", "utf8");
}

compilePack(json_path, output_path, {log: true})
  .then(() => console.log("Pack compilation complete."))
  .catch((err) => console.log(err.message));
