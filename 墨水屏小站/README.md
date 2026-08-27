# 墨水屏小站

把闲置的墨水屏（Kindle 等）变成信息屏。

- 翻页时钟 + 日历 + 农历 + 天气 + 每日一句
- 底部导航：主页 / 微信读书 / 番茄钟 / 阅读清单 / 设置
- 5 个页面：时钟主页、微信读书入口、25 分钟番茄钟、阅读清单（cookie）、城市设置
- 专为老 WebKit（KPW3 2015 定制浏览器）优化：ES5、无 fetch/Promise、table 布局、cookie 存储

## 运行

直接用浏览器打开 `index.html` 即可；本地预览建议用静态服务器：

```bash
cd /Users/sun/Desktop/AI/创意空间/墨水屏小站
python3 -m http.server 8643 --bind 127.0.0.1
```

## 线上入口

`https://sunsharebay-lgtm.github.io/TK/墨水屏小站/`

源码从外部仓库 `sunsharebay-lgtm/idle-screen` 迁入创意空间后统一维护；项目版本统一为 `v0.4.0`（页面文案保留 `v0.4`）。

## 项目文档

- `project.md`：交付规格、处理决策与 QA 记录。
- `更新记录.md`：每版更新记录。
- `历史版本/`：已确认版本的旧源码归档。
- `测试/`：本项目的冒烟测试。
