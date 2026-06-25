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
  getFollowingOverview,
  getHomeSummary,
  getLatestResultSnapshot,
  getOverviewStatus,
  safeArr
} from '../../lib/homeSelectors.js'
import styles from './HomePage.module.css'

function routeId(entity) {
  return entity?.team_id || entity?.player_id || entity?.id || entity?.short || entity?.team_short_name || ''
}

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

function getShortTime(match) {
  if (!match) return '时间待定'
  if (match.scheduled_date && match.scheduled_time) {
    return `${String(match.scheduled_date).slice(5)} ${match.scheduled_time}`
  }

  const raw = match.scheduled_at || match.match_date || match.date
  const time = raw ? new Date(raw) : null
  if (!time || Number.isNaN(time.getTime())) return '时间待定'
  const mm = String(time.getMonth() + 1).padStart(2, '0')
  const dd = String(time.getDate()).padStart(2, '0')
  const hh = String(time.getHours()).padStart(2, '0')
  const mi = String(time.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function getMatchStatusText(match) {
  const status = String(match?.status || '').toUpperCase()
  if (['COMPLETE', 'COMPLETED'].includes(status)) return '已结束'
  if (['LIVE', 'IN_PROGRESS'].includes(status)) return '进行中'
  if (['POSTPONED', 'DELAYED'].includes(status)) return '延期'
  return '未开始'
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
  const { withSeason = path => path } = useOutletContext()
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
        {showTime ? <time>{getShortTime(match)}</time> : null}
        <strong>{match.format || 'TBD'}</strong>
        <em>{getMatchStatusText(match)}</em>
      </span>
      <span className={styles.boardArrow} aria-hidden="true">→</span>
    </Link>
  )
}

function MatchCard({ match, result = false, compact = false }) {
  const { withSeason = path => path } = useOutletContext()
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
        <span>{getShortTime(match)}</span>
        <span>{match.format || 'TBD'}</span>
        <em>详情</em>
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
  const { withSeason = path => path } = useOutletContext()
  const facts = [
    { label: '当前阶段', value: overview.currentStage },
    { label: '赛事状态', value: overview.statusText },
    { label: '下一开赛', value: overview.nextStartLabel },
    { label: '本轮进度', value: overview.roundProgressLabel },
    { label: '赛季规模', value: overview.seasonScaleLabel },
    { label: '晋级名额', value: overview.advancementLabel }
  ]

  return (
    <section className={styles.commandBoard}>
      <div className={styles.commandLead}>
        <span className={styles.commandKicker}>EVENT COMMAND BOARD</span>
        <div className={styles.commandTitle}>
          <strong>{overview.eventCode}</strong>
          <h1>{overview.seasonName}</h1>
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
          <Link to={withSeason('/matches?view=list&tab=round')}>查看本轮全部比赛</Link>
          <Link to={withSeason('/advance')}>查看晋级形势</Link>
          <Link to={withSeason('/following?manage=1')}>管理关注</Link>
        </div>
      </div>

      <aside className={styles.commandFeatured}>
        <div className={styles.commandFeaturedHead}>
          <span>FEATURED MATCHES</span>
          <strong>本轮重点比赛</strong>
          <em>{overview.round.roundLabel}</em>
        </div>
        <div className={styles.commandFeaturedGrid}>
          {featuredMatches.length ? featuredMatches.map((match, index) => (
            <MatchBoardRow key={matchRouteId(match)} match={match} index={index + 1} />
          )) : (
            <div className={styles.emptyMini}>
              <strong>暂无重点比赛</strong>
              <span>赛程发布后会在这里展示当前轮次的代表性对阵。</span>
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}

function RoundActivitySection({ round, slots }) {
  return (
    <section className={styles.sectionBlock}>
      <SectionHead
        eyebrow="ROUND ACTIVITY"
        title="本轮动态"
        actionTo="/matches?view=list&tab=round"
        actionText={`查看全部 ${round.total} 场比赛`}
      />
      <div className={styles.timeSlotGrid}>
        {slots.map(slot => (
          <article key={slot.key} className={styles.timeSlotCard}>
            <header>
              <time>{slot.timeLabel}</time>
              <span>{slot.matchCount} 场比赛</span>
            </header>
            <div className={styles.timeSlotMatches}>
              {slot.previewMatches.map((match, index) => (
                <MatchBoardRow
                  key={matchRouteId(match)}
                  match={match}
                  index={index + 1}
                  compact
                  showTime={false}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className={styles.scheduleHint}>赛程时间以页面最新数据为准。</p>
    </section>
  )
}

function FollowingSection({ following }) {
  const { withSeason = path => path, seasonId } = useOutletContext()
  const team = following.primaryTeam
  const match = following.displayMatch
  const opponent = following.opponent
  const teamPath = team ? withSeason(`/teams/${routeId(team)}`) : withSeason('/following?manage=1')
  const matchPath = match ? withSeason(`/matches/${matchRouteId(match)}`) : withSeason('/matches?view=list&tab=following')

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="FOLLOWING" title="我的关注" />
      {!following.hasFavorites ? (
        <div className={styles.followEmpty}>
          <div>
            <strong>我的关注</strong>
            <span>关注队伍后，这里会优先展示你的下一场比赛和相关赛果。</span>
          </div>
          <div className={styles.followActions}>
            <Link to={withSeason('/following?manage=1')}>选择关注队伍</Link>
            <Link to={withSeason('/following?manage=1&tab=players')}>关注选手</Link>
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
            <strong title={getTeamTitle(team)}>{team ? getTeamLabel(team) : '未设置'}</strong>
            <em>{team ? getTeamTitle(team) : '打开管理关注，选择主关注队伍。'}</em>
          </Link>

          <div className={styles.followNext}>
            <div className={styles.followNextHead}>
              <span>NEXT FOLLOWING MATCH</span>
              <strong>下一场比赛</strong>
            </div>

            {match ? (
              <Link to={matchPath} className={styles.followDuelCard}>
                <FollowDuelTeam team={match.team_a} align="right" />
                <b>VS</b>
                <FollowDuelTeam team={match.team_b} />
              </Link>
            ) : (
              <div className={styles.followNoMatch}>
                <strong>当前轮暂无比赛</strong>
                <span>主关注队伍暂未出现在当前轮赛程中。</span>
              </div>
            )}

            <div className={styles.followNextMeta}>
              <span>{match ? getShortTime(match) : '时间待定'}</span>
              <span>{match?.format || '赛制待定'}</span>
              <span>{match ? getMatchStatusText(match) : '待排定'}</span>
            </div>
          </div>

          <aside className={styles.followSummaryPanel}>
            <div className={styles.followStats}>
              <div>
                <span>关注队伍</span>
                <strong>{following.favoriteTeamCount}</strong>
              </div>
              <div>
                <span>关注选手</span>
                <strong>{following.favoritePlayerCount}</strong>
              </div>
            </div>
            <Link className={styles.followPrimaryAction} to={withSeason('/following')}>进入我的关注 →</Link>
            <nav className={styles.followTextLinks} aria-label="关注入口">
              {match ? <Link to={matchPath}>比赛详情 →</Link> : null}
              {opponent ? <Link to={withSeason(`/teams/${routeId(opponent)}`)}>对手资料 →</Link> : null}
              {team ? <Link to={teamPath}>队伍资料 →</Link> : null}
            </nav>
          </aside>
        </article>
      )}
    </section>
  )
}

function AdvancementResultsSection({ overview, advance, latest }) {
  const { withSeason = path => path } = useOutletContext()
  const hasData = advance.hasStarted || latest.hasResults
  const zones = [
    { key: 'direct', label: '晋级区', rows: safeArr(advance.zones?.direct) },
    { key: 'contest', label: '竞争区', rows: safeArr(advance.zones?.contest) },
    { key: 'danger', label: '危险区', rows: safeArr(advance.zones?.danger) }
  ]

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="ADVANCE / RESULTS" title="晋级形势 / 最新赛果" />
      {!hasData ? (
        <div className={styles.preDataGrid}>
          <article>
            <span>晋级规则</span>
            <strong>{overview.expectedRounds} 轮瑞士轮 · {overview.advancementLabel} 晋级</strong>
            <p>排名、Buchholz 和同分规则会在首轮完成后进入主要视图。</p>
          </article>
          <article>
            <span>数据状态</span>
            <strong>积分榜将在首轮比赛完成后生成。</strong>
            <p>赛果将在比赛结束并完成数据录入后更新。</p>
          </article>
        </div>
      ) : (
        <div className={styles.advanceResultGrid}>
          <article className={styles.advanceCard}>
            <header>
              <span>晋级形势</span>
              <strong>{latest.completed} / {latest.total}</strong>
              <em>当前轮次进度</em>
            </header>
            <div className={styles.zoneGrid}>
              {zones.map(zone => (
                <div key={zone.key}>
                  <span>{zone.label}</span>
                  <strong>{zone.rows.length}</strong>
                  <em>{zone.rows.slice(0, 3).map(formatTeamName).join(' / ') || '待生成'}</em>
                </div>
              ))}
            </div>
            <Link to={withSeason('/advance')}>查看完整晋级形势</Link>
          </article>

          <article className={styles.resultsCard}>
            <header>
              <span>最新赛果</span>
              <Link to={withSeason('/matches?view=list&tab=finished')}>查看全部赛果</Link>
            </header>
            {latest.matches.length ? latest.matches.slice(0, 3).map(match => (
              <MatchCard key={matchRouteId(match)} match={match} result compact />
            )) : (
              <div className={styles.emptyMini}>
                <strong>暂无赛果</strong>
                <span>赛后集中录入完成后会显示最近完成的比赛。</span>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  )
}

function ResourcesSection({ resources }) {
  const { withSeason = path => path } = useOutletContext()
  const [primary, ...secondary] = resources

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="EVENT RESOURCES" title="赛事资料" />
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

function OverviewNextMatch({ match, label = '快速进入下一场' }) {
  const { withSeason = path => path } = useOutletContext()

  if (!match) {
    return (
      <div className={styles.overviewNoMatch}>
        <strong>下一场待定</strong>
        <span>赛程发布后，这里只保留一场最关键的跳转。</span>
      </div>
    )
  }

  return (
    <Link to={withSeason(`/matches/${matchRouteId(match)}`)} className={styles.overviewNextMatch}>
      <span className={styles.overviewNextLabel}>{label}</span>
      <div className={styles.overviewNextDuel}>
        <TeamMark team={match.team_a} align="right" />
        <b>VS</b>
        <TeamMark team={match.team_b} />
      </div>
      <div className={styles.overviewNextMeta}>
        <time>{getShortTime(match)}</time>
        <span>{match.format || 'TBD'}</span>
        <em>{getMatchStatusText(match)}</em>
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
          <p>这里保留赛事状态、数据摘要和入口导航；完整赛程、首轮看板与重点比赛统一进入赛程赛果。</p>
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

function getPlayerLabel(player) {
  return player?.display_name || player?.nickname || player?.player_name || '等待数据'
}

function DataPulseSection({ dataPulse }) {
  const { withSeason = path => path } = useOutletContext()
  const cards = [
    {
      key: 'ranking',
      label: 'PLAYER RANKING',
      title: '选手排行',
      value: dataPulse.topDamage ? getPlayerLabel(dataPulse.topDamage) : '等待数据',
      meta: dataPulse.topDamage ? `伤害 ${Number(dataPulse.topDamage.avg_dmg || 0).toFixed(0)} /10` : '比赛数据生成后更新',
      to: '/leaderboard'
    },
    {
      key: 'heroes',
      label: 'HERO META',
      title: '英雄数据',
      value: dataPulse.topHero?.name || '等待数据',
      meta: dataPulse.topHero ? `${dataPulse.topHero.count} 次记录` : '英雄出场统计',
      to: '/heroes'
    },
    {
      key: 'maps',
      label: 'MAP META',
      title: '地图数据',
      value: dataPulse.topMap?.name || '等待数据',
      meta: dataPulse.topMap ? `${dataPulse.topMap.count} 次登场` : '地图登场统计',
      to: '/maps'
    }
  ]

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="DATABASE / PLAY" title="数据资料与玩法入口" />
      <div className={styles.dataPlayLayout}>
        <div className={styles.dataPulseGroup}>
          <div className={styles.dataGroupHead}>
            <span>DATABASE</span>
            <strong>数据资料</strong>
            <em>比赛录入后沉淀为选手、英雄和地图数据。</em>
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
          <strong>电竞经理</strong>
          <b>独立玩法入口</b>
          <em>阵容经营 / 对战玩法，暂时保留在赛事总览中。</em>
        </Link>
      </div>
    </section>
  )
}

function OverviewGatewaySection({ overview, summary, latest }) {
  const { withSeason = path => path } = useOutletContext()
  const hasData = summary.maps > 0 || latest.completed > 0
  const advanceStatus = latest.completed > 0 ? '更新中' : '首轮后生成'
  const gateways = [
    { key: 'matches', label: 'MATCHES', title: '赛程赛果', status: overview.statusText, text: '首轮看板、重点比赛、完整赛程与赛果。', to: '/matches', primary: true },
    { key: 'roster', label: 'ROSTER', title: '参赛阵容', status: `${summary.teams} 队 / ${summary.players} 人`, text: '参赛战队、选手与赛事职员目录。', to: '/teams' },
    { key: 'advance', label: 'ADVANCE', title: '晋级形势', status: advanceStatus, text: '瑞士轮排名、晋级区和后续阶段。', to: '/advance' },
    { key: 'database', label: 'DATABASE', title: '数据资料', status: hasData ? `${summary.maps} 图已记录` : '比赛后更新', text: '选手排行、英雄数据和地图数据。', to: '/leaderboard' },
    { key: 'fantasy', label: 'MANAGER', title: '电竞经理', status: '独立玩法', text: '暂作为独立玩法入口保留在总览中。', to: '/fantasy' }
  ]

  return (
    <section className={styles.sectionBlock}>
      <SectionHead eyebrow="MODULE GATEWAY" title="模块入口" />
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

function LiveOverview({ overview, following, advance, latest, summary, dataPulse }) {
  return (
    <>
      <OverviewDashboard overview={overview} summary={summary} latest={latest} />
      <OverviewGatewaySection overview={overview} summary={summary} latest={latest} />
      <DataPulseSection dataPulse={dataPulse} />
      <FollowingSection following={following} />
      <AdvancementResultsSection overview={overview} advance={advance} latest={latest} />
    </>
  )
}

function ArchiveConclusion({ overview, archive, summary }) {
  const { withSeason = path => path, seasonId } = useOutletContext()
  const champion = archive.champion
  const runnerUp = archive.runnerUp
  const finalMatch = archive.finalMatch
  const dataKing = archive.dataKings?.[0]

  return (
    <section className={`${styles.archiveBlock} ${styles.archiveConclusion}`}>
      <div className={styles.archiveHallLead}>
        <span className={styles.eyebrow}>SEASON CONCLUSION</span>
        <h1>{overview.eventCode}</h1>
        <p>{overview.seasonName}</p>
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
            <strong>{dataKing?.player ? getPlayerLabel(dataKing.player) : '等待数据'}</strong>
          </span>
        </div>
        <div className={styles.archiveHallBadges}>
          <span>{summary.matches} 场比赛</span>
          <span>{summary.maps} 张地图</span>
          <span>{summary.teams} 队 / {summary.players} 选手</span>
        </div>
      </div>

      <div className={styles.archiveTrophyGrid}>
        <Link to={withSeason(`/teams/${routeId(champion)}`)} className={styles.archiveChampionPanel}>
          <span>冠军</span>
          <TeamLogo team={champion} seasonId={seasonId} className={styles.archiveChampionLogo} />
          <strong>{formatTeamName(champion)}</strong>
          <em>{formatTeamFullName(champion)}</em>
        </Link>

        <div className={styles.archiveFinalRecord}>
          <span>总决赛</span>
          <strong>{finalMatch ? formatMatchScore(finalMatch) : '-'}</strong>
          <em>
            {champion ? formatTeamName(champion) : '冠军'} vs {runnerUp ? formatTeamName(runnerUp) : '亚军'}
          </em>
        </div>
      </div>
    </section>
  )
}

function ArchiveFinalTeam({ team, champion }) {
  const { seasonId } = useOutletContext()
  const winner = isSameTeam(team, champion)

  return (
    <span className={`${styles.archiveFinalTeam} ${winner ? styles.archiveFinalTeamWinner : ''}`}>
      <TeamLogo team={team} seasonId={seasonId} className={styles.archiveFinalLogo} />
      <span>
        <strong>{formatTeamName(team)}</strong>
        <em>{formatTeamFullName(team)}</em>
      </span>
      {winner ? <b>冠军</b> : null}
    </span>
  )
}

function ArchiveFinal({ finalMatch, archive }) {
  const { withSeason = path => path } = useOutletContext()

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="GRAND FINAL" title="总决赛" actionTo="/matches" actionText="比赛档案" />
      {finalMatch ? (
        <Link to={withSeason(`/matches/${matchRouteId(finalMatch)}`)} className={styles.archiveFinalShowcase}>
          <div className={styles.archiveFinalStage}>
            <span>GRAND FINAL</span>
            <strong>{formatMatchScore(finalMatch)}</strong>
            <em>{getShortTime(finalMatch)} · {finalMatch.format || 'FT4'}</em>
          </div>
          <div className={styles.archiveFinalDuel}>
            <ArchiveFinalTeam team={finalMatch.team_a} champion={archive.champion} />
            <b>{formatMatchScore(finalMatch)}</b>
            <ArchiveFinalTeam team={finalMatch.team_b} champion={archive.champion} />
          </div>
          <span className={styles.archiveFinalLink}>查看总决赛档案 →</span>
        </Link>
      ) : (
        <div className={styles.emptyMini}>
          <strong>暂无总决赛记录</strong>
          <span>档案数据更新后会显示最终对局。</span>
        </div>
      )}
    </section>
  )
}

function ArchiveReview({ includeReview }) {
  const { withSeason = path => path } = useOutletContext()
  const reviewItems = [
    { label: 'PATH', title: '冠军之路', text: '回看冠军队伍从瑞士轮到决赛的关键节点。', to: '/review' },
    { label: 'MATCHES', title: '关键比赛', text: '复盘影响晋级、淘汰和冠军归属的代表性对局。', to: '/matches' },
    { label: 'STARS', title: '选手表现', text: '查看数据王、职责领跑者和赛季代表选手。', to: '/leaderboard' }
  ]

  return (
    <section className={`${styles.archiveBlock} ${styles.archiveReview}`}>
      <div className={styles.archiveReviewLead}>
        <span className={styles.eyebrow}>SEASON REVIEW</span>
        <h2>赛季回顾</h2>
        <p>这是完结赛季最重要的叙事入口：冠军路径、经典对局、选手表现会在这里汇总成可回看的赛季故事。</p>
        <div className={styles.archiveReviewLinks}>
          {includeReview ? <Link to={withSeason('/review')}>进入回顾中心</Link> : null}
          <Link to={withSeason('/advance')}>晋级路线</Link>
          <Link to={withSeason('/leaderboard')}>数据排行</Link>
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

function ArchiveHonors({ archive }) {
  const { withSeason = path => path } = useOutletContext()

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="HONORS" title="赛季荣誉" actionTo="/advance" actionText="完整排名" />
      <div className={styles.honorGrid}>
        <div className={styles.rankingList}>
          {archive.finalRanking.slice(0, 8).map(team => (
            <Link key={team.team_id || team.id} to={withSeason(`/teams/${routeId(team)}`)}>
              <span>{String(team.final_rank || '').padStart(2, '0')}</span>
              <strong>{formatTeamName(team)}</strong>
              <em>{team.final_rank_text || '最终排名'}</em>
            </Link>
          ))}
        </div>
        <div className={styles.dataKingGrid}>
          {archive.dataKings.slice(0, 4).map(item => (
            <Link key={item.key} to={withSeason(`/players/${routeId(item.player)}`)}>
              <span>{item.label}</span>
              <strong>{item.player?.display_name || item.player?.player_name || item.player?.nickname}</strong>
              <em>{item.value} {item.unit}</em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchiveClassicMatches({ matches }) {
  const [primary, ...secondary] = matches.slice(0, 5)

  return (
    <section className={styles.archiveBlock}>
      <SectionHead eyebrow="CLASSIC MATCHES" title="经典比赛" actionTo="/matches" actionText="全部赛果" />
      <div className={styles.archiveClassicLayout}>
        {primary ? (
          <div className={styles.archiveClassicPrimary}>
            <span>CHAMPION PATH</span>
            <strong>冠军之路精选</strong>
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
  const resources = [
    includeReview
      ? { key: 'review', label: 'REVIEW', title: '赛季回顾', text: '赛季故事、冠军路径和选手表现。', to: '/review', primary: true }
      : { key: 'matches', label: 'MATCHES', title: '比赛档案', text: '完整比分、地图和比赛记录。', to: '/matches', primary: true },
    { key: 'matches', label: 'MATCHES', title: '赛程赛果', text: '完整比分、地图和比赛记录。', to: '/matches' },
    { key: 'advance', label: 'ADVANCE', title: '最终排名', text: '晋级路径与最终名次。', to: '/advance' },
    { key: 'database', label: 'DATABASE', title: '数据排行', text: '选手、队伍和英雄数据。', to: '/leaderboard' },
    { key: 'manager', label: 'MANAGER', title: '电竞经理', text: '独立玩法入口，完结赛季依然保留。', to: '/fantasy' }
  ]

  return <ResourcesSection resources={resources} />
}

function ArchiveOverview({ overview, archive, archiveMatches, summary, includeReview }) {
  return (
    <>
      <ArchiveConclusion overview={overview} archive={archive} summary={summary} />
      <ArchiveFinal finalMatch={archive.finalMatch} archive={archive} />
      <ArchiveReview includeReview={includeReview} />
      <ArchiveHonors archive={archive} />
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
  const includeReview = overview.variant === 'archive' && (reviewAvailable || season?.reviewEnabled)

  return (
    <div className={styles.shell}>
      {overview.variant === 'archive' ? (
        <ArchiveOverview
          overview={overview}
          archive={archive}
          archiveMatches={archiveMatches}
          summary={summary}
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
        />
      )}
    </div>
  )
}
