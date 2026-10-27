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
  { name: "chapter-route", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 7000, keys: "", pre: "cases/chapter-route.pre.json", end: "cases/chapter-route.end.json" },
  { name: "xuzhou-return", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/xuzhou-return.pre.json", end: "cases/xuzhou-return.end.json" },
  { name: "village-letter", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/village-letter.pre.json", end: "cases/village-letter.end.json" },
  { name: "zheng-xuan", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 7000, keys: "", pre: "cases/zheng-xuan.pre.json", end: "cases/zheng-xuan.end.json" },
  { name: "chapter2-route", url: "http://localhost:8642/?autostart&goto=23,114,141", dur: 5000, keys: "", pre: "cases/chapter2-route.pre.json", end: "cases/chapter2-route.end.json" },
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
  if (c.keysOnce) args.push("--keys-once");
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
