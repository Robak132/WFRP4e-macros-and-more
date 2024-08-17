import {compilePack} from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const srcPath = "src";
const outputPath = "packs";

for (let filepath of fs.readdirSync(srcPath)) {
  let finalSrcPath = path.join(srcPath, filepath);
  let finalOutputPath = path.join(outputPath, filepath);
  console.log(`Compiling pack: ${finalSrcPath} to ${finalOutputPath}`);
  await compilePack(finalSrcPath, finalOutputPath, {log: false})
    .then(() => console.log("Pack compilation complete."))
    .catch((err) => console.log(err.message));
}
