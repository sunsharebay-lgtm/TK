#!/usr/bin/env node
/* G3-R7: 统一回归框架——顺序执行全部 CDP 用例（cases/*.pre/end.json），汇总 PASS/FAIL 报告。
 * 用法：node 测试/tools/regress.mjs [--only name1,name2]
 * 依赖：本地 8642 服务（python3 -m http.server 8642 指向网页复刻目录）。 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(__dirname, "cdp-driver.mjs");
const BASE = "http://localhost:8642/?autostart&autointro=18&goto=23,114,141";

const CASES = [
  { name: "formation",   url: BASE,                  dur: 10000, keys: "Enter:300:6",        pre: "cases/formation.pre.json",   end: "cases/formation.end.json" },
  { name: "inn-core",    url: "http://localhost:8642/?autostart&autointro=18&goto=154,18,11", dur: 9000, keys: "Enter:500:2", pre: "cases/inn-core-fixed.pre.json", end: "cases/inn-core-fixed.end.json" },
  { name: "persist",     url: BASE,                  dur: 8000,  keys: "Enter:300:4",        pre: "cases/persist-core.pre.json", end: "cases/persist-core.end.json" },
  { name: "recruit-level", url: BASE,                dur: 5000,  keys: "",                  pre: "cases/recruit-level.pre.json", end: "cases/recruit-level.end.json" },
  { name: "save-slot",    url: BASE,                  dur: 5000,  keys: "",                  pre: "cases/save-slot.pre.json", end: "cases/save-slot.end.json" },
  { name: "grow",        url: BASE,                  dur: 9000,  keys: "Enter:400:3",        keysOnce: true, pre: "cases/grow-item.pre.json",   end: "cases/grow-item.end.json" },
  { name: "troop-events",url: BASE,                  dur: 9000,  keys: "Enter:300:4",        pre: "cases/troop-events.pre.json", end: "cases/troop-events.end.json" },
  { name: "menu-tour",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/menu-tour.pre.json", end: "cases/menu-tour.end.json" },
  { name: "audio-check", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 8000, keys: "", pre: "cases/audio-check.pre.json", end: "cases/audio-check.end.json" },
  { name: "ch1-victory", url: BASE,                  dur: 10000, keys: "",                  pre: "cases/ch1-victory.pre.json", end: "cases/ch1-victory-fixed.end.json" },
  { name: "chapter-final", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/chapter-final.pre.json", end: "cases/chapter-final.end.json" },
  { name: "storage",     url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "Enter:400:2", pre: "cases/storage.pre.json", end: "cases/storage.end.json" },
  { name: "shop",         url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "",                  pre: "cases/shop.pre.json",       end: "cases/shop.end.json" },
  { name: "shop-sell",    url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "",                  pre: "cases/shop-sell.pre.json", end: "cases/shop-sell.end.json" },
  { name: "title-continue", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 12000, pre: "cases/title-continue-a.pre.json", end: "cases/title-continue-b.end.json", mid: "cases/title-continue.mid.json", midAt: 4000 },
  { name: "skill-menu",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/skill-menu.pre.json", end: "cases/skill-menu.end.json" },
  { name: "skill-target", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/skill-target.pre.json", end: "cases/skill-target.end.json" },
  { name: "item-menu",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/item-menu.pre.json", end: "cases/item-menu.end.json" },
  { name: "revival-target", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/revival-target.pre.json", end: "cases/revival-target.end.json" },
  { name: "equip-smoke", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/equip-smoke.pre.json", end: "cases/equip-smoke.end.json" },
  { name: "lineup",      url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/lineup.pre.json",       end: "cases/lineup.end.json" },
  { name: "battle-order", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 7000, keys: "Enter:250:3", pre: "cases/battle-order.pre.json", end: "cases/battle-order.end.json" },
  { name: "defeat-recover", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 9000, keys: "Enter:250:3", pre: "cases/defeat-recover.pre.json", end: "cases/defeat-recover.end.json" },
  { name: "tactic-formula", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 8000, keys: "", pre: "cases/tactic-formula.pre.json", end: "cases/tactic-formula.end.json" },
  { name: "battle-item",   url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 7000, keys: "Enter:250:3", pre: "cases/battle-item.pre.json",   end: "cases/battle-item.end.json" },
  { name: "battle-scope",  url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 8000, keys: "Enter:250:3", pre: "cases/battle-scope.pre.json",  end: "cases/battle-scope.end.json" },
  { name: "battle-bar",    url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/battle-bar.pre.json", end: "cases/battle-bar.end.json" },
  { name: "total-assault-speed", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 4000, keys: "", pre: "cases/total-assault-speed.pre.json", end: "cases/total-assault-speed.end.json" },
  { name: "enemy-retaliation", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/enemy-retaliation.pre.json", end: "cases/enemy-retaliation.end.json" },
  { name: "battle-rules",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/battle-rules.pre.json", end: "cases/battle-rules.end.json" },
  { name: "enemy-difficulty", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/enemy-difficulty.pre.json", end: "cases/enemy-difficulty.end.json" },
  { name: "world-encounter", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/world-encounter.pre.json", end: "cases/world-encounter.end.json" },
  { name: "chest-open",    url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/chest-open.pre.json", end: "cases/chest-open.end.json" },
  { name: "training-level", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/training-level.pre.json", end: "cases/training-level.end.json" },
  { name: "chapter-route", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 7000, keys: "Enter:160:1", pre: "cases/chapter-route.pre.json", end: "cases/chapter-route.end.json" },
  { name: "xuzhou-return", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/xuzhou-return.pre.json", end: "cases/xuzhou-return.end.json" },
  { name: "village-letter", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/village-letter.pre.json", end: "cases/village-letter.end.json" },
  { name: "zheng-xuan", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 7000, keys: "Enter:140:1", pre: "cases/zheng-xuan.pre.json", end: "cases/zheng-xuan.end.json" },
  { name: "chapter2-route", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 8000, keys: "Enter:140:1", pre: "cases/chapter2-route.pre.json", end: "cases/chapter2-route.end.json" },
  { name: "chapter-items", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/chapter-items.pre.json", end: "cases/chapter-items.end.json" },
  { name: "chapter-event-api", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/chapter-event-api.pre.json", end: "cases/chapter-event-api.end.json" },
  { name: "chapter-catalog", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/chapter-catalog.pre.json", end: "cases/chapter-catalog.end.json" },
  { name: "preview-center", url: "http://localhost:8642/?debug=1&preview=ch5-start", dur: 3000, keys: "", pre: "cases/preview-center.pre.json", end: "cases/preview-center.end.json" },
  { name: "boat-route", url: "http://localhost:8642/?autostart&goto=23,132,74", dur: 3500, keys: "", pre: "cases/boat-route.pre.json", end: "cases/boat-route.end.json" },
  { name: "boat-cutscene", url: "http://localhost:8642/?autostart&goto=23,132,74", dur: 15000, keys: "", pre: "cases/boat-cutscene.pre.json", end: "cases/boat-cutscene.end.json" },
  { name: "boat-encounter", url: "http://localhost:8642/?autostart&goto=23,132,74", dur: 2500, keys: "", pre: "cases/boat-encounter.pre.json", end: "cases/boat-encounter.end.json" },
  { name: "item-target", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 1800, keys: "Enter:350:1,Enter:350:1,Down:150:1,Enter:350:1", keysOnce: true, pre: "cases/item-target.pre.json", end: "cases/item-target.end.json" },
  { name: "title-return", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 1000, keys: "Enter:300:1", keysOnce: true, pre: "cases/title-return.pre.json", end: "cases/title-return.end.json" },
  { name: "map-item", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 1500, keys: "Enter:250:1,Enter:350:1", keysOnce: true, pre: "cases/map-item.pre.json", end: "cases/map-item.end.json" },
  { name: "battle-aoe", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 1500, keys: "", pre: "cases/battle-aoe.pre.json", end: "cases/battle-aoe.end.json" },
  { name: "equipment-unique", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/equipment-unique.pre.json", end: "cases/equipment-unique.end.json" },
  { name: "equipment-stack", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/equipment-stack.pre.json", end: "cases/equipment-stack.end.json" },
  { name: "damage-popup", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/damage-popup.pre.json", end: "cases/damage-popup.end.json" },
  { name: "menu-nav",      url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/menu-nav.pre.json", end: "cases/menu-nav.end.json" },
  { name: "menu-context",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/menu-context.pre.json", end: "cases/menu-context.end.json" },
  { name: "action-cond",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/action-cond.end.json" },
  { name: "step-state",    url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/step-state.end.json" },
  { name: "state-timing",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/state-timing.end.json" },
  { name: "drop-rate",     url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/drop-rate.end.json" },
  { name: "fast-attack",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/fast-attack.end.json" },
  { name: "multi-actions", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/multi-actions.end.json" },
  { name: "equip-8slot", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 12000, keys: "Enter:300:4", pre: "cases/equip-8slot.pre.json", end: "cases/equip-8slot.end.json", custom: "equip8" },
];

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;
if (only && only.some(name => !CASES.some(c => c.name === name))) throw new Error('Unknown regression case in --only');
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'three-kingdoms-regress-'));
const jobs = process.argv.includes('--jobs') ? Number(process.argv[process.argv.indexOf('--jobs') + 1]) : 1;
if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('--jobs must be between 1 and 4');
const selected = CASES.filter(c => !only || only.includes(c.name));
const children = new Set();
process.once('SIGTERM', () => { for (const child of children) child.kill(); process.exit(143); });
process.once('SIGINT', () => { for (const child of children) child.kill(); process.exit(130); });

function okOf(name, result, custom) {
  if (!result) return false;
  if (typeof result === "string") {
    try { result = JSON.parse(result); } catch { return false; }
  }
  if (custom === "equip8") {
    return result.saveLoadMatch === true && Array.isArray(result.slots) && result.slots.every(s => s.ok !== false);
  }
  if ('allOk' in result) return result.allOk === true && (!Array.isArray(result.fails) || result.fails.length === 0);
  if (Array.isArray(result.fails) && result.fails.length === 0) return true;
  return false;
}

let pass = 0, fail = 0;
const rows = [];
async function runCase(c) {
  const args = [
    DRIVER, "--url", c.url, "--duration", String(c.dur),
    "--pre-eval-file", path.join(__dirname, c.pre),
    "--eval-file", path.join(__dirname, c.end),
    "--out", path.join(outputRoot, c.name),
  ];
  if (c.keys) args.push("--keys", c.keys);
  if (c.keysOnce) args.push("--keys-once");
  if (c.mid) args.push("--mid-eval-file", path.join(__dirname, c.mid), "--mid-at", String(c.midAt || 3000));
  const r = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(child);
    let stdout = '', stderr = '';
    child.stdout.on('data', text => { stdout += text; });
    child.stderr.on('data', text => { stderr += text; });
    const timer = setTimeout(() => child.kill(), 120000);
    child.once('error', error => { stderr += error.message; });
    child.once('close', status => { clearTimeout(timer); children.delete(child); resolve({ stdout, stderr, status }); });
  });
  const raw = r.stdout || "";
  let data = null;
  const sIdx = raw.indexOf("{");
  if (sIdx >= 0) {
    try { data = JSON.parse(raw.slice(sIdx, raw.lastIndexOf("}") + 1)); } catch { data = null; }
  }
  const ex = (data && data.exceptions) || [];
  const cls = (data && data.consoleLogs || []).filter(x => x && x.txt && !/favicon/.test(String(x.txt))).map(x => x.txt);
  const endEval = data && data.evalResults && data.evalResults[0] ? data.evalResults[0].result : null;
  let result = null;
  if (endEval && !String(endEval).startsWith("EXC")) {
    try { result = JSON.parse(endEval); } catch { result = null; }
  } else if (String(endEval).startsWith("EXC")) { result = { __exc: endEval }; }
  const network = (data?.badResponses || []).filter(x => !/favicon\.ico/.test(x.url));
  const loadingFailures = (data?.failures || []).filter(x => x.errorText !== 'net::ERR_ABORTED');
  const ok = r.status === 0 && okOf(c.name, result, c.custom) && ex.length === 0 && cls.length === 0 && network.length === 0 && loadingFailures.length === 0;
  ok ? pass++ : fail++;
  rows.push({ name: c.name, ok, ex, cls, network, loadingFailures, stderr: r.stderr, result: result || endEval });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name} (${rows.length}/${selected.length})`);
  if (!ok) console.log(JSON.stringify(rows[rows.length - 1]));
}
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => {
  while (next < selected.length) await runCase(selected[next++]);
}));

console.log("\n================ 回归汇总 ================");
for (const row of rows) {
  console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}  exceptions=${row.ex ? row.ex.length : 0} console=${row.cls.length ? JSON.stringify(row.cls) : 0}`);
  if (!row.ok) console.log(`      details: ${JSON.stringify(row)}`);
}
console.log(`\n通过 ${pass}/${rows.length}`);
if (process.argv.includes('--report')) {
  const report = process.argv[process.argv.indexOf('--report') + 1];
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify({ pass, fail, rows }, null, 2) + '\n');
}
fs.rmSync(outputRoot, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
