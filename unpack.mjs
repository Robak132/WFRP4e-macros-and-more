import {extractPack} from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const input_path = "macros";
const json_path = "src/packs/macros";
const output_path = "packs/macros";
const macrosData = JSON.parse(fs.readFileSync("macros.data.json"));

await extractPack(output_path, json_path, {log: true})
  .then(() => console.log("Pack extraction complete."))
  .catch((err) => console.log(err.message));

for (let filepath of fs.readdirSync(json_path)) {
  let json = JSON.parse(fs.readFileSync(path.join(json_path, filepath), "utf8"));
  let code_file = macrosData.macros.find((macro) => macro._id === json._id)["code_file"];
  fs.writeFileSync(path.join(input_path, code_file), json.command, "utf8");
}
