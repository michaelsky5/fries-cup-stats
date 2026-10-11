import { formatMatchSchedule } from '../../../lib/scheduleFormat.js'
import { weeklyMatchState } from '../../../features/weekly-overview/weeklyOverviewModel.js'

const upper = value => String(value || '').trim().toUpperCase()
const list = value => Array.isArray(value) ? value : []

export function getWeeklyMatchPeriod(db, match) {
  if (db?.weekly_competition?.schema_version !== 'friescup-weekly-public-v1' || !match) return null
  const cycle = list(db.weekly_competition.cycles).find(item => item.id === match.cycle_id && ['ACTIVE', 'PLAYOFFS', 'CLOSED'].includes(upper(item.status)))
  const ids = [match.match_id, match.raw_match_id, match.id].filter(Boolean)
  const week = list(cycle?.weeks).find(item => item.id === match.cycle_week_id && ['PUBLISHED', 'IN_PROGRESS', 'RESULT_REVIEW', 'CLOSED'].includes(upper(item.status)) && list(item.match_ids).some(id => ids.includes(id)))
  return cycle && week ? { cycle, week } : null
}

export function getMatchPhasePresentation(dossier, progress = [], locale = 'zh-CN') {
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const match = dossier?.match || {}
  const state = dossier?.state || {}
  const key = state.isForfeit ? 'forfeit' : state.isRuling ? 'ruling' : state.isComplete ? 'complete'
    : state.isWeekly ? weeklyMatchState(match)
      : state.isCancelled ? 'cancelled' : state.isPostponed ? 'postponed' : state.isLive ? 'live' : state.isReview ? 'review' : state.isUpcoming ? 'upcoming' : 'unknown'
  const active = !['complete', 'forfeit', 'ruling'].includes(key)
  const canReadMaps = ['live', 'review', 'complete', 'ruling'].includes(key)
  const records = canReadMaps ? progress.filter(map => map.hasResult || map.hasStats) : []
  const rr5 = upper(match.format) === 'RR5'
  const slots = active && !['cancelled', 'unknown'].includes(key)
    ? (rr5 ? Array.from({ length: 5 }, (_, index) => index + 1) : list(dossier?.maps).map(map => map.order)).map(order => {
      const map = list(dossier?.maps).find(item => item.order === order)
      const record = records.find(item => item.order === order)
      const inPlay = key === 'live' && ['LIVE', 'IN_PROGRESS'].includes(upper(map?.raw?.status))
      const slotState = record ? map?.raw?.is_administrative ? 'ruling' : 'recorded' : inPlay ? 'live' : 'pending'
      return { order, map, record, state: slotState,
        name: map?.raw?.map_name ? map.name : t('地图待公布', 'Map TBA'),
        label: slotState === 'live' ? t('本局进行中', 'Map in progress') : slotState === 'ruling' ? t('赛事判定', 'By ruling')
          : slotState === 'recorded' ? record.winnerTeam ? t(`${record.winnerTeam.short} 胜`, `${record.winnerTeam.short} win`)
            : record.winnerSide === 'DRAW' ? t('平局', 'Draw') : t('已记录', 'Recorded')
            : key === 'upcoming' || key === 'postponed' ? t('待开赛', 'Not started') : t('暂无记录', 'No record yet') }
    }) : []
  const statusLabels = {
    live: ['进行中', 'IN PROGRESS'], upcoming: ['待赛', 'UPCOMING'], review: ['结果待审核', 'UNDER REVIEW'],
    postponed: ['已延期', 'POSTPONED'], cancelled: ['已取消', 'CANCELLED'], unknown: ['状态待更新', 'STATUS PENDING'],
    complete: ['已结束', 'FINAL'], forfeit: ['弃权', 'FORFEIT'], ruling: ['判定结束', 'BY RULING']
  }
  const captions = {
    upcoming: t('从第一局开始，等双方上场。', 'Ready for the first map. Waiting for the teams.'),
    live: rr5 ? records.length < 5 ? t('RR5 打满五局，当前比分不是最终赛果。', 'RR5 plays all five maps. This score is not final.')
      : t('五局记录已公布，比赛状态仍为进行中。', 'Five map records are available. The match is still marked in progress.')
      : t('比赛仍在继续，以下展示已公布的地图记录。', 'The match continues. Published map records are shown below.'),
    review: t('比分与地图结果待审核，正式赛果以公布为准。', 'Scores and map results are under review. The final result follows publication.'),
    postponed: t('比赛已延期，新时间以赛事公布为准。', 'The match is postponed. The revised time follows the event announcement.'),
    cancelled: t('本场比赛已取消。', 'This match has been cancelled.'),
    unknown: t('比赛状态尚未明确，以后续公布内容为准。', 'The match status is unconfirmed. Follow the next published update.')
  }
  const schedule = formatMatchSchedule(match, { locale, includeWeekday: true })
  const date = schedule.hasSchedule ? schedule.label.replace('TBD', t('时间待定', 'Time TBD'))
    : match.scheduled_date ? `${match.scheduled_date} ${match.scheduled_time || t('时间待定', 'Time TBD')}` : t('时间待定', 'Time TBD')
  const liveStreams = active && !['cancelled', 'unknown'].includes(key) ? list(dossier?.broadcast?.streamLinks).filter(link => {
    if (['replay', 'archive'].includes(link.kind)) return false
    try { return ['http:', 'https:'].includes(new URL(link.url).protocol) } catch { return false }
  }) : []
  return { key, active, rr5, slots, records, recordedCount: records.length, liveStreams,
    canAnalyze: !active && !state.isForfeit && !state.isRuling && state.canShowResults && dossier.statsMapCount > 0,
    scoreTitle: key === 'live' ? t('当前比分', 'CURRENT SCORE') : key === 'review' ? t('待审核比分', 'SCORE UNDER REVIEW')
      : active ? t('双方对阵', 'MATCHUP') : t('系列赛比分', 'SERIES SCORE'),
    statusLabel: statusLabels[key][en ? 1 : 0], caption: captions[key] || '',
    scheduleLabel: key === 'postponed' && schedule.hasSchedule ? t(`原定 ${date}`, `Originally ${date}`) : date }
}
