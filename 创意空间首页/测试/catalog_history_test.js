const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(__dirname, '.catalog-history-'));
const git = (...args) => execFileSync('git', args, { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

try {
  const project = path.join(fixture, '首页');
  const scripts = path.join(project, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const generator = path.join(scripts, 'generate-game-catalog.cjs');
  fs.copyFileSync(path.join(root, 'scripts/generate-game-catalog.cjs'), generator);
  fs.writeFileSync(path.join(project, 'game-catalog.template.json'), JSON.stringify({ games: [
    { id: 'test', tagNamespace: 'game/test', fallbackVersion: 'v0.1.0', statusWhenMissing: '开发版', statusWhenTagged: '稳定版' },
    { id: 'untagged', tagNamespace: 'resource/untagged', fallbackVersion: 'v0.2.0', statusWhenMissing: '资源库' },
  ] }));
  git('init', '-b', 'main');
  git('config', 'user.name', 'Catalog test');
  git('config', 'user.email', 'catalog-test@example.invalid');
  git('add', '.');
  git('commit', '-m', 'Initial fixture');
  git('tag', 'game/test/v1.2.0');
  git('commit', '--allow-empty', '-m', 'Release fixture');
  git('tag', '-a', 'game/test/v1.10.0', '-m', 'Annotated stable tag');
  git('checkout', '-b', 'future');
  git('commit', '--allow-empty', '-m', 'Unmerged future work');
  git('tag', 'game/test/v9.0.0');
  git('checkout', 'main');
  execFileSync(process.execPath, [generator], { cwd: fixture });
  let catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.10.0', 'An unmerged branch tag must not label deployed code');
  assert.equal(catalog.games[0].status, '稳定版');
  assert.equal(catalog.games[1].version, 'v0.2.0');
  assert.equal(catalog.games[1].status, '资源库');
  // Running the CLI from a different Git checkout must still inspect its own repository.
  execFileSync(process.execPath, [generator], { cwd: root });
  catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.10.0', 'Resolve tags relative to the generator repository');
  git('checkout', '--detach', 'HEAD~1');
  execFileSync(process.execPath, [generator], { cwd: fixture });
  catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.2.0', 'An older checkout must not advertise later releases');
  console.log('Catalog Git history checks passed (unmerged, annotated, fallback, cwd, older checkout).');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
