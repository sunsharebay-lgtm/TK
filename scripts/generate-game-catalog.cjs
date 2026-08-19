#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, '..', 'game-catalog.json');
const templatePath = path.join(__dirname, '..', 'game-catalog.template.json');

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
    const match = tag.match(/^game\/([^/\s]+)\/(v\d+\.\d+\.\d+)$/);
    if (!match) {
      continue;
    }

    const namespace = `game/${match[1]}`;
    const version = match[2];
    const currentVersion = versionsByNamespace[namespace];
    if (!currentVersion || compareSemanticVersions(version, currentVersion) > 0) {
      versionsByNamespace[namespace] = version;
    }
  }

  return versionsByNamespace;
}

function generateCatalog(template, tagText) {
  const catalog = JSON.parse(JSON.stringify(template));
  const versionsByNamespace = parseStableTags(tagText);

  if (!Array.isArray(catalog.games)) {
    throw new TypeError('Catalog template must contain a games array.');
  }

  for (const game of catalog.games) {
    const taggedVersion = versionsByNamespace[game.tagNamespace];
    game.version = taggedVersion || game.fallbackVersion;
    game.status = taggedVersion ? (game.statusWhenTagged || game.status) : game.statusWhenMissing;
  }

  return catalog;
}

function main() {
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const tagText = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' });
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
