// src/lib/managerEngine.js
import { safeArr } from './selectors.js';

export function getPlayerCards(db) {
  // 1. 挤水分：只选取总存活时间 >= 30分钟的真实首发选手
  const players = safeArr(db?.player_totals).filter(p => Number(p.raw_time_mins) >= 30);
  
  // 2. 算原分：按位置独立计算基础分，加重死亡惩罚
  const rawPlayers = players.map(p => {
    let rawScore = 0;
    const elim = Number(p.avg_elim) || 0;
    const dmg = Number(p.avg_dmg) || 0;
    const heal = Number(p.avg_heal) || 0;
    const block = Number(p.avg_block) || 0;
    const ast = Number(p.avg_ast) || 0;
    const dth = Number(p.avg_dth) || 0;

    if (p.role === 'TANK') {
      rawScore = dmg * 0.4 + block * 0.5 + elim * 100 + ast * 50 - dth * 300;
    } else if (p.role === 'DPS') {
      rawScore = dmg * 0.7 + elim * 150 - dth * 300;
    } else if (p.role === 'SUP') {
      rawScore = heal * 0.6 + dmg * 0.2 + ast * 120 - dth * 300;
    } else {
      rawScore = dmg * 0.5 + elim * 100 - dth * 300;
    }

    return { ...p, rawScore };
  });

  // 3. 找极值：算出每个位置的天花板和地板
  const bounds = {
    TANK: { max: -Infinity, min: Infinity },
    DPS: { max: -Infinity, min: Infinity },
    SUP: { max: -Infinity, min: Infinity },
    FLEX: { max: -Infinity, min: Infinity }
  };

  rawPlayers.forEach(p => {
    const r = bounds[p.role] ? p.role : 'FLEX';
    if (p.rawScore > bounds[r].max) bounds[r].max = p.rawScore;
    if (p.rawScore < bounds[r].min) bounds[r].min = p.rawScore;
  });

  // 4. 动态映射与经济系统
  return rawPlayers.map(p => {
    const r = bounds[p.role] ? p.role : 'FLEX';
    const max = bounds[r].max;
    const min = bounds[r].min;

    let ovr = 60; 
    if (max > min) {
      // 将每个位置的选手能力等比映射到 60-99 分之间
      ovr = 60 + Math.floor(((p.rawScore - min) / (max - min)) * 39);
    }

    if (ovr > 99) ovr = 99;
    if (ovr < 60) ovr = 60;

    // 平滑后的通胀物价曲线
    let price = 60; 
    if (ovr >= 95) price = 600 + (ovr - 95) * 40; 
    else if (ovr >= 85) price = 280 + Math.pow(ovr - 85, 2) * 2.5; 
    else if (ovr >= 75) price = 150 + (ovr - 75) * 12; 
    else price = 60 + (ovr - 60) * 5; 
    
    price = Math.round(price / 10) * 10; 

    // ✨ 新增：赋予选手灵魂特质 (Traits)
    let traits = [];
    const elim = Number(p.avg_elim) || 0;
    const dth = Number(p.avg_dth) || 0;
    const dmg = Number(p.avg_dmg) || 0;
    const heal = Number(p.avg_heal) || 0;

    if (elim >= 18) traits.push({ id: 'CARRY', name: '杀神', icon: '🔥', desc: '搭配[全军突击]火力更猛' });
    if (dth <= 5) traits.push({ id: 'CLUTCH', name: '大心脏', icon: '❤️‍🔥', desc: '决胜局(Map5)强制接管比赛' });
    if (dmg >= 8000 && dth >= 6.5) traits.push({ id: 'WILD', name: '神经刀', icon: '🎲', desc: '表现极不稳定(神鬼莫测)' });
    if (heal >= 10000) traits.push({ id: 'DOCTOR', name: '医者仁心', icon: '💉', desc: '搭配[铁桶防守]奶量惊人' });
    if (traits.length === 0) traits.push({ id: 'STABLE', name: '稳健', icon: '🛡️', desc: '发挥极其稳定' });
    
    traits = traits.slice(0, 2); // 最多保留2个标签

    return {
      ...p,
      ovr,
      price,
      traits, // 👈 把标签塞进数据里
      attack: p.role === 'SUP' ? (ovr * 0.4) : (ovr * 0.8),
      defense: p.role === 'TANK' ? (ovr * 0.9) : (ovr * 0.5),
      support: p.role === 'SUP' ? (ovr * 0.9) : (ovr * 0.3)
    };
  });
}

export function calculateTeamPower(roster) {
  if (!roster || roster.length === 0) return { powerScore: 0, totalPrice: 0, totalAtk: 0, totalDef: 0, totalSup: 0 };
  let totalAtk = 0, totalDef = 0, totalSup = 0, totalPrice = 0;
  
  roster.forEach(p => {
    totalAtk += p.attack;
    totalDef += p.defense;
    totalSup += p.support;
    totalPrice += p.price;
  });
  
  return {
    powerScore: Math.floor((totalAtk + totalDef + totalSup) / 3),
    totalPrice,
    // 👇 新增暴露给战斗引擎的隐性属性
    totalAtk: Math.floor(totalAtk), 
    totalDef: Math.floor(totalDef), 
    totalSup: Math.floor(totalSup)
  };
}

export function getRandomBossTeam(db, playerCards) {
  const teams = safeArr(db?.teams).filter(t => t.player_ids?.length >= 5);
  const randomTeam = teams[Math.floor(Math.random() * teams.length)];
  
  const teamRoster = playerCards
    .filter(p => p.team_id === randomTeam.team_id)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 5);

  return {
    name: randomTeam.team_name,
    short: randomTeam.team_short_name,
    roster: teamRoster,
    power: calculateTeamPower(teamRoster).powerScore
  };
}

export function simulateMatch(myPower, bossPower) {
  const rollMe = 0.85 + (Math.random() * 0.3);
  const rollBoss = 0.85 + (Math.random() * 0.3);
  const myFinal = Math.floor(myPower * rollMe);
  const bossFinal = Math.floor(bossPower * rollBoss);
  
  const isWin = myFinal > bossFinal;
  const isDraw = myFinal === bossFinal;
  
  let msg = isWin 
    ? `你的梦幻阵容以 ${myFinal} 的绝对火力碾压了对手 (${bossFinal})！`
    : `配合失误...你的队伍(${myFinal}) 被对手 (${bossFinal}) 击溃了。`;
  if (isDraw) msg = "势均力敌！双方鏖战至最后一刻握手言和。";

  return { isWin, isDraw, myFinal, bossFinal, msg };
}