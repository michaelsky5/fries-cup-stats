import { useEffect, useMemo, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import RosterPageHeader from '../../components/roster/RosterPageHeader.jsx'
import RosterPagination from '../../components/roster/RosterPagination.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import RosterToolbar from '../../components/roster/RosterToolbar.jsx'
import RosterEmptyState from '../../components/roster/RosterEmptyState.jsx'
import StaffDirectoryItem from '../../components/roster/StaffDirectoryItem.jsx'
import rosterStyles from '../../components/roster/RosterComponents.module.css'
import {
  STAFF_PAGE_SIZES,
  buildRosterQueryState,
  filterStaff,
  getStaffCounts,
  getStaffDirectory,
  paginateStaff,
  sortStaff
} from '../../lib/rosterSelectors.js'
import styles from './StaffPage.module.css'

const TYPE_TABS = [
  { id: 'ALL', label: '全部职员' },
  { id: 'manager', label: '经理' },
  { id: 'coach', label: '教练' }
]

const TYPE_OPTIONS = [
  { value: 'ALL', label: '全部职员' },
  { value: 'manager', label: '经理' },
  { value: 'coach', label: '教练' }
]

const SORT_OPTIONS = [
  { value: 'default', label: '队伍顺序' },
  { value: 'name', label: '昵称' },
  { value: 'role', label: '身份' }
]

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

export default function StaffPage() {
  const { db, withSeason = path => path } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const directoryRef = useRef(null)
  const setQuery = useQueryWriter(searchParams, setSearchParams)
  const queryState = useMemo(() => buildRosterQueryState(searchParams, 'staff'), [searchParams])

  const staff = useMemo(() => getStaffDirectory(db), [db])
  const counts = useMemo(() => getStaffCounts(staff), [staff])
  const teamOptions = useMemo(() => {
    const map = new Map()
    staff.forEach(row => {
      const key = row.team.routeId || row.team.shortName
      if (!key || map.has(key)) return
      map.set(key, {
        value: key,
        label: `${row.team.shortName} · ${row.team.fullName}`
      })
    })
    return [
      { value: 'ALL', label: '全部战队' },
      ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    ]
  }, [staff])
  const filteredStaff = useMemo(() => {
    return sortStaff(filterStaff(staff, queryState), queryState.sort)
  }, [queryState, staff])
  const pagination = useMemo(() => {
    return paginateStaff(filteredStaff, queryState.page, queryState.pageSize)
  }, [filteredStaff, queryState.page, queryState.pageSize])

  useEffect(() => {
    if (pagination.page !== queryState.page) {
      setQuery({ page: { value: pagination.page, fallback: 1 } }, { resetPage: false })
    }
  }, [pagination.page, queryState.page, setQuery])

  const hasFilters = Boolean(
    queryState.q ||
    queryState.type !== 'ALL' ||
    queryState.team !== 'ALL' ||
    queryState.sort !== 'default'
  )
  const reset = () => {
    const next = new URLSearchParams(searchParams)
    ;['q', 'type', 'role', 'team', 'sort', 'page', 'pageSize'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const teamLabel = teamOptions.find(option => option.value === queryState.team)?.label || queryState.team
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: `搜索：${queryState.q}`,
      onRemove: () => setQuery({ q: { value: '', fallback: '' } })
    } : null,
    queryState.type !== 'ALL' ? {
      key: 'type',
      label: queryState.type === 'manager' ? '经理' : '教练',
      onRemove: () => setQuery({ type: { value: 'ALL', fallback: 'ALL' } })
    } : null,
    queryState.team !== 'ALL' ? {
      key: 'team',
      label: teamLabel,
      onRemove: () => setQuery({ team: { value: 'ALL', fallback: 'ALL' } })
    } : null
  ].filter(Boolean)

  return (
    <div className={styles.shell}>
      <RosterPageHeader
        stats={[
          { value: counts.uniqueStaff, label: '独立职员' },
          { value: counts.dutyRecords, label: '职务记录' },
          { value: counts.managers, label: '经理岗位' },
          { value: counts.coaches, label: '教练岗位' }
        ]}
      />

      <div className={styles.staffNote}>
        同一人可能兼任经理和教练，因此职务记录可能大于独立职员数量。
      </div>

      <div className={styles.stickyRosterControls}>
        <RosterSubnav withSeason={withSeason} />

        <RosterToolbar
          compact
          leadingControls={(
            <div className={styles.staffTypeControl}>
              <span className={styles.staffTypeLabel}>TYPE</span>
              <div className={styles.typeTabs} role="tablist" aria-label="Staff type filters">
                {TYPE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${styles.typeTab} ${queryState.type === tab.id ? styles.typeTabActive : ''}`}
                    onClick={() => setQuery({ type: { value: tab.id, fallback: 'ALL' } })}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          searchValue={queryState.q}
          searchPlaceholder="搜索昵称、BattleTag、战队简称或全称"
          onSearchChange={value => setQuery({ q: { value, fallback: '' } })}
          resultLabel={`${filteredStaff.length} 条结果`}
          fields={[
            {
              name: 'sort',
              label: 'SORT',
              value: queryState.sort,
              onChange: value => setQuery({ sort: { value, fallback: 'default' } }),
              options: SORT_OPTIONS
            }
          ]}
          advancedFields={[
            {
              name: 'team',
              label: 'TEAM',
              value: queryState.team,
              onChange: value => setQuery({ team: { value, fallback: 'ALL' } }),
              options: teamOptions
            }
          ]}
          activeFilters={activeFilters}
          onReset={hasFilters ? reset : null}
        />
      </div>

      <section ref={directoryRef} className={styles.directorySection}>
        <div className={rosterStyles.directoryHead}>
          <div className={rosterStyles.directoryTitleGroup}>
            <h2 className={rosterStyles.directoryTitle}>赛事职员</h2>
            <div className={rosterStyles.directorySubtitle}>STAFF DIRECTORY</div>
          </div>
          <div className={rosterStyles.directoryCount}>{filteredStaff.length} 条结果</div>
        </div>

        {pagination.items.length ? (
          <div className={rosterStyles.staffGrid}>
            {pagination.items.map(row => (
              <StaffDirectoryItem key={row.id} staff={row} withSeason={withSeason} />
            ))}
          </div>
        ) : (
          <RosterEmptyState title="未找到符合条件的赛事职员。" onReset={reset} />
        )}
      </section>

      <RosterPagination
        pagination={pagination}
        pageSizeOptions={STAFF_PAGE_SIZES}
        scrollTargetRef={directoryRef}
        onPageChange={page => setQuery({ page: { value: page, fallback: 1 } }, { resetPage: false, replace: false })}
        onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 20 } })}
      />
    </div>
  )
}
