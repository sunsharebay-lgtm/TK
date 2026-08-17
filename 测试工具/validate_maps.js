#!/usr/bin/env node
/* 坦克大战 · 地图校验脚本
 * 从 坦克大战.html 提取 STAGES，校验：
 *  1) 26 行 x 26 列
 *  2) 字符合法 (B S W T I .)
 *  3) 出生点/玩家出生点/基地 的 2x2 区域可清空且可达（深度>=8）
 * 与游戏内 validateStages 使用相同规则（硬障碍 = B/S/W，出生点会被清空）。
 */
const fs = require("fs");
const path = require("path");

const FILE = process.argv[2] || path.join(__dirname, "..", "坦克大战", "坦克大战.html");
const html = fs.readFileSync(FILE, "utf8");

const GN = 26;
const TE = { EMPTY:0, BRICK:1, STEEL:2, WATER:3, TREE:4, ICE:5, BASE:6, BORDER:7 };
const CH2TE = { ".":TE.EMPTY, "B":TE.BRICK, "S":TE.STEEL, "W":TE.WATER, "T":TE.TREE, "I":TE.ICE, "D":TE.SAND };

const SPAWN_CELLS = [[0,0],[12,0],[24,0],[4,0],[20,0]];
const PLAYER_SPAWNS = [[8,24],[16,24]];
const BASE_GX = 12, BASE_GY = 24;

// ---- 提取 STAGES ----
const m = html.match(/const STAGES = (\[[\s\S]*?\]);/);
if(!m){ console.error("无法定位 STAGES 数组"); process.exit(1); }
let STAGES;
try {
  STAGES = eval(m[1]);   // 数组字面量本身是合法 JS
} catch(e) { console.error("STAGES 解析失败:", e.message); process.exit(1); }

// ---- 出生通道常量 ----
const CAMPAIGN_STAGE_IDS = extractCampaign(html);

function extractCampaign(html){
  const mm = html.match(/const CAMPAIGN_STAGE_IDS = (\[[^\]]*\]);/);
  return mm ? eval(mm[1]) : null;
}

let problems = 0;
function report(title, ok, detail){
  const mark = ok ? "  OK " : "FAIL ";
  if(!ok) problems++;
  console.log(`[${mark}] ${title}${detail ? "  · " + detail : ""}`);
}

function normalizeStage(rows){
  const out = [];
  for(let r=0;r<GN;r++){
    let s = rows[r] !== undefined ? String(rows[r]) : "";
    if(s.length < GN) s = s + ".".repeat(GN - s.length);
    else if(s.length > GN) s = s.slice(0, GN);
    out.push(s);
  }
  return out;
}

console.log(`\n共 ${STAGES.length} 张地图，战役索引: ${JSON.stringify(CAMPAIGN_STAGE_IDS)}\n`);

STAGES.forEach((stage, idx) => {
  const label = `#${String(idx).padStart(2,"0")} ${stage.name||"?"} (${stage.en||""})`;
  const rows = normalizeStage(stage.rows);

  // 1) 行列数
  const rowLens = [...new Set(rows.map(r=>r.length))];
  report(`${label} 行×列 26×26`, rows.length === GN && rowLens.length === 1 && rowLens[0] === GN, `rows=${rows.length} cols=${rowLens.join(",")}`);

  // 2) 字符合法
  const badChars = new Set();
  for(const r of rows) for(const ch of r) if(!(ch in CH2TE)) badChars.add(ch);
  report(`${label} 字符合法`, badChars.size === 0, badChars.size ? `非法字符: ${[...badChars].join(",")}` : "");

  // 3) 可达性（硬障碍 = B/S/W）
  const grid = rows.map(r=>r.split(""));
  const clear = (gx, gy) => {
    for(let y=gy; y<gy+2; y++) for(let x=gx; x<gx+2; x++)
      if(x>=0 && y>=0 && x<GN && y<GN) grid[y][x] = ".";
  };
  for(const [gx,gy] of SPAWN_CELLS) clear(gx,gy);
  for(const [gx,gy] of PLAYER_SPAWNS) clear(gx,gy);
  clear(BASE_GX, BASE_GY);

  const hard = (g, x,y)=>{
    if(x<0 || y<0 || x+1>=GN || y+1>=GN) return true;
    for(let yy=y; yy<y+2; yy++) for(let xx=x; xx<x+2; xx++){
      if("BSW".includes(g[yy][xx])) return true;
    }
    return false;
  };
  const key = (x,y)=>y*GN+x;
  const reachableFrom = (g, start)=>{
    const q=[start], seen=new Set([key(...start)]);
    while(q.length){
      const [x,y]=q.shift();
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx, ny=y+dy, k=key(nx,ny);
        if(!seen.has(k) && !hard(g,nx,ny)){ seen.add(k); q.push([nx,ny]); }
      }
    }
    return seen;
  };
  const cloneGrid = ()=>grid.map(r=>r.slice());
  const clearOn = (g, gx, gy) => {
    for(let y=gy; y<gy+2; y++) for(let x=gx; x<gx+2; x++)
      if(x>=0 && y>=0 && x<GN && y<GN) g[y][x] = ".";
  };

  // 出生点：与游戏一致——无出口时运行时会把出生列向下清空到第 8 行（ensureSpawnExits）
  for(const start of SPAWN_CELLS){
    const g0 = cloneGrid();
    clearOn(g0, start[0], start[1]);
    let seen = reachableFrom(g0, start);
    let deep = [...seen].some(k=>Math.floor(k/GN) >= 8);
    let fixed = false;
    if(!deep){
      // 模拟 ensureSpawnExits 自动修复
      for(let y=start[1]+1; y<=8; y++) clearOn(g0, start[0], y);
      seen = reachableFrom(g0, start);
      deep = [...seen].some(k=>Math.floor(k/GN) >= 8);
      fixed = true;
    }
    report(`${label} 出生点(${start.join(",")}) 可达`, deep, `连通=${seen.size}${fixed ? " (运行时自动修复)" : ""}`);
  }
  for(const start of PLAYER_SPAWNS){
    const seen = reachableFrom(grid, start);
    const deep = [...seen].some(k=>Math.floor(k/GN) <= 16);
    report(`${label} 玩家(${start.join(",")}) 可达`, deep, `连通=${seen.size}`);
  }
  const bSeen = reachableFrom(grid, [BASE_GX, BASE_GY]);
  const bDeep = [...bSeen].some(k=>Math.floor(k/GN) <= 16);
  report(`${label} 基地可达`, bDeep, `连通=${bSeen.size}`);

  // 敌人配置合法性
  const en = stage.enemies;
  report(`${label} 敌人配置`, Array.isArray(en) && en.length===4 && en.every(v=>Number.isInteger(v)&&v>=0), JSON.stringify(en));
});

// ---- 战役索引检查 ----
if(CAMPAIGN_STAGE_IDS){
  for(const si of CAMPAIGN_STAGE_IDS){
    report(`战役索引 ${si} 存在`, si>=0 && si<STAGES.length, `第 ${STAGES[si]?.en} 关`);
  }
}

console.log(`\n${problems === 0 ? "✅ 全部通过" : "❌ 存在 " + problems + " 个问题"}`);
process.exit(problems === 0 ? 0 : 1);
