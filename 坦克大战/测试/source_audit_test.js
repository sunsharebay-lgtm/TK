'use strict';

const test = require('node:test');
const { loadGame } = require('./helpers/game_harness');

test('满级火力达到 5 级，重复使用不会降级', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    w.grantMaxPower();
    assert.equal(w.players[0].level, 5);
    assert.equal(w.players[0].power, 5);
    w.grantMaxPower();
    assert.equal(w.players[0].level, 5);
  });
});

test('基地左右炮弹都穿过自家护墙且不损坏护墙', () => {
  loadGame().run(() => {
    for (const wall of [TE.BRICK, TE.STEEL]) for (const dir of [1, 3]) {
      const w = new World(Game, 0, 0, false, null);
      w.field.clearRect(0, 22, GN, 4);
      w.field.buildWall(wall);
      const target = { cx: dir === 1 ? 320 : 96, cy: 400 };
      assert.equal(w.baseClearShot(dir, target), true);
      const b = new Bullet(w, w.baseOwner, dir, 8, 5);
      for (let i = 0; i < 8; i++) b.update(STEP);
      assert.equal(b.dead, false);
      for (const [gx, gy] of BASE_WALL) assert.equal(w.field.at(gx, gy), wall);
    }
  });
});

test('逐级获得磁场与直接获得五级磁场的耐久压制一致', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    const e = new Enemy(w, 0, 4, false);
    e.x = w.players[0].x; e.y = w.players[0].y - TS;
    e.maxHp = e.hp = 10; e.spawnT = 0;
    w.enemies = [e]; w.freezeT = 99;
    for (let level = 1; level <= 5; level++) { w.fieldLevel = level; w.update(STEP, []); }
    assert.equal(e.maxHp, 5);
    assert.equal(e.hp, 5);
    w.update(STEP, []);
    assert.equal(e.hp, 5, '重复进入不重复削血');
    e.hp = 1; w.fieldLevel = 0; e._fieldApplied = 0;
    w.fieldLevel = 5; w.update(STEP, []);
    assert.ok(e.dead || e.hp > 0, '不能出现零血量且仍活动的敌人');
  });
});

test('最后一个敌人被击破后基地仍被击毁，应结算失败', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    let result = '';
    w.game = { flash() {}, toast() {}, onStageClear() { result = 'clear'; }, onGameOver() { result = 'over'; } };
    w.checkClear(); w.destroyBase(); w.endTimer = STEP;
    w.update(STEP, []);
    assert.equal(result, 'over');
  });
});

test('最后一个敌人被击破同帧玩家全灭，应结算失败', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    w.checkClear();
    const p = w.players[0]; p.lives = 1; p.destroy();
    w.update(STEP, []);
    assert.equal(w.over, true);
    assert.equal(w.cleared, false);
  });
});

test('出生点无空位时等待，不复活到另一辆坦克内部', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    const p = w.players[0]; p.level = 3; p.destroy();
    w.field.grid.fill(TE.STEEL);
    p.respawn();
    assert.equal(p.dead, true);
    assert.equal(p.level, 3, '等待不能反复扣除火力');
    w.field.clearRect(8, 24, 2, 2); p.respawn();
    assert.equal(p.dead, false);
    assert.equal(p.level, 2);
  });
});

test('复活仍正确统计上一条命留下的在途炮弹', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    const p = w.players[0]; p.spawnT = 0; p.tryFire();
    p.destroy(); p.respawn();
    assert.equal(p.bulletsOut, w.bullets.filter(b => !b.dead && b.owner === p).length);
  });
});

test('首领齐射真正产生两条弹道，并遵守冷却与在途上限', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    const e = new Enemy(w, 0, 4, false);
    w.enemies = [e]; w.field.grid.fill(TE.EMPTY);
    e.spawnT = 0; e.egressT = 0; e.think = 10; e.aiDir = e.dir = 2;
    e.skill = 'volley'; e.skillT = 10;
    rnd = () => 0;
    e.update(STEP);
    assert.equal(w.bullets.length, 2);
    assert.notEqual(w.bullets[0].dir, w.bullets[1].dir);
    assert.equal(e.bulletsOut, 2);
    e.update(STEP);
    assert.equal(w.bullets.length, 2);
  });
});

test('短按开火在下一逻辑帧前已松开也会发射一次', () => {
  const h = loadGame();
  h.run('Game.newGame(false); Game.enterPlay(); Game.world.players[0].spawnT = 0;');
  h.sandbox.emit('keydown', { code: 'Space' });
  h.sandbox.emit('keyup', { code: 'Space' });
  h.run(() => {
    Game.update(STEP);
    assert.equal(Game.world.bullets.length, 1);
    Input.endFrame(); Game.update(STEP);
    assert.equal(Game.world.bullets.length, 1);
  });
});

test('摇杆不被第二根手指抢走，非控制手指抬起不停止移动', () => {
  const h = loadGame();
  const pad = h.elements.get('tPad');
  pad.emit('touchstart', { changedTouches: [{ identifier: 1, clientX: 90, clientY: 50 }] });
  pad.emit('touchstart', { changedTouches: [{ identifier: 2, clientX: 10, clientY: 50 }] });
  pad.emit('touchend', { changedTouches: [{ identifier: 2 }] });
  h.run(() => assert.equal(Input.read(0, true, false).rt, true));
  pad.emit('touchend', { changedTouches: [{ identifier: 1 }] });
  h.run(() => assert.equal(Input.read(0, true, false).rt, false));
});

test('口令输入不会触发音效或画面快捷键，重复打开后仍能返回', () => {
  const h = loadGame();
  h.run('Game.openSuperPrompt(); Game.openSuperPrompt();');
  h.sandbox.emit('keydown', { code: 'KeyM', target: { matches: () => true } });
  h.run(() => {
    Game.handleKeys();
    assert.equal(Snd.muted, false);
    Game.closeSuperPrompt();
    assert.equal(Game.state, 'title');
  });
});

test('测试模式从标题开局不得清空正式战役进度或增加局数', () => {
  loadGame().run(() => {
    Game.newGame(false);
    const before = JSON.stringify(Save.data);
    Game.backToTitle(); Game.enterTestMode(); Game.closeTestPanel(); Game.newGame(false);
    assert.equal(JSON.stringify(Save.data), before);
  });
});

test('最终关结算页刷新后继续，不重打已完成的关卡', () => {
  const h = loadGame();
  h.run('Game.startStage = CAMPAIGN_STAGE_COUNT - 1; Game.newGame(false); Game.onStageClear();');
  const fresh = loadGame({ storage: Object.fromEntries(h.storage) });
  fresh.run(() => {
    Game.continueCampaign();
    assert.ok(Game.state === 'win' || (Game.loop === 1 && Game.stageIndex === 0));
  });
});

test('地狱结算页刷新后继续，区域、地图和继承状态一致', () => {
  const h = loadGame();
  h.run('Save.data.hellUnlocked = true; Game.startHell(); Game.world.players[0].level = 4; Game.onStageClear();');
  const fresh = loadGame({ storage: Object.fromEntries(h.storage) });
  fresh.run(() => {
    Game.continueCampaign();
    assert.equal(Game.hellRound, 1);
    assert.equal(Game.world.mapIndex, 9);
    assert.equal(Game.world.players[0].level, 4);
  });
});

test('已完成第五周目存档能恢复通关面板并进入地狱', () => {
  const h = loadGame();
  h.run('Game.loop=4; Game.stageIndex=5; Game.beginStage(); Game.onStageClear(); Game.nextStage();');
  const fresh = loadGame({ storage: Object.fromEntries(h.storage) });
  fresh.run(() => {
    Game.continueCampaign();
    assert.equal(Game.state, 'win');
    assert.equal(Save.data.hellUnlocked, true);
    Game.startHell();
    assert.equal(Game.hell, true);
  });
});

test('读取通关存档进入下一周目时重置用时，零级奖励只加一级', () => {
  const h = loadGame();
  h.run('Game.stageIndex=5; Game.beginStage(); Game.campaignElapsed=123; Game.onStageClear(); Game.nextStage();');
  const fresh = loadGame({ storage: Object.fromEntries(h.storage) });
  fresh.run(() => {
    Game.continueCampaign();
    assert.equal(Game.loop, 1);
    assert.equal(Game.campaignElapsed, 0);
    assert.equal(Game.world.players[0].level, 1);
  });
});

test('更快的辅助通关不能覆盖已有标准通关纪录', () => {
  loadGame().run(() => {
    Game.campaignElapsed = 100; Game.superUsed = false; Game.recordAchievement('loop');
    Game.campaignElapsed = 20; Game.superUsed = true; Game.recordAchievement('loop');
    assert.equal(Save.data.achievements[0].superUsed, false);
    assert.equal(Save.data.achievements[0].time, 100);
  });
});

test('损坏存档的数值与数组不会导致继续战役崩溃', () => {
  const h = loadGame({ storage: { steel_frontline_v2: JSON.stringify({
    maxStage: 0, hi: 'bad', achievements: [null],
    campaign: { stageIndex: 'broken', loop: 0.5, carry: { players: [null] } },
  }) } });
  h.run(() => {
    assert.ok(Number.isInteger(Save.data.maxStage) && Save.data.maxStage >= 1);
    assert.ok(Number.isFinite(Save.data.hi));
    Game.continueCampaign();
    Game.recordAchievement('loop');
  });
});

test('存储不可写时保存进度不显示成功', () => {
  const h = loadGame({ storageFails: true });
  h.run('Game.newGame(false); Game.saveCheckpoint(true);');
  require('node:assert/strict').notEqual(h.elements.get('toast').textContent, '进度已保存');
});

test('通过第一关立即解锁第二关，并能用点击切换起始关卡', () => {
  loadGame().run(() => {
    Game.newGame(false); Game.onStageClear();
    assert.equal(Save.data.maxStage, 2);
    Game.backToTitle(); Game.menuSel = 3; Game.menuActivate();
    assert.equal(Game.startStage, 1);
  });
});

test('失焦自动暂停战斗，切回后不会被留在继续运行的战场', () => {
  const h = loadGame();
  h.run('Game.newGame(false); Game.enterPlay();');
  h.sandbox.emit('blur');
  h.run(() => {
    assert.equal(Game.state, 'pause');
    const time = Game.world.time;
    Game.update(STEP);
    assert.equal(Game.world.time, time);
  });
});

test('死亡等待复活时保存，读取后不会绕过火力掉级', () => {
  const h = loadGame();
  h.run('Game.newGame(false); Game.world.players[0].level=3; Game.world.players[0].destroy(); Game.saveCheckpoint();');
  loadGame({ storage: Object.fromEntries(h.storage) }).run(() => {
    Game.continueCampaign();
    assert.equal(Game.world.players[0].level, 2);
    assert.equal(Game.world.players[0].lives, 2);
  });
});

test('正式地狱与测试模式的首个区域使用同一张地图', () => {
  loadGame().run(() => {
    Save.data.hellUnlocked=true; Game.startHell();
    const map = Game.world.mapIndex;
    Game.testMode=true; Game.testMenu='hell'; Game.testStageIndex=0; Game.startTestStage();
    assert.equal(Game.world.mapIndex, map);
  });
});

test('五个地狱区域结算均可刷新续玩，最终结算不再重打', () => {
  for (let round = 0; round < 5; round++) {
    const h = loadGame();
    h.run(`Game.hell=true; Game.loop=4; Game.hellRound=${round}; Game.stageIndex=${round ? round + 8 : 0}; Game.beginStage(); Game.onStageClear();`);
    const fresh = loadGame({ storage: Object.fromEntries(h.storage) });
    fresh.run('Game.continueCampaign();');
    require('node:assert/strict').equal(fresh.run('Game.hellRound'), round + 1);
    require('node:assert/strict').equal(fresh.run('Game.state'), round === 4 ? 'win' : 'stage');
  }
});

test('旧版区域存档按已保存的区域恢复地图，旧式玩家数组能继续', () => {
  const h = loadGame({ storage: { steel_frontline_v2: JSON.stringify({
    campaign: { schema: 2, hell: true, hellRound: 2, stageIndex: 9, loop: 4,
      carry: [{ lives: 2, level: 4, score: 500, kills: [1, 0, 0, 1], armor: 2, twin: 1 }] },
  }) } });
  h.run(() => {
    Game.continueCampaign();
    assert.equal(Game.world.mapIndex, 10);
    assert.equal(Game.world.players[0].score, 500);
    assert.equal(Game.world.players[0].kills.length, 5);
  });
});

test('铁锹修复护墙时不把正在穿过缺口的坦克封进墙里', () => {
  loadGame().run(() => {
    const w = new World(Game, 0, 0, false, null);
    const p = w.players[0];
    w.field.clearRect(11,23,1,1); p.x=10*G; p.y=22*G;
    assert.equal(w.field.freeForTank(p.x,p.y,TS,TS),true);
    w.applyPowerUp(new PowerUp(w,'shovel',0,0),p);
    assert.equal(w.field.freeForTank(p.x,p.y,TS,TS),true);
    p.x=8*G; p.y=24*G; w.field.update(STEP);
    assert.equal(w.field.at(11,23),TE.STEEL, '坦克离开后自动补齐护墙');
    w.field.clearRect(11,23,1,1); p.x=10*G; p.y=22*G;
    w.field.shovelT=STEP; w.field.update(STEP);
    assert.equal(w.field.freeForTank(p.x,p.y,TS,TS),true, '铁锹到期还原砖墙也不能封住坦克');
    p.x=8*G; p.y=24*G; w.field.update(STEP);
    assert.equal(w.field.at(11,23),TE.BRICK);
  });
});

test('后台音乐计时器恢复时跳过过期节拍，不集中补播数百拍', () => {
  const h = loadGame();
  h.run(() => {
    globalThis.notesPlayed=0;
    Snd.ready=true; Snd.ctx={currentTime:0}; Snd.muted=false;
    Snd._playStep=()=>notesPlayed++;
    Snd.music('battle'); notesPlayed=0; Snd.ctx.currentTime=60;
  });
  [...h.timers.values()].at(-1)();
  h.run(() => assert.ok(notesPlayed<=3, '只调度当前短窗口中的节拍'));
});
