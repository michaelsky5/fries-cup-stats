import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import DataMvpPanel from '../../components/leaderboard/DataMvpPanel.jsx'
import DatabaseSubnav from '../../components/database/DatabaseSubnav.jsx'
import LeaderboardHeader from '../../components/leaderboard/LeaderboardHeader.jsx'
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable.jsx'
import LeaderboardTabs from '../../components/leaderboard/LeaderboardTabs.jsx'
import LeaderboardToolbar from '../../components/leaderboard/LeaderboardToolbar.jsx'
import MetricModeTabs from '../../components/leaderboard/MetricModeTabs.jsx'
import PlayerCompareBar from '../../components/leaderboard/PlayerCompareBar.jsx'
import PlayerComparePanel from '../../components/leaderboard/PlayerComparePanel.jsx'
import RoleLeaderCard from '../../components/leaderboard/RoleLeaderCard.jsx'
import {
  DEFAULT_VISIBLE_COLUMNS,
  LEADERBOARD_COLUMNS,
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_PAGE_SIZE_OPTIONS,
  METRIC_MODES,
  filterLeaderboardEntries,
  getLeaderboardEntries,
  getLeaderboardHighlights,
  getLeaderboardOptions,
  getLeaderboardSummary,
  getRankingMinTimeMins,
  getTabRole,
  getValidMetricMode,
  getValidTab,
  normalizeLeaderboardRole,
  paginateLeaderboardEntries,
  sortLeaderboardEntries
} from '../../lib/leaderboardSelectors.js'
import { ROLE_ORDER } from '../../lib/leaderboardScoring.js'
import styles from './LeaderboardPage.module.css'

const VALID_SORT_KEYS = new Set(['rank', 'player', 'team', 'role', 'maps', 'time', 'score', 'elim', 'ast', 'dth', 'dmg', 'heal', 'block'])
const FILTER_KEYS = new Set(['q', 'team', 'role', 'following', 'hero', 'minTime', 'insufficient'])

function getModeLabel(mode) {
  return METRIC_MODES.find(item => item.id === mode)?.en || 'PER 10'
}

function parsePage(value) {
  const num = Number(value)
  return Number.isInteger(num) && num > 0 ? num : 1
}

function parsePageSize(value) {
  const num = Number(value)
  return LEADERBOARD_PAGE_SIZE_OPTIONS.includes(num) ? num : LEADERBOARD_PAGE_SIZE
}

function parseVisibleColumns(value) {
  if (!value) return DEFAULT_VISIBLE_COLUMNS
  const valid = new Set(LEADERBOARD_COLUMNS.map(column => column.id))
  const parsed = String(value)
    .split(',')
    .map(item => item.trim())
    .filter(item => valid.has(item))

  return parsed.length ? parsed : DEFAULT_VISIBLE_COLUMNS
}

function getDefaultDirection(sortKey) {
  if (sortKey === 'rank' || sortKey === 'player' || sortKey === 'team' || sortKey === 'role' || sortKey === 'dth') {
    return 'asc'
  }
  return 'desc'
}

export default function LeaderboardPage() {
  const {
    db,
    season,
    locale = 'zh-CN',
    updatedAtText = '',
    withSeason = path => path,
    isFavoritePlayer,
    togglePlayerFavorite
  } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedCompareKeys, setSelectedCompareKeys] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareWarning, setCompareWarning] = useState('')
  const tableTopRef = useRef(null)
  const shouldScrollTableRef = useRef(false)
  const compareWarningTimerRef = useRef(null)

  const activeTab = getValidTab(searchParams.get('tab'), searchParams.get('role'))
  const mode = getValidMetricMode(searchParams.get('mode'))
  const sortKey = VALID_SORT_KEYS.has(searchParams.get('sort')) ? searchParams.get('sort') : 'score'
  const direction = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('pageSize'))
  const visibleColumns = parseVisibleColumns(searchParams.get('cols'))
  const minTimeMins = getRankingMinTimeMins(season, db)
  const activeRole = getTabRole(activeTab)

  const filters = useMemo(() => ({
    tab: activeTab,
    role: activeRole,
    query: searchParams.get('q') || '',
    team: searchParams.get('team') || 'ALL',
    hero: searchParams.get('hero') || 'ALL',
    following: searchParams.get('following') === '1',
    showInsufficient: searchParams.get('insufficient') !== '0',
    minTimeMins: searchParams.get('minTime') || ''
  }), [activeRole, activeTab, searchParams])

  const updateQuery = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 'ALL' || value === false) {
        next.delete(key)
        return
      }

      next.set(key, String(value))
    })

    if (resetPage && Object.keys(patch).some(key => FILTER_KEYS.has(key) || key === 'tab' || key === 'mode')) {
      next.delete('page')
    }

    setSearchParams(next)
  }

  const entries = useMemo(() => getLeaderboardEntries(db, season), [db, season])
  const summary = useMemo(() => getLeaderboardSummary(entries, minTimeMins, db), [entries, minTimeMins, db])
  const highlights = useMemo(() => getLeaderboardHighlights(entries), [entries])
  const options = useMemo(() => getLeaderboardOptions(entries, db, locale), [entries, db, locale])

  const filteredRows = useMemo(() => (
    filterLeaderboardEntries(entries, filters, isFavoritePlayer)
  ), [entries, filters, isFavoritePlayer])

  const sortedRows = useMemo(() => (
    sortLeaderboardEntries(filteredRows, sortKey, direction, mode)
  ), [filteredRows, sortKey, direction, mode])

  const pagination = useMemo(() => (
    paginateLeaderboardEntries(sortedRows, page, pageSize)
  ), [sortedRows, page, pageSize])

  const entryByKey = useMemo(() => {
    const map = new Map()
    entries.forEach(entry => map.set(entry.entryKey, entry))
    return map
  }, [entries])

  const selectedCompareEntries = selectedCompareKeys
    .map(key => entryByKey.get(key))
    .filter(Boolean)
  const selectedCompareKeySet = useMemo(
    () => new Set(selectedCompareEntries.map(entry => entry.entryKey)),
    [selectedCompareEntries]
  )
  const compareRole = selectedCompareEntries[0]?.role || ''

  const roleCounts = {
    overall: summary.qualifiedEntries,
    ...summary.roleCounts
  }
  const hasStatEntries = entries.length > 0

  useEffect(() => {
    return () => {
      window.clearTimeout(compareWarningTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!shouldScrollTableRef.current) return
    shouldScrollTableRef.current = false

    window.requestAnimationFrame(() => {
      tableTopRef.current?.scrollIntoView({ block: 'start' })
    })
  }, [pagination.page])

  const handleTabChange = tab => {
    const role = getTabRole(tab)
    updateQuery({
      tab,
      role: role === 'ALL' ? null : role
    })
  }

  const handleFilterChange = patch => {
    if (Object.prototype.hasOwnProperty.call(patch, 'role')) {
      const role = normalizeLeaderboardRole(patch.role)
      if (!role) {
        updateQuery({ tab: 'overall', role: null })
        return
      }
      const roleTab = role === 'TANK' ? 'tank' : role === 'DPS' ? 'dps' : 'support'
      updateQuery({ tab: roleTab, role })
      return
    }

    const queryPatch = {}

    if (Object.prototype.hasOwnProperty.call(patch, 'query')) queryPatch.q = patch.query
    if (Object.prototype.hasOwnProperty.call(patch, 'team')) queryPatch.team = patch.team
    if (Object.prototype.hasOwnProperty.call(patch, 'hero')) queryPatch.hero = patch.hero
    if (Object.prototype.hasOwnProperty.call(patch, 'following')) queryPatch.following = patch.following ? '1' : null
    if (Object.prototype.hasOwnProperty.call(patch, 'showInsufficient')) queryPatch.insufficient = patch.showInsufficient ? null : '0'
    if (Object.prototype.hasOwnProperty.call(patch, 'minTimeMins')) queryPatch.minTime = patch.minTimeMins

    updateQuery(queryPatch)
  }

  const handleReset = () => {
    updateQuery({
      q: null,
      team: null,
      hero: null,
      following: null,
      minTime: null,
      insufficient: null
    })
  }

  const handleSort = key => {
    const nextDirection = sortKey === key
      ? direction === 'asc' ? 'desc' : 'asc'
      : getDefaultDirection(key)

    updateQuery({ sort: key === 'score' ? null : key, dir: nextDirection === 'desc' ? null : nextDirection }, { resetPage: false })
  }

  const handleColumnsChange = columns => {
    const safeColumns = columns.length ? columns : DEFAULT_VISIBLE_COLUMNS
    const isDefault = safeColumns.join(',') === DEFAULT_VISIBLE_COLUMNS.join(',')
    updateQuery({ cols: isDefault ? null : safeColumns.join(',') }, { resetPage: false })
  }

  const handleModeChange = nextMode => {
    updateQuery({ mode: nextMode === 'per10' ? null : nextMode })
  }

  const handleNavigate = entry => {
    navigate(withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`))
  }

  const showCompareWarning = message => {
    setCompareWarning(message)
    window.clearTimeout(compareWarningTimerRef.current)
    compareWarningTimerRef.current = window.setTimeout(() => setCompareWarning(''), 2400)
  }

  const handleToggleCompare = (entry, checked) => {
    if (!checked) {
      setSelectedCompareKeys(current => current.filter(key => key !== entry.entryKey))
      return
    }

    if (compareRole && compareRole !== entry.role) {
      showCompareWarning('仅支持同职责选手比较')
      return
    }

    if (selectedCompareEntries.length >= 4) {
      showCompareWarning('最多选择 4 名选手')
      return
    }

    setSelectedCompareKeys(current => current.includes(entry.entryKey) ? current : [...current, entry.entryKey])
  }

  const handleOpenCompare = () => {
    if (selectedCompareEntries.length < 2) {
      showCompareWarning('至少选择 2 名同职责选手')
      return
    }
    setCompareOpen(true)
  }

  const handlePageChange = nextPage => {
    shouldScrollTableRef.current = true
    updateQuery({ page: nextPage <= 1 ? null : nextPage }, { resetPage: false })
  }

  const handlePageSizeChange = nextPageSize => {
    const parsedPageSize = parsePageSize(nextPageSize)
    shouldScrollTableRef.current = true
    updateQuery({
      page: null,
      pageSize: parsedPageSize === LEADERBOARD_PAGE_SIZE ? null : parsedPageSize
    }, { resetPage: false })
  }
  const isEn = locale === 'en-US'

  return (
    <div className={`${styles.shell} ${selectedCompareEntries.length ? styles.hasCompareBar : ''}`}>
      <DatabaseSubnav />
      <LeaderboardHeader
        summary={summary}
        modeLabel={getModeLabel(mode)}
        season={season}
        updatedAtText={updatedAtText}
        activeTab={activeTab}
        locale={locale}
      />

      {!hasStatEntries ? (
        <section className={styles.dataPendingPanel}>
          <div className={styles.dataPendingMain}>
            <span className={styles.panelKicker}>{isEn ? 'Stats Pending' : '统计待更新'}</span>
            <h2>{isEn ? 'Match stats are not ready yet' : '赛事统计尚未生成'}</h2>
            <p>
              {isEn
                ? `The current season has ${summary.totalPlayers} registered players, but published match stats are not sufficient for player-role rankings yet. Once match records are available, highlights, role leaders, full rankings, and role comparisons will be available.`
                : `当前赛季已收录 ${summary.totalPlayers} 名选手，但公开比赛统计还不足以支撑选手职责排行。等比赛统计发布后，将展示榜首表现、职责领跑者、完整排行榜和同职责比较。`}
            </p>
          </div>
          <div className={styles.dataPendingGrid}>
            <div>
              <span>{isEn ? 'Eligible Entries' : '合格排行条目'}</span>
              <strong>{summary.qualifiedEntries}</strong>
            </div>
            <div>
              <span>{isEn ? 'Rankable Entries' : '可排行统计条目'}</span>
              <strong>{summary.totalEntries}</strong>
            </div>
            <div>
              <span>{isEn ? 'Players' : '全部选手'}</span>
              <strong>{summary.totalPlayers}</strong>
            </div>
            <div>
              <span>{isEn ? 'Minimum Time' : '正式排名门槛'}</span>
              <strong>{summary.minTimeMins}m</strong>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.highlightGrid} aria-label="榜首选手">
            <DataMvpPanel entry={highlights.dataMvp} withSeason={withSeason} locale={locale} />
            <div className={styles.roleLeaderGrid}>
              {ROLE_ORDER.map((role, index) => (
                <RoleLeaderCard
                  key={role}
                  role={role}
                  entry={highlights.roleLeaders[role]}
                  withSeason={withSeason}
                  order={index + 1}
                  locale={locale}
                />
              ))}
            </div>
          </section>

          <section className={styles.controlSection}>
            <div className={styles.rankModeRow}>
              <LeaderboardTabs activeTab={activeTab} onChange={handleTabChange} counts={roleCounts} />
              <MetricModeTabs mode={mode} onChange={handleModeChange} />
            </div>
            <LeaderboardToolbar
              filters={filters}
              options={options}
              minTimeMins={minTimeMins}
              visibleColumns={visibleColumns}
              advancedOpen={advancedOpen}
              onAdvancedToggle={() => setAdvancedOpen(open => !open)}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onColumnsChange={handleColumnsChange}
              locale={locale}
            />
          </section>

          <div ref={tableTopRef} className={styles.tableAnchor}>
            <LeaderboardTable
              rows={pagination.rows}
              pagination={pagination}
              visibleColumns={visibleColumns}
              mode={mode}
              sortKey={sortKey}
              direction={direction}
              activeRole={activeRole}
              activeTab={activeTab}
              selectedCompareKeys={selectedCompareKeySet}
              compareRole={compareRole}
              isFavoritePlayer={isFavoritePlayer}
              onSort={handleSort}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={LEADERBOARD_PAGE_SIZE_OPTIONS}
              onNavigate={handleNavigate}
              onToggleFavorite={entry => togglePlayerFavorite?.(entry)}
              onToggleCompare={handleToggleCompare}
              locale={locale}
            />
          </div>

          <PlayerCompareBar
            selectedEntries={selectedCompareEntries}
            modeLabel={getModeLabel(mode)}
            warning={compareWarning}
            onClear={() => {
              setSelectedCompareKeys([])
              setCompareOpen(false)
            }}
            onOpen={handleOpenCompare}
            locale={locale}
          />

          {compareOpen ? (
            <PlayerComparePanel
              entries={selectedCompareEntries}
              mode={mode}
              modeLabel={getModeLabel(mode)}
              onClose={() => setCompareOpen(false)}
              locale={locale}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
