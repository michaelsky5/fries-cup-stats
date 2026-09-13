import { getFinishedMatches, getMatchDisplayTeams, isByeMatch, isFinishedMatch } from '../../lib/matchesSelectors.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { getScheduleMapRecords, getScheduleRoundLabel } from './schedulePresentation.js'
import { translateUiText } from '../../lib/uiText.js'

const text = value => String(value ?? '').normalize('NFKC').trim()
const key = value => text(value).toUpperCase()
const id = match => text(match?.match_id || match?.id)
const score = value => text(value) !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null
const administrative = record => Boolean(record?.is_forfeit || record?.is_administrative) || ['FORFEIT', 'WALKOVER', 'ADMINISTRATIVE'].includes(key(record?.result_mode || record?.status))
const unique = rows => [...new Map(rows.filter(row => id(row)).map(row => [id(row), row])).values()]
const winTarget = match => {
  const format = key(getMatchFormatLabel(match))
  const ft = format.match(/^FT\s*(\d+)$/)?.[1]
  const bo = format.match(/^BO\s*(\d+)$/)?.[1]
  return ft ? Number(ft) : bo && Number(bo) % 2 === 1 ? Math.ceil(Number(bo) / 2) : null
}

// A story needs a complete, consistent sequence. Missing, awarded or conflicting
// maps remain ordinary result records instead of becoming a comeback narrative.
function getVerifiedProgress(match) {
  if (!isFinishedMatch(match) || administrative(match)) return []
  const a = score(match.team_a?.score)
  const b = score(match.team_b?.score)
  if (a === null || b === null || a === b) return []
  const target = winTarget(match)
  if (target && (Math.max(a, b) !== target || Math.min(a, b) >= target)) return []
  const maps = getScheduleMapRecords(match).map(map => match.maps[map.order - 1])
  const teamKeys = [match.team_a, match.team_b].map(team => new Set([team?.team_id, team?.id, team?.team_short_name, team?.short, team?.team_name, team?.name].map(key).filter(Boolean)))
  let winsA = 0
  let winsB = 0
  const progress = []
  for (const [index, map] of maps.entries()) {
    const mapA = score(map.score_a)
    const mapB = score(map.score_b)
    if (administrative(map) || mapA === null || mapB === null) return []
    const side = mapA === mapB ? 'DRAW' : mapA > mapB ? 'A' : 'B'
    const published = key(map.winner)
    const publishedSide = !published ? '' : ['DRAW', 'TIE'].includes(published) ? 'DRAW' : teamKeys[0].has(published) ? 'A' : teamKeys[1].has(published) ? 'B' : '?'
    if (publishedSide && publishedSide !== side) return []
    if (side === 'A') winsA++
    if (side === 'B') winsB++
    if (target && index < maps.length - 1 && Math.max(winsA, winsB) >= target) return []
    progress.push({ a: winsA, b: winsB, side })
  }
  return winsA === a && winsB === b ? progress : []
}

function buildScheduleHighlightFact(match, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const teams = getMatchDisplayTeams(match)
  const a = score(match?.team_a?.score)
  const b = score(match?.team_b?.score)
  const hasScore = isFinishedMatch(match) && a !== null && b !== null
  const winnerSide = hasScore && a !== b ? a > b ? 'A' : 'B' : ''
  const winner = winnerSide ? teams[`team${winnerSide}`].short : ''
  const winnerScore = winnerSide === 'A' ? a : b
  const loserScore = winnerSide === 'A' ? b : a
  const round = getScheduleRoundLabel(match, locale)
  const fallback = { kind: 'result', label: round, detail: winner
    ? en ? `${winner} won the series ${winnerScore}:${loserScore}.` : `${winner} 以 ${winnerScore}:${loserScore} 拿下系列赛。`
    : en ? 'Revisit the published match record.' : '查看本场已发布记录。', weight: 0, winnerSide, progress: [] }
  if (administrative(match)) return { ...fallback, kind: 'awarded', label: en ? 'Awarded result' : '判罚赛果', detail: en ? 'Retained as a published awarded or forfeit result.' : '保留已发布的判罚或弃权赛果。', weight: -1 }
  const progress = getVerifiedProgress(match)
  if (!progress.length) return fallback
  const deficit = progress.slice(0, -1).map(point => ({ own: winnerSide === 'A' ? point.a : point.b, other: winnerSide === 'A' ? point.b : point.a }))
    .filter(point => point.other > point.own).sort((x, y) => (y.other - y.own) - (x.other - x.own))[0]
  if (deficit) {
    const from = `${deficit.own}:${deficit.other}`
    const to = `${winnerScore}:${loserScore}`
    return { kind: 'comeback', label: en ? `From ${from} to ${to}` : `从 ${from} 到 ${to}`, detail: en ? `${winner} came back from ${from} to win the series ${to}.` : `${winner} 从 ${from} 落后追至 ${to}，拿下系列赛。`, weight: 40 + (deficit.other - deficit.own) * 20, winnerSide, progress }
  }
  const target = winTarget(match)
  if (target > 1 && winnerScore === target && loserScore === target - 1 && progress.length === 2 * target - 1 && progress.every(point => point.side !== 'DRAW')) {
    return { kind: 'decider', label: en ? `All ${progress.length} maps` : `打满 ${progress.length} 图`, detail: en ? `Tied ${loserScore}:${loserScore}, ${winner} took the deciding map.` : `双方战至 ${loserScore}:${loserScore}，${winner} 拿下决胜图。`, weight: 30, winnerSide, progress }
  }
  return { ...fallback, weight: 10, progress }
}

export function getScheduleHighlightFact(match, locale = 'zh-CN') {
  const fact = buildScheduleHighlightFact(match, locale)
  return { ...fact, label: translateUiText(fact.label, locale), detail: translateUiText(fact.detail, locale) }
}

export function getScheduleHighlights(matches = [], preferred = [], source = {}, locale = 'zh-CN') {
  const finished = unique(getFinishedMatches(matches).filter(match => !isByeMatch(match)))
  const byId = new Map(finished.map(match => [id(match), match]))
  const manualIds = source.featuredMatchIds || source.featured_matches || source.matches?.featured || source.meta?.featured_matches || []
  const manual = unique((Array.isArray(manualIds) ? manualIds : []).filter(value => text(value)).map(value => finished.find(match => [match.match_id, match.id, match.match_display_name, match.raw_match_id].some(candidate => key(candidate) === key(value)))).filter(Boolean)).slice(0, 8)
  const preferredRows = unique(preferred.map(match => byId.get(id(match))).filter(Boolean))
  const primary = manual[0] || preferredRows[0] || finished.find(match => /^GRAND FINALS?$/.test(key(match.round))) || finished[0]
  if (!primary) return { primary: null, focus: [], records: [] }
  const facts = new Map(finished.map(match => [id(match), getScheduleHighlightFact(match, locale)]))
  const eligible = finished.filter(match => id(match) !== id(primary) && !administrative(match))
  const ranked = eligible.slice().sort((a, b) => facts.get(id(b)).weight - facts.get(id(a)).weight)
  const otherStages = [...new Set(eligible.map(match => key(match.stage)))].filter(stage => stage !== key(primary.stage))
    .sort((a, b) => (['GROUP', 'SWISS', 'LCQ', 'PLAYOFFS'].indexOf(a) + 1 || 99) - (['GROUP', 'SWISS', 'LCQ', 'PLAYOFFS'].indexOf(b) + 1 || 99))
  const focus = []
  const reserved = new Set(manual.map(id))
  let available = 8 - unique([primary, ...manual]).length
  for (const stage of otherStages) {
    const candidate = ranked.find(match => key(match.stage) === stage && (available > 0 || reserved.has(id(match))))
    if (!candidate || focus.length === 2) continue
    focus.push(candidate)
    if (!reserved.has(id(candidate))) available--
  }
  const selected = unique([primary, ...manual, ...focus, ...preferredRows.filter(match => !administrative(match)), ...ranked]).slice(0, 8)
  for (const candidate of selected) {
    if (focus.length === 2) break
    if (id(candidate) !== id(primary) && !focus.some(match => id(match) === id(candidate))) focus.push(candidate)
  }
  const decorate = match => ({ match, fact: facts.get(id(match)) })
  return { primary: decorate(primary), focus: focus.map(decorate), records: selected.filter(match => id(match) !== id(primary) && !focus.some(item => id(item) === id(match))).map(decorate) }
}
