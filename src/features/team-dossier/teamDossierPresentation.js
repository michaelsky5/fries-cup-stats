import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { isByeMatch, isFinishedMatch, isLiveMatch, getMatchTimeLabel } from '../../lib/matchesSelectors.js'
import { formatOwMapName, formatOwMapMode, getOwMap, getOwMapImageName, getOwMapModeFolder } from '../../lib/heroes.js'

const STAGES = {
  GROUP: ['小组赛', 'Group stage'], SWISS: ['瑞士轮', 'Swiss stage'],
  LCQ: ['突围赛', 'Breakthrough'], PLAYOFFS: ['季后赛', 'Playoffs'], WEEKLY: ['周赛', 'Weekly']
}
const ROUNDS = {
  'grand final': '总决赛', 'grand finals': '总决赛', 'wb final': '胜者组决赛', 'ub final': '胜者组决赛',
  'lb final': '败者组决赛', 'wb semifinal': '胜者组半决赛', 'wb semifinals': '胜者组半决赛',
  'lb semifinal': '败者组半决赛', 'lb semifinals': '败者组半决赛', 'round of 16': '十六强赛',
  'quarterfinal': '四分之一决赛', 'semifinal': '半决赛', final: '决赛'
}
const finiteScore = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value))
const words = (en, zh, english) => en ? english : zh

export function getDossierStageLabel(stage, locale = 'zh-CN') {
  const key = String(stage || '').toUpperCase()
  return formatUiText(STAGES[key]?.[locale === 'en-US' ? 1 : 0] || stage || (locale === 'en-US' ? 'Unassigned stage' : '阶段待定'), locale)
}

export function getDossierRoundLabel(match, locale = 'zh-CN') {
  const raw = String(match?.round || '').trim()
  if (locale === 'en-US') return formatUiText(raw || getDossierStageLabel(match?.stage, locale), locale)
  const normalized = raw.toLowerCase()
  const bracket = raw.match(/^(UB|WB|LB)\s+(R\s*(\d+)|SF|QF|F)$/i)
  if (bracket) return formatUiText(`${bracket[1].toUpperCase() === 'LB' ? '败者组' : '胜者组'}${bracket[3] ? `第 ${bracket[3]} 轮` : ({ SF: '半决赛', QF: '四分之一决赛', F: '决赛' })[bracket[2].toUpperCase()]}`, locale)
  return formatUiText(ROUNDS[normalized] || raw.replace(/^round\s+(\d+)$/i, '第 $1 轮').replace(/^day\s+(\d+)$/i, '第 $1 比赛日') || getDossierStageLabel(match?.stage, locale), locale)
}

export function getDossierMatch(row, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const match = row.match
  const status = String(match?.status || '').toUpperCase()
  const mine = match?.[row.side]?.score
  const other = match?.[row.side === 'team_a' ? 'team_b' : 'team_a']?.score
  const scored = finiteScore(mine) && finiteScore(other)
  const bye = isByeMatch(match)
  const cancelled = ['CANCELLED', 'CANCELED'].includes(status)
  const complete = isFinishedMatch(match) && !cancelled && !bye
  const decided = complete && scored
  const live = !bye && !cancelled && isLiveMatch(match)
  const tone = bye ? 'bye' : cancelled ? 'cancelled' : live ? 'live' : decided ? Number(mine) > Number(other) ? 'win' : Number(mine) < Number(other) ? 'loss' : 'draw' : complete ? 'unknown' : 'pending'
  const labels = { win: ['胜', 'W'], loss: ['负', 'L'], draw: ['平', 'D'], bye: ['轮空', 'BYE'], cancelled: ['取消', 'OFF'], live: ['进行中', 'LIVE'], pending: ['待赛', 'NEXT'], unknown: ['待补结果', 'N/A'] }
  const administrative = Boolean(match?.is_forfeit || match?.is_administrative || ['FORFEIT', 'RULING', 'ADMINISTRATIVE'].includes(String(match?.result_mode || '').toUpperCase()))
  const time = getMatchTimeLabel(match)
  return {
    ...row, tone, complete, decided, bye, cancelled, live, administrative,
    label: labels[tone][en ? 1 : 0],
    scoreLabel: !bye && !cancelled && scored && (complete || live) ? `${mine} : ${other}` : '—',
    timeLabel: time === '时间待定' ? words(en, '时间待定', 'Time TBA') : time,
    roundLabel: getDossierRoundLabel(match, locale),
    note: bye ? words(en, '轮空晋级', 'Advance by bye') : cancelled ? words(en, '比赛取消', 'Cancelled') : administrative ? words(en, '判罚 / 弃权结果', 'Administrative result') : ['POSTPONED', 'DELAYED'].includes(status) ? words(en, '延期', 'Postponed') : complete && !scored ? words(en, '比分未发布', 'Score unpublished') : ''
  }
}

export function buildDossierSummary(rows) {
  const played = rows.filter(row => row.complete)
  const wins = played.filter(row => row.tone === 'win').length
  const losses = played.filter(row => row.tone === 'loss').length
  const draws = played.filter(row => row.tone === 'draw').length
  const decided = wins + losses + draws
  let longestStreak = 0
  let streak = 0
  for (const row of played) {
    streak = row.tone === 'win' ? streak + 1 : 0
    longestStreak = Math.max(longestStreak, streak)
  }
  return {
    wins, losses, draws, completed: played.length, decided, longestStreak,
    winRate: decided ? wins / decided : null,
    pending: rows.filter(row => !row.complete && !row.bye && !row.cancelled).length,
    byes: rows.filter(row => row.bye).length,
    administrative: rows.filter(row => row.complete && row.administrative).length
  }
}

export function getDossierJourneyStages(rows, locale = 'zh-CN') {
  const stages = new Map()
  rows.forEach(row => {
    const key = row.match.stage || 'UNKNOWN'
    if (!stages.has(key)) stages.set(key, { key, label: getDossierStageLabel(key, locale), rows: [] })
    stages.get(key).rows.push(row)
  })
  return [...stages.values()].map(stage => ({ ...stage, summary: buildDossierSummary(stage.rows) }))
}

export function getDossierMapPool(rows, locale = 'zh-CN') {
  const maps = new Map()
  for (const row of rows) {
    if (!row.complete || row.administrative) continue
    for (const [mapIndex, map] of (row.match.maps || []).entries()) {
      const rawName = String(map.map_name || map.name || '').trim()
      const name = getOwMap(rawName)?.en || rawName
      const type = String(map.map_type || map.type || '').trim()
      if (!name || !type || type.toUpperCase() === 'UNKNOWN' || map.is_administrative || map.forfeited_by || !finiteScore(map.score_a) || !finiteScore(map.score_b)) continue
      if (!maps.has(name)) maps.set(name, {
        name, type, displayName: formatOwMapName(name, locale), mode: formatOwMapMode(type, locale),
        imageUrl: `/maps/${getOwMapModeFolder(type)}/${getOwMapImageName(name)}.jpg`,
        maps: 0, wins: 0, losses: 0, draws: 0, records: []
      })
      const record = maps.get(name)
      const mine = Number(row.side === 'team_a' ? map.score_a : map.score_b)
      const other = Number(row.side === 'team_a' ? map.score_b : map.score_a)
      record.maps += 1
      record[mine > other ? 'wins' : mine < other ? 'losses' : 'draws'] += 1
      record.records.push({ ...row, mapScore: `${mine} : ${other}`, mapOrder: map.map_order ?? mapIndex + 1, mapIndex, mapOutcome: mine > other ? 'win' : mine < other ? 'loss' : 'draw' })
    }
  }
  return [...maps.values()].map(map => ({ ...map, winRate: map.wins / map.maps }))
    .sort((a, b) => b.maps - a.maps || b.wins - a.wins || a.name.localeCompare(b.name))
}

export function formatDossierRecord(summary, locale = 'zh-CN') {
  return locale === 'en-US'
    ? `${summary.wins}W / ${summary.losses}L${summary.draws ? ` / ${summary.draws}D` : ''}`
    : `${summary.wins} 胜 / ${summary.losses} 负${summary.draws ? ` / ${summary.draws} 平` : ''}`
}
