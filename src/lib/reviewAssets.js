export const safeArr = value => Array.isArray(value) ? value : []

export const safeObj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeLooseKey(value) {
  return normalizeText(value)
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueByNormalized(list) {
  const seen = new Set()

  return safeArr(list).filter(item => {
    const key = normalizeText(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatNum(value, digits = 0) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return Number(0).toFixed(Math.max(0, Number(digits || 0)))
  return num.toFixed(digits)
}

export function formatPercent(value) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return '0%'
  return `${Math.round(num * 100)}%`
}

export function splitStaffNames(value) {
  if (Array.isArray(value)) {
    return uniqueByNormalized(value.flatMap(item => splitStaffNames(item)))
  }

  if (value && typeof value === 'object') {
    return splitStaffNames(
      value.battle_tag ||
      value.battletag ||
      value.display_name ||
      value.nickname ||
      value.staff_name ||
      value.name ||
      ''
    )
  }

  const raw = String(value ?? '').trim()
  if (!raw) return []

  return uniqueByNormalized(
    raw
      .split(/[、,，/｜|&＋+；;]\s*|\s{2,}/g)
      .map(item => item.trim())
      .filter(Boolean)
  )
}

export function encodeStaffKey(value) {
  return encodeURIComponent(String(value ?? '').trim())
}

export function decodeStaffKey(value) {
  try {
    return decodeURIComponent(String(value ?? ''))
  } catch {
    return String(value ?? '')
  }
}

/* -------------------------------------------------------------------------- */
/* assets                                                                      */
/* -------------------------------------------------------------------------- */

function encodePathSegment(value, fallback = 'UNKNOWN') {
  const raw = String(value ?? '').trim() || fallback
  return encodeURIComponent(raw)
}

export function getTeamLogo(shortName) {
  return `/logos/${encodePathSegment(shortName)}.png`
}

/* -------------------------------------------------------------------------- */
/* staff / caster avatars                                                      */
/* -------------------------------------------------------------------------- */

function normalizeAssetKey(value) {
  return normalizeText(value)
    .replace(/#\d+$/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
    .trim()
}

const RAW_STAFF_AVATAR_ALIASES = {
  michaelsky5: 'SKY.jpg',
  交易大师邦桑迪: '牛萨库斯.png',
  GHOST: 'GHOST.jpg',
  在桜花散落前: '小枝.jpg',
  江川鹤一: '江川鹤一.jpg',
  缚虎君: '缚虎.jpg',
  只看漫天繁星与你: 'Roya.jpg',
  桑榆: '桑榆.jpg',
  纳纳克绝不熬夜: '南宫.jpg',
  丧命: '丧命.jpg',
  咸鱼咸: '咸鱼咸.jpg',
  Iris: '鸢尾.jpg',
  iris: '鸢尾.jpg',
  转生成雷电将军: '雷电将军.jpg',
  CHILLBOI: 'HAJIMI.jpg',
  我在黄昏淇里: '良良子.jpg',
  君子与月齐辉: '君子.jpg',
  LuckyBoy: 'LuckyBoy.jpg',
  寒冷的笑: '小云.jpg',
  疯狂大堡垒: '大堡垒.jpg',
  对面买菜超级加倍: '滴查.jpg',
  MaverickOvO: 'Maverick.jpg',
  Maverick: 'Maverick.jpg',
  AvIcII: 'Avicii.jpg',
  Avicii: 'Avicii.jpg',
  雾星月: '雾星月.jpg',
  Eleven: '伊莱文.jpg',
  我一世背叛: '我一世背叛.jpg',
  雨说丶: '雨说.jpg',
  Bella: '贝拉.jpg',
  身上有麻衣在爬: 'Z12.jpg',
  Z12: 'Z12.jpg'
}

const STAFF_AVATAR_ALIASES = Object.fromEntries(
  Object.entries(RAW_STAFF_AVATAR_ALIASES).map(([key, file]) => [normalizeAssetKey(key), file])
)

export function getStaffAvatar(staffName) {
  const raw = String(staffName ?? '').trim()
  if (!raw) return ''

  const clean = raw.replace(/#\d+$/g, '').trim()
  const key = normalizeAssetKey(raw)
  const cleanKey = normalizeAssetKey(clean)

  const file =
    STAFF_AVATAR_ALIASES[key] ||
    STAFF_AVATAR_ALIASES[cleanKey] ||
    ''

  if (file) return `/casters/${encodePathSegment(file)}`
  return clean ? `/casters/${encodePathSegment(clean)}.jpg` : ''
}

/* -------------------------------------------------------------------------- */
/* maps                                                                        */
/* -------------------------------------------------------------------------- */

const MAP_TYPE_FOLDERS = {
  control: 'Control',
  '控制图': 'Control',

  escort: 'Escort',
  payload: 'Escort',
  '运载目标': 'Escort',

  hybrid: 'Hybrid',
  '混合图': 'Hybrid',

  push: 'Push',
  '机动推进': 'Push',

  flashpoint: 'Flashpoint',
  '闪点作战': 'Flashpoint',

  clash: 'Clash',
  '冲突模式': 'Clash'
}

const MAP_FILE_ALIASES = {
  busan: 'Busan',
  '釜山': 'Busan',
  ilios: 'Ilios',
  '伊利奥斯': 'Ilios',
  'lijiang tower': 'Lijiang_Tower',
  'lijiang_tower': 'Lijiang_Tower',
  '漓江塔': 'Lijiang_Tower',
  nepal: 'Nepal',
  '尼泊尔': 'Nepal',
  oasis: 'Oasis',
  '绿洲城': 'Oasis',
  samoa: 'Samoa',
  '萨摩亚': 'Samoa',
  'antarctic peninsula': 'Antarctic_Peninsula',
  'antarctic_peninsula': 'Antarctic_Peninsula',
  '南极半岛': 'Antarctic_Peninsula',

  'circuit royal': 'Circuit_Royal',
  'circuit_royal': 'Circuit_Royal',
  '皇家赛道': 'Circuit_Royal',
  dorado: 'Dorado',
  '多拉多': 'Dorado',
  havana: 'Havana',
  '哈瓦那': 'Havana',
  junkertown: 'Junkertown',
  '渣客镇': 'Junkertown',
  rialto: 'Rialto',
  '里阿尔托': 'Rialto',
  'route 66': 'Route_66',
  'route_66': 'Route_66',
  '66号公路': 'Route_66',
  shambali: 'Shambali',
  '香巴里': 'Shambali',
  'watchpoint gibraltar': 'Watchpoint_Gibraltar',
  'watchpoint_gibraltar': 'Watchpoint_Gibraltar',
  '监测站直布罗陀': 'Watchpoint_Gibraltar',

  blizzardworld: 'Blizzard_World',
  'blizzard world': 'Blizzard_World',
  'blizzard_world': 'Blizzard_World',
  '暴雪世界': 'Blizzard_World',
  eichenwalde: 'Eichenwalde',
  '艾兴瓦尔德': 'Eichenwalde',
  hollywood: 'Hollywood',
  '好莱坞': 'Hollywood',
  'kings row': 'Kings_Row',
  'king s row': 'Kings_Row',
  'kings_row': 'Kings_Row',
  '国王大道': 'Kings_Row',
  midtown: 'Midtown',
  '中城': 'Midtown',
  numbani: 'Numbani',
  '努巴尼': 'Numbani',
  paraiso: 'Paraiso',
  'paraíso': 'Paraiso',
  '帕拉伊苏': 'Paraiso',

  colosseo: 'Colosseo',
  '斗兽场': 'Colosseo',
  esperanca: 'Esperanca',
  'esperança': 'Esperanca',
  '埃斯佩兰萨': 'Esperanca',
  'new queen street': 'New_Queen_Street',
  'new_queen_street': 'New_Queen_Street',
  '新皇后街': 'New_Queen_Street',
  runasapi: 'Runasapi',
  '鲁纳萨皮': 'Runasapi',

  aatlis: 'Aatlis',
  atlis: 'Aatlis',
  atlas: 'Aatlis',
  '阿特利斯': 'Aatlis',
  'new junk city': 'New_Junk_City',
  'new_junk_city': 'New_Junk_City',
  '新渣客城': 'New_Junk_City',
  suravasa: 'Suravasa',
  '苏拉瓦萨': 'Suravasa',

  hanaoka: 'Hanaoka',
  '花冈': 'Hanaoka',
  'throne of anubis': 'Throne_of_Anubis',
  'throne_of_anubis': 'Throne_of_Anubis',
  '阿努比斯王座': 'Throne_of_Anubis'
}

export function normalizeMapTypeFolder(mapType) {
  const raw = String(mapType ?? '').trim()
  if (!raw) return 'UNKNOWN'

  const key = normalizeLooseKey(raw)
  return MAP_TYPE_FOLDERS[key] || raw
}

export function mapNameToFileName(mapName) {
  const raw = String(mapName ?? '').trim()
  if (!raw) return 'UNKNOWN'

  const alias = MAP_FILE_ALIASES[normalizeLooseKey(raw)]
  if (alias) return alias

  const generated = raw
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[:.]/g, '')
    .replace(/[\/\\]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')

  return generated || 'UNKNOWN'
}

export function getMapImage(mapType, mapName) {
  const type = normalizeMapTypeFolder(mapType)
  const name = mapNameToFileName(mapName)
  return `/maps/${encodePathSegment(type)}/${encodePathSegment(name)}.jpg`
}

/* -------------------------------------------------------------------------- */
/* heroes                                                                      */
/* -------------------------------------------------------------------------- */

const HERO_SLUGS = {
  // TANK
  'D.Va': 'dva',
  DVa: 'dva',
  DVA: 'dva',
  'd.va': 'dva',
  Dva: 'dva',
  '金驭': 'domina',
  Domina: 'domina',
  '末日铁拳': 'doomfist',
  Doomfist: 'doomfist',
  '骇灾': 'hazard',
  Hazard: 'hazard',
  '渣客女王': 'junker_queen',
  'Junker Queen': 'junker_queen',
  JunkerQueen: 'junker_queen',
  Mauga: 'mauga',
  '毛加': 'mauga',
  Orisa: 'orisa',
  '奥丽莎': 'orisa',
  Ramattra: 'ramattra',
  '拉玛刹': 'ramattra',
  Reinhardt: 'reinhardt',
  '莱因哈特': 'reinhardt',
  Roadhog: 'roadhog',
  '路霸': 'roadhog',
  Sigma: 'sigma',
  '西格玛': 'sigma',
  Winston: 'winston',
  '温斯顿': 'winston',
  'Wrecking Ball': 'wrecking_ball',
  WreckingBall: 'wrecking_ball',
  '破坏球': 'wrecking_ball',
  Zarya: 'zarya',
  '查莉娅': 'zarya',

  // DPS
  Anran: 'anran',
  '安燃': 'anran',
  '安然': 'anran',
  Ashe: 'ashe',
  '艾什': 'ashe',
  Bastion: 'bastion',
  '堡垒': 'bastion',
  Cassidy: 'cassidy',
  '卡西迪': 'cassidy',
  Echo: 'echo',
  '回声': 'echo',
  Emre: 'emre',
  '埃姆雷': 'emre',
  Freja: 'freja',
  '芙蕾雅': 'freja',
  Genji: 'genji',
  '源氏': 'genji',
  Hanzo: 'hanzo',
  '半藏': 'hanzo',
  Junkrat: 'junkrat',
  '狂鼠': 'junkrat',
  Mei: 'mei',
  '美': 'mei',
  Pharah: 'pharah',
  '法老之鹰': 'pharah',
  Reaper: 'reaper',
  '死神': 'reaper',
  Sierra: 'sierra',
  '西拉': 'sierra',
  '希拉': 'sierra',
  Sojourn: 'sojourn',
  '索杰恩': 'sojourn',
  'Soldier: 76': 'soldier_76',
  Soldier76: 'soldier_76',
  'Soldier 76': 'soldier_76',
  '士兵：76': 'soldier_76',
  '士兵: 76': 'soldier_76',
  Sombra: 'sombra',
  '黑影': 'sombra',
  Symmetra: 'symmetra',
  '秩序之光': 'symmetra',
  Torbjörn: 'torbjorn',
  Torbjorn: 'torbjorn',
  '托比昂': 'torbjorn',
  Tracer: 'tracer',
  '猎空': 'tracer',
  Vendetta: 'vendetta',
  '仇怨': 'vendetta',
  Venture: 'venture',
  '探奇': 'venture',
  Widowmaker: 'widowmaker',
  '黑百合': 'widowmaker',

  // SUPPORT
  Ana: 'ana',
  '安娜': 'ana',
  Baptiste: 'baptiste',
  '巴蒂斯特': 'baptiste',
  Brigitte: 'brigitte',
  '布丽吉塔': 'brigitte',
  Illari: 'illari',
  '伊拉锐': 'illari',
  'Jetpack Cat': 'jetpack_cat',
  JetpackCat: 'jetpack_cat',
  '飞天猫': 'jetpack_cat',
  '喷气猫': 'jetpack_cat',
  Juno: 'juno',
  '朱诺': 'juno',
  Kiriko: 'kiriko',
  '雾子': 'kiriko',
  Lifeweaver: 'lifeweaver',
  '生命之梭': 'lifeweaver',
  Lúcio: 'lucio',
  Lucio: 'lucio',
  '卢西奥': 'lucio',
  Mercy: 'mercy',
  '天使': 'mercy',
  Mizuki: 'mizuki',
  '瑞稀': 'mizuki',
  '美月': 'mizuki',
  Moira: 'moira',
  '莫伊拉': 'moira',
  Wuyang: 'wuyang',
  '无漾': 'wuyang',
  Zenyatta: 'zenyatta',
  '禅雅塔': 'zenyatta'
}

const HERO_ROLE_BY_SLUG = {
  dva: 'tank',
  domina: 'tank',
  doomfist: 'tank',
  hazard: 'tank',
  junker_queen: 'tank',
  mauga: 'tank',
  orisa: 'tank',
  ramattra: 'tank',
  reinhardt: 'tank',
  roadhog: 'tank',
  sigma: 'tank',
  winston: 'tank',
  wrecking_ball: 'tank',
  zarya: 'tank',

  anran: 'damage',
  ashe: 'damage',
  bastion: 'damage',
  cassidy: 'damage',
  echo: 'damage',
  emre: 'damage',
  freja: 'damage',
  genji: 'damage',
  hanzo: 'damage',
  junkrat: 'damage',
  mei: 'damage',
  pharah: 'damage',
  reaper: 'damage',
  sierra: 'damage',
  sojourn: 'damage',
  soldier_76: 'damage',
  sombra: 'damage',
  symmetra: 'damage',
  torbjorn: 'damage',
  tracer: 'damage',
  vendetta: 'damage',
  venture: 'damage',
  widowmaker: 'damage',

  ana: 'support',
  baptiste: 'support',
  brigitte: 'support',
  illari: 'support',
  jetpack_cat: 'support',
  juno: 'support',
  kiriko: 'support',
  lifeweaver: 'support',
  lucio: 'support',
  mercy: 'support',
  mizuki: 'support',
  moira: 'support',
  wuyang: 'support',
  zenyatta: 'support'
}

export function heroNameToSlug(heroName) {
  const raw = String(heroName ?? '').trim()
  if (!raw) return 'unknown'

  if (HERO_SLUGS[raw]) return HERO_SLUGS[raw]

  const looseKey = normalizeLooseKey(raw)
  const aliasEntry = Object.entries(HERO_SLUGS).find(([key]) => normalizeLooseKey(key) === looseKey)
  if (aliasEntry) return aliasEntry[1]

  const generated = raw
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[.:]/g, '')
    .replace(/[\/\\]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()

  return generated || 'unknown'
}

export function inferHeroFolder(heroName) {
  const slug = heroNameToSlug(heroName)
  return HERO_ROLE_BY_SLUG[slug] || ''
}

export function normalizeHeroFolder(role, heroName = '') {
  const r = String(role ?? '').trim().toUpperCase()

  if (r === 'TANK' || r === '重装' || r === '坦克') return 'tank'
  if (r === 'SUP' || r === 'SUPPORT' || r === '辅助') return 'support'
  if (r === 'DPS' || r === 'DAMAGE' || r === '输出') return 'damage'

  return inferHeroFolder(heroName) || 'damage'
}

export function getHeroImage(heroName, role) {
  const slug = heroNameToSlug(heroName)
  const folder = normalizeHeroFolder(role, heroName)
  return `/heroes/${encodePathSegment(folder)}/${encodePathSegment(slug)}.png`
}

/* -------------------------------------------------------------------------- */
/* display helpers                                                             */
/* -------------------------------------------------------------------------- */

export function getPlayerDisplayName(player) {
  const row = safeObj(player)
  return row.display_name || row.nickname || row.player_name || row.name || '未知选手'
}

export function getRoleCn(role) {
  const r = String(role ?? '').toUpperCase()

  if (r === 'TANK') return '坦克'
  if (r === 'DPS' || r === 'DAMAGE') return '输出'
  if (r === 'SUP' || r === 'SUPPORT') return '辅助'

  return '自由人'
}

export function getTeamDisplayName(team) {
  const row = safeObj(team)
  return row.team_short_name || row.short || row.team_name || row.name || '未知队伍'
}

/* -------------------------------------------------------------------------- */
/* team / player / match selectors                                             */
/* -------------------------------------------------------------------------- */

export function getIdentityValues(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap(item => getIdentityValues(item))
  }

  if (typeof value !== 'object') {
    return [String(value)]
  }

  return [
    value.id,
    value.team_id,
    value.player_id,
    value.short,
    value.team_short_name,
    value.name,
    value.team_name,
    value.display_name,
    value.nickname,
    value.player_name
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== '').map(String)
}

export function identityMatches(source, target) {
  const sourceValues = getIdentityValues(source)
  const targetValues = getIdentityValues(target)

  if (!sourceValues.length || !targetValues.length) return false

  const sourceKeys = new Set(sourceValues.map(normalizeText))
  return targetValues.some(value => sourceKeys.has(normalizeText(value)))
}

function getPrimaryIdentity(value) {
  if (!value) return ''

  if (typeof value !== 'object') return String(value)

  return String(
    value.id ||
    value.team_id ||
    value.player_id ||
    value.short ||
    value.team_short_name ||
    value.name ||
    value.team_name ||
    ''
  )
}

export function getTeamById(db, teamId) {
  if (!teamId) return null
  return safeArr(db?.teams).find(team => identityMatches(team, teamId)) || null
}

export function getPlayerById(db, playerId) {
  if (!playerId) return null
  return safeArr(db?.players).find(player => identityMatches(player, playerId)) || null
}

export function getPlayerTotalById(db, playerId) {
  if (!playerId) return null
  return safeArr(db?.player_totals).find(player => identityMatches(player, playerId)) || null
}

export function getTeamReviewById(db, teamId) {
  if (!teamId) return null
  return safeArr(db?.team_reviews).find(team => identityMatches(team, teamId)) || null
}

export function getTeamPlayers(db, teamId) {
  if (!teamId) return []

  const team = getTeamById(db, teamId)
  const review = getTeamReviewById(db, teamId)

  const candidates = uniqueByNormalized([
    teamId,
    ...getIdentityValues(team),
    ...getIdentityValues(review)
  ])

  return safeArr(db?.players).filter(player => {
    const playerTeamIdentity = {
      id: player?.team_id,
      team_id: player?.team_id,
      short: player?.team_short_name,
      team_short_name: player?.team_short_name,
      name: player?.team_name,
      team_name: player?.team_name
    }

    return candidates.some(candidate => identityMatches(playerTeamIdentity, candidate))
  })
}

export function getTeamMatches(db, teamId) {
  if (!teamId) return []

  const team = getTeamById(db, teamId)
  const review = getTeamReviewById(db, teamId)

  const candidates = uniqueByNormalized([
    teamId,
    ...getIdentityValues(team),
    ...getIdentityValues(review)
  ])

  return safeArr(db?.matches).filter(match => {
    return candidates.some(candidate => {
      return identityMatches(match?.team_a, candidate) || identityMatches(match?.team_b, candidate)
    })
  })
}

export function getMatchById(db, matchId) {
  if (!matchId) return null

  return safeArr(db?.matches).find(match => {
    return identityMatches({
      id: match.match_id,
      team_id: match.raw_match_id,
      name: match.match_display_name,
      display_name: match.matchDisplayName
    }, matchId)
  }) || null
}

export function getOpponent(match, teamId) {
  if (!match || !teamId) return null

  if (identityMatches(match?.team_a, teamId)) return match.team_b || null
  if (identityMatches(match?.team_b, teamId)) return match.team_a || null

  return null
}

export function getMatchWinnerId(match) {
  if (!match) return ''

  if (match?.winner) {
    const winner = match.winner

    if (identityMatches(match?.team_a, winner)) return getPrimaryIdentity(match.team_a)
    if (identityMatches(match?.team_b, winner)) return getPrimaryIdentity(match.team_b)

    return getPrimaryIdentity(winner)
  }

  const scoreA = Number(match?.team_a?.score ?? match?.score_a ?? match?.teamAScore ?? 0)
  const scoreB = Number(match?.team_b?.score ?? match?.score_b ?? match?.teamBScore ?? 0)

  if (scoreA > scoreB) return getPrimaryIdentity(match?.team_a)
  if (scoreB > scoreA) return getPrimaryIdentity(match?.team_b)

  return ''
}

export function getScheduledText(match) {
  const date = match?.scheduled_date || ''
  const time = match?.scheduled_time || ''
  const weekday = match?.scheduled_weekday || ''
  const at = match?.scheduled_at || ''

  if (date && weekday && time) return `${date} ${weekday} ${time}`
  if (date && time) return `${date} ${time}`
  if (date && weekday) return `${date} ${weekday}`

  return date || time || at || ''
}