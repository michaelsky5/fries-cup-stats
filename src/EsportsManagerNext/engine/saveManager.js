export const NEXT_SAVE_STORAGE_KEY = 'friesCup_managerNext_save_v1'
export const NEXT_SAVE_BACKUP_KEY = 'friesCup_managerNext_import_backup_v1'
export const NEXT_SAVE_VERSION = 1

const RUN_TARGET_STAGE = 8
const ROUTE_TEMPLATE = ['sponsor', 'match', 'relic', 'match', 'tactic', 'event', 'match', 'boss']
export const INITIAL_RUN_FUNDS = 2000
export const MARKET_REFRESH_COST = 40
export const RUN_ROSTER_REQUIREMENTS = {
  TANK: 1,
  DPS: 2,
  SUP: 2
}
const OPENING_MARKET_SIZE = 8
const STYLE_LABELS = {
  DIVE: '放狗冲锋',
  POKE: '长枪控图',
  BRAWL: '抱团地推',
  POCKET: '资源核心',
  CHAOS: '奇招乱战',
  BALANCED: '均衡默认'
}

const STYLE_HINTS = {
  DIVE: '更吃爆发和收割，适合高上限选手。',
  POKE: '更吃消耗和控图，适合稳定火力。',
  BRAWL: '更吃正面抗压，适合低失误阵容。',
  POCKET: '更吃明星核心，适合围绕大哥建队。',
  CHAOS: '更吃奇招和波动，适合赌上限。'
}

const TRAIT_STYLE_MAP = {
  明星核心: 'POCKET',
  小样本怪物: 'CHAOS',
  高风险收割: 'DIVE',
  稳定机器: 'BRAWL',
  防线支柱: 'BRAWL',
  火力压制: 'POKE',
  续航核心: 'POCKET',
  体系拼图: 'BALANCED'
}

const DEFAULT_TACTIC = {
  id: 'balanced',
  name: '稳健默认',
  style: 'BALANCED',
  desc: '没有明显短板，也不会打出特别离谱的上限。',
  power: 0,
  morale: 0,
  intel: 0
}

export const TACTIC_POOL = [
  {
    id: 'dive-rush',
    name: '高速放狗',
    style: 'DIVE',
    desc: '提升高风险收割与明星核心的上限，克制长枪消耗。',
    power: 2,
    morale: 3,
    intel: 0
  },
  {
    id: 'poke-control',
    name: '长枪控图',
    style: 'POKE',
    desc: '依赖火力压制和情报优势，克制地推抱团。',
    power: 1,
    morale: 0,
    intel: 1
  },
  {
    id: 'brawl-core',
    name: '抱团地推',
    style: 'BRAWL',
    desc: '稳定、抗压，适合士气不足时兜底，克制高速放狗。',
    power: 1,
    morale: 5,
    intel: 0
  },
  {
    id: 'protect-carry',
    name: '四保一核心',
    style: 'POCKET',
    desc: '把资源压给最强明星，明星越强收益越高，但容易被针对。',
    power: 3,
    morale: -2,
    intel: 0
  },
  {
    id: 'chaos-meta',
    name: '版本奇招',
    style: 'CHAOS',
    desc: '上限很高，方差也很大，适合想赌一把的经理。',
    power: 2,
    morale: 0,
    intel: -1
  }
]

const SPONSOR_POOL = [
  {
    id: 'whiteboard-lab',
    name: '战术白板实验室',
    rarity: '核心',
    desc: '战术克制收益提高，情报也会更值钱。',
    effects: { intel: 1, counterPower: 3 }
  },
  {
    id: 'academy-grant',
    name: '青训扶持基金',
    rarity: '成长',
    desc: '立即获得资金，低 OVR 选手训练收益更高。',
    effects: { funds: 260, trainingPower: 1 }
  },
  {
    id: 'streaming-contract',
    name: '全队直播合同',
    rarity: '经济',
    desc: '胜利奖金提高，但失利时士气掉得更多。',
    effects: { winFunds: 80, lossMorale: -4 }
  },
  {
    id: 'sports-psych',
    name: '运动心理团队',
    rarity: '稳定',
    desc: '士气上限更容易维持，连败不至于直接崩盘。',
    effects: { morale: 12, lossShield: 4 }
  },
  {
    id: 'superstar-campaign',
    name: '造星计划',
    rarity: '爆发',
    desc: '明星核心越多，阵容战力越高。',
    effects: { starPower: 2 }
  },
  {
    id: 'analyst-room',
    name: '数据分析室',
    rarity: '情报',
    desc: '每场赛前获得额外情报，稳定提升比赛分。',
    effects: { intel: 2, matchPower: 1 }
  }
]

const RELIC_POOL = [
  {
    id: 'clutch-whiteboard',
    name: '绝境白板',
    rarity: '遗物',
    desc: '生命值越紧张，教练组越能榨出东西。HP 低于 2 时阵容战力 +5。',
    effects: { lowHpPower: 5 }
  },
  {
    id: 'fast-comp-script',
    name: '快攻脚本',
    rarity: '遗物',
    desc: '放狗冲锋体系战力 +4，胜利额外获得士气。',
    effects: { divePower: 4, winMorale: 3 }
  },
  {
    id: 'long-range-map',
    name: '长枪地图包',
    rarity: '遗物',
    desc: '长枪控图体系战力 +4，赛前情报收益更高。',
    effects: { pokePower: 4, matchPower: 1 }
  },
  {
    id: 'frontline-rhythm',
    name: '前排节拍器',
    rarity: '遗物',
    desc: '抱团地推体系战力 +4，失利时少掉士气。',
    effects: { brawlPower: 4, lossShield: 4 }
  },
  {
    id: 'star-contract',
    name: '造星短片',
    rarity: '遗物',
    desc: '每名明星核心额外提供战力，比赛胜利奖金提高。',
    effects: { starPower: 2, winFunds: 70 }
  },
  {
    id: 'analyst-headset',
    name: '分析师耳机',
    rarity: '遗物',
    desc: '每场比赛获得额外赛前修正，战术克制收益提高。',
    effects: { matchPower: 2, counterPower: 2 }
  },
  {
    id: 'academy-voucher',
    name: '青训加速券',
    rarity: '遗物',
    desc: '事件和训练对低价选手更友好，体系拼图阵容更容易成型。',
    effects: { trainingPower: 2, power: 1 }
  }
]

const CURSE_POOL = [
  {
    id: 'black-traffic-contract',
    name: '黑红流量合同',
    rarity: '诅咒',
    desc: '立刻获得 420K。胜利奖金 +120K，但失利时士气额外 -8。',
    instant: { funds: 420 },
    effects: { winFunds: 120, lossMorale: -8 }
  },
  {
    id: 'back-against-wall',
    name: '背水赛程',
    rarity: '诅咒',
    desc: '立刻失去 1 点生命，但全局战力 +6。',
    instant: { hp: -1, morale: 6 },
    effects: { power: 6 }
  },
  {
    id: 'volatile-meta',
    name: '混乱版本赌约',
    rarity: '诅咒',
    desc: '奇招乱战体系战力 +7，但每场比赛方差变大。',
    effects: { chaosPower: 7, curseVariance: 6 }
  },
  {
    id: 'superstar-pressure',
    name: '巨星曝光条款',
    rarity: '诅咒',
    desc: '明星核心收益大幅提高，但每次失利会造成更重的舆论压力。',
    effects: { starPower: 4, lossMorale: -6 }
  }
]

const EVENT_POOL = [
  {
    id: 'bootcamp',
    name: '封闭集训',
    desc: '把一周时间全压在训练室里。',
    choices: [
      { id: 'hard-train', name: '高强度训练', desc: '全队 OVR +1，获得 1 场爆种训练，士气 -6。', effects: { trainAll: 1, morale: -6, temporaryBuff: { id: 'hard-train-burst', name: '爆种训练', duration: 1, effects: { power: 3 } } } },
      { id: 'light-review', name: '轻量复盘', desc: '情报 +2，士气 +2。', effects: { intel: 2, morale: 2 } },
      { id: 'cancel-bootcamp', name: '提前放假', desc: '士气 +8。', effects: { morale: 8 } }
    ]
  },
  {
    id: 'media-day',
    name: '媒体日',
    desc: '赞助方希望你们多营业一点。',
    choices: [
      { id: 'full-stream', name: '全员营业', desc: '资金 +220K，士气 -5。', effects: { funds: 220, morale: -5 } },
      { id: 'captain-only', name: '队长采访', desc: '资金 +90K，情报 +1。', effects: { funds: 90, intel: 1 } },
      { id: 'decline-media', name: '拒绝营业', desc: '士气 +5。', effects: { morale: 5 } }
    ]
  },
  {
    id: 'patch-day',
    name: '版本更新',
    desc: '比赛服突然更新，所有队都在重新找答案。',
    choices: [
      { id: 'study-patch', name: '连夜读版本', desc: '情报 +3，士气 -4。', effects: { intel: 3, morale: -4 } },
      { id: 'trust-comfort', name: '相信绝活', desc: '拥有体系拼图的选手 OVR +2。', effects: { traitTrain: '体系拼图', amount: 2 } },
      { id: 'copy-meta', name: '抄强队作业', desc: '获得 1 个永久战术点，并获得 2 场版本答案。', effects: { tacticPower: 1, temporaryBuff: { id: 'copied-meta', name: '版本答案', duration: 2, effects: { matchPower: 2 } } } }
    ]
  }
]

export const PERK_TREE = [
  {
    id: 'scout-network',
    level: 2,
    name: '球探网络',
    desc: '新 Run 的初始候选池会更稳定，方便围绕核心选手构筑。'
  },
  {
    id: 'tactic-library',
    level: 3,
    name: '战术图书馆',
    desc: '解锁更多战术变体，为之后的赛前博弈预留空间。'
  },
  {
    id: 'sponsor-board',
    level: 4,
    name: '赞助谈判',
    desc: '高风险赞助更容易出现，适合做爆发型肉鸽路线。'
  },
  {
    id: 'academy-system',
    level: 5,
    name: '青训体系',
    desc: '低 OVR 选手可以成为长期构筑核心，而不是纯过渡牌。'
  }
]

export function createDefaultSave() {
  const now = new Date().toISOString()

  return {
    schema: 'friesCupManagerNextSave',
    version: NEXT_SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      managerName: '薯条经理',
      xp: 0,
      totalRuns: 0,
      completedRuns: 0,
      championships: 0,
      bestStage: 0,
      bestPower: 0,
      lifetimeMatches: 0,
      lifetimeWins: 0,
      collection: {
        sponsors: [],
        relics: [],
        curses: [],
        traits: [],
        titles: ['新人经理']
      }
    },
    activeRun: null,
    hallOfFame: [],
    settings: {
      exportFormat: 'json'
    }
  }
}

export function getManagerLevel(profile = {}) {
  const xp = Math.max(0, Number(profile.xp) || 0)
  return Math.max(1, Math.floor(Math.sqrt(xp / 90)) + 1)
}

export function getLevelProgress(profile = {}) {
  const level = getManagerLevel(profile)
  const xp = Math.max(0, Number(profile.xp) || 0)
  const currentFloor = Math.pow(level - 1, 2) * 90
  const nextFloor = Math.pow(level, 2) * 90
  const progress = nextFloor > currentFloor ? (xp - currentFloor) / (nextFloor - currentFloor) : 1

  return {
    level,
    xp,
    currentFloor,
    nextFloor,
    progress: Math.max(0, Math.min(1, progress))
  }
}

export function getManagerTitle(profile = {}) {
  const level = getManagerLevel(profile)
  if (level >= 8) return '冠军建筑师'
  if (level >= 6) return '体系大师'
  if (level >= 4) return '季后赛教练'
  if (level >= 2) return '战术新人'
  return '新人经理'
}

export function getUnlockedPerks(profile = {}) {
  const level = getManagerLevel(profile)
  return PERK_TREE.map(perk => ({
    ...perk,
    unlocked: level >= perk.level
  }))
}

export function normalizeSave(rawSave) {
  const fallback = createDefaultSave()
  if (!rawSave || typeof rawSave !== 'object') return fallback

  const profile = {
    ...fallback.profile,
    ...(rawSave.profile || {}),
    collection: {
      ...fallback.profile.collection,
      ...(rawSave.profile?.collection || {})
    }
  }

  return {
    ...fallback,
    ...rawSave,
    schema: 'friesCupManagerNextSave',
    version: NEXT_SAVE_VERSION,
    profile,
    hallOfFame: Array.isArray(rawSave.hallOfFame) ? rawSave.hallOfFame.slice(0, 12) : [],
    activeRun: rawSave.activeRun && typeof rawSave.activeRun === 'object' ? normalizeRun(rawSave.activeRun) : null,
    settings: {
      ...fallback.settings,
      ...(rawSave.settings || {})
    }
  }
}

export function loadManagerSave() {
  if (typeof window === 'undefined') return createDefaultSave()

  const saved = window.localStorage.getItem(NEXT_SAVE_STORAGE_KEY)
  if (!saved) return createDefaultSave()

  try {
    return normalizeSave(JSON.parse(saved))
  } catch {
    return createDefaultSave()
  }
}

export function saveManagerState(save) {
  const normalized = normalizeSave({
    ...save,
    updatedAt: new Date().toISOString()
  })

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NEXT_SAVE_STORAGE_KEY, JSON.stringify(normalized))
  }

  return normalized
}

export function serializeManagerSave(save) {
  return JSON.stringify(normalizeSave(save), null, 2)
}

export function parseImportedSave(text) {
  if (!text || !String(text).trim()) {
    return { ok: false, error: '导入内容为空。' }
  }

  try {
    const parsed = JSON.parse(text)
    if (parsed.schema && parsed.schema !== 'friesCupManagerNextSave') {
      return { ok: false, error: '这不是电竞经理新版存档。' }
    }

    return { ok: true, save: normalizeSave(parsed) }
  } catch {
    return { ok: false, error: '存档 JSON 解析失败，请确认文件或文本完整。' }
  }
}

export function importManagerSave(text, mode = 'replace') {
  const parsed = parseImportedSave(text)
  if (!parsed.ok) return parsed

  const current = loadManagerSave()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NEXT_SAVE_BACKUP_KEY, serializeManagerSave(current))
  }

  const imported = parsed.save
  if (mode === 'merge') {
    const merged = normalizeSave({
      ...current,
      profile: {
        ...current.profile,
        collection: {
          sponsors: mergeUnique(current.profile.collection?.sponsors, imported.profile.collection?.sponsors),
          relics: mergeUnique(current.profile.collection?.relics, imported.profile.collection?.relics),
          curses: mergeUnique(current.profile.collection?.curses, imported.profile.collection?.curses),
          traits: mergeUnique(current.profile.collection?.traits, imported.profile.collection?.traits),
          titles: mergeUnique(current.profile.collection?.titles, imported.profile.collection?.titles)
        }
      },
      hallOfFame: [...(imported.hallOfFame || []), ...(current.hallOfFame || [])].slice(0, 12)
    })

    return { ok: true, save: saveManagerState(merged), backup: current }
  }

  return { ok: true, save: saveManagerState(imported), backup: current }
}

export function buildExportFileName(save) {
  const date = new Date().toISOString().slice(0, 10)
  const level = getManagerLevel(save?.profile)
  return `fries-cup-manager-next-lv${level}-${date}.json`
}

export function buildNextPlayerPool(db) {
  const rawPlayers = Array.isArray(db?.player_totals) ? db.player_totals : []
  const activePlayers = rawPlayers
    .filter(player => Number(player.raw_time_mins || 0) >= 10)
    .map(player => makeNextPlayerCard(player))
    .filter(Boolean)

  return activePlayers.sort((a, b) => b.ovr - a.ovr)
}

export function createStarterRun(save, playerPool) {
  const pool = Array.isArray(playerPool) ? playerPool : []
  const now = new Date().toISOString()
  const profile = save?.profile || {}
  const level = getManagerLevel(profile)
  const baseRun = {
    id: `run-${Date.now()}`,
    mode: 'node-alpha',
    status: 'building',
    startedAt: now,
    stage: 1,
    targetStage: RUN_TARGET_STAGE,
    route: [...ROUTE_TEMPLATE],
    hp: 3,
    funds: INITIAL_RUN_FUNDS,
    morale: 72,
    intel: Math.min(3, Math.floor(level / 2)),
    tactic: DEFAULT_TACTIC,
    tacticPower: 0,
    roster: [],
    market: [],
    marketRefreshes: 0,
    freeRefreshes: level >= 2 ? 1 : 0,
    relics: [],
    curses: [],
    temporaryBuffs: [],
    sponsors: [
      {
        id: 'grassroot-backing',
        name: '社区后援',
        rarity: '基础',
        desc: '每次胜利额外获得少量资金。',
        effects: { winFunds: 35 }
      }
    ],
    encounter: null,
    lastReview: null,
    history: [
      {
        type: 'start',
        text: `新赛季报名，启动预算 ${INITIAL_RUN_FUNDS}K。先签满 1T / 2D / 2S，再进入肉鸽路线。`
      }
    ]
  }

  return {
    ...baseRun,
    market: createRunMarket(pool, baseRun, profile)
  }
}

function createLegacyStarterRun(save, playerPool) {
  const pool = Array.isArray(playerPool) ? playerPool : []
  const starterRoster = pickStarterRoster(pool)
  const now = new Date().toISOString()
  const profile = save?.profile || {}
  const level = getManagerLevel(profile)
  const baseRun = {
    id: `run-${Date.now()}`,
    mode: 'node-alpha',
    startedAt: now,
    stage: 1,
    targetStage: RUN_TARGET_STAGE,
    route: [...ROUTE_TEMPLATE],
    hp: 3,
    funds: 1200 + Math.min(400, (level - 1) * 40),
    morale: 72,
    intel: Math.min(3, Math.floor(level / 2)),
    tactic: DEFAULT_TACTIC,
    tacticPower: 0,
    roster: starterRoster,
    relics: [],
    curses: [],
    temporaryBuffs: [],
    sponsors: [
      {
        id: 'grassroot-backing',
        name: '社区后援',
        rarity: '基础',
        desc: '每次胜利额外获得少量资金。',
        effects: { winFunds: 35 }
      }
    ],
    encounter: null,
    lastReview: null,
    history: [
      {
        type: 'start',
        text: `新赛季启动，初始阵容战力 ${calculateRunPower(starterRoster)}。`
      }
    ]
  }

  return withFreshEncounter(baseRun, pool)
}

export function startNewRun(save, playerPool) {
  const normalized = normalizeSave(save)
  const nextSave = {
    ...normalized,
    profile: {
      ...normalized.profile,
      totalRuns: Number(normalized.profile.totalRuns || 0) + 1
    },
    activeRun: createStarterRun(normalized, playerPool)
  }

  return saveManagerState(nextSave)
}

export function getRoleCounts(roster = []) {
  return (Array.isArray(roster) ? roster : []).reduce((acc, player) => {
    if (RUN_ROSTER_REQUIREMENTS[player.role]) acc[player.role] += 1
    return acc
  }, { TANK: 0, DPS: 0, SUP: 0 })
}

export function isRunRosterComplete(run) {
  const counts = getRoleCounts(run?.roster)
  return Object.entries(RUN_ROSTER_REQUIREMENTS).every(([role, required]) => counts[role] === required)
}

export function hireRunPlayer(save, playerId, playerPool = []) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (!run) return { ok: false, save: normalized, message: '当前没有进行中的 Run。' }
  if (run.status !== 'building') return { ok: false, save: normalized, message: '出征后不能在开局市场继续签人。' }

  const market = Array.isArray(run.market) && run.market.length
    ? run.market
    : createRunMarket(playerPool, run, normalized.profile)
  const player = market.find(item => item.id === playerId)
  if (!player) return { ok: false, save: normalized, message: '这个候选人已经不在当前市场里。' }

  const roleCap = RUN_ROSTER_REQUIREMENTS[player.role] || 0
  const counts = getRoleCounts(run.roster)
  if (!roleCap) return { ok: false, save: normalized, message: '暂时不支持这个位置。' }
  if (counts[player.role] >= roleCap) return { ok: false, save: normalized, message: `${player.role} 位置已经满员。` }

  const price = Math.max(0, Number(player.price || 0))
  if (Number(run.funds || 0) < price) {
    return { ok: false, save: normalized, message: `资金不足，签下 ${player.name} 需要 ${price}K。` }
  }

  const signedPlayer = {
    ...normalizeMarketPlayer(player),
    actualPaidPrice: price,
    acquiredAt: 'opening-market'
  }
  const text = `签下 ${signedPlayer.role} ${signedPlayer.name}，花费 ${price}K。`
  const nextRun = {
    ...run,
    funds: Number(run.funds || 0) - price,
    roster: [...(run.roster || []), signedPlayer],
    market: market.filter(item => item.id !== playerId),
    history: [{ type: 'sign', text }, ...(run.history || [])].slice(0, 10)
  }

  const nextSave = saveManagerState({
    ...normalized,
    activeRun: nextRun
  })

  return { ok: true, save: nextSave, message: isRunRosterComplete(nextRun) ? `${text} 首发五人已满，可以确认出征。` : text }
}

export function sellRunPlayer(save, playerId, playerPool = []) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (!run) return { ok: false, save: normalized, message: '当前没有进行中的 Run。' }
  if (run.status !== 'building') return { ok: false, save: normalized, message: '出征后暂时不能解约首发。' }

  const player = (run.roster || []).find(item => item.id === playerId)
  if (!player) return { ok: false, save: normalized, message: '没有找到这名选手。' }

  const refund = Math.max(0, Math.round(Number(player.actualPaidPrice ?? player.price ?? 0)))
  const marketBase = Array.isArray(run.market) && run.market.length
    ? run.market
    : createRunMarket(playerPool, run, normalized.profile)
  const returned = normalizeMarketPlayer(player)
  const text = `解约 ${player.name}，返还 ${refund}K。`
  const nextRun = {
    ...run,
    funds: Number(run.funds || 0) + refund,
    roster: (run.roster || []).filter(item => item.id !== playerId),
    market: [returned, ...marketBase.filter(item => item.id !== playerId)].slice(0, OPENING_MARKET_SIZE),
    history: [{ type: 'sell', text }, ...(run.history || [])].slice(0, 10)
  }

  return {
    ok: true,
    save: saveManagerState({
      ...normalized,
      activeRun: nextRun
    }),
    message: text
  }
}

export function refreshRunMarket(save, playerPool = []) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (!run) return { ok: false, save: normalized, message: '当前没有进行中的 Run。' }
  if (run.status !== 'building') return { ok: false, save: normalized, message: '出征后不能刷新开局市场。' }

  const freeRefreshes = Math.max(0, Number(run.freeRefreshes || 0))
  const cost = freeRefreshes > 0 ? 0 : MARKET_REFRESH_COST
  if (Number(run.funds || 0) < cost) {
    return { ok: false, save: normalized, message: `资金不足，刷新市场需要 ${cost}K。` }
  }

  const refreshedRun = {
    ...run,
    funds: Number(run.funds || 0) - cost,
    freeRefreshes: Math.max(0, freeRefreshes - 1),
    marketRefreshes: Number(run.marketRefreshes || 0) + 1
  }
  const text = cost > 0 ? `刷新市场，花费 ${cost}K。` : '使用球探网络免费刷新市场。'
  const nextRun = {
    ...refreshedRun,
    market: createRunMarket(playerPool, refreshedRun, normalized.profile),
    history: [{ type: 'market', text }, ...(run.history || [])].slice(0, 10)
  }

  return {
    ok: true,
    save: saveManagerState({
      ...normalized,
      activeRun: nextRun
    }),
    message: text
  }
}

export function deployRunRoster(save, playerPool = []) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (!run) return { ok: false, save: normalized, message: '当前没有进行中的 Run。' }
  if (run.status !== 'building') return { ok: false, save: normalized, message: '这支队伍已经出征了。' }
  if (!isRunRosterComplete(run)) {
    const counts = getRoleCounts(run.roster)
    return {
      ok: false,
      save: normalized,
      message: `首发还没满：TANK ${counts.TANK}/1，DPS ${counts.DPS}/2，SUP ${counts.SUP}/2。`
    }
  }

  const power = calculateActiveRunPower(run)
  const text = `首发五人确认出征，当前阵容战力 ${power}。`
  const launchedRun = withFreshEncounter({
    ...run,
    status: 'running',
    market: [],
    lastReview: null,
    history: [{ type: 'deploy', text }, ...(run.history || [])].slice(0, 10)
  }, playerPool)

  return {
    ok: true,
    save: saveManagerState({
      ...normalized,
      activeRun: launchedRun
    }),
    message: text
  }
}

export function resolveRunChoice(save, choiceId, playerPool) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (run?.status === 'building') return { ok: false, save: normalized, message: '先完成开局组队并确认出征。' }
  if (!run?.encounter) return { ok: false, save: normalized, message: '当前没有可处理的节点。' }

  const encounter = run.encounter
  if (encounter.type === 'match' || encounter.type === 'boss') {
    return { ok: false, save: normalized, message: '比赛节点需要点击“执行当前比赛”。' }
  }

  const choice = (encounter.choices || []).find(item => item.id === choiceId)
  if (!choice) return { ok: false, save: normalized, message: '没有找到这个选择。' }

  let nextRun = run
  let message = ''

  if (encounter.type === 'draft') {
    const result = applyDraftChoice(run, choice.player)
    nextRun = result.run
    message = result.message
  } else if (encounter.type === 'sponsor') {
    const result = applySponsorChoice(run, choice)
    nextRun = result.run
    message = result.message
  } else if (encounter.type === 'tactic') {
    const result = applyTacticChoice(run, choice)
    nextRun = result.run
    message = result.message
  } else if (encounter.type === 'relic') {
    const result = applyRelicChoice(run, choice)
    nextRun = result.run
    message = result.message
  } else if (encounter.type === 'event') {
    const result = applyEventChoice(run, choice)
    nextRun = result.run
    message = result.message
  }

  const advancedRun = advanceRunNode(nextRun, playerPool)
  const nextSave = saveManagerState({
    ...normalized,
    activeRun: advancedRun
  })

  return { ok: true, save: nextSave, message }
}

export function simulateRunMatch(save, playerPool = []) {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (run?.status === 'building') return normalized
  if (!run?.encounter) return normalized

  const encounter = run.encounter
  if (encounter.type !== 'match' && encounter.type !== 'boss') return normalized

  const tactic = getEffectiveTactic(run)
  const sponsorEffects = getRunEffects(run)
  const rosterPower = calculateActiveRunPower(run)
  const opponent = encounter.opponent || createOpponent(run.stage, encounter.type === 'boss')
  const counterEdge = getTacticEdge(tactic.style, opponent.tacticStyle) + (sponsorEffects.counterPower || 0)
  const moraleEdge = Math.floor((Number(run.morale) || 0) / 18)
  const intelEdge = (Number(run.intel) || 0) + (sponsorEffects.matchPower || 0)
  const varianceWidth = (encounter.type === 'boss' ? 19 : 17) + Math.max(0, Number(sponsorEffects.curseVariance || 0))
  const varianceFloor = 7 + Math.floor(Math.max(0, Number(sponsorEffects.curseVariance || 0)) / 2)
  const variance = Math.floor(Math.random() * varianceWidth) - varianceFloor
  const finalScore = rosterPower + counterEdge + moraleEdge + intelEdge + variance
  const isWin = finalScore >= opponent.power
  const winFunds = (encounter.reward?.funds || 140) + (sponsorEffects.winFunds || 0)
  const lossFunds = 70 + run.stage * 10
  const fundsDelta = isWin ? winFunds : lossFunds
  const moraleDelta = isWin
    ? 6 + Number(sponsorEffects.winMorale || 0)
    : -12 + Number(sponsorEffects.lossShield || 0) + Number(sponsorEffects.lossMorale || 0)
  const nextHp = isWin ? run.hp : run.hp - 1
  const review = buildMatchReview({
    run,
    encounter,
    opponent,
    tactic,
    rosterPower,
    counterEdge,
    finalScore,
    isWin,
    fundsDelta
  })

  const nextRun = {
    ...run,
    hp: nextHp,
    funds: run.funds + fundsDelta,
    morale: clamp((Number(run.morale) || 0) + moraleDelta, 0, 100),
    intel: Math.max(0, (Number(run.intel) || 0) + (isWin ? 0 : 1)),
    temporaryBuffs: tickTemporaryBuffs(run.temporaryBuffs),
    lastReview: review,
    history: [
      {
        type: isWin ? 'win' : 'loss',
        text: review.summary
      },
      ...(run.history || [])
    ].slice(0, 10)
  }

  const profile = {
    ...normalized.profile,
    bestStage: Math.max(Number(normalized.profile.bestStage || 0), Math.min(nextRun.stage, nextRun.targetStage)),
    bestPower: Math.max(Number(normalized.profile.bestPower || 0), rosterPower),
    lifetimeMatches: Number(normalized.profile.lifetimeMatches || 0) + 1,
    lifetimeWins: Number(normalized.profile.lifetimeWins || 0) + (isWin ? 1 : 0)
  }

  const baseSave = {
    ...normalized,
    profile,
    activeRun: nextRun
  }

  if (nextHp <= 0) return finishActiveRun(baseSave, 'eliminated')
  if (encounter.type === 'boss' && isWin) return finishActiveRun(baseSave, 'champion')

  const advancedRun = isWin || encounter.type === 'match'
    ? advanceRunNode(nextRun, playerPool)
    : withFreshEncounter(nextRun, playerPool)

  return saveManagerState({
    ...baseSave,
    activeRun: advancedRun
  })
}

export function finishActiveRun(save, reason = 'retired') {
  const normalized = normalizeSave(save)
  const run = normalized.activeRun
  if (!run) return normalized
  if (run.status === 'building') {
    return saveManagerState({
      ...normalized,
      activeRun: null
    })
  }

  const power = calculateActiveRunPower(run)
  const isChampion = reason === 'champion'
  const winCount = (run.history || []).filter(item => item.type === 'win').length
  const xpEarned = Math.max(40, run.stage * 35 + winCount * 22 + (isChampion ? 190 : 0))
  const resultLabel = isChampion ? '冠军' : reason === 'eliminated' ? '出局' : '主动结算'
  const recordStage = Math.min(run.stage, run.targetStage)
  const hallRecord = {
    id: `record-${Date.now()}`,
    result: resultLabel,
    finishedAt: new Date().toISOString(),
    stage: recordStage,
    power,
    roster: run.roster,
    sponsors: run.sponsors || [],
    relics: run.relics || [],
    curses: run.curses || [],
    tactic: run.tactic || DEFAULT_TACTIC,
    lastReview: run.lastReview || null,
    xpEarned
  }

  const nextProfile = {
    ...normalized.profile,
    xp: Number(normalized.profile.xp || 0) + xpEarned,
    completedRuns: Number(normalized.profile.completedRuns || 0) + 1,
    championships: Number(normalized.profile.championships || 0) + (isChampion ? 1 : 0),
    bestStage: Math.max(Number(normalized.profile.bestStage || 0), recordStage),
    bestPower: Math.max(Number(normalized.profile.bestPower || 0), power),
    collection: {
      ...normalized.profile.collection,
      sponsors: mergeUnique(normalized.profile.collection?.sponsors, (run.sponsors || []).map(item => item.name)),
      relics: mergeUnique(normalized.profile.collection?.relics, (run.relics || []).map(item => item.name)),
      curses: mergeUnique(normalized.profile.collection?.curses, (run.curses || []).map(item => item.name)),
      traits: mergeUnique(normalized.profile.collection?.traits, run.roster.flatMap(player => player.traits || [])),
      titles: mergeUnique(normalized.profile.collection?.titles, [getManagerTitle({ ...normalized.profile, xp: Number(normalized.profile.xp || 0) + xpEarned })])
    }
  }

  return saveManagerState({
    ...normalized,
    profile: nextProfile,
    activeRun: null,
    hallOfFame: [hallRecord, ...(normalized.hallOfFame || [])].slice(0, 12)
  })
}

export function calculateRunPower(roster = [], sponsors = [], tactic = DEFAULT_TACTIC) {
  return getRosterBuildReport(roster, sponsors, tactic).power
}

export function calculateActiveRunPower(run) {
  if (!run) return 0
  return calculateRunPower(run.roster, getRunEffectSources(run), getEffectiveTactic(run))
}

export function getRosterBuildReport(roster = [], sponsors = [], tactic = DEFAULT_TACTIC) {
  if (!Array.isArray(roster) || roster.length === 0) {
    return {
      power: 0,
      base: 0,
      traitBonus: 0,
      synergy: 0,
      tacticPower: 0,
      sponsorPower: 0,
      roleCounts: getRoleCounts([]),
      missingRoles: Object.entries(RUN_ROSTER_REQUIREMENTS).map(([role, required]) => ({ role, missing: required })),
      dominantStyle: null,
      bonuses: [],
      warnings: ['还没有首发选手。'],
      summary: '先签下 1T / 2D / 2S，阵容方向才会开始成型。'
    }
  }

  const sponsorEffects = getSponsorEffects(sponsors)
  const base = roster.reduce((sum, player) => sum + (Number(player.ovr) || 0), 0) / roster.length
  const traitBonus = roster.reduce((sum, player) => sum + Math.min(2, player.traits?.length || 0), 0)
  const starCount = roster.filter(player => (Number(player.ovr) || 0) >= 88 || player.traits?.includes('明星核心')).length
  const roleCounts = getRoleCounts(roster)
  const missingRoles = Object.entries(RUN_ROSTER_REQUIREMENTS)
    .map(([role, required]) => ({ role, missing: Math.max(0, required - (roleCounts[role] || 0)) }))
    .filter(item => item.missing > 0)
  const teamCounts = countBy(roster.filter(player => player.team && player.team !== 'FA'), player => player.team)
  const styleCounts = countBy(roster, player => normalizePlaystyle(player.playstyle || inferPlaystyleFromTraits(player.traits, player.role)))
  const traitCounts = countTraits(roster)
  const bonuses = []

  Object.entries(teamCounts).forEach(([team, count]) => {
    if (count >= 2) {
      const value = count === 2 ? 1 : count === 3 ? 3 : 5
      bonuses.push({ id: `team-${team}`, label: `${team} 默契`, value, desc: `${count} 名同队选手，沟通成本更低。` })
    }
  })

  Object.entries(styleCounts).forEach(([style, count]) => {
    if (style !== 'BALANCED' && count >= 3) {
      const value = count === 3 ? 3 : count === 4 ? 5 : 7
      bonuses.push({ id: `style-${style}`, label: `${STYLE_LABELS[style] || style}体系`, value, desc: `${count} 名选手倾向同一打法。` })
    }
  })

  collectTraitCombos(traitCounts).forEach(combo => bonuses.push(combo))

  const avgStability = roster.reduce((sum, player) => sum + (Number(player.stability) || 60), 0) / roster.length
  if (avgStability >= 84) {
    bonuses.push({ id: 'stable-room', label: '稳定更衣室', value: 1, desc: '阵容整体失误率较低。' })
  }

  const warnings = []
  const sampleCount = roster.filter(player => player.traits?.includes('小样本怪物')).length
  const riskyCount = roster.filter(player => player.traits?.includes('高风险收割')).length
  if (sampleCount >= 2) warnings.push('小样本选手偏多，上限高但波动会变大。')
  if (riskyCount >= 2) warnings.push('高风险收割点偏多，逆风局可能连续掉士气。')
  if (avgStability <= 58) warnings.push('阵容稳定性偏低，比赛方差会更明显。')
  if (missingRoles.length) warnings.push(`还缺 ${missingRoles.map(item => `${item.missing} ${item.role}`).join(' / ')}。`)

  const dominantStyleEntry = Object.entries(styleCounts)
    .filter(([style]) => style !== 'BALANCED')
    .sort((a, b) => b[1] - a[1])[0]
  const dominantStyle = dominantStyleEntry
    ? {
        id: dominantStyleEntry[0],
        label: STYLE_LABELS[dominantStyleEntry[0]] || dominantStyleEntry[0],
        count: dominantStyleEntry[1],
        hint: STYLE_HINTS[dominantStyleEntry[0]] || ''
      }
    : null
  const synergyBonus = bonuses.reduce((sum, bonus) => sum + Number(bonus.value || 0), 0)
  const tacticPower = Number(tactic?.power || 0)
  const stylePowerKey = `${String(tactic?.style || '').toLowerCase()}Power`
  const sponsorPower = Number(sponsorEffects.power || 0)
    + Number(sponsorEffects[stylePowerKey] || 0)
    + starCount * Number(sponsorEffects.starPower || 0)
  const power = Math.round(base + traitBonus / 2 + synergyBonus + tacticPower + sponsorPower)
  const summary = dominantStyle
    ? `${dominantStyle.label}方向 ${dominantStyle.count}/5，${dominantStyle.hint}`
    : '阵容还没有明显打法倾向，可以用后续签约决定路线。'

  return {
    power,
    base: Math.round(base),
    traitBonus: Math.round(traitBonus / 2),
    synergy: synergyBonus,
    tacticPower,
    sponsorPower,
    roleCounts,
    missingRoles,
    dominantStyle,
    bonuses: bonuses.sort((a, b) => b.value - a.value),
    warnings,
    summary
  }
}

export function getSigningPreview(run, player) {
  if (!run || !player) return null

  const candidate = normalizeMarketPlayer(player)
  const currentRoster = Array.isArray(run.roster) ? run.roster : []
  const currentReport = getRosterBuildReport(currentRoster, run.sponsors, run.tactic)
  const counts = getRoleCounts(currentRoster)
  const roleCap = RUN_ROSTER_REQUIREMENTS[candidate.role] || 0
  const roleFull = roleCap > 0 && counts[candidate.role] >= roleCap
  const nextRoster = roleFull ? currentRoster : [...currentRoster, candidate]
  const nextReport = getRosterBuildReport(nextRoster, run.sponsors, run.tactic)
  const powerDelta = roleFull ? 0 : nextReport.power - currentReport.power
  const newBonuses = nextReport.bonuses.filter(bonus => !currentReport.bonuses.some(item => item.id === bonus.id))
  const price = Math.max(0, Number(candidate.price || 0))
  const valueScore = price > 0 ? Math.round((Math.max(1, powerDelta) * 100) / price) : powerDelta
  const notes = []

  if (!roleFull && (RUN_ROSTER_REQUIREMENTS[candidate.role] || 0) > counts[candidate.role]) notes.push(`补齐 ${candidate.role} 位`)
  if (newBonuses.length) notes.push(`激活 ${newBonuses[0].label} +${newBonuses[0].value}`)
  if (candidate.playstyle && candidate.playstyle !== 'BALANCED') notes.push(`${candidate.styleName || STYLE_LABELS[candidate.playstyle]}倾向`)
  if (candidate.traits?.includes('小样本怪物')) notes.push('高上限小样本')
  if (candidate.stability >= 86) notes.push('稳定性好')
  if (!notes.length) notes.push('便宜好用的轮廓拼图')

  return {
    projectedPower: nextReport.power,
    powerDelta,
    valueScore,
    fitLabel: powerDelta >= 5 ? '强适配' : powerDelta >= 3 ? '可成型' : powerDelta >= 1 ? '补位置' : roleFull ? '位置已满' : '偏功能',
    notes: notes.slice(0, 3),
    newBonuses: newBonuses.slice(0, 2),
    warnings: nextReport.warnings.filter(warning => !currentReport.warnings.includes(warning)).slice(0, 2)
  }
}

function normalizeRun(rawRun) {
  const route = Array.isArray(rawRun.route) && rawRun.route.length ? rawRun.route : [...ROUTE_TEMPLATE]
  const roster = Array.isArray(rawRun.roster) ? rawRun.roster.map(player => normalizeRunPlayer(player)) : []
  const inferredStatus = rawRun.status || (rawRun.encounter || roster.length >= 5 ? 'running' : 'building')
  return {
    ...rawRun,
    status: inferredStatus,
    stage: Number(rawRun.stage || 1),
    targetStage: Number(rawRun.targetStage || route.length || RUN_TARGET_STAGE),
    route,
    hp: Number(rawRun.hp || 3),
    funds: Number(rawRun.funds ?? INITIAL_RUN_FUNDS),
    morale: Number(rawRun.morale ?? 72),
    intel: Number(rawRun.intel || 0),
    tactic: rawRun.tactic || DEFAULT_TACTIC,
    tacticPower: Number(rawRun.tacticPower || 0),
    sponsors: Array.isArray(rawRun.sponsors) ? rawRun.sponsors : [],
    relics: Array.isArray(rawRun.relics) ? rawRun.relics : [],
    curses: Array.isArray(rawRun.curses) ? rawRun.curses : [],
    temporaryBuffs: Array.isArray(rawRun.temporaryBuffs) ? rawRun.temporaryBuffs : [],
    roster,
    market: Array.isArray(rawRun.market) ? rawRun.market.map(player => normalizeMarketPlayer(player)) : [],
    marketRefreshes: Number(rawRun.marketRefreshes || 0),
    freeRefreshes: Number(rawRun.freeRefreshes || 0),
    history: Array.isArray(rawRun.history) ? rawRun.history : [],
    encounter: rawRun.encounter || null,
    lastReview: rawRun.lastReview || null
  }
}

function withFreshEncounter(run, playerPool) {
  const normalized = normalizeRun(run)
  const type = normalized.route[Math.max(0, normalized.stage - 1)] || 'boss'
  return {
    ...normalized,
    status: 'running',
    encounter: createEncounter(type, normalized, playerPool)
  }
}

function advanceRunNode(run, playerPool) {
  const nextStage = Math.min(run.targetStage, run.stage + 1)
  return withFreshEncounter({ ...run, stage: nextStage }, playerPool)
}

function createEncounter(type, run, playerPool) {
  if (type === 'draft') {
    return {
      type,
      label: '选秀节点',
      title: '球探带回了三份候选合同',
      desc: '选择一名选手，他会替换同位置当前战力最低的首发。',
      choices: createDraftChoices(playerPool, run)
    }
  }

  if (type === 'sponsor') {
    return {
      type,
      label: '赞助节点',
      title: '董事会递来了三份赞助方案',
      desc: '赞助会改变整局 Run 的构筑方向。',
      choices: createSponsorChoices(run)
    }
  }

  if (type === 'tactic') {
    return {
      type,
      label: '战术节点',
      title: '教练组要求锁定下一阶段打法',
      desc: '战术会影响战力、士气、情报和赛场克制。',
      choices: createTacticChoices(run)
    }
  }

  if (type === 'relic') {
    return {
      type,
      label: '奖励节点',
      title: '赞助仓库打开了三只箱子',
      desc: '遗物会强化整局 Run；诅咒合同收益更猛，但会留下代价。',
      choices: createRelicChoices(run)
    }
  }

  if (type === 'event') {
    const event = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
    return {
      type,
      label: '事件节点',
      title: event.name,
      desc: event.desc,
      choices: event.choices
    }
  }

  const isBoss = type === 'boss'
  return {
    type: isBoss ? 'boss' : 'match',
    label: isBoss ? '冠军战' : '比赛节点',
    title: isBoss ? '薯条杯总决赛' : '下一轮赛程',
    desc: isBoss ? '赢下这一场，就把这套阵容写进新版名人堂。' : '执行当前战术，结算比赛并获得战后复盘。',
    opponent: createOpponent(run.stage, isBoss),
    reward: {
      funds: isBoss ? 420 : 150 + run.stage * 22
    },
    choices: []
  }
}

function createRunMarket(playerPool, run = {}, profile = {}) {
  const pool = Array.isArray(playerPool) ? playerPool : []
  if (!pool.length) return []

  const level = getManagerLevel(profile)
  const scoutDepth = level >= 2 ? 72 : 48
  const counts = getRoleCounts(run.roster)
  const usedIds = new Set((run.roster || []).map(player => player.id))
  const roleTargets = { TANK: 2, DPS: 3, SUP: 3 }
  const picks = []

  Object.entries(RUN_ROSTER_REQUIREMENTS).forEach(([role, required]) => {
    const needed = Math.max(0, required - (counts[role] || 0))
    if (needed <= 0) return

    const targetCount = Math.max(needed, roleTargets[role] || needed)
    const candidates = pickMarketPlayersForRole(pool, role, targetCount, scoutDepth)
    candidates.forEach(player => {
      if (picks.length >= OPENING_MARKET_SIZE || usedIds.has(player.id)) return
      picks.push(normalizeMarketPlayer(player))
      usedIds.add(player.id)
    })
  })

  if (picks.length < OPENING_MARKET_SIZE) {
    const openRoles = new Set(Object.entries(RUN_ROSTER_REQUIREMENTS)
      .filter(([role, required]) => (counts[role] || 0) < required)
      .map(([role]) => role))
    const fallback = shuffle(pool
      .filter(player => openRoles.has(player.role))
      .filter(player => !usedIds.has(player.id))
      .slice(0, scoutDepth * 2))

    fallback.forEach(player => {
      if (picks.length >= OPENING_MARKET_SIZE || usedIds.has(player.id)) return
      picks.push(normalizeMarketPlayer(player))
      usedIds.add(player.id)
    })
  }

  return picks.slice(0, OPENING_MARKET_SIZE)
}

function pickMarketPlayersForRole(pool, role, count, scoutDepth) {
  const rolePool = pool.filter(player => player.role === role)
  const elite = shuffle(rolePool.slice(0, scoutDepth)).slice(0, Math.ceil(count / 2))
  const budget = shuffle([...rolePool]
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0) || Number(b.ovr || 0) - Number(a.ovr || 0))
    .slice(0, Math.max(18, scoutDepth)))
    .slice(0, count)
  const blended = [...elite, ...budget, ...shuffle(rolePool.slice(0, scoutDepth)).slice(0, count)]
  const seen = new Set()

  return blended.filter(player => {
    if (!player?.id || seen.has(player.id)) return false
    seen.add(player.id)
    return true
  }).slice(0, count)
}

function normalizeMarketPlayer(player) {
  const traits = Array.isArray(player.traits) ? [...player.traits] : []
  const playstyle = normalizePlaystyle(player.playstyle || inferPlaystyleFromTraits(traits, player.role))
  const ovr = Number(player.ovr || 0)
  const stability = Number(player.stability || 60)

  return {
    id: String(player.id),
    name: player.name || 'Unknown',
    role: player.role,
    team: player.team || 'FA',
    hero: player.hero || '',
    ovr,
    price: Math.max(0, Number(player.price || 0)),
    stability,
    playstyle,
    styleName: STYLE_LABELS[playstyle] || playstyle,
    ceiling: Number(player.ceiling || Math.min(99, ovr + (traits.includes('小样本怪物') ? 5 : 2))),
    risk: player.risk || inferRiskLabel({ stability, traits }),
    traits
  }
}

function normalizeRunPlayer(player) {
  const normalized = normalizeMarketPlayer(player)
  return {
    ...player,
    ...normalized,
    actualPaidPrice: Number(player.actualPaidPrice ?? normalized.price),
    acquiredAt: player.acquiredAt || 'unknown'
  }
}

function createDraftChoices(playerPool, run) {
  const ownedIds = new Set((run.roster || []).map(player => player.id))
  const candidates = (playerPool || [])
    .filter(player => !ownedIds.has(player.id))
    .filter(player => {
      const sameRole = run.roster?.filter(item => item.role === player.role) || []
      const weakest = sameRole.reduce((low, item) => (!low || item.ovr < low.ovr ? item : low), null)
      return !weakest || player.ovr >= weakest.ovr - 4
    })

  return shuffle(candidates).slice(0, 3).map(player => ({
    id: `draft-${player.id}`,
    name: player.name,
    desc: `${player.role} / ${player.team} / ${player.ovr} OVR / ${player.traits?.join('、') || '体系拼图'}`,
    cost: player.price,
    player
  }))
}

function createSponsorChoices(run) {
  const owned = new Set((run.sponsors || []).map(item => item.id))
  const candidates = SPONSOR_POOL.filter(item => !owned.has(item.id))
  return shuffle(candidates.length ? candidates : SPONSOR_POOL).slice(0, 3)
}

function createRelicChoices(run) {
  const ownedRelics = new Set((run.relics || []).map(item => item.id))
  const ownedCurses = new Set((run.curses || []).map(item => item.id))
  const relics = shuffle(RELIC_POOL.filter(item => !ownedRelics.has(item.id))).slice(0, 2)
  const curses = shuffle(CURSE_POOL.filter(item => !ownedCurses.has(item.id))).slice(0, 1)
  const fallbackRelics = relics.length ? relics : shuffle(RELIC_POOL).slice(0, 2)
  const fallbackCurses = curses.length ? curses : shuffle(CURSE_POOL).slice(0, 1)

  return shuffle([
    ...fallbackRelics.map(item => ({
      ...item,
      rewardType: 'relic',
      desc: `${item.desc} 选择后加入遗物栏。`
    })),
    ...fallbackCurses.map(item => ({
      ...item,
      rewardType: 'curse',
      rarity: '诅咒合同',
      desc: `${item.desc} 高收益，高代价。`
    }))
  ]).slice(0, 3)
}

function createTacticChoices(run) {
  const currentId = run.tactic?.id
  const choices = shuffle(TACTIC_POOL.filter(item => item.id !== currentId)).slice(0, 3)
  return choices.length ? choices : TACTIC_POOL.slice(0, 3)
}

function createOpponent(stage, isBoss = false) {
  const tactics = ['DIVE', 'POKE', 'BRAWL', 'POCKET', 'CHAOS']
  const tacticStyle = tactics[Math.floor(Math.random() * tactics.length)]
  const basePower = 68 + stage * 4 + Math.floor(Math.random() * 8) + (isBoss ? 10 : 0)
  const names = isBoss
    ? ['总决赛守门人', '冠军候选一号种子', '数据模型最终 Boss']
    : ['训练赛怪队', '版本答案队', '低调黑马', '连胜挑战者', '老牌强队']

  return {
    id: `opponent-${stage}-${Date.now()}`,
    name: names[Math.floor(Math.random() * names.length)],
    power: basePower,
    tacticStyle,
    scout: getOpponentScout(tacticStyle, isBoss)
  }
}

function getOpponentScout(style, isBoss) {
  const styleText = {
    DIVE: '偏高速进攻，怕被地推抱团截停。',
    POKE: '偏远程消耗，怕被放狗撕开后排。',
    BRAWL: '偏抱团地推，怕长枪控图拉扯。',
    POCKET: '偏保核心，怕情报和针对。',
    CHAOS: '偏奇招，方差很大。'
  }
  return `${styleText[style] || '打法均衡。'}${isBoss ? ' 决赛加压，基础战力更高。' : ''}`
}

function applyDraftChoice(run, player) {
  const sameRole = run.roster.filter(item => item.role === player.role)
  const weakest = sameRole.reduce((low, item) => (!low || item.ovr < low.ovr ? item : low), null)
  const actualCost = Math.min(run.funds, Math.max(0, Number(player.price || 0)))
  const underpaid = actualCost < Number(player.price || 0)
  const nextRoster = weakest
    ? run.roster.map(item => (item.id === weakest.id ? { ...player } : item))
    : [...run.roster, { ...player }].slice(0, 5)
  const text = weakest
    ? `签下 ${player.name}，替换 ${weakest.name}。${underpaid ? '预算不足，靠人情价先拿下。' : ''}`
    : `签下 ${player.name} 进入首发。`

  return {
    run: {
      ...run,
      roster: nextRoster,
      funds: Math.max(0, run.funds - actualCost),
      morale: clamp(run.morale + (underpaid ? -4 : 2), 0, 100),
      history: [{ type: 'draft', text }, ...(run.history || [])].slice(0, 10)
    },
    message: text
  }
}

function applySponsorChoice(run, sponsor) {
  const effects = sponsor.effects || {}
  const text = `签下赞助：${sponsor.name}。${sponsor.desc}`
  return {
    run: {
      ...run,
      sponsors: [...(run.sponsors || []), sponsor],
      funds: Math.max(0, run.funds + Number(effects.funds || 0)),
      morale: clamp(run.morale + Number(effects.morale || 0), 0, 100),
      intel: Math.max(0, run.intel + Number(effects.intel || 0)),
      history: [{ type: 'sponsor', text }, ...(run.history || [])].slice(0, 10)
    },
    message: text
  }
}

function applyTacticChoice(run, tactic) {
  const text = `战术室锁定：${tactic.name}。${tactic.desc}`
  return {
    run: {
      ...run,
      tactic,
      tacticPower: Number(run.tacticPower || 0),
      morale: clamp(run.morale + Number(tactic.morale || 0), 0, 100),
      intel: Math.max(0, run.intel + Number(tactic.intel || 0)),
      history: [{ type: 'tactic', text }, ...(run.history || [])].slice(0, 10)
    },
    message: text
  }
}

function applyRelicChoice(run, choice) {
  const isCurse = choice.rewardType === 'curse' || choice.rarity === '诅咒合同' || choice.rarity === '诅咒'
  const instant = choice.instant || {}
  const text = isCurse
    ? `签下诅咒合同：${choice.name}。${choice.desc}`
    : `获得遗物：${choice.name}。${choice.desc}`
  const nextRelics = isCurse ? (run.relics || []) : [...(run.relics || []), stripChoiceRuntime(choice)]
  const nextCurses = isCurse ? [...(run.curses || []), stripChoiceRuntime(choice)] : (run.curses || [])
  const temporaryBuffs = instant.temporaryBuff
    ? [...(run.temporaryBuffs || []), instant.temporaryBuff]
    : (run.temporaryBuffs || [])

  return {
    run: {
      ...run,
      relics: nextRelics,
      curses: nextCurses,
      temporaryBuffs,
      funds: Math.max(0, Number(run.funds || 0) + Number(instant.funds || 0)),
      hp: clamp(Number(run.hp || 0) + Number(instant.hp || 0), 1, 5),
      morale: clamp(Number(run.morale || 0) + Number(instant.morale || 0), 0, 100),
      intel: Math.max(0, Number(run.intel || 0) + Number(instant.intel || 0)),
      history: [{ type: isCurse ? 'curse' : 'relic', text }, ...(run.history || [])].slice(0, 10)
    },
    message: text
  }
}

function applyEventChoice(run, choice) {
  const effects = choice.effects || {}
  let nextRoster = run.roster || []
  if (effects.trainAll) {
    nextRoster = nextRoster.map(player => ({ ...player, ovr: player.ovr + Number(effects.trainAll || 0) }))
  }
  if (effects.traitTrain) {
    nextRoster = nextRoster.map(player => (
      player.traits?.includes(effects.traitTrain)
        ? { ...player, ovr: player.ovr + Number(effects.amount || 0) }
        : player
    ))
  }
  const temporaryBuffs = effects.temporaryBuff
    ? [...(run.temporaryBuffs || []), effects.temporaryBuff]
    : (run.temporaryBuffs || [])

  const text = `事件选择：${choice.name}。${choice.desc}`
  return {
    run: {
      ...run,
      roster: nextRoster,
      temporaryBuffs,
      funds: Math.max(0, run.funds + Number(effects.funds || 0)),
      morale: clamp(run.morale + Number(effects.morale || 0), 0, 100),
      intel: Math.max(0, run.intel + Number(effects.intel || 0)),
      tacticPower: Number(run.tacticPower || 0) + Number(effects.tacticPower || 0),
      history: [{ type: 'event', text }, ...(run.history || [])].slice(0, 10)
    },
    message: text
  }
}

function buildMatchReview({ run, encounter, opponent, tactic, rosterPower, counterEdge, finalScore, isWin, fundsDelta }) {
  const topPlayer = [...(run.roster || [])].sort((a, b) => b.ovr - a.ovr)[0]
  const counterText = counterEdge > 2
    ? '战术克制明显，赛前准备直接转化成优势。'
    : counterEdge < -2
      ? '战术被对手读到，开局压力很大。'
      : '双方战术没有形成决定性克制。'
  const summary = isWin
    ? `${encounter.label}取胜：${tactic.name} 打出 ${finalScore} 分，对手 ${opponent.power}。奖金 +${fundsDelta}K。`
    : `${encounter.label}失利：${tactic.name} 只打出 ${finalScore} 分，对手 ${opponent.power}。保底补贴 +${fundsDelta}K。`

  return {
    result: isWin ? 'WIN' : 'LOSS',
    summary,
    tactic: tactic.name,
    opponent: opponent.name,
    opponentPower: opponent.power,
    opponentTactic: opponent.tacticStyle,
    rosterPower,
    finalScore,
    counterEdge,
    keyPlayer: topPlayer ? `${topPlayer.name} (${topPlayer.ovr} OVR)` : '暂无',
    notes: [
      counterText,
      topPlayer ? `${topPlayer.name} 是本场账面核心。` : '当前阵容缺少明确核心。',
      run.morale >= 80 ? '高士气让队伍更敢打。' : run.morale <= 35 ? '士气偏低，队伍容错明显下降。' : '士气处于可控区间。'
    ]
  }
}

function getTacticEdge(myStyle, enemyStyle) {
  if (myStyle === 'BRAWL' && enemyStyle === 'DIVE') return 5
  if (myStyle === 'DIVE' && enemyStyle === 'POKE') return 5
  if (myStyle === 'POKE' && enemyStyle === 'BRAWL') return 5
  if (myStyle === 'POCKET' && enemyStyle === 'CHAOS') return 3
  if (myStyle === 'CHAOS' && enemyStyle === 'POCKET') return 3
  if (enemyStyle === 'BRAWL' && myStyle === 'DIVE') return -4
  if (enemyStyle === 'DIVE' && myStyle === 'POKE') return -4
  if (enemyStyle === 'POKE' && myStyle === 'BRAWL') return -4
  return 0
}

function getRunEffectSources(run = {}) {
  const sources = [
    ...(Array.isArray(run.sponsors) ? run.sponsors : []),
    ...(Array.isArray(run.relics) ? run.relics : []),
    ...(Array.isArray(run.curses) ? run.curses : []),
    ...(Array.isArray(run.temporaryBuffs) ? run.temporaryBuffs : [])
  ]
  const baseEffects = getSponsorEffects(sources)

  if (Number(run.hp || 0) <= 1 && Number(baseEffects.lowHpPower || 0) > 0) {
    sources.push({
      id: 'low-hp-trigger',
      name: '绝境触发',
      effects: { power: Number(baseEffects.lowHpPower || 0) }
    })
  }

  return sources
}

function getRunEffects(run = {}) {
  return getSponsorEffects(getRunEffectSources(run))
}

function getEffectiveTactic(run = {}) {
  const tactic = run.tactic || DEFAULT_TACTIC
  return {
    ...tactic,
    power: Number(tactic.power || 0) + Number(run.tacticPower || 0)
  }
}

function getSponsorEffects(sponsors = []) {
  return sponsors.reduce((acc, sponsor) => {
    Object.entries(sponsor.effects || {}).forEach(([key, value]) => {
      if (typeof value === 'number') acc[key] = (acc[key] || 0) + value
    })
    return acc
  }, {})
}

function tickTemporaryBuffs(buffs = []) {
  return (Array.isArray(buffs) ? buffs : [])
    .map(buff => ({
      ...buff,
      duration: Number(buff.duration || 1) - 1
    }))
    .filter(buff => Number(buff.duration || 0) > 0)
}

function stripChoiceRuntime(choice = {}) {
  const { rewardType, instant, ...rest } = choice
  return rest
}

function makeNextPlayerCard(player) {
  const role = normalizeRole(player.role)
  if (!role) return null

  const dmg = Number(player.avg_dmg || 0)
  const heal = Number(player.avg_heal || 0)
  const elim = Number(player.avg_elim || 0)
  const block = Number(player.avg_block || 0)
  const deaths = Number(player.avg_dth || 0)
  const time = Number(player.raw_time_mins || 0)
  const rawScore = role === 'TANK'
    ? dmg * 0.38 + block * 0.58 + elim * 105
    : role === 'DPS'
      ? dmg * 0.78 + elim * 150
      : heal * 0.72 + dmg * 0.28 + elim * 70
  const samplePenalty = time < 35 ? Math.max(0.72, time / 35) : 1
  const safeScore = rawScore * samplePenalty
  const ovr = Math.max(58, Math.min(96, Math.round(58 + Math.log10(safeScore + 1) * 7.8)))
  const traits = inferTraits({ role, dmg, heal, elim, deaths, block, time, ovr })
  const stability = Math.max(35, Math.min(96, Math.round(86 - deaths * 2 + Math.min(10, time / 12))))
  const playstyle = inferPlaystyle({ role, dmg, heal, elim, deaths, block, time, traits })

  return {
    id: String(player.player_id || player.battle_tag || player.display_name || Math.random()),
    name: player.display_name || player.nickname || player.player_name || 'Unknown',
    role,
    team: player.team_short_name || 'FA',
    hero: Array.isArray(player.top_3_heroes) && player.top_3_heroes[0] ? player.top_3_heroes[0] : player.most_played_hero || '',
    ovr,
    price: Math.round((120 + (ovr - 58) * 13) / 10) * 10,
    stability,
    playstyle,
    styleName: STYLE_LABELS[playstyle] || playstyle,
    ceiling: Math.min(99, ovr + (time < 35 ? 5 : 2) + (elim >= 20 ? 2 : 0)),
    risk: inferRiskLabel({ stability, traits }),
    traits
  }
}

function inferTraits({ role, dmg, heal, elim, deaths, block, time, ovr }) {
  const traits = []
  if (ovr >= 88) traits.push('明星核心')
  if (time < 35 && ovr >= 78) traits.push('小样本怪物')
  if (elim >= 20 && deaths >= 7) traits.push('高风险收割')
  if (deaths <= 4 && ovr >= 78) traits.push('稳定机器')
  if (role === 'TANK' && block >= 8000) traits.push('防线支柱')
  if (role === 'DPS' && dmg >= 9000) traits.push('火力压制')
  if (role === 'SUP' && heal >= 8500) traits.push('续航核心')
  if (!traits.length) traits.push('体系拼图')
  return traits.slice(0, 3)
}

function inferPlaystyle({ role, dmg, heal, elim, deaths, block, traits }) {
  if (traits?.includes('高风险收割')) return 'DIVE'
  if (traits?.includes('火力压制')) return 'POKE'
  if (traits?.includes('防线支柱') || traits?.includes('稳定机器')) return 'BRAWL'
  if (traits?.includes('明星核心') || traits?.includes('续航核心')) return 'POCKET'
  if (traits?.includes('小样本怪物')) return 'CHAOS'
  if (role === 'TANK' && block >= 7200) return 'BRAWL'
  if (role === 'DPS' && dmg >= 8200) return 'POKE'
  if (role === 'SUP' && heal >= 7800) return 'POCKET'
  if (elim >= 18 && deaths >= 6) return 'DIVE'
  return 'BALANCED'
}

function inferPlaystyleFromTraits(traits = [], role = '') {
  const mapped = traits.map(trait => TRAIT_STYLE_MAP[trait]).find(Boolean)
  if (mapped) return mapped
  if (role === 'TANK') return 'BRAWL'
  if (role === 'DPS') return 'POKE'
  if (role === 'SUP') return 'POCKET'
  return 'BALANCED'
}

function normalizePlaystyle(style) {
  return STYLE_LABELS[style] ? style : 'BALANCED'
}

function inferRiskLabel({ stability, traits = [] }) {
  if (traits.includes('小样本怪物')) return '高上限'
  if (traits.includes('高风险收割') || stability < 55) return '高波动'
  if (stability >= 86 || traits.includes('稳定机器')) return '稳定'
  return '常规'
}

function countBy(items, getKey) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = getKey(item)
    if (key) acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function countTraits(roster = []) {
  return roster.reduce((acc, player) => {
    ;(player.traits || []).forEach(trait => {
      acc[trait] = (acc[trait] || 0) + 1
    })
    return acc
  }, {})
}

function collectTraitCombos(traitCounts = {}) {
  const bonuses = []
  const has = trait => Number(traitCounts[trait] || 0) > 0
  const count = trait => Number(traitCounts[trait] || 0)

  if (has('明星核心') && has('续航核心')) {
    bonuses.push({ id: 'combo-pocket-star', label: '核心保护', value: 2, desc: '明星核心获得续航兜底。' })
  }
  if (has('防线支柱') && has('续航核心')) {
    bonuses.push({ id: 'combo-frontline-sustain', label: '前排续航', value: 2, desc: '前排和治疗链路完整。' })
  }
  if (count('火力压制') >= 2) {
    bonuses.push({ id: 'combo-double-poke', label: '双火力线', value: 2, desc: '两条输出线可以持续压制。' })
  }
  if (has('高风险收割') && has('稳定机器')) {
    bonuses.push({ id: 'combo-risk-anchor', label: '风险锚点', value: 1, desc: '稳定选手能兜住高风险打法。' })
  }
  if (count('体系拼图') >= 3) {
    bonuses.push({ id: 'combo-system-pieces', label: '体系拼图', value: 2, desc: '多名功能牌让阵容更完整。' })
  }

  return bonuses
}

function pickStarterRoster(pool) {
  const roles = {
    TANK: pool.filter(player => player.role === 'TANK'),
    DPS: pool.filter(player => player.role === 'DPS'),
    SUP: pool.filter(player => player.role === 'SUP')
  }

  const pickRole = (role, count) => shuffle(roles[role].slice(0, 48)).slice(0, count)
  return [
    ...pickRole('TANK', 1),
    ...pickRole('DPS', 2),
    ...pickRole('SUP', 2)
  ].map(player => ({ ...player }))
}

function normalizeRole(role) {
  if (role === 'TANK') return 'TANK'
  if (role === 'DPS' || role === 'DAMAGE') return 'DPS'
  if (role === 'SUP' || role === 'SUPPORT') return 'SUP'
  return ''
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function mergeUnique(a = [], b = []) {
  return [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(Boolean))]
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
