import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import RosterPageHeader from '../../components/roster/RosterPageHeader.jsx'
import RosterPagination from '../../components/roster/RosterPagination.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import RosterToolbar from '../../components/roster/RosterToolbar.jsx'
import TeamDirectoryCard from '../../components/roster/TeamDirectoryCard.jsx'
import RosterEmptyState from '../../components/roster/RosterEmptyState.jsx'
import rosterStyles from '../../components/roster/RosterComponents.module.css'
import {
  TEAM_PAGE_SIZES,
  buildRosterQueryState,
  filterTeams,
  getRosterSummary,
  getTeamDirectory,
  paginateTeams,
  sortTeams
} from '../../lib/rosterSelectors.js'
import styles from './TeamsPage.module.css'
import TeamIndex, { TeamIndexHeading, TeamIndexControls } from '../../features/team-index/TeamIndex.jsx'
import { buildTeamIndexPreview } from '../../features/team-index/teamIndexModel.js'
import directoryStyles from '../../features/roster-directory/RosterDirectory.module.css'

const TEAM_FILTERS = [
  { value: 'all', label: '全部战队' },
  { value: 'following', label: '我的关注' },
  { value: 'roster5', label: '5 人名单' },
  { value: 'roster6', label: '6 人名单' },
  { value: 'roster7', label: '7 人名单' },
  { value: 'hasCoach', label: '有教练' },
  { value: 'noCoach', label: '无教练' }
]

const SORT_OPTIONS = [
  { value: 'default', label: '关注优先' },
  { value: 'short', label: '简称 A-Z' },
  { value: 'roster', label: '名单人数' },
  { value: 'coach', label: '有教练优先' }
]

const FILTER_LABELS = new Map(TEAM_FILTERS.map(item => [item.value, item.label]))

function getTeamKey(team) {
  return team?.routeId || team?.team_id || team?.shortName || ''
}

function useQueryWriter(searchParams, setSearchParams) {
  return (updates, { resetPage = true, replace = true } = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, config]) => {
      const value = typeof config === 'object' && config !== null ? config.value : config
      const fallback = typeof config === 'object' && config !== null ? config.fallback : ''
      if (!value || value === fallback) next.delete(key)
      else next.set(key, String(value))
    })
    if (resetPage) { next.delete('page'); next.delete('rosterFocus') }
    setSearchParams(next, { replace, preventScrollReset: true })
  }
}

export default function TeamsPage() {
  const {
    db,
    locale = 'zh-CN',
    seasonId,
    season,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    toggleTeamFavorite,
    isKprHybridDesign = false
  } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedTeamId = searchParams.get('rosterFocus') || ''
  const setFocusedTeamId = value => setQuery({ rosterFocus: value }, { resetPage: false })
  const en = locale === 'en-US'
  const directoryRef = useRef(null)
  const setQuery = useQueryWriter(searchParams, setSearchParams)
  const queryState = useMemo(() => buildRosterQueryState(searchParams, 'teams'), [searchParams])

  const summary = useMemo(() => getRosterSummary(db), [db])
  const teams = useMemo(() => getTeamDirectory(db, favorites), [db, favorites])
  const filteredTeams = useMemo(() => {
    return sortTeams(filterTeams(teams, queryState), queryState.sort)
  }, [queryState, teams])
  const pagination = useMemo(() => {
    return paginateTeams(filteredTeams, queryState.page, queryState.pageSize)
  }, [filteredTeams, queryState.page, queryState.pageSize])
  const focusedTeam = useMemo(() => {
    return pagination.items.find(team => getTeamKey(team) === focusedTeamId) || pagination.items[0] || null
  }, [pagination.items, focusedTeamId])
  const teamPreview = useMemo(() => isKprHybridDesign ? buildTeamIndexPreview(db, season, focusedTeam, locale) : null, [db, season, focusedTeam, locale, isKprHybridDesign])

  useEffect(() => {
    const selectedIndex = isKprHybridDesign && focusedTeamId ? filteredTeams.findIndex(team => getTeamKey(team) === focusedTeamId) : -1
    const targetPage = pagination.isAll ? 1 : selectedIndex >= 0 ? Math.floor(selectedIndex / pagination.pageSize) + 1 : pagination.page
    if (targetPage !== queryState.page) {
      setQuery({ page: { value: targetPage, fallback: 1 } }, { resetPage: false })
    }
  }, [pagination.page, pagination.pageSize, pagination.isAll, queryState.page, setQuery, filteredTeams, focusedTeamId, isKprHybridDesign])

  const favoriteCount = teams.filter(team => team.isFavorite).length
  const favoriteLimit = favoriteLimits?.teams || 5
  const hasFilters = Boolean(queryState.q || queryState.filter !== 'all' || queryState.sort !== 'default')
  const reset = () => {
    const next = new URLSearchParams(searchParams)
    ;['q', 'filter', 'sort', 'page', 'pageSize', 'rosterFocus'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: uiText("搜索：{0}", locale, [queryState.q]),
      onRemove: () => setQuery({ q: { value: '', fallback: '' } })
    } : null,
    queryState.filter !== 'all' ? {
      key: 'filter',
      label: FILTER_LABELS.get(queryState.filter) || queryState.filter,
      onRemove: () => setQuery({ filter: { value: 'all', fallback: 'all' } })
    } : null
  ].filter(Boolean)
  const toolbarFields = [
    {
      name: 'filter',
      label: 'FILTER',
      value: queryState.filter,
      onChange: value => setQuery({ filter: { value, fallback: 'all' } }),
      options: TEAM_FILTERS
    },
    {
      name: 'sort',
      label: 'SORT',
      value: queryState.sort,
      onChange: value => setQuery({ sort: { value, fallback: 'default' } }),
      options: SORT_OPTIONS
    }
  ]
  const followingAction = (
    <Link to={withSeason('/me?section=following&manage=1')} className={styles.followingInline}>{uiText("已关注 ", locale)}{favoriteCount}{uiText(" 支 · 管理关注 →", locale)}</Link>
  )

  if (isKprHybridDesign) {
    return <div className={directoryStyles.shell} data-roster-directory="teams" data-i18n-ignore>
      <RosterSubnav presentation="index" />
      <TeamIndexHeading seasonCode={season?.publicCode || seasonId} count={filteredTeams.length} total={teams.length} locale={locale} favoriteCount={favoriteCount} withSeason={withSeason} />
      <TeamIndex directoryRef={directoryRef} teams={pagination.items} focusedTeam={focusedTeam} preview={teamPreview} onFocusTeam={setFocusedTeamId} seasonId={seasonId} seasonCode={season?.publicCode || seasonId} withSeason={withSeason} onToggleFavorite={toggleTeamFavorite} favoriteDisabled={!focusedTeam?.isFavorite && favoriteCount >= favoriteLimit} locale={locale} startIndex={pagination.startIndex} resultCount={filteredTeams.length} mobileExpanded={Boolean(focusedTeamId)}
        controls={<TeamIndexControls locale={locale} searchValue={queryState.q} onSearchChange={value => setQuery({ q: value })} fields={toolbarFields} activeFilters={activeFilters} onReset={hasFilters ? reset : null} />}
        emptyState={<RosterEmptyState title={en ? 'No matching teams.' : uiText("没有找到匹配的队伍。", locale)} onReset={reset} locale={locale} />}
        pagination={<RosterPagination presentation="index" locale={locale} pagination={pagination} pageSizeOptions={TEAM_PAGE_SIZES} scrollTargetRef={directoryRef} onPageChange={page => setQuery({ page: { value: page, fallback: 1 }, rosterFocus: '' }, { resetPage: false, replace: false })} onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 12 } })} />}
      />
    </div>
  }

  return (
    <div className={styles.shell}>
      <RosterPageHeader
        stats={[
          { value: summary.totalTeams, label: uiText("参赛战队", locale) },
          { value: summary.totalPlayers, label: uiText("参赛选手", locale) },
          { value: summary.managers, label: uiText("经理岗位", locale) },
          { value: summary.coaches, label: uiText("教练岗位", locale) }
        ]}
      />

      <div className={styles.stickyRosterControls}>
        <RosterSubnav />

        <RosterToolbar
          compact
          searchValue={queryState.q}
          searchPlaceholder="搜索战队简称、全称、经理或教练"
          onSearchChange={value => setQuery({ q: { value, fallback: '' } })}
          resultLabel={`${filteredTeams.length} 支结果`}
          actions={followingAction}
          fields={toolbarFields}
          activeFilters={activeFilters}
          onReset={hasFilters ? reset : null}
        />
      </div>

      <section ref={directoryRef} className={styles.directorySection}>
        <div className={rosterStyles.directoryHead}>
          <div className={rosterStyles.directoryTitleGroup}>
            <h2 className={rosterStyles.directoryTitle}>{uiText("全部战队", locale)}</h2>
            <div className={rosterStyles.directorySubtitle}>TEAM DIRECTORY</div>
          </div>
          <div className={rosterStyles.directoryCount}>{filteredTeams.length}{uiText(" 支结果", locale)}</div>
        </div>

        {pagination.items.length ? (
          <div className={styles.teamGrid}>
            {pagination.items.map((team, index) => (
              <TeamDirectoryCard
                key={team.routeId}
                team={team}
                index={pagination.startIndex + index}
                presentation="default"
                seasonId={seasonId}
                withSeason={withSeason}
                onToggleFavorite={toggleTeamFavorite}
                favoriteDisabled={!team.isFavorite && favoriteCount >= favoriteLimit}
              />
            ))}
          </div>
        ) : (
          <RosterEmptyState title={uiText("未找到符合条件的战队。", locale)} onReset={reset} />
        )}
      </section>

      <RosterPagination
        pagination={pagination}
        pageSizeOptions={TEAM_PAGE_SIZES}
        scrollTargetRef={directoryRef}
        onPageChange={page => setQuery({ page: { value: page, fallback: 1 } }, { resetPage: false, replace: false })}
        onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 12 } })}
      />
    </div>
  )
}
