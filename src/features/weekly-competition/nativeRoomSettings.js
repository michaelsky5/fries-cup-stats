import { getOwHero, getOwMap } from '../../lib/heroes.js'
import catalog from './nativeRoomCatalog.json' with { type: 'json' }

// Native Simplified Chinese tokens, not translated interface labels.
// The fixed parameters and compatibility fixes were imported and tested in game
// on 2026-11-02. Never derive the bans from series history or player lineups.
const modes = [
  ['control', '占领要点'],
  ['hybrid', '攻击护送'],
  ['clash', '攻防阵线'],
  ['push', '机动推进'],
  ['escort', '运载目标'],
  ['flashpoint', '闪点作战']
]
const skipped = new Set(['TIMED_OUT', 'PASSED'])
const fail = (reason, names = []) => ({ ready: false, reason, names, text: '', key: '' })

export function serializeNativeRoomSettings({ mapName, mapType, bannedHeroes = [] }) {
  const map = getOwMap(mapName)
  const nativeMap = map && catalog.maps[map.id]
  if (!nativeMap?.name) throw new Error('地图原生字段待核对：' + mapName)
  const manualMap = nativeMap.importBlocked && nativeMap.manualMapSelection === true
  if (nativeMap.importBlocked && !manualMap) throw new Error('地图配置尚未通过游戏导入：' + mapName)
  if (map.mode !== String(mapType || '').toLowerCase()) throw new Error('地图与模式不一致')
  if (!Array.isArray(bannedHeroes) || bannedHeroes.length > 2) throw new Error('本图禁用数量无效')
  const heroes = bannedHeroes.map(value => {
    const hero = getOwHero(value)
    const native = hero && catalog.heroes[hero.id]
    if (!native?.name) throw new Error('英雄原生字段待核对：' + value)
    return { ...hero, nativeName: native.name, inGameVerified: native.inGameVerified }
  })
  if (new Set(heroes.map(hero => hero.id)).size !== heroes.length) throw new Error('本图禁用重复')
  const mapEntry = [nativeMap.name, ...nativeMap.variants].join(' ')
  const modeBlocks = modes.map(([id, label]) => {
    const lines = ['\t\t' + label, '\t\t{', '\t\t\t竞技比赛规则: 开启']
    if (id === 'control') lines.push('\t\t\t获胜得分: 2')
    // The organizer accepted manual map selection for the two native import
    // failures. Omit the target mode's map filter, never its competition rules.
    // Other modes retain empty lists; Samoa retains its verified exclusions.
    if (!manualMap || id !== map.mode) {
      const excludedMaps = id === map.mode ? nativeMap.excludedMaps : null
      lines.push('', '\t\t\t' + (excludedMaps ? '禁用地图' : '启用地图'), '\t\t\t{')
      if (excludedMaps) lines.push(...excludedMaps.map(name => '\t\t\t\t' + name))
      else if (id === map.mode) lines.push('\t\t\t\t' + mapEntry)
      lines.push('\t\t\t}')
    }
    lines.push('\t\t}')
    if (id === 'hybrid') lines.push('', '\t\t禁用 攻防阵线 6v6', '\t\t{', '\t\t\t占领速度: 45%', '\t\t}')
    return lines.join('\n')
  })
  const lines = [
    '设置', '{', '\t主程序', '\t{',
    '\t\t描述: "周赛"', '\t\t模式名称: "薯条杯周赛代码v2"', '\t}', '',
    '\t大厅', '\t{', '\t\t数据中心设置: 中国杭州',
    '\t\t玩家断线时暂停游戏: 是', '\t\t观战者人数上限: 12', '\t}', '',
    '\t模式', '\t{', modeBlocks.join('\n\n'), '',
    '\t\t综合', '\t\t{', '\t\t\t游戏模式开始: 手动',
    '\t\t\t职责限制: 1重装，2输出，2支援', '\t\t\t阵亡镜头: 关闭', '\t\t}', '\t}'
  ]
  if (heroes.length) lines.push('', '\t英雄', '\t{', '\t\t综合', '\t\t{',
    '\t\t\t禁用英雄', '\t\t\t{', ...heroes.map(hero => '\t\t\t\t' + hero.nativeName),
    '\t\t\t}', '\t\t}', '\t}')
  lines.push('}')
  return {
    text: lines.join('\n'),
    map,
    heroes,
    mapSelection: manualMap ? 'MANUAL' : 'AUTOMATIC',
    inGameVerified: (manualMap ? nativeMap.manualConfigurationInGameVerified === true : nativeMap.inGameVerified) && heroes.length > 0 && heroes.every(hero => hero.inGameVerified)
  }
}

export function getNativeRoomSettings(data, { stale = false } = {}) {
  if (stale) return fail('STALE')
  const map = data?.map, opening = data?.opening
  if (!data?.match?.id || !opening?.complete || data.result || data.series?.complete ||
      !['PREPARING', 'LIVE', 'PAUSED'].includes(data.phase) ||
      !Number.isInteger(map?.order) || map.order < 1 || opening.mapOrder !== map.order ||
      map.status === 'COMPLETE') return fail('PENDING')
  const bannedHeroes = []
  const bansEnabled = map.heroBansEnabled !== false && opening.rules?.heroBansEnabled !== false
  if (bansEnabled) for (const side of ['A', 'B']) {
    const hero = map['ban' + side]
    const status = map['ban' + side + 'Status']
    if (skipped.has(status)) {
      if (hero) return fail('INCONSISTENT')
    } else if (typeof hero === 'string' && hero.trim()) {
      if (status) return fail('INCONSISTENT')
      bannedHeroes.push(hero)
    } else return fail('PENDING')
  }
  const nativeMap = getOwMap(map.name)
  const missing = [
    ...(!nativeMap || !catalog.maps[nativeMap.id]?.name ? [map.name || '地图'] : []),
    ...bannedHeroes.filter(hero => !catalog.heroes[getOwHero(hero)?.id]?.name)
  ]
  if (missing.length) return fail('UNSUPPORTED', missing)
  const native = catalog.maps[nativeMap.id]
  if (native.importBlocked && !native.manualMapSelection) return fail(native.nativeRoundtripResult === 'FAILED_USER_REPORTED'
    ? 'CLIENT_MAP_IMPORT_DEFECT' : 'MAP_IMPORT_PENDING', [map.name])
  try {
    const result = serializeNativeRoomSettings({ mapName: map.name, mapType: map.type, bannedHeroes })
    return {
      ...result, ready: true, reason: '', names: [], order: map.order,
      key: [data.match.id, map.order, result.map.id, result.mapSelection, result.text].join(':')
    }
  } catch {
    return fail('INCONSISTENT')
  }
}
