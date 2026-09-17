import { OW_HERO_TW_BY_ID, OW_MAP_TW_BY_ID, OW_MAP_MODE_TW_BY_ID } from './owTraditionalNames.js'
import { normalizeLocale } from './locales.js'

export const OW_HEROES = [
  { id: 'domina', zh: '金驭', en: 'Domina', role: 'tank', assetKey: 'domina' },
  { id: 'dmon', zh: 'D.Mon', en: 'D.Mon', role: 'tank', assetKey: 'dmon' },
  { id: 'doomfist', zh: '末日铁拳', en: 'Doomfist', role: 'tank', assetKey: 'doomfist' },
  { id: 'dva', zh: 'D.Va', en: 'D.Va', role: 'tank', assetKey: 'dva', aliases: ['DVa', 'DVA'] },
  { id: 'hazard', zh: '骇灾', en: 'Hazard', role: 'tank', assetKey: 'hazard' },
  { id: 'junker-queen', zh: '渣客女王', en: 'Junker Queen', role: 'tank', assetKey: 'junker-queen' },
  { id: 'mauga', zh: '毛加', en: 'Mauga', role: 'tank', assetKey: 'mauga' },
  { id: 'orisa', zh: '奥丽莎', en: 'Orisa', role: 'tank', assetKey: 'orisa' },
  { id: 'ramattra', zh: '拉玛刹', en: 'Ramattra', role: 'tank', assetKey: 'ramattra' },
  { id: 'reinhardt', zh: '莱因哈特', en: 'Reinhardt', role: 'tank', assetKey: 'reinhardt' },
  { id: 'roadhog', zh: '路霸', en: 'Roadhog', role: 'tank', assetKey: 'roadhog' },
  { id: 'sigma', zh: '西格玛', en: 'Sigma', role: 'tank', assetKey: 'sigma' },
  { id: 'winston', zh: '温斯顿', en: 'Winston', role: 'tank', assetKey: 'winston' },
  { id: 'wrecking-ball', zh: '破坏球', en: 'Wrecking Ball', role: 'tank', assetKey: 'wrecking-ball' },
  { id: 'zarya', zh: '查莉娅', en: 'Zarya', role: 'tank', assetKey: 'zarya' },

  { id: 'anran', zh: '安然', en: 'Anran', role: 'damage', assetKey: 'anran' },
  { id: 'ashe', zh: '艾什', en: 'Ashe', role: 'damage', assetKey: 'ashe' },
  { id: 'bastion', zh: '堡垒', en: 'Bastion', role: 'damage', assetKey: 'bastion' },
  { id: 'cassidy', zh: '卡西迪', en: 'Cassidy', role: 'damage', assetKey: 'cassidy' },
  { id: 'echo', zh: '回声', en: 'Echo', role: 'damage', assetKey: 'echo' },
  { id: 'emre', zh: '埃姆雷', en: 'Emre', role: 'damage', assetKey: 'emre' },
  { id: 'freja', zh: '芙蕾雅', en: 'Freja', role: 'damage', assetKey: 'freja' },
  { id: 'genji', zh: '源氏', en: 'Genji', role: 'damage', assetKey: 'genji' },
  { id: 'hanzo', zh: '半藏', en: 'Hanzo', role: 'damage', assetKey: 'hanzo' },
  { id: 'junkrat', zh: '狂鼠', en: 'Junkrat', role: 'damage', assetKey: 'junkrat' },
  { id: 'mei', zh: '美', en: 'Mei', role: 'damage', assetKey: 'mei' },
  { id: 'pharah', zh: '法老之鹰', en: 'Pharah', role: 'damage', assetKey: 'pharah' },
  { id: 'reaper', zh: '死神', en: 'Reaper', role: 'damage', assetKey: 'reaper' },
  { id: 'sojourn', zh: '索杰恩', en: 'Sojourn', role: 'damage', assetKey: 'sojourn' },
  { id: 'soldier-76', zh: '士兵：76', en: 'Soldier: 76', role: 'damage', assetKey: 'soldier-76', aliases: ['Soldier 76', 'Soldier76'] },
  { id: 'sierra', zh: '西拉', en: 'Sierra', role: 'damage', assetKey: 'sierra' },
  { id: 'shion', zh: '死怨', en: 'Shion', role: 'damage', assetKey: 'shion', aliases: ['Shino', 'shino'] },
  { id: 'sombra', zh: '黑影', en: 'Sombra', role: 'damage', assetKey: 'sombra' },
  { id: 'symmetra', zh: '秩序之光', en: 'Symmetra', role: 'damage', assetKey: 'symmetra' },
  { id: 'torbjorn', zh: '托比昂', en: 'Torbjörn', role: 'damage', assetKey: 'torbjorn', aliases: ['Torbjorn'] },
  { id: 'tracer', zh: '猎空', en: 'Tracer', role: 'damage', assetKey: 'tracer' },
  { id: 'vendetta', zh: '斩仇', en: 'Vendetta', role: 'damage', assetKey: 'vendetta' },
  { id: 'venture', zh: '探奇', en: 'Venture', role: 'damage', assetKey: 'venture' },
  { id: 'widowmaker', zh: '黑百合', en: 'Widowmaker', role: 'damage', assetKey: 'widowmaker' },

  { id: 'ana', zh: '安娜', en: 'Ana', role: 'support', assetKey: 'ana' },
  { id: 'baptiste', zh: '巴蒂斯特', en: 'Baptiste', role: 'support', assetKey: 'baptiste' },
  { id: 'brigitte', zh: '布丽吉塔', en: 'Brigitte', role: 'support', assetKey: 'brigitte' },
  { id: 'illari', zh: '伊拉锐', en: 'Illari', role: 'support', assetKey: 'illari' },
  { id: 'jetpack-cat', zh: '飞天猫', en: 'Jetpack Cat', role: 'support', assetKey: 'jetpack-cat', aliases: ['JetpackCat'] },
  { id: 'juno', zh: '朱诺', en: 'Juno', role: 'support', assetKey: 'juno' },
  { id: 'kiriko', zh: '雾子', en: 'Kiriko', role: 'support', assetKey: 'kiriko' },
  { id: 'lifeweaver', zh: '生命之梭', en: 'Lifeweaver', role: 'support', assetKey: 'lifeweaver' },
  { id: 'lucio', zh: '卢西奥', en: 'Lúcio', role: 'support', assetKey: 'lucio', aliases: ['Lucio'] },
  { id: 'mercy', zh: '天使', en: 'Mercy', role: 'support', assetKey: 'mercy' },
  { id: 'mizuki', zh: '瑞稀', en: 'Mizuki', role: 'support', assetKey: 'mizuki' },
  { id: 'moira', zh: '莫伊拉', en: 'Moira', role: 'support', assetKey: 'moira' },
  { id: 'wuyang', zh: '无漾', en: 'Wuyang', role: 'support', assetKey: 'wuyang' },
  { id: 'zenyatta', zh: '禅雅塔', en: 'Zenyatta', role: 'support', assetKey: 'zenyatta' }
]

export const OW_MAPS = [
  { id: 'ilios', zh: '伊利奥斯', en: 'Ilios', mode: 'control', assetKey: 'ilios', imageName: 'Ilios' },
  { id: 'lijiang-tower', zh: '漓江塔', en: 'Lijiang Tower', mode: 'control', assetKey: 'lijiang-tower', imageName: 'Lijiang_Tower' },
  { id: 'nepal', zh: '尼泊尔', en: 'Nepal', mode: 'control', assetKey: 'nepal', imageName: 'Nepal' },
  { id: 'oasis', zh: '绿洲城', en: 'Oasis', mode: 'control', assetKey: 'oasis', imageName: 'Oasis' },
  { id: 'busan', zh: '釜山', en: 'Busan', mode: 'control', assetKey: 'busan', imageName: 'Busan' },
  { id: 'antarctic-peninsula', zh: '南极半岛', en: 'Antarctic Peninsula', mode: 'control', assetKey: 'antarctic-peninsula', imageName: 'Antarctic_Peninsula' },
  { id: 'samoa', zh: '萨摩亚', en: 'Samoa', mode: 'control', assetKey: 'samoa', imageName: 'Samoa' },

  { id: 'dorado', zh: '多拉多', en: 'Dorado', mode: 'escort', assetKey: 'dorado', imageName: 'Dorado' },
  { id: 'route-66', zh: '66 号公路', en: 'Route 66', mode: 'escort', assetKey: 'route-66', imageName: 'Route_66' },
  { id: 'watchpoint-gibraltar', zh: '监测站：直布罗陀', en: 'Watchpoint: Gibraltar', mode: 'escort', assetKey: 'watchpoint-gibraltar', imageName: 'Watchpoint_Gibraltar', aliases: ['Watchpoint Gibraltar'] },
  { id: 'havana', zh: '哈瓦那', en: 'Havana', mode: 'escort', assetKey: 'havana', imageName: 'Havana' },
  { id: 'junkertown', zh: '渣客镇', en: 'Junkertown', mode: 'escort', assetKey: 'junkertown', imageName: 'Junkertown' },
  { id: 'rialto', zh: '里阿尔托', en: 'Rialto', mode: 'escort', assetKey: 'rialto', imageName: 'Rialto' },
  { id: 'shambali-monastery', zh: '香巴里寺院', en: 'Shambali Monastery', mode: 'escort', assetKey: 'shambali', imageName: 'Shambali', aliases: ['Shambali'] },
  { id: 'circuit-royal', zh: '皇家赛道', en: 'Circuit Royal', mode: 'escort', assetKey: 'circuit-royal', imageName: 'Circuit_Royal' },

  { id: 'blizzard-world', zh: '暴雪世界', en: 'Blizzard World', mode: 'hybrid', assetKey: 'blizzard-world', imageName: 'Blizzard_World', aliases: ['BlizzardWorld'] },
  { id: 'eichenwalde', zh: '艾兴瓦尔德', en: 'Eichenwalde', mode: 'hybrid', assetKey: 'eichenwalde', imageName: 'Eichenwalde' },
  { id: 'hollywood', zh: '好莱坞', en: 'Hollywood', mode: 'hybrid', assetKey: 'hollywood', imageName: 'Hollywood' },
  { id: 'kings-row', zh: '国王大道', en: "King's Row", mode: 'hybrid', assetKey: 'kings-row', imageName: 'Kings_Row', aliases: ['King’s Row', 'Kings Row'] },
  { id: 'numbani', zh: '努巴尼', en: 'Numbani', mode: 'hybrid', assetKey: 'numbani', imageName: 'Numbani' },
  { id: 'midtown', zh: '中城', en: 'Midtown', mode: 'hybrid', assetKey: 'midtown', imageName: 'Midtown' },
  { id: 'neon-junction', zh: '霓虹枢纽', en: 'Neon Junction', mode: 'hybrid', assetKey: 'neon-junction', imageName: 'Neon_Junction' },
  { id: 'paraiso', zh: '帕拉伊苏', en: 'Paraíso', mode: 'hybrid', assetKey: 'paraiso', imageName: 'Paraíso', aliases: ['Paraiso'] },

  { id: 'colosseo', zh: '斗兽场', en: 'Colosseo', mode: 'push', assetKey: 'colosseo', imageName: 'Colosseo' },
  { id: 'new-queen-street', zh: '新皇后街', en: 'New Queen Street', mode: 'push', assetKey: 'new-queen-street', imageName: 'New_Queen_Street' },
  { id: 'esperanca', zh: '埃斯佩兰萨', en: 'Esperança', mode: 'push', assetKey: 'esperanca', imageName: 'Esperanca', aliases: ['Esperanca'] },
  { id: 'runasapi', zh: '鲁纳萨彼', en: 'Runasapi', mode: 'push', assetKey: 'runasapi', imageName: 'Runasapi' },

  { id: 'suravasa', zh: '苏拉瓦萨', en: 'Suravasa', mode: 'flashpoint', assetKey: 'suravasa', imageName: 'Suravasa' },
  { id: 'new-junk-city', zh: '新渣客城', en: 'New Junk City', mode: 'flashpoint', assetKey: 'new-junk-city', imageName: 'New_Junk_City' },
  { id: 'aatlis', zh: '阿特利斯', en: 'Atlis', mode: 'flashpoint', assetKey: 'atlis', imageName: 'Aatlis', aliases: ['Aatlis'] },

  { id: 'hanaoka', zh: '花冈', en: 'Hanaoka', mode: 'clash', assetKey: 'hanaoka', imageName: 'Hanaoka' },
  { id: 'throne-of-anubis', zh: '阿努比斯王座', en: 'Throne of Anubis', mode: 'clash', assetKey: 'throne-of-anubis', imageName: 'Throne_of_Anubis' }
]

export const OW_MAP_MODE_LABELS = {
  control: { zh: '控制图', en: 'Control', folder: 'Control' },
  escort: { zh: '运载目标', en: 'Escort', folder: 'Escort' },
  hybrid: { zh: '混合图', en: 'Hybrid', folder: 'Hybrid' },
  push: { zh: '机动推进', en: 'Push', folder: 'Push' },
  flashpoint: { zh: '闪点作战', en: 'Flashpoint', folder: 'Flashpoint' },
  clash: { zh: '冲突模式', en: 'Clash', folder: 'Clash' }
}

const OW_HERO_KO_BY_ID = {
  domina: '도미나', dmon: 'D.Mon', doomfist: '둠피스트', dva: 'D.Va', hazard: '해저드',
  'junker-queen': '정커퀸', mauga: '마우가', orisa: '오리사', ramattra: '라마트라',
  reinhardt: '라인하르트', roadhog: '로드호그', sigma: '시그마', winston: '윈스턴',
  'wrecking-ball': '레킹볼', zarya: '자리야', anran: '안란', ashe: '애쉬', bastion: '바스티온',
  cassidy: '캐서디', echo: '에코', emre: '엠레', freja: '프레야', genji: '겐지', hanzo: '한조',
  junkrat: '정크랫', mei: '메이', pharah: '파라', reaper: '리퍼', sojourn: '소전',
  'soldier-76': '솔저: 76', sierra: '시에라', shion: '시온', sombra: '솜브라',
  symmetra: '시메트라', torbjorn: '토르비욘', tracer: '트레이서', vendetta: '벤데타',
  venture: '벤처', widowmaker: '위도우메이커', ana: '아나', baptiste: '바티스트',
  brigitte: '브리기테', illari: '일리아리', 'jetpack-cat': '제트팩 캣', juno: '주노',
  kiriko: '키리코', lifeweaver: '라이프위버', lucio: '루시우', mercy: '메르시',
  mizuki: '미즈키', moira: '모이라', wuyang: '우양', zenyatta: '젠야타'
}

const OW_MAP_KO_BY_ID = {
  ilios: '일리오스', 'lijiang-tower': '리장 타워', nepal: '네팔', oasis: '오아시스',
  busan: '부산', 'antarctic-peninsula': '남극 반도', samoa: '사모아', dorado: '도라도',
  'route-66': '66번 국도', 'watchpoint-gibraltar': '감시 기지: 지브롤터', havana: '하바나',
  junkertown: '쓰레기촌', rialto: '리알토', 'shambali-monastery': '샴발리 수도원',
  'circuit-royal': '서킷 로얄', 'blizzard-world': '블리자드 월드', eichenwalde: '아이헨발데',
  hollywood: '할리우드', 'kings-row': '왕의 길', numbani: '눔바니', midtown: '미드타운',
  'neon-junction': '네온 정션', paraiso: '파라이수', colosseo: '콜로세오',
  'new-queen-street': '뉴 퀸 스트리트', esperanca: '이스페란사', runasapi: '루나사피',
  suravasa: '수라바사', 'new-junk-city': '뉴 정크 시티', aatlis: '아틀리스',
  hanaoka: '하나오카', 'throne-of-anubis': '아누비스의 왕좌'
}

const OW_MAP_MODE_KO_BY_ID = {
  control: '쟁탈', escort: '호위', hybrid: '혼합', push: '밀기',
  flashpoint: '플래시포인트', clash: '격돌'
}

function cleanText(value) {
  return String(value ?? '').trim()
}

export function isEnglishLocale(locale) {
  return String(locale || '').toLowerCase().startsWith('en')
}

export function isKoreanLocale(locale) {
  return String(locale || '').toLowerCase().startsWith('ko')
}

export function normalizeOwLookupKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/[’'`]/g, '')
    .replace(/[：:]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff\uac00-\ud7a3]+/g, '')
    .toLowerCase()
}

function fallbackImageName(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[：:]+/g, '_')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function collectAliases(item, localizedName = '') {
  const aliases = new Set([
    item.id,
    item.assetKey,
    item.en,
    item.zh,
    OW_HERO_TW_BY_ID[item.id] || OW_MAP_TW_BY_ID[item.id],
    localizedName,
    item.imageName,
    item.id?.replace(/-/g, '_'),
    item.id?.replace(/-/g, ' '),
    item.id?.replace(/-/g, ''),
    item.assetKey?.replace(/-/g, '_'),
    item.assetKey?.replace(/-/g, ' '),
    item.assetKey?.replace(/-/g, ''),
    item.en?.replace(/[:：]/g, ''),
    item.en?.replace(/[’']/g, ''),
    item.en?.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, ''),
    ...(item.aliases || [])
  ])

  return [...aliases].filter(Boolean)
}

function buildLookup(items, localizedNames = {}) {
  const lookup = new Map()
  items.forEach(item => {
    collectAliases(item, localizedNames[item.id]).forEach(alias => {
      const key = normalizeOwLookupKey(alias)
      if (key && !lookup.has(key)) lookup.set(key, item)
    })
  })
  return lookup
}

const HERO_LOOKUP = buildLookup(OW_HEROES, OW_HERO_KO_BY_ID)
const MAP_LOOKUP = buildLookup(OW_MAPS, OW_MAP_KO_BY_ID)

export const HERO_NAME_ZH = OW_HEROES.reduce((acc, hero) => {
  collectAliases(hero).forEach(alias => {
    acc[alias] = hero.zh
  })
  return acc
}, {})

export const MAP_NAME_ZH = OW_MAPS.reduce((acc, map) => {
  collectAliases(map).forEach(alias => {
    acc[alias] = map.zh
  })
  return acc
}, {})

export function getOwHero(value) {
  const key = normalizeOwLookupKey(value)
  return key ? HERO_LOOKUP.get(key) || null : null
}

export function getOwMap(value) {
  const key = normalizeOwLookupKey(value)
  return key ? MAP_LOOKUP.get(key) || null : null
}

export function getOwHeroCanonicalKey(value) {
  const raw = cleanText(value)
  if (!raw) return ''
  const hero = getOwHero(raw)
  return hero?.assetKey || hero?.id || normalizeOwLookupKey(raw)
}

export function getOwHeroCanonicalName(value) {
  const raw = cleanText(value)
  if (!raw) return raw
  const hero = getOwHero(raw)
  return hero?.en || raw
}

export function formatOwHeroName(value, locale = 'zh-CN') {
  const raw = cleanText(value)
  if (!raw) return raw
  const hero = getOwHero(raw)
  if (!hero) return raw
  if (normalizeLocale(locale) === 'zh-TW') return OW_HERO_TW_BY_ID[hero.id] || hero.en
  if (isKoreanLocale(locale)) return OW_HERO_KO_BY_ID[hero.id] || hero.en
  return isEnglishLocale(locale) ? hero.en : hero.zh
}

export function formatOwHeroNames(values, locale = 'zh-CN', limit = Infinity) {
  const seen = new Set()

  return (Array.isArray(values) ? values : [values])
    .filter(Boolean)
    .filter(value => {
      const key = getOwHeroCanonicalKey(value)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map(value => formatOwHeroName(value, locale))
}

export function getOwHeroAssetKey(value) {
  const hero = getOwHero(value)
  if (hero?.assetKey) return hero.assetKey.replace(/-/g, '_')
  return ''
}

export function getOwHeroRole(value) {
  return getOwHero(value)?.role || ''
}

export function formatOwMapName(value, locale = 'zh-CN') {
  const raw = cleanText(value)
  if (!raw) return raw
  const map = getOwMap(raw)
  if (!map) return raw
  if (normalizeLocale(locale) === 'zh-TW') return OW_MAP_TW_BY_ID[map.id] || map.en
  if (isKoreanLocale(locale)) return OW_MAP_KO_BY_ID[map.id] || map.en
  return isEnglishLocale(locale) ? map.en : map.zh
}

export function getOwMapImageName(value) {
  const raw = cleanText(value)
  const map = getOwMap(raw)
  return map?.imageName || fallbackImageName(raw) || 'unknown'
}

export function getOwMapMode(value) {
  const raw = cleanText(value)
  const key = normalizeOwLookupKey(raw)
  if (!key) return ''
  return Object.keys(OW_MAP_MODE_LABELS).find(mode => [
    mode,
    OW_MAP_MODE_LABELS[mode].en,
    OW_MAP_MODE_LABELS[mode].zh,
    OW_MAP_MODE_TW_BY_ID[mode],
    OW_MAP_MODE_KO_BY_ID[mode]
  ].some(label => normalizeOwLookupKey(label) === key)) || ''
}

export function formatOwMapMode(value, locale = 'zh-CN') {
  const mode = getOwMapMode(value)
  if (!mode) return cleanText(value)
  const label = OW_MAP_MODE_LABELS[mode]
  if (normalizeLocale(locale) === 'zh-TW') return OW_MAP_MODE_TW_BY_ID[mode] || label.en
  if (isKoreanLocale(locale)) return OW_MAP_MODE_KO_BY_ID[mode] || label.en
  return isEnglishLocale(locale) ? label.en : label.zh
}

export function getOwMapModeFolder(value) {
  const mode = getOwMapMode(value)
  return mode ? OW_MAP_MODE_LABELS[mode].folder : cleanText(value)
}

export function getOwNameSearchText(value, type = 'hero') {
  const item = type === 'map' ? getOwMap(value) : getOwHero(value)
  const raw = cleanText(value)
  if (!item) return normalizeOwLookupKey(raw)
  return [raw, ...collectAliases(item, OW_HERO_KO_BY_ID[item.id] || OW_MAP_KO_BY_ID[item.id])]
    .map(normalizeOwLookupKey)
    .filter(Boolean)
    .join(' ')
}

function escapeRegExp(value) {
  return cleanText(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TEXT_NAME_ITEMS = [...OW_HEROES, ...OW_MAPS]

export function formatOwNamesInText(value, locale = 'zh-CN') {
  let text = cleanText(value)
  if (!text) return text
  const english = isEnglishLocale(locale)
  const korean = isKoreanLocale(locale)

  TEXT_NAME_ITEMS
    .flatMap(item => collectAliases(item).map(alias => ({
      source: alias,
      target: normalizeLocale(locale) === 'zh-TW'
        ? (OW_HERO_TW_BY_ID[item.id] || OW_MAP_TW_BY_ID[item.id] || item.en)
        : korean
        ? (OW_HERO_KO_BY_ID[item.id] || OW_MAP_KO_BY_ID[item.id] || item.en)
        : english ? item.en : item.zh
    })))
    .filter(item => item.source && item.source !== item.target)
    .sort((a, b) => b.source.length - a.source.length)
    .forEach(item => {
      const source = escapeRegExp(item.source)
      const asciiToken = /^[A-Za-z0-9]+$/.test(item.source)
      const pattern = asciiToken
        ? new RegExp(`(^|[^A-Za-z0-9])${source}(?=$|[^A-Za-z0-9])`, 'g')
        : new RegExp(source, 'g')
      text = text.replace(pattern, asciiToken ? `$1${item.target}` : item.target)
    })

  return text
}
