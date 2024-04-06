const fs = require('node:fs');
const path = require('node:path');

const input_path = 'macros';
const output_path = 'src/packs/macros';
const ID_TABLE = {
  'aLO0KCxITOp3g4X8': 'add-xp-with-companions',
  'YcPRalpleYddyR1I': 'auto-pursuit',
  'JWjzBGehkaWilWJo': 'consume-alcohol',
  'QD63FDePjDK6qfIZ': 'initial-advantage-calculator',
  'BePzQIhToFpTWdJw': 'inventory-manager',
  'fz90AQ3MpUppcM6o': 'pay-credit-helper',
  'JNQ2WbcC5IagKBcS': 'random-vampire-weakness',
  'XYrbBmTx4lG7YEQG': 'roll-passive-talent',
  'pbZ7tQT51RcpTedj': 'sea-weather-generator',
  '4BGQJ4AjNqRqJOlI': 'show-weapons-remove',
  'gHpAH6Ozz5DVGpRP': 'show-weapons',
  'luVmQCZiZSUTxBPa': 'token-manipulator',
};

try {
  let obj = {};
  for (let file of fs.readdirSync(input_path)) {
    let fileName = file.split('.')[0];
    if (fileName !== "partials") {
      let data = fs.readFileSync(path.join(input_path, `${fileName}.js`), 'utf8');
      obj[fileName] = data.replace(/\r\n/g, '\n');
    }
  }
  for (let file of fs.readdirSync(output_path)) {
    let fileName = file.split('.')[0];
    let data = JSON.parse(fs.readFileSync(path.join(output_path, `${fileName}.json`), 'utf8'));
    data.command = obj[ID_TABLE[data._id]];
    fs.writeFileSync(`src/packs/macros/${fileName}.json`, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

} catch (err) {
  console.error(err);
}