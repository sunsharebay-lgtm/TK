#!/usr/bin/env node
/* 生成地图可视化预览 HTML */
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const m = html.match(/const STAGES = (\[[\s\S]*?\]);/);
const STAGES = eval(m[1]);
const CAMPAIGN = eval(html.match(/const CAMPAIGN_STAGE_IDS = (\[[^\]]*\]);/)[1]);
const GN = 26;

const COLORS = {
  ".":"#12161f", B:"#c4643a", S:"#98a3b5", W:"#17508f", T:"#2c7436", I:"#c3dff2"
};
const SPAWN = [[0,0],[12,0],[24,0],[4,0],[20,0]];
const PLAYER = [[8,24],[16,24]];

function cellGrid(stage){
  const rows = stage.rows;
  let out = "";
  for(let y=0;y<GN;y++){
    const row = String(rows[y]||"").padEnd(GN,".").slice(0,GN);
    for(let x=0;x<GN;x++){
      const ch = row[x] || ".";
      const c = COLORS[ch] || COLORS["."];
      let extra = "";
      if(SPAWN.some(([sx,sy])=>x>=sx&&x<sx+2&&y>=sy&&y<sy+2)) extra = " outline:1px solid rgba(255,80,80,.7);";
      else if(PLAYER.some(([sx,sy])=>x>=sx&&x<sx+2&&y>=sy&&y<sy+2)) extra = " outline:1px solid rgba(80,255,80,.8);";
      else if((x===12||x===13)&&(y===24||y===25)) extra = " outline:2px solid #ffd54a;";
      out += `<div class="c" style="background:${c};${extra}"></div>`;
    }
  }
  return out;
}

let body = "";
STAGES.forEach((s, i) => {
  const inCamp = CAMPAIGN.indexOf(i);
  const isNew = i >= 12;
  const tag = isNew ? '<span class="new">新增</span>' : '';
  const camp = inCamp >= 0 ? `<span class="camp">战役第${inCamp+1}关</span>` : '<span class="nope">素材库</span>';
  body += `<div class="map ${isNew?'isnew':''}">
    <div class="head"><span class="idx">#${String(i).padStart(2,"0")}</span> ${s.en} ${tag} ${camp}
      <span class="en">敌人 ${s.enemies.join("/")}${s.lava?' · 熔岩':''}</span></div>
    <div class="grid">${cellGrid(s)}</div>
  </div>`;
});

const out = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>坦克大战 · 地图预览</title>
<style>
body{background:#05070d;color:#e8eef7;font-family:ui-monospace,Menlo,Consolas,monospace;margin:0;padding:24px}
h1{letter-spacing:.3em;color:#43e8ff;font-size:16px}
.legend{display:flex;gap:14px;font-size:11px;margin:12px 0 20px;color:#8fa0bd;flex-wrap:wrap}
.legend .dot{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px}
.wrap{display:flex;flex-wrap:wrap;gap:16px}
.map{background:#0a0e17;border:1px solid rgba(140,170,215,.18);border-radius:10px;padding:10px}
.map.isnew{border-color:rgba(255,179,71,.6);box-shadow:0 0 18px rgba(255,179,71,.15)}
.head{font-size:12px;margin-bottom:8px;color:#c8d6ea;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.head .idx{color:#5f7593}.head .new{color:#ffb347;background:rgba(255,179,71,.15);border:1px solid rgba(255,179,71,.5);padding:1px 6px;border-radius:5px;font-size:9px}
.head .camp{color:#5ce08a;font-size:9px}.head .nope{color:#3f4b60;font-size:9px}
.head .en{color:#54637f;font-size:9px}
.grid{display:grid;grid-template-columns:repeat(26,12px);grid-template-rows:repeat(26,12px);gap:1px;background:#000}
.c{width:12px;height:12px;border-radius:1px}
</style></head><body>
<h1>坦克大战 · 地图预览（15 张）</h1>
<div class="legend">
  <span><span class="dot" style="background:#c4643a"></span>砖块</span>
  <span><span class="dot" style="background:#98a3b5"></span>钢铁</span>
  <span><span class="dot" style="background:#17508f"></span>水面/熔岩</span>
  <span><span class="dot" style="background:#2c7436"></span>树林</span>
  <span><span class="dot" style="background:#c3dff2"></span>冰面</span>
  <span><span class="dot" style="outline:1px solid rgba(255,80,80,.7);background:none"></span>敌出生</span>
  <span><span class="dot" style="outline:1px solid rgba(80,255,80,.8);background:none"></span>玩家</span>
  <span><span class="dot" style="outline:2px solid #ffd54a;background:none"></span>基地</span>
</div>
<div class="wrap">${body}</div>
</body></html>`;
fs.writeFileSync(process.argv[3], out);
console.log("written", process.argv[3]);
