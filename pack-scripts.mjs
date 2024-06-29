import fs from "fs";

let path = "./effects/";
let scripts = fs.readdirSync(path);
let count = 0;
let scriptObj = {};
for (let file of scripts) {
  scriptObj[file.split(".")[0]] = fs.readFileSync(path + file, {encoding: "utf8"});
  count++;
}

let scriptLoader = `const effects = ${JSON.stringify(scriptObj, null, 2)};\n`;
scriptLoader += `Hooks.on("init", () => mergeObject(game.wfrp4e.config.effectScripts, effects));\n`;

fs.writeFileSync("./load-scripts.mjs", scriptLoader);
console.log(`Packed ${count} scripts`);
