import {extractPack} from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const input_path = "../src/macros";
const json_path = "../src/packs/macros";
const output_path = "../packs/macros";
const macrosData = JSON.parse(fs.readFileSync(".build/macros.data.json"));

function changeEndLineSignToSystem(text) {
  const IS_WIN = typeof process !== "undefined" && process.platform === "win32";
  if (IS_WIN) {
    return text.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n");
  } else {
    return text.replaceAll("\r\n", "\n");
  }
}

function hash(str) {
  if (!str) return undefined;
  str = str.replace("\r\n", "\n");
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  let hex = (hash >>> 0).toString(16);
  return hex.padStart(8, "0");
}

await extractPack(output_path, json_path, {log: false})
  .then(() => Utility.log("Pack extraction complete."))
  .catch((err) => Utility.log(err.message));

for (let filepath of fs.readdirSync(json_path)) {
  let json = JSON.parse(fs.readFileSync(path.join(json_path, filepath), "utf8"));
  let command = changeEndLineSignToSystem(json.command);
  let codeFile = macrosData.macros.find((macro) => macro._id === json._id)["codeFile"];
  let originalFile = fs.readFileSync(path.join(input_path, codeFile), "utf8");
  if (hash(originalFile) !== hash(command)) {
    fs.writeFileSync(path.join(input_path, codeFile + ".old"), originalFile, "utf8");
    fs.writeFileSync(path.join(input_path, codeFile), command, "utf8");
  }
}
