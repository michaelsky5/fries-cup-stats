import { translateUiText as uiText } from '../../lib/uiText.js'
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
  getRosterRoleLabel,
  normalizeRosterRole,
  paginatePlayers,
  safeArr,
  sortPlayers
} from '../../lib/rosterSelectors.js'
import { formatOwHeroName, getOwHeroCanonicalKey, getOwHeroCanonicalName } from '../../lib/heroes.js'
import styles from './PlayersPage.module.css'
import { rosterText } from '../../features/roster-index/rosterCopy.js'
import PlayerIndex, { PlayerIndexControls, PlayerIndexHeading } from '../../features/player-index/PlayerIndex.jsx'
import directoryStyles from '../../features/roster-directory/RosterDirectory.module.css'
import { playerIndexText } from '../../features/player-index/playerIndexCopy.js'

const ROLE_TABS = [
  { id: 'ALL', label: '全部' },
  { id: 'TANK', label: '重装' },
  { id: 'DPS', label: '输出' },
  { id: 'SUPPORT', label: '支援' },
  { id: 'following', label: '我的关注' }
]

const ROLE_OPTIONS = [
  { value: 'ALL', label: '全部职责' },
  { value: 'TANK', label: '重装' },
  { value: 'DPS', label: '输出' },
  { value: 'SUPPORT', label: '支援' }
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
  return getRosterRoleLabel(role)
}

function getPlayerKey(player) {
  return player?.identity?.playerId || player?.player_id || player?.identity?.primary || ''
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

export default function PlayersPage() {
  const {
    db,
    season,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    togglePlayerFavorite,
    locale = 'zh-CN',
    isKprHybridDesign = false
  } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusedPlayerId = searchParams.get('rosterFocus') || ''
  const setFocusedPlayerId = value => setQuery({ rosterFocus: value }, { resetPage: false })
  const en = locale === 'en-US'
  const directoryRef = useRef(null)
  const setQuery = useQueryWriter(searchParams, setSearchParams)
  const queryState = useMemo(() => buildRosterQueryState(searchParams, 'players'), [searchParams])

  const summary = useMemo(() => getRosterSummary(db), [db])
  const players = useMemo(() => {
    return getPlayerDirectory(db, favorites, { role: queryState.role, season })
  }, [db, favorites, queryState.role, season])
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
      { value: 'ALL', label: uiText("全部队伍", locale) },
      ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    ]
  }, [players])
  const heroOptions = useMemo(() => {
    const heroes = new Map()
    const addHero = hero => {
      const key = getOwHeroCanonicalKey(hero)
      if (key && !heroes.has(key)) heroes.set(key, getOwHeroCanonicalName(hero))
    }

    players.forEach(player => {
      addHero(player.avatar?.heroName)
      safeArr(player.heroNames).forEach(addHero)
      safeArr(player.top_3_heroes).forEach(addHero)
    })
    return [
      { value: 'ALL', label: uiText("全部英雄", locale) },
      ...[...heroes.values()]
        .sort((a, b) => formatOwHeroName(a, locale).localeCompare(formatOwHeroName(b, locale), locale))
        .map(hero => ({ value: hero, label: formatOwHeroName(hero, locale) }))
    ]
  }, [locale, players])
  const sortOptions = useMemo(() => {
    const hasTimeData = players.some(player => Number(player.raw_time_mins || 0) > 0)
    return hasTimeData ? [...BASE_SORT_OPTIONS, { value: 'time', label: uiText("出场时间", locale) }] : BASE_SORT_OPTIONS
  }, [players])
  const filteredPlayers = useMemo(() => {
    return sortPlayers(filterPlayers(players, queryState), queryState.sort)
  }, [players, queryState])
  const pagination = useMemo(() => {
    return paginatePlayers(filteredPlayers, queryState.page, queryState.pageSize)
  }, [filteredPlayers, queryState.page, queryState.pageSize])
  const focusedPlayer = useMemo(() => {
    return pagination.items.find(player => getPlayerKey(player) === focusedPlayerId) ||
      pagination.items[0] ||
      null
  }, [focusedPlayerId, pagination.items])

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
    ;['q', 'role', 'team', 'hero', 'following', 'sort', 'page', 'pageSize', 'rosterFocus'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const teamLabel = teamOptions.find(option => option.value === queryState.team)?.label || queryState.team
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: uiText("搜索：{0}", locale, [queryState.q]),
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
      label: uiText("只看关注", locale),
      onRemove: () => setQuery({ following: { value: 'all', fallback: 'all' } })
    } : null
  ].filter(Boolean)
  const activeTab = queryState.following === 'following' ? 'following' : queryState.role
  const roleTabs = (
    <div className={isKprHybridDesign ? directoryStyles.roleTabs : styles.roleTabs} role="group" aria-label={en ? 'Player role filters' : uiText("按选手职责筛选", locale)}>
      {ROLE_TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={isKprHybridDesign ? undefined : `${styles.roleTab} ${activeTab === tab.id || (tab.id === 'SUPPORT' && normalizeRosterRole(activeTab) === 'SUP') ? styles.roleTabActive : ''}`}
          aria-pressed={activeTab === tab.id || (tab.id === 'SUPPORT' && normalizeRosterRole(activeTab) === 'SUP')}
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
          {isKprHybridDesign ? playerIndexText(tab.label, locale) : rosterText(tab.label, locale)}
        </button>
      ))}
    </div>
  )
  const toolbarFields = [
    {
      name: 'sort',
      label: 'SORT',
      value: queryState.sort,
      onChange: value => setQuery({ sort: { value, fallback: 'default' } }),
      options: sortOptions
    }
  ]
  const advancedFields = [
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
  ]

  if (isKprHybridDesign) {
    const seasonCode = season?.publicCode || season?.id || ''
    const scopeLabel = queryState.role === 'ALL'
      ? (en ? 'This season’s published records' : uiText("本届已发布记录", locale))
      : (en ? 'Within the selected role' : uiText("当前职责筛选内的记录", locale))
    return <div className={directoryStyles.shell} data-roster-directory="players" data-i18n-ignore>
      <RosterSubnav presentation="index" />
      <PlayerIndexHeading seasonCode={seasonCode} count={filteredPlayers.length} total={summary.totalPlayers} locale={locale} />
      <PlayerIndex
        directoryRef={directoryRef}
        players={pagination.items}
        focusedPlayer={focusedPlayer}
        mobileExpanded={Boolean(focusedPlayerId)}
        onFocusPlayer={setFocusedPlayerId}
        startIndex={pagination.startIndex}
        resultCount={filteredPlayers.length}
        withSeason={withSeason}
        seasonId={season?.id}
        seasonCode={seasonCode}
        scopeLabel={scopeLabel}
        onToggleFavorite={togglePlayerFavorite}
        favoriteDisabled={!focusedPlayer?.isFavorite && favoriteCount >= favoriteLimit}
        locale={locale}
        controls={<PlayerIndexControls roleTabs={roleTabs} locale={locale} searchValue={queryState.q} onSearchChange={value => setQuery({ q: value })} fields={toolbarFields} advancedFields={advancedFields} activeFilters={activeFilters} onReset={hasFilters ? reset : null} />}
        emptyState={<RosterEmptyState title={en ? 'No matching players.' : uiText("没有找到匹配的选手。", locale)} onReset={reset} locale={locale} />}
        pagination={<RosterPagination presentation="index" locale={locale} pagination={pagination} pageSizeOptions={PLAYER_PAGE_SIZES} scrollTargetRef={directoryRef} onPageChange={page => setQuery({ page: { value: page, fallback: 1 }, rosterFocus: '' }, { resetPage: false, replace: false })} onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 24 } })} />}
      />
    </div>
  }

  return (
    <div className={styles.shell}>
      <RosterPageHeader
        stats={[
          { value: summary.totalPlayers, label: uiText("参赛选手", locale) },
          { value: summary.roleCounts.TANK, label: uiText("重装", locale) },
          { value: summary.roleCounts.DPS, label: uiText("输出", locale) },
          { value: summary.roleCounts.SUPPORT, label: uiText("支援", locale) }
        ]}
      />

      <div className={styles.stickyRosterControls}>
        <RosterSubnav />
        {roleTabs}

        <RosterToolbar
          compact
          searchValue={queryState.q}
          searchPlaceholder="搜索昵称、BattleTag、队伍简称或全称"
          onSearchChange={value => setQuery({ q: { value, fallback: '' } })}
          resultLabel={`${filteredPlayers.length} 条结果`}
          fields={toolbarFields}
          advancedFields={advancedFields}
          activeFilters={activeFilters}
          onReset={hasFilters ? reset : null}
        />
      </div>

      <section ref={directoryRef} className={styles.directorySection}>
        <div className={rosterStyles.directoryHead}>
          <div className={rosterStyles.directoryTitleGroup}>
            <h2 className={rosterStyles.directoryTitle}>{uiText("全部选手", locale)}</h2>
            <div className={rosterStyles.directorySubtitle}>PLAYER DIRECTORY</div>
          </div>
          <div className={rosterStyles.directoryCount}>{filteredPlayers.length}{uiText(" 条结果", locale)}</div>
        </div>

        {pagination.items.length ? (
          <div className={styles.playerGrid}>
            {pagination.items.map((player, index) => (
              <PlayerDirectoryCard
                key={player.identity.playerId || player.player_id}
                player={player}
                index={pagination.startIndex + index}
                presentation="default"
                withSeason={withSeason}
                onToggleFavorite={togglePlayerFavorite}
                favoriteDisabled={!player.isFavorite && favoriteCount >= favoriteLimit}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <RosterEmptyState title={uiText("未找到符合条件的选手。", locale)} onReset={reset} />
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
