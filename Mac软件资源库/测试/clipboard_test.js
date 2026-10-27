const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.slice(html.indexOf('async function copyText('), html.indexOf('function getFilteredItems()'));
const value = 'https://pan.quark.cn/s/test';

async function check(mode) {
  const areas = new Set();
  const timers = [];
  const copied = [];
  let selected = '';
  const button = { textContent: '一键复制夸克链接', disabled: false };
  const context = {
    navigator: mode === 'modern' ? { clipboard: { writeText: async (text) => copied.push(text) } } :
      mode === 'rejected' ? { clipboard: { writeText: async () => { throw new Error('denied'); } } } : {},
    copyStatus: { textContent: '' },
    document: {
      createElement: () => ({ style: {}, setAttribute() {}, select() { selected = this.value; }, remove() { areas.delete(this); } }),
      body: { appendChild(area) { areas.add(area); } },
      execCommand() {
        if (mode === 'throw') throw new Error('unavailable');
        if (mode === 'false') return false;
        copied.push(selected);
        return true;
      },
    },
    window: { setTimeout: (callback) => timers.push(callback) },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  await context.copyText(value, button);
  const succeeded = !['false', 'throw'].includes(mode);
  assert.equal(button.textContent === '已复制', succeeded, `${mode}: button success must match clipboard result`);
  assert.equal(context.copyStatus.textContent.startsWith('已复制'), succeeded, `${mode}: status must match clipboard result`);
  assert.deepEqual(copied, succeeded ? [value] : []);
  assert.equal(areas.size, 0, `${mode}: always remove temporary textarea`);
  timers.forEach((callback) => callback());
  assert.equal(button.textContent, '一键复制夸克链接');
  assert.equal(button.disabled, false);
}

(async () => {
  for (const mode of ['modern', 'rejected', 'legacy', 'false', 'throw']) await check(mode);
  console.log('Mac clipboard behavior checks passed (5 modes).');
})().catch((error) => { console.error(error); process.exitCode = 1; });
