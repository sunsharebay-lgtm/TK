const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const menu = JSON.parse(fs.readFileSync(path.join(root, 'menu.json'), 'utf8'));
const config = fs.readFileSync(path.join(root, 'config.xml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'bin', 'start.sh'), 'utf8');
const lua = fs.readFileSync(path.join(root, 'main.lua'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

assert.equal(menu.items[0].name, 'Moping Station');
assert.equal(menu.items[0].items[0].name, 'Launch native home');
assert.equal(
  menu.items[0].items[0].action,
  '/mnt/us/extensions/moping-station-native-test/bin/start.sh',
);
assert.match(config, /<name>Moping Station<\/name>/);
assert.match(config, /<menu type="json" dynamic="true">menu\.json<\/menu>/);
assert.match(script, /\/mnt\/us\/koreader\/fbink/);
assert.match(script, /\/var\/tmp\/moping-station-native-test\.sh/);
assert.match(script, /exec \/var\/tmp\/moping-station-native-test\.sh/);
assert.match(script, /stop lab126_gui/);
assert.match(script, /start lab126_gui/);
assert.match(script, /koreader\/luajit/);
assert.match(script, /appmgrd start/);
assert.match(lua, /require\("ffi"\)/);
assert.match(lua, /\/dev\/input\/event/);
assert.match(lua, /MOPING STATION/);
assert.match(lua, /Local library/);
assert.match(lua, /WeRead web/);
assert.match(lua, /ABS_MT_POSITION_X/);
assert.match(lua, /ABS_MT_TRACKING_ID/);
assert.match(lua, /local candidates = \{ 1 \}/);
assert.match(lua, /C\.poll/);
assert.match(lua, /Tap a black row/);
assert.match(lua, /MENU: y=/);
assert.match(lua, /INPUT: opened/);
assert.match(lua, /DISABLE_CORE_DUMP|lab126_gui|fbink/);
assert.match(readme, /Launch native home/);
assert.match(readme, /KUAL/);
assert.match(readme, /FBInk/);
assert.match(readme, /KPW3/);
assert.doesNotMatch(readme, /Native screen test/);

console.log('Native prototype smoke checks passed.');
