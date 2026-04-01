// src/EsportsManager/engine/runEngine.js

import { applyPostMatchTraits } from './managerEngine';

const RUN_STORAGE_KEY = 'friesCup_currentRun';

// ==========================================
// 🎒 局外赞助商/遗物图鉴库
// ==========================================
export const RELICS_POOL = [
  { id: 'BLACK_CARD', name: '黑爪高管无限卡', icon: '💳', desc: '黑爪的钞能力。商店刷新和买人/特训永久打 8 折！' },
  { id: 'VIP_PASS', name: '雅典娜后门权限', icon: '🎫', desc: '顶级黑客技术。自由市场刷新（D牌）费用固定降为 $5K。' },
  { id: 'PIGGY_BANK', name: '洋葱小鱿存钱罐', icon: '🐙', desc: '路霸的最爱。每次战斗胜利后，额外获得 $80K 的理财收益。' },
  { id: 'GAMBLER_DICE', name: '渣客镇盲盒', icon: '🎲', desc: '富贵险中求。商店里有极小概率刷出 0元 的满星神级选手，但也可能刷出天价的废物。' },
  { id: 'MECHA_KEYBOARD', name: '温斯顿的备用键盘', icon: '⌨️', desc: '防拔网线保护。完全免疫【C9综合征】的离车直接判负效果。' },
  { id: 'COACH_BOARD', name: '全息战术沙盘', icon: '📋', desc: '绝对算力。阵容克制对方时，获得的额外压制分翻倍。' },
  { id: 'TACTICAL_VISOR', name: '士兵:76的战术目镜', icon: '🥽', desc: '“我看到你们了”。我方战术永远不会被敌方克制。' },
  { id: 'ACADEMY_GLORY', name: '挑战者杯的荣耀', icon: '🎓', desc: '莫欺少年穷。所有来自 YOUTH ACADEMY (青训营) 的选手在战斗中 OVR +25！' },
  { id: 'ENERGY_DRINK', name: 'D.Va的纳米可乐', icon: '🥤', desc: 'APM 狂飙。全队输出位(DPS)战斗最终表现加成 15%。' },
  { id: 'PROTEIN_BAR', name: '卢西奥的嗨爪麦片', icon: '🥣', desc: '节奏拉满。全队辅助位(SUP)战斗最终表现加成 15%。' },
  { id: 'HEAVY_ARMOR', name: '托比昂的绝版护甲包', icon: '🦺', desc: '坚如磐石。全队坦克位(TANK)战斗最终表现加成 15%。' },
  { id: 'LUCKY_COIN', name: '卡西迪的幸运硬币', icon: '🪙', desc: '天选之子。战斗中全队的随机浮动下限大幅度提高。' },
  { id: 'BOY_BAND', name: '造星计划', icon: '✨', desc: '全明星阵容。首发里每有一名 OVR > 85 的选手，全队额外 +2 OVR。' },
  { id: 'BLOOD_CONTRACT', name: '莫伊拉的生化实验', icon: '🧪', desc: '献祭生命。获得此遗物时全队 OVR 永久 +10，但只要输掉任意一局直接 GAME OVER。' },
  { id: 'SPONSOR_SHOE', name: '猎空的联名潮鞋', icon: '👟', desc: '时光回溯。获得此遗物时，直接恢复 1 滴战队生命值。' },
  { id: 'DRAGONS_MIRACLE', name: '上海龙的破釜沉舟', icon: '🐉', desc: '从 0-40 到总冠军！当你的战队 HP 只剩 1 滴血时，全队 OVR 永久 +15，并免疫一切掉分负面事件！' },
  { id: 'CHENGDU_ZONE', name: '欢迎来到成都区', icon: '🐼', desc: '只要你不选【地推阵地】战术，全队获得“快乐电竞”Buff，敌方的战术克制对你完全无效！' },
  { id: 'PURPLE_MATRIX', name: '紫色巴蒂的矩阵', icon: '🪟', desc: '哈瓦那的奇迹！处于劣势时，我方辅助治疗和伤害翻倍，且极大概率触发锁血！' },
  { id: 'PINE_WATERCUP', name: 'Big Boss的保温杯', icon: '🍵', desc: '深藏功与名。每次打赢一场比赛，所有带有【大心脏】和【玻璃大炮】特质的输出选手，永久额外 +3 OVR。' }
];

// ==========================================
// 👑 SSR级 传奇选手池 (5% 概率在商店刷出)
// ==========================================
const LEGENDARY_POOL = [
  // 🛡️ TANK
  { player_id: 'L-GUXUE', display_name: 'Guxue', player_name: 'Guxue', role: 'TANK', most_played_hero: '温斯顿', ovr: 96, price: 800, team_short_name: 'HZSP', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_GOD', name: '🦍 拔刀猩猩', desc: '原始暴怒如源氏拔刀，大幅提升全队下限！' }, traits: [{ id: "CLUTCH", name: "大心脏", icon: "💎", desc: "关键局神明。" }] },
  { player_id: 'L-AMENG', display_name: 'Ameng', player_name: 'Ameng', role: 'TANK', most_played_hero: '破坏球', ovr: 94, price: 650, team_short_name: 'CDH', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_BLOOD', name: '🐹 YOTTACHAD', desc: '碾碎一切地推阵型！' }, traits: [{ id: "ONE_TRICK", name: "绝活哥", icon: "🃏", desc: "绝活一出，谁与争锋。" }] },
  { player_id: 'L-HADI', display_name: 'Hadi', player_name: 'Hadi', role: 'TANK', most_played_hero: '莱因哈特', ovr: 94, price: 650, team_short_name: 'LDN', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_SHIELD', name: '🛡️ 伦敦之盾', desc: '极致的地推核心！' }, traits: [{ id: "BRAWLER_TANK", name: "重装土匪", icon: "🚜", desc: "只打地推！" }] },

  // ⚔️ DPS
  { player_id: 'L-FLETA', display_name: 'Fleta', player_name: 'Fleta', role: 'DPS', most_played_hero: '回声', ovr: 97, price: 850, team_short_name: 'SHD', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_LEADER', name: '📊 Fleta级指标', desc: '一人撑起全队输出！' }, traits: [{ id: "HEXAGON", name: "伪·六边形战士", icon: "🛑", desc: "绝对稳定。" }] },
  { player_id: 'L-LEAVE', display_name: 'Leave', player_name: 'Leave', role: 'DPS', most_played_hero: '斩仇', ovr: 98, price: 900, team_short_name: 'CDH', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_CLUTCH', name: '👑 21年MVP', desc: '无所不能的世一C！' }, traits: [{ id: "WILD", name: "嗜血神经刀", icon: "🩸", desc: "高风险高回报。" }] },
  { player_id: 'L-SHY', display_name: 'Shy', player_name: 'Shy', role: 'DPS', most_played_hero: '索杰恩', ovr: 96, price: 800, team_short_name: 'HZSP', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_GOD', name: '🎯 护国神狙', desc: '残局爆头，逆天改命！' }, traits: [{ id: "CLUTCH", name: "大心脏", icon: "💎", desc: "关键先生。" }] },
  { player_id: 'L-JINMU', display_name: 'JinMu', player_name: 'Jinmu', role: 'DPS', most_played_hero: '法老之鹰', ovr: 92, price: 600, team_short_name: 'CDH', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_BLOOD', name: '🐼 成都杂技', desc: '离开地面才能玩游戏。' }, traits: [{ id: "GLASS_CANNON", name: "玻璃大炮", icon: "🗡️", desc: "极限输出。" }] },
  { player_id: 'L-PROPER', display_name: 'Proper', player_name: 'Proper', role: 'DPS', most_played_hero: '猎空', ovr: 98, price: 900, team_short_name: 'SFS', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_GOD', name: '👽 外星人', desc: '超越人类理解的反应速度。' }, traits: [{ id: "CLUTCH", name: "大心脏", icon: "💎", desc: "绝境战神。" }] },

  // 💉 SUP
  { player_id: 'L-SHU', display_name: 'Shu', player_name: 'Shu', role: 'SUP', most_played_hero: '安娜', ovr: 97, price: 850, team_short_name: 'GLA', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_CLUTCH', name: '🟣 哈瓦那奇迹', desc: '绝境锁血，单骑救主！' }, traits: [{ id: "MARTIAL_ARTIST", name: "武斗派", icon: "🥊", desc: "输出拉满。" }] },
  { player_id: 'L-ASTRO', display_name: 'FunnyAstro', player_name: 'FunnyAstro', role: 'SUP', most_played_hero: '卢西奥', ovr: 95, price: 700, team_short_name: 'PHI', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_LEADER', name: '🐸 顶级推推', desc: '永远掌握地形杀的主动权！' }, traits: [{ id: "PACIFIST", name: "医者仁心", icon: "👼", desc: "极限保人。" }] },
  { player_id: 'L-VIOL2T', display_name: 'Viol2t', player_name: 'Viol2t', role: 'SUP', most_played_hero: '伊拉锐', ovr: 96, price: 800, team_short_name: 'SFS', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_BLOOD', name: '🔪 嗜血辅助', desc: '输出比自家C位还高！' }, traits: [{ id: "MARTIAL_ARTIST", name: "武斗派", icon: "🥊", desc: "纯粹的杀意。" }] },
  { player_id: 'L-LANDON', display_name: 'Landon', player_name: 'Landon', role: 'SUP', most_played_hero: '巴蒂斯特', ovr: 93, price: 600, team_short_name: 'LDN', upgradeLevel: 5, isAwakened: true, upgradeBonus: 15, awakenTrait: { id: 'AWK_SHIELD', name: '🪟 锁血维生', desc: '永远能在最极限的时间丢出维生立场。' }, traits: [{ id: "WALL_OF_SIGHS", name: "叹息之墙", icon: "🛡️", desc: "防线铁壁。" }] }
];

// ==========================================
// ❓ 随机事件池
// ==========================================
export const EVENTS_POOL = [
  {
    id: 'SCRIM_MASTER', title: '韩国赛区神秘车队', desc: '深夜的亚服，你的队伍排到了一支全韩班职业车队，高强度的对抗让大家精疲力尽。',
    options: [
      { text: '继续加练：随机一名选手突破瓶颈 (OVR +3)，给陪练费 50K。', type: 'BUFF_FIXED' },
      { text: '早点休息：保住发量，不冒风险。', type: 'NONE' }
    ]
  },
  {
    id: 'SPONSOR_GIFT', title: '暴雪官方的空投', desc: '由于你在联赛中的超高人气，官方决定为你提供一波“特殊空投”。',
    options: [
      { text: '联赛分红：获得 250K 现金奖金。', type: 'MONEY' },
      { text: '绝密外设：放弃奖金，随机抽取一件神器遗物。', type: 'RELIC' }
    ]
  },
  {
    id: 'INTERNET_CRASH', title: '黑客的电磁脉冲', desc: '黑影 (Sombra) 黑入了你们的基地网络！比赛马上开始，全员面临断网危机。',
    options: [
      { text: '紧急修复：花费 100K 购买反黑客防火墙。', type: 'LOSE_MONEY_100' },
      { text: '顶着高延迟硬打：选手心态大崩，全队 OVR -2。', type: 'DEBUFF_2' }
    ]
  },
  {
    id: 'BLACK_MARKET', title: '渣客镇地下黑市', desc: '你误入了狂鼠和路霸的地盘。这里充斥着非法的选手合同交易和走私的违禁科技。',
    options: [
      { text: '卖掉队友：随机将队内 1 名首发卖给渣客女王，换取 $500K 黑钱！', type: 'BLACK_MARKET_SELL' },
      { text: '走私交易：花费 $300K，强行购买一件随机神器遗物。', type: 'BLACK_MARKET_BUY_RELIC' },
      { text: '太危险了，快溜。', type: 'NONE' }
    ]
  },
  {
    id: 'BETTING_SCANDAL', title: '地下博彩暗网', desc: '黑爪的理财师马克西米连联络了你，暗示只要你下一场“稍微演一下”，就能拿到天价报酬。',
    options: [
      { text: '在金钱面前屈服：获得 $600K 赃款，但战队信誉扫地，扣除 1 滴血 (HP)。', type: 'BET_ACCEPT' },
      { text: '电子竞技没有假赛！：果断拒绝！选手们士气大振，全队 OVR 永久 +1。', type: 'ALL_BUFF_1' }
    ]
  },
  {
    id: 'EVENT_OWWC_2018', title: '2018 世界杯录像带', desc: '你在基地的杂物间里翻出了一盘 2018 年守望先锋世界杯中国队对阵加拿大的录像带。解说大喊“长风破浪会有时”的声音在耳边回荡。',
    options: [
      { text: '全员组织观看：热血沸腾！全队回忆起 CNOW 的高光时刻，士气大振，OVR 永久 +1。', type: 'ALL_BUFF_1' },
      { text: '放进荣誉陈列室：不忘初心。获得一份神秘的联赛纪念遗物。', type: 'RELIC' }
    ]
  }
];

// ==========================================
// 👶 青训营保底名单
// ==========================================
export const YOUTH_TRAINEES = [
  { player_id: 'y-1', display_name: '青训主坦', role: 'TANK', ovr: 45, price: 0, team_short_name: 'ACADEMY' },
  { player_id: 'y-2', display_name: '青训输出', role: 'DPS', ovr: 45, price: 0, team_short_name: 'ACADEMY' },
  { player_id: 'y-3', display_name: '青训辅助', role: 'SUP', ovr: 45, price: 0, team_short_name: 'ACADEMY' }
];

// ==========================================
// 1. 基础状态与经济流转
// ==========================================

export function initNewRun(db) {
  const newRun = {
    hp: 3, 
    money: 2000, 
    roster: [], 
    currentNode: 1, 
    history: [], 
    relics: [], 
    shopPool: [] 
  };
  
  if (db) newRun.shopPool = getRandomShopPool(db, [], newRun.relics);
  
  saveRun(newRun);
  return newRun;
}

export function getRunState() {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(RUN_STORAGE_KEY);
    if (data) return JSON.parse(data);
  }
  return null;
}

export function saveRun(state) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(state));
  }
}

// ==========================================
// 2. 商店与刷新机制 (融合传奇卡池)
// ==========================================

export function getRandomShopPool(db, currentRosterIds, relics = []) {
  const allPlayers = db?.player_totals || [];
  
  const available = allPlayers.filter(p => 
    !currentRosterIds.includes(p.player_id) && 
    parseFloat(p.raw_time_mins || 0) > 10
  );
  
  const tanks = available.filter(p => p.role === 'TANK').sort(() => 0.5 - Math.random());
  const dps = available.filter(p => p.role === 'DPS').sort(() => 0.5 - Math.random());
  const sups = available.filter(p => p.role === 'SUP').sort(() => 0.5 - Math.random());

  let shop = [];
  
  if (tanks.length > 0) shop.push(tanks.pop());
  if (dps.length > 0) shop.push(dps.pop());
  if (dps.length > 0) shop.push(dps.pop());
  if (sups.length > 0) shop.push(sups.pop());
  if (sups.length > 0) shop.push(sups.pop());

  const leftovers = [...tanks, ...dps, ...sups].sort(() => 0.5 - Math.random());
  while (shop.length < 6 && leftovers.length > 0) {
    shop.push(leftovers.pop());
  }

  shop.sort(() => 0.5 - Math.random());

  // 5% 的极低概率，天降 SSR 传奇巨星！
  if (Math.random() < 0.05) {
    const randomLegend = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)];
    if (!currentRosterIds.includes(randomLegend.player_id)) {
      const replaceIdx = Math.floor(Math.random() * shop.length);
      shop[replaceIdx] = randomLegend;
    }
  }

  // 盲盒变异判定
  if (relics.some(r => r.id === 'GAMBLER_DICE')) {
    shop = shop.map(p => {
      if (p.player_id.startsWith('L-')) return p; 

      const roll = Math.random();
      if (roll < 0.08) {
        return { ...p, price: 0, ovr: Math.max(90, p.ovr + 10), upgradeLevel: 5, upgradeBonus: 10, display_name: `🎰 ${p.display_name}` };
      } else if (roll < 0.18) {
        return { ...p, price: Math.floor(p.price * 2), ovr: Math.min(60, p.ovr - 10), display_name: `🗑️ ${p.display_name}` };
      }
      return p;
    });
  }

  return shop;
}

export function refreshShop(runState, db) {
  const hasBlackCard = runState.relics.some(r => r.id === 'BLACK_CARD');
  const hasVipPass = runState.relics.some(r => r.id === 'VIP_PASS');
  
  let cost = hasBlackCard ? 8 : 10; 
  if (hasVipPass) cost = 5; 

  if (runState.money < cost) {
    return { success: false, msg: "俱乐部资金不足，无法刷新大名单！" };
  }

  runState.money -= cost;
  runState.shopPool = getRandomShopPool(db, runState.roster.map(p => p.player_id), runState.relics);
  saveRun(runState);
  return { success: true, state: runState };
}

export function hirePlayer(runState, player) {
  const hasBlackCard = runState.relics.some(r => r.id === 'BLACK_CARD');
  const finalPrice = player.price === 0 ? 0 : (hasBlackCard ? Math.floor(player.price * 0.8) : player.price);

  if (runState.money < finalPrice) {
    return { success: false, msg: `俱乐部预算不足！(实付需要 $${finalPrice}K)` };
  }
  if (runState.roster.length >= 5) {
    return { success: false, msg: "首发名单已满，请先解雇多余选手！" };
  }

  const roleCount = runState.roster.filter(p => p.role === player.role).length;
  if (player.role === 'TANK' && roleCount >= 1) return { success: false, msg: "战术限制：只能配置 1 名坦克选手！" };
  if (player.role === 'DPS' && roleCount >= 2) return { success: false, msg: "战术限制：最多配置 2 名输出选手！" };
  if (player.role === 'SUP' && roleCount >= 2) return { success: false, msg: "战术限制：最多配置 2 名辅助选手！" };

  runState.money -= finalPrice;
  
  // 注入新援标签，防误触可全额退款
  const newHire = { 
    ...player, 
    actualPaidPrice: finalPrice, 
    isNewThisNode: true 
  };
  
  runState.roster.push(newHire);
  
  if (runState.shopPool) {
    runState.shopPool = runState.shopPool.filter(p => p.player_id !== player.player_id);
  }
  
  saveRun(runState);
  return { success: true, state: runState };
}

export function firePlayer(runState, playerId) {
  const playerIndex = runState.roster.findIndex(p => p.player_id === playerId);
  if (playerIndex > -1) {
    const player = runState.roster[playerIndex];
    
    // 如果是本轮新买的，且没点过特训，直接 100% 实付退款
    const isRefundable = player.isNewThisNode && (player.upgradeLevel || 0) === 0;
    const refundRatio = isRefundable ? 1.0 : 0.8;
    
    const basePrice = player.actualPaidPrice !== undefined ? player.actualPaidPrice : player.price;
    const refund = Math.floor(basePrice * refundRatio);
    
    runState.money += refund; 
    
    // 👇 核心修复：将卖出的选手无缝退回到自由市场列表
    if (!runState.shopPool) runState.shopPool = [];
    
    const returnedPlayer = { ...player };
    // 撕掉新援和实付标签，让他恢复成纯净的卡池状态
    delete returnedPlayer.isNewThisNode;
    delete returnedPlayer.actualPaidPrice;
    
    runState.shopPool.push(returnedPlayer);

    runState.roster.splice(playerIndex, 1);
    saveRun(runState);
  }
  return runState;
}

// ==========================================
// 3. 肉鸽爬塔核心系统
// ==========================================

export function generateMatchOptions(db, currentNode, currentRelics = []) {
  const teams = db?.teams || [];
  if (teams.length < 2) return null;

  let t1 = teams[Math.floor(Math.random() * teams.length)];
  let t2 = teams[Math.floor(Math.random() * teams.length)];
  while(t1.team_id === t2.team_id && teams.length > 1) {
    t2 = teams[Math.floor(Math.random() * teams.length)];
  }

  const baseOvr = 65 + (currentNode * 3);
  const normalOvr = Math.floor(baseOvr + Math.random() * 10);
  const eliteOvr = normalOvr + 12 + Math.floor(Math.random() * 8);

  const unownedRelics = RELICS_POOL.filter(r => !currentRelics.some(cr => cr.id === r.id));
  const randomRelic = unownedRelics.length > 0 
    ? unownedRelics[Math.floor(Math.random() * unownedRelics.length)] 
    : { id: 'GOLD_BAR', name: '源氏的纯金飞镖', icon: '💰', desc: '你已收集了所有遗物，额外获得 150K 奖金作为替代。' }; 

  const options = {
    normal: {
      id: 'NORMAL', type: '常规赛程', risk: 'LOW RISK / 稳步推进',
      team: { ...t1, powerScore: normalOvr },
      rewardMoney: 100 + (currentNode * 10), 
      rewardRelic: null
    },
    elite: {
      id: 'ELITE', type: '极限挑战', risk: 'HIGH RISK / 极易翻车',
      team: { ...t2, powerScore: eliteOvr },
      rewardMoney: 220 + (currentNode * 20),
      rewardRelic: randomRelic
    },
    event: null 
  };

  if (Math.random() < 0.35) {
    const randomEvent = EVENTS_POOL[Math.floor(Math.random() * EVENTS_POOL.length)];
    options.event = randomEvent;
  }

  return options;
}

export function processBattleResult(runState, isWin, selectedMatch, db) {
  runState.roster = applyPostMatchTraits(runState.roster, isWin, runState.relics);

  let moneyEarned = selectedMatch.rewardMoney;
  let relicToAdd = selectedMatch.rewardRelic;
  
  if (isWin && relicToAdd?.id === 'GOLD_BAR') {
    moneyEarned += 150; 
    relicToAdd = null; 
  }
  
  if (isWin && runState.relics.some(r => r.id === 'PIGGY_BANK')) {
    moneyEarned += 80;
  }

  runState.history.push({
    node: runState.currentNode,
    opponent: selectedMatch.team.team_name,
    result: isWin ? 'WIN' : 'LOSS',
    earned: isWin ? moneyEarned : (80 + runState.currentNode * 20),
    relicEarned: isWin && relicToAdd ? relicToAdd.name : null
  });

  if (isWin) {
    runState.currentNode += 1;     
    runState.money += moneyEarned; 
    
    if (relicToAdd && !runState.relics.some(r => r.id === relicToAdd.id)) {
      runState.relics.push(relicToAdd);
      if (relicToAdd.id === 'SPONSOR_SHOE') runState.hp += 1;
      if (relicToAdd.id === 'BLOOD_CONTRACT') runState.roster.forEach(p => p.ovr += 10);
    }
  } else {
    if (runState.relics.some(r => r.id === 'BLOOD_CONTRACT')) {
        runState.hp -= 99; 
    } else {
        runState.hp -= 1;              
    }
    runState.money += (80 + runState.currentNode * 20); 
  }

  // 👇 关键：打完一局比赛回来，全员撕掉“新援”标签，下次卖出统统只能 8折
  runState.roster.forEach(p => { p.isNewThisNode = false; });

  if (db) {
    runState.shopPool = getRandomShopPool(db, runState.roster.map(p => p.player_id), runState.relics);
  }

  saveRun(runState);
  
  if (runState.hp <= 0) return { isGameOver: true, state: runState };
  return { isGameOver: false, state: runState };
}

export function processEventChoice(runState, optionType) {
  let message = '';
  
  switch (optionType) {
    case 'BUFF_FIXED':
      if (runState.roster.length > 0 && runState.money >= 50) {
        const randomPlayerIndex = Math.floor(Math.random() * runState.roster.length);
        runState.roster[randomPlayerIndex].ovr += 3;
        runState.money -= 50;
        message = `${runState.roster[randomPlayerIndex].display_name} 顿悟了版本答案 (OVR+3)！给神秘车队转账 $50K。`;
      } else if (runState.money < 50) {
        message = `陪练费都不够 $50K，对方把你踢出了房间。`;
      } else {
        message = `阵容中没有选手！`;
      }
      break;

    case 'MONEY':
      runState.money += 250;
      message = `获得了官方空投的 $250K 奖金！`;
      break;

    case 'RELIC':
    case 'BLACK_MARKET_BUY_RELIC':
      const cost = optionType === 'BLACK_MARKET_BUY_RELIC' ? 300 : 0;
      if (runState.money >= cost) {
          const unownedRelics = RELICS_POOL.filter(r => !runState.relics.some(cr => cr.id === r.id));
          if (unownedRelics.length > 0) {
            const randomRelic = unownedRelics[Math.floor(Math.random() * unownedRelics.length)];
            runState.relics.push(randomRelic);
            runState.money -= cost;
            message = `获得了绝密科技：【${randomRelic.name}】！` + (cost > 0 ? ` 花费 $${cost}K。` : '');
            if (randomRelic.id === 'SPONSOR_SHOE') runState.hp += 1;
            if (randomRelic.id === 'BLOOD_CONTRACT') runState.roster.forEach(p => p.ovr += 10);
          } else {
            runState.money += (150 - cost);
            message = `你已拥有所有科技，获得 $150K 补偿。`;
          }
      } else {
          message = `资金不足 $300K，路霸一钩子把你赶了出去。`;
      }
      break;

    case 'LOSE_MONEY_100':
      if (runState.money >= 100) {
        runState.money -= 100;
        message = `花费了 $100K，成功拦截了黑影的入侵。`;
      } else {
        runState.roster.forEach(p => p.ovr -= 2);
        message = `资金不足！基地断网一整天，全队心态炸裂，OVR -2。`;
      }
      break;

    case 'DEBUFF_2':
      runState.roster.forEach(p => p.ovr -= 2);
      message = `全队心态受损，OVR -2。`;
      break;

    case 'ALL_BUFF_1':
      runState.roster.forEach(p => p.ovr += 1);
      message = `大快人心！全队士气大振，OVR 永久 +1。`;
      break;

    case 'BLACK_MARKET_SELL':
      if (runState.roster.length > 0) {
          const idx = Math.floor(Math.random() * runState.roster.length);
          const p = runState.roster.splice(idx, 1)[0];
          runState.money += 500;
          message = `渣客女王非常满意... 你永远失去了 ${p.display_name}，但获得了 $500K 黑钱。`;
      } else {
          message = `你连首发都没有，狂鼠嘲笑了你一番。`;
      }
      break;

    case 'BET_ACCEPT':
      runState.money += 600;
      runState.hp -= 1;
      message = `你拿到了 $600K 黑钱，但联盟介入调查，扣除 1 滴血！`;
      if (runState.hp <= 0) message += " 战队因假赛丑闻被暴雪除名，GAME OVER。";
      break;

    case 'STREAMING_YES':
      runState.money += 300;
      runState.roster.forEach(p => p.ovr -= 1);
      message = `全队通宵直播打排位赚了 $300K，但疲劳导致全队 OVR -1。`;
      break;

    case 'TRAIN_HEAVY':
      if (runState.roster.length > 0 && runState.money >= 200) {
        const randomPlayerIndex = Math.floor(Math.random() * runState.roster.length);
        runState.roster[randomPlayerIndex].ovr += 6;
        runState.money -= 200;
        message = `老将亲自点拨！${runState.roster[randomPlayerIndex].display_name} 顿悟，OVR 暴涨 +6！失去 $200K。`;
      } else {
        message = `资金不足 $200K 或无首发选手！`;
      }
      break;

    case 'UPGRADE_EQUIP':
      if (runState.money >= 300) {
        runState.money -= 300;
        runState.roster.forEach(p => p.ovr += 2);
        message = `鸟枪换炮！全队用上了托比昂改装的神器，OVR 永久 +2！失去 $300K。`;
      } else {
        message = `资金不足 $300K，托比昂把你轰了出去。`;
      }
      break;

    case 'NONE':
    default:
      message = `你谨慎地选择了无视，什么都没有发生。`;
      break;
  }

  saveRun(runState);
  return { success: true, state: runState, msg: message };
}

// ==========================================
// 🏆 生涯档案记录系统
// ==========================================
export function recordCareerRun(runState, resultText, finalPower) {
  if (typeof window === 'undefined') return;
  
  const saved = localStorage.getItem('fca_manager_career_v2');
  let stats = { totalRuns: 0, wins: 0, losses: 0, maxOvr: 0, totalMoneySpent: 0, hallOfFame: [] };
  
  if (saved) {
    try { stats = { ...stats, ...JSON.parse(saved) }; } catch (e) {}
  }

  stats.totalRuns += 1;
  const isWin = String(resultText).toUpperCase().includes('WIN') || resultText.includes('胜') || resultText.includes('冠');
  if (isWin) stats.wins += 1;
  else stats.losses += 1;

  if (finalPower > stats.maxOvr) stats.maxOvr = finalPower;

  const record = {
    node: runState.currentNode,
    finalPower: finalPower,
    roster: [...runState.roster],
    relics: [...runState.relics],
    result: resultText
  };

  stats.hallOfFame = [record, ...stats.hallOfFame].slice(0, 10);
  
  localStorage.setItem('fca_manager_career_v2', JSON.stringify(stats));
}