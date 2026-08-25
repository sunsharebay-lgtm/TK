const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../../坦克大战.html");
const target = path.resolve(__dirname, "../app/index.html");

if (!fs.existsSync(source)) {
  throw new Error(`Tank game source was not found: ${source}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`Synced ${path.relative(process.cwd(), source)} -> ${path.relative(process.cwd(), target)}`);
