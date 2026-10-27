const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const repository = path.dirname(root);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fan-resources-package-'));
try {
  const write = (relative, content = 'fixture\n') => {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  // Other projects are minimal stand-ins; this test only owns fan resources.
  const engine = '吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版';
  for (const filename of [
    'index.html', '创意空间首页/index.html', '创意空间首页/game-catalog.json',
    '创意空间首页/deployment-meta.json', '创意空间首页/qq-group-qrcode.jpg',
    '坦克大战/tank-battle.html', '坦克大战/坦克大战.html', '坦克大战/assets/blender/tank-sprites-v2.png',
    '吞食天地三国/index.html', '吞食天地三国/three-kingdoms.html', `${engine}/index.html`,
    `${engine}/js/fixture.js`, `${engine}/assets/fixture.txt`, '超级玛丽/index.html', '墨水屏小站/index.html',
    'Mac软件资源库/index.html', 'Mac软件资源库/software-resources.json',
  ]) write(filename);
  write('scripts/build-site.cjs', fs.readFileSync(path.join(repository, 'scripts/build-site.cjs')));
  for (const relative of ['index.html', 'resources.json', 'scripts', 'styles', '资源']) {
    fs.cpSync(path.join(root, relative), path.join(fixture, '粉丝资源', relative), { recursive: true });
  }
  write('粉丝资源/历史版本/fixture.html');
  write('粉丝资源/测试/.artifacts/private.txt');
  const build = spawnSync(process.execPath, ['scripts/build-site.cjs'], { cwd: fixture, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  const delivered = path.join(fixture, '.site/粉丝资源');
  const resources = JSON.parse(fs.readFileSync(path.join(root, 'resources.json'), 'utf8')).resources;
  const pages = ['index.html', '资源/Mac软件资源库/index.html', ...resources.map(item => path.join(item.detailUrl, 'index.html'))];
  for (const page of pages) {
    assert.equal(fs.readFileSync(path.join(delivered, page), 'utf8'), fs.readFileSync(path.join(root, page), 'utf8'), `页面未完整交付：${page}`);
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"#]+)"[^>]*>/g)) {
      // The old Mac canonical target is a different project, not a dependency.
      if (match[0].includes('rel="canonical"')) continue;
      const dependency = path.resolve(delivered, path.dirname(page), match[1]);
      assert.ok(fs.existsSync(dependency), `发布包遗漏 ${path.relative(delivered, dependency)}`);
      assert.deepEqual(fs.readFileSync(dependency), fs.readFileSync(path.resolve(root, path.dirname(page), match[1])));
    }
  }
  assert.deepEqual(fs.readFileSync(path.join(delivered, 'resources.json')), fs.readFileSync(path.join(root, 'resources.json')));
  for (const excluded of ['历史版本', '测试']) assert.ok(!fs.existsSync(path.join(delivered, excluded)), `不应发布 ${excluded}`);
  console.log('Fan resource package checks passed (8 pages, data, JS/CSS dependencies, excluded history/test files).');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
