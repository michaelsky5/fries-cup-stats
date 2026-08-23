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

function useQueryWriter(searchParams, setSearchParams) {
  return (updates, { resetPage = true, replace = true } = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, config]) => {
      const value = typeof config === 'object' && config !== null ? config.value : config
      const fallback = typeof config === 'object' && config !== null ? config.fallback : ''
      if (!value || value === fallback) next.delete(key)
      else next.set(key, String(value))
    })
    if (resetPage) next.delete('page')
    setSearchParams(next, { replace })
  }
}

export default function TeamsPage() {
  const {
    db,
    seasonId,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    toggleTeamFavorite
  } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const directoryRef = useRef(null)
  const setQuery = useQueryWriter(searchParams, setSearchParams)
  const queryState = useMemo(() => buildRosterQueryState(searchParams, 'teams'), [searchParams])

  const summary = useMemo(() => getRosterSummary(db), [db])
  const teams = useMemo(() => getTeamDirectory(db, favorites), [db, favorites])
  const groupOptions = useMemo(() => {
    const labels = Array.from(new Set(teams.map(team => team.groupLabel).filter(Boolean))).sort()
    return [{ value: 'ALL', label: '全部分组' }, ...labels.map(label => ({ value: label, label: `${label} 组` }))]
  }, [teams])
  const filteredTeams = useMemo(() => {
    return sortTeams(filterTeams(teams, queryState), queryState.sort)
  }, [queryState, teams])
  const pagination = useMemo(() => {
    return paginateTeams(filteredTeams, queryState.page, queryState.pageSize)
  }, [filteredTeams, queryState.page, queryState.pageSize])

  useEffect(() => {
    if (pagination.page !== queryState.page) {
      setQuery({ page: { value: pagination.page, fallback: 1 } }, { resetPage: false })
    }
  }, [pagination.page, queryState.page, setQuery])

  const favoriteCount = teams.filter(team => team.isFavorite).length
  const favoriteLimit = favoriteLimits?.teams || 5
  const hasFilters = Boolean(queryState.q || queryState.filter !== 'all' || queryState.group !== 'ALL' || queryState.sort !== 'default')
  const reset = () => {
    const next = new URLSearchParams(searchParams)
    ;['q', 'filter', 'group', 'sort', 'page', 'pageSize'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: `搜索：${queryState.q}`,
      onRemove: () => setQuery({ q: { value: '', fallback: '' } })
    } : null,
    queryState.filter !== 'all' ? {
      key: 'filter',
      label: FILTER_LABELS.get(queryState.filter) || queryState.filter,
      onRemove: () => setQuery({ filter: { value: 'all', fallback: 'all' } })
    } : null,
    queryState.group !== 'ALL' ? {
      key: 'group',
      label: `${queryState.group} 组`,
      onRemove: () => setQuery({ group: { value: 'ALL', fallback: 'ALL' } })
    } : null
  ].filter(Boolean)

  return (
    <div className={styles.shell}>
      <RosterPageHeader
        stats={[
          { value: summary.totalTeams, label: '参赛战队' },
          { value: summary.totalPlayers, label: '参赛选手' },
          { value: summary.managers, label: '经理岗位' },
          { value: summary.coaches, label: '教练岗位' }
        ]}
      />

      <div className={styles.stickyRosterControls}>
        <RosterSubnav withSeason={withSeason} />

        <RosterToolbar
          compact
          searchValue={queryState.q}
          searchPlaceholder="搜索战队简称、全称、经理或教练"
          onSearchChange={value => setQuery({ q: { value, fallback: '' } })}
          resultLabel={`${filteredTeams.length} 支结果`}
          actions={(
            <Link to={withSeason('/following?manage=1')} className={styles.followingInline}>
              已关注 {favoriteCount} 支 · 管理关注 →
            </Link>
          )}
          fields={[
            ...(groupOptions.length > 1 ? [{
              name: 'group',
              label: 'GROUP',
              value: queryState.group,
              onChange: value => setQuery({ group: { value, fallback: 'ALL' } }),
              options: groupOptions
            }] : []),
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
          ]}
          activeFilters={activeFilters}
          onReset={hasFilters ? reset : null}
        />
      </div>

      <section ref={directoryRef} className={styles.directorySection}>
        <div className={rosterStyles.directoryHead}>
          <div className={rosterStyles.directoryTitleGroup}>
            <h2 className={rosterStyles.directoryTitle}>全部战队</h2>
            <div className={rosterStyles.directorySubtitle}>TEAM DIRECTORY</div>
          </div>
          <div className={rosterStyles.directoryCount}>{filteredTeams.length} 支结果</div>
        </div>

        {pagination.items.length ? (
          <div className={styles.teamGrid}>
            {pagination.items.map(team => (
              <TeamDirectoryCard
                key={team.routeId}
                team={team}
                seasonId={seasonId}
                withSeason={withSeason}
                onToggleFavorite={toggleTeamFavorite}
                favoriteDisabled={!team.isFavorite && favoriteCount >= favoriteLimit}
              />
            ))}
          </div>
        ) : (
          <RosterEmptyState title="未找到符合条件的战队。" onReset={reset} />
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
