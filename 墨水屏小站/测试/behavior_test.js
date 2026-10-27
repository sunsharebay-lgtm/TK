const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function load() {
  const elements = new Map(), cookies = new Map(), intervals = new Map(), requests = [];
  let now = 1000000, timerId = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', className: '', style: {},
      parentNode: { clientHeight: 0 }, handlers: {},
      focus() {}, appendChild() {}, removeChild() {},
      addEventListener(event, fn) { this.handlers[event] = fn; },
    });
    return elements.get(id);
  };
  class Clock extends Date { static now() { return now; } }
  class XHR {
    constructor() { requests.push(this); }
    open(method, url) { this.url = url; }
    send() {}
    respond(status, body) {
      this.status = status; this.responseText = body; this.readyState = 4;
      this.onreadystatechange();
    }
  }
  const document = {
    readyState: 'loading', body: element('body'), documentElement: { clientWidth: 1072, clientHeight: 1448 },
    getElementById: element, createElement: element, addEventListener() {},
    get cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(value) { const [k, v] = value.split(';')[0].split('='); cookies.set(k, v); },
  };
  const context = vm.createContext({ document, Date: Clock, XMLHttpRequest: XHR, console,
    setTimeout() {}, clearTimeout() {},
    setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    innerWidth: 1072, innerHeight: 1448, addEventListener() {},
  });
  context.window = context;
  vm.runInContext(source, context);
  return { context, element, cookies, requests, advance(ms) { now += ms; } };
}

test('设置页按钮保存当前输入；弹出面板仍可保存', () => {
  const { context: c, element: el } = load();
  c.refreshWeather = () => {};
  el('city-input').value = '上海'; el('set-city-input').value = ' 北京 ';
  vm.runInContext(html.match(/class="set-save-btn" onclick="([^"]+)"/)[1], c);
  assert.equal(c.currentCity, '北京');
  assert.equal(c.getCookie(c.CITY_COOKIE), '北京');
  el('city-input').value = 'London'; c.saveCity();
  assert.equal(c.currentCity, 'London');
  assert.equal(el('set-city-input').value, 'London');
});

test('时钟样式切换保留横屏与其他样式', () => {
  const { context: c } = load();
  c.document.body.className = 'orient-landscape custom';
  c.toggleClockStyle();
  assert.match(c.document.body.className, /orient-landscape/);
  assert.match(c.document.body.className, /clock-simple/);
  c.toggleClockStyle();
  assert.match(c.document.body.className, /orient-landscape/);
  assert.match(c.document.body.className, /custom/);
  assert.doesNotMatch(c.document.body.className, /clock-simple/);
});

test('番茄钟完成后开始新一轮，重置恢复提示', () => {
  const { context: c, element: el, advance } = load();
  c.pomoLeft = 1; c.pomoStart(); advance(1000); c.pomoTick();
  assert.equal(c.pomoRunning, false);
  assert.equal(c.pomoLeft, 0);
  c.pomoStart(); advance(1000); c.pomoTick();
  assert.equal(c.pomoRunning, true);
  assert.equal(c.pomoLeft, 1499);
  c.pomoReset();
  assert.equal(el('pomo-tip').textContent, '专注 25 分钟,休息 5 分钟');
});

test('番茄钟按实际经过时间计时，暂停不消耗剩余时间', () => {
  const { context: c, advance } = load();
  c.pomoStart(); advance(70000); c.pomoTick();
  assert.equal(c.pomoLeft, 1430);
  c.pausePomo(); advance(30000); c.pomoStart(); advance(2000); c.pomoTick();
  assert.equal(c.pomoLeft, 1428);
});

test('阅读清单支持提示中承诺的回车添加并转义书名', () => {
  const { context: c, element: el } = load();
  c.init();
  el('list-input').value = '<一本书>';
  assert.equal(typeof el('list-input').handlers.keypress, 'function');
  el('list-input').handlers.keypress({ keyCode: 13, which: 13 });
  assert.deepEqual(Array.from(c.getList()), ['<一本书>']);
  assert.match(el('list-items').innerHTML, /&lt;一本书&gt;/);
});

test('XHR 网络错误仅回调一次，状态 0 不算天气请求成功', () => {
  const { context: c, requests } = load();
  const results = [];
  c.xhrGet('https://example.test/', (error, body) => results.push({ error, body }));
  requests[0].respond(0, ''); requests[0].onerror(); requests[0].ontimeout();
  assert.equal(results.length, 1);
  assert.ok(results[0].error);
});

test('更换城市后旧天气响应不得覆盖新城市', () => {
  const { context: c, element: el, requests } = load();
  const data = JSON.stringify({ current_condition: [{ temp_C: '20', humidity: '50', weatherDesc: [{ value: 'Sunny' }], windspeedKmph: '1' }] });
  c.currentCity = '上海'; c.refreshWeather();
  c.currentCity = '北京'; c.refreshWeather();
  requests[1].respond(200, data); requests[0].respond(200, data);
  assert.match(el('weather-main').textContent, /^北京/);
});

test('损坏 cookie 或非数组清单不会让页面无法初始化', () => {
  const { context: c, cookies } = load();
  cookies.set(c.CITY_COOKIE, '%broken');
  assert.doesNotThrow(() => c.init());
  cookies.set(c.LIST_COOKIE, encodeURIComponent('"bad list"'));
  assert.deepEqual(Array.from(c.getList()), []);
});
