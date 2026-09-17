import { translateUiText as uiText } from '../../lib/uiText.js'
import { useCallback, useEffect, useMemo, useRef } from 'react'
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
import { getEventStaffDirectory } from '../../lib/staffProfiles.js'
import { normalizeStaffDirectorySearch } from '../../lib/staffDirectoryGroups.js'
import styles from './StaffPage.module.css'
import { StaffSignalDirectory } from '../../features/roster-index/RosterIndex.jsx'
import StaffCredits, { StaffCreditsHeading, StaffCreditsControls } from '../../features/staff-credits/StaffCredits.jsx'
import { staffCreditsText } from '../../features/staff-credits/staffCreditsCopy.js'
import creditStyles from '../../features/staff-credits/StaffCredits.module.css'
import directoryStyles from '../../features/roster-directory/RosterDirectory.module.css'

const TYPE_TABS = [
  { id: 'ALL', label: '全部职员' },
  { id: 'manager', label: '经理' },
  { id: 'coach', label: '教练' },
  { id: 'admin', label: '赛管' },
  { id: 'caster', label: '解说' }
]

const TYPE_OPTIONS = [
  { value: 'ALL', label: '全部职员' },
  { value: 'manager', label: '经理' },
  { value: 'coach', label: '教练' },
  { value: 'admin', label: '赛管' },
  { value: 'caster', label: '解说' }
]

const TYPE_LABELS = new Map(TYPE_OPTIONS.map(item => [item.value, item.label]))

const SORT_OPTIONS = [
  { value: 'default', label: '职务顺序' },
  { value: 'name', label: '昵称' },
  { value: 'team', label: '队伍 / 赛事' }
]

function useQueryWriter(searchParams, setSearchParams) {
  return useCallback((updates, { resetPage = true, replace = true } = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, config]) => {
      const value = typeof config === 'object' && config !== null ? config.value : config
      const fallback = typeof config === 'object' && config !== null ? config.fallback : ''
      if (!value || value === fallback) next.delete(key)
      else next.set(key, String(value))
    })
    if (resetPage) { next.delete('page'); next.delete('rosterFocus') }
    setSearchParams(next, { replace, preventScrollReset: true })
  }, [searchParams, setSearchParams])
}

export default function StaffPage() {
  const { db, seasonId, season, reviewAvailable = false, locale = 'zh-CN', withSeason = path => path, isKprHybridDesign = false } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const directoryRef = useRef(null)
  const directoryParams = useMemo(() => isKprHybridDesign ? normalizeStaffDirectorySearch(searchParams) : searchParams, [isKprHybridDesign, searchParams])
  const staffGroup = directoryParams.get('group') || 'event'
  const isTeamStaff = staffGroup === 'team'
  const defaultSort = isKprHybridDesign && !isTeamStaff ? 'matches' : 'default'
  const setQuery = useQueryWriter(directoryParams, setSearchParams)
  const queryState = useMemo(() => ({
    ...buildRosterQueryState(directoryParams, 'staff'),
    sort: directoryParams.get('sort') || defaultSort
  }), [directoryParams, defaultSort])

  const teamStaff = useMemo(() => getStaffDirectory(db), [db])
  const eventStaff = useMemo(() => getEventStaffDirectory(db), [db])
  const staff = useMemo(() => [...teamStaff, ...eventStaff], [eventStaff, teamStaff])
  const directoryStaff = isKprHybridDesign ? isTeamStaff ? teamStaff : eventStaff : staff
  const teamCounts = useMemo(() => getStaffCounts(teamStaff), [teamStaff])
  const counts = useMemo(() => ({
    totalFiles: staff.length,
    teamFiles: teamStaff.length,
    managers: teamCounts.managers,
    coaches: teamCounts.coaches,
    admins: eventStaff.filter(row => row.role === 'admin').length,
    casters: eventStaff.filter(row => row.role === 'caster').length,
    roleAssignments: teamCounts.managers + teamCounts.coaches + eventStaff.length
  }), [eventStaff, staff.length, teamCounts, teamStaff.length])
  const teamOptions = useMemo(() => {
    const map = new Map()
    staff.forEach(row => {
      const key = row.team?.routeId || row.team?.shortName
      if (!key || map.has(key)) return
      map.set(key, {
        value: key,
        label: `${row.team.shortName} · ${row.team.fullName}`
      })
    })
    return [
      { value: 'ALL', label: uiText("全部战队", locale) },
      ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    ]
  }, [staff, locale])
  const filteredStaff = useMemo(() => {
    return sortStaff(filterStaff(directoryStaff, queryState), queryState.sort)
  }, [queryState, directoryStaff])
  const pagination = useMemo(() => {
    return paginateStaff(filteredStaff, queryState.page, queryState.pageSize)
  }, [filteredStaff, queryState.page, queryState.pageSize])
  const focusedStaffId = directoryParams.get('rosterFocus') || ''
  const setFocusedStaffId = value => setQuery({ rosterFocus: value }, { resetPage: false })
  const en = locale === 'en-US'
  const focusedStaff = pagination.items.find(row => row.id === focusedStaffId) || pagination.items[0] || null

  useEffect(() => {
    const next = new URLSearchParams(directoryParams)
    if (pagination.page !== queryState.page) {
      if (pagination.page === 1) next.delete('page')
      else next.set('page', String(pagination.page))
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true, preventScrollReset: true })
  }, [directoryParams, pagination.page, queryState.page, searchParams, setSearchParams])

  const hasFilters = Boolean(
    queryState.q ||
    queryState.type !== 'ALL' ||
    queryState.team !== 'ALL' ||
    queryState.sort !== defaultSort
  )
  const reset = () => {
    const next = new URLSearchParams(directoryParams)
    ;['q', 'type', 'role', 'team', 'sort', 'page', 'pageSize', 'rosterFocus'].forEach(key => next.delete(key))
    setSearchParams(next, { replace: true })
  }
  const teamLabel = teamOptions.find(option => option.value === queryState.team)?.label || queryState.team
  const activeFilters = [
    queryState.q ? {
      key: 'q',
      label: uiText("搜索：{0}", locale, [queryState.q]),
      onRemove: () => setQuery({ q: { value: '', fallback: '' } })
    } : null,
    queryState.type !== 'ALL' ? {
      key: 'type',
      label: TYPE_LABELS.get(queryState.type) || queryState.type,
      onRemove: () => setQuery({ type: { value: 'ALL', fallback: 'ALL' } })
    } : null,
    queryState.team !== 'ALL' ? {
      key: 'team',
      label: teamLabel,
      onRemove: () => setQuery({ team: { value: 'ALL', fallback: 'ALL' } })
    } : null
  ].filter(Boolean)

  const directoryTabs = isTeamStaff ? TYPE_TABS.slice(0, 3) : [TYPE_TABS[0], ...TYPE_TABS.slice(3)]
  const directorySortOptions = isTeamStaff ? SORT_OPTIONS.map(option => option.value === 'team' ? { ...option, label: uiText("队伍", locale) } : option) : [{ value: 'matches', label: uiText("署名场数", locale) }, ...SORT_OPTIONS.filter(option => option.value !== 'team')]
  const roleTabs = <div className={directoryStyles.roleTabs} role="group" aria-label={en ? 'Filter staff by role' : uiText("按职务筛选", locale)}>{directoryTabs.map(tab => <button key={tab.id} type="button" aria-pressed={queryState.type === tab.id} onClick={() => setQuery({ type: { value: tab.id, fallback: 'ALL' } })}>{staffCreditsText(tab.label, locale)}<span>{{ ALL: directoryStaff.length, manager: counts.managers, coach: counts.coaches, admin: counts.admins, caster: counts.casters }[tab.id]}</span></button>)}</div>

  if (isKprHybridDesign) return <div className={directoryStyles.shell} data-roster-directory="staff" data-staff-group={staffGroup} data-i18n-ignore>
    <RosterSubnav presentation="index" />
    <StaffCreditsHeading staffGroup={staffGroup} seasonCode={season?.publicCode || seasonId} count={filteredStaff.length} total={directoryStaff.length} locale={locale} />
    <StaffCredits key={staffGroup} staffGroup={staffGroup} items={pagination.items} focusedStaff={focusedStaff} mobileExpanded={Boolean(focusedStaffId)} onFocus={setFocusedStaffId} startIndex={pagination.startIndex} resultCount={filteredStaff.length} directoryRef={directoryRef} withSeason={withSeason} locale={locale} seasonId={seasonId} seasonCode={season?.publicCode || seasonId} reviewAvailable={reviewAvailable}
      controls={<StaffCreditsControls staffGroup={staffGroup} roleTabs={roleTabs} locale={locale} searchValue={queryState.q} onSearchChange={value => setQuery({ q: value })} fields={[{ name: 'sort', value: queryState.sort, onChange: value => setQuery({ sort: { value, fallback: defaultSort } }), options: directorySortOptions }, ...(isTeamStaff ? [{ name: 'team', value: queryState.team, onChange: value => setQuery({ team: { value, fallback: 'ALL' } }), options: teamOptions }] : [])]} activeFilters={activeFilters} onReset={hasFilters ? reset : null} />}
      emptyState={<RosterEmptyState title={isTeamStaff ? en ? 'No matching team staff.' : uiText("没有找到匹配的战队职员。", locale) : en ? 'No matching event staff.' : uiText("没有找到匹配的赛事职员。", locale)} onReset={reset} locale={locale} />}
      pagination={<RosterPagination presentation="index" locale={locale} pagination={pagination} pageSizeOptions={STAFF_PAGE_SIZES} scrollTargetRef={directoryRef} onPageChange={page => setQuery({ page: { value: page, fallback: 1 }, rosterFocus: '' }, { resetPage: false, replace: false })} onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 20 } })} />}
    />
    <details className={creditStyles.method}><summary>{en ? 'About these records' : uiText("这些记录来自哪里", locale)}</summary><p>{isTeamStaff ? en ? 'Managers and coaches come from published team rosters. Roles for the same person on one team share a record; records across teams remain separate. Role totals can overlap, and records do not represent unique people.' : uiText("经理和教练来自已发布的队伍报名名单。同一人在同队兼任经理与教练时合并为一份档案，跨队记录分别保留；职务数量可能重叠，档案条数不代表去重人数。", locale) : en ? 'Officials and casters come from published match credits. One person can have records in both roles, so records do not represent unique people.' : uiText("赛管与解说来自已发布比赛的署名。同一人可能在两类职务中分别留下记录，档案条数不代表去重人数。", locale)}</p></details>
  </div>

  return (
    <div className={`${styles.shell} ${isKprHybridDesign ? styles.hybridShell : ''}`}>
      {(
        <RosterPageHeader
          stats={[
            { value: counts.totalFiles, label: uiText("公开职务档案", locale) },
            { value: counts.teamFiles, label: uiText("队伍职员", locale) },
            { value: counts.admins, label: uiText("赛管", locale) },
            { value: counts.casters, label: uiText("解说", locale) }
          ]}
        />
      )}

      <div className={`${styles.staffNote} ${isKprHybridDesign ? styles.signalStaffNote : ''}`}>{uiText("队伍经理与教练来自报名名单；赛管与解说来自已发布比赛的署名记录。同一人兼任多个职务时合并为一份人物档案，并保留全部公开职务记录。", locale)}</div>

      <div className={styles.stickyRosterControls}>
        <RosterSubnav className={isKprHybridDesign ? styles.signalSubnav : ''} />

        <RosterToolbar
          compact
          className={isKprHybridDesign ? styles.signalToolbar : ''}
          leadingControls={(
            <div className={styles.staffTypeControl}>
              <span className={styles.staffTypeLabel}>TYPE</span>
              <div className={`${styles.typeTabs} ${isKprHybridDesign ? styles.signalTypeTabs : ''}`} role="tablist" aria-label="Staff type filters">
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
          resultLabel={isKprHybridDesign ? '' : `${filteredStaff.length} 条结果`}
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
        {isKprHybridDesign ? (
          <div className={styles.signalDirectoryHead}>
            <div>
              <span>05 / CREDIT FILES</span>
              <h2>{uiText("全部职员", locale)}</h2>
              <p>{uiText("沿职位轨道选择一名职员，在同一块档案台读取身份、归属与赛事署名。", locale)}</p>
            </div>
            <strong>{String(filteredStaff.length).padStart(2, '0')}<em>VISIBLE PEOPLE</em></strong>
          </div>
        ) : (
          <div className={rosterStyles.directoryHead}>
            <div className={rosterStyles.directoryTitleGroup}>
              <h2 className={rosterStyles.directoryTitle}>{uiText("赛事职员", locale)}</h2>
              <div className={rosterStyles.directorySubtitle}>STAFF DIRECTORY</div>
            </div>
            <div className={rosterStyles.directoryCount}>{filteredStaff.length}{uiText(" 条结果", locale)}</div>
          </div>
        )}

        {pagination.items.length ? (
          isKprHybridDesign ? (
            <StaffSignalDirectory
              items={pagination.items}
              startIndex={pagination.startIndex}
              focusedStaff={focusedStaff}
              onFocus={setFocusedStaffId}
              withSeason={withSeason}
            />
          ) : (
            <div className={rosterStyles.staffGrid}>
              {pagination.items.map(row => (
                <StaffDirectoryItem key={row.id} staff={row} withSeason={withSeason} />
              ))}
            </div>
          )
        ) : (
          <RosterEmptyState title={uiText("未找到符合条件的赛事职员。", locale)} onReset={reset} />
        )}
      </section>

      <RosterPagination
        className={isKprHybridDesign ? styles.signalPagination : ''}
        pagination={pagination}
        pageSizeOptions={STAFF_PAGE_SIZES}
        scrollTargetRef={directoryRef}
        onPageChange={page => setQuery({ page: { value: page, fallback: 1 } }, { resetPage: false, replace: false })}
        onPageSizeChange={pageSize => setQuery({ pageSize: { value: pageSize, fallback: 20 } })}
      />
    </div>
  )
}
