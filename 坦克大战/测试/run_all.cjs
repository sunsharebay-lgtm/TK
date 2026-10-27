'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'tank-battle.html');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const before = hash();
const results = [];
for (const test of fs.readdirSync(__dirname).filter(name => name.endsWith('_test.js') || name === 'validate_maps.js').sort()) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test), source], {
    cwd: root, encoding: 'utf8', timeout: 90000,
  });
  const passed = result.status === 0;
  results.push({ test, passed, status: result.status, error: result.error?.message });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${test}`);
  if (!passed) console.error(result.stdout, result.stderr, result.error?.message || '');
}
const unchanged = before === hash();
if (!unchanged) console.error('Game source changed during verification; run again on the final source.');
const artifacts = path.join(__dirname, '.artifacts');
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(path.join(artifacts, 'node-audit-results.json'), JSON.stringify({
  sourceSha256: before, unchanged, results,
}, null, 2));
const failed = results.filter(result => !result.passed).length;
console.log(`${results.length - failed}/${results.length} suites passed`);
process.exitCode = failed || !unchanged ? 1 : 0;
