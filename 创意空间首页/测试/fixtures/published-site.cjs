const path = require('node:path');
const three = '吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/';
const html = (body = '', head = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

// Independent of the verifier's required-file list; never reads sibling sources.
function createSite() {
  return new Map([
    ['index.html', html('', '<meta http-equiv="refresh" content="0; url=创意空间首页/">')],
    ['创意空间首页/index.html', html('粉丝资源<script src="app.js"></script>')],
    ['创意空间首页/app.js', 'const home = true;'],
    ['创意空间首页/deployment-meta.json', JSON.stringify({ commit: 'expected' })],
    ['创意空间首页/game-catalog.json', JSON.stringify({ games: [{ id: 'tank', url: '../坦克大战/tank-battle.html', version: 'v1.0.0' }] })],
    ['坦克大战/tank-battle.html', html('tank')],
    ['吞食天地三国/index.html', html('', '<meta http-equiv="refresh" content="0; url=网页复刻/吞食天地Ⅱ同人复刻-网页版/index.html">')],
    [three + 'index.html', html('<script src="js/core.js"></script>')],
    [three + 'js/core.js', 'const core = true;'],
    [three + 'assets/data/system.json', JSON.stringify({ gameTitle: 'fixture' })],
    ['超级玛丽/index.html', html('mario')],
    ['墨水屏小站/index.html', html('ink')],
    ['Mac软件资源库/index.html', html('mac')],
    ['Mac软件资源库/software-resources.json', JSON.stringify({ items: [{ id: 'app', name: 'App', shareUrl: 'https://example.test/app' }], summary: { total: 1 } })],
    ['粉丝资源/index.html', html('<script src="scripts/copy.js"></script>')],
    ['粉丝资源/scripts/copy.js', 'const copy = true;'],
    ['粉丝资源/resources.json', JSON.stringify({ resources: [{ id: 'r1', detailUrl: '资源/detail.html' }] })],
    ['粉丝资源/资源/detail.html', html('<script src="../scripts/copy.js"></script>')],
  ]);
}

function memoryFs(files, root) {
  const contents = new Map([...files].map(([name, text]) => [path.join(root, name), text]));
  const dirs = new Set([root]);
  for (const name of contents.keys()) {
    for (let dir = path.dirname(name); dir.startsWith(root); dir = path.dirname(dir)) dirs.add(dir);
  }
  return {
    existsSync: name => contents.has(name) || dirs.has(name),
    statSync(name) {
      if (!contents.has(name) && !dirs.has(name)) throw new Error(`ENOENT: ${name}`);
      return { isDirectory: () => dirs.has(name), isFile: () => contents.has(name), size: Buffer.byteLength(contents.get(name) || '') };
    },
    readFileSync(name, encoding) {
      if (!contents.has(name)) throw new Error(`ENOENT: ${name}`);
      return encoding ? contents.get(name) : Buffer.from(contents.get(name));
    },
    readdirSync(dir, options) {
      if (!dirs.has(dir)) throw new Error(`ENOTDIR: ${dir}`);
      const names = [...new Set([...contents.keys(), ...dirs].filter(name => name !== dir && path.dirname(name) === dir).map(name => path.basename(name)))];
      return options?.withFileTypes ? names.map(name => ({ name, isDirectory: () => dirs.has(path.join(dir, name)), isSymbolicLink: () => false })) : names;
    },
  };
}
module.exports = { createSite, html, three, memoryFs };
