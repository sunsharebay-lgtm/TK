# 墨屏小站原生测试 · 2026-10-26 本地审查

交付规格：维持现有 KPW3 / KUAL / LuaJIT 原型，仅修正坐标、依赖选择、启动和恢复错误处理；不增加原生功能，不写系统分区，不安装到设备。

决策、完整 QA 和源码 SHA-256 统一记录在 `../../project.md` 的 2026-10-26 节。修改前启动器和 Lua 已归档到 `../../历史版本/2026-10-26-review-before/原生版/墨屏小站原生测试/`。

QA：启动脚本 5/5、真实 Lua 输入回放 6/6、smoke 与 shell 语法通过。设备运行状态未验证。

- `bin/start.sh`：`93ff96b8abd50a7be65d8294a2841e41da6ba7bd0bed590cc33c62fc63654800`
- `main.lua`：`82350cbab6bd84dd3802bdd685d72ceb1a9326e8b18a8fbaccb17f9efb8ad4b7`
