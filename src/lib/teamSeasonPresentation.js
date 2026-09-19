import { getFinalRanking, getFinalResult } from './advanceSelectors.js'
import { getSeasonStatus } from './homeSelectors.js'
import { getSeasonLifecycleGroup } from './publicDataStatus.js'
import { buildWeeklyOverview, isWeeklyOverview } from '../features/weekly-overview/weeklyOverviewModel.js'
import { pickUiLocale } from './uiText.js'

const identityKeys = team => [team?.team_id, team?.teamId, team?.id, team?.routeId, team?.team_short_name,
  team?.shortName, team?.short, team?.team_name, team?.fullName, team?.name]
  .filter(Boolean).map(value => String(value).trim().toLowerCase())
const sameTeam = (left, right) => identityKeys(left).some(key => identityKeys(right).includes(key))

export function getTeamSeasonPresentation({ db, season, team, standing, groupCompetition = false, locale = 'zh-CN' }) {
  const en = locale === 'en-US'
  const copy = (zh, english) => en ? english : zh
  if (isWeeklyOverview(db, season)) {
    const { cycle, standings, isPilot } = buildWeeklyOverview(db)
    const id = String(team?.team_id || team?.id || team?.teamId || '').toLowerCase()
    const published = standings.find(row => id && String(row.team_id).toLowerCase() === id)
    const value = Number(published?.display_rank)
    const rank = !isPilot && Number.isInteger(value) && value > 0 ? value : null
    return {
      isArchived: false,
      heading: pickUiLocale(locale, '周期积分', 'Cycle standings', '주기 순위', '週期積分'),
      code: 'CYCLE STANDINGS',
      rank,
      label: isPilot ? pickUiLocale(locale, '不计积分', 'Unranked', '순위 미반영', '不計積分')
        : rank ? (published.tied
          ? pickUiLocale(locale, `并列第 ${rank} 名`, `Tied #${rank}`, `공동 ${rank}위`, `並列第 ${rank} 名`)
          : pickUiLocale(locale, `第 ${rank} 名`, `#${rank}`, `${rank}위`, `第 ${rank} 名`))
          : pickUiLocale(locale, '积分待公布', 'Standings pending', '순위 발표 대기', '積分待公布'),
      zone: cycle?.name || cycle?.code || pickUiLocale(locale, '周期待公布', 'Cycle pending', '주기 발표 대기', '週期待公布'),
      tone: 'pending'
    }
  }
  const isArchived = getSeasonLifecycleGroup(season, getSeasonStatus(db, season)) === 'ARCHIVE'
  const base = {
    isArchived,
    heading: copy(isArchived ? '最终名次' : '当前排名', isArchived ? 'Final standing' : 'Current standing'),
    code: isArchived ? 'FINAL STANDING' : 'CURRENT STANDING'
  }
  if (isArchived) {
    const publishedTeam = getFinalRanking(db, { seasonFinished: true }).find(row => sameTeam(row, team))
    let rank = Number(publishedTeam?.final_rank || team?.final_rank || 0)
    if (!rank) {
      // A partial ranking must not promote its first listed team to champion.
      const result = getFinalResult({ ...db, teams: [] })
      if (['COMPLETE', 'COMPLETED', 'FINISHED'].includes(String(result.grandFinal?.status).toUpperCase())) {
        if (sameTeam(team, result.champion)) rank = 1
        else if (sameTeam(team, result.runnerUp)) rank = 2
      }
    }
    return {
      ...base,
      rank: rank || null,
      label: rank === 1 ? copy('冠军', 'Champion') : rank === 2 ? copy('亚军', 'Runner-up')
        : rank === 3 ? copy('季军', 'Third place') : rank > 0 ? copy(team?.final_rank_text || `第 ${rank} 名`, `#${rank}`)
          : copy('未发布', 'Unpublished'),
      zone: rank > 0 && rank <= 3 ? copy(`最终第 ${rank} 名`, `Final place · #${rank}`) : copy('赛季已归档', 'Season archived'),
      tone: rank > 0 && rank <= 3 ? 'win' : 'pending'
    }
  }

  if (groupCompetition) {
    const group = standing?.groupLabel || standing?.group_label || team?.group_label || '—'
    const rank = Number(standing?.rank ?? standing?.group_rank ?? team?.group_seed ?? 0)
    const played = Number(standing?.matchesPlayed ?? standing?.matches_played ?? 0)
    const label = rank ? copy(`${group} 组第 ${rank} 名`, `Group ${group} · #${rank}`) : copy(`${group} 组`, `Group ${group}`)
    if (standing?.requiresTiebreak || standing?.requires_tiebreak) return { ...base, label, zone: copy('待加赛', 'Tiebreak pending'), tone: 'draw' }
    if (!played) return { ...base, label: copy(`${group} 组`, `Group ${group}`), zone: rank ? copy(`第 ${rank} 种子 · 待开赛`, `Seed ${rank} · Not started`) : copy('小组赛待开赛', 'Group stage pending'), tone: 'pending' }
    if (standing?.qualified) return { ...base, label, zone: copy('已晋级', 'Qualified'), tone: 'win' }
    const eliminated = standing?.status === 'eliminated'
    return { ...base, label, zone: copy(eliminated ? '已淘汰' : '小组赛进行中', eliminated ? 'Eliminated' : 'Group stage active'), tone: eliminated ? 'loss' : 'pending' }
  }

  if (!standing?.matches_played) return { ...base, label: copy('待生成', 'Pending'), zone: copy('积分未生成', 'Standings pending'), tone: 'pending' }
  const zones = {
    direct: [copy('晋级区', 'Qualification zone'), 'win'],
    breakthrough: [copy('突围区', 'Breakthrough zone'), 'draw'],
    contending: [copy('竞争区', 'In contention'), 'draw'],
    danger: [copy('危险区', 'At risk'), 'loss'],
    eliminated: [copy('已出局', 'Eliminated'), 'loss']
  }
  const [zone, tone] = zones[standing.status] || [copy('当前排名', 'Current standing'), 'pending']
  return { ...base, label: Number(standing.rank) > 0 ? copy(`第 ${standing.rank} 名`, `#${standing.rank}`) : '—', zone, tone }
}
