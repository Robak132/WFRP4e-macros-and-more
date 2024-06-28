import path from "node:path";
import fs from "node:fs";
import {Utility} from "./scripts/utility.mjs";

const input_path = "macros";
const output_path = "src/packs/macros";

let macrosData = JSON.parse(fs.readFileSync("macros.data.json"))
for (let file of fs.readdirSync(input_path)) {
  let fileName = file.split(".")[0];
  if (fileName !== "partials") {
    let data = fs.readFileSync(path.join(input_path, `${fileName}.js`), "utf8");
    if (!macrosData[fileName]) {
      macrosData[fileName] = {"_id": Utility.randomID()};
    }
    macrosData[fileName]["code_file"] = file
  }
}
for (let file of fs.readdirSync(output_path)) {
  let fileName = file.split('.')[0];
  let data = JSON.parse(fs.readFileSync(path.join(output_path, `${fileName}.json`), 'utf8'));
  let m = Object.values(macrosData).find(m => m._id === data._id)
  if (!m) {
    macrosData[data.id] = data;
  } else {
    m = Object.assign(m, data);
  }
}

fs.writeFileSync("macros.data.json", JSON.stringify(macrosData, null, 2) + "\n", "utf8");
