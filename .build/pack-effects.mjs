import fs from "fs";
import {outputFileSync} from "fs-extra/esm";

let path = "scripts/effects/";
let scripts = fs.readdirSync(path);
let effectCount = 0;
let scriptObj = {};
for (let file of scripts) {
  scriptObj[file.split(".")[0]] = fs.readFileSync(path + file, {encoding: "utf8"});
  effectCount++;
}

outputFileSync("packs/effects.json", JSON.stringify(scriptObj, null, 2), {encoding: "utf8"});
console.log(`Packed ${effectCount} scripts`);
