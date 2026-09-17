import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import AdvancePhaseHero from './AdvancePhaseHero.jsx'
import TeamLogo from '../matches/TeamLogo.jsx'
import { formatShortDateTime, teamShort } from '../../lib/advanceSelectors.js'
import { pickLocale } from '../../lib/legacyI18n.js'
import styles from '../../pages/advance/AdvancePage.module.css'

const TIEBREAKER_LABELS = {
  match_wins: ['胜场数', 'Match wins'],
  map_differential: ['地图净胜', 'Map differential'],
  maps_won: ['地图胜场', 'Maps won'],
  head_to_head: ['两队直接交手', 'Head-to-head'],
  tiebreak_match: ['仍同分则标记待加赛', 'Unresolved ties await a tiebreak match']
}

function copy(locale, zh, en) {
  return pickLocale(locale, zh, en)
}

function getStatusLabel(row, locale) {
  if (row.requiresTiebreak) return copy(locale, '待加赛', 'Tiebreak Pending')
  if (row.qualified) return copy(locale, '已晋级', 'Qualified')
  if (row.status === 'eliminated') return copy(locale, '已淘汰', 'Eliminated')
  if (row.status === 'active') return copy(locale, '进行中', 'Active')
  return copy(locale, '待开赛', 'Scheduled')
}

function formatDiff(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

function GroupCard({ group, seasonId, withSeason, locale }) {
  return (
    <article className={styles.groupCard}>
      <header className={styles.groupCardHeader}>
        <div>
          <span>GROUP {group.groupLabel}</span>
          <h3>{copy(locale, uiText("{0} 组积分榜", locale, [group.groupLabel]), `Group ${group.groupLabel} Standings`)}</h3>
        </div>
        <p>
          <strong>{group.completedMatches}</strong> / {group.expectedMatches} {copy(locale, uiText("场", locale), 'matches')}
        </p>
      </header>
      <div className={styles.groupTableScroller}>
        <table className={styles.groupTable}>
          <thead>
            <tr>
              <th>{copy(locale, uiText("排名", locale), 'Rank')}</th>
              <th>{copy(locale, uiText("队伍", locale), 'Team')}</th>
              <th>{copy(locale, uiText("胜负", locale), 'W—L')}</th>
              <th>{copy(locale, uiText("地图", locale), 'Maps')}</th>
              <th>{copy(locale, uiText("净胜", locale), 'Diff')}</th>
              <th>{copy(locale, uiText("状态", locale), 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map(row => (
              <tr
                key={row.teamId}
                className={[
                  row.rank <= group.advancePerGroup ? styles.groupAdvanceRow : '',
                  row.requiresTiebreak ? styles.groupTiebreakRow : ''
                ].filter(Boolean).join(' ')}
              >
                <td><b>{String(row.rank).padStart(2, '0')}</b></td>
                <td>
                  <Link to={withSeason(`/teams/${row.teamId}`)} title={row.teamName}>
                    <TeamLogo team={row.team} seasonId={seasonId} className={styles.groupTeamLogo} />
                    <span>{teamShort(row.team)}</span>
                    {row.isPrimaryFavorite
                      ? <em>{copy(locale, uiText("主队", locale), 'Primary')}</em>
                      : row.isFavorite ? <em>{copy(locale, uiText("关注", locale), 'Followed')}</em> : null}
                  </Link>
                </td>
                <td>{row.matchWins}—{row.matchLosses}</td>
                <td>{row.mapsWon}—{row.mapsLost}</td>
                <td><strong>{formatDiff(row.mapDifferential)}</strong></td>
                <td><span className={styles[`groupStatus_${row.status}`]}>{getStatusLabel(row, locale)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        <span>{copy(locale, uiText("前 {0} 名晋级八强", locale, [group.advancePerGroup]), `Top ${group.advancePerGroup} advance to quarterfinals`)}</span>
        {group.requiresTiebreak
          ? <strong>{copy(locale, uiText("本组存在无法自动判定的同分队伍，等待加赛安排。", locale), 'This group has an unresolved tie and awaits a tiebreak schedule.')}</strong>
          : null}
      </footer>
    </article>
  )
}

export default function GroupPhasePanel({ overview, groups, seasonId, withSeason, locale = 'zh-CN' }) {
  const nextMatch = overview.nextMatch
  const tiebreakers = overview.rules.tiebreakers.map(key => {
    const labels = TIEBREAKER_LABELS[key]
    return labels ? copy(locale, labels[0], labels[1]) : key
  })
  const adminScore = overview.rules.administrativeLossScore
  const drawScore = overview.rules.drawScore

  return (
    <div className={styles.phaseStack}>
      <section className={styles.groupDashboard}>
        <AdvancePhaseHero
          eyebrow="GROUP STAGE"
          title={copy(locale, uiText("小组赛晋级形势", locale), 'Group Stage Standings')}
          description={copy(locale, uiText("A—D 四组单循环 · 每场 FT3 · 每组前 2 名晋级八强单败淘汰赛", locale), 'Four round-robin groups · FT3 · top two from each group advance to the single-elimination quarterfinals')}
          metrics={[
            { value: overview.teamCount, label: copy(locale, uiText("支队伍", locale), 'Teams') },
            { value: overview.groupCount, label: copy(locale, uiText("个小组", locale), 'Groups') },
            { value: `${overview.rules.advancePerGroup} × ${overview.groupCount}`, label: copy(locale, uiText("晋级名额", locale), 'Advance Slots'), accent: true }
          ]}
        />
        <div className={styles.groupSummary}>
          <div><span>{copy(locale, uiText("当前比赛日", locale), 'Current Match Day')}</span><strong>DAY {overview.currentDay} / {overview.dayCount}</strong></div>
          <div><span>{copy(locale, uiText("小组赛进度", locale), 'Group Stage Progress')}</span><strong>{overview.completedMatches} / {overview.expectedMatches}</strong></div>
          <div><span>{copy(locale, uiText("本比赛日进度", locale), 'Match Day Progress')}</span><strong>{overview.roundProgressLabel}</strong></div>
          <div>
            <span>{copy(locale, uiText("下一场", locale), 'Next Match')}</span>
            <strong>{nextMatch ? `${teamShort(nextMatch.team_a)} VS ${teamShort(nextMatch.team_b)}` : copy(locale, uiText("待定", locale), 'TBD')}</strong>
            <em>{nextMatch ? formatShortDateTime(nextMatch) : ''}</em>
          </div>
        </div>
      </section>

      <section className={styles.groupRules} aria-labelledby="group-rules-title">
        <header>
          <span>RANKING RULES</span>
          <h2 id="group-rules-title">{copy(locale, uiText("排名与特殊赛果", locale), 'Ranking & Special Results')}</h2>
        </header>
        <ol>
          {tiebreakers.map((label, index) => <li key={label}><b>{index + 1}</b><span>{label}</span></li>)}
        </ol>
        <p>
          {copy(locale, uiText("判负记", locale), 'Administrative loss: ')} <strong>{adminScore.length === 2 ? `${adminScore[0]}:${adminScore[1]}` : '0:3'}</strong>
          {copy(locale, uiText("，计入地图净胜；平局按", locale), ', included in map differential. Draw: ')} <strong>{drawScore.length === 2 ? `${drawScore[0]}:${drawScore[1]}` : '0:0'}</strong>
          {copy(locale, uiText(" 记录，双方均不计胜场。", locale), '; neither team receives a match win.')}
        </p>
      </section>

      <section className={styles.groupGrid} aria-label={copy(locale, uiText("全高杯 S4 小组积分榜", locale), 'Hammer Cup S4 group standings')}>
        {groups.map(group => (
          <GroupCard key={group.groupLabel} group={group} seasonId={seasonId} withSeason={withSeason} locale={locale} />
        ))}
      </section>
    </div>
  )
}
