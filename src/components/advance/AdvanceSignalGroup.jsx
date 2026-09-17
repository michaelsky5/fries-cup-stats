import { translateUiText as uiText } from '../../lib/uiText.js'
import { useSearchParams } from 'react-router-dom'
import Link from './AdvanceRecordLink.jsx'
import { updateAdvanceReadingSearch } from './advanceReadingState.js'
import TeamLogo from '../matches/TeamLogo.jsx'
import { formatShortDateTime, teamShort } from '../../lib/advanceSelectors.js'
import styles from './AdvanceSignal.module.css'

const TIEBREAKER_LABELS = {
  match_wins: ['胜场数', 'Match wins'],
  map_differential: ['地图净胜', 'Map differential'],
  maps_won: ['地图胜场', 'Maps won'],
  head_to_head: ['两队直接交手', 'Head-to-head'],
  tiebreak_match: ['仍同分则加赛', 'Tiebreak match if still level']
}

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function teamRouteId(row) {
  return row?.teamId || row?.team?.team_id || row?.team?.id || ''
}

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

function formatDiff(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

function statusLabel(row, locale) {
  if (row.requiresTiebreak) return copy(locale, '待加赛', 'TIEBREAK')
  if (row.qualified) return copy(locale, '已晋级', 'QUALIFIED')
  if (row.status === 'eliminated') return copy(locale, '已淘汰', 'OUT')
  if (row.status === 'active') return copy(locale, '进行中', 'ACTIVE')
  return copy(locale, '待开赛', 'SCHEDULED')
}

function GroupIndex({ group, seasonId, withSeason, locale, selected }) {
  return (
    <article className={styles.groupIndex} data-selected={selected || undefined}>
      <header>
        <div>
          <span>GROUP {group.groupLabel}</span>
          <h2>{copy(locale, uiText("{0} 组", locale, [group.groupLabel]), `Group ${group.groupLabel}`)}</h2>
        </div>
        <p><strong>{group.completedMatches}</strong> / {group.expectedMatches} {copy(locale, uiText("场", locale), 'MATCHES')}</p>
      </header>

      <div className={styles.groupTableWrap}>
        <table className={styles.groupIndexTable}>
          <thead>
            <tr>
              <th>NO.</th>
              <th>{copy(locale, uiText("队伍", locale), 'TEAM')}</th>
              <th>{copy(locale, uiText("胜负", locale), 'W—L')}</th>
              <th>{copy(locale, uiText("净胜", locale), 'DIFF')}</th>
              <th>{copy(locale, uiText("状态", locale), 'STATUS')}</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map(row => (
              <tr
                key={teamRouteId(row)}
                data-advance={row.rank <= group.advancePerGroup ? 'true' : undefined}
                data-tiebreak={row.requiresTiebreak ? 'true' : undefined}
              >
                <td>{String(row.rank).padStart(2, '0')}</td>
                <td>
                  <Link to={withSeason(`/teams/${teamRouteId(row)}`)}>
                    <TeamLogo team={row.team} seasonId={seasonId} className={styles.groupLogo} />
                    <span>
                      <strong>{teamShort(row.team)}</strong>
                      <small>{row.teamName}</small>
                    </span>
                  </Link>
                </td>
                <td>{row.matchWins}—{row.matchLosses}</td>
                <td>{formatDiff(row.mapDifferential)}</td>
                <td><span>{statusLabel(row, locale)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer>{copy(locale, uiText("黄色线内前 {0} 名进入八强", locale, [group.advancePerGroup]), `Top ${group.advancePerGroup} above the signal line advance`)}</footer>
    </article>
  )
}

export default function AdvanceSignalGroup({ overview, groups, seasonId, withSeason, locale = 'zh-CN' }) {
  const [params, setParams] = useSearchParams()
  const selectedGroup = groups.find(group => String(group.groupLabel) === params.get('group'))?.groupLabel || groups[0]?.groupLabel
  const nextMatch = overview?.nextMatch
  const nextMatchId = matchRouteId(nextMatch)
  const tiebreakers = (overview?.rules?.tiebreakers || []).map(key => {
    const labels = TIEBREAKER_LABELS[key]
    return labels ? copy(locale, labels[0], labels[1]) : key
  })

  return (
    <div className={styles.groupWorkspace} data-chapter="01">
      <header className={styles.chapterIntro}>
        <div>
          <span>01 / GROUP STAGE / {seasonId}</span>
          <h2>{copy(locale, <>{uiText("从四个小组，", locale)}<em>{uiText("走出八支队伍。", locale)}</em></>, <>Four groups.{' '}<em>Eight teams move on.</em></>)}</h2>
        </div>
        <p>{copy(locale, uiText("先把每一场胜负放回小组里，再看晋级边界如何一点点变清晰。", locale), 'Put every result back into its group, then watch the qualification line come into focus.')}</p>
      </header>

      <section className={styles.groupStandings} aria-labelledby="signal-group-standings-title">
        <header className={styles.sectionEyebrow}>
          <span id="signal-group-standings-title">GROUP STANDINGS × {String(groups.length).padStart(2, '0')}</span>
          <p>{copy(locale, uiText("黄色细线标记当前晋级边界；排名按官方小组积分更新。", locale), 'The yellow signal line marks the current qualification boundary.')} <b aria-hidden="true">↘</b></p>
        </header>
        <nav className={styles.mobileGroupTabs} style={{ '--advance-group-count': groups.length }} aria-label={copy(locale, uiText('选择小组', locale), 'Choose a group')}>
          {groups.map(group => <button key={group.groupLabel} type="button" aria-pressed={group.groupLabel === selectedGroup} onClick={() => setParams(updateAdvanceReadingSearch(params, { group: group.groupLabel }), { replace: true, preventScrollReset: true })}>{copy(locale, uiText('{0} 组', locale, [group.groupLabel]), `Group ${group.groupLabel}`)}</button>)}
        </nav>
        <div className={styles.groupIndexGrid}>
          {groups.map(group => (
            <GroupIndex key={group.groupLabel} group={group} seasonId={seasonId} withSeason={withSeason} locale={locale} selected={group.groupLabel === selectedGroup} />
          ))}
        </div>
      </section>

      <aside className={styles.phaseAside} aria-label={copy(locale, uiText("当前小组赛信号", locale), 'Current group-stage signal')}>
        <div className={styles.phaseDossier}>
          <header><span>CURRENT SIGNAL <b>/</b> {seasonId}</span><em>●</em></header>
          <div className={styles.phaseReadout} data-step="01">
            <span>{copy(locale, uiText("当前比赛日", locale), 'MATCH DAY')}</span>
            <strong>DAY {overview.currentDay}<small>/ {overview.dayCount}</small></strong>
            <p>{overview.complete ? copy(locale, uiText('小组赛已结束', locale), 'GROUP STAGE COMPLETE') : overview.hasStarted ? copy(locale, uiText('小组赛进行中', locale), 'GROUP STAGE ACTIVE') : copy(locale, uiText('小组赛尚未开始', locale), 'GROUP STAGE UPCOMING')}</p>
          </div>
          <dl className={styles.phaseMetrics}>
            <div><dt>{copy(locale, uiText("总进度", locale), 'TOTAL')}</dt><dd>{overview.completedMatches}<small>/ {overview.expectedMatches}</small></dd></div>
            <div><dt>{copy(locale, uiText("本比赛日", locale), 'TODAY')}</dt><dd>{overview.roundProgressLabel}</dd></div>
            <div><dt>{copy(locale, uiText("晋级名额", locale), 'SLOTS')}</dt><dd>{overview.rules.advancePerGroup * overview.groupCount}</dd></div>
          </dl>

          <section className={styles.nextMatchSignal}>
            <span>NEXT MATCH</span>
            {nextMatch ? (
              nextMatchId ? (
                <Link to={withSeason(`/matches/${nextMatchId}`)}>
                  <strong>{teamShort(nextMatch.team_a)} <i>VS</i> {teamShort(nextMatch.team_b)}</strong>
                  <small>{formatShortDateTime(nextMatch) || copy(locale, uiText("时间待定", locale), 'TIME TBD')}</small>
                  <b aria-hidden="true">↗</b>
                </Link>
              ) : (
                <p>{teamShort(nextMatch.team_a)} VS {teamShort(nextMatch.team_b)}</p>
              )
            ) : <p>{overview.complete ? copy(locale, uiText('小组赛已全部结束', locale), 'All group matches are complete') : copy(locale, uiText('对阵待确认', locale), 'MATCHUP PENDING')}</p>}
          </section>

          <section className={styles.ruleIndex}>
            <header><span>RANKING RULES</span><small>{String(tiebreakers.length).padStart(2, '0')}</small></header>
            <ol>
              {tiebreakers.map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></li>)}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  )
}
