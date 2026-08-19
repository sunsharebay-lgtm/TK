#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const version = process.argv[2];
const output = process.argv[3] || path.join(__dirname, '..', 'game-catalog.json');
const templatePath = path.join(__dirname, '..', 'game-catalog.template.json');

if (!/^v\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Expected a stable semantic version tag such as v1.6.1.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');
const catalog = JSON.parse(template.replaceAll('__VERSION__', version));
fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Generated ${path.relative(process.cwd(), output)} from ${version}`);
