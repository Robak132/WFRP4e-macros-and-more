import {extractPack} from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const input_path = "macros";
const json_path = "src/packs/macros";
const output_path = "packs/macros";
const macrosData = JSON.parse(fs.readFileSync("macros.data.json"));

// await extractPack(output_path, json_path, {log: false})
//   .then(() => console.log("Pack extraction complete."))
//   .catch((err) => console.log(err.message));

for (let filepath of fs.readdirSync(json_path)) {
  let json = JSON.parse(fs.readFileSync(path.join(json_path, filepath), "utf8"));
  console.log(filepath);
  let codeFile = macrosData.macros.find((macro) => macro._id === json._id)["codeFile"];
  fs.writeFileSync(path.join(input_path, codeFile), json.command, "utf8");
}
