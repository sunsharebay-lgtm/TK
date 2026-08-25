const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8");
const m=html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){console.error("no script");process.exit(1);}
fs.writeFileSync("/tmp/tank_game.js", m[1]);
console.log("extracted", m[1].length, "chars");
