import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
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
import MatchHubBoard from '../../components/matches/MatchHubBoard.jsx'
import RoundScheduleSection from '../../components/matches/RoundScheduleSection.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import styles from './MatchesPage.module.css'

const TABS = [
  { key: 'all', title: '全部比赛', label: 'ALL' },
  { key: 'round', title: '本轮比赛', label: 'ROUND' },
  { key: 'following', title: '我的关注', label: 'FOLLOWING' },
  { key: 'upcoming', title: '未开始', label: 'UPCOMING' },
  { key: 'finished', title: '已完成', label: 'FINISHED' }
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

function getReturnTo(location) {
  return `${location.pathname}${location.search || ''}`
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
      state={{ returnTo: getReturnTo(location) }}
      className={[
        styles.matchRow,
        compact ? styles.matchRowCompact : '',
        favorite ? styles.matchRowFavorite : '',
        styles[`matchRow_${status}`] || ''
      ].filter(Boolean).join(' ')}
      aria-label={`${getTeamFull(match?.team_a)} vs ${getTeamFull(match?.team_b)}，${match.format || 'TBD'}，${getMatchStatusText(match)}`}
      title={`${getTeamFull(match?.team_a)} vs ${getTeamFull(match?.team_b)}`}
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
  const { withSeason = path => path } = useOutletContext()
  const isFollowing = tab === 'following'
  const cleanMatchesPath = cleanMatchesListPath(seasonId, { tab: 'all' })

  if (isFollowing) {
    return (
      <div className={styles.emptyState}>
        <strong>还没有关注队伍</strong>
        <span>关注队伍后，将按时间展示相关赛程和赛果。</span>
        <div className={styles.emptyActions}>
          <Link to={withSeason('/following?manage=1')}>选择关注队伍</Link>
          <Link to={withSeason('/following?manage=1&tab=players')}>关注选手</Link>
          <Link to={withSeason('/following')}>进入我的关注</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.emptyState}>
      <strong>??????</strong>
      <span>?????????????????????????</span>
      <Link to={cleanMatchesPath}>??????</Link>
    </div>
  )
}

function HubSection({ code, title, actionTo, actionText, children }) {
  const { seasonId } = useOutletContext()
  return (
    <section className={styles.hubSection}>
      <div className={styles.hubSectionHead}>
        <div>
          <SectionLabel code={code} title={title} />
          <h2>{title}</h2>
        </div>
        {actionTo ? <Link to={cleanMatchesListPath(seasonId, actionTo)}>{actionText}</Link> : null}
      </div>
      {children}
    </section>
  )
}

function FeaturedMatchCard({ match, primary = false }) {
  const { withSeason = path => path, seasonId, locale = 'zh-CN' } = useOutletContext()
  const location = useLocation()
  const teams = getMatchDisplayTeams(match)
  const mapSummary = getMapSummary(match, locale)

  return (
    <Link
      to={withSeason(`/matches/${match.match_id}`)}
      state={{ returnTo: getReturnTo(location) }}
      className={`${styles.featuredMatchCard} ${primary ? styles.featuredMatchCardPrimary : ''}`}
    >
      <span>{getRoundText(match)}</span>
      <LogoDuel match={match} seasonId={seasonId} score large={primary} />
      <strong>{teams.teamA.short} {getMatchScore(match)} {teams.teamB.short}</strong>
      <em>{teams.teamA.full} vs {teams.teamB.full}</em>
      <p>{match.format || 'TBD'} · {getMatchStatusText(match)}{mapSummary ? ` · ${mapSummary}` : ''}</p>
      <b>{primary ? '冠军战 · 查看详情' : '查看详情'}</b>
    </Link>
  )
}

function ArchiveFeaturedHub({ hub }) {
  const rows = hub.keyArchiveMatches
  const primary = rows[0]
  const secondary = rows.slice(1, 4)

  return (
    <HubSection code="A / FEATURED" title="赛季精选回顾" actionTo={{ tab: 'finished' }} actionText="完整档案">
      <div className={styles.archiveFeatureLayout}>
        {primary ? <FeaturedMatchCard match={primary} primary /> : null}
        <div className={styles.archiveSideList}>
          <span>PLAYOFF PICKS</span>
          {secondary.map(match => <FeaturedMatchCard key={match.match_id} match={match} />)}
        </div>
      </div>
    </HubSection>
  )
}

function ArchiveClassicHub({ hub }) {
  const rows = hub.keyArchiveMatches.slice(4, 8)
  if (!rows.length) return null

  return (
    <HubSection code="B / CLASSIC" title="经典比赛 / 冠军路径" actionTo={{ tab: 'finished' }} actionText="查看档案">
      <div className={styles.classicGrid}>
        {rows.map(match => <FeaturedMatchCard key={match.match_id} match={match} />)}
      </div>
    </HubSection>
  )
}

function ArchiveStageHub({ hub }) {
  const { seasonId } = useOutletContext()
  const links = [
    { title: '总决赛', label: 'GRAND FINALS', params: { tab: 'finished', round: 'GRAND FINALS' } },
    { title: '季后赛', label: 'PLAYOFFS', params: { tab: 'finished', stage: 'PLAYOFFS' } },
    { title: '瑞士轮第 6 轮', label: 'SWISS R6', params: { tab: 'finished', round: 'ROUND 6' } },
    { title: '瑞士轮第 5 轮', label: 'SWISS R5', params: { tab: 'finished', round: 'ROUND 5' } }
  ]

  return (
    <HubSection code="C / ARCHIVE" title="完整比赛档案">
      <div className={styles.archiveGateway}>
        <div className={styles.archiveGatewayMain}>
          <span>MATCH ARCHIVE</span>
          <strong>查看全部 {hub.summary.total} 场比赛</strong>
          <p>按阶段、轮次、状态和队伍筛选完整赛程赛果档案。</p>
          <Link to={cleanMatchesListPath(seasonId, { tab: 'all' })}>进入完整列表</Link>
        </div>
        <div className={styles.stageEntryGrid}>
          {links.map(link => (
            <Link key={`${link.title}-${link.label}`} to={cleanMatchesListPath(seasonId, link.params)}>
              <strong>{link.title}</strong>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </HubSection>
  )
}

function MatchHub({ hub, seasonId }) {
  return (
    <div className={styles.hubSurface}>
      {hub.isArchive ? (
        <section className={styles.hubHero}>
          <div>
            <SectionLabel code="SEASON ARCHIVE" title="赛程赛果" />
            <h1>精选回顾</h1>
            <p>{seasonId || 'FCA2026'} 赛季档案</p>
          </div>
          <div className={styles.hubHeroMeta}>
            <strong>{hub.summary.finished} 场已完成 · 精选总决赛与季后赛关键战</strong>
            <Link to={cleanMatchesListPath(seasonId, { tab: 'all' })}>查看完整比赛档案</Link>
          </div>
        </section>
      ) : (
        <MatchHubBoard summary={hub.currentRoundSummary} featuredMatches={hub.featuredMatches} />
      )}

      {hub.isArchive ? (
        <>
          <ArchiveFeaturedHub hub={hub} />
          <ArchiveClassicHub hub={hub} />
          <ArchiveStageHub hub={hub} />
        </>
      ) : (
        <>
          <RoundScheduleSection hub={hub} />
          <FollowingMatchSummary hub={hub} />
        </>
      )}
    </div>
  )
}

function FilterBar({ filters, options, updateQuery, resetFilters, focusSearch = false }) {
  const advancedDirty = ['stage', 'round', 'status', 'format'].some(key => filters[key] && filters[key] !== 'ALL')
  const hasAnyFilter = advancedDirty || Boolean(filters.team)
  const [advancedOpen, setAdvancedOpen] = useState(advancedDirty)
  const searchInputRef = useRef(null)
  const showAdvanced = advancedOpen || advancedDirty

  useEffect(() => {
    if (!focusSearch) return
    searchInputRef.current?.focus({ preventScroll: true })
  }, [focusSearch])

  return (
    <section className={styles.filters}>
      <div className={styles.filterQuickRow}>
        <div className={`${styles.filterField} ${styles.searchField}`}>
          <label>队伍搜索 <span>TEAM</span></label>
          <input
            ref={searchInputRef}
            value={filters.team}
            onChange={event => updateQuery({ team: event.target.value })}
            placeholder="输入队伍简称或名称"
          />
        </div>
        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setAdvancedOpen(open => !open)}
        >
          高级筛选 <span>{showAdvanced ? 'HIDE' : 'FILTERS'}</span>
        </button>
        {hasAnyFilter ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              setAdvancedOpen(false)
              resetFilters()
            }}
          >
            重置筛选 <span>RESET</span>
          </button>
        ) : null}
      </div>
      {showAdvanced ? (
        <div className={styles.advancedFilters}>
          <div className={styles.filterField}>
            <label>阶段 <span>STAGE</span></label>
            <select value={filters.stage} onChange={event => updateQuery({ stage: event.target.value })}>
              {options.stages.map(value => <option key={value} value={value}>{value === 'ALL' ? '全部阶段' : value}</option>)}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>轮次 <span>ROUND</span></label>
            <select value={filters.round} onChange={event => updateQuery({ round: event.target.value })}>
              {options.rounds.map(value => <option key={value} value={value}>{value === 'ALL' ? '全部轮次' : value}</option>)}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>状态 <span>STATUS</span></label>
            <select value={filters.status} onChange={event => updateQuery({ status: event.target.value })}>
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>赛制 <span>FORMAT</span></label>
            <select value={filters.format} onChange={event => updateQuery({ format: event.target.value })}>
              {options.formats.map(value => <option key={value} value={value}>{value === 'ALL' ? '全部赛制' : value}</option>)}
            </select>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function GroupedMatchList({ groups }) {
  if (!groups.length) return null
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

function FullListView({ rows, groups, filters, options, activeTab, favoriteCount, updateQuery, resetFilters, setTab, seasonId, focusSearch }) {
  const cleanMatchesPath = cleanMatchesListPath(seasonId, { tab: 'all' })

  return (
    <div className={styles.listSurface}>
      <section className={styles.archiveHeader}>
        <div>
          <SectionLabel code="MATCH ARCHIVE" title="完整比赛档案" />
          <h2>完整比赛档案</h2>
          <p>用于查找具体比赛，支持阶段、轮次、状态、赛制和队伍搜索。</p>
        </div>
        <Link to={cleanMatchesHubPath()}>返回 Match Hub</Link>
      </section>

      <section className={styles.tabs} aria-label="Match views">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? styles.tabActive : ''}
            onClick={() => setTab(tab.key)}
          >
            <span>{tab.title}</span>
            <em>{tab.label}</em>
          </button>
        ))}
      </section>

      <FilterBar
        filters={filters}
        options={options}
        updateQuery={updateQuery}
        resetFilters={resetFilters}
        focusSearch={focusSearch}
      />

      <section className={styles.listSection}>
        <div className={styles.listHead}>
          <div>
            <SectionLabel code={activeTab.toUpperCase()} title="比赛列表" />
            <h2>{TABS.find(tab => tab.key === activeTab)?.title || '全部比赛'}</h2>
          </div>
          <div className={styles.listMeta}>
            <span>{rows.length} 场显示</span>
            {activeTab === 'following' ? <em>{favoriteCount} 个关注队伍</em> : null}
          </div>
        </div>

        {rows.length ? (
          <GroupedMatchList groups={groups} />
        ) : (
          <EmptyState tab={activeTab} seasonId={seasonId} />
        )}

        <div className={styles.detailNote}>
          <strong>赛后资料</strong>
          <span>完整地图结果和回放信息会在比赛详情页集中查看。</span>
          <Link to={cleanMatchesPath}>全部比赛</Link>
        </div>
      </section>
    </div>
  )
}

export default function MatchesPage() {
  const { db, favorites, seasonId } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const allMatches = getAllMatches(db)
  const options = getFilterOptions(allMatches)
  const hub = getMatchHubData(db, seasonId, favorites)
  const hasListQuery = ['tab', 'status', 'stage', 'round', 'format', 'team', 'query', 'following'].some(key => searchParams.has(key))
  const isListView = searchParams.get('view') === 'list' || hasListQuery
  const focusSearch = searchParams.get('focus') === 'search'
  const activeTab = normalizeTab(searchParams)
  const filters = {
    stage: queryValue(searchParams, 'stage'),
    round: resolveRoundValue(queryValue(searchParams, 'round'), options.rounds),
    status: resolveStatusValue(queryValue(searchParams, 'status')),
    format: queryValue(searchParams, 'format'),
    team: searchParams.get('team') || searchParams.get('query') || ''
  }
  const tabRows = getTabMatches(allMatches, activeTab, favorites, filters.round)
  const rows = filterMatches(tabRows, filters)
  const groups = getGroupedMatches(rows, hub.isArchive ? 'stage' : 'roundDate')
  const favoriteCount = safeArr(favorites?.favoriteTeamIds).length

  const updateQuery = patch => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    Object.entries(patch).forEach(([key, value]) => {
      const normalized = String(value ?? '').trim()
      if (!normalized || normalized === 'ALL') next.delete(key)
      else next.set(key, normalized)
    })
    setSearchParams(next)
  }

  const setTab = key => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    next.set('tab', key)
    next.delete('following')
    if (key === 'upcoming' || key === 'finished') next.delete('status')
    setSearchParams(next)
  }

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'list')
    ;['stage', 'round', 'status', 'format', 'team', 'query'].forEach(key => next.delete(key))
    setSearchParams(next)
  }

  return (
    <div className={styles.shell}>
      {isListView ? (
        <FullListView
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
        />
      ) : (
        <MatchHub hub={hub} seasonId={seasonId} />
      )}
    </div>
  )
}
