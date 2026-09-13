import { getDefaultAdvancePhase, getGroupStandings, getSwissStandingsRows, isGroupCompetition } from '../../lib/advanceSelectors.js'
import { getTeamSeasonPresentation } from '../../lib/teamSeasonPresentation.js'
import { buildWeeklyAdvance, weeklyPublishedRank } from '../weekly-advance/weeklyAdvanceModel.js'
import { isWeeklyOverview, weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'

const identityKeys = team => [team.team_id, team.teamId, team.id, team.routeId, team.team_short_name, team.teamShortName, team.short, team.team_name, team.teamName]
  .filter(Boolean).map(value => String(value).trim().toLowerCase())

export function getFollowingTeamSummaries(db, season, teams, locale, cycleId) {
  if (!db || !teams.length) return new Map()
  if (isWeeklyOverview(db, season)) {
    const model = buildWeeklyAdvance(db, { cycleId })
    const en = locale === 'en-US'
    return new Map(teams.map(team => {
      const keys = new Set(identityKeys(team))
      const row = model.rows.find(row => identityKeys(row.team).some(key => keys.has(key)))
      const standing = row?.standing
      const points = weeklyScore(standing?.points)
      const rank = weeklyPublishedRank(standing?.display_rank)
      const played = weeklyScore(standing?.played)
      const rankLabel = rank === '—' ? en ? 'Rank unpublished' : '名次未公布' : `${standing?.tied ? en ? 'Tied ' : '并列' : ''}${en ? '#' + rank : '第 ' + rank + ' 名'}`
      return [team.id, {
        weekly: true, heading: en ? 'Published cycle points' : '已公布周期积分',
        label: model.isPilot ? en ? 'Unranked' : '不计积分' : points === '—' ? '—' : `${points} ${en ? 'pts' : '分'}`,
        zone: model.isPilot ? en ? 'Pilot · match records only' : '试运行 · 保留比赛记录'
          : !row ? en ? 'No public records in this cycle' : '本周期暂无公开记录'
            : !standing ? en ? 'Standings not published' : '积分榜尚未公布'
              : `${rankLabel} · ${en ? played + ' played' : '已赛 ' + played + ' 场'}`,
        advanceHref: model.cycle ? `/advance?${new URLSearchParams({ cycle: model.cycle.id, teamId: row?.id || team.routeId })}` : '/advance',
        advanceLabel: en ? 'Cycle record' : '周期历程'
      }]
    }))
  }
  const groupCompetition = isGroupCompetition(season, db)
  const standings = groupCompetition ? getGroupStandings(db, season).flatMap(group => group.rows) : getSwissStandingsRows(db, season)
  const phase = getDefaultAdvancePhase(db, season)
  return new Map(teams.map(team => {
    const keys = new Set(identityKeys(team))
    const standing = standings.find(row => identityKeys(row).some(key => keys.has(key)))
    const summary = getTeamSeasonPresentation({ db, season, team, standing, groupCompetition, locale })
    return [team.id, { ...summary, advanceHref: `/advance?phase=${summary.isArchived ? 'final' : phase}` }]
  }))
}
