// src/EsportsManager/engine/managerEngine.js

// ==========================================
// 1. 引擎全局数值配置 (Engine Config)
// ==========================================

// 市场物价与评分边界
const PRICE_MIN = 150; // 底薪 150K
const PRICE_MAX = 600; // 顶薪 600K
const OVR_MIN = 65;    // 最低评分
const OVR_MAX = 99;    // 最高评分
const MIN_HEALTHY_TIME = 30; // 健康上场时间（分钟），低于此时间将受到样本惩罚

// Roguelike 培养与经济系统
const BASE_UPGRADE_COST = 80; // 初始培养费用：80K
const OVR_PER_UPGRADE = 2;    // 每次培养提升的 OVR 点数
const MAX_UPGRADE_LEVEL = 5;  // 一名选手最多被培养 5 次


// ==========================================
// 2. 核心数学工具 (Math Utils)
// ==========================================

/**
 * 将一个数值从原始区间映射到目标区间 (Min-Max Normalization)
 */
function normalize(value, minVal, maxVal, targetMin, targetMax) {
  if (maxVal === minVal) return targetMin; // 避免分母为 0
  const ratio = (value - minVal) / (maxVal - minVal);
  return targetMin + ratio * (targetMax - targetMin);
}


// ==========================================
// 3. 选手卡池生成 (Player Roster Generation)
// ==========================================

/**
 * 读取数据库，计算所有选手的 OVR 和 身价
 */
export function getPlayerCards(db) {
  const MIN_PLAY_TIME_TO_ENTER_MARKET = 10; 

  // 1. 读取数据时，直接把上场时间不达标的选手踢出自由市场
  const rawPlayers = (db?.player_totals || []).filter(p => {
     const timePlayed = parseFloat(p.raw_time_mins || 0);
     return timePlayed >= MIN_PLAY_TIME_TO_ENTER_MARKET;
  });

  // 2. 第一步：计算每个人的“原始表现分 (Raw Score)”并加入“小样本惩罚”
  const playersWithRawScore = rawPlayers.map(p => {
    const dmg = parseFloat(p.avg_dmg || 0);
    const block = parseFloat(p.avg_block || 0);
    const heal = parseFloat(p.avg_heal || 0);
    const elims = parseFloat(p.avg_elim || 0);
    const ast = parseFloat(p.avg_ast || 0);
    const timePlayed = parseFloat(p.raw_time_mins || 0);

    let rawScore = 0;
    
    if (p.role === 'TANK') {
       rawScore = dmg + (block * 0.8) + (elims * 100);
    } else if (p.role === 'DPS') {
       rawScore = (dmg * 1.2) + (elims * 150);
    } else if (p.role === 'SUP') {
       rawScore = (heal * 1.2) + (ast * 100) + (dmg * 0.5);
    }

    if (timePlayed < MIN_HEALTHY_TIME) {
      const penaltyRatio = Math.max(0.3, timePlayed / MIN_HEALTHY_TIME); 
      rawScore = rawScore * penaltyRatio;
    }

    return { ...p, rawScore };
  });

  // 3. 第二步：按位置分组，进行归一化处理
  const roles = ['TANK', 'DPS', 'SUP'];
  let finalCards = [];

  roles.forEach(role => {
    const rolePlayers = playersWithRawScore.filter(p => p.role === role);
    if (rolePlayers.length === 0) return;

    const scores = rolePlayers.map(p => p.rawScore);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 4. 第三步：对该位置的每一个选手进行身价和 OVR 换算
    const processedPlayers = rolePlayers.map(p => {
      const ovr = Math.round(normalize(p.rawScore, minScore, maxScore, OVR_MIN, OVR_MAX));
      let rawPrice = normalize(p.rawScore, minScore, maxScore, PRICE_MIN, PRICE_MAX);
      const price = Math.round(rawPrice / 10) * 10;

      // 核心修复：防头像碎裂！确保一定能读到本命英雄
      const mostPlayed = (Array.isArray(p.top_3_heroes) && p.top_3_heroes.length > 0) 
        ? p.top_3_heroes[0] 
        : (p.most_played_hero || '');

      return {
        ...p,
        ovr: ovr,
        price: price, 
        display_name: p.display_name || p.nickname || 'Unknown',
        player_name: p.player_name || 'Player',
        team_short_name: p.team_short_name || 'FA',
        most_played_hero: mostPlayed
      };
    });

    finalCards = [...finalCards, ...processedPlayers];
  });

  return finalCards.sort((a, b) => b.ovr - a.ovr);
}


// ==========================================
// 4. 战力与羁绊计算 (Team Power & Synergy)
// ==========================================

export function calculateTeamPower(roster) {
  if (!roster || roster.length === 0) {
    return { powerScore: 0, basePower: 0, totalPrice: 0, activeSynergy: null };
  }

  const totalPrice = roster.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalOvr = roster.reduce((sum, p) => sum + (p.ovr || 0) + (p.upgradeBonus || 0), 0); 
  const basePower = Math.round(totalOvr / roster.length);

  const teamCounts = {};
  roster.forEach(p => {
    if (p.team_short_name && p.team_short_name !== 'FA') {
      teamCounts[p.team_short_name] = (teamCounts[p.team_short_name] || 0) + 1;
    }
  });

  let activeSynergy = null;
  let synergyBonus = 0;

  for (const [teamName, count] of Object.entries(teamCounts)) {
    if (count >= 3) {
      synergyBonus = count === 5 ? 5 : 3; 
      // 核心修复：电竞化的羁绊文案
      const prefix = count === 5 ? '[完全体]' : '[核心组]';
      activeSynergy = { 
        team: teamName, 
        count: count, 
        bonus: synergyBonus,
        label: `${prefix} ${teamName} 默契 (${count}/5)` 
      };
      break; 
    }
  }

  const finalPower = basePower + synergyBonus;

  return { 
    powerScore: finalPower, 
    basePower: basePower, 
    totalPrice, 
    activeSynergy 
  };
}


// ==========================================
// 5. Roguelike 培养、觉醒与赛后结算
// ==========================================

export const AWAKEN_TRAITS = [
  { id: 'AWK_GOD', name: '💉 纳米激素', icon: '💉', desc: '安娜的究极强化！觉醒时额外获得 +15 OVR 的永久恐怖增幅。' },
  { id: 'AWK_CLUTCH', name: '⚡ 闪回极意', icon: '⚡', desc: '猎空的极限反应！大幅增加战斗时【爆种/特质触发】的概率。' },
  { id: 'AWK_LEADER', name: '👁️ 战术目镜', icon: '👁️', desc: '“我看到你们了”！只要该选手在场，我方所有【阵容克制】收益翻倍。' },
  { id: 'AWK_SHIELD', name: '🛡️ 音障矩阵', icon: '🛡️', desc: '“哦哦哦交给我吧”！绝境铁壁，免疫一切导致 OVR 降低的负面事件和失误。' },
  { id: 'AWK_BLOOD', name: '🦍 原始暴怒', icon: '🦍', desc: '温斯顿的狂化！每打赢一场比赛，该选手永久额外 +2 OVR（滚雪球神技）。' }
];

export function getRandomBossTeam(db) {
  if (!db || !db.teams || db.teams.length === 0) {
    return {
      team_id: "TALON-001",
      team_name: "黑爪精锐暗杀组",
      team_short_name: "TALON",
      powerScore: 85,
      manager: "末日铁拳"
    };
  }

  const randomIndex = Math.floor(Math.random() * db.teams.length);
  const bossTeam = db.teams[randomIndex];
  const bossPower = Math.floor(Math.random() * (95 - 75 + 1)) + 75;

  return {
    team_id: bossTeam.team_id,
    team_name: bossTeam.team_name,
    team_short_name: bossTeam.team_short_name,
    powerScore: bossPower, 
    manager: bossTeam.team_manager || "AI Coach"
  };
}

export function getUpgradeCost(currentLevel = 0) {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return Infinity; 
  const rawCost = BASE_UPGRADE_COST * Math.pow(1.5, currentLevel);
  return Math.round(rawCost / 10) * 10; 
}

export function trainPlayer(player) {
  const currentLevel = player.upgradeLevel || 0;
  
  if (currentLevel >= MAX_UPGRADE_LEVEL) return player;

  const newPlayer = {
    ...player,
    upgradeLevel: currentLevel + 1,
    upgradeBonus: (player.upgradeBonus || 0) + OVR_PER_UPGRADE 
  };

  if (newPlayer.upgradeLevel === MAX_UPGRADE_LEVEL) {
    newPlayer.isAwakened = true;
    
    const randomAwaken = AWAKEN_TRAITS[Math.floor(Math.random() * AWAKEN_TRAITS.length)];
    newPlayer.awakenTrait = randomAwaken;

    if (randomAwaken.id === 'AWK_GOD') {
      newPlayer.upgradeBonus += 15; 
    }
  }

  return newPlayer;
}

/**
 * 👇 填坑修复：赛后特质与成长结算
 * 新增了 relics 参数，用于判定【保温杯】等局外遗物的成长效果
 */
export function applyPostMatchTraits(roster, isWin, relics = []) {
  if (!isWin) return roster; // 输了不成长
  
  const hasPineCup = relics.some(r => r.id === 'PINE_WATERCUP');

  return roster.map(p => {
    let extraBonus = 0;

    // 1. 神格判定：拥有【原始暴怒】，赢一场永久 +2 OVR
    if (p.isAwakened && p.awakenTrait?.id === 'AWK_BLOOD') {
      extraBonus += 2;
    }

    // 2. 遗物判定：拥有【Big Boss的保温杯】，带有特定特质的输出位赢一场永久 +3 OVR
    if (hasPineCup && p.role === 'DPS') {
      const hasTargetTrait = p.traits?.some(t => t.id === 'CLUTCH' || t.id === 'GLASS_CANNON');
      if (hasTargetTrait) {
        extraBonus += 3;
      }
    }

    if (extraBonus > 0) {
      return {
        ...p,
        upgradeBonus: (p.upgradeBonus || 0) + extraBonus
      };
    }
    
    return p;
  });
}