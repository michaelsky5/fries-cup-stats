import { translateUiText as uiText } from './uiText.js'
import { getPublicMatchCode } from './publicMatchCode.js'

// These are display labels. Rules and immutable codes keep their existing keys.
export const WEEKLY_PHASE_LABELS = Object.freeze({
  REGULAR: ['积分赛', 'Prelims'],
  QUALIFIER: ['晋级加赛', 'Tiebreak qualifier'],
  PLAYOFFS: ['季后赛', 'Playoffs'],
  MAJOR: ['巅峰赛', 'Finals']
})
const PHASE_CODES = { REG: 'REGULAR', QUAL: 'QUALIFIER', PO: 'PLAYOFFS' }
const text = value => String(value ?? '').trim()
const list = value => Array.isArray(value) ? value : []

export const getMatchDisplayCode = match => text(match?.match_code || match?.matchCode || match?.weeklyIdentity?.code || getPublicMatchCode(match))

export function getMatchLookupIds(match) {
  const rawId = text(match?.raw_match_id || match?.id || match?.match_id)
  const legacyCode = (match?.cycle_week_id || match?.cycleWeekId) && rawId
    ? getPublicMatchCode({ raw_match_id: rawId, cycle_week_id: true }) : ''
  return [...new Set([match?.match_id, match?.raw_match_id, match?.id, match?.match_code,
    match?.matchCode, match?.weeklyIdentity?.code, legacyCode].map(text).filter(Boolean))]
}

function parseCode(code) {
  const found = text(code).match(/^(.+)-C(\d+)-W(\d+)-(REG|QUAL|PO)-M(\d+)$/)
  if (!found || ![found[2], found[3], found[5]].every(value => Number.isSafeInteger(Number(value)))
    || Number(found[3]) < 1 || Number(found[5]) < 1) return null
  return { seasonId: found[1], cycle_sequence: Number(found[2]), week_number: Number(found[3]), phase: PHASE_CODES[found[4]], match_number: Number(found[5]) }
}

export function buildWeeklyContextIndex(snapshot) {
  const index = new Map()
  if (snapshot?.schema_version !== 'friescup-weekly-public-v1') return index
  for (const cycle of list(snapshot.cycles)) {
    for (const week of list(cycle.weeks)) {
      const context = { cycle_id: cycle.id, week_id: week.id, cycle_sequence: cycle.sequence ?? null,
        cycle_name: cycle.name || cycle.code || '', week_number: week.week_number ?? null,
        week_label: week.label || '', phase: week.phase || '' }
      for (const id of list(week.match_ids)) index.set(text(id), context)
    }
  }
  return index
}

export function getPublishedWeeklyContext(match, snapshotOrIndex) {
  if (!match?.cycle_week_id) return match?.weekly_context || null
  const index = snapshotOrIndex instanceof Map ? snapshotOrIndex : buildWeeklyContextIndex(snapshotOrIndex)
  const bound = [match.match_id, match.raw_match_id, match.id].map(id => index.get(text(id))).find(item =>
    item && item.week_id === match.cycle_week_id && (!match.cycle_id || item.cycle_id === match.cycle_id))
  if (!bound) return match.weekly_context || null
  const context = { cycle_sequence: bound.cycle_sequence, cycle_name: bound.cycle_name,
    week_number: bound.week_number, week_label: bound.week_label, phase: bound.phase,
    ...Object.fromEntries(Object.entries(match.weekly_context || {}).filter(([, value]) => value != null && value !== '')) }
  return match.weekly_context && Object.keys(context).every(key => context[key] === match.weekly_context[key])
    ? match.weekly_context : context
}

export function getWeeklyMatchIdentity(match) {
  if (!match) return null
  const source = match.weekly_context || (match.weeklyIdentity ? {
    cycle_sequence: match.weeklyIdentity.cycleSequence, cycle_name: match.weeklyIdentity.cycleName,
    week_number: match.weeklyIdentity.weekNumber, week_label: match.weeklyIdentity.weekLabel,
    phase: match.weeklyIdentity.phase, match_number: match.weeklyIdentity.matchNumber,
    round_label: match.weeklyIdentity.roundLabel
  } : null)
  const parsed = parseCode(getMatchDisplayCode(match))
  if (!source && !parsed) return null
  return { ...source, ...parsed, code: getMatchDisplayCode(match) }
}

export function getWeeklyPhaseLabel(phase, locale = 'zh-CN') {
  const en = String(locale).startsWith('en')
  const label = WEEKLY_PHASE_LABELS[phase]?.[en ? 1 : 0]
  return label ? uiText(label, locale) : ''
}

export function getWeeklyCycleIdentityLabel(identity, locale = 'zh-CN') {
  const en = String(locale).startsWith('en');
  const sequence = identity?.cycle_sequence ?? identity?.sequence;
  if (sequence === 0) return en ? 'Pilot' : uiText(identity.cycle_name || identity.name || '试运行', locale);
  const seasonId = identity?.seasonId || identity?.season_id || parseCode(identity?.code)?.seasonId;
  if (seasonId === 'FCW26' && [1, 2].includes(sequence)) return `FCW S1 C${sequence}`;
  return Number.isInteger(sequence) ? en ? `Cycle ${sequence}` : uiText('第 {0} 赛段', locale, [sequence])
    : uiText(String(identity?.cycle_name || identity?.name || '').replaceAll('周期', '赛段'), locale);
}

export function getWeeklyMatchIdentityLabel(match, locale = 'zh-CN') {
  const identity = getWeeklyMatchIdentity(match)
  if (!identity) return ''
  const en = String(locale).startsWith('en')
  const round = identity.round_label === '总决赛' ? en ? 'Grand Final' : uiText('总决赛', locale)
    : identity.round_label === '决赛' ? en ? 'Final' : uiText('决赛', locale)
    : identity.round_label === '半决赛' ? en ? 'Semifinal' : uiText('半决赛', locale) : uiText(identity.round_label || '', locale)
  return [getWeeklyCycleIdentityLabel({ ...identity, seasonId: identity.seasonId || match.season_id || (/^FCW26-/.test(getMatchDisplayCode(match)) ? 'FCW26' : '') }, locale),
    identity.week_number ? en ? `Week ${identity.week_number}` : uiText('第 {0} 周', locale, [identity.week_number]) : identity.week_label,
    getWeeklyPhaseLabel(identity.phase, locale), round,
    identity.match_number ? en ? `Match ${String(identity.match_number).padStart(2, '0')}` : uiText('第 {0} 场', locale, [String(identity.match_number).padStart(2, '0')]) : ''
  ].filter(Boolean).join(' · ')
}
