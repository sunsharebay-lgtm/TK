(function exposeCatalog(root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else root.FanResourceCatalog = catalog;
}(globalThis, () => {
  'use strict';

  function validateResources(data) {
    if (!data || !Array.isArray(data.resources)) throw new Error('资源目录必须包含 resources 数组');
    const numbers = new Set();
    const ids = new Set();
    const paths = new Set();
    for (const item of data.resources) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('资源条目必须是对象');
      for (const key of ['number', 'id', 'date', 'title', 'summary', 'detailUrl']) {
        if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error(`资源缺少 ${key}`);
      }
      if (!/^\d{2}$/.test(item.number) || item.number === '00') throw new Error('资源编号必须为 01～99');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error('资源 id 必须使用小写英文、数字和连字符');
      const timestamp = Date.parse(item.date + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== item.date) {
        throw new Error(`资源 ${item.number} 的日期无效`);
      }
      // Only an immediate resource directory is navigable. Reject encoded paths,
      // schemes, query strings and traversal before assigning a browser href.
      const match = /^\.\/资源\/([^/\\%?#:\u0000-\u001f\u007f]+)\/$/.exec(item.detailUrl);
      if (!match || ['.', '..'].includes(match[1]) || match[1].trim() !== match[1]) {
        throw new Error(`资源 ${item.number} 的资料页必须位于 ./资源/<资料名>/`);
      }
      if (numbers.has(item.number) || ids.has(item.id) || paths.has(item.detailUrl)) throw new Error('资源编号、id 和资料页地址不能重复');
      numbers.add(item.number);
      ids.add(item.id);
      paths.add(item.detailUrl);
    }
    return [...data.resources].sort((left, right) => left.number.localeCompare(right.number));
  }

  function findResources(resources, query) {
    const normalized = query.normalize('NFKC').trim().toLocaleLowerCase();
    if (!normalized) return resources;
    if (/^\d{1,2}$/.test(normalized)) return resources.filter(item => item.number === normalized.padStart(2, '0'));
    const words = normalized.split(/\s+/);
    return resources.filter(item => {
      const text = [item.number, item.title, item.summary].join(' ').normalize('NFKC').toLocaleLowerCase();
      return words.every(word => text.includes(word));
    });
  }

  return { validateResources, findResources };
}));
