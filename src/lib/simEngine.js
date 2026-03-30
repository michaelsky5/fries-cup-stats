// src/lib/simEngine.js

export const TACTICS = [
  { id: 'RUSH', name: '全军突击', desc: '全队火力最大化。', risk: '高风险 / 易翻车', color: '#ec7063' },
  { id: 'POKE', name: '拉扯消耗', desc: '依赖队伍综合实力。', risk: '中风险 / 标准结算', color: '#f4c320' },
  { id: 'DEFEND', name: '铁桶防守', desc: '利用坦度与支援抵御。', risk: '低风险 / 稳定下限', color: '#5dade2' }
];

// ✨ 终极引擎：加入了 AI 战术博弈与敌方特质结算
export function executeSimulation(myRoster, bossTeam, tacticId, mapName, currentMapNum) {
  let logs = [];
  let matchStats = {};
  
  const myTactic = TACTICS.find(t => t.id === tacticId);
  // AI 教练随机选择战术应对
  const bossTactic = TACTICS[Math.floor(Math.random() * TACTICS.length)];
  
  logs.push(`[战术对决] 你的战队采用『${myTactic.name}』 VS 敌方采用『${bossTactic.name}』！`);

  // --- 1. 结算玩家战术倍率 ---
  let totalAtk = 0, totalDef = 0, totalSup = 0, basePowerScore = 0;
  myRoster.forEach(p => { totalAtk += p.attack; totalDef += p.defense; totalSup += p.support; });
  basePowerScore = Math.floor((totalAtk + totalDef + totalSup) / 3);

  let tacticMyRoll = 1.0;
  if (tacticId === 'RUSH') {
    tacticMyRoll = (0.65 + Math.random() * 0.8) * ((totalAtk / basePowerScore) * 1.15); 
    if (tacticMyRoll > 1.2) logs.push(`[高光🔥] 完美冲锋！你的输出位如同天神下凡，撕碎了对方防线！`);
    else if (tacticMyRoll < 0.85) logs.push(`[失误💀] 冲锋过于脱节，你的前排在冲点时被敌方集火融化...`);
  } else if (tacticId === 'DEFEND') {
    tacticMyRoll = (0.95 + Math.random() * 0.15) * ((((totalDef + totalSup) / 2) / basePowerScore) * 1.1); 
    logs.push(`[战局🔒] 你的队伍阵型犹如铁壁，死死卡住了关隘！`);
  } else {
    tacticMyRoll = 0.85 + Math.random() * 0.3;
  }

  // --- 2. 结算 Boss 战术倍率 ---
  let tacticBossRoll = 1.0;
  if (bossTactic.id === 'RUSH') tacticBossRoll = 0.65 + Math.random() * 0.8;
  else if (bossTactic.id === 'DEFEND') tacticBossRoll = 0.95 + Math.random() * 0.15;
  else tacticBossRoll = 0.85 + Math.random() * 0.3;

  // 简单的战术克制逻辑 (防守克突击)
  if (tacticId === 'DEFEND' && bossTactic.id === 'RUSH') tacticBossRoll *= 0.85; 
  if (bossTactic.id === 'DEFEND' && tacticId === 'RUSH') tacticMyRoll *= 0.85;

  // --- 3. 结算玩家特质与个人数据 ---
  let totalMyFinal = 0;
  myRoster.forEach(p => {
    let pRoll = tacticMyRoll;
    if (p.traits) {
      p.traits.forEach(t => {
         if (t.id === 'CLUTCH' && currentMapNum === 5) {
             pRoll += 0.35; logs.push(`[特质触发] ${p.display_name} 【${t.icon}${t.name}】亮起，决胜局接管比赛！`);
         }
         if (t.id === 'WILD') {
             const wildRoll = 0.5 + (Math.random() * 0.9); pRoll *= wildRoll;
             if (wildRoll > 1.25) logs.push(`[特质触发] 骰子摇到了6！${p.display_name} 【${t.icon}${t.name}】大发神威！`);
             if (wildRoll < 0.75) logs.push(`[特质触发] 骰子摇到了1... ${p.display_name} 本局形同梦游。`);
         }
         if (t.id === 'CARRY' && tacticId === 'RUSH') pRoll += 0.15;
         if (t.id === 'DOCTOR' && tacticId === 'DEFEND') pRoll += 0.15;
      });
    }
    const pFinalPower = Math.floor(p.ovr * pRoll * 1.5); 
    totalMyFinal += pFinalPower;

    matchStats[p.player_id] = {
        elim: Math.floor((Number(p.avg_elim) || 12) * pRoll),
        dmg: Math.floor((Number(p.avg_dmg) || 5000) * pRoll),
        heal: Math.floor((Number(p.avg_heal) || 0) * pRoll),
        score: pFinalPower 
    };
  });

  // --- 4. 结算 Boss 特质 (AI也有神仙发挥) ---
  let totalBossFinal = 0;
  bossTeam.roster.forEach(p => {
    let pRoll = tacticBossRoll;
    if (p.traits) {
      p.traits.forEach(t => {
         if (t.id === 'CLUTCH' && currentMapNum === 5) {
             pRoll += 0.35; logs.push(`[敌方觉醒⚠️] 敌方 ${p.display_name} 【${t.icon}${t.name}】爆发，试图强行翻盘！`);
         }
         if (t.id === 'WILD') {
             const wildRoll = 0.5 + (Math.random() * 0.9); pRoll *= wildRoll;
             if (wildRoll > 1.25) logs.push(`[敌方高能🚨] 敌方 ${p.display_name} 【${t.icon}${t.name}】爆种，给你的防线造成毁灭打击！`);
         }
         if (t.id === 'CARRY' && bossTactic.id === 'RUSH') pRoll += 0.15;
         if (t.id === 'DOCTOR' && bossTactic.id === 'DEFEND') pRoll += 0.15;
      });
    }
    totalBossFinal += Math.floor(p.ovr * pRoll * 1.5);
  });

  // --- 5. 终局判定 ---
  if (totalMyFinal >= totalBossFinal) {
    logs.push(`[判定] 顶住了压力！你的战队以 ${totalMyFinal} PWR 赢下本局！`);
  } else {
    logs.push(`[判定] 敌方火力太猛 (${totalBossFinal} PWR)，你输掉了本回合。`);
  }

  return { myFinal: totalMyFinal, bossFinal: totalBossFinal, logs, matchStats };
}