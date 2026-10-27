const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const resources = JSON.parse(fs.readFileSync(path.join(root, 'resources.json'), 'utf8')).resources;
const strip = (value) => value.replace(/<[^>]*>/g, '').trim();

async function checkPage(item, mode) {
  const filename = path.join(root, item.detailUrl, 'index.html');
  const html = fs.readFileSync(filename, 'utf8');
  const firstText = html.match(/<(?:pre|span)[^>]*class="template-text"[^>]*>([\s\S]*?)<\/(?:pre|span)>/)?.[1];
  const templates = [...html.matchAll(/<pre[^>]*class="template-text"[^>]*>([\s\S]*?)<\/pre>/g)].map((match) => strip(match[1]));
  const buttonMarkup = [...html.matchAll(/<button[^>]*class="copy-btn"[^>]*>([\s\S]*?)<\/button>/g)];
  const expected = buttonMarkup.map((match, index) => {
    const target = match[0].match(/data-copy-target="([^"]+)"/);
    if (!target) return templates[index];
    const escaped = target[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return strip(html.match(new RegExp('<[^>]*id="' + escaped + '"[^>]*>([\\s\\S]*?)<\\/[^>]+>'))[1]);
  });
  assert.ok(expected.every(Boolean), `${item.id}: every copy button must have a real source`);
  const copied = [];
  const timers = [];
  const areas = new Set();
  let selected = '';
  const buttons = buttonMarkup.map((match, index) => ({
    textContent: strip(match[1]), disabled: false,
    dataset: { copyTarget: match[0].match(/data-copy-target="([^"]+)"/)?.[1] },
    classList: { add() {}, remove() {} },
    setAttribute() {},
    closest: () => ({ querySelector: () => ({ textContent: expected[index] }) }),
    addEventListener(event, callback) { this.click = callback; },
  }));
  const document = {
    querySelectorAll: () => buttons,
    querySelector: (selector) => selector === '.copy-btn' ? buttons[0] : { textContent: selector === '.template-text' ? strip(firstText || '') : expected[0] },
    getElementById: () => ({ textContent: expected[0] }),
    createElement: () => ({ style: {}, setAttribute() {}, select() { selected = this.value; }, remove() { areas.delete(this); } }),
    body: { appendChild(area) { areas.add(area); } },
    execCommand() {
      if (mode === 'throw') throw new Error('clipboard unavailable');
      if (mode === 'false') return false;
      copied.push(selected);
      return true;
    },
    createRange: () => ({ selectNodeContents() {} }),
  };
  const navigator = mode === 'modern' ? { clipboard: { writeText: async (value) => { copied.push(value); } } } :
    mode === 'rejected' ? { clipboard: { writeText: async () => { throw new Error('permission denied'); } } } : {};
  const context = { document, navigator, clearTimeout() {}, setTimeout: (callback) => { timers.push(callback); }, window: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) } };
  vm.createContext(context);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const source = match[1].match(/src="([^"]+)"/);
    const script = source ? fs.readFileSync(path.resolve(path.dirname(filename), source[1]), 'utf8') : match[2];
    vm.runInContext(script, context, { filename });
  }
  for (const button of buttons) {
    await button.click();
    // Existing inline implementations do not return their clipboard promise.
    await new Promise((resolve) => setImmediate(resolve));
    if (mode === 'false' || mode === 'throw') {
      assert.notEqual(button.textContent, '已复制', `${item.id}: failed copying must not claim success (${mode})`);
      assert.equal(button.disabled, false, `${item.id}: failure must allow retry`);
    } else {
      assert.equal(button.textContent, '已复制', `${item.id}: successful copying should confirm completion`);
    }
  }
  assert.equal(areas.size, 0, `${item.id}: temporary textareas must always be removed`);
  assert.deepEqual(copied, mode === 'false' || mode === 'throw' ? [] : expected, `${item.id}: copy the button's own template, not earlier filename/instructions`);
  timers.forEach((callback) => callback());
  buttons.forEach((button, index) => assert.equal(button.textContent, strip(buttonMarkup[index][1]), `${item.id}: restore original label`));
}

(async () => {
  for (const mode of ['modern', 'rejected', 'legacy', 'false', 'throw']) {
    for (const item of resources) await checkPage(item, mode);
  }
  console.log(`Clipboard behavior checks passed (${resources.length} pages × 5 modes).`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
