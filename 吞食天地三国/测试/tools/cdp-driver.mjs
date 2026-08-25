#!/usr/bin/env node
/* CDP 无头驾驶工具：启动 Chrome headless，加载游戏页，定时截图，收集控制台错误/资源失败，按序发送按键，执行求值表达式。
 * 用法：
 *   node cdp-driver.mjs --url "http://localhost:8642/?autostart" \
 *     --duration 12000 --step 4000 --out /tmp/frames \
 *     --keys "Enter:300:5,Z:600:1" \
 *     --eval "T.SceneManager.current()?.constructor?.name" --eval "T.$gameParty?.gold()"
 * 输出：截图 /tmp/frames/<nnn>.png；JSON 汇总到 stdout。 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };

const url = opt("--url", "http://localhost:8642/");
const duration = Number(opt("--duration", "8000"));
const step = Number(opt("--step", "0"));
const outDir = opt("--out", "/tmp/frames");
const keys = (opt("--keys", "") || "").split(",").filter(Boolean).map(k => {
  const [key, delay = "200", times = "1"] = k.split(":");
  return { key, delay: Number(delay), times: Number(times) };
});
const evals = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--eval") evals.push(args[i + 1]);
  else if (args[i].startsWith("--eval=")) evals.push(args[i].slice(7));
  else if (args[i] === "--eval-file") evals.push(...JSON.parse(fs.readFileSync(args[i + 1], "utf8")));
}
const profile = opt("--profile", "/tmp/tk-cdp-profile-" + process.pid);

try { execSync("pkill -f \"remote-debugging-port=9333\""); } catch {} fs.mkdirSync(outDir, { recursive: true });
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check", "--disable-extensions",
  "--window-size=1366,900",
  `--user-data-dir=${profile}`,
  "--remote-debugging-port=9333",
], { stdio: ["ignore", "ignore", "pipe"] });

let page = null;
for (let i = 0; i < 100 && !page; i++) {
  try {
    const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
    page = list.find(t => t.type === "page");
  } catch {}
  if (!page) await sleep(200);
}
if (!page) { console.error(JSON.stringify({ error: "no page target on 9333" })); process.exit(1); }
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });

let msgId = 0;
const pending = new Map();
const consoleLogs = [], exceptions = [], badResponses = [], failures = [];
sock.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled") {
    const type = m.params.type;
    const txt = (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" ");
    consoleLogs.push({ type, txt });
  }
  if (m.method === "Runtime.exceptionThrown") {
    exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
  if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
    badResponses.push({ status: m.params.response.status, url: m.params.response.url });
  }
  if (m.method === "Network.loadingFailed") {
    failures.push({ errorText: m.params.errorText, url: m.params.requestId });
  }
};
const send = (method, params = {}) => new Promise(res => {
  const id = ++msgId;
  pending.set(id, res);
  sock.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

async function keyTap(key) {
  const k = key === "Enter" ? "Enter" : key === "Space" ? " " : key;
  const code = key === "Enter" ? "Enter" : key === "Space" ? "Space" : `Key${key.toUpperCase()}`;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: (k === " " ? 32 : k.toUpperCase().charCodeAt(0)), nativeVirtualKeyCode: (k === " " ? 32 : k.toUpperCase().charCodeAt(0)) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: (k === " " ? 32 : k.toUpperCase().charCodeAt(0)), nativeVirtualKeyCode: (k === " " ? 32 : k.toUpperCase().charCodeAt(0)) });
}

await send("Page.navigate", { url });
let timer = Date.now(), shotSeq = 0;
const shots = [];
while (Date.now() - timer < duration) {
  const elapsed = Date.now() - timer;
  if (step > 0 && (elapsed >= (shotSeq + 1) * step || elapsed >= duration - 200)) {
    const cap = await send("Page.captureScreenshot", { format: "png" });
    const f = path.join(outDir, String(shotSeq).padStart(3, "0") + ".png");
    fs.writeFileSync(f, Buffer.from(cap.result.data, "base64"));
    shots.push(f); shotSeq++;
  }
  for (const { key, delay, times } of keys) {
    if (Date.now() - timer >= duration) break;
    for (let i = 0; i < times; i++) { await keyTap(key); await sleep(delay); }
  }
  await sleep(Math.min(300, Math.max(50, duration - (Date.now() - timer) - 100)));
}
if (step === 0) {
  const cap = await send("Page.captureScreenshot", { format: "png" });
  const f = path.join(outDir, "last.png");
  fs.writeFileSync(f, Buffer.from(cap.result.data, "base64"));
  shots.push(f);
}
const evalResults = [];
for (const expr of evals) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  const v = r.result;
  evalResults.push({ expr, result: v.exceptionDetails ? ("EXC: " + (v.exceptionDetails.exception?.description || v.exceptionDetails.text)) : JSON.stringify(v.result?.value ?? null) });
}
const summary = { shots, evalResults, consoleLogs: consoleLogs.slice(0, 40), exceptions, badResponses: badResponses.slice(0, 30), failures: failures.slice(0, 20) };
console.log(JSON.stringify(summary, null, 1));
chrome.kill();
process.exit(0);