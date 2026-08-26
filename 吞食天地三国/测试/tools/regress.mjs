#!/usr/bin/env node
/* G3-R7: 统一回归框架——顺序执行全部 CDP 用例（cases/*.pre/end.json），汇总 PASS/FAIL 报告。
 * 用法：node 测试/tools/regress.mjs [--only name1,name2]
 * 依赖：本地 8642 服务（python3 -m http.server 8642 指向网页复刻目录）。 */
import { spawnSync, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(__dirname, "cdp-driver.mjs");
const BASE = "http://localhost:8642/?autostart&autointro=18&goto=23,114,141";

const CASES = [
  { name: "formation",   url: BASE,                  dur: 10000, keys: "Enter:300:6",        pre: "cases/formation.pre.json",   end: "cases/formation.end.json" },
  { name: "inn-core",    url: "http://localhost:8642/?autostart&autointro=18&goto=154,18,11", dur: 9000, keys: "ArrowUp:250:1", pre: "cases/inn-core.pre.json", end: "cases/inn-core.end.json" },
  { name: "persist",     url: BASE,                  dur: 8000,  keys: "Enter:300:4",        pre: "cases/persist-core.pre.json", end: "cases/persist-core.end.json" },
  { name: "grow",        url: BASE,                  dur: 9000,  keys: "Enter:400:2",        pre: "cases/grow-item.pre.json",   end: "cases/grow-item.end.json" },
  { name: "troop-events",url: BASE,                  dur: 9000,  keys: "Enter:300:4",        pre: "cases/troop-events.pre.json", end: "cases/troop-events.end.json" },
  { name: "menu-tour",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/menu-tour.pre.json", end: "cases/menu-tour.end.json" },
  { name: "audio-check", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 8000, keys: "", pre: "cases/audio-check.pre.json", end: "cases/audio-check.end.json" },
  { name: "ch1-victory", url: BASE,                  dur: 10000, keys: "",                  pre: "cases/ch1-victory.pre.json", end: "cases/ch1-victory.end.json" },
  { name: "storage",     url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "Enter:400:2", pre: "cases/storage.pre.json", end: "cases/storage.end.json" },
  { name: "shop",         url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "",                  pre: "cases/shop.pre.json",       end: "cases/shop.end.json" },
  { name: "title-continue", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 12000, pre: "cases/title-continue-a.pre.json", end: "cases/title-continue-b.end.json", mid: "cases/title-continue.mid.json", midAt: 4000 },
  { name: "skill-menu",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/skill-menu.pre.json", end: "cases/skill-menu.end.json" },
  { name: "equip-smoke", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/equip-smoke.pre.json", end: "cases/equip-smoke.end.json" },
  { name: "lineup",      url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/lineup.pre.json",       end: "cases/lineup.end.json" },
  { name: "battle-order", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 7000, keys: "Enter:250:3", pre: "cases/battle-order.pre.json", end: "cases/battle-order.end.json" },
  { name: "defeat-recover", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 9000, keys: "Enter:250:3", pre: "cases/defeat-recover.pre.json", end: "cases/defeat-recover.end.json" },
  { name: "tactic-formula", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 8000, keys: "Enter:250:3", pre: "cases/tactic-formula.pre.json", end: "cases/tactic-formula.end.json" },
  { name: "battle-item",   url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 7000, keys: "Enter:250:3", pre: "cases/battle-item.pre.json",   end: "cases/battle-item.end.json" },
  { name: "battle-scope",  url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 8000, keys: "Enter:250:3", pre: "cases/battle-scope.pre.json",  end: "cases/battle-scope.end.json" },
  { name: "menu-nav",      url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 6000, keys: "", pre: "cases/menu-nav.pre.json", end: "cases/menu-nav.end.json" },
  { name: "synth-shop",    url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-shop.pre.json", end: "cases/synth-shop.end.json" },
  { name: "synth-e2e",     url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/synth-e2e.end.json" },
  { name: "synth-interp",  url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/synth-interp.end.json" },
  { name: "action-cond",   url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/synth-empty.pre.json", end: "cases/action-cond.end.json" },
  { name: "equip-8slot", url: "http://localhost:8642/?autostart&autointro=18&goto=23,114,141", dur: 12000, keys: "Enter:300:4", pre: "cases/equip-8slot.pre.json", end: "cases/equip-8slot.end.json", custom: "equip8" },
];

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;

function okOf(name, result, custom) {
  if (!result) return false;
  if (typeof result === "string") {
    try { result = JSON.parse(result); } catch { return false; }
  }
  if (custom === "equip8") {
    return result.saveLoadMatch === true && Array.isArray(result.slots) && result.slots.every(s => s.ok !== false);
  }
  if (result.allOk === true) return true;
  if (Array.isArray(result.fails) && result.fails.length === 0) return true;
  return false;
}

let pass = 0, fail = 0;
const rows = [];
for (const c of CASES) {
  if (only && !only.includes(c.name)) continue;
  const args = [
    DRIVER, "--url", c.url, "--duration", String(c.dur),
    "--pre-eval-file", path.join(__dirname, c.pre),
    "--eval-file", path.join(__dirname, c.end),
    "--out", "/tmp/regress-" + c.name,
  ];
  if (c.keys) args.push("--keys", c.keys);
  if (c.mid) args.push("--mid-eval-file", path.join(__dirname, c.mid), "--mid-at", String(c.midAt || 3000));
  /* 每用例前清掉残留 9333（cdp-driver 自带的 pkill 因 execSync 未引入而失效） */
  try { execSync("pkill -f 'remote-debugging-port=9333' 2>/dev/null"); } catch { /* 无残留 */ }
  const r = spawnSync("node", args, { encoding: "utf8", timeout: 400000 });
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
  const ok = okOf(c.name, result, c.custom) && ex.length === 0 && cls.length === 0;
  ok ? pass++ : fail++;
  rows.push({ name: c.name, ok, ex, cls, result: result ? JSON.stringify(result).slice(0, 480) : endEval });
}

console.log("\n================ 回归汇总 ================");
for (const row of rows) {
  console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}  exceptions=${row.ex ? row.ex.length : 0} console=${row.cls.length ? JSON.stringify(row.cls) : 0}`);
  if (!row.ok) console.log(`      result: ${row.result}`);
}
console.log(`\n通过 ${pass}/${rows.length}`);
process.exit(fail ? 1 : 0);