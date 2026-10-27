const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

// Current delivery contract, not a historical page/file/script count.
// These paths were already exercised by the six original missing-file fixtures.
const three = '吞食天地三国/网页复刻/吞食天地Ⅱ同人复刻-网页版/';
const requiredPages = [
  './', '创意空间首页/', '坦克大战/tank-battle.html', '吞食天地三国/',
  '超级玛丽/', '墨水屏小站/', 'Mac软件资源库/', '粉丝资源/', three + 'index.html',
];
const requiredScripts = [three + 'js/core.js', '粉丝资源/scripts/copy.js'];
const dataPaths = {
  metadata: '创意空间首页/deployment-meta.json',
  catalog: '创意空间首页/game-catalog.json',
  resources: '粉丝资源/resources.json',
  software: 'Mac软件资源库/software-resources.json',
  system: three + 'assets/data/system.json',
};

const space = char => char !== undefined && /[\t\n\f\r ]/.test(char);
const jsMime = value => /^(?:application\/(?:x-)?(?:java|ecma)script|text\/(?:(?:x-)?(?:java|ecma)script|javascript1\.[0-5]|jscript|livescript))$/.test(value);
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', sol: '/', colon: ':', Tab: '\t', NewLine: '\n' };
function decodeAttribute(value) {
  return value.replace(/&(#x[\da-f]+;?|#\d+;?|[a-z][a-z\d]*;)/gi, (whole, entity) => {
    const name = entity.replace(/;$/, '');
    if (name[0] !== '#') return entities[name] ?? whole;
    const number = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : '\ufffd';
  });
}

// A small HTML tokenizer, not a browser DOM. Attribute quoting and raw-text state
// are handled before extracting references; script text never re-enters tag scanning.
function readTag(html, start) {
  let i = start + 1, closing = false;
  if (html[i] === '/') { closing = true; i++; }
  if (!/[a-z]/i.test(html[i] || '')) return null;
  const nameStart = i;
  while (i < html.length && !space(html[i]) && html[i] !== '/' && html[i] !== '>') i++;
  const name = html.slice(nameStart, i).toLowerCase(), attrs = Object.create(null);
  while (i < html.length) {
    while (space(html[i]) || html[i] === '/') i++;
    if (html[i] === '>') return { name, attrs, closing, end: i + 1 };
    if (i === html.length) break;
    const attrStart = i;
    while (i < html.length && !space(html[i]) && !['=', '/', '>'].includes(html[i])) i++;
    const key = html.slice(attrStart, i).toLowerCase();
    if (!key) { i++; continue; }
    while (space(html[i])) i++;
    let value = '';
    if (html[i] === '=') {
      i++;
      while (space(html[i])) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const begin = ++i;
        while (i < html.length && html[i] !== quote) i++;
        value = html.slice(begin, i);
        if (i < html.length) i++;
      } else {
        const begin = i;
        while (i < html.length && !space(html[i]) && html[i] !== '>') i++;
        value = html.slice(begin, i);
      }
    }
    // HTML keeps the first duplicate attribute.
    if (!Object.hasOwn(attrs, key)) attrs[key] = decodeAttribute(value);
  }
  return null;
}

function scriptKind(attrs) {
  const type = (attrs.type ?? (attrs.language ? 'text/' + attrs.language : '')).trim().toLowerCase();
  if (type === 'module') return 'module';
  return !type || jsMime(type) ? 'classic' : null;
}

function refreshTarget(content) {
  const match = /^\s*\d+(?:\.\d*)?\s*[;,]\s*(?:url\s*=\s*)?([\s\S]*)$/i.exec(content);
  if (!match) return null; // A delay-only refresh reloads the page, not a new entry.
  let value = match[1].trim();
  if ((value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) value = value.slice(1, -1);
  return value;
}

function extractHtml(html) {
  const result = { scripts: [], redirects: [], references: [], baseHref: null, isHtml: false };
  const rawTags = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);
  const srcTags = new Set(['img', 'iframe', 'embed', 'input', 'audio', 'video', 'source', 'track']);
  let i = 0, templateDepth = 0;
  while ((i = html.indexOf('<', i)) !== -1) {
    if (html.startsWith('<!--', i)) {
      const end = /--!?>/g; end.lastIndex = i + 4;
      const match = end.exec(html); i = match ? end.lastIndex : html.length; continue;
    }
    if (/^<!doctype\s+html(?:\s|>)/i.test(html.slice(i, i + 30))) result.isHtml = true;
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i + 2); i = end < 0 ? html.length : end + 1; continue;
    }
    const tag = readTag(html, i);
    if (!tag) { i++; continue; }
    i = tag.end;
    const { name, attrs, closing } = tag;
    if (name === 'template') { templateDepth = Math.max(0, templateDepth + (closing ? -1 : 1)); continue; }
    if (closing) continue;
    let code = '';
    if (name === 'plaintext') break;
    if (rawTags.has(name)) {
      const endTag = new RegExp('</' + name + '(?=[\\t\\n\\f\\r />])', 'gi');
      endTag.lastIndex = i;
      const end = endTag.exec(html);
      code = html.slice(i, end ? end.index : html.length);
      i = end ? (readTag(html, end.index)?.end ?? endTag.lastIndex) : html.length;
    }
    if (templateDepth) continue;
    if (name === 'html') result.isHtml = true;
    if (name === 'base' && result.baseHref === null && Object.hasOwn(attrs, 'href')) result.baseHref = attrs.href;
    if (name === 'meta' && attrs['http-equiv']?.trim().toLowerCase() === 'refresh') {
      const target = refreshTarget(attrs.content || '');
      if (target !== null) result.redirects.push(target);
    }
    if (name === 'script') {
      const kind = scriptKind(attrs);
      if (kind) result.scripts.push({ src: attrs.src ?? null, kind, code });
    } else {
      if (['a', 'area', 'link'].includes(name) && Object.hasOwn(attrs, 'href')) result.references.push(attrs.href);
      if (srcTags.has(name) && Object.hasOwn(attrs, 'src')) result.references.push(attrs.src);
    }
  }
  return result;
}

function localUrl(reference, parent, base) {
  const url = new URL(reference, parent);
  assert.ok(url.origin === base.origin && url.pathname.startsWith(base.pathname), '[URL_SCOPE] 站内链接不得跳出部署目录：' + url.href);
  url.hash = '';
  return url;
}

function validateScript(text, { kind = 'classic', filename = 'script', contentType, nosniff = false, inline = false } = {}) {
  if (!inline) assert.ok(text.trim(), '[SCRIPT_EMPTY] 脚本不得为空：' + filename);
  if (contentType !== undefined) {
    const mime = contentType.split(';')[0].trim().toLowerCase();
    const blocked = /^(?:text\/html|application\/xhtml\+xml|text\/csv|image\/|audio\/|video\/)/.test(mime);
    assert.ok(!blocked && (!(kind === 'module' || nosniff) || jsMime(mime)), '[SCRIPT_MIME] 无法作为 ' + kind + ' 脚本加载：' + filename + ' (' + mime + ')');
  }
  if (kind === 'classic') {
    // Script grammar preserves browser sloppy mode and HTML comments, without
    // CommonJS wrapper bindings or the implicit strict mode of an ES module.
    try { new vm.Script(text, { filename }); }
    catch (error) { throw new Error('[SCRIPT_SYNTAX] ' + filename + ': ' + error.message); }
  } else {
    // Parse module grammar (imports/exports/top-level await) without executing or
    // resolving imports. SourceTextModule otherwise needs an experimental VM flag.
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: text, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
    assert.ok(!result.error && !result.signal, '[SCRIPT_CHECK_PROCESS] 无法完成模块语法检查：' + filename);
    assert.equal(result.status, 0, '[SCRIPT_SYNTAX] ' + filename + ': ' + result.stderr);
  }
}

function validateData(name, text, { expectedCommit = '', expectedResourceId = '' } = {}) {
  const data = JSON.parse(text);
  if (name === dataPaths.metadata) {
    assert.ok(data.commit, '部署标记缺少提交号');
    if (expectedCommit) assert.ok(String(data.commit).startsWith(expectedCommit), 'deployment commit ' + data.commit + ' != ' + expectedCommit);
  } else if (name === dataPaths.resources) {
    assert.ok(Array.isArray(data.resources) && data.resources.length, '资源目录必须包含非空 resources 数组');
    if (expectedResourceId) assert.ok(data.resources.some(item => item?.id === expectedResourceId), 'resource ' + expectedResourceId + ' is missing');
    for (const item of data.resources) assert.ok(item?.id && item.detailUrl, '资源缺少 id 或 detailUrl');
  } else if (name === dataPaths.catalog) {
    assert.ok(Array.isArray(data.games) && data.games.length, '创意目录必须包含非空 games 数组');
    assert.equal(new Set(data.games.map(game => game?.id)).size, data.games.length, '创意 id 不得重复');
    for (const game of data.games) assert.ok(game?.id && game.url && game.version, '创意缺少 id、url 或 version');
  } else if (name === dataPaths.software) {
    assert.ok(Array.isArray(data.items) && data.items.length, 'Mac 软件目录必须包含非空 items 数组');
    assert.equal(data.summary?.total, data.items.length, 'Mac 软件总数与条目数不一致');
    for (const item of data.items) assert.ok(item?.id && item.name && item.shareUrl, 'Mac 软件条目缺少 id、name 或 shareUrl');
  } else if (name === dataPaths.system) assert.ok(data.gameTitle, '三国核心数据缺少游戏标题');
  return data;
}

module.exports = { requiredPages, requiredScripts, dataPaths, extractHtml, localUrl, validateScript, validateData };
