// src/EsportsManager/engine/simEngine.js

// 🌟 守望先锋经典三大战术体系 (The Holy Trinity of OW)
export const TACTICS = [
  { id: 'DIVE', name: '放狗体系', desc: '极限机动，集火撕裂敌方后排。', risk: '高风险 / 依赖协同与斩杀', color: '#ec7063' },
  { id: 'POKE', name: '长枪拉扯', desc: '远程交叉火力，控图与消耗。', risk: '中风险 / 极其依赖枪法', color: '#f4c320' },
  { id: 'BRAWL', name: '地推阵地', desc: '正面抱团平推，近战肉搏。', risk: '低风险 / 下限极高', color: '#5dade2' }
];

/**
 * 🗺️ 地图契合度计算 (Map Affinity)
 * 将选手ID和地图名组合生成一个固定的伪随机数，决定他在这张图是不是“绝活主场”
 */
function getMapAffinity(playerId, mapName) {
  const seed = `${playerId}_${mapName}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // 转换为 32 位整数
  }
  return Math.abs(hash) / 2147483647;
}

/**
 * ✨ 终极战斗引擎：OW真实战术博弈 + 完美接轨全遗物池、觉醒神格系统 与 内容大爆炸全特质！
 */
export function executeSimulation(myRoster, bossTeam, tacticId, mapName, currentMapNum, activeSynergy = null, activeRelics = []) {
  let logs = [];
  let matchStats = {};
  
  const myTactic = TACTICS.find(t => t.id === tacticId) || TACTICS[1];
  const bossTactic = TACTICS[Math.floor(Math.random() * TACTICS.length)];
  
  logs.push(`[阵容博弈] 你的战队祭出『${myTactic.name}』 VS 敌方掏出『${bossTactic.name}』！`);

  // ==========================================
  // 🎒 解析赞助商遗物 Buff
  // ==========================================
  const hasEnergyDrink = activeRelics.some(r => r.id === 'ENERGY_DRINK');
  const hasProteinBar = activeRelics.some(r => r.id === 'PROTEIN_BAR');
  const hasHeavyArmor = activeRelics.some(r => r.id === 'HEAVY_ARMOR');
  const hasMechaKeyboard = activeRelics.some(r => r.id === 'MECHA_KEYBOARD');
  const hasCoachBoard = activeRelics.some(r => r.id === 'COACH_BOARD');
  const hasLuckyCoin = activeRelics.some(r => r.id === 'LUCKY_COIN');
  const hasTacticalVisor = activeRelics.some(r => r.id === 'TACTICAL_VISOR');
  const hasAcademyGlory = activeRelics.some(r => r.id === 'ACADEMY_GLORY');
  const hasBoyBand = activeRelics.some(r => r.id === 'BOY_BAND');
  
  // 新增传奇遗物解析
  const hasChengduZone = activeRelics.some(r => r.id === 'CHENGDU_ZONE');
  const hasPurpleMatrix = activeRelics.some(r => r.id === 'PURPLE_MATRIX');

  // 计算是否处于劣势 (用于触发特定奇迹)
  const myAvgPower = myRoster.reduce((sum, p) => sum + (p.ovr || 70) + (p.upgradeBonus || 0), 0) / Math.max(1, myRoster.length);
  const isUnderdog = myAvgPower < (bossTeam.powerScore || 80);

  const hasAwakenLeader = myRoster.some(p => p.isAwakened && p.awakenTrait?.id === 'AWK_LEADER');
  if (hasAwakenLeader) logs.push(`[神格共鸣👁️] 战术天眼开启！全队阵容执行力进入绝对领域！`);

  // --- 1. 战术克制与基础倍率 ---
  let tacticMyRoll = 1.0;
  let tacticBossRoll = 1.0;
  let immuneToCounter = hasTacticalVisor || myRoster.some(p => p.traits?.some(t => t.id === 'MVP_2021'));

  if (hasLuckyCoin) {
    logs.push(`[赞助商🪙] 幸运硬币生效！全队发挥极度稳定，拒绝爆冷。`);
    if (tacticId === 'DIVE') tacticMyRoll = 0.90 + Math.random() * 0.50; 
    else if (tacticId === 'BRAWL') tacticMyRoll = 1.00 + Math.random() * 0.10; 
    else tacticMyRoll = 0.95 + Math.random() * 0.25; 
  } else {
    if (tacticId === 'DIVE') tacticMyRoll = 0.70 + Math.random() * 0.70; 
    else if (tacticId === 'BRAWL') tacticMyRoll = 0.95 + Math.random() * 0.15; 
    else tacticMyRoll = 0.85 + Math.random() * 0.35; 
  }

  if (bossTactic.id === 'DIVE') tacticBossRoll = 0.70 + Math.random() * 0.70;
  else if (bossTactic.id === 'BRAWL') tacticBossRoll = 0.95 + Math.random() * 0.15;
  else tacticBossRoll = 0.85 + Math.random() * 0.35;

  let counterBonus = 0.1;
  if (hasCoachBoard) {
    counterBonus += 0.1;
    logs.push(`[赞助商📋] 名帅战术板发力！阵容克制收益大增。`);
  }
  if (hasAwakenLeader) counterBonus += 0.15; 

  // ⚔️ 守望先锋经典克制链：放狗 > 长枪 > 地推 > 放狗
  if (tacticId === 'BRAWL' && bossTactic.id === 'DIVE') { tacticMyRoll += counterBonus; logs.push(`[阵容压制] 地推阵容抱团如铁板一块，完美的拆火让敌方的放狗有去无回！`); }
  if (tacticId === 'DIVE' && bossTactic.id === 'POKE') { tacticMyRoll += counterBonus; logs.push(`[阵容压制] 放狗阵容瞬间骑脸，敌方的长枪体系根本拉不开枪线！`); }
  if (tacticId === 'POKE' && bossTactic.id === 'BRAWL') { tacticMyRoll += counterBonus; logs.push(`[阵容压制] 长枪体系的交叉火力让敌方的地推阵容在半路上就融化了！`); }
  
  if (hasChengduZone && tacticId !== 'BRAWL') {
    immuneToCounter = true;
    tacticMyRoll += 0.10;
    logs.push(`[赞助商🐼] 欢迎来到成都区！全员快乐电竞，战术劣势全量免疫，战力飙升！`);
  }

  if (!immuneToCounter) {
    if (bossTactic.id === 'BRAWL' && tacticId === 'DIVE') { tacticMyRoll -= 0.1; logs.push(`[阵容劣势] 强行跳脸地推阵容，你的机动前排被敌方集火瞬间蒸发...`); }
    if (bossTactic.id === 'DIVE' && tacticId === 'POKE') { tacticMyRoll -= 0.1; logs.push(`[阵容劣势] 敌方机动位不讲理的骑脸让你根本找不到输出环境！`); }
    if (bossTactic.id === 'POKE' && tacticId === 'BRAWL') { tacticMyRoll -= 0.1; logs.push(`[阵容劣势] 敌方长枪不断破盾风筝，你的地推只能一路被动挨打！`); }
  } else if (hasTacticalVisor) {
    logs.push(`[赞助商🥽] 战术护目镜启动，或者队内存在自由人真神，凭借绝对硬实力抹平了阵容劣势！`);
  }

  // --- 2. 羁绊与全局 Buff 判定 ---
  let globalBonus = 0;
  if (activeSynergy) {
    globalBonus += (activeSynergy.bonus * 0.01);
    logs.push(`[羁绊点亮✨] 触发 ${activeSynergy.label}，全队协同性上升！`);
  }
  
  if (hasBoyBand) {
    const starCount = myRoster.filter(p => (p.ovr + (p.upgradeBonus||0)) > 85).length;
    if (starCount > 0) {
      globalBonus += (starCount * 0.02);
      logs.push(`[赞助商✨] 偶像光环！${starCount} 名明星选手引发全场欢呼，战力膨胀！`);
    }
  }

  // ☢️ 毒瘤特质全局结算
  let isToxicTriggered = false;
  myRoster.forEach(p => {
    if (p.traits?.some(t => t.id === 'TOXIC_STAR') && Math.random() < 0.20) {
      isToxicTriggered = true;
      logs.push(`[天王巨星☢️] 糟糕！${p.display_name} 拒绝换英雄配合队伍！全队的体系和羁绊加成完全崩盘了！`);
    }
  });

  if (isToxicTriggered) {
    globalBonus = 0; 
  }

  const synergyMultiplier = 1.0 + globalBonus;
  let c9TriggeredBy = null; 
  let questionMarkBonus = 1.0; 

  // --- 3. 结算玩家个人数据、觉醒与特质 ---
  let totalMyFinal = 0;
  myRoster.forEach(p => {
    let pRoll = tacticMyRoll * synergyMultiplier;
    
    // 职业与体系的契合度
    if (tacticId === 'DIVE' && p.role === 'DPS') pRoll += 0.05; // 放狗极度依赖 C 位收割
    if (tacticId === 'BRAWL' && (p.role === 'TANK' || p.role === 'SUP')) pRoll += 0.05; // 地推依赖坦辅抗压存活

    // 🎒 遗物职业加成
    if (hasEnergyDrink && p.role === 'DPS') pRoll *= 1.15; 
    if (hasProteinBar && p.role === 'SUP') pRoll *= 1.15;
    if (hasHeavyArmor && p.role === 'TANK') pRoll *= 1.15;

    // 🎒 紫色巴蒂的矩阵
    if (hasPurpleMatrix && p.role === 'SUP' && isUnderdog) {
      pRoll *= 1.25;
      logs.push(`[赞助商🪟] 绝境触发！队伍陷入危局，${p.display_name} 的矩阵挡下了致命一击！`);
    }

    // 🎓 遗物：青训的荣耀
    if (hasAcademyGlory && p.team_short_name === 'ACADEMY') {
      pRoll *= 1.25; 
      logs.push(`[赞助商🎓] 青训小将 ${p.display_name} 燃起斗志，超水平发挥！`);
    }

    // 🌟 解析单体觉醒神格
    const hasAwakenShield = p.isAwakened && p.awakenTrait?.id === 'AWK_SHIELD';
    const hasAwakenClutch = p.isAwakened && p.awakenTrait?.id === 'AWK_CLUTCH';
    
    if (p.isAwakened) {
       if (p.awakenTrait?.id === 'AWK_GOD') logs.push(`[神格🔥] 纳米激素注入！${p.display_name} 展现了绝对的统治力！`);
       if (hasAwakenClutch) pRoll *= 1.2; 
       if (p.awakenTrait?.id === 'AWK_BLOOD') logs.push(`[神格🩸] 原始暴怒！${p.display_name} 在杀戮中越战越勇！`);
    }

    let isPbgTriggered = false; // 判断紫色巴蒂特质是否卖了队友

    // 🧬 解析基础特质 (包含传奇专属)
    if (p.traits && p.traits.length > 0) {
      p.traits.forEach(t => {
         // 👑 传奇专属判定
         if (t.id === 'PRIMAL_BLADE') {
             pRoll += 0.30; logs.push(`[🦍 拔刀猩猩] ${p.display_name} 的温斯顿打出了源氏拔刀的压迫感，后排瞬间清空！`);
         }
         else if (t.id === 'RAILGUN_GOD') {
             if (Math.random() > 0.4) { pRoll += 0.40; logs.push(`[🎯 护国神狙] 恐怖的神经枪爆发！${p.display_name} 连续两发充能爆头瞬间融化战场！`); }
         }
         else if (t.id === 'FLETA_DEADLIFT') {
             if (isUnderdog) { pRoll += 0.50; logs.push(`[📊 Fleta级指标] 队伍处于劣势，${p.display_name} 强行接管比赛，一人打出全队一半以上的输出！`); }
         }
         else if (t.id === 'DPS_ZEN') {
             pRoll += 0.20; logs.push(`[🐙 嗜血武僧] ${p.display_name} 的伤害甚至超越了对面的 DPS，但在他身边的队友有点缺奶...`);
         }
         else if (t.id === 'BIG_BOSS') {
             if (tacticId === 'POKE') { pRoll += 0.40; logs.push(`[😎 Big Boss] 完美的拉扯空间，${p.display_name} 犹如天神下凡枪枪爆头！`); }
             if (tacticId === 'DIVE' || tacticId === 'BRAWL') { pRoll -= 0.15; logs.push(`[😎 Big Boss] 被强行近身，${p.display_name} 没能找到输出位置...`); }
         }
         else if (t.id === 'PURPLE_BAP') {
             if (isUnderdog || currentMapNum >= 3) { pRoll += 0.45; isPbgTriggered = true; logs.push(`[🟣 紫色巴蒂] 绝境中的紫衣死神！${p.display_name} 放弃保人，直接跳脸点头秒杀敌方后排！`); }
         }
         
         // 🛡️ 常规特质判定
         else if (t.id === 'CLUTCH' && currentMapNum >= 3) { 
             pRoll += (hasAwakenClutch ? 0.40 : 0.20); 
             logs.push(`[大心脏💎] 决胜局！${p.display_name} 关键击杀强行接管比赛！`);
         }
         else if (t.id === 'WILD') {
             const wildRoll = 0.5 + (Math.random() * 0.9); 
             if (wildRoll < 1.0 && hasAwakenShield) {
                logs.push(`[神格🛡️] 音障矩阵保护了 ${p.display_name} 的拉垮发挥，强制稳定！`);
             } else {
                pRoll *= wildRoll;
                if (wildRoll > 1.2) logs.push(`[神经刀🩸] 状态火热！${p.display_name} 疯狂刷屏犹如神明附体！`);
                if (wildRoll < 0.8) logs.push(`[神经刀🩸] 手感冰凉... ${p.display_name} 团战形同梦游。`);
             }
         }
         else if (t.id === 'GLASS_CANNON') {
             if (tacticId === 'DIVE') {
                 if (Math.random() > 0.4 || hasAwakenShield) {
                     pRoll += 0.25; logs.push(`[玻璃大炮🗡️] ${p.display_name} 刀尖舔血，恐怖爆发融化了对面后排！`);
                 } else {
                     pRoll -= 0.20; logs.push(`[玻璃大炮🗡️] 进场时机太差！${p.display_name} 刚跳进去就直接白给。`);
                 }
             } else if (tacticId === 'BRAWL' && !hasAwakenShield) {
                 pRoll -= 0.15; logs.push(`[玻璃大炮🗡️] 强迫 ${p.display_name} 打地推简直是折磨，身板太脆被不明AOE刮死。`);
             }
         }
         else if (t.id === 'PACIFIST') {
             if (tacticId === 'BRAWL') { pRoll += 0.20; logs.push(`[医者仁心👼] ${p.display_name} 的巨额奶量让地推阵线坚不可摧！`); }
             if (tacticId === 'DIVE') { pRoll -= 0.15; logs.push(`[医者仁心👼] 狗位全飞走了！${p.display_name} 腿短根本奶不到人。`); }
         }
         else if (t.id === 'BRAWLER_TANK') {
             if (tacticId === 'DIVE') { pRoll += 0.20; logs.push(`[重装土匪🚜] ${p.display_name} 直接放弃身后的队友，单枪匹马创翻了对面！`); }
             if (tacticId === 'BRAWL' && !hasAwakenShield) { pRoll -= 0.25; logs.push(`[重装土匪🚜] 让 ${p.display_name} 举盾防守？他一秒钟就冲进人堆送了，防线大崩！`); }
         }
         else if (t.id === 'ONE_TRICK') {
             const mapAffinity = getMapAffinity(p.player_id, mapName);
             if (mapAffinity > 0.5) {
                 pRoll += 0.25; logs.push(`[绝活哥🃏] 抽到了绝佳主场【${mapName}】！${p.display_name} 拿出了绝活绝杀全场！`);
             } else if (!hasAwakenShield) {
                 pRoll -= 0.25; logs.push(`[绝活哥🃏] 【${mapName}】的地形天克他的绝活！${p.display_name} 倔强不换，本局坐牢。`);
             }
         }
         else if (t.id === 'ROOKIE_MONSTER') {
             if (bossTeam.powerScore >= 85 && Math.random() > 0.4) {
                 if (!hasAwakenShield) {
                     pRoll -= 0.20; logs.push(`[初生牛犊🍼] 面对联赛顶级强队，年轻的 ${p.display_name} 操作变形。`);
                 }
             } else {
                 pRoll += 0.15; logs.push(`[初生牛犊🍼] ${p.display_name} 初生牛犊不怕虎，打出了超新星风采！`);
             }
         }
         else if (t.id === 'META_TRAP') {
             if (Math.random() > 0.7 || immuneToCounter) {
                 pRoll += 0.20; questionMarkBonus = 1.05; logs.push(`[版本陷阱🕸️] 逆版本信仰！${p.display_name} 掏出下水道英雄秀翻全场，全队士气大振！`);
             } else if (!hasAwakenShield) {
                 pRoll -= 0.15; logs.push(`[版本陷阱🕸️] 版本劣势太致命，${p.display_name} 的冷门英雄毫无作用...`);
             }
         }
         else if (t.id === 'MARTIAL_ARTIST') {
             if (tacticId === 'DIVE') { pRoll += 0.15; logs.push(`[武斗派🥊] ${p.display_name} 作为辅助居然带头冲锋，伤害拉满！`); }
             if (tacticId === 'BRAWL' && !hasAwakenShield) { pRoll -= 0.15; logs.push(`[武斗派🥊] ${p.display_name} 沉迷点人忘记奶坦克，前排瞬间倒下...`); }
         }
         else if (t.id === 'SUPPRESSION') {
             if (tacticId === 'POKE') { pRoll += 0.15; logs.push(`[火力压制🔥] ${p.display_name} 完美的枪线压制让敌方痛不欲生！`); }
             if (tacticId === 'DIVE' && !hasAwakenShield) { pRoll -= 0.15; logs.push(`[火力压制🔥] 节奏太快！打拉扯的 ${p.display_name} 根本跟不上放狗的步伐。`); }
         }
         else if (t.id === 'WALL_OF_SIGHS') {
             if (tacticId === 'BRAWL') { pRoll += 0.20; logs.push(`[叹息之墙🛡️] ${p.display_name} 就像一座不可逾越的高山，死死卡住车位！`); }
         }
         else if (t.id === 'MECH_BEAST') {
             if (pRoll < 1.0) { pRoll = 1.0; logs.push(`[机制巨兽♿] 局势再劣，${p.display_name} 依然靠着轮椅英雄吃低保稳住下限！`); }
         }
         else if (t.id === 'C9_SYNDROME' && currentMapNum >= 3) {
             if (Math.random() <= 0.05) {
                 if (hasMechaKeyboard || hasAwakenShield) {
                     logs.push(`[免疫🛡️/⌨️] ${p.display_name} 试图离车杀人，被教练在场下大吼按在了点里！`);
                 } else {
                     c9TriggeredBy = p.display_name;
                 }
             }
         }
         else if (t.id === 'QUESTION_MARK') {
             if (Math.random() > 0.5) {
                 questionMarkBonus = 1.05; logs.push(`[问号大师❓] ${p.display_name} 鞭尸公屏打“？”，疯狂搞对手心态，己方大优！`);
             } else if (!hasAwakenShield) {
                 questionMarkBonus = 0.95; logs.push(`[问号大师❓] ${p.display_name} 的嘲讽彻底激怒了敌方，局势反转！`);
             }
         }
      });
    }

    const effectiveOVR = (p.ovr || 70) + (p.upgradeBonus || 0);
    const pFinalPower = Math.floor(effectiveOVR * pRoll * 10 * questionMarkBonus); 
    totalMyFinal += pFinalPower;

    let baseElim = parseFloat(p.avg_elim) || (p.role === 'SUP' ? 8 : 18);
    let baseDmg = parseFloat(p.avg_dmg) || (p.role === 'SUP' ? 3000 : 8000);
    let baseHeal = parseFloat(p.avg_heal) || (p.role === 'SUP' ? 8000 : 0);

    // 紫色巴蒂 / 嗜血武僧 面板修正
    if (isPbgTriggered || p.traits?.some(t => t.id === 'DPS_ZEN')) {
      baseDmg *= 3;
      baseHeal *= 0.2;
    }

    matchStats[p.player_id] = {
        elim: Math.max(0, Math.floor(baseElim * pRoll)),
        dmg: Math.max(0, Math.floor(baseDmg * pRoll)),
        heal: Math.max(0, Math.floor(baseHeal * pRoll)),
        score: pFinalPower 
    };
  });

  // --- 4. 结算 Boss 战力 ---
  let totalBossFinal = 0;
  
  if (bossTeam.roster && bossTeam.roster.length > 0) {
    bossTeam.roster.forEach(p => {
      const pFinalPower = Math.floor((p.ovr || 80) * tacticBossRoll * 10);
      totalBossFinal += pFinalPower;
    });
  } else {
    const baseBossTotal = (bossTeam.powerScore || 80) * 5 * 10;
    const aiVariance = 0.9 + Math.random() * 0.2; 
    totalBossFinal = Math.floor(baseBossTotal * tacticBossRoll * aiVariance);
    
    if (questionMarkBonus < 1.0) {
       totalBossFinal = Math.floor(totalBossFinal * 1.1); 
    }

    if (tacticBossRoll * aiVariance > 1.25) {
      logs.push(`[敌方爆种🚨] 敌方全员状态爆表，操作行云流水！`);
    }
  }

  // --- 5. 终局判定 ---
  let isWin = false;

  if (c9TriggeredBy) {
    isWin = false;
    totalMyFinal = Math.floor(totalBossFinal * 0.8);
    logs.push(`[致命失误 🙈] 团战大获全胜！等等... ${c9TriggeredBy} 在干嘛？！他去追人了没踩车！C9了！！！`);
  } else {
    isWin = totalMyFinal >= totalBossFinal;
    if (isWin) {
      logs.push(`[Victory 🏆] 团战取胜！你的战队以 ${totalMyFinal} 战力彻底击溃了敌方 (${totalBossFinal})！`);
    } else {
      logs.push(`[Defeat 💀] 敌方火力太猛 (${totalBossFinal})，你的阵型被撕裂 (${totalMyFinal}) 遗憾落败。`);
    }
  }

  return { 
    isWin: isWin, 
    myFinal: totalMyFinal, 
    bossFinal: totalBossFinal, 
    logs, 
    matchStats 
  };
}