import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { isWeeklyOverview } from '../../features/weekly-overview/weeklyOverviewModel.js'
import { getMatchArchiveStages } from '../../lib/matchArchiveStages.js'
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import {
  filterMatches,
  getAllMatches,
  getFilterOptions,
  getGroupedMatches,
  getMapSummary,
  getMatchDisplayTeams,
  getMatchHubData,
  getMatchScore,
  getMatchStatus,
  getMatchStatusText,
  getMatchTimeLabel,
  getRoundText,
  getTabMatches,
  isFavoriteMatch,
  safeArr
} from '../../lib/matchesSelectors.js'
import FollowingMatchSummary from '../../components/matches/FollowingMatchSummary.jsx'
import LiveBroadcastEntry from '../../components/matches/LiveBroadcastEntry.jsx'
import MatchHubBoard from '../../components/matches/MatchHubBoard.jsx'
import RoundScheduleSection from '../../components/matches/RoundScheduleSection.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import SignalMatchIndex from '../../components/matches/SignalMatchIndex.jsx'
import SignalScheduleFeatured from '../../features/match-schedule/SignalScheduleFeatured.jsx'
import { isScheduleListSearch, resetScheduleSearch } from '../../features/match-schedule/schedulePresentation.js'
import {
  getRestoreScrollY,
  getReturnState,
  restoreWindowScroll,
  saveReturnScroll
} from '../../lib/navigationState.js'
import styles from './MatchesPage.module.css'

const TABS = [
  { key: 'all', title: '全部比赛', label: 'ALL' },
  { key: 'round', title: '本轮比赛', label: 'ROUND' },
  { key: 'following', title: '我的关注', label: 'FOLLOWING' },
  { key: 'upcoming', title: '未开始', label: 'UPCOMING' },
  { key: 'finished', title: '已完成', label: 'FINISHED' }
]

const ARCHIVE_MODE_TABS = [
  { key: 'all', title: '全部档案', label: 'ALL RECORDS' },
  { key: 'following', title: '我的关注', label: 'FOLLOWING' }
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: '全部状态' },
  { value: 'upcoming', label: '未开始' },
  { value: 'live', label: '进行中' },
  { value: 'finished', label: '已完成' }
]

function cleanMatchesHubPath() {
  return '/matches'
}

function cleanMatchesListPath(seasonIdOrParams, params = {}) {
  const targetParams = arguments.length > 1 ? params : seasonIdOrParams || {}
  const search = new URLSearchParams()
  search.set('view', 'list')
  Object.entries(targetParams).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  return `/matches?${search.toString()}`
}

function normalizeTab(searchParams) {
  if (searchParams.get('following') === '1') return 'following'
  const status = String(searchParams.get('status') || '').toLowerCase()
  if (['finished', 'complete', 'completed'].includes(status)) return 'finished'
  if (['upcoming', 'pending'].includes(status)) return 'upcoming'
  const tab = String(searchParams.get('tab') || 'all').toLowerCase()
  return TABS.some(item => item.key === tab) ? tab : 'all'
}

function queryValue(searchParams, key, fallback = 'ALL') {
  return searchParams.get(key) || fallback
}

function roundKey(value) {
  const text = String(value || '').trim().toLowerCase()
  const number = text.match(/\d+/)?.[0]
  return number ? `round-${number}` : text
}

function resolveRoundValue(value, options) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'ALL') return 'ALL'
  return options.find(option => option === raw) ||
    options.find(option => roundKey(option) === roundKey(raw)) ||
    raw
}

function resolveStatusValue(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || raw === 'all') return 'ALL'
  if (['complete', 'completed', 'finished'].includes(raw)) return 'finished'
  if (['pending', 'upcoming'].includes(raw)) return 'upcoming'
  if (['live', 'in_progress'].includes(raw)) return 'live'
  return raw
}

function SectionLabel({ code, title }) {
  return (
    <div className={styles.sectionLabel}>
      <span>{code}</span>
      <strong>{title}</strong>
    </div>
  )
}

function getTeamShort(team) {
  return team?.team_short_name || team?.short || team?.team_name || team?.name || 'TBD'
}

function getTeamFull(team) {
  return team?.team_name || team?.name || getTeamShort(team)
}

function handleArchiveRowKeyDown(event) {
  if (event.key !== ' ') return
  event.preventDefault()
  event.currentTarget.click()
}

function getArchiveRoundBadge(match) {
  const stage = String(match?.stage || '').trim().toUpperCase()
  const round = String(match?.round || '').trim().toUpperCase()
  const roundNumber = round.match(/\d+/)?.[0]
  if (stage && roundNumber) return `${stage}-R${roundNumber}`
  if (roundNumber) return `ROUND-${roundNumber}`
  return round || stage || 'MATCH'
}

function TeamBlock({ team, source, seasonId, align = 'left' }) {
  return (
    <span className={`${styles.teamBlock} ${align === 'right' ? styles.teamBlockRight : ''}`} title={team.full}>
      <TeamLogo team={source} seasonId={seasonId} className={styles.matchTeamLogo} />
      <span>
        <strong>{team.short}</strong>
        <em>{team.full}</em>
      </span>
    </span>
  )
}

function HubTeamBlock({ team, seasonId, align = 'left', large = false }) {
  return (
    <span className={`${styles.hubTeamBlock} ${align === 'right' ? styles.hubTeamBlockRight : ''}`}>
      <TeamLogo
        team={team}
        seasonId={seasonId}
        large={large}
        className={`${styles.teamLogo} ${large ? styles.teamLogoLarge : ''}`}
      />
      <span>
        <strong>{getTeamShort(team)}</strong>
        <em>{getTeamFull(team)}</em>
      </span>
    </span>
  )
}

function LogoDuel({ match, seasonId, score = false, large = false }) {
  return (
    <div className={`${styles.logoDuel} ${large ? styles.logoDuelLarge : ''}`}>
      <HubTeamBlock team={match?.team_a} seasonId={seasonId} align="right" large={large} />
      <b>{score ? getMatchScore(match) : 'vs'}</b>
      <HubTeamBlock team={match?.team_b} seasonId={seasonId} large={large} />
    </div>
  )
}

function MatchTeams({ match, score = false, seasonId }) {
  const teams = getMatchDisplayTeams(match)
  return (
    <div className={styles.matchupLine}>
      <TeamBlock team={teams.teamA} source={match?.team_a} seasonId={seasonId} align="right" />
      <b>{score ? getMatchScore(match) : 'vs'}</b>
      <TeamBlock team={teams.teamB} source={match?.team_b} seasonId={seasonId} />
    </div>
  )
}

function MatchRow({ match, compact = false }) {
  const { withSeason = path => path, favorites, seasonId, locale = 'zh-CN' } = useOutletContext()
  const location = useLocation()
  const status = getMatchStatus(match)
  const finished = status === 'finished'
  const mapSummary = finished ? getMapSummary(match, locale) : ''
  const favorite = isFavoriteMatch(match, favorites)

  return (
    <Link
      to={withSeason(`/matches/${match.match_id}`)}
      state={getReturnState(location)}
      className={[
        styles.matchRow,
        compact ? styles.matchRowCompact : '',
        favorite ? styles.matchRowFavorite : '',
        styles[`matchRow_${status}`] || ''
      ].filter(Boolean).join(' ')}
      aria-label={`${getTeamFull(match?.team_a)} vs ${getTeamFull(match?.team_b)}，${match.format || 'TBD'}，${getMatchStatusText(match)}`}
      title={`${getTeamFull(match?.team_a)} vs ${getTeamFull(match?.team_b)}`}
      onClick={() => saveReturnScroll(location)}
      onKeyDown={handleArchiveRowKeyDown}
    >
      <div className={styles.matchTime}>
        <span>{getMatchTimeLabel(match)}</span>
        <em>{getArchiveRoundBadge(match)}</em>
      </div>

      <div className={styles.matchMain}>
        <MatchTeams match={match} score={finished} seasonId={seasonId} />
        {mapSummary ? (
          <div className={styles.matchMeta}>
            <span>{mapSummary}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.matchAux}>
        <span>{match.format || 'TBD'}</span>
        <strong>{getMatchStatusText(match)}</strong>
        <em aria-hidden="true">→</em>
      </div>
    </Link>
  )
}

function EmptyState({ tab, seasonId }) {
  const uiLocale = useUiLocale()
  const { withSeason = path => path } = useOutletContext()
  const isFollowing = tab === 'following'
  const cleanMatchesPath = cleanMatchesListPath(seasonId, { tab: 'all' })

  if (isFollowing) {
    return (
      <div className={styles.emptyState}>
        <strong>{uiText("还没有关注队伍", uiLocale)}</strong>
        <span>{uiText("关注队伍后，将按时间展示相关赛程和赛果。", uiLocale)}</span>
        <div className={styles.emptyActions}>
          <Link to={withSeason('/me?section=following&manage=1')}>{uiText("选择关注队伍", uiLocale)}</Link>
          <Link to={withSeason('/me?section=following&manage=1&tab=players')}>{uiText("关注选手", uiLocale)}</Link>
          <Link to={withSeason('/me?section=following')}>{uiText("进入我的关注", uiLocale)}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.emptyState}>
      <strong>{uiText("没有符合条件的比赛", uiLocale)}</strong>
      <span>{uiText("当前筛选组合没有找到比赛记录，可以调整条件或回到完整档案。", uiLocale)}</span>
      <Link to={withSeason(cleanMatchesPath)}>{uiText("清除筛选", uiLocale)}</Link>
    </div>
  )
}

function HubSection({ id, code, title, actionTo, actionText, tone = 'light', children }) {
  const { seasonId, withSeason = path => path } = useOutletContext()
  return (
    <section id={id} className={`${styles.hubSection} ${tone === 'dark' ? styles.hubSectionDark : ''}`} data-tone={tone}>
      <div className={styles.hubSectionHead}>
        <div>
          <SectionLabel code={code} title={title} />
          <h2>{title}</h2>
        </div>
        {actionTo ? (
          <Link to={withSeason(cleanMatchesListPath(seasonId, actionTo))}>
            {actionText}<span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function FeaturedMatchCard({ match, primary = false, compact = false }) {
  const { withSeason = path => path, seasonId, locale = 'zh-CN' } = useOutletContext()
  const location = useLocation()
  const teams = getMatchDisplayTeams(match)
  const mapSummary = getMapSummary(match, locale)
  const status = getMatchStatus(match)
  const matchCode = match?.match_id || match?.match_display_name || match?.raw_match_id || 'MATCH RECORD'

  return (
    <Link
      to={withSeason(`/matches/${match.match_id}`)}
      state={getReturnState(location)}
      className={`${styles.featuredMatchCard} ${primary ? styles.featuredMatchCardPrimary : ''} ${compact ? styles.featuredMatchCardCompact : ''}`}
      data-status={status}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={styles.featuredCardEyebrow}>
        <i>{primary ? 'TITLE MATCH' : getRoundText(match)}</i>
        <em>{matchCode}</em>
      </span>
      <LogoDuel match={match} seasonId={seasonId} score large={primary} />
      <div className={styles.featuredMatchCopy}>
        <strong>{primary ? uiText("总决赛最终记录", locale) : `${teams.teamA.short} / ${teams.teamB.short}`}</strong>
        <em>{teams.teamA.full} vs {teams.teamB.full}</em>
        <p>{match.format || 'TBD'} · {getMatchStatusText(match)}{mapSummary ? ` · ${mapSummary}` : ''}</p>
      </div>
      <b>
        {compact ? null : primary ? uiText("打开冠军战记录", locale) : uiText("查看比赛记录", locale)}
        <span aria-hidden="true">{compact ? '→' : '↗'}</span>
      </b>
    </Link>
  )
}

function ArchiveFeaturedHub({ hub }) {
  const uiLocale = useUiLocale()
  const { isKprHybridDesign = false } = useOutletContext()
  const rows = hub.keyArchiveMatches
  const primary = rows[0]
  const secondary = rows.slice(1, 4)

  return (
    <HubSection id="match-title-game" code={isKprHybridDesign ? '02 / KEY MATCHES' : '02 / TITLE MATCH'} title={isKprHybridDesign ? uiText("季后赛关键战", uiLocale) : uiText("决赛与关键战", uiLocale)} actionTo={{ tab: 'finished' }} actionText="完整档案" tone="dark">
      {isKprHybridDesign ? <div className={styles.archiveKeyGrid}>
        {secondary.map(match => <FeaturedMatchCard key={match.match_id} match={match} />)}
      </div> : <div className={styles.archiveFeatureLayout}>
        {primary ? <FeaturedMatchCard match={primary} primary /> : null}
        <div className={styles.archiveSideList}>
          <div className={styles.archiveSideListHead}>
            <span>PLAYOFF PICKS</span>
            <strong>{uiText("季后赛关键战", uiLocale)}</strong>
          </div>
          {secondary.map(match => <FeaturedMatchCard key={match.match_id} match={match} compact />)}
        </div>
      </div>}
    </HubSection>
  )
}

function ArchiveClassicHub({ hub }) {
  const uiLocale = useUiLocale()
  const rows = hub.keyArchiveMatches.slice(4, 8)
  if (!rows.length) return null

  return (
    <HubSection id="match-turning-points" code="03 / TURNING POINTS" title={uiText("冠军路上的转折点", uiLocale)} actionTo={{ tab: 'finished' }} actionText="查看档案">
      <div className={styles.classicGrid}>
        {rows.map(match => <FeaturedMatchCard key={match.match_id} match={match} />)}
      </div>
    </HubSection>
  )
}

function ArchiveStageHub({ hub }) {
  const uiLocale = useUiLocale()
  const { seasonId, withSeason = path => path } = useOutletContext()
  const links = getArchiveStageEntries(hub, seasonId).slice(0, 3)

  return (
    <HubSection
      id="match-index"
      code="04 / MATCH INDEX"
      title={uiText("比赛档案", uiLocale)}
      actionTo={{ tab: 'all' }}
      actionText={`浏览全部 ${hub.summary.total} 场`}
      tone="dark"
    >
      <div className={styles.archiveGateway}>
        <div className={styles.archiveGatewayMain} data-total={hub.summary.total}>
          <span>{String(getMatchArchiveStages(hub.matches).length).padStart(2, '0')} STAGES / {hub.summary.total} RECORDS</span>
          <strong>{uiText("按阶段回看", uiLocale)}</strong>
          <p>{uiText("沿各个比赛阶段，回看这个赛季的完整比赛档案。", uiLocale)}</p>
          <Link to={withSeason(cleanMatchesListPath(seasonId, { tab: 'all' }))}>{uiText("查看全部比赛 ", uiLocale)}<span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className={styles.stageEntryGrid}>
          {links.map(link => (
            <Link key={`${link.title}-${link.label}`} to={withSeason(link.to)}>
              <header>
                <span>{link.index}</span>
                <b>{String(link.count).padStart(2, '0')}</b>
              </header>
              <div>
                <strong>{link.title}</strong>
                <span>{link.label}</span>
              </div>
              <i aria-hidden="true">↗</i>
            </Link>
          ))}
        </div>
      </div>
    </HubSection>
  )
}

function getArchiveStageEntries(hub, seasonId) {
  const rows = safeArr(hub?.matches)
  const stages = getMatchArchiveStages(rows)
  return [
    ...stages.map((stage, index) => ({ ...stage, index: String(index + 1).padStart(2, '0'),
      to: cleanMatchesListPath(seasonId, { tab: 'finished', stage: stage.value }) })),
    {
      index: String(stages.length + 1).padStart(2, '0'),
      title: '全部比赛',
      label: 'ALL RECORDS',
      value: 'ALL',
      count: hub?.summary?.total || rows.length,
      to: cleanMatchesListPath(seasonId, { tab: 'all' })
    }
  ]
}

function ArchiveHero({ hub, seasonId }) {
  const { withSeason = path => path, locale = 'zh-CN' } = useOutletContext()
  const location = useLocation()
  const finalMatch = hub.keyArchiveMatches[0]
  const mapSummary = finalMatch ? getMapSummary(finalMatch, locale) : ''
  const stageEntries = getArchiveStageEntries(hub, seasonId)

  return (
    <section id="match-overview" className={styles.archiveHero} aria-labelledby="match-archive-title">
      <span className={styles.archiveHeroGrid} aria-hidden="true" />
      <span className={styles.archiveHeroOrbit} aria-hidden="true"><i /><i /><b>FRIES CUP / MATCH SIGNAL / {seasonId || 'FCR2026'}</b></span>
      <header className={styles.archiveHeroSignal}>
        <span><i />01 / MATCH ARCHIVE</span>
        <em>{seasonId || 'FCR2026'} · ARCHIVED</em>
      </header>

      <div className={styles.archiveHeroMain}>
        <div className={styles.archiveHeroCopy}>
          <span>{uiText("SEASON RECORD / 赛程赛果", locale)}</span>
          <h1 id="match-archive-title"><span>MATCHES</span><strong>{uiText("每一场都有坐标。", locale)}</strong></h1>
          <p>{uiText("比分停在终场，比赛仍留在档案里。沿着阶段、对手与时间，重新进入这个赛季。", locale)}</p>
          <div className={styles.archiveHeroSummary}>
            <span><strong>{hub.summary.finished}</strong><em>{uiText("场正式比赛完成归档", locale)}</em></span>
            <Link to={withSeason(cleanMatchesListPath(seasonId, { tab: 'all' }))}>{uiText("浏览完整档案 ", locale)}<b aria-hidden="true">↗</b></Link>
          </div>
        </div>

        {finalMatch ? (
          <Link
            to={withSeason(`/matches/${finalMatch.match_id}`)}
            state={getReturnState(location)}
            className={styles.archiveFinalTicket}
            onClick={() => saveReturnScroll(location)}
          >
            <header><span>LAST RECORD</span><strong>{getRoundText(finalMatch)}</strong></header>
            <LogoDuel match={finalMatch} seasonId={seasonId} score large />
            <p>{finalMatch.format || 'TBD'} · {getMatchStatusText(finalMatch)}{mapSummary ? ` · ${mapSummary}` : ''}</p>
            <footer><span>{getMatchTimeLabel(finalMatch)}</span><strong>OPEN MATCH <i aria-hidden="true">↗</i></strong></footer>
          </Link>
        ) : null}
      </div>

      <nav className={styles.archiveStageRail} aria-label={uiText("比赛档案阶段索引", locale)}>
        {stageEntries.map(entry => (
          <Link key={entry.index} to={withSeason(entry.to)}>
            <span>{entry.index}</span>
            <strong>{entry.title}<em>{entry.label}</em></strong>
            <b>{String(entry.count).padStart(2, '0')}</b>
          </Link>
        ))}
      </nav>
      <footer className={styles.archiveHeroFooter}>
        <nav aria-label={uiText("比赛页面章节", locale)}>
          <a href="#match-overview" aria-current="location"><b>01</b>{uiText("赛季坐标", locale)}</a>
          <a href="#match-title-game"><b>02</b>{uiText("关键比赛", locale)}</a>
          <a href="#match-turning-points"><b>03</b>{uiText("关键转折", locale)}</a>
          <a href="#match-index"><b>04</b>{uiText("完整索引", locale)}</a>
        </nav>
        <span>{uiText("向下滚动，沿比赛继续 ", locale)}<b aria-hidden="true">↓</b></span>
      </footer>
    </section>
  )
}

function MatchHub({ hub, seasonId }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.hubSurface}>
      {hub.isArchive ? <nav className={styles.matchArchiveRail} aria-label={uiText("比赛档案章节索引", uiLocale)}>
        <span><img src="/logos/fries-cup-symbol.png" alt="" /><small>MATCH SIGNAL</small></span>
        <a href="#match-overview"><b>01</b><span>{uiText("赛季坐标", uiLocale)}</span></a>
        <a href="#match-title-game"><b>02</b><span>{uiText("关键比赛", uiLocale)}</span></a>
        <a href="#match-turning-points"><b>03</b><span>{uiText("关键转折", uiLocale)}</span></a>
        <a href="#match-index"><b>04</b><span>{uiText("完整索引", uiLocale)}</span></a>
      </nav> : null}
      {hub.isArchive ? (
        <ArchiveHero hub={hub} seasonId={seasonId} />
      ) : (
        <MatchHubBoard summary={hub.currentRoundSummary} />
      )}

      {hub.isArchive ? (
        <>
          <ArchiveFeaturedHub hub={hub} />
          <ArchiveClassicHub hub={hub} />
          <ArchiveStageHub hub={hub} />
        </>
      ) : (
        <>
          <LiveBroadcastEntry hub={hub} />
          <RoundScheduleSection hub={hub} />
          <FollowingMatchSummary hub={hub} />
        </>
      )}
    </div>
  )
}

function ArchiveStageNav({ hub, filters, updateQuery, seasonId }) {
  const uiLocale = useUiLocale()
  const entries = getArchiveStageEntries(hub, seasonId)
  const allEntry = entries.find(entry => entry.value === 'ALL')
  const stageEntries = [
    allEntry ? { ...allEntry, index: '00', title: uiText("全部档案", uiLocale) } : null,
    ...entries.filter(entry => entry.value !== 'ALL')
  ].filter(Boolean)
  const activeStage = String(filters.stage || 'ALL').toUpperCase()

  return (
    <nav className={styles.archiveStageNav} aria-label={uiText("比赛档案阶段", uiLocale)}>
      {stageEntries.map(entry => (
        <button
          key={entry.value}
          type="button"
          className={activeStage === entry.value ? styles.archiveStageNavActive : ''}
          onClick={() => updateQuery({ stage: entry.value, tab: 'all', status: '' })}
        >
          <span><b>{entry.index}</b><em>{entry.label}</em></span>
          <strong>{entry.title}</strong>
          <i>{String(entry.count).padStart(2, '0')}</i>
        </button>
      ))}
    </nav>
  )
}

function FilterBar({
  filters,
  options,
  updateQuery,
  resetFilters,
  focusSearch = false,
  isArchive = false,
  activeTab = 'all',
  setTab = () => {}
}) {
  const uiLocale = useUiLocale()
  const advancedKeys = isArchive ? ['round', 'status', 'format'] : ['stage', 'round', 'status', 'format']
  const advancedDirty = advancedKeys.some(key => filters[key] && filters[key] !== 'ALL')
  const hasStageFilter = isArchive && filters.stage && filters.stage !== 'ALL'
  const hasAnyFilter = advancedDirty || hasStageFilter || Boolean(filters.team || filters.teamId)
  const [advancedOpen, setAdvancedOpen] = useState(advancedDirty)
  const searchInputRef = useRef(null)
  const showAdvanced = advancedOpen || advancedDirty

  useEffect(() => {
    if (!focusSearch) return
    searchInputRef.current?.focus({ preventScroll: true })
  }, [focusSearch])

  return (
    <section className={styles.filters} data-archive={isArchive ? 'true' : undefined}>
      <div className={styles.filterQuickRow}>
        {isArchive ? (
          <div className={styles.archiveModeToggle} aria-label={uiText("档案查看模式", uiLocale)}>
            {ARCHIVE_MODE_TABS.map(tab => {
              const selected = tab.key === 'following'
                ? activeTab === 'following'
                : activeTab !== 'following'
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={selected ? styles.archiveModeToggleActive : ''}
                  onClick={() => setTab(tab.key)}
                >
                  {tab.title}<span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}
        <div className={`${styles.filterField} ${styles.searchField}`}>
          <label>{uiText("队伍搜索 ", uiLocale)}<span>TEAM</span></label>
          <ImeSafeInput
            ref={searchInputRef}
            value={filters.team}
            onValueChange={value => updateQuery({ team: value, teamId: null, query: null })}
            placeholder={uiText("输入队伍简称或名称", uiLocale)}
          />
        </div>
        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setAdvancedOpen(open => !open)}
        >{uiText("高级筛选 ", uiLocale)}<span>{showAdvanced ? 'HIDE' : 'FILTERS'}</span>
        </button>
        {hasAnyFilter ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              setAdvancedOpen(false)
              resetFilters()
            }}
          >{uiText("重置筛选 ", uiLocale)}<span>RESET</span>
          </button>
        ) : null}
      </div>
      {showAdvanced ? (
        <div className={styles.advancedFilters}>
          {!isArchive ? (
            <div className={styles.filterField}>
              <label>{uiText("阶段 ", uiLocale)}<span>STAGE</span></label>
              <select value={filters.stage} onChange={event => updateQuery({ stage: event.target.value })}>
                {options.stages.map(value => <option key={value} value={value}>{value === 'ALL' ? uiText("全部阶段", uiLocale) : value}</option>)}
              </select>
            </div>
          ) : null}
          <div className={styles.filterField}>
            <label>{uiText("轮次 ", uiLocale)}<span>ROUND</span></label>
            <select value={filters.round} onChange={event => updateQuery({ round: event.target.value })}>
              {options.rounds.map(value => <option key={value} value={value}>{value === 'ALL' ? uiText("全部轮次", uiLocale) : value}</option>)}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>{uiText("状态 ", uiLocale)}<span>STATUS</span></label>
            <select value={filters.status} onChange={event => updateQuery({ status: event.target.value })}>
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>{uiText("赛制 ", uiLocale)}<span>FORMAT</span></label>
            <select value={filters.format} onChange={event => updateQuery({ format: event.target.value })}>
              {options.formats.map(value => <option key={value} value={value}>{value === 'ALL' ? uiText("全部赛制", uiLocale) : value}</option>)}
            </select>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ArchiveGroupedMatchList({ groups }) {
  const uiLocale = useUiLocale()
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.key || '')

  if (!groups.length) return null
  const activeGroup = groups.find(group => group.key === activeGroupKey) || groups[0]
  const activeIndex = groups.findIndex(group => group.key === activeGroup.key)

  return (
    <div className={styles.archiveGroupedList}>
      <aside className={styles.archiveRoundIndex}>
        <header>
          <span>ROUND INDEX</span>
          <strong>{String(groups.length).padStart(2, '0')}{uiText(" 个轮次", uiLocale)}</strong>
        </header>
        <nav aria-label={uiText("轮次索引", uiLocale)}>
          {groups.map((group, index) => (
            <button
              key={group.key}
              type="button"
              className={group.key === activeGroup.key ? styles.archiveRoundActive : ''}
              aria-pressed={group.key === activeGroup.key}
              onClick={() => setActiveGroupKey(group.key)}
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span><strong>{group.title}</strong><em>{group.subtitle}</em></span>
              <i aria-hidden="true">→</i>
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.archiveMatchPanel} aria-live="polite">
        <header>
          <div>
            <span>SELECTED ROUND / {String(activeIndex + 1).padStart(2, '0')}</span>
            <h3>{activeGroup.title}</h3>
          </div>
          <strong>{String(activeGroup.matches.length).padStart(2, '0')}<em>MATCHES</em></strong>
        </header>
        <div className={styles.matchList}>
          {activeGroup.matches.map(match => <MatchRow key={match.match_id} match={match} />)}
        </div>
        <footer className={styles.archiveRoundRecord} aria-hidden="true">
          <span>ROUND ARCHIVE / {String(activeIndex + 1).padStart(2, '0')}</span>
          <strong>{activeGroup.title}</strong>
          <em>{String(activeGroup.matches.length).padStart(2, '0')} MATCH RECORDS</em>
        </footer>
      </section>
    </div>
  )
}

function GroupedMatchList({ groups, archiveWorkspace = false }) {
  if (!groups.length) return null
  if (archiveWorkspace) return <ArchiveGroupedMatchList groups={groups} />
  return (
    <div className={styles.groupedList}>
      {groups.map(group => (
        <details key={group.key} className={styles.matchGroup} open={group.defaultOpen}>
          <summary>
            <strong>{group.title}</strong>
            <span>{group.subtitle}</span>
          </summary>
          <div className={styles.matchList}>
            {group.matches.map(match => <MatchRow key={match.match_id} match={match} />)}
          </div>
        </details>
      ))}
    </div>
  )
}

function FullListView({ rows, groups, filters, options, activeTab, favoriteCount, updateQuery, resetFilters, setTab, seasonId, focusSearch, hub }) {
  const uiLocale = useUiLocale()
  const { withSeason = path => path } = useOutletContext()
  const cleanMatchesPath = withSeason(cleanMatchesListPath(seasonId, { tab: 'all' }))
  const isArchive = Boolean(hub?.isArchive)
  const archiveEntries = isArchive ? getArchiveStageEntries(hub, seasonId) : []
  const activeStageValue = String(filters.stage || 'ALL').toUpperCase()
  const activeStageEntry = archiveEntries.find(entry => entry.value === activeStageValue) ||
    archiveEntries.find(entry => entry.value === 'ALL')
  const archiveScopeTitle = activeStageEntry?.value === 'ALL' ? '比赛档案' : activeStageEntry?.title || '比赛档案'

  return (
    <div className={styles.listSurface}>
      <section className={styles.archiveHeader}>
        <span className={styles.archiveHeaderBackdrop} aria-hidden="true">ARCHIVE</span>
        <div className={styles.archiveHeaderCopy}>
          <SectionLabel code="02 / MATCH ARCHIVE" title={activeStageEntry?.label || uiText("完整比赛档案", uiLocale)} />
          <h2>{archiveScopeTitle}</h2>
          <strong className={styles.archiveHeaderStatement}>{uiText("找到每一场。", uiLocale)}</strong>
          <p>{uiText("按阶段、轮次、状态、赛制或队伍，定位这个赛季里的具体比赛记录。", uiLocale)}</p>
        </div>
        <div className={styles.archiveHeaderMetric}>
          <span>VISIBLE RECORDS <em>{activeStageEntry?.label || 'CURRENT SCOPE'}</em></span>
          <strong>{String(rows.length).padStart(2, '0')}</strong>
          <em>{hub?.summary?.total || rows.length}{uiText(" TOTAL / 当前筛选结果", uiLocale)}</em>
          <Link to={withSeason(cleanMatchesHubPath())} state={{ restoreScrollY: 0 }}>{uiText("返回精选回顾 ", uiLocale)}<b aria-hidden="true">↗</b></Link>
        </div>
      </section>

      {isArchive ? (
        <ArchiveStageNav hub={hub} filters={filters} updateQuery={updateQuery} seasonId={seasonId} />
      ) : (
        <section className={styles.tabs} aria-label="Match views">
          {TABS.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? styles.tabActive : ''}
              onClick={() => setTab(tab.key)}
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>{tab.title}</span>
              <em>{tab.label}</em>
            </button>
          ))}
        </section>
      )}

      <FilterBar
        filters={filters}
        options={options}
        updateQuery={updateQuery}
        resetFilters={resetFilters}
        focusSearch={focusSearch}
        isArchive={isArchive}
        activeTab={activeTab}
        setTab={setTab}
      />

      <section className={styles.listSection}>
        <div className={styles.listHead}>
          <div>
            <SectionLabel code={activeStageEntry?.label || activeTab.toUpperCase()} title={uiText("比赛列表", uiLocale)} />
            <h2>{isArchive ? activeStageEntry?.title || uiText("全部比赛", uiLocale) : TABS.find(tab => tab.key === activeTab)?.title || uiText("全部比赛", uiLocale)}</h2>
          </div>
          <div className={styles.listMeta}>
            <span>{rows.length}{uiText(" 场显示", uiLocale)}</span>
            {activeTab === 'following' ? <em>{favoriteCount}{uiText(" 个关注队伍", uiLocale)}</em> : null}
          </div>
        </div>

        {rows.length ? (
          <GroupedMatchList groups={groups} archiveWorkspace={isArchive} />
        ) : (
          <EmptyState tab={activeTab} seasonId={seasonId} />
        )}

        <div className={styles.detailNote}>
          <strong>{uiText("赛后资料", uiLocale)}</strong>
          <span>{uiText("完整地图结果和回放信息会在比赛详情页集中查看。", uiLocale)}</span>
          <Link to={cleanMatchesPath}>{uiText("全部比赛", uiLocale)}</Link>
        </div>
      </section>
    </div>
  )
}

export default function MatchesPage() {
  const { db, season, isKprHybridDesign } = useOutletContext()
  if (isKprHybridDesign && isWeeklyOverview(db, season)) return <Suspense fallback={null}><SignalWeeklySchedule /></Suspense>
  return <StandardMatchesPage />
}

const SignalWeeklySchedule = lazy(() => import('../../features/match-schedule/SignalWeeklySchedule.jsx'))

function StandardMatchesPage() {
  const { db, favorites, seasonId, isKprHybridDesign = false } = useOutletContext()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const restoreScrollY = getRestoreScrollY(location.state)
  const allMatches = getAllMatches(db)
  const options = getFilterOptions(allMatches)
  const hub = getMatchHubData(db, seasonId, favorites)
  const hasListQuery = ['tab', 'status', 'stage', 'round', 'format', 'team', 'teamId', 'query', 'following'].some(key => searchParams.has(key))
  const isListView = isKprHybridDesign ? isScheduleListSearch(searchParams) : searchParams.get('view') === 'list' || hasListQuery
  const focusSearch = searchParams.get('focus') === 'search'
  const activeTab = normalizeTab(searchParams)
  const filters = {
    stage: queryValue(searchParams, 'stage'),
    round: resolveRoundValue(queryValue(searchParams, 'round'), options.rounds),
    status: resolveStatusValue(queryValue(searchParams, 'status')),
    format: queryValue(searchParams, 'format'),
    team: searchParams.get('team') || searchParams.get('query') || '',
    teamId: searchParams.get('teamId') || ''
  }
  const tabRows = getTabMatches(allMatches, activeTab, favorites, filters.round)
  const rows = filterMatches(tabRows, filters)
  const groups = getGroupedMatches(rows, hub.isArchive ? 'stage' : 'roundDate')
  const favoriteCount = safeArr(favorites?.favoriteTeamIds).length

  useEffect(() => {
    if (restoreScrollY === null) return
    restoreWindowScroll(restoreScrollY)
  }, [location.key, restoreScrollY])

  const updateQuery = patch => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    Object.entries(patch).forEach(([key, value]) => {
      const normalized = String(value ?? '').trim()
      if (!normalized || normalized === 'ALL') next.delete(key)
      else next.set(key, normalized)
    })
    setSearchParams(next, isKprHybridDesign ? { replace: true, preventScrollReset: true } : undefined)
  }

  const setTab = key => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    next.set('tab', key)
    next.delete('following')
    next.delete('roundView')
    if (key === 'upcoming' || key === 'finished') next.delete('status')
    setSearchParams(next, isKprHybridDesign ? { preventScrollReset: true } : undefined)
  }

  const resetFilters = () => {
    if (isKprHybridDesign) {
      setSearchParams(resetScheduleSearch(searchParams), { replace: true, preventScrollReset: true })
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    ;['stage', 'round', 'status', 'format', 'team', 'teamId', 'query', 'roundView'].forEach(key => next.delete(key))
    setSearchParams(next)
  }

  const ListView = isKprHybridDesign ? SignalMatchIndex : FullListView

  return (
    <div className={isKprHybridDesign && (isListView || hub.isArchive) ? undefined : `${styles.shell} ${isKprHybridDesign ? styles.hybridShell : ''}`}>
      {isListView ? (
        <ListView
          rows={rows}
          groups={groups}
          filters={filters}
          options={options}
          activeTab={activeTab}
          favoriteCount={favoriteCount}
          updateQuery={updateQuery}
          resetFilters={resetFilters}
          setTab={setTab}
          seasonId={seasonId}
          focusSearch={focusSearch}
          hub={hub}
          stageEntries={getArchiveStageEntries(hub, seasonId)}
        />
      ) : (
        isKprHybridDesign && hub.isArchive ? <SignalScheduleFeatured hub={hub} /> : <MatchHub hub={hub} seasonId={seasonId} />
      )}
    </div>
  )
}
