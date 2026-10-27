'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(__dirname, '.build-check-'));
try {
  fs.cpSync(path.join(project, 'src'), path.join(work, 'src'), { recursive: true });
  fs.copyFileSync(path.join(project, 'build.sh'), path.join(work, 'build.sh'));
  fs.copyFileSync(path.join(project, 'index.html'), path.join(work, 'index.html'));
  const before = fs.readFileSync(path.join(work, 'index.html'), 'utf8');
  fs.appendFileSync(path.join(work, 'src/70_game.js'), '\nconst broken = ;\n');
  const broken = spawnSync('bash', ['build.sh'], { cwd: work, encoding: 'utf8' });
  assert.notEqual(broken.status, 0, '语法失败必须退出失败');
  assert.ok(fs.readFileSync(path.join(work, 'index.html'), 'utf8') === before, '失败构建必须保留原产物');
  fs.copyFileSync(path.join(project, 'src/70_game.js'), path.join(work, 'src/70_game.js'));
  const built = spawnSync('bash', ['build.sh'], { cwd: work, encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  assert.ok(fs.readFileSync(path.join(work, 'index.html'), 'utf8') === fs.readFileSync(path.join(project, 'index.html'), 'utf8'), '现行产物必须与当前源码构建一致');
  console.log('BUILD_OK: 失败保留旧产物，正常构建与现行 index.html 一致');
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
