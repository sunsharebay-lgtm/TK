(function setupResources() {
  'use strict';
  const grid = document.getElementById('resources-grid');
  const count = document.getElementById('resource-count');
  const status = document.getElementById('resources-status');
  const search = document.getElementById('resource-search');
  const tools = document.getElementById('resource-tools');
  const clear = document.getElementById('clear-search');
  const retry = document.getElementById('retry-resources');
  if (!grid || !count || !status || !search || !tools || !clear || !retry) return;

  let resources = [];
  let loading = false;

  function buildResourceCard(item) {
    const card = document.createElement('article');
    card.className = 'resource-card';
    const number = document.createElement('span');
    number.className = 'resource-number';
    number.textContent = item.number;
    const date = document.createElement('time');
    date.className = 'resource-date';
    date.dateTime = item.date;
    date.textContent = item.date;
    const main = document.createElement('div');
    main.className = 'resource-main';
    const title = document.createElement('h3');
    title.className = 'resource-title';
    title.textContent = item.title;
    const summary = document.createElement('p');
    summary.className = 'resource-summary';
    summary.textContent = item.summary;
    main.append(title, summary);
    const open = document.createElement('a');
    open.className = 'resource-open';
    open.href = item.detailUrl;
    open.textContent = '查看完整资料 ↗';
    open.setAttribute('aria-label', `查看资源 ${item.number}：${item.title}`);
    card.append(number, date, main, open);
    return card;
  }

  function render() {
    const items = FanResourceCatalog.findResources(resources, search.value);
    grid.replaceChildren(...items.map(buildResourceCard));
    clear.hidden = !search.value;
    if (!resources.length) status.textContent = '暂无资源，敬请期待。';
    else if (!items.length) status.textContent = '没有找到匹配的资源，请换个关键词或清空搜索。';
    else status.textContent = `显示 ${items.length} / ${resources.length} 条资源`;
  }

  async function load() {
    if (loading) return;
    loading = true;
    grid.setAttribute('aria-busy', 'true');
    count.textContent = '—';
    status.textContent = '正在加载资源…';
    retry.hidden = true;
    tools.hidden = true;
    grid.replaceChildren();
    const controller = new AbortController();
    let timeout;
    try {
      // A bounded race covers both the request and its body, even if a browser
      // or mocked transport does not settle the fetch promise after abort().
      resources = await Promise.race([
        (async () => {
          const response = await fetch('./resources.json', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return FanResourceCatalog.validateResources(await response.json());
        })(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => { controller.abort(); reject(new Error('资源加载超时')); }, 10000);
        }),
      ]);
      count.textContent = String(resources.length).padStart(2, '0');
      tools.hidden = resources.length === 0;
      render();
    } catch (_) {
      status.textContent = location.protocol === 'file:'
        ? '资源加载失败。请通过网站地址打开本页，或启动本地预览服务。'
        : '资源加载失败，请检查网络后重新加载。';
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      loading = false;
      grid.setAttribute('aria-busy', 'false');
    }
  }

  search.addEventListener('input', render);
  clear.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
  retry.addEventListener('click', async () => {
    await load();
    (retry.hidden && !tools.hidden ? search : retry.hidden ? status : retry).focus();
  });
  load();
}());
