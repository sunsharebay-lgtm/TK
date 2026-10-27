const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'bin/start.sh'), 'utf8');

function launch({ init = 'sysv', missingRuntime = false, terminate = false, runtimeExit = 0, restoreExit = 0 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moping-launch-'));
  const calls = path.join(dir, 'calls');
  function write(file, text) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, { mode: 0o755 });
  }
  try {
    write('us/libkh/bin/fbink', '#!/bin/sh\nexit 0\n');
    write('us/koreader/libkohelper.sh', `INIT_TYPE=${init}\n`);
    write('us/extensions/moping-station-native-test/main.lua', '-- fixture\n');
    if (!missingRuntime) write('us/koreader/luajit', `#!/bin/sh\nprintf 'fbink=%s\\n' "$FBINK" >> "$CALLS"\n${terminate ? 'kill -TERM "$PPID"\n' : ''}exit ${runtimeExit}\n`);
    write('framework', `#!/bin/sh\nprintf "framework %s\\n" "$1" >> "$CALLS"\nif [ "$1" = start ]; then exit ${restoreExit}; fi\n`);
    for (const command of ['start', 'stop', 'usleep']) write(`bin/${command}`, `#!/bin/sh\nprintf '${command} %s\\n' "$*" >> "$CALLS"\n`);
    // Skip only the USB-to-tmpfs relocation; run the actual stop/launch/restore code.
    const script = source.slice(source.indexOf('APP_DIR='))
      .replaceAll('/mnt/us', path.join(dir, 'us'))
      .replaceAll('/etc/init.d/framework', path.join(dir, 'framework'));
    write('start.sh', script);
    const result = spawnSync('/bin/sh', [path.join(dir, 'start.sh')], {
      env: { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, CALLS: calls }, encoding: 'utf8', timeout: 5000,
    });
    return { ...result, calls: fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8') : '', dir };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('SysV 停止后使用同一服务恢复，并传递可用的 FBInk 回退路径', () => {
  const r = launch();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.calls, /framework stop/);
  assert.match(r.calls, /framework start/);
  assert.match(r.calls, /fbink=.*\/us\/libkh\/bin\/fbink/);
  assert.doesNotMatch(r.calls, /start lab126_gui/);
});

test('缺少 LuaJIT 时不得先停止设备图形框架', () => {
  const r = launch({ missingRuntime: true });
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.calls, /framework stop/);
});

test('Upstart 运行被 TERM 中断后仍恢复图形框架', () => {
  const r = launch({ init: 'upstart', terminate: true });
  assert.match(r.calls, /stop lab126_gui/);
  assert.match(r.calls, /start lab126_gui/);
  assert.equal(r.status, 143);
});

test('Lua 主程序失败后保留非零退出码并恢复框架', () => {
  const r = launch({ runtimeExit: 7 });
  assert.equal(r.status, 7);
  assert.match(r.calls, /framework start/);
});

test('框架恢复失败必须通过退出码报告', () => {
  const r = launch({ restoreExit: 8 });
  assert.notEqual(r.status, 0);
});
