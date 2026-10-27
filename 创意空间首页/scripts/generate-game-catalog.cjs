#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, '..', 'game-catalog.json');
const templatePath = path.join(__dirname, '..', 'game-catalog.template.json');
const repositoryRoot = path.resolve(__dirname, '..', '..');
const stableVersionPattern = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

function compareSemanticVersions(left, right) {
  const leftParts = left.slice(1).split('.').map(Number);
  const rightParts = right.slice(1).split('.').map(Number);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function parseStableTags(tagText) {
  const versionsByNamespace = {};
  const tags = String(tagText ?? '').split(/\r?\n/);

  for (const rawTag of tags) {
    const tag = rawTag.trim();
    const match = tag.match(/^(game|resource)\/([^/\s]+)\/(v[^/]+)$/);
    if (!match || !stableVersionPattern.test(match[3])) {
      continue;
    }

    const namespace = `${match[1]}/${match[2]}`;
    const version = match[3];
    const currentVersion = versionsByNamespace[namespace];
    if (!currentVersion || compareSemanticVersions(version, currentVersion) > 0) {
      versionsByNamespace[namespace] = version;
    }
  }

  return versionsByNamespace;
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
}

function isSafeCatalogUrl(url) {
  if (url !== url.trim() || /[\\\u0000-\u001f\u007f]/.test(url) || url.startsWith('//')) {
    return false;
  }
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(url);
  if (hasScheme && !/^https?:\/\/[^/]/i.test(url)) {
    return false;
  }
  try {
    const base = new URL('https://catalog.invalid/');
    const target = new URL(url, base);
    return (target.protocol === 'http:' || target.protocol === 'https:') &&
      !target.username && !target.password && (hasScheme || target.origin === base.origin);
  } catch {
    return false;
  }
}

function validateTemplate(template) {
  if (!template || typeof template !== 'object' || Array.isArray(template) || !Array.isArray(template.games)) {
    throw new TypeError('Catalog template must be an object containing a games array.');
  }
  const ids = new Set();
  for (const [index, game] of template.games.entries()) {
    if (!game || typeof game !== 'object' || Array.isArray(game)) {
      throw new TypeError(`Catalog games[${index}] must be an object.`);
    }
    const label = `Catalog games[${index}]${typeof game.id === 'string' ? ` (id=${JSON.stringify(game.id)})` : ''}`;
    for (const field of ['id', 'title', 'url']) {
      requireText(game[field], `${label}.${field}`);
    }
    if (game.id !== game.id.trim()) {
      throw new TypeError(`${label}.id must not contain surrounding whitespace.`);
    }
    if (ids.has(game.id)) {
      throw new TypeError(`${label} has duplicate id ${JSON.stringify(game.id)}.`);
    }
    ids.add(game.id);
    if (!isSafeCatalogUrl(game.url)) {
      throw new TypeError(`${label}.url must be an HTTP(S) or relative site URL without credentials.`);
    }
    if (Object.hasOwn(game, 'external')) {
      if (typeof game.external !== 'boolean') {
        throw new TypeError(`${label}.external must be a boolean.`);
      }
      if (game.external !== /^https?:\/\//i.test(game.url)) {
        throw new TypeError(`${label}.external must match the url form: absolute HTTP(S) or relative site URL.`);
      }
    }
    const hasNamespace = Object.hasOwn(game, 'tagNamespace');
    if (hasNamespace && (typeof game.tagNamespace !== 'string' || !/^(game|resource)\/[^/\s]+$/.test(game.tagNamespace))) {
      throw new TypeError(`${label}.tagNamespace must use game/<id> or resource/<id>.`);
    }
    const requiredVersion = hasNamespace ? 'fallbackVersion' : 'version';
    for (const field of ['version', 'fallbackVersion']) {
      if (field === requiredVersion || Object.hasOwn(game, field)) {
        requireText(game[field], `${label}.${field}`);
        if (hasNamespace && !stableVersionPattern.test(game[field])) {
          throw new TypeError(`${label}.${field} must be a stable vX.Y.Z version without leading zeros.`);
        }
      }
    }
    const requiredStatus = hasNamespace ? 'statusWhenMissing' : 'status';
    for (const field of ['status', 'statusWhenMissing', 'statusWhenTagged']) {
      if (field === requiredStatus || Object.hasOwn(game, field)) {
        requireText(game[field], `${label}.${field}`);
      }
    }
    if (hasNamespace && !Object.hasOwn(game, 'statusWhenTagged') && !Object.hasOwn(game, 'status')) {
      throw new TypeError(`${label} must provide statusWhenTagged or status.`);
    }
  }
}

function generateCatalog(template, tagText) {
  validateTemplate(template);
  const catalog = JSON.parse(JSON.stringify(template));
  const versionsByNamespace = parseStableTags(tagText);

  for (const game of catalog.games) {
    if (!game.tagNamespace) {
      continue;
    }
    const taggedVersion = versionsByNamespace[game.tagNamespace];
    game.version = taggedVersion || game.fallbackVersion;
    game.status = taggedVersion ? (game.statusWhenTagged || game.status) : game.statusWhenMissing;
  }

  return catalog;
}

function main() {
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const gitEnv = { ...process.env };
  // Git hooks can export repository-local variables that override cwd.
  const localVariables = execFileSync('git', ['rev-parse', '--local-env-vars'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  for (const name of localVariables.trim().split(/\r?\n/)) {
    delete gitEnv[name];
  }
  const tagText = execFileSync('git', ['tag', '--list', '--merged', 'HEAD'], {
    cwd: repositoryRoot,
    env: gitEnv,
    encoding: 'utf8',
  });
  const catalog = generateCatalog(template, tagText);
  fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Generated ${path.relative(process.cwd(), output)} from per-game stable tags`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseStableTags, generateCatalog };
