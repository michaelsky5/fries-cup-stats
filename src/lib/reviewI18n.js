import { formatOwHeroName, formatOwMapMode, formatOwMapName } from './heroes.js'

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[：:]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildLookup(source) {
  const lookup = {}

  Object.entries(source).forEach(([key, value]) => {
    lookup[key] = value
    lookup[normalizeKey(key)] = value
  })

  return lookup
}

function compactRankText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[–—－~～至到]/g, '-')
}

export const HERO_CN = {
  // TANK
  'D.Va': 'D.Va',
  DVa: 'D.Va',
  DVA: 'D.Va',
  Domina: '金驭',
  Doomfist: '末日铁拳',
  Hazard: '骇灾',
  'Junker Queen': '渣客女王',
  Mauga: '毛加',
  Orisa: '奥丽莎',
  Ramattra: '拉玛刹',
  Reinhardt: '莱因哈特',
  Roadhog: '路霸',
  Sigma: '西格玛',
  Winston: '温斯顿',
  'Wrecking Ball': '破坏球',
  Zarya: '查莉娅',

  // DPS
  Anran: '安然',
  Ashe: '艾什',
  Bastion: '堡垒',
  Cassidy: '卡西迪',
  Echo: '回声',
  Emre: '埃姆雷',
  Freja: '芙蕾雅',
  Genji: '源氏',
  Hanzo: '半藏',
  Junkrat: '狂鼠',
  Mei: '美',
  Pharah: '法老之鹰',
  Reaper: '死神',
  Sierra: '西拉',
  Sojourn: '索杰恩',
  'Soldier: 76': '士兵：76',
  Soldier76: '士兵：76',
  Sombra: '黑影',
  Symmetra: '秩序之光',
  Torbjörn: '托比昂',
  Torbjorn: '托比昂',
  Tracer: '猎空',
  Vendetta: '斩仇',
  Venture: '探奇',
  Widowmaker: '黑百合',

  // SUPPORT
  Ana: '安娜',
  Baptiste: '巴蒂斯特',
  Brigitte: '布丽吉塔',
  Illari: '伊拉锐',
  'Jetpack Cat': '飞天猫',
  JetpackCat: '飞天猫',
  Juno: '朱诺',
  Kiriko: '雾子',
  Lifeweaver: '生命之梭',
  Lúcio: '卢西奥',
  Lucio: '卢西奥',
  Mercy: '天使',
  Mizuki: '瑞稀',
  Moira: '莫伊拉',
  Wuyang: '无漾',
  Zenyatta: '禅雅塔'
}

export const MAP_CN = {
  Busan: '釜山',
  BUSAN: '釜山',
  Ilios: '伊利奥斯',
  ILIOS: '伊利奥斯',
  'Lijiang Tower': '漓江塔',
  'LIJIANG TOWER': '漓江塔',
  Nepal: '尼泊尔',
  NEPAL: '尼泊尔',
  Oasis: '绿洲城',
  OASIS: '绿洲城',
  Samoa: '萨摩亚',
  SAMOA: '萨摩亚',
  'Antarctic Peninsula': '南极半岛',
  'ANTARCTIC PENINSULA': '南极半岛',

  Dorado: '多拉多',
  DORADO: '多拉多',
  Havana: '哈瓦那',
  HAVANA: '哈瓦那',
  Junkertown: '渣客镇',
  JUNKERTOWN: '渣客镇',
  Rialto: '里阿尔托',
  RIALTO: '里阿尔托',
  'Route 66': '66号公路',
  'ROUTE 66': '66号公路',
  'Watchpoint: Gibraltar': '监测站：直布罗陀',
  'WATCHPOINT: GIBRALTAR': '监测站：直布罗陀',
  'Circuit Royal': '皇家赛道',
  'CIRCUIT ROYAL': '皇家赛道',
  'Shambali Monastery': '香巴里寺院',
  'SHAMBALI MONASTERY': '香巴里寺院',

  BlizzardWorld: '暴雪世界',
  'Blizzard World': '暴雪世界',
  'BLIZZARD WORLD': '暴雪世界',
  Eichenwalde: '艾兴瓦尔德',
  EICHENWALDE: '艾兴瓦尔德',
  Hollywood: '好莱坞',
  HOLLYWOOD: '好莱坞',
  Midtown: '中城',
  MIDTOWN: '中城',
  Numbani: '努巴尼',
  NUMBANI: '努巴尼',
  Paraíso: '帕拉伊苏',
  Paraiso: '帕拉伊苏',
  PARAISO: '帕拉伊苏',
  'King’s Row': '国王大道',
  "King's Row": '国王大道',
  'KINGS ROW': '国王大道',

  Colosseo: '斗兽场',
  COLOSSEO: '斗兽场',
  Esperança: '埃斯佩兰萨',
  Esperanca: '埃斯佩兰萨',
  ESPERANCA: '埃斯佩兰萨',
  'New Queen Street': '新皇后街',
  'NEW QUEEN STREET': '新皇后街',
  Runasapi: '鲁纳萨皮',
  RUNASAPI: '鲁纳萨皮',

  Suravasa: '苏拉瓦萨',
  SURAVASA: '苏拉瓦萨',
  'New Junk City': '新渣客城',
  'NEW JUNK CITY': '新渣客城',
  Aatlis: '阿特利斯',
  Atlis: '阿特利斯',
  ATLIS: '阿特利斯',
  AATLIS: '阿特利斯',

  Hanaoka: '花冈',
  HANAOKA: '花冈',
  'Throne of Anubis': '阿努比斯王座',
  'THRONE OF ANUBIS': '阿努比斯王座'
}

export const MAP_TYPE_CN = {
  Control: '控制图',
  CONTROL: '控制图',
  Escort: '运载目标',
  ESCORT: '运载目标',
  Payload: '运载目标',
  Hybrid: '混合图',
  HYBRID: '混合图',
  Push: '机动推进',
  PUSH: '机动推进',
  Flashpoint: '闪点作战',
  FLASHPOINT: '闪点作战',
  Clash: '冲突模式',
  CLASH: '冲突模式',
  UNKNOWN: '未知模式'
}

export const STAGE_CN = {
  QUALIFIERS: '瑞士轮',
  SWISS: '瑞士轮',
  LCQ: '突围赛',
  PLAY_IN: '突围赛',
  PLAYINS: '突围赛',
  PLAYOFFS: '季后赛',
  PLAYOFF: '季后赛',
  FINAL: '决赛',
  FINALS: '决赛',
  GRAND_FINAL: '总决赛',
  GRAND_FINALS: '总决赛',
  GRAND_FINALS_LOWER: '总决赛',
  THIRD_PLACE: '季军赛'
}

const HERO_LOOKUP = buildLookup(HERO_CN)
const MAP_LOOKUP = buildLookup(MAP_CN)
const MAP_TYPE_LOOKUP = buildLookup(MAP_TYPE_CN)
const STAGE_LOOKUP = buildLookup(STAGE_CN)

export function heroCn(name) {
  const raw = String(name ?? '').trim()
  if (!raw) return '未知英雄'
  const catalogName = formatOwHeroName(raw, 'zh-CN')
  if (catalogName !== raw) return catalogName
  return HERO_LOOKUP[raw] || HERO_LOOKUP[normalizeKey(raw)] || raw
}

export function mapCn(name) {
  const raw = String(name ?? '').trim()
  if (!raw) return '未知地图'
  const catalogName = formatOwMapName(raw, 'zh-CN')
  if (catalogName !== raw) return catalogName
  return MAP_LOOKUP[raw] || MAP_LOOKUP[normalizeKey(raw)] || raw
}

export function mapTypeCn(type) {
  const raw = String(type ?? '').trim()
  if (!raw) return '未知模式'
  const catalogName = formatOwMapMode(raw, 'zh-CN')
  if (catalogName !== raw) return catalogName
  return MAP_TYPE_LOOKUP[raw] || MAP_TYPE_LOOKUP[normalizeKey(raw)] || raw
}

export function stageCn(stage) {
  const raw = String(stage ?? '').trim()
  if (!raw) return '未知阶段'
  return STAGE_LOOKUP[raw] || STAGE_LOOKUP[normalizeKey(raw)] || raw
}

export function getRankTier(rankText) {
  const raw = String(rankText ?? '')
  const text = compactRankText(raw)

  if (!text) return 'unknown'
  if (text.includes('冠军') && !text.includes('亚军')) return 'champion'
  if (text.includes('亚军')) return 'runner_up'
  if (text.includes('季军')) return 'third'
  if (text.includes('殿军') || text.includes('第4名') || text.includes('第4')) return 'fourth'
  if (/^(第)?5-8名?$/.test(text) || text.includes('5-8名') || text.includes('第5-8名')) return 'top8'
  if (/^(第)?9-16名?$/.test(text) || text.includes('9-16名') || text.includes('第9-16名')) return 'top16'

  const singleRank = text.match(/第?(\d+)名?/)
  if (singleRank) {
    const rank = Number(singleRank[1])
    if (rank === 1) return 'champion'
    if (rank === 2) return 'runner_up'
    if (rank === 3) return 'third'
    if (rank === 4) return 'fourth'
    if (rank >= 5 && rank <= 8) return 'top8'
    if (rank >= 9 && rank <= 16) return 'top16'
    return 'participant'
  }

  return 'participant'
}

export function rankNarrative(rankText) {
  const text = String(rankText ?? '')
  const tier = getRankTier(text)

  if (tier === 'champion') {
    return {
      label: '冠军',
      title: '你们把这个赛季打到了最后',
      body: '冠军不是从决赛那一天才开始的。它藏在报名、训练、等待、调整和每一场必须赢下来的比赛里。最终，薯条杯把最高的位置留给了你们。'
    }
  }

  if (tier === 'runner_up') {
    return {
      label: '亚军',
      title: '你们离最后一步只差一点',
      body: '亚军不是失败的别名。它说明你们走到了几乎所有队伍都到不了的位置，也说明这个赛季真的曾经把答案交到你们手里。'
    }
  }

  if (tier === 'third') {
    return {
      label: '季军',
      title: '你们站上了这个赛季的领奖台',
      body: '季军是一种很硬的证明。它说明你们经历过淘汰赛的压力，也在足够残酷的赛程里留下了自己的位置。'
    }
  }

  if (tier === 'fourth') {
    return {
      label: '殿军',
      title: '你们离领奖台只有一步',
      body: '第四名常常是最复杂的位置。它接近荣耀，也接近遗憾。但能走到这里，已经说明你们不是普通参与者，而是这个赛季真正的竞争者。'
    }
  }

  if (tier === 'top8') {
    return {
      label: text || '5–8名',
      title: '你们进入了淘汰赛区',
      body: '前八不是简单的排名区间。它意味着你们从主赛程里杀进了真正残酷的部分，也意味着这个赛季曾经给过你们继续向前的资格。'
    }
  }

  if (tier === 'top16') {
    return {
      label: text || '9–16名',
      title: '你们把赛季留在了主赛程里',
      body: '并不是所有队伍都会走到淘汰赛，但每一支走进主赛程的队伍，都让这个赛季变得更完整。你们的比赛，也被留在了薯条杯的档案里。'
    }
  }

  return {
    label: text || '最终归档',
    title: '你们完成了这个赛季',
    body: '不是每支队伍都会被冠军叙事记住。但薯条杯的赛季档案会记得：你们报名、出场、对阵，也把这段旅程走到了最后。'
  }
}

export function playoffNarrative(rankText) {
  const tier = getRankTier(rankText)

  if (!['champion', 'runner_up', 'third', 'fourth', 'top8'].includes(tier)) {
    return null
  }

  if (tier === 'champion') {
    return {
      title: '你们走进季后赛，然后把它赢到了最后',
      body: '从前八开始，每一场都可能让赛季结束。但你们没有停在任何一个岔路口，直到把最后一页也写成自己的名字。'
    }
  }

  if (tier === 'runner_up') {
    return {
      title: '你们走进季后赛，也走进了总决赛',
      body: '淘汰赛会把队伍推到最紧的地方。你们穿过了那段赛程，站到了最后的舞台，只是最后一步没有落在自己这边。'
    }
  }

  if (tier === 'third') {
    return {
      title: '你们在季后赛里留下了领奖台的位置',
      body: '季后赛不是简单的延续，而是重新开始的压力。你们在淘汰赛区撑住了自己的位置，也把赛季留在了前三名。'
    }
  }

  if (tier === 'fourth') {
    return {
      title: '你们把赛季打进了最后四强',
      body: '四强意味着你们已经穿过了大部分队伍无法抵达的地方。它有遗憾，也有分量；它不是终点的失败，而是竞争者的证明。'
    }
  }

  return {
    title: '你们挺进了季后赛',
    body: '从这里开始，比赛不再只是积分和排名。每一场都可能让赛季结束，每一张地图都更接近真正的淘汰。你们走进了前八，也走进了这届学院赛最紧张的部分。'
  }
}

export function roleDeepNarrative(role, profile = {}) {
  const r = String(role || '').toUpperCase()
  const {
    playerName = '你',
    topHero = '',
    mapCount = 0,
    minutes = 0,
    deathsPer10 = 0,
    mainMetricValue = 0
  } = profile

  if (Number(mapCount) <= 1 || Number(minutes) < 12) {
    return {
      title: '你的赛季不长，但不是空白',
      body: `${playerName} 的记录也许没有铺满整个赛季，但它仍然被留下了。社区赛事里，有些名字不是靠篇幅被记住，而是靠“曾经站上过这里”被保存。`
    }
  }

  if (Number(mapCount) <= 3 || Number(minutes) < 25) {
    return {
      title: '你的赛季，是一段短而明确的出场',
      body: `${playerName} 的数据样本并不算长，所以它不适合被过度解读。但这些地图说明了一件事：你不是旁观者，你确实进入过这届学院赛的现场。`
    }
  }

  if (r === 'TANK') {
    if (Number(deathsPer10) > 0 && Number(deathsPer10) <= 4.5 && Number(minutes) >= 30) {
      return {
        title: '你不是只是在前排，而是在替队伍争取空间',
        body: `${playerName} 的赛季里，最值得注意的不是单一击杀，而是稳定。作为坦克，少死并不意味着保守，它往往意味着你知道什么时候该承压，什么时候该退，什么时候该重新开团。`
      }
    }

    if (Number(mainMetricValue) >= 10000) {
      return {
        title: '你的赛季，是用承压写出来的',
        body: `很多压力不会变成击杀播报，但它会变成队友能输出、能治疗、能活下来的空间。${topHero ? `当你使用${topHero}时，` : ''}这些看不见的工作都被数据留下了痕迹。`
      }
    }

    return {
      title: '你站在队伍最先被看见的位置',
      body: '坦克的赛季往往并不轻松。你承担开团、站位和失误成本，也承担队伍最直接的压力。这些东西不一定耀眼，但足够真实。'
    }
  }

  if (r === 'SUP' || r === 'SUPPORT') {
    if (Number(deathsPer10) > 0 && Number(deathsPer10) <= 4.5 && Number(minutes) >= 30) {
      return {
        title: '你活下来的时间，也是在替队伍争取机会',
        body: `${playerName} 的数据里，最有价值的不只是治疗量。辅助活着，队伍就还有下一轮资源；辅助倒下，团战往往就开始倾斜。你的稳定本身，就是队伍的一部分安全感。`
      }
    }

    if (Number(mainMetricValue) >= 9000) {
      return {
        title: '你把很多濒临结束的团战拉了回来',
        body: `治疗数字不是冷冰冰的堆叠。它背后是队友残血时的续命、残局里的拖延、以及一次次让团战还有下文的支撑。${topHero ? `${topHero}只是名字，真正被记录的是你在队伍身后的存在。` : ''}`
      }
    }

    return {
      title: '你的赛季不总是在镜头中央',
      body: '辅助常常不是最先被看见的人，但很多比赛都在他们的技能、站位和生存里被悄悄改变。数据记录的是治疗，比赛记住的是支撑。'
    }
  }

  if (Number(mainMetricValue) >= 9500) {
    return {
      title: '你的赛季里，有很多向前打开局面的瞬间',
      body: `${playerName} 的输出数据说明，你不只是参与团战，而是在很多时候主动推动团战。${topHero ? `${topHero}像是这个赛季最常替你出现在镜头里的名字。` : ''}`
    }
  }

  if (Number(deathsPer10) > 0 && Number(deathsPer10) <= 5 && Number(minutes) >= 30) {
    return {
      title: '你不是只追求爆发，也在尽量把自己留在场上',
      body: '输出位最容易被击杀和伤害定义，但稳定生存同样重要。活着意味着持续施压，意味着下一次技能循环，也意味着队伍仍然有打开局面的可能。'
    }
  }

  return {
    title: '你的赛季，是一次次主动寻找突破口',
    body: '输出位的价值并不只在最终数据上。很多时候，先动手、先压低血线、先逼出资源，本身就已经改变了团战的方向。'
  }
}
