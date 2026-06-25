import { useEffect, useMemo, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import RosterPageHeader from '../../components/roster/RosterPageHeader.jsx'
import RosterPagination from '../../components/roster/RosterPagination.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import RosterToolbar from '../../components/roster/RosterToolbar.jsx'
import PlayerDirectoryCard from '../../components/roster/PlayerDirectoryCard.jsx'
import RosterEmptyState from '../../components/roster/RosterEmptyState.jsx'
import rosterStyles from '../../components/roster/RosterComponents.module.css'
import {
  PLAYER_PAGE_SIZES,
  buildRosterQueryState,
  filterPlayers,
  getPlayerDirectory,
  getRosterSummary,
  normalizeRosterRole,
  paginatePlayers,
  safeArr,
  sortPlayers
} from '../../lib/rosterSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import styles from './PlayersPage.module.css'

const ROLE_TABS = [
  { id: 'ALL', label: '全部' },
  { id: 'TANK', label: 'TANK' },
  { id: 'DPS', label: 'DPS' },
  { id: 'SUPPORT', label: 'SUPPORT' },
  { id: 'following', label: '我的关注' }
]

const ROLE_OPTIONS = [
  { value: 'ALL', label: '全部职责' },
  { value: 'TANK', label: 'TANK' },
  { value: 'DPS', label: 'DPS' },
  { value: 'SUPPORT', label: 'SUPPORT' }
]

const FOLLOWING_OPTIONS = [
  { value: 'all', label: '全部选手' },
  { value: 'following', label: '我的关注' }
]

const BASE_SORT_OPTIONS = [
  { value: 'default', label: '关注优先' },
  { value: 'name', label: '昵称' },
  { value: 'team', label: '队伍' },
  { value: 'role', label: '职责' }
]

function displayRole(role) {
  return normalizeRosterRole(role) === 'SUP' ? 'SUPPORT' : normalizeRosterRole(role)
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
    if (resetPage) next.delete('page')
    setSearchParams(next, { replace })
  }
}

export default function PlayersPage() {
  const {
    db,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    togglePlayerFavorite,
    locale = 'zh-CN'
  } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const directoryRef = useRef(null)
  const setQuery = useQueryWriter(searchParams, setSearchParams)
  const queryState = useMemo(() => buildRosterQueryState(searchParams, 'players'), [searchParams])

  const summary = useMemo(() => getRosterSummary(db), [db])
  const players = useMemo(() => {
    return getPlayerDirectory(db, favorites, { role: queryState.role })
  }, [db, favorites, queryState.role])
  const teamOptions = useMemo(() => {
    const map = new Map()
    players.forEach(player => {
      const key = player.teamRouteId || player.teamShortName
      if (!key || map.has(key)) return
      map.set(key, {
        value: key,
        label: `${player.teamShortName} · ${player.teamFullName}`
      })
    })
    return [
      { value: 'ALL', label: '全部队伍' },
      ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    ]
  }, [players])
  const heroOptions = useMemo(() => {
    const heroes = new Set()
    players.forEach(player => {
      if (player.avatar?.heroName) heroes.add(player.avatar.heroName)
      safeArr(player.heroNames).forEach(hero => hero && heroes.add(hero))
      safeArr(player.top_3_heroes).forEach(hero => hero && heroes.add(hero))
    })
    return [
      { value: 'ALL', label: '全部英雄' },
      ...[...heroes]
        .sort((a, b) => formatOwHeroName(a, locale).localeCompare(formatOwHeroName(b, locale), locale))
        .map(hero => ({ value: hero, label: formatOwHeroName(hero, locale) }))
    ]
  }, [locale, players])
  const sortOptions = useMemo(() => {
    const hasTimeData = players.some(player => Number(player.raw_time_mins || 0) > 0)
    return hasTimeData ? [...BASE_SORT_OPTIONS, { value: 'time', label: '出场时间' }] : BASE_SORT_OPTIONS
  }, [players])
  const filteredPlayers = useMemo(() => {
    return sortPlayers(filterPlayers(players, queryState), queryState.sort)
  }, [players, queryState])
  const pagination = useMemo(() => {
    return paginatePlayers(filteredPlayers, queryState.page, queryState.pageSize)
  }, [filteredPlayers, queryState.page, queryState.pageSize])

  useEffect(() => {
    if (pagination.page !== queryState.page) {
      setQuery({ page: { value: pagination.page, fallback: 1 } }, { resetPage: false })
    }
  }, [pagination.page, queryState.page, setQuery])

  const favoriteCount = players.filter(player => player.isFavorite).length
  const favoriteLimit = favoriteLimits?.players || 12
  const hasFilters = Boolean(
    queryState.q ||
    queryState.role !== 'ALL' ||
    queryState.team !== 'ALL' ||
    queryState.hero !== 'ALL' ||
    queryState.following !== 'all' ||
    queryState.sort !== 'default'
  )
  const reset = () => {
    const next = new URLSearchParams(searchParams)
    ;['q', 'role', 'team', 'hero', 'following', 'sort', 'page', 'pageSize'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const teamLabel = teamOptions.find(option => option.value === queryState.team)?.label || queryState.team
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: `搜索：${queryState.q}`,
      onRemove: () => setQuery({ q: { value: '', fallback: '' } })
    } : null,
    queryState.role !== 'ALL' ? {
      key: 'role',
      label: displayRole(queryState.role),
      onRemove: () => setQuery({ role: { value: 'ALL', fallback: 'ALL' } })
    } : null,
    queryState.team !== 'ALL' ? {
      key: 'team',
      label: teamLabel,
      onRemove: () => setQuery({ team: { value: 'ALL', fallback: 'ALL' } })
    } : null,
    queryState.hero !== 'ALL' ? {
      key: 'hero',
      label: formatOwHeroName(queryState.hero, locale),
      onRemove: () => setQuery({ hero: { value: 'ALL', fallback: 'ALL' } })
    } : null,
    queryState.following === 'following' ? {
      key: 'following',
      label: '只看关注',
      onRemove: () => setQuery({ following: { value: 'all', fallback: 'all' } })
    } : null
  ].filter(Boolean)
  const activeTab = queryState.following === 'following' ? 'following' : queryState.role

  return (
    <div className={styles.shell}>
      <RosterPageHeader
        stats={[
          { value: summary.totalPlayers, label: '参赛选手' },
          { value: summary.roleCounts.TANK, label: 'TANK' },
          { value: summary.roleCounts.DPS, label: 'DPS' },
          { value: summary.roleCounts.SUPPORT, label: 'SUPPORT' }
        ]}
      />

      <div className={styles.stickyRosterControls}>
        <RosterSubnav withSeason={withSeason} />

        <div className={styles.roleTabs} role="tablist" aria-label="Player role filters">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.roleTab} ${activeTab === tab.id || (tab.id === 'SUPPORT' && normalizeRosterRole(activeTab) === 'SUP') ? styles.roleTabActive : ''}`}
              data-role={tab.id}
              onClick={() => {
                if (tab.id === 'following') {
                  setQuery({
                    following: { value: 'following', fallback: 'all' },
                    role: { value: 'ALL', fallback: 'ALL' }
                  })
                } else {
                  setQuery({
                    role: { value: tab.id, fallback: 'ALL' },
                    following: { value: 'all', fallback: 'all' }
                  })
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <RosterToolbar
          compact
          searchValue={queryState.q}
          searchPlaceholder="搜索昵称、BattleTag、队伍简称或全称"
          onSearchChange={value => setQuery({ q: { value, fallback: '' } })}
          resultLabel={`${filteredPlayers.length} 条结果`}
          fields={[
            {
              name: 'sort',
              label: 'SORT',
              value: queryState.sort,
              onChange: value => setQuery({ sort: { value, fallback: 'default' } }),
              options: sortOptions
            }
          ]}
          advancedFields={[
            {
              name: 'role',
              label: 'ROLE',
              value: queryState.role,
              onChange: value => setQuery({ role: { value, fallback: 'ALL' } }),
              options: ROLE_OPTIONS
            },
            {
              name: 'team',
              label: 'TEAM',
              value: queryState.team,
              onChange: value => setQuery({ team: { value, fallback: 'ALL' } }),
              options: teamOptions
            },
            {
              name: 'hero',
              label: 'HERO',
              value: queryState.hero,
              onChange: value => setQuery({ hero: { value, fallback: 'ALL' } }),
              options: heroOptions
            },
            {
              name: 'following',
              label: 'FOLLOWING',
              value: queryState.following,
              onChange: value => setQuery({ following: { value, fallback: 'all' } }),
              options: FOLLOWING_OPTIONS
            }
          ]}
          activeFilters={activeFilters}
          onReset={hasFilters ? reset : null}
        />
      </div>

      <section ref={directoryRef} className={styles.directorySection}>
        <div className={rosterStyles.directoryHead}>
          <div className={rosterStyles.directoryTitleGroup}>
            <h2 className={rosterStyles.directoryTitle}>全部选手</h2>
            <div className={rosterStyles.directorySubtitle}>PLAYER DIRECTORY</div>
          </div>
          <div className={rosterStyles.directoryCount}>{filteredPlayers.length} 条结果</div>
        </div>

        {pagination.items.length ? (
          <div className={styles.playerGrid}>
            {pagination.items.map(player => (
              <PlayerDirectoryCard
                key={player.identity.playerId || player.player_id}
                player={player}
                withSeason={withSeason}
                onToggleFavorite={togglePlayerFavorite}
                favoriteDisabled={!player.isFavorite && favoriteCount >= favoriteLimit}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <RosterEmptyState title="未找到符合条件的选手。" onReset={reset} />
        )}
      </section>

      <RosterPagination
        pagination={pagination}
        pageSizeOptions={PLAYER_PAGE_SIZES}
        scrollTargetRef={directoryRef}
        onPageChange={page => setQuery({ page: { value: page, fallback: 1 } }, { resetPage: false, replace: false })}
        onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 24 } })}
      />
    </div>
  )
}
