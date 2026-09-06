#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tank-battle.html'), 'utf8');
const start = html.indexOf('const BLENDER_TANK_SHEET');
const end = html.indexOf('/* ============================================================\n   P4', start);
assert(start > 0 && end > start, 'sprite source section exists');
const images = [];
const crops = [];
const original = { p1: 'fallback', basic: 'fallback' };
const sandbox = {
  TS: 32,
  mkCanvas(width, height) {
    return { c: { width, height }, x: { drawImage: (...args) => crops.push(args) } };
  },
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start, end), sandbox);
sandbox.SPR = vm.runInContext('SPR', sandbox);
sandbox.SPR.tanks = { ...original };
sandbox.loadBlenderTankSprites();
assert.deepEqual(sandbox.SPR.tanks, original, 'no Image: fallback survives');
sandbox.Image = class {
  constructor() { images.push(this); }
};
sandbox.loadBlenderTankSprites();
assert.deepEqual(sandbox.SPR.tanks, original, 'pending/failed image: fallback survives');
const bad = images.pop();
bad.naturalWidth = 768;
bad.naturalHeight = 864;
bad.onload();
assert.deepEqual(sandbox.SPR.tanks, original, 'old atlas cannot replace fallback');
bad.naturalWidth = 2048;
bad.naturalHeight = 2304;
bad.onload();
assert.deepEqual(sandbox.SPR.tanks, original, 'wrong larger atlas cannot replace fallback');
sandbox.loadBlenderTankSprites();
const good = images.pop();
good.naturalWidth = 1024;
good.naturalHeight = 1152;
good.onload();
assert.equal(crops.length, 72);
const keys = ['p1', 'p2', 'basic', 'fast', 'power', 'armor4', 'armor3', 'armor2', 'armor1'];
for (let row = 0; row < keys.length; row++) {
  for (let tread = 0; tread < 2; tread++) {
    for (let dir = 0; dir < 4; dir++) {
      const col = tread * 4 + dir;
      assert.deepEqual(crops[row * 8 + col], [good, col * 128, row * 128, 128, 128, 0, 0, 128, 128]);
      assert.deepEqual(sandbox.SPR.tanks[keys[row]][tread][dir], { width: 128, height: 128 });
    }
  }
}
for (const width of [32, 128]) {
  const img = { width, height: width };
  let saved;
  const context = {
    imageSmoothingEnabled: false, imageSmoothingQuality: 'low',
    save() { saved = [this.imageSmoothingEnabled, this.imageSmoothingQuality]; },
    restore() { [this.imageSmoothingEnabled, this.imageSmoothingQuality] = saved; },
    drawImage(...args) {
      assert.deepEqual(args, [img, 10, 20, 32, 32], 'render size stays logical, never 128px');
      assert.equal(this.imageSmoothingEnabled, width > 32);
      if (width > 32) assert.equal(this.imageSmoothingQuality, 'high');
    },
  };
  sandbox.drawTankSprite(context, img, 10, 20);
  assert.equal(context.imageSmoothingEnabled, false, 'terrain rendering state restored');
  assert.equal(context.imageSmoothingQuality, 'low');
}
console.log('BLENDER_LOADER_OK: 72 native-resolution crops, fallback, invalid size, logical render size and context restore');
