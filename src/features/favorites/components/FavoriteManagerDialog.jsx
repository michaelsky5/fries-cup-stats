import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { FAVORITE_LIMITS } from '../favoritesConstants.js'
import { createSeasonFavoritesExport, inspectSeasonFavoritesImport } from '../favoritesStorage.js'
import { getPlayerBattleTag, getPlayerDisplayName, getPlayerFavoriteId, getTeamFavoriteId, getTeamFullName, getTeamIdentityValues, getTeamShortName, sanitizeFavoritesForSeason } from '../favoritesSelectors.js'
import { getFavoriteDraftStatus, moveFavoriteDraftItem, prepareFavoriteImport, primaryFirst } from '../favoriteManagerModel.js'
import { getFavoriteManagerCopy, getFavoriteRoleLabel } from '../favoriteManagerCopy.js'
import { ACCOUNT_SIGN_OUT_EVENT } from '../../account-ui/accountNavigationGuard.js'
import CollapsibleFilterRail from '../../account-ui/CollapsibleFilterRail.jsx'
import FavoritePlayerOption from './FavoritePlayerOption.jsx'
import FavoriteSelectedPlayerRow from './FavoriteSelectedPlayerRow.jsx'
import FavoriteSelectedTeamRow from './FavoriteSelectedTeamRow.jsx'
import FavoriteTeamOption from './FavoriteTeamOption.jsx'
import styles from './FavoriteManagerDialog.module.css'

const keyOf = value => String(value ?? '').trim().toLowerCase()

function useModal(ref, lockBody = true) {
  useLayoutEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    if (lockBody) document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      if (lockBody) document.body.style.overflow = overflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [ref, lockBody])
}

function ManagerPrompt({ title, onCancel, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useModal(ref, false)
  return <dialog ref={ref} className={styles.prompt} aria-labelledby={titleId} data-design="signal" data-i18n-ignore
    onCancel={event => { event.preventDefault(); onCancel() }}>
    <h3 id={titleId}>{title}</h3>{children}
  </dialog>
}

export default function FavoriteManagerDialog({ open, seasonId, accountId = 'guest', ...props }) {
  // Public-data refreshes must not start a new editing session.
  return open ? <FavoriteManagerSession key={seasonId + ':' + accountId} seasonId={seasonId} {...props} /> : null
}

function FavoriteManagerSession({ db, favorites, seasonId, locale = 'zh-CN', syncStatus = 'local', excludedFavorites, initialTab = 'teams', onClose, onSave }) {
  const copy = getFavoriteManagerCopy(locale)
  const latest = useMemo(() => primaryFirst(sanitizeFavoritesForSeason(favorites, db)), [db, favorites])
  const [base, setBase] = useState(latest)
  const [draft, setDraft] = useState(latest)
  const [tab, setTab] = useState(initialTab === 'players' ? 'players' : 'teams')
  const [mobileView, setMobileView] = useState('directory')
  const [query, setQuery] = useState({ teams: '', players: '' })
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState('')
  const [leaveRequested, setLeaveRequested] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [importMode, setImportMode] = useState('merge')
  const dialogRef = useRef(null)
  const importInputRef = useRef(null)
  const operationRef = useRef(0)
  const allowLeaveRef = useRef(false)
  const pointerOutsideRef = useRef(false)
  const titleId = useId()
  const panelId = useId()
  const { dirty, externalChange } = getFavoriteDraftStatus(base, draft, latest)
  const blocker = useBlocker(useCallback(() => !allowLeaveRef.current && (dirty || Boolean(busy)), [dirty, busy]))
  const blockerRef = useRef(blocker)
  useLayoutEffect(() => { blockerRef.current = blocker }, [blocker])
  const prompting = leaveRequested || blocker.state === 'blocked'
  useModal(dialogRef)
  useEffect(() => () => { operationRef.current += 1 }, [])
  useEffect(() => {
    if (!dirty && !busy) return undefined
    const unload = event => { if (!allowLeaveRef.current) { event.preventDefault(); event.returnValue = '' } }
    const signOut = event => { event.preventDefault(); setLeaveRequested(true) }
    window.addEventListener('beforeunload', unload)
    window.addEventListener(ACCOUNT_SIGN_OUT_EVENT, signOut)
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener(ACCOUNT_SIGN_OUT_EVENT, signOut) }
  }, [dirty, busy])

  const allTeams = useMemo(() => [...(db?.teams || [])].filter(team => getTeamFavoriteId(team))
    .sort((a, b) => getTeamShortName(a).localeCompare(getTeamShortName(b))), [db])
  const allPlayers = useMemo(() => [...(db?.players || [])].filter(player => getPlayerFavoriteId(player))
    .sort((a, b) => getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b))), [db])
  const teamMap = useMemo(() => new Map(allTeams.map(team => [getTeamFavoriteId(team), team])), [allTeams])
  const playerMap = useMemo(() => new Map(allPlayers.map(player => [getPlayerFavoriteId(player), player])), [allPlayers])
  const playerTeams = useMemo(() => new Map(allPlayers.map(player => [getPlayerFavoriteId(player), allTeams.find(team => getTeamIdentityValues(team).some(value => [player.team_id, player.team_short_name, player.team_name].some(id => id && keyOf(id) === keyOf(value))))])), [allPlayers, allTeams])
  const findPlayerTeam = player => playerTeams.get(getPlayerFavoriteId(player))
  const availableTeams = allTeams.filter(team => !excludedFavorites?.favoriteTeamIds?.includes(getTeamFavoriteId(team)))
  const availablePlayers = allPlayers.filter(player => !excludedFavorites?.favoritePlayerIds?.includes(getPlayerFavoriteId(player)))
  const roles = [...new Set(availablePlayers.map(player => player.role).filter(Boolean))].sort()
  const filteredTeams = availableTeams.filter(team => [getTeamShortName(team), getTeamFullName(team), team.team_id].some(value => keyOf(value).includes(keyOf(query.teams))))
  const filteredPlayers = availablePlayers.filter(player => {
    const team = findPlayerTeam(player)
    return (teamFilter === 'ALL' || getTeamFavoriteId(team) === teamFilter)
      && (roleFilter === 'ALL' || player.role === roleFilter)
      && [getPlayerDisplayName(player), getPlayerBattleTag(player), getTeamShortName(team || player), player.team_name].some(value => keyOf(value).includes(keyOf(query.players)))
  })
  const selectedIds = tab === 'teams' ? draft.favoriteTeamIds : draft.favoritePlayerIds
  const results = tab === 'teams' ? filteredTeams : filteredPlayers
  const activeFilterCount = Number(Boolean(query[tab].trim())) + (tab === 'players' ? Number(teamFilter !== 'ALL') + Number(roleFilter !== 'ALL') : 0)
  const importPlan = importPreview ? prepareFavoriteImport(draft, importPreview.favorites, db) : null
  const cleanDraft = value => {
    const clean = sanitizeFavoritesForSeason(value, db)
    const teams = clean.favoriteTeamIds.filter(id => !excludedFavorites?.favoriteTeamIds?.includes(id))
    return primaryFirst(sanitizeFavoritesForSeason({ ...clean, primaryTeamId: teams.includes(clean.primaryTeamId) ? clean.primaryTeamId : teams[0] || null,
      favoriteTeamIds: teams, favoritePlayerIds: clean.favoritePlayerIds.filter(id => !excludedFavorites?.favoritePlayerIds?.includes(id))
    }, db))
  }
  const updateDraft = updater => { setNotice(null); setDraft(current => cleanDraft(updater(current))) }
  const makePrimary = id => updateDraft(current => ({ ...current, primaryTeamId: id, favoriteTeamIds: [id, ...current.favoriteTeamIds.filter(value => value !== id)] }))
  const add = (kind, id) => updateDraft(current => ({ ...current, [kind]: [...current[kind], id] }))
  const remove = (kind, id) => updateDraft(current => ({ ...current, primaryTeamId: kind === 'favoriteTeamIds' && current.primaryTeamId === id ? null : current.primaryTeamId, [kind]: current[kind].filter(value => value !== id) }))
  const move = (kind, from, to) => updateDraft(current => ({ ...current, [kind]: moveFavoriteDraftItem(current[kind], from, to, kind === 'favoriteTeamIds' ? 1 : 0) }))
  const requestClose = () => {
    if (dirty || busy) { setLeaveRequested(true); return }
    allowLeaveRef.current = true
    onClose()
  }
  const cancelLeave = () => { setLeaveRequested(false); if (blocker.state === 'blocked') blocker.reset() }
  const discard = () => {
    if (busy) return
    allowLeaveRef.current = true
    if (blocker.state === 'blocked') blocker.proceed()
    else onClose()
  }
  const save = async () => {
    if (busy || externalChange || !dirty) return
    const operation = ++operationRef.current
    setBusy('save'); setNotice(null)
    try {
      if (typeof onSave !== 'function') throw new Error('Save handler unavailable')
      await onSave(cleanDraft(draft))
      if (operation !== operationRef.current) return
      allowLeaveRef.current = true
      if (blockerRef.current.state === 'blocked') blockerRef.current.reset()
      onClose()
    } catch {
      if (operation === operationRef.current) setNotice({ error: true, text: copy.saveError })
    } finally { if (operation === operationRef.current) setBusy('') }
  }
  const exportDraft = () => {
    const payload = createSeasonFavoritesExport(seasonId, draft, db)
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = payload.seasonId.toLowerCase() + '-following-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ text: copy.exported })
  }
  const importDraft = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    const operation = ++operationRef.current
    setBusy('import'); setNotice(null)
    try {
      if (file.size > 1024 * 1024) throw Object.assign(new Error('Large backup'), { code: 'TOO_LARGE' })
      const imported = inspectSeasonFavoritesImport(await file.text(), seasonId, db)
      if (operation !== operationRef.current) return
      const clean = cleanDraft(imported.favorites)
      setImportMode('merge')
      setImportPreview({ ...imported, favorites: clean, name: file.name, identityOmitted: imported.favorites.favoriteTeamIds.length + imported.favorites.favoritePlayerIds.length - clean.favoriteTeamIds.length - clean.favoritePlayerIds.length })
    } catch (error) {
      if (operation === operationRef.current) setNotice({ error: true, text: copy.importErrors[error.code] || copy.importErrors.UNKNOWN })
    } finally { if (operation === operationRef.current) setBusy('') }
  }
  const resetSearch = () => { setQuery(current => ({ ...current, [tab]: '' })); setTeamFilter('ALL'); setRoleFilter('ALL') }

  return <>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} data-design="signal" data-i18n-ignore
      onCancel={event => { event.preventDefault(); requestClose() }}
      onPointerDown={event => { pointerOutsideRef.current = event.target === event.currentTarget }}
      onClick={event => {
        if (event.target !== event.currentTarget || !pointerOutsideRef.current) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose()
      }}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>MY FOLLOWING <span>/ {seasonId}</span></p><h2 id={titleId}>{copy.title}</h2></div>
        <button type="button" className={styles.closeButton} onClick={requestClose} aria-label={copy.close}>×</button>
      </header>
      <div className={styles.tabs} role="tablist" aria-label={copy.types}>
        {['teams', 'players'].map(kind => <button key={kind} id={panelId + '-' + kind} type="button" role="tab" aria-selected={tab === kind} aria-controls={panelId} tabIndex={tab === kind ? 0 : -1}
          onClick={() => setTab(kind)} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 'teams' : event.key === 'End' ? 'players' : kind === 'teams' ? 'players' : 'teams'
            setTab(next); document.getElementById(panelId + '-' + next)?.focus()
          }}>{copy[kind]}<span>{kind === 'teams' ? draft.favoriteTeamIds.length : draft.favoritePlayerIds.length} / {FAVORITE_LIMITS[kind]}</span></button>)}
        <span className={styles.storageHint}>{syncStatus === 'local' ? copy.localHint : copy.cloudHint}</span>
      </div>
      <div className={styles.workspace} id={panelId} role="tabpanel" aria-labelledby={panelId + '-' + tab}>
        {externalChange && <div className={styles.conflict} role="alert"><strong>{copy.conflictTitle}</strong><p>{copy.conflict}</p><div>
          <button type="button" disabled={Boolean(busy)} onClick={() => { setBase(latest); setDraft(latest); setNotice(null) }}>{copy.useLatest}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => { setBase(latest); setNotice(null) }}>{copy.keepDraft}</button>
        </div></div>}
        {notice && <p className={styles.notice} role={notice.error ? 'alert' : 'status'} data-error={Boolean(notice.error)}>{notice.text}</p>}
        <nav className={styles.mobileSwitch} aria-label={copy.directory}>
          <button type="button" aria-pressed={mobileView === 'directory'} onClick={() => setMobileView('directory')}>{copy.directory}</button>
          <button type="button" aria-pressed={mobileView === 'selected'} onClick={() => setMobileView('selected')}>{tab === 'teams' ? copy.selectedTeams : copy.selectedPlayers} · {selectedIds.length}</button>
        </nav>
        <div className={styles.body} aria-busy={Boolean(busy)}>
          <aside className={styles.selectedPanel} data-mobile-active={mobileView === 'selected'}>
            <div className={styles.panelHeading}><h3>{tab === 'teams' ? copy.selectedTeams : copy.selectedPlayers}</h3><span>{String(selectedIds.length).padStart(2, '0')}</span></div>
            <p className={styles.panelHint}>{tab === 'teams' ? copy.primaryHint : copy.playerHint}</p>
            <div className={styles.selectedList}>
              {selectedIds.map((id, index) => tab === 'teams' ? <FavoriteSelectedTeamRow key={id} team={teamMap.get(id) || { team_short_name: id }} index={index} total={selectedIds.length} seasonId={seasonId} primary={draft.primaryTeamId === id} copy={copy} disabled={Boolean(busy)}
                draggable={!busy && draft.primaryTeamId !== id} onDragStart={event => event.dataTransfer.setData('text/favorite-team', id)} onDrop={event => { event.preventDefault(); if (!busy) move('favoriteTeamIds', draft.favoriteTeamIds.indexOf(event.dataTransfer.getData('text/favorite-team')), index) }}
                onMove={(from, to) => move('favoriteTeamIds', from, to)} onMakePrimary={makePrimary} onRemove={id => remove('favoriteTeamIds', id)} />
                : <FavoriteSelectedPlayerRow key={id} player={playerMap.get(id) || { player_id: id }} db={db} index={index} total={selectedIds.length} copy={copy} locale={locale} disabled={Boolean(busy)}
                  draggable={!busy} onDragStart={event => event.dataTransfer.setData('text/favorite-player', id)} onDrop={event => { event.preventDefault(); if (!busy) move('favoritePlayerIds', draft.favoritePlayerIds.indexOf(event.dataTransfer.getData('text/favorite-player')), index) }}
                  onMove={(from, to) => move('favoritePlayerIds', from, to)} onRemove={id => remove('favoritePlayerIds', id)} />)}
              {!selectedIds.length && <div className={styles.empty}><strong>{tab === 'teams' ? copy.emptyTeams : copy.emptyPlayers}</strong><p>{copy.emptyHint}</p></div>}
            </div>
          </aside>
          <section className={styles.browserPanel} data-mobile-active={mobileView === 'directory'}>
            <div className={styles.browserTools}>
              <div className={styles.panelHeading}><h3>{copy.directory}</h3></div>
              <CollapsibleFilterRail key={tab} locale={locale} activeCount={activeFilterCount} resultLabel={copy.results(results.length)} onReset={resetSearch}>
              <div className={styles.filterBar} data-kind={tab}>
                <label><span>{tab === 'teams' ? copy.searchTeams : copy.searchPlayers}</span><input type="search" value={query[tab]} onChange={event => setQuery(current => ({ ...current, [tab]: event.target.value }))} placeholder={tab === 'teams' ? copy.teamPlaceholder : copy.playerPlaceholder} /></label>
                {tab === 'players' && <><label><span>{copy.teams}</span><select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}><option value="ALL">{copy.allTeams}</option>{allTeams.map(team => <option key={getTeamFavoriteId(team)} value={getTeamFavoriteId(team)}>{getTeamShortName(team)}</option>)}</select></label>
                  <label><span>{copy.roles}</span><select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="ALL">{copy.allRoles}</option>{roles.map(role => <option key={role} value={role}>{getFavoriteRoleLabel(role, locale)}</option>)}</select></label></>}
              </div>
              </CollapsibleFilterRail>
            </div>
            <div className={styles.optionGrid}>
              {tab === 'teams' ? filteredTeams.map(team => <FavoriteTeamOption key={getTeamFavoriteId(team)} team={team} seasonId={seasonId} copy={copy} selected={draft.favoriteTeamIds.includes(getTeamFavoriteId(team))} primary={draft.primaryTeamId === getTeamFavoriteId(team)} busy={Boolean(busy)} disabled={draft.favoriteTeamIds.length >= FAVORITE_LIMITS.teams} onToggle={id => add('favoriteTeamIds', id)} />)
                : filteredPlayers.map(player => <FavoritePlayerOption key={getPlayerFavoriteId(player)} player={player} db={db} team={findPlayerTeam(player)} copy={copy} locale={locale} selected={draft.favoritePlayerIds.includes(getPlayerFavoriteId(player))} busy={Boolean(busy)} disabled={draft.favoritePlayerIds.length >= FAVORITE_LIMITS.players} onToggle={id => add('favoritePlayerIds', id)} />)}
              {!results.length && <div className={styles.empty}><strong>{copy.noResults}</strong><button type="button" onClick={resetSearch}>{copy.resetSearch}</button></div>}
            </div>
          </section>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerMeta}><span className={styles.draftState} data-dirty={dirty}>{dirty ? copy.pending : copy.unchanged}</span><div className={styles.backupActions} aria-label={copy.backup}>
          <button type="button" onClick={exportDraft} disabled={Boolean(busy)}>{copy.export} ↗</button><button type="button" onClick={() => importInputRef.current?.click()} disabled={Boolean(busy)}>{busy === 'import' ? copy.reading : copy.import} ↙</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" className={styles.fileInput} onChange={importDraft} aria-label={copy.import} tabIndex={-1} />
        </div></div>
        <div className={styles.footerActions}><button type="button" onClick={requestClose}>{copy.cancel}</button><button type="button" className={styles.saveButton} onClick={save} disabled={!dirty || Boolean(busy) || externalChange}>{busy === 'save' ? copy.saving : copy.save} <span aria-hidden="true">↗</span></button></div>
      </footer>
    </dialog>
    {importPreview && <ManagerPrompt title={copy.previewTitle} onCancel={() => setImportPreview(null)}>
      <p className={styles.filename}>{importPreview.name}</p><p>{copy.previewHint}</p>
      <div className={styles.importModes}>{['merge', 'replace'].map(mode => <label key={mode} data-selected={importMode === mode}><input type="radio" name={panelId + '-import-mode'} checked={importMode === mode} onChange={() => setImportMode(mode)} /><span><strong>{copy[mode]}</strong><small>{copy[mode + 'Hint']}</small></span></label>)}</div>
      <dl className={styles.importCounts}><div><dt>{copy.before}</dt><dd>{copy.counts(draft.favoriteTeamIds.length, draft.favoritePlayerIds.length)}</dd></div><div><dt>{copy.after}</dt><dd>{copy.counts(importPlan[importMode].favoriteTeamIds.length, importPlan[importMode].favoritePlayerIds.length)}</dd></div></dl>
      {importPreview.omitted > 0 && <p className={styles.importWarning}>{copy.omitted(importPreview.omitted)}</p>}
      {importPreview.identityOmitted > 0 && <p className={styles.importWarning}>{copy.identityOmitted}</p>}
      {importMode === 'merge' && importPlan.mergeOmitted > 0 && <p className={styles.importWarning}>{copy.mergeOmitted(importPlan.mergeOmitted)}</p>}
      <footer><button type="button" onClick={() => setImportPreview(null)}>{copy.cancel}</button><button type="button" className={styles.saveButton} onClick={() => { setDraft(importPlan[importMode]); setImportPreview(null); setNotice({ text: copy.imported }); setMobileView('selected') }}>{copy.apply}</button></footer>
    </ManagerPrompt>}
    {prompting && <ManagerPrompt title={busy ? copy.busyTitle : copy.discardTitle} onCancel={cancelLeave}><p>{busy ? copy.busyDescription : copy.discardDescription}</p><footer><button type="button" onClick={cancelLeave}>{copy.keepEditing}</button>{!busy && <button type="button" className={styles.saveButton} onClick={discard}>{copy.discard}</button>}</footer></ManagerPrompt>}
  </>
}
