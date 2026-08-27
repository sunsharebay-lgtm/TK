const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const entry = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(entry, 'utf8');

assert.match(html, /<!DOCTYPE html>/i, '入口必须是 HTML 文档');
assert.match(html, /墨屏小站/, '入口应包含项目名称');
assert.doesNotMatch(html, /\bfetch\s*\(/, '兼容目标要求不使用 fetch');
assert.doesNotMatch(html, /\bPromise\b/, '兼容目标要求不使用 Promise');
assert.match(html, /XMLHttpRequest/, '天气更新应保留兼容老 WebKit 的 XHR 方式');
assert.doesNotMatch(html, /<script\s+src=|<link[^>]+href=/, '入口不得依赖外部脚本或样式资源');
assert.match(html, /v0\.4/, '版本号应统一为 v0.4');

console.log(`Idle screen smoke checks passed (${html.length} bytes).`);
