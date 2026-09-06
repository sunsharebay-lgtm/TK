#!/usr/bin/env node
/* Blender 预渲染坦克图集的离线完整性检查。 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "tank-battle.html");
const pngPath = path.join(root, "assets", "blender", "tank-sprites-v2.png");
const blendPath = path.join(root, "美术", "blender", "tank-sprites-v1.blend");
const scriptPath = path.join(root, "美术", "blender", "render_tank_sprite_sheet.py");
const failures = [];

function check(label, ok, detail=""){
  console.log(`${ok ? "[ OK ]" : "[FAIL]"} ${label}${detail ? " · " + detail : ""}`);
  if(!ok) failures.push(label);
}

const png = fs.readFileSync(pngPath);
check("PNG 签名", png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
check("图集尺寸为 8x9 个 128px 精灵", width === 1024 && height === 1152, `${width}x${height}`);
check("Blender 源文件存在", fs.statSync(blendPath).size > 0, `${Math.round(fs.statSync(blendPath).size / 1024)} KB`);

const html = fs.readFileSync(htmlPath, "utf8");
const script = fs.readFileSync(scriptPath, "utf8");
check("网页声明 Blender 图集", html.includes('const BLENDER_TANK_SHEET = "assets/blender/tank-sprites-v2.png"'));
check("网页保留异步回退加载", html.includes("function loadBlenderTankSprites()") && html.includes("if(typeof Image === \"undefined\") return"));
check("启动时加载图集", html.includes("buildAllSprites();\n  loadBlenderTankSprites();"));
check("Blender 脚本使用共享原型导出", script.includes("prototype_collection") && script.includes("BLENDER_WORKBENCH"));

if(failures.length){
  console.error(`\nBLENDER_ART_FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nBLENDER_ART_OK");
