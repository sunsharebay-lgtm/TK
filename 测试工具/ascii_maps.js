const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8");
const m=html.match(/const STAGES = (\[[\s\S]*?\]);\n\n\/\* 出生点/);
const STAGES=eval(m[1]);
const ch={B:"█",S:"▓",W:"~",T:"♣",I:"❄",".":" "};
for(const i of [12,13,14]){
  const s=STAGES[i];
  console.log(`\n===== #${i} ${s.en} (${s.name}) enemies=[${s.enemies}] lava=${!!s.lava} =====`);
  const rows=s.rows.map(r=>String(r).padEnd(26,"."));
  for(const r of rows){
    let line="";
    for(const c of r){ line += ch[c]||c; }
    console.log("│"+line+"│");
  }
}
