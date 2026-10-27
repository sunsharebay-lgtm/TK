const assert = require('node:assert/strict');
const { validateResources, findResources } = require('../scripts/catalog.js');
const data = require('../resources.json');
const fresh = () => JSON.parse(JSON.stringify(data));
const resources = validateResources(data);

assert.equal(resources.length, 6);
assert.deepEqual(validateResources({ resources: [] }), []);
for (const invalid of [null, {}, { resources: null }, { resources: {} }, { resources: [null] }, { resources: [[]] }]) {
  assert.throws(() => validateResources(invalid));
}
for (const key of ['number', 'id', 'date', 'title', 'summary', 'detailUrl']) {
  for (const value of [null, '', '  ', 123]) {
    const invalid = fresh();
    invalid.resources[0][key] = value;
    assert.throws(() => validateResources(invalid), `${key}: ${value}`);
  }
}
for (const [key, values] of Object.entries({
  number: ['1', '00', '100', '-1'],
  id: ['contains spaces', 'Repeated--dash'],
  date: ['2026-02-30', '2026-02-29', '2026-13-01', '2026-2-01'],
  detailUrl: ['https://example.com/', '//example.com/', 'javascript:alert(1)', '../外部/', './资源/../', './资源/%2e%2e/', './资源/a/b/', './资源/a\\b/', './资源/a/?q=x', './资源/a/#hash', './资源/a\n/'],
})) {
  for (const value of values) {
    const invalid = fresh();
    invalid.resources[0][key] = value;
    assert.throws(() => validateResources(invalid), `${key}: ${value}`);
  }
}
for (const key of ['number', 'id', 'detailUrl']) {
  const duplicate = fresh();
  duplicate.resources[1][key] = duplicate.resources[0][key];
  assert.throws(() => validateResources(duplicate), /重复/);
}
const leapYear = fresh();
leapYear.resources[0].date = '2024-02-29';
assert.doesNotThrow(() => validateResources(leapYear));
const shuffled = fresh();
shuffled.resources.reverse();
assert.deepEqual(validateResources(shuffled).map(item => item.number), resources.map(item => item.number));
assert.equal(shuffled.resources[0].number, '06', 'validation must not mutate source data');
for (const [query, expected] of [['6', ['06']], ['０６', ['06']], [' HERMES ', ['05']], ['codex 生图', ['06']], ['不存在', []]]) {
  assert.deepEqual(findResources(resources, query).map(item => item.number), expected);
}
assert.equal(findResources(resources, '  ').length, 6);
console.log('Catalog validation checks passed (schema, duplicates, real dates, safe paths, ordering and search).');
