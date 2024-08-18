import {extractPack} from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const srcPath = "src";
const output_path = "packs";

export const isDirectory = (path) => (fs.lstatSync(path) ? fs.lstatSync(path).isDirectory() : false);

for (let filepath of fs.readdirSync(output_path)) {
  let finalOutputPath = path.join(output_path, filepath);
  let finalSrcPath = path.join(srcPath, filepath);
  if (!isDirectory(finalOutputPath)) continue;
  console.log(`Extracting pack: ${finalOutputPath} to ${finalSrcPath}`);
  await extractPack(finalOutputPath, finalSrcPath, {log: false})
    .then(() => console.log("Pack extraction complete."))
    .catch((err) => console.log("Extraction error: " + err.message));
}
