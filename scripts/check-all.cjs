#!/usr/bin/env node
// 共享验证入口：调用各创意自己的测试，不改变它们的源码或存档。
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const jobs = [];
for (const directory of ['创意空间首页/测试', '粉丝资源/测试', 'Mac软件资源库/测试', '墨水屏小站/测试', '超级玛丽/test', '吞食天地三国/测试', '坦克大战/测试']) {
  for (const name of fs.readdirSync(path.join(root, directory)).sort()) {
    if (!/(_test\.(js|mjs)|^harness\.js$|^three_kingdoms_smoke\.js$|^validate_maps\.js$)/.test(name)) continue;
    if (name === 'published_site_test.mjs') continue; // Needs a running HTTP site; separate release gate.
    const file = `${directory}/${name}`;
    jobs.push([process.execPath, [file, ...(directory.startsWith('坦克大战') ? ['坦克大战/tank-battle.html'] : [])]]);
  }
}
// 原生开发线存在时验证其主机测试；原生代码不参与 Pages 打包。
const native = '墨水屏小站/原生版/墨屏小站原生测试/测试';
if (fs.existsSync(path.join(root, native))) {
  for (const file of fs.readdirSync(path.join(root, native)).filter(name => name.endsWith('_test.js')).sort()) jobs.push([process.execPath, [`${native}/${file}`]]);
}
if (process.env.TEST_PYTHON) jobs.push([process.env.TEST_PYTHON, ['坦克大战/测试/blender_pixels_test.py']]);
let failures = 0;
for (const [command, args] of jobs) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) {
    failures++;
    console.error(`FAIL ${args[0]}\n${result.error || ''}\n${result.stdout}\n${result.stderr}`);
  } else console.log(`PASS ${args[0]}`);
}
console.log(`\n全项目检查：${jobs.length - failures}/${jobs.length} 组通过${process.env.TEST_PYTHON ? '（含图集像素验证）' : '（图集像素验证需 TEST_PYTHON）'}`);
process.exitCode = failures ? 1 : 0;
