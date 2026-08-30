#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, '..', 'deployment-meta.json');
const metadata = {
  schemaVersion: 1,
  commit: process.env.GITHUB_SHA || 'local',
  ref: process.env.GITHUB_REF || '',
  refName: process.env.GITHUB_REF_NAME || '',
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(output, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), output)}`);
