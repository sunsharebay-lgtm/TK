# Mac 软件资源库 · project.md

## 定位

`Mac软件资源库/` 是创意空间的独立平级项目。自 2026-09-10 起，它不再属于 `粉丝资源/`，而是与坦克大战、吞食天地三国、超级玛丽、墨水屏小站并列；首页以 `RESOURCE 005` 卡片直达 `../Mac软件资源库/`。

## 交付规格（v0.6.0）

- 页面入口：`index.html`，页面标题、页眉与页脚均以创意空间独立项目呈现，回链为 `../创意空间首页/`。
- 数据源：`software-resources.json`，收录 71 个软件、11 个用途分类；包含软件名称、版本、用途、交付类型、官方入口、Homebrew 命令、夸克路径/FID/永久链接与 SHA-256。
- 首页目录：`创意空间首页/game-catalog.template.json` 注册 `mac-software-resource-library`，路径为 `../Mac软件资源库/`，稳定标签为 `resource/mac-software-library/vX.Y.Z`。
- 测试：`测试/software_resources_test.js` 校验数据完整性、21 个安装包镜像、50 个官方链接文件、页面搜索/筛选/复制功能，以及页面不再使用粉丝资源归属。
- 历史版本：`历史版本/Mac软件资源库-v0.6.0-粉丝资源详情页.html` 保存迁移前详情页；后续替换源码继续在 `历史版本/` 归档。

## 处理决策

- 2026-09-09：完成软件目录建设，整理 71 个软件与 11 个分类；遵守授权边界，不提供破解、激活绕过、改包或来源不明安装包。
- 2026-09-10：将原 `粉丝资源/资源/Mac软件资源库/` 的页面、数据和专项测试迁至本目录；从粉丝资源的编号 `06` 中移出。
- 2026-09-10：首页升级为五张并列创意卡片，资源库使用 `RESOURCE 005`；生成器同步支持 `resource/<id>/vX.Y.Z` 标签。

## QA 结果（2026-09-10）

- `node 测试/software_resources_test.js`：通过；71 个软件、11 个分类、21 个安装包镜像、50 个官方链接文件。
- `node ../粉丝资源/测试/resources_test.js`：通过；粉丝资源保留 5 条记录，且不再包含 `mac-software-resource-library`。
- `node ../创意空间首页/测试/game_center_test.js`、`node ../创意空间首页/测试/version_catalog_test.js`：通过；确认首页独立入口、`RESOURCE 005`、资源标签命名空间和目录共 5 项。
- `node ../创意空间首页/scripts/generate-game-catalog.cjs`：通过；已生成包含本项目的创意目录。
- `git diff --check`：通过。

## 源文件 SHA-256

- `index.html`：`72038a6747ab24a60872df80cf2cfa185ff0d86de6abebc6c1cb8768d1113615`
- `software-resources.json`：`c59fc8d93d170ef8c847559aa836fb959bad27ba4859efa4ab67f3e66beedf4b`
- `README.md`：`433f2c0e4a61a7361f8ac1c0ac0ad19e296be81416e4a6fac7dfcf873498c1d9`
- `测试/software_resources_test.js`：`c465d05b4ec86773ae2a45089bb689b9a6934cf7b47294469af80bcbe27e2924`

`project.md` 与 `更新记录.md` 是自引用的记录文件，不固化自身 SHA-256；需要核验时以 Git blob 或导出快照为准。
