// src/EsportsManager/engine/traitAssigner.js

// 计算超越百分比
function getPercentile(arr, val) {
  if (!arr || arr.length === 0) return 0;
  const count = arr.filter(x => x < val).length;
  return count / arr.length;
}

// 基于字符串生成固定的伪随机数 (0~1 之间)
function getDeterministicRandom(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32位 整数
  }
  return Math.abs(hash) / 2147483647;
}

export function assignAdvancedTraits(players) {
  const activePlayers = players.filter(p => parseFloat(p.raw_time_mins || 0) >= 15);

  const statsByRole = { TANK: {}, DPS: {}, SUP: {} };
  ['TANK', 'DPS', 'SUP'].forEach(role => {
    const rolePlayers = activePlayers.filter(p => p.role === role);
    statsByRole[role] = {
      dmg: rolePlayers.map(p => parseFloat(p.avg_dmg) || 0),
      heal: rolePlayers.map(p => parseFloat(p.avg_heal) || 0),
      elim: rolePlayers.map(p => parseFloat(p.avg_elim) || 0),
      dth: rolePlayers.map(p => parseFloat(p.avg_dth) || 0),
      block: rolePlayers.map(p => parseFloat(p.avg_block) || 0)
    };
  });

  return players.map(p => {
    let traits = [];
    const timePlayed = parseFloat(p.raw_time_mins || 0);
    const nameLower = (p.display_name || '').toLowerCase();
    
    // ==========================================
    // 👑 守望电竞传世名梗 (专属隐藏特质)
    // 传奇选手拥有免除一切负面判定的特权！
    // ==========================================
    let isLegendary = false;

    if (nameLower.includes('guxue') || nameLower === '孤雪') {
      isLegendary = true;
      traits.push({ id: "PRIMAL_BLADE", name: "拔刀猩猩", icon: "🦍", desc: "CNOW 永远的盾。哪怕只剩一丝血，他也能用温斯顿打出源氏拔刀的压迫感，极大提升队伍下限！" });
    } else if (nameLower.includes('leave') || nameLower === '离开') {
      isLegendary = true;
      traits.push({ id: "MVP_2021", name: "无所不能", icon: "👑", desc: "你永远可以相信离开！精通所有英雄，完全免疫【版本陷阱】和【阵容被克】的负面影响。" });
    } else if (nameLower.includes('shy')) {
      isLegendary = true;
      traits.push({ id: "RAILGUN_GOD", name: "护国神狙", icon: "🎯", desc: "拥有全游戏最恐怖的瞬间爆发判定，极大概率在残局打出逆天改命的爆头击杀！" });
    } else if (nameLower.includes('ameng') || nameLower === '阿梦') {
      isLegendary = true;
      traits.push({ id: "YOTTACHAD", name: "YOTTACHAD", icon: "🐹", desc: "破坏球唯一真神！选出来就是砸，极大概率激怒并碾碎敌方地推阵型！" });
    } else if (nameLower.includes('fleta')) {
      isLegendary = true;
      traits.push({ id: "FLETA_DEADLIFT", name: "Fleta级指标", icon: "📊", desc: "当队友表现拉垮时，他会强行接管比赛！全队处于劣势时，个人战力极其变态地翻倍。" });
    } else if (nameLower.includes('shu')) {
      isLegendary = true;
      traits.push({ id: "PURPLE_BAP", name: "紫色巴蒂", icon: "🟣", desc: "绝境中的紫衣死神。当队伍处于战力劣势或决胜局时，有极大概率拍出完美的增幅矩阵完成单骑救主！" });
    } else if (nameLower.includes('jinmu') || nameLower === '金木') {
      isLegendary = true;
      traits.push({ id: "GLASS_CANNON", name: "成都杂技", icon: "🐼", desc: "离开地面才能玩游戏。永远不按套路出牌，上限摧毁宇宙，下限白给。" });
    } else if (nameLower.includes('proper')) {
      isLegendary = true;
      traits.push({ id: "CLUTCH", name: "外星人", icon: "👽", desc: "超越人类理解的反应速度。绝境战神，决胜局必爆种。" });
    } else if (nameLower.includes('hadi')) {
      isLegendary = true;
      traits.push({ id: "BRAWLER_TANK", name: "伦敦之盾", icon: "🚜", desc: "纯正的地推浪漫！只打地推，创碎一切！" });
    } else if (nameLower.includes('viol2t') || nameLower === '紫罗兰') {
      isLegendary = true;
      traits.push({ id: "MARTIAL_ARTIST", name: "嗜血辅助", icon: "🔪", desc: "纯粹的杀意。输出比自家C位还高的辅助，容易放生队友。" });
    } else if (nameLower.includes('landon')) {
      isLegendary = true;
      traits.push({ id: "WALL_OF_SIGHS", name: "锁血维生", icon: "🪟", desc: "永远能在最极限的时间丢出维生立场，防线铁壁。" });
    } else if (nameLower.includes('funnyastro') || nameLower === 'astro') {
      isLegendary = true;
      traits.push({ id: "PACIFIST", name: "顶级推推", icon: "🐸", desc: "永远掌握地形杀的主动权！极限拉扯与保人。" });
    }

    // ==========================================
    // 🚰 替补专属判定 (传奇选手免疫此惩罚)
    // ==========================================
    if (!isLegendary && timePlayed < 15) {
      traits.push({ id: "WATER_BOY", name: "饮水机管理员", icon: "🚰", desc: "常年替补，上场时间极少。强行让他首发，表现将极其不稳定。" });
      return { ...p, traits };
    }

    const roleStats = statsByRole[p.role];
    if (!roleStats) return { ...p, traits }; 

    const dmg = parseFloat(p.avg_dmg) || 0;
    const heal = parseFloat(p.avg_heal) || 0;
    const elim = parseFloat(p.avg_elim) || 0;
    const dth = parseFloat(p.avg_dth) || 0;
    const block = parseFloat(p.avg_block) || 0;

    const dmgPct = getPercentile(roleStats.dmg, dmg);
    const healPct = getPercentile(roleStats.heal, heal);
    const elimPct = getPercentile(roleStats.elim, elim);
    const dthPct = getPercentile(roleStats.dth, dth);
    const blockPct = getPercentile(roleStats.block, block);

    const mostPlayed = Array.isArray(p.top_3_heroes) ? p.top_3_heroes[0] : p.most_played_hero;
    const timeMostPlayed = Array.isArray(p.top_3_heroes_time) && p.top_3_heroes_time.length > 0 
      ? parseFloat(p.top_3_heroes_time[0]) 
      : 0;

    // ==========================================
    // ⚔️ 战术特质分配逻辑 (基于真实数据)
    // ==========================================

    if (p.ovr >= 85 && getDeterministicRandom(p.player_id + 'toxic') < 0.15) {
       traits.push({ id: "TOXIC_STAR", name: "天王巨星", icon: "☢️", desc: "天王巨星。个人实力极强，但有概率拒绝配合队伍，直接摧毁我方所有的羁绊加成！" });
    }

    if (timePlayed > 0 && timeMostPlayed > 0 && (timeMostPlayed / timePlayed >= 0.85)) {
      traits.push({ id: "ONE_TRICK", name: "绝活哥", icon: "🃏", desc: "拿手好戏。如果随机到适合他绝活的地图，战力暴涨；若是遭遇天克，全场隐身。" });
    }

    if (timePlayed < 30 && p.ovr >= 78) {
      traits.push({ id: "ROOKIE_MONSTER", name: "初生牛犊", icon: "🍼", desc: "极具天赋的新星。面对精英强队时可能因紧张而变形，但打弱队时重拳出击。" });
    }

    if (["Mauga", "Orisa", "Moira"].includes(mostPlayed)) {
      traits.push({ id: "MECH_BEAST", name: "机制巨兽", icon: "♿", desc: "依靠轮椅英雄保底。战斗力极其稳定，下限高但几乎无法创造奇迹。" });
    }
    
    if (["Lifeweaver", "Illari", "Symmetra"].includes(mostPlayed)) {
      traits.push({ id: "META_TRAP", name: "版本陷阱", icon: "🕸️", desc: "坚持信仰。因为英雄弱势，下限被大幅拉低；但如果赢了团战，全队士气大增！" });
    }

    if (elimPct >= 0.80 && dthPct <= 0.30) {
      traits.push({ id: "CLUTCH", name: "大心脏", icon: "💎", desc: "关键先生。在决胜局 (Map 3 及之后) 中有极大概率爆种，接管比赛！" });
    }

    if (elimPct >= 0.75 && dthPct >= 0.70) {
      traits.push({ id: "WILD", name: "嗜血神经刀", icon: "🩸", desc: "高风险打法。状态极不稳定，要么杀穿全场，要么开局白给。" });
    }
    
    if (p.role === 'DPS' && dmgPct >= 0.85 && dthPct >= 0.80) {
      traits.push({ id: "GLASS_CANNON", name: "玻璃大炮", icon: "🗡️", desc: "走钢丝的输出机器。执行【放狗体系】时伤害毁天灭地，但打【地推】时极易暴毙。" });
    }

    if (p.role === 'SUP' && dmgPct >= 0.75 && healPct <= 0.35) {
      traits.push({ id: "MARTIAL_ARTIST", name: "武斗派", icon: "🥊", desc: "沉迷输出的辅助。执行【放狗体系】时战力大幅增强，但打【地推】时极易导致前排倒下。" });
    }

    if (p.role === 'SUP' && healPct >= 0.85 && dmgPct <= 0.20) {
      traits.push({ id: "PACIFIST", name: "医者仁心", icon: "👼", desc: "纯粹的治疗者。执行【地推阵地】时防线坚不可摧，但跟不上【放狗】的突进节奏。" });
    }

    if (dmgPct >= 0.80 && elimPct <= 0.40) {
      traits.push({ id: "SUPPRESSION", name: "火力压制", icon: "🔥", desc: "无效伤害大师。执行【长枪拉扯】消耗战时有奇效，但不适合快节奏的【放狗】。" });
    }

    if (p.role === 'TANK' && blockPct >= 0.85) {
      traits.push({ id: "WALL_OF_SIGHS", name: "叹息之墙", icon: "🛡️", desc: "绝对的保护者。完美契合【地推阵地】，能大幅提升全队的生存率。" });
    }

    if (p.role === 'TANK' && dmgPct >= 0.75 && blockPct <= 0.30) {
      traits.push({ id: "BRAWLER_TANK", name: "重装土匪", icon: "🚜", desc: "从不举盾，就是干。完全不适合打【地推】，但打【放狗】时如入无人之境。" });
    }

    if (elimPct >= 0.60 && ["Tracer", "Sombra", "Genji", "Winston", "Doomfist"].includes(mostPlayed)) {
      if (getDeterministicRandom(p.player_id + 'c9') > 0.6) {
        traits.push({ id: "C9_SYNDROME", name: "C9综合征", icon: "🙈", desc: "沉迷追人。决胜局的最后一波团战，有极小概率忘踩车直接判负！" });
      }
    }

    if (getDeterministicRandom(p.player_id + 'qm') <= 0.08 && traits.length < 3) {
      traits.push({ id: "QUESTION_MARK", name: "问号大师", icon: "❓", desc: "公屏嘲讽。赢下对局后大概率激怒对手，引发难以预料的战力波动。" });
    }

    // ==========================================
    // 🛡️ 兜底机制 (保底人设)
    // ==========================================
    if (traits.length === 0) {
      if (elimPct <= 0.35 && dmgPct <= 0.35) {
        traits.push({ id: "TEAM_SOUL", name: "精神领袖", icon: "🗣️", desc: "更衣室领袖。战力平庸，但能稳住队伍的整体发挥下限。" });
      } else if (dthPct <= 0.25) {
        traits.push({ id: "KDA_GUARD", name: "KDA保卫者", icon: "苟", desc: "永不背锅。极度惜命，绝对不会主动送头，但也无法创造任何奇迹。" });
      } else {
        traits.push({ id: "HEXAGON", name: "伪·六边形战士", icon: "🛑", desc: "各项平庸的蓝领。免疫大部分负面随机事件，极度稳定。" });
      }
    }

    // 核心规则：一个人最多携带 3 个特质，超出截断。传奇特质优先保留在前面！
    traits = traits.slice(0, 3);
    return { ...p, traits };
  });
}