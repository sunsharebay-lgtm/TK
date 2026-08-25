# Steel Frontline Desktop

Electron packaging for the Tank Battle game in `../坦克大战.html`.

## Development

```bash
pnpm install
pnpm start
```

`pnpm start` synchronizes the latest game HTML before opening the desktop window.

## Version archive

- `../历史版本/坦克大战-v1.0.html` — 存档：早期原始版本
- `../历史版本/坦克大战-v1.1.html` — 存档：地图通路修复、敌人寻路、跨关火力继承、超级按键口令
- `../坦克大战.html` — 当前开发版本，后续每次迭代完成后归档为新的版本号

## Build installers

Run the platform-specific command on the target operating system:

```bash
pnpm build:mac
pnpm build:mac:universal
pnpm build:win
```

Artifacts are written to `dist/`.
