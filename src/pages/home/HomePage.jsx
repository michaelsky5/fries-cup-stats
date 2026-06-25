import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import {
  formatMatchScore,
  formatTeamFullName,
  formatTeamName,
  getAdvanceSnapshot,
  getArchiveFeaturedMatches,
  getArchiveHighlights,
  getDataPulse,
  getFeaturedCurrentMatches,
  getFollowingOverview,
  getHomeSummary,
  getLatestResultSnapshot,
  getOverviewStatus,
  safeArr
} from '../../lib/homeSelectors.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { isEnglishLocale, pickLocale, translateLegacyText } from '../../lib/legacyI18n.js'
import styles from './HomePage.module.css'

function homeText(locale, zh, en) {
  return pickLocale(locale, zh, en)
}

function homeValue(value, locale = 'zh-CN') {
  return translateLegacyText(value, locale)
}

function countText(locale, count, zhUnit, enSingular, enPlural = `${enSingular}s`) {
  return isEnglishLocale(locale) ? `${count} ${Number(count) === 1 ? enSingular : enPlural}` : `${count} ${zhUnit}`
}

function teamPlayerScaleText(locale, teams, players) {
  return isEnglishLocale(locale) ? `${teams} teams / ${players} players` : `${teams} 队 / ${players} 人`
}

function advanceSlotsText(value, locale = 'zh-CN') {
  if (!isEnglishLocale(locale)) return value

  const matched = String(value || '').match(/前\s*(\d+)/)
  return matched ? `Top ${matched[1]}` : homeValue(value, locale)
}

function localeField(value, locale = 'zh-CN') {
  if (value && typeof value === 'object') return homeText(locale, value.zh, value.en)
  return value
}

function routeId(entity) {
  return entity?.team_id || entity?.player_id || entity?.id || entity?.short || entity?.team_short_name || ''
}

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

function getShortTime(match, locale = 'zh-CN') {
  if (!match) return homeText(locale, '时间待定', 'Time TBD')
  if (match.scheduled_date && match.scheduled_time) {
    return `${String(match.scheduled_date).slice(5)} ${match.scheduled_time}`
  }

  const raw = match.scheduled_at || match.match_date || match.date
  const time = raw ? new Date(raw) : null
  if (!time || Number.isNaN(time.getTime())) return homeText(locale, '时间待定', 'Time TBD')
  const mm = String(time.getMonth() + 1).padStart(2, '0')
  const dd = String(time.getDate()).padStart(2, '0')
  const hh = String(time.getHours()).padStart(2, '0')
  const mi = String(time.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function getMatchStatusText(match, locale = 'zh-CN') {
  const status = String(match?.status || '').toUpperCase()
  if (['COMPLETE', 'COMPLETED'].includes(status)) return homeText(locale, '已结束', 'Completed')
  if (['LIVE', 'IN_PROGRESS'].includes(status)) return homeText(locale, '进行中', 'Live')
  if (['POSTPONED', 'DELAYED'].includes(status)) return homeText(locale, '延期', 'Postponed')
  return homeText(locale, '未开始', 'Scheduled')
}

function getTeamLabel(team) {
  return formatTeamName(team)
}

function getTeamTitle(team) {
  return formatTeamFullName(team)
}

function isSameTeam(a, b) {
  const aKeys = [
    a?.team_id,
    a?.id,
    a?.team_short_name,
    a?.short,
    a?.team_name,
    a?.name
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
  const bKeys = new Set([
    b?.team_id,
    b?.id,
    b?.team_short_name,
    b?.short,
    b?.team_name,
    b?.name
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean))

  return aKeys.some(key => bKeys.has(key))
}

function SectionHead({ eyebrow, title, actionTo, actionText }) {
  const { withSeason = path => path } = useOutletContext()

  return (
    <div className={styles.sectionHead}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {actionTo && actionText ? (
        <Link to={withSeason(actionTo)} className={styles.textLink}>{actionText}</Link>
      ) : null}
    </div>
  )
}

function TeamMark({ team, align = 'left' }) {
  const { seasonId } = useOutletContext()

  return (
    <span className={`${styles.teamMark} ${align === 'right' ? styles.teamMarkRight : ''}`} title={getTeamTitle(team)}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.teamLogo} />
      <strong>{getTeamLabel(team)}</strong>
    </span>
  )
}

function BoardTeam({ team, align = 'left' }) {
  const { seasonId } = useOutletContext()
  const fullName = getTeamTitle(team)

  return (
    <span className={`${styles.boardTeam} ${align === 'right' ? styles.boardTeamRight : ''}`} title={fullName}>
      <span className={styles.boardTeamText}>
        <strong>{getTeamLabel(team)}</strong>
        <em>{fullName}</em>
      </span>
      <TeamLogo team={team} seasonId={seasonId} className={styles.boardTeamLogo} />
    </span>
  )
}

function MatchBoardRow({ match, index = 1, compact = false, showTime = true }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  if (!match) return null

  return (
    <Link
      to={withSeason(`/matches/${matchRouteId(match)}`)}
      className={`${styles.matchBoardRow} ${compact ? styles.matchBoardRowCompact : ''}`}
    >
      <span className={styles.boardIndex}>{String(index).padStart(2, '0')}</span>
      <span className={styles.boardDuel}>
        <BoardTeam team={match.team_a} align="right" />
        <b>VS</b>
        <BoardTeam team={match.team_b} />
      </span>
      <span className={styles.boardMeta}>
        {showTime ? <time>{getShortTime(match, locale)}</time> : null}
        <strong>{match.format || 'TBD'}</strong>
        <em>{getMatchStatusText(match, locale)}</em>
      </span>
      <span className={styles.boardArrow} aria-hidden="true">→</span>
    </Link>
  )
}

function MatchCard({ match, result = false, compact = false }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  if (!match) return null

  return (
    <Link
      to={withSeason(`/matches/${matchRouteId(match)}`)}
      className={`${styles.matchCard} ${compact ? styles.matchCardCompact : ''}`}
    >
      <div className={styles.matchDuel}>
        <TeamMark team={match.team_a} align="right" />
        <b>{result ? formatMatchScore(match) : 'VS'}</b>
        <TeamMark team={match.team_b} />
      </div>
      <div className={styles.matchMeta}>
        <span>{getShortTime(match, locale)}</span>
        <span>{match.format || 'TBD'}</span>
        <em>{homeText(locale, '详情', 'Details')}</em>
      </div>
    </Link>
  )
}

function FollowDuelTeam({ team, align = 'left' }) {
  const { seasonId } = useOutletContext()

  return (
    <span className={`${styles.followDuelTeam} ${align === 'right' ? styles.followDuelTeamRight : ''}`} title={getTeamTitle(team)}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.followLogo} />
      <span>
        <strong>{getTeamLabel(team)}</strong>
        <em>{getTeamTitle(team)}</em>
      </span>
    </span>
  )
}

function CommandBoard({ overview, featuredMatches }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const facts = [
    { label: homeText(locale, '当前阶段', 'Current Stage'), value: homeValue(overview.currentStage, locale) },
    { label: homeText(locale, '赛事状态', 'Event Status'), value: homeValue(overview.statusText, locale) },
    { label: homeText(locale, '下一开赛', 'Next Start'), value: homeValue(overview.nextStartLabel, locale) },
    { label: homeText(locale, '本轮进度', 'Round Progress'), value: homeValue(overview.roundProgressLabel, locale) },
    { label: homeText(locale, '赛季规模', 'Season Scale'), value: homeValue(overview.seasonScaleLabel, locale) },
    { label: homeText(locale, '晋级名额', 'Advance Slots'), value: advanceSlotsText(overview.advancementLabel, locale) }
  ]

  return (
    <section className={styles.commandBoard}>
      <div className={styles.commandLead}>
        <span className={styles.commandKicker}>EVENT COMMAND BOARD</span>
        <div className={styles.commandTitle}>
          <strong>{overview.eventCode}</strong>
          <h1>{homeValue(overview.seasonName, locale)}</h1>
        </div>
        <dl className={styles.commandFacts}>
          {facts.map(item => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.commandActions}>
          <Link to={withSeason('/matches?view=list&tab=round')}>{homeText(locale, '查看本轮全部比赛', 'View This Round')}</Link>
          <Link to={withSeason('/advance')}>{homeText(locale, '查看晋级形势', 'View Advance Hub')}</Link>
          <Link to={withSeason('/following?manage=1')}>{homeText(locale, '管理关注', 'Manage Follows')}</Link>
        </div>
      </div>

      <aside className={styles.commandFeatured}>
        <div className={styles.commandFeaturedHead}>
          <span>FEATURED MATCHES</span>
          <strong>{homeText(locale, '本轮重点比赛', 'Featured Matches')}</strong>
          <em>{homeValue(overview.round.roundLabel, locale)}</em>
        </div>
        <div className={styles.commandFeaturedGrid}>
          {featuredMatches.length ? featuredMatches.map((match, index) => (
            <MatchBoardRow key={matchRouteId(match)} match={match} index={index + 1} />
          )) : (
            <div className={styles.emptyMini}>
              <strong>{homeText(locale, '暂无重点比赛', 'No Featured Matches')}</strong>
              <span>{homeText(locale, '赛程公布后将展示本轮代表性对阵。', 'Representative matches will appear after the schedule is published.')}</span>
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}

const EVENT_TIMELINE = [
  {
    key: 'registration',
    label: 'REGISTRATION',
    title: { zh: '报名时间', en: 'Registration' },
    range: { zh: '2026 年 6 月 6 日 - 6 月 20 日', en: 'June 6-20, 2026' },
    start: '2026-06-06T00:00:00+08:00',
    end: '2026-06-20T23:59:59+08:00',
    text: { zh: '参赛报名、队伍信息提交与阵容确认。', en: 'Team registration, roster submission, and lineup confirmation.' }
  },
  {
    key: 'qualifier',
    label: 'OPEN QUALIFIER',
    title: { zh: '公开预选赛时间', en: 'Open Qualifier' },
    range: { zh: '2026 年 6 月 26 日 - 7 月 19 日', en: 'June 26-July 19, 2026' },
    start: '2026-06-26T00:00:00+08:00',
    end: '2026-07-19T23:59:59+08:00',
    text: { zh: '公开预选赛阶段，具体对阵与赛果进入赛程赛果查看。', en: 'The qualifier window. Full pairings, filters, and match details live in Matches.' }
  },
  {
    key: 'playoffs',
    label: 'PLAYOFFS',
    title: { zh: '季后赛时间', en: 'Playoffs' },
    range: { zh: '2026 年 8 月 7 日 - 8 月 16 日', en: 'August 7-16, 2026' },
    start: '2026-08-07T00:00:00+08:00',
    end: '2026-08-16T23:59:59+08:00',
    text: { zh: '晋级队伍进入季后赛，完成最终名次争夺。', en: 'Qualified teams enter playoffs and settle the final placements.' }
  }
]

function getTimelineStatusKey(item) {
  const now = Date.now()
  const start = new Date(item.start).getTime()
  const end = new Date(item.end).getTime()
  const soonWindow = 1000 * 60 * 60 * 24 * 7

  if (now > end) return 'ended'
  if (now >= start) return 'active'
  if (start - now <= soonWindow) return 'soon'
  return 'pending'
}

function getTimelineStatus(item, locale = 'zh-CN') {
  const status = getTimelineStatusKey(item)
  if (status === 'ended') return homeText(locale, '已结束', 'Completed')
  if (status === 'active') return homeText(locale, '进行中', 'In Progress')
  if (status === 'soon') return homeText(locale, '即将开始', 'Starting Soon')
  return homeText(locale, '未开始', 'Upcoming')
}

function EventTimelineSection() {
  const { locale = 'zh-CN' } = useOutletContext()

  return (
    <section className={styles.sectionBlock}>
      <SectionHead
        eyebrow="EVENT TIMELINE"
        title={homeText(locale, '赛事时间轴', 'Event Timeline')}
        actionTo="/matches"
        actionText={homeText(locale, '查看赛程赛果', 'Open Matches')}
      />
      <div className={styles.eventTimelineGrid}>
        {EVENT_TIMELINE.map((item, index) => {
          const statusKey = getTimelineStatusKey(item)
          const status = getTimelineStatus(item, locale)
          const current = statusKey === 'soon' || statusKey === 'active'

          return (
            <article
              key={item.key}
              className={`${styles.eventTimelineCard} ${current ? styles.eventTimelineCardCurrent : ''}`}
            >
              <span className={styles.eventTimelineIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.eventTimelineMeta}>
                <span>{item.label}</span>
                <strong>{status}</strong>
              </div>
              <h3>{localeField(item.title, locale)}</h3>
              <time>{localeField(item.range, locale)}</time>
              <em>{localeField(item.text, locale)}</em>
            </article>
          )
        })}
      </div>
      <p className={styles.scheduleHint}>{homeText(locale, '时间安排以赛事公告为准。', 'Dates are based on the official event announcement.')}</p>
    </section>
  )
}

function FollowingSection({ following }) {
  const { locale = 'zh-CN', withSeason = path => path, seasonId } = useOutletContext()
  const team = following.primaryTeam
  const match = following.displayMatch
  const opponent = following.opponent
  const teamPath = team ? withSeason(`/teams/${routeId(team)}`) : withSeason('/following?manage=1')
  const matchPath = match ? withSeason(`/matches/${matchRouteId(match)}`) : withSeason('/matches?view=list&tab=following')

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="FOLLOWING" title={homeText(locale, '我的关注', 'My Follows')} />
      {!following.hasFavorites ? (
        <div className={styles.followEmpty}>
          <div>
            <strong>{homeText(locale, '我的关注', 'My Follows')}</strong>
            <span>{homeText(locale, '关注队伍后，将优先显示你的下一场比赛和相关赛果。', 'Follow teams to surface your next match and related results first.')}</span>
          </div>
          <div className={styles.followActions}>
            <Link to={withSeason('/following?manage=1')}>{homeText(locale, '选择关注队伍', 'Choose Teams')}</Link>
            <Link to={withSeason('/following?manage=1&tab=players')}>{homeText(locale, '关注选手', 'Follow Players')}</Link>
          </div>
        </div>
      ) : (
        <article className={styles.followBoard}>
          <Link to={teamPath} className={styles.followIdentity}>
            <span>PRIMARY FOLLOW</span>
            {team ? (
              <TeamLogo
                team={team}
                seasonId={seasonId}
                className={styles.followIdentityLogo}
                teamShortName={getTeamLabel(team)}
                teamName={getTeamTitle(team)}
              />
            ) : null}
            <strong title={getTeamTitle(team)}>{team ? getTeamLabel(team) : homeText(locale, '未设置', 'Not Set')}</strong>
            <em>{team ? getTeamTitle(team) : homeText(locale, '打开管理关注，选择主关注队伍。', 'Open follow management and choose a primary team.')}</em>
          </Link>

          <div className={styles.followNext}>
            <div className={styles.followNextHead}>
              <span>NEXT FOLLOWING MATCH</span>
              <strong>{homeText(locale, '下一场比赛', 'Next Match')}</strong>
            </div>

            {match ? (
              <Link to={matchPath} className={styles.followDuelCard}>
                <FollowDuelTeam team={match.team_a} align="right" />
                <b>VS</b>
                <FollowDuelTeam team={match.team_b} />
              </Link>
            ) : (
              <div className={styles.followNoMatch}>
                <strong>{homeText(locale, '当前轮暂无比赛', 'No Match This Round')}</strong>
                <span>{homeText(locale, '主关注队伍暂未出现在当前轮赛程中。', 'Your primary team is not scheduled in the current round.')}</span>
              </div>
            )}

            <div className={styles.followNextMeta}>
              <span>{match ? getShortTime(match, locale) : homeText(locale, '时间待定', 'Time TBD')}</span>
              <span>{match?.format || homeText(locale, '赛制待定', 'Format TBD')}</span>
              <span>{match ? getMatchStatusText(match, locale) : homeText(locale, '待排定', 'Pending')}</span>
            </div>
          </div>

          <aside className={styles.followSummaryPanel}>
            <div className={styles.followStats}>
              <div>
                <span>{homeText(locale, '关注队伍', 'Teams')}</span>
                <strong>{following.favoriteTeamCount}</strong>
              </div>
              <div>
                <span>{homeText(locale, '关注选手', 'Players')}</span>
                <strong>{following.favoritePlayerCount}</strong>
              </div>
            </div>
            <Link className={styles.followPrimaryAction} to={withSeason('/following')}>{homeText(locale, '进入我的关注 →', 'Open Following ->')}</Link>
            <nav className={styles.followTextLinks} aria-label={homeText(locale, '关注管理', 'Follow Management')}>
              {match ? <Link to={matchPath}>{homeText(locale, '比赛详情 →', 'Match Details ->')}</Link> : null}
              {opponent ? <Link to={withSeason(`/teams/${routeId(opponent)}`)}>{homeText(locale, '对手资料 →', 'Opponent Profile ->')}</Link> : null}
              {team ? <Link to={teamPath}>{homeText(locale, '队伍资料 →', 'Team Profile ->')}</Link> : null}
            </nav>
          </aside>
        </article>
      )}
    </section>
  )
}

function AdvancementResultsSection({ overview, advance, latest }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const hasData = advance.hasStarted || latest.hasResults
  const zones = [
    { key: 'direct', label: homeText(locale, '晋级区', 'Advance Zone'), rows: safeArr(advance.zones?.direct) },
    { key: 'contest', label: homeText(locale, '竞争区', 'Bubble Zone'), rows: safeArr(advance.zones?.contest) },
    { key: 'danger', label: homeText(locale, '危险区', 'At Risk'), rows: safeArr(advance.zones?.danger) }
  ]
  const advanceLabel = advanceSlotsText(overview.advancementLabel, locale)
  const ruleLine = isEnglishLocale(locale)
    ? `${overview.expectedRounds} Swiss rounds · ${advanceLabel} advance`
    : `${overview.expectedRounds} 轮瑞士轮 · ${overview.advancementLabel} 晋级`

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="ADVANCE / RESULTS" title={homeText(locale, '晋级形势 / 最新赛果', 'Advance / Latest Results')} />
      {!hasData ? (
        <div className={styles.preDataGrid}>
          <article>
            <span>{homeText(locale, '晋级规则', 'Advance Rules')}</span>
            <strong>{ruleLine}</strong>
            <p>{homeText(locale, '排名、Buchholz 和同分规则会在首轮完成后进入主要视图。', 'Standings, Buchholz, and tiebreakers move into the main view after round one.')}</p>
          </article>
          <article>
            <span>{homeText(locale, '数据状态', 'Data Status')}</span>
            <strong>{homeText(locale, '积分榜将在首轮比赛完成后生成。', 'Standings generate after round one is complete.')}</strong>
            <p>{homeText(locale, '赛后完成核对后更新赛果与数据。', 'Results and stats update after post-match verification.')}</p>
          </article>
        </div>
      ) : (
        <div className={styles.advanceResultGrid}>
          <article className={styles.advanceCard}>
            <header>
              <span>{homeText(locale, '晋级形势', 'Advance Picture')}</span>
              <strong>{latest.completed} / {latest.total}</strong>
              <em>{homeText(locale, '当前轮次进度', 'Current round progress')}</em>
            </header>
            <div className={styles.zoneGrid}>
              {zones.map(zone => (
                <div key={zone.key}>
                  <span>{zone.label}</span>
                  <strong>{zone.rows.length}</strong>
                  <em>{zone.rows.slice(0, 3).map(formatTeamName).join(' / ') || homeText(locale, '待更新', 'Pending')}</em>
                </div>
              ))}
            </div>
            <Link to={withSeason('/advance')}>{homeText(locale, '查看完整晋级形势', 'View Full Advance Hub')}</Link>
          </article>

          <article className={styles.resultsCard}>
            <header>
              <span>{homeText(locale, '最新赛果', 'Latest Results')}</span>
              <Link to={withSeason('/matches?view=list&tab=finished')}>{homeText(locale, '查看全部赛果', 'View All Results')}</Link>
            </header>
            {latest.matches.length ? latest.matches.slice(0, 3).map(match => (
              <MatchCard key={matchRouteId(match)} match={match} result compact />
            )) : (
              <div className={styles.emptyMini}>
                <strong>{homeText(locale, '暂无赛果', 'No Results Yet')}</strong>
                <span>{homeText(locale, '赛果确认后将显示最近完成的比赛。', 'Recently completed matches will appear after results are confirmed.')}</span>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  )
}

function ResourcesSection({ resources }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const [primary, ...secondary] = resources

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="EVENT RESOURCES" title={homeText(locale, '赛事资料', 'Event Resources')} />
      <div className={styles.resourceGrid}>
        {primary ? (
          <Link to={withSeason(primary.to)} className={styles.resourcePrimary}>
            <span>{primary.label}</span>
            <strong>{primary.title}</strong>
            <em>{primary.text}</em>
          </Link>
        ) : null}
        <div className={styles.resourceSecondaryGrid}>
          {secondary.map(item => (
            <Link key={item.key} to={withSeason(item.to)}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <em>{item.text}</em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function OverviewMetric({ label, value, meta, tone = 'default' }) {
  return (
    <div className={`${styles.overviewMetric} ${tone === 'strong' ? styles.overviewMetricStrong : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{meta}</em>
    </div>
  )
}

function OverviewNextMatch({ match, label }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const nextLabel = label || homeText(locale, '快速进入下一场', 'Open Next Match')

  if (!match) {
    return (
      <div className={styles.overviewNoMatch}>
        <strong>{homeText(locale, '下一场待定', 'Next Match TBD')}</strong>
        <span>{homeText(locale, '赛程公布后将显示最值得关注的下一场比赛。', 'The next key match appears after the schedule is published.')}</span>
      </div>
    )
  }

  return (
    <Link to={withSeason(`/matches/${matchRouteId(match)}`)} className={styles.overviewNextMatch}>
      <span className={styles.overviewNextLabel}>{nextLabel}</span>
      <div className={styles.overviewNextDuel}>
        <TeamMark team={match.team_a} align="right" />
        <b>VS</b>
        <TeamMark team={match.team_b} />
      </div>
      <div className={styles.overviewNextMeta}>
        <time>{getShortTime(match, locale)}</time>
        <span>{match.format || 'TBD'}</span>
        <em>{getMatchStatusText(match, locale)}</em>
      </div>
    </Link>
  )
}

function OverviewDashboard({ overview, summary, latest }) {
  const { withSeason = path => path } = useOutletContext()
  const nextMatch = overview.round?.nextMatch || null
  const statusMetrics = [
    { label: '当前阶段', value: overview.currentStage, meta: 'STAGE', tone: 'strong' },
    { label: '下一开赛', value: overview.nextStartLabel, meta: 'NEXT' },
    { label: '本轮进度', value: overview.roundProgressLabel, meta: 'ROUND' }
  ]
  const baseMetrics = [
    { label: '赛程规模', value: `${summary.matches} 场`, meta: 'MATCHES' },
    { label: '参赛规模', value: `${summary.teams} 队 / ${summary.players} 人`, meta: 'ROSTER' },
    { label: '数据状态', value: summary.maps ? `${summary.maps} 图` : '比赛后更新', meta: 'DATA' }
  ]

  return (
    <section className={styles.overviewBoard}>
      <div className={styles.overviewLead}>
        <span className={styles.commandKicker}>EVENT OVERVIEW</span>
        <div className={styles.overviewTitle}>
          <strong>{overview.eventCode}</strong>
          <h1>{overview.seasonName}</h1>
          <p>跟进赛季进度与核心数据。赛程、赛果和关键对局可前往赛程赛果查看。</p>
        </div>
        <div className={styles.overviewActions}>
          <Link to={withSeason('/matches')}>进入赛程赛果</Link>
          <Link to={withSeason('/advance')}>查看晋级形势</Link>
          <Link to={withSeason('/following')}>我的关注</Link>
        </div>
      </div>

      <aside className={styles.overviewPanel}>
        <header className={styles.overviewPanelHead}>
          <span>EVENT STATUS</span>
          <strong>赛事状态</strong>
          <em>{latest.completed} / {latest.total} 已完成</em>
        </header>
        <div className={styles.overviewStatusGrid}>
          {statusMetrics.map(item => <OverviewMetric key={item.label} {...item} />)}
        </div>
        <OverviewNextMatch match={nextMatch} />
        <div className={styles.overviewMetrics}>
          {baseMetrics.map(item => <OverviewMetric key={item.label} {...item} />)}
        </div>
      </aside>
    </section>
  )
}

function getPlayerLabel(player, locale = 'zh-CN') {
  return player?.display_name || player?.nickname || player?.player_name || homeText(locale, '等待数据', 'Awaiting Data')
}

function DataPulseSection({ dataPulse }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const cards = [
    {
      key: 'ranking',
      label: 'PLAYER RANKING',
      title: homeText(locale, '选手排行', 'Player Ranking'),
      value: dataPulse.topDamage ? getPlayerLabel(dataPulse.topDamage, locale) : homeText(locale, '等待数据', 'Awaiting Data'),
      meta: dataPulse.topDamage
        ? `${homeText(locale, '伤害', 'Damage')} ${Number(dataPulse.topDamage.avg_dmg || 0).toFixed(0)} /10`
        : homeText(locale, '比赛后更新', 'Updates after matches'),
      to: '/leaderboard'
    },
    {
      key: 'heroes',
      label: 'HERO META',
      title: homeText(locale, '英雄数据', 'Hero Data'),
      value: dataPulse.topHero?.name ? formatOwHeroName(dataPulse.topHero.name, locale) : homeText(locale, '等待数据', 'Awaiting Data'),
      meta: dataPulse.topHero ? countText(locale, dataPulse.topHero.count, '次记录', 'record') : homeText(locale, '英雄出场统计', 'Hero pick stats'),
      to: '/heroes'
    },
    {
      key: 'maps',
      label: 'MAP META',
      title: homeText(locale, '地图数据', 'Map Data'),
      value: dataPulse.topMap?.name ? formatOwMapName(dataPulse.topMap.name, locale) : homeText(locale, '等待数据', 'Awaiting Data'),
      meta: dataPulse.topMap ? countText(locale, dataPulse.topMap.count, '次登场', 'appearance') : homeText(locale, '地图登场统计', 'Map pick stats'),
      to: '/maps'
    }
  ]

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="STATS / PLAY" title={homeText(locale, '数据排行与电竞经理', 'Stats & Fantasy Manager')} />
      <div className={styles.dataPlayLayout}>
        <div className={styles.dataPulseGroup}>
          <div className={styles.dataGroupHead}>
            <span>STATS</span>
            <strong>{homeText(locale, '数据排行', 'Stats Hub')}</strong>
            <em>{homeText(locale, '比赛结束后更新选手、英雄和地图数据。', 'Player, hero, and map stats update after matches.')}</em>
          </div>
          <div className={styles.dataPulseGrid}>
            {cards.map(card => (
              <Link key={card.key} to={withSeason(card.to)} className={styles.dataPulseCard}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <b>{card.value}</b>
                <em>{card.meta}</em>
              </Link>
            ))}
          </div>
        </div>
        <Link to={withSeason('/fantasy')} className={styles.playEntryCard}>
          <span>FANTASY MANAGER</span>
          <i className={styles.playStatusBadge}>{homeText(locale, '开发中', 'In Development')}</i>
          <strong>{homeText(locale, '电竞经理', 'Fantasy Manager')}</strong>
          <b>{homeText(locale, '电竞经理玩法', 'Fantasy Mode')}</b>
          <em>{homeText(locale, '阵容经营与对战挑战会持续补全，当前先作为独立入口保留。', 'Roster building and challenge systems are still being expanded; this stays as the future mode entry.')}</em>
        </Link>
      </div>
    </section>
  )
}

function OverviewGatewaySection({ overview, summary, latest }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const hasData = summary.maps > 0 || latest.completed > 0
  const advanceStatus = latest.completed > 0
    ? (isEn ? 'Updating' : '更新中')
    : (isEn ? 'After round one' : '首轮后生成')
  const gateways = [
    {
      key: 'matches',
      label: 'MATCHES',
      title: homeText(locale, '赛程赛果', 'Matches'),
      status: homeValue(overview.statusText, locale),
      text: homeText(locale, '进入完整赛程、赛果和比赛详情。', 'Full schedule, results, filters, and match dossiers.'),
      to: '/matches',
      primary: true
    },
    {
      key: 'roster',
      label: 'ROSTER',
      title: homeText(locale, '参赛阵容', 'Roster'),
      status: teamPlayerScaleText(locale, summary.teams, summary.players),
      text: homeText(locale, '战队、选手与赛事职员目录。', 'Team, player, and staff directory.'),
      to: '/teams'
    },
    {
      key: 'advance',
      label: 'ADVANCE',
      title: homeText(locale, '晋级形势', 'Advance'),
      status: advanceStatus,
      text: homeText(locale, '排名、晋级区与后续阶段。', 'Standings, advance zones, and later stages.'),
      to: '/advance'
    },
    {
      key: 'database',
      label: 'STATS',
      title: homeText(locale, '数据排行', 'Stats'),
      status: hasData ? homeText(locale, `${summary.maps} 图已记录`, `${summary.maps} maps recorded`) : homeText(locale, '比赛后更新', 'After matches'),
      text: homeText(locale, '选手、英雄和地图数据入口。', 'Player, hero, and map data entry.'),
      to: '/leaderboard'
    },
    {
      key: 'fantasy',
      label: 'MANAGER',
      title: homeText(locale, '电竞经理', 'Fantasy Manager'),
      status: homeText(locale, '开发中', 'In development'),
      text: homeText(locale, '独立玩法入口，后续继续补全。', 'Standalone mode entry, expanding later.'),
      to: '/fantasy'
    }
  ]

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="EVENT LINKS" title={homeText(locale, '赛事入口', 'Event Links')} />
      <div className={styles.gatewayGrid}>
        {gateways.map(item => (
          <Link
            key={item.key}
            to={withSeason(item.to)}
            className={`${styles.gatewayCard} ${item.primary ? styles.gatewayCardPrimary : ''}`}
          >
            <span>{item.label}</span>
            <b className={styles.gatewayStatus}>{item.status}</b>
            <strong>{item.title}</strong>
            <em>{item.text}</em>
          </Link>
        ))}
      </div>
    </section>
  )
}

function LiveOverview({ overview, following, advance, latest, summary, dataPulse, featuredMatches }) {
  return (
    <>
      <CommandBoard overview={overview} featuredMatches={featuredMatches} />
      <EventTimelineSection />
      <AdvancementResultsSection overview={overview} advance={advance} latest={latest} />
      <OverviewGatewaySection overview={overview} summary={summary} latest={latest} />
      <DataPulseSection dataPulse={dataPulse} />
      <FollowingSection following={following} />
    </>
  )
}

function ArchiveConclusion({ overview, archive, summary }) {
  const { locale = 'zh-CN', withSeason = path => path, seasonId } = useOutletContext()
  const champion = archive.champion
  const runnerUp = archive.runnerUp
  const finalMatch = archive.finalMatch
  const dataKing = archive.dataKings?.[0]

  return (
    <section className={`${styles.archiveBlock} ${styles.archiveConclusion}`}>
      <div className={styles.archiveHallLead}>
        <span className={styles.eyebrow}>SEASON CONCLUSION</span>
        <h1>{overview.eventCode}</h1>
        <p>{homeValue(overview.seasonName, locale)}</p>
        <div className={styles.archiveLegacyLine}>
          <span>
            <em>CHAMPION</em>
            <strong>{champion ? formatTeamName(champion) : '-'}</strong>
          </span>
          <span>
            <em>FINAL</em>
            <strong>{finalMatch ? formatMatchScore(finalMatch) : '-'}</strong>
          </span>
          <span>
            <em>DATA KING</em>
            <strong>{dataKing?.player ? getPlayerLabel(dataKing.player, locale) : homeText(locale, '等待数据', 'Awaiting Data')}</strong>
          </span>
        </div>
        <div className={styles.archiveHallBadges}>
          <span>{countText(locale, summary.matches, '场比赛', 'match')}</span>
          <span>{countText(locale, summary.maps, '张地图', 'map')}</span>
          <span>{teamPlayerScaleText(locale, summary.teams, summary.players)}</span>
        </div>
      </div>

      <div className={styles.archiveTrophyGrid}>
        <Link to={withSeason(`/teams/${routeId(champion)}`)} className={styles.archiveChampionPanel}>
          <span>{homeText(locale, '冠军', 'Champion')}</span>
          <TeamLogo team={champion} seasonId={seasonId} className={styles.archiveChampionLogo} />
          <strong>{formatTeamName(champion)}</strong>
          <em>{formatTeamFullName(champion)}</em>
        </Link>

        <div className={styles.archiveFinalRecord}>
          <span>{homeText(locale, '总决赛', 'Grand Final')}</span>
          <strong>{finalMatch ? formatMatchScore(finalMatch) : '-'}</strong>
          <em>
            {champion ? formatTeamName(champion) : homeText(locale, '冠军', 'Champion')} vs {runnerUp ? formatTeamName(runnerUp) : homeText(locale, '亚军', 'Runner-up')}
          </em>
        </div>
      </div>
    </section>
  )
}

function ArchiveFinalTeam({ team, champion }) {
  const { locale = 'zh-CN', seasonId } = useOutletContext()
  const winner = isSameTeam(team, champion)

  return (
    <span className={`${styles.archiveFinalTeam} ${winner ? styles.archiveFinalTeamWinner : ''}`}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.archiveFinalLogo} />
      <span>
        <strong>{formatTeamName(team)}</strong>
        <em>{formatTeamFullName(team)}</em>
      </span>
      {winner ? <b>{homeText(locale, '冠军', 'Champion')}</b> : null}
    </span>
  )
}

function ArchiveFinal({ finalMatch, archive }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="GRAND FINAL" title={homeText(locale, '总决赛', 'Grand Final')} actionTo="/matches" actionText={homeText(locale, '比赛档案', 'Match Archive')} />
      {finalMatch ? (
        <Link to={withSeason(`/matches/${matchRouteId(finalMatch)}`)} className={styles.archiveFinalShowcase}>
          <div className={styles.archiveFinalStage}>
            <span>GRAND FINAL</span>
            <strong>{formatMatchScore(finalMatch)}</strong>
            <em>{getShortTime(finalMatch, locale)} · {finalMatch.format || 'FT4'}</em>
          </div>
          <div className={styles.archiveFinalDuel}>
            <ArchiveFinalTeam team={finalMatch.team_a} champion={archive.champion} />
            <b>{formatMatchScore(finalMatch)}</b>
            <ArchiveFinalTeam team={finalMatch.team_b} champion={archive.champion} />
          </div>
          <span className={styles.archiveFinalLink}>{homeText(locale, '查看总决赛档案 →', 'View Grand Final Dossier ->')}</span>
        </Link>
      ) : (
        <div className={styles.emptyMini}>
          <strong>{homeText(locale, '暂无总决赛记录', 'No Grand Final Record')}</strong>
          <span>{homeText(locale, '档案数据更新后会显示最终对局。', 'The final matchup appears after archive data updates.')}</span>
        </div>
      )}
    </section>
  )
}

function ArchiveReview({ includeReview }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const reviewItems = [
    {
      label: 'PATH',
      title: homeText(locale, '冠军之路', 'Champion Path'),
      text: homeText(locale, '回看冠军队伍从瑞士轮到决赛的关键节点。', 'Trace the champion team from Swiss rounds to the final.'),
      to: '/review'
    },
    {
      label: 'MATCHES',
      title: homeText(locale, '关键比赛', 'Key Matches'),
      text: homeText(locale, '复盘影响晋级、淘汰和冠军归属的代表性对局。', 'Revisit the matches that shaped advancement, eliminations, and the title.'),
      to: '/matches'
    },
    {
      label: 'STARS',
      title: homeText(locale, '选手表现', 'Player Standouts'),
      text: homeText(locale, '查看数据王、职责领跑者和赛季代表选手。', 'Review data leaders, role leaders, and season standouts.'),
      to: '/leaderboard'
    }
  ]

  return (
    <section className={`${styles.archiveBlock} ${styles.archiveReview}`}>
      <div className={styles.archiveReviewLead}>
        <span className={styles.eyebrow}>SEASON REVIEW</span>
        <h2>{homeText(locale, '赛季回顾', 'Season Review')}</h2>
        <p>{homeText(locale, '回顾冠军路径、经典对局与选手表现，重温完整赛季故事。', 'Review the champion path, classic matches, and player performances across the season.')}</p>
        <div className={styles.archiveReviewLinks}>
          {includeReview ? <Link to={withSeason('/review')}>{homeText(locale, '进入回顾中心', 'Open Review Hub')}</Link> : null}
          <Link to={withSeason('/advance')}>{homeText(locale, '晋级路线', 'Advance Path')}</Link>
          <Link to={withSeason('/leaderboard')}>{homeText(locale, '数据排行', 'Leaderboard')}</Link>
        </div>
      </div>

      <div className={styles.archiveReviewCards}>
        {reviewItems.map(item => (
          <Link key={item.label} to={withSeason(item.to)}>
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <em>{item.text}</em>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ArchiveDataVault({ summary, dataPulse }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const topHero = dataPulse.topHero?.name ? formatOwHeroName(dataPulse.topHero.name, locale) : homeText(locale, '等待数据', 'Awaiting Data')
  const topMap = dataPulse.topMap?.name ? formatOwMapName(dataPulse.topMap.name, locale) : homeText(locale, '等待数据', 'Awaiting Data')
  const cards = [
    {
      key: 'matches',
      label: 'MATCH ARCHIVE',
      title: homeText(locale, '比赛档案', 'Match Archive'),
      value: countText(locale, summary.matches, '场', 'match'),
      meta: isEnglishLocale(locale) ? `${summary.maps} maps recorded` : `${summary.maps} 张地图记录`,
      to: '/matches'
    },
    {
      key: 'players',
      label: 'PLAYER DATABASE',
      title: homeText(locale, '选手数据库', 'Player Database'),
      value: countText(locale, summary.players, '名', 'player'),
      meta: isEnglishLocale(locale) ? `${summary.teams} teams entered` : `${summary.teams} 支队伍参赛`,
      to: '/leaderboard'
    },
    {
      key: 'heroes',
      label: 'HERO META',
      title: homeText(locale, '英雄热度', 'Hero Heat'),
      value: topHero,
      meta: dataPulse.topHero ? countText(locale, dataPulse.topHero.count, '次记录', 'record') : homeText(locale, '英雄数据档案', 'Hero data archive'),
      to: '/heroes'
    },
    {
      key: 'maps',
      label: 'MAP META',
      title: homeText(locale, '地图热度', 'Map Heat'),
      value: topMap,
      meta: dataPulse.topMap ? countText(locale, dataPulse.topMap.count, '次登场', 'appearance') : homeText(locale, '地图数据档案', 'Map data archive'),
      to: '/maps'
    }
  ]

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="DATA ARCHIVE" title={homeText(locale, '数据档案馆', 'Data Archive')} actionTo="/leaderboard" actionText={homeText(locale, '进入数据排行', 'Open Leaderboard')} />
      <div className={styles.archiveVault}>
        <div className={styles.archiveVaultLead}>
          <span>SEASON DATABASE</span>
          <strong>{homeText(locale, '赛季数据已经归档', 'Season data is archived')}</strong>
          <em>{homeText(locale, '集中浏览比赛记录、选手表现、英雄热度和地图使用。', 'Browse match records, player performance, hero heat, and map usage in one place.')}</em>
        </div>
        <div className={styles.archiveVaultGrid}>
          {cards.map(card => (
            <Link key={card.key} to={withSeason(card.to)} className={styles.archiveVaultCard}>
              <span>{card.label}</span>
              <strong>{card.title}</strong>
              <b>{card.value}</b>
              <em>{card.meta}</em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchiveHonors({ archive, dataPulse }) {
  const { locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const dataAwards = archive.dataKings.map(item => ({
    key: item.key,
    label: homeValue(item.label, locale),
    title: getPlayerLabel(item.player, locale),
    meta: `${item.value} ${item.unit}`,
    to: `/players/${routeId(item.player)}`
  }))
  const [mvpAward, ...secondaryDataAwards] = dataAwards
  const seasonAwards = [
    ...secondaryDataAwards,
    dataPulse.topHero?.name ? {
      key: 'hero-heat',
      label: homeText(locale, '英雄热度', 'Hero Heat'),
      title: formatOwHeroName(dataPulse.topHero.name, locale),
      meta: countText(locale, dataPulse.topHero.count, '次记录', 'record'),
      to: '/heroes'
    } : null,
    dataPulse.topMap?.name ? {
      key: 'map-heat',
      label: homeText(locale, '地图热度', 'Map Heat'),
      title: formatOwMapName(dataPulse.topMap.name, locale),
      meta: countText(locale, dataPulse.topMap.count, '次登场', 'appearance'),
      to: '/maps'
    } : null
  ].filter(Boolean)

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="HONORS" title={homeText(locale, '赛季荣誉', 'Season Honors')} actionTo="/advance" actionText={homeText(locale, '完整排名', 'Full Ranking')} />
      <div className={styles.honorGrid}>
        <div className={styles.rankingList}>
          {archive.finalRanking.slice(0, 8).map(team => (
            <Link key={team.team_id || team.id} to={withSeason(`/teams/${routeId(team)}`)}>
              <span>{String(team.final_rank || '').padStart(2, '0')}</span>
              <strong>{formatTeamName(team)}</strong>
              <em>{homeValue(team.final_rank_text || '最终排名', locale)}</em>
            </Link>
          ))}
        </div>
        <aside className={styles.seasonAwardsPanel}>
          <header className={styles.seasonAwardsHead}>
            <span>SEASON AWARDS</span>
            <strong>{homeText(locale, '赛季奖项', 'Season Awards')}</strong>
            <em>{homeText(locale, '数据奖项、英雄热度与地图热度的归档摘要。', 'Archived leaders across player stats, hero picks, and map picks.')}</em>
          </header>

          {mvpAward ? (
            <Link to={withSeason(mvpAward.to)} className={styles.seasonAwardMvp}>
              <span>DATA MVP</span>
              <strong>{mvpAward.title}</strong>
              <em>{mvpAward.label} · {mvpAward.meta}</em>
            </Link>
          ) : null}

          <div className={styles.seasonAwardList}>
            {seasonAwards.map((item, index) => (
              <Link key={item.key} to={withSeason(item.to)} className={styles.seasonAwardRow}>
                <span className={styles.seasonAwardIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.seasonAwardBody}>
                  <em>{item.label}</em>
                  <strong>{item.title}</strong>
                </span>
                <b>{item.meta}</b>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

function ArchiveClassicMatches({ matches }) {
  const { locale = 'zh-CN' } = useOutletContext()
  const [primary, ...secondary] = matches.slice(0, 5)

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="CLASSIC MATCHES" title={homeText(locale, '经典比赛', 'Classic Matches')} actionTo="/matches" actionText={homeText(locale, '全部赛果', 'All Results')} />
      <div className={styles.archiveClassicLayout}>
        {primary ? (
          <div className={styles.archiveClassicPrimary}>
            <span>CHAMPION PATH</span>
            <strong>{homeText(locale, '冠军之路精选', 'Champion Path Picks')}</strong>
            <MatchCard match={primary} result />
          </div>
        ) : null}
        <div className={styles.archiveMatchGrid}>
          {secondary.map(match => (
            <MatchCard key={matchRouteId(match)} match={match} result compact />
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchiveResources({ includeReview }) {
  const { locale = 'zh-CN' } = useOutletContext()
  const resources = [
    includeReview
      ? {
        key: 'review',
        label: 'REVIEW',
        title: homeText(locale, '赛季回顾', 'Season Review'),
        text: homeText(locale, '赛季故事、冠军路径和选手表现。', 'Season stories, champion path, and player performances.'),
        to: '/review',
        primary: true
      }
      : {
        key: 'matches',
        label: 'MATCHES',
        title: homeText(locale, '比赛档案', 'Match Archive'),
        text: homeText(locale, '完整比分、地图和比赛记录。', 'Full scores, maps, and match records.'),
        to: '/matches',
        primary: true
      },
    {
      key: 'matches',
      label: 'MATCHES',
      title: homeText(locale, '赛程赛果', 'Matches'),
      text: homeText(locale, '完整比分、地图和比赛记录。', 'Full scores, maps, and match records.'),
      to: '/matches'
    },
    {
      key: 'advance',
      label: 'ADVANCE',
      title: homeText(locale, '最终排名', 'Final Ranking'),
      text: homeText(locale, '晋级路径与最终名次。', 'Advance path and final placements.'),
      to: '/advance'
    },
    {
      key: 'database',
      label: 'STATS',
      title: homeText(locale, '数据排行', 'Leaderboard'),
      text: homeText(locale, '选手、队伍和英雄数据。', 'Player, team, and hero data.'),
      to: '/leaderboard'
    },
    {
      key: 'manager',
      label: 'MANAGER',
      title: homeText(locale, '电竞经理', 'Fantasy Manager'),
      text: homeText(locale, '阵容经营与对战挑战。', 'Roster management and battle challenges.'),
      to: '/fantasy'
    }
  ]

  return <ResourcesSection resources={resources} />
}

function ArchiveOverview({ overview, archive, archiveMatches, summary, dataPulse, includeReview }) {
  return (
    <>
      <ArchiveConclusion overview={overview} archive={archive} summary={summary} />
      <ArchiveFinal finalMatch={archive.finalMatch} archive={archive} />
      <ArchiveReview includeReview={includeReview} />
      <ArchiveDataVault summary={summary} dataPulse={dataPulse} />
      <ArchiveHonors archive={archive} dataPulse={dataPulse} />
      <ArchiveClassicMatches matches={archiveMatches} />
      <ArchiveResources includeReview={includeReview} />
    </>
  )
}

export default function HomePage() {
  const {
    db,
    season,
    reviewAvailable,
    favorites
  } = useOutletContext()

  const overview = useMemo(() => getOverviewStatus(db, season), [db, season])
  const following = useMemo(() => getFollowingOverview(db, favorites), [db, favorites])
  const latest = useMemo(() => getLatestResultSnapshot(db, 3), [db])
  const advance = useMemo(() => getAdvanceSnapshot(db, 8, season), [db, season])
  const archive = useMemo(() => getArchiveHighlights(db), [db])
  const archiveMatches = useMemo(() => getArchiveFeaturedMatches(db, season, 5), [db, season])
  const summary = useMemo(() => getHomeSummary(db), [db])
  const dataPulse = useMemo(() => getDataPulse(db), [db])
  const featuredMatches = useMemo(
    () => getFeaturedCurrentMatches(db, { limit: 3, season, round: overview.round, favorites }),
    [db, season, overview.round, favorites]
  )
  const includeReview = overview.variant === 'archive' && (reviewAvailable || season?.reviewEnabled)

  return (
    <div className={styles.shell}>
      {overview.variant === 'archive' ? (
        <ArchiveOverview
          overview={overview}
          archive={archive}
          archiveMatches={archiveMatches}
          summary={summary}
          dataPulse={dataPulse}
          includeReview={includeReview}
        />
      ) : (
        <LiveOverview
          overview={overview}
          following={following}
          advance={advance}
          latest={latest}
          summary={summary}
          dataPulse={dataPulse}
          featuredMatches={featuredMatches}
        />
      )}
    </div>
  )
}
