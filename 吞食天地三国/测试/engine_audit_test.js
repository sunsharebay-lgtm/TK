'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers/current-engine.cjs');
const cmd = (code, parameters = [], indent = 0) => ({ code, parameters, indent });
const check = (name, run) => test(name, async () => run(await engine()));

check('新武将同步等级后，下一次获得经验不会掉回一级', ({ T }) => {
  T.$gameParty.changeLevel(30); T.$gameParty.addActor(8);
  const actor = T.getActor(8); actor.changeExp(actor.exp + 1, true);
  assert.equal(actor.level, 30);
});
check('剧情卸装归还物品，穿脱一次库存总量守恒', ({ T }) => {
  const a = T.getActor(5), old = a.equipAt(1), before = T.$gameParty.itemCount(old);
  const i = new T.Game_Interpreter(); i.setup([cmd(117, [11]), cmd(0)]); i.update();
  assert.equal(a.equipAt(1), null);
  assert.equal(T.$gameParty.itemCount(old), before + 1);
});
check('剧情学会和遗忘技能实际生效，并能存档恢复', async ({ T }) => {
  const a = T.getActor(2), i = new T.Game_Interpreter();
  i.command(cmd(318, [0, 2, 0, 122]));
  assert.ok(a.skills().some(s => s.id === 122));
  await T.saveGame(0); await T.loadGame(0);
  assert.ok(T.getActor(2).skills().some(s => s.id === 122));
  i.command(cmd(318, [0, 2, 1, 122]));
  assert.ok(!T.getActor(2).skills().some(s => s.id === 122));
});
check('仓库区分同编号道具、武器、防具，读档不串物品', async ({ T }) => {
  const items = [T.$dataItems[1], T.$dataWeapons[1], T.$dataArmors[1]];
  items.forEach((it, i) => T.$gameParty.storageGain(it, i + 1));
  await T.saveGame(0); await T.loadGame(0);
  items.forEach((it, i) => assert.equal(T.$gameParty.storageCount(it), i + 1));
  assert.equal(T.$gameParty.storageAll().length, 3);
  T.$gameParty.storageLose(items[1], 2);
  assert.ok(!T.$gameParty.storageAll().includes(items[1]));
});
check('从仓库取回物品超过背包容量时，多余物品留在仓库', ({ T, press }) => {
  const item = T.$dataItems[1]; T.$gameParty.gainItem(item, 98); T.$gameParty.storageGain(item, 10);
  const scene = new T.Scene_Storage(); scene.side = 1; press(scene, 'ok');
  assert.equal(T.$gameParty.itemCount(item), 99); assert.equal(T.$gameParty.storageCount(item), 9);
});
check('背包满时商店不扣钱，空分类确认也不能卡死商店事件', ({ T, press }) => {
  const item = T.$dataItems[1]; T.$gameParty.gainItem(item, 99); T.$gameParty.gainGold(1000);
  const s = new T.Scene_Shop([[0, 1]], false); T.SceneManager.push(s); press(s, 'ok');
  assert.equal(T.$gameParty.gold(), 1000);
  s.tabIndex = 1; s.refresh(); press(s, 'ok'); assert.equal(T.SceneManager.current(), s);
});
check('战斗中的赤心丹只恢复友军并消耗一颗，不会因编号1被当作攻击', ({ T, battle }) => {
  const b = battle(), a = b.partyMembers[0], target = b.partyMembers[1], medicine = T.$dataItems[1];
  target.hp = 1; T.$gameParty.gainItem(medicine, 1);
  a.setAction(0, medicine, -1); a.action(0).target = target;
  b.doActorAction(a);
  assert.ok(target.hp > 1); assert.equal(T.$gameParty.itemCount(medicine), 0);
});
check('同一颗药不能由多名武将重复使用，行动时再次检查库存', ({ T, battle }) => {
  const b = battle(), a = b.partyMembers[0], target = b.partyMembers[1], medicine = T.$dataItems[2];
  target.hp = 1; a.setAction(0, medicine, -1); a.action(0).target = target;
  b.doActorAction(a); assert.equal(target.hp, 1);
});
check('行动前谋略点不足时不能免费施法', ({ T, battle }) => {
  const b = battle(), a = b.partyMembers[0], target = b.troop.members[0];
  a.mp = 0; a.setAction(0, T.$dataSkills[11], -1); a.action(0).target = target;
  const hp = target.hp; b.doActorAction(a); assert.equal(target.hp, hp);
});
check('防御指令清除上次行动，防御不会持续到下次战斗', ({ T, battle, press }) => {
  const b = battle(), a = b.partyMembers[0];
  b.currentActor = a; b.phase = 'actor-cmd'; b.updateActorCmd();
  a.setAction(0, T.$dataSkills[1], -1);
  b.cmdIndex = b.visibleCmds(a).findIndex(([name]) => name === '防御');
  press(b, 'ok'); assert.equal(a._guarding, true); assert.equal(a.action(0).item, null);
  b.phase = 'escaped'; b.finish(); assert.equal(a._guarding, false);
});
check('战前阵亡成员仍然出现在战斗复活目标中', ({ T, battle }) => {
  const dead = T.getActor(3); dead.die(); const b = battle();
  b.beginSelectTargetAlly(true, 9); assert.ok(b.targets.includes(dead));
});
check('防御不削减恢复效果，完复计补满单体兵力', ({ T, battle }) => {
  const b = battle(), a = b.partyMembers[0], target = b.partyMembers[1];
  target.changeLevel(50, false); target.hp = 1; target._guarding = true;
  b.applyToBattler(a, T.$dataSkills[38], target); assert.equal(target.hp, target.mhp);
});
check('选择全体后阵亡者不会被普通回血复活', ({ T, battle }) => {
  const b = battle(), a = b.partyMembers[0], dead = b.partyMembers[1];
  dead.die(); b.applyItem(a, T.$dataSkills[35], [a, dead]); assert.ok(dead.isDead());
});
check('剧情战仅执行匹配的胜负分支', ({ T }) => {
  for (const [result, expected] of [['win', 1], ['escape', 2], ['lose', 3]]) {
    const i = new T.Game_Interpreter();
    i.setup([cmd(601), cmd(122, [99,99,0,0,1],1), cmd(602), cmd(122,[99,99,0,0,2],1),
      cmd(603), cmd(122,[99,99,0,0,3],1), cmd(604), cmd(0)]);
    i._battleResult = result; i.update(); assert.equal(T.$gameVariables.value(99), expected);
  }
});
check('移动路线等待与穿透指令按真实地图格式执行', ({ T }) => {
  const p = T.$gamePlayer; p.forceMoveRoute({ repeat: false, skippable: false,
    list: [cmd(15,[3]), cmd(37), cmd(0)] });
  p._routeExecutor.update(); assert.equal(p._through, false);
  for (let k=0;k<4;k++) p._routeExecutor?.update(); assert.equal(p._through, true);
});
check('战斗事件添加状态不等于消灭敌人，开场条件0在开场触发', ({ battle }) => {
  const b = battle(29); b.startRound();
  assert.equal(b.troop.aliveMembers().length, 1);
  assert.ok(b.troop.members[0].isStateAffected(3));
});
check('战斗公共事件保留嵌套条件、调用顺序与分支内空指令', ({ T, battle }) => {
  const b = battle();
  b.execBattleEventList([cmd(111,[0,99,0]),cmd(122,[98,98,0,0,1],1),cmd(0,[],1),cmd(411),
    cmd(122,[98,98,0,0,2],1),cmd(0,[],1),cmd(412),cmd(122,[97,97,0,0,3]),cmd(0)], b.partyMembers[0]);
  assert.equal(T.$gameVariables.value(98),2); assert.equal(T.$gameVariables.value(97),3);
});
check('嵌套公共事件发起战斗时保留真正的解释器', ({ T }) => {
  const scene = T.SceneManager.current(), child = new T.Game_Interpreter();
  child.processBattle(16, false, true); let actual;
  T.SceneManager.startBattle = (request, interp) => { actual = interp; };
  scene.update(); assert.equal(actual,child);
});
check('对话按段等待确认，后续指令不能越过未读对话', ({ T }) => {
  const i = new T.Game_Interpreter();
  i.setup([cmd(101,['',0,0,2]),cmd(401,['第一段']),cmd(101,['',0,0,2]),cmd(401,['第二段']),cmd(122,[99,99,0,0,1]),cmd(0)]);
  i.update(); assert.equal(T.$gameVariables.value(99),0); assert.equal(T.$gameMessage.texts[0],'第一段');
  T.$gameMessage.clear(); i.update(); assert.equal(T.$gameMessage.texts[0],'第二段');
  T.$gameMessage.clear(); i.update(); assert.equal(T.$gameVariables.value(99),1);
});
check('取消选择按事件指定的否选项处理，不误进取消分支', ({ T, press }) => {
  const w = new T.Window_ChoiceList(0,0,200,100,['是','否'],1); w._inputDelay=0;
  press(w,'cancel'); assert.equal(w.selectedIndex,1); assert.equal(w.cancelled,false);
});
check('画面色调参数保持数值且遵守等待时长', ({ T }) => {
  const i=new T.Game_Interpreter(); i.command(cmd(223,[[-255,-255,-255,0],30,true]));
  T.$gameScreen.update(); assert.ok(T.$gameScreen._tone.every(Number.isFinite)); assert.equal(i.waitCount,30);
});
check('存档失败的提示能够正常绘制', ({ T, ctx }) => {
  const menu = new T.Scene_Save(); menu.error = '存档失败'; assert.doesNotThrow(() => menu.draw(ctx));
});
check('赤壁秘法书使用一次推进到600，扣除道具并中止战斗', ({ T, battle }) => {
  T.$gameVariables.setValue(1,595); T.$gameParty.addActor(14);
  for (const id of [35,36]) T.$gameParty.gainItem(T.$dataItems[id],1);
  const b = battle(72); b.execBattleEventList(T.$dataCommonEvents[30].list,b.partyMembers[0]);
  assert.equal(T.$gameVariables.value(1),600); assert.equal(T.$gameParty.itemCount(T.$dataItems[35]),0);
  assert.equal(T.$gameParty.itemCount(T.$dataItems[36]),0); assert.equal(b._EscapeGuard,true);
});
check('战斗效果中的公共事件每次行动只运行一次', ({ T, battle }) => {
  const b=battle(), skill={scope:8,damage:{type:0},effects:[{code:44,dataId:999}]};
  T.$dataCommonEvents[999]={list:[cmd(122,[99,99,1,0,1]),cmd(0)]};
  b.applyItem(b.partyMembers[0],skill,b.partyMembers[0]); assert.equal(T.$gameVariables.value(99),1);
});
check('总攻持续回合会执行敌群事件，按取消后完成本轮', ({ T, battle, press }) => {
  const b=battle(); b.startRound(); b.doTotalAssault();
  T.$dataTroops[16].pages.push({span:0,conditions:{turnValid:true,turnA:1,turnB:0},list:[cmd(122,[99,99,0,0,55]),cmd(0)]});
  b.actionIndex=b.turnOrder.length; b.resolveNext(); assert.equal(T.$gameVariables.value(99),55);
  press(b,'cancel'); assert.equal(b.totalAssaultActive,true); assert.equal(b._stopTotalAssault,true);
  b.actionIndex=b.turnOrder.length; b._actionFxLeft=0; b.animQueue=[]; b.resolveNext();
  assert.equal(b.totalAssaultActive,false); assert.equal(b.phase,'party-cmd');
});
check('动作选择必须符合谋略使用场景，满血道具不浪费', ({ T }) => {
  const item=T.$dataItems[1], a=T.getActor(2), menu=new T.Scene_Item();
  assert.equal(menu.useItem(item,a),false);
});
check('地图菜单的完复计也补满目标兵力', ({ T }) => {
  const a=T.getActor(2), target=T.getActor(3); a.changeLevel(99,false); a.recoverAll();
  target.changeLevel(99,false); target.hp=1;
  const menu=new T.Scene_Skill(a); menu.applySkillOutOfBattle(T.$dataSkills[38],[target]);
  assert.equal(target.hp,target.mhp);
});
check('剧情转地图失败后恢复可操作状态并保留原地图', async ({ T }) => {
  const map=T.$gameMap, player=T.$gamePlayer, oldCreate=T.SceneManager.gotoMap;
  T.SceneManager.gotoMap=async()=>{throw new Error('offline');};
  await assert.rejects(T.SceneManager.transferPlayer(28,1,1,2,0));
  assert.equal(T.SceneManager.busy,false); assert.equal(T.$gameMap,map); assert.equal(T.$gamePlayer,player);
  T.SceneManager.gotoMap=oldCreate;
});
check('长对话分页，每页行数不超出窗口', ({ T }) => {
  const w=new T.Window_Message(); T.$gameMessage.add('这是一段较长的对白。'.repeat(40)); w.openAndStart();
  assert.ok(w.lines.length > w.pageRows());
  const length=w.lines.length; w.advance(); assert.equal(w.lines.length,length-w.pageRows());
  assert.ok(T.$gameMessage.texts.length>0);
});
check('步数不移除死亡状态，角色不能零血复活', ({ T }) => {
  const a=T.getActor(3); a.die(); for(let k=0;k<101;k++)a.onMapStep(); assert.ok(a.isStateAffected(1));
});
check('地图区域编号读第六层，地形特性不会被阴影编号替代', ({ T }) => {
  const m=T.$gameMap, x=1,y=1; m.data[(4*m.height+y)*m.width+x]=7; m.data[(5*m.height+y)*m.width+x]=12;
  assert.equal(m.regionId(x,y),12);
});
check('普通攻击命中与闪避特性使用真实特性代码', ({ T }) => {
  const a=T.getActor(2); assert.equal(a.xparam(0),0.95); assert.equal(a.paramBase(0)+a.equipParam(0),a.mhp);
});
check('120Hz 屏幕不会把游戏移动与战斗速度翻倍', ({ T, context }) => {
  let next, updates=0;
  context.performance={now:()=>0}; context.requestAnimationFrame=fn=>{next=fn;};
  T.SceneManager.current=()=>({update(){updates++;},draw(){}});
  T.GameMain.loop();
  for(let n=1;n<=120;n++)next(n*1000/120);
  assert.ok(updates>=59&&updates<=61,`每秒逻辑帧实际为${updates}`);
});
check('快速切场景后，迟到的旧BGM不能覆盖新BGM', async ({ T, audioMethods }) => {
  const audio=T.AudioManager; Object.assign(audio,audioMethods);
  const pending={}; audio.buffer=(_,name)=>new Promise(resolve=>{pending[name]=resolve;});
  audio._play=()=>({}); audio._stop=()=>{};
  const old=audio.playBgm({name:'old'}), latest=audio.playBgm({name:'latest'});
  pending.latest({}); await latest; pending.old({}); await old;
  assert.equal(audio._bgmName,'latest');
});
check('七星灯对全部友军生效，包含入战前阵亡武将', ({ T, battle }) => {
  T.getActor(3).die(); const b=battle();
  for(const a of b.partyMembers)if(!a.isDead())a.hp=1;
  b.applyItem(b.partyMembers[0],T.$dataItems[22],b.partyMembers[0]);
  for(const a of b.partyMembers){assert.equal(a.isDead(),false);assert.equal(a.hp,a.mhp);}
});
