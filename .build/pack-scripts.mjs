import fs from "fs";
import {outputFileSync} from "fs-extra/esm";

let path = "src/effects/";
let scripts = fs.readdirSync(path);
let count = 0;
let scriptObj = {};
for (let file of scripts) {
  scriptObj[file.split(".")[0]] = fs.readFileSync(path + file, {encoding: "utf8"});
  count++;
}

outputFileSync("data/effects.json", JSON.stringify(scriptObj, null, 2), {encoding: "utf8"});
console.log(`Packed ${count} scripts`);
