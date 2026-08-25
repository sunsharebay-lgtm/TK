#!/usr/bin/env node
/* 第一章路线扫描器：遍历全部地图 JSON，定位关键战斗事件（troop 16/17/19/20）、
 * 关键地名（徐州/寿春/山洞等）与地图出口（code 201），输出路线 JSON。
 * 用法：node scan-chapter1.mjs [baseURL] [outJSON] */
const ASSETS = process.argv[2] || "http://localhost:8642/assets/data";
const OUT = process.argv[3] || "/tmp/ch1-route.json";

const js = await (await fetch(`${ASSETS}/troops.json`)).json();
const troopNames = {};
for (const t of js) { if (t) troopNames[t.id] = t.name ?? `troop${t.id}`; }
const targetTroops = new Set([16, 17, 19, 20]);
const keyWords = ["徐州", "寿春", "山洞", "迷宫", "城", "宫", "寨", "村", "关", "王宫"];

const maps = [];
for (let id = 1; id <= 566; id++) {
  const f = `map${String(id).padStart(3, "0")}.json`;
  let m;
  try { m = await (await fetch(`${ASSETS}/${f}`)).json(); } catch { continue; }
  const rec = { id, name: m.displayName || `map${id}`, battles: [], exits: [], encounters: (m.encounterList || []).map(e => e.troopId) };
  let relevant = keyWords.some(k => rec.name.includes(k));
  for (const ev of m.events || []) {
    if (!ev) continue;
    for (const pg of ev.pages || []) {
      for (const cmd of pg.list || []) {
        if (cmd.code === 301 && targetTroops.has(cmd.parameters[1])) {
          rec.battles.push({ troop: cmd.parameters[1], troopName: troopNames[cmd.parameters[1]] || "", event: ev.name, x: ev.x, y: ev.y, trigger: pg.trigger ?? 0, escape: cmd.parameters[2], lose: cmd.parameters[3] });
          relevant = true;
        }
        if (cmd.code === 201) rec.exits.push({ map: cmd.parameters[0], x: cmd.parameters[1], y: cmd.parameters[2], event: ev.name });
      }
    }
  }
  if (relevant) maps.push(rec);
}
const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, JSON.stringify({ troopNames, keyMaps: maps }, null, 1));
console.log("key maps:", maps.length);
for (const m of maps) {
  if (m.battles.length) console.log(`map ${String(m.id).padStart(3)} ${m.name}: ` + m.battles.map(b => `${b.troopName}(${b.troop})@${b.x},${b.y} t${b.trigger}`).join(" | "));
}
for (const t of [...targetTroops]) {
  const hits = maps.filter(m => m.battles.some(b => b.troop === t));
  console.log(`TROOP ${t}(${troopNames[t]}): ` + (hits.length ? hits.map(h => `map${h.id} ${h.name} @${h.battles.find(b=>b.troop===t).x},${h.battles.find(b=>b.troop===t).y}`).join(" / ") : "NOT FOUND"));
}