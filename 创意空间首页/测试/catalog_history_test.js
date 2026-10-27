const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gitEnv = { ...process.env };
for (const name of execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).trim().split(/\r?\n/)) {
  delete gitEnv[name];
}
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-history-'));
const git = (...args) => execFileSync('git', args, { cwd: fixture, env: gitEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

try {
  const project = path.join(fixture, '首页');
  const scripts = path.join(project, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  const generator = path.join(scripts, 'generate-game-catalog.cjs');
  fs.copyFileSync(path.join(root, 'scripts/generate-game-catalog.cjs'), generator);
  const legacyExternal = { id: 'legacy-external', title: '静态外部项目', url: 'https://example.com/legacy/', external: true, version: 'v0.4', status: '外部项目' };
  fs.writeFileSync(path.join(project, 'game-catalog.template.json'), JSON.stringify({ games: [
    { id: 'test', title: '测试游戏', url: '../test/', tagNamespace: 'game/test', fallbackVersion: 'v0.1.0', statusWhenMissing: '开发版', statusWhenTagged: '稳定版' },
    { id: 'untagged', title: '未发布资源', url: '../untagged/', tagNamespace: 'resource/untagged', fallbackVersion: 'v0.2.0', statusWhenMissing: '资源库', statusWhenTagged: '稳定版' },
    legacyExternal,
  ] }));
  git('init', '-b', 'main');
  git('config', 'user.name', 'Catalog test');
  git('config', 'user.email', 'catalog-test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  git('add', '.');
  git('commit', '-m', 'Initial fixture');
  git('tag', 'game/test/v1.2.0');
  git('commit', '--allow-empty', '-m', 'Release fixture');
  git('tag', '-a', 'game/test/v1.10.0', '-m', 'Annotated stable tag');
  git('checkout', '-b', 'future');
  git('commit', '--allow-empty', '-m', 'Unmerged future work');
  git('tag', 'game/test/v9.0.0');
  git('checkout', 'main');
  execFileSync(process.execPath, [generator], { cwd: fixture, env: gitEnv });
  let catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.10.0', 'An unmerged branch tag must not label deployed code');
  assert.equal(catalog.games[0].status, '稳定版');
  assert.equal(catalog.games[1].version, 'v0.2.0');
  assert.equal(catalog.games[1].status, '资源库');
  assert.deepEqual(catalog.games[2], legacyExternal, 'The CLI must preserve a static external v0.4 release');
  // Running the CLI from a different Git checkout must still inspect its own repository.
  execFileSync(process.execPath, [generator], { cwd: root, env: gitEnv });
  catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.10.0', 'Resolve tags relative to the generator repository');

  const foreign = path.join(fixture, 'foreign');
  fs.mkdirSync(foreign);
  git('-C', foreign, 'init', '-b', 'main');
  git('-C', foreign, '-c', 'user.name=Catalog test', '-c', 'user.email=catalog-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'Foreign repository');
  git('-C', foreign, '-c', 'tag.gpgsign=false', 'tag', 'game/test/v99.0.0');
  const foreignGit = path.join(foreign, '.git');
  const foreignShallow = path.join(foreignGit, 'shallow');
  fs.writeFileSync(foreignShallow, git('-C', foreign, 'rev-parse', 'HEAD'));
  for (const [label, pollution] of [
    ['GIT_DIR', { GIT_DIR: foreignGit }],
    ['GIT_COMMON_DIR', { GIT_COMMON_DIR: foreignGit }],
    ['object storage', { GIT_OBJECT_DIRECTORY: path.join(foreignGit, 'objects'), GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(foreignGit, 'objects') }],
    ['all repository variables', {
      GIT_DIR: foreignGit, GIT_WORK_TREE: foreign, GIT_COMMON_DIR: foreignGit,
      GIT_INDEX_FILE: path.join(foreignGit, 'index'), GIT_SHALLOW_FILE: foreignShallow,
      GIT_OBJECT_DIRECTORY: path.join(foreignGit, 'objects'), GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(foreignGit, 'objects'),
    }],
  ]) {
    execFileSync(process.execPath, [generator], { cwd: foreign, env: { ...gitEnv, ...pollution }, stdio: 'pipe' });
    catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
    assert.equal(catalog.games[0].version, 'v1.10.0', `${label} must not redirect the generator to another repository`);
  }

  for (const tag of ['game/test/v02.0.0', 'game/test/v2.01.0', 'game/test/v2.1.01']) {
    git('tag', tag);
  }
  execFileSync(process.execPath, [generator], { cwd: fixture, env: gitEnv });
  catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.10.0', 'Reachable tags with leading zeros are not stable semantic versions');

  const templateFile = path.join(project, 'game-catalog.template.json');
  const originalTemplate = fs.readFileSync(templateFile, 'utf8');
  const invalidTemplate = JSON.parse(originalTemplate);
  delete invalidTemplate.games[0].url;
  const originalCatalog = fs.readFileSync(path.join(project, 'game-catalog.json'), 'utf8');
  fs.writeFileSync(templateFile, JSON.stringify(invalidTemplate));
  const rejected = spawnSync(process.execPath, [generator], { cwd: fixture, env: gitEnv, encoding: 'utf8' });
  assert.equal(rejected.status, 1, 'An invalid template must fail the CLI');
  assert.match(rejected.stderr, /url/, 'The failure must identify the invalid field');
  assert.match(rejected.stderr, /games\[0\].*id="test"/, 'The failure must identify the entry index and id');
  assert.equal(fs.readFileSync(path.join(project, 'game-catalog.json'), 'utf8'), originalCatalog, 'Validation failure must preserve the previous catalog');
  fs.writeFileSync(templateFile, originalTemplate);
  git('checkout', '--detach', 'HEAD~1');
  execFileSync(process.execPath, [generator], { cwd: fixture, env: gitEnv });
  catalog = JSON.parse(fs.readFileSync(path.join(project, 'game-catalog.json')));
  assert.equal(catalog.games[0].version, 'v1.2.0', 'An older checkout must not advertise later releases');
  console.log('Catalog Git history checks passed (unmerged, annotated, fallback, cwd, Git environment, invalid tags, invalid template, older checkout).');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
