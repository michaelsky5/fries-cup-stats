import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FAVORITE_LIMITS,
  createSeasonFavoritesExport,
  getPlayerBattleTag,
  getPlayerDisplayName,
  getPlayerFavoriteId,
  getTeamFavoriteId,
  getTeamFullName,
  getTeamShortName,
  parseSeasonFavoritesImport,
  sanitizeFavoritesForSeason
} from '../index.js'
import { getPlayerDirectory } from '../../../lib/rosterSelectors.js'
import FavoritePlayerOption from './FavoritePlayerOption.jsx'
import FavoriteSelectedPlayerRow from './FavoriteSelectedPlayerRow.jsx'
import FavoriteSelectedTeamRow from './FavoriteSelectedTeamRow.jsx'
import FavoriteTeamOption from './FavoriteTeamOption.jsx'
import styles from './FavoriteManagerDialog.module.css'

const safeArr = value => Array.isArray(value) ? value : []

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function moveItem(items, fromIndex, toIndex, minIndex = 0) {
  const list = [...items]
  if (fromIndex < minIndex || fromIndex >= list.length || toIndex < minIndex || toIndex >= list.length) return list
  if (fromIndex === toIndex) return list
  const [item] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, item)
  return list
}

function findTeamById(db, teamId) {
  const key = normalizeKey(teamId)
  return safeArr(db?.teams).find(team => {
    return [
      team.team_id,
      team.id,
      team.team_short_name,
      team.short,
      team.team_name,
      team.name
    ].some(value => normalizeKey(value) === key)
  }) || null
}

function findPlayerById(db, playerId) {
  const key = normalizeKey(playerId)
  return safeArr(db?.players).find(player => {
    return [
      player.player_id,
      player.id,
      player.battle_tag,
      player.battleTag,
      player.battletag,
      player.display_name,
      player.nickname,
      player.player_name
    ].some(value => normalizeKey(value) === key)
  }) || null
}

function countChanges(base, draft) {
  let count = base.primaryTeamId === draft.primaryTeamId ? 0 : 1
  const teamMax = Math.max(base.favoriteTeamIds.length, draft.favoriteTeamIds.length)
  const playerMax = Math.max(base.favoritePlayerIds.length, draft.favoritePlayerIds.length)

  for (let index = 0; index < teamMax; index += 1) {
    if (base.favoriteTeamIds[index] !== draft.favoriteTeamIds[index]) count += 1
  }
  for (let index = 0; index < playerMax; index += 1) {
    if (base.favoritePlayerIds[index] !== draft.favoritePlayerIds[index]) count += 1
  }

  return count
}

function getExportFilename(seasonId) {
  const key = normalize(seasonId) || 'fries-cup'
  const date = new Date().toISOString().slice(0, 10)
  return `${key.toLowerCase()}-favorites-${date}.json`
}

function getFavoritesCountText(favorites) {
  const teamCount = safeArr(favorites?.favoriteTeamIds).length
  const playerCount = safeArr(favorites?.favoritePlayerIds).length
  return `${teamCount} 支队伍 / ${playerCount} 名选手`
}

function downloadJson(filename, payload) {
  if (typeof document === 'undefined') return
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getImportNotice(error) {
  if (error?.code === 'SEASON_MISMATCH') return `${error.message}，请先切换到对应赛事再导入。`
  if (error?.code === 'INVALID_JSON') return '导入失败：备份文件不是有效 JSON。'
  if (error?.code === 'INVALID_PAYLOAD') return '导入失败：备份文件格式不正确。'
  return '导入失败：请检查备份文件。'
}

export default function FavoriteManagerDialog({
  open,
  db,
  favorites,
  seasonId,
  initialTab = 'teams',
  onClose,
  onSave
}) {
  const baseFavorites = useMemo(() => sanitizeFavoritesForSeason(favorites, db), [db, favorites])
  const [tab, setTab] = useState(initialTab === 'players' ? 'players' : 'teams')
  const [draft, setDraft] = useState(baseFavorites)
  const [teamQuery, setTeamQuery] = useState('')
  const [playerQuery, setPlayerQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [notice, setNotice] = useState('')
  const importInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDraft(baseFavorites)
    setTab(initialTab === 'players' ? 'players' : 'teams')
    setNotice('')
  }, [baseFavorites, initialTab, open])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  const allTeams = useMemo(() => {
    return safeArr(db?.teams)
      .filter(team => getTeamFavoriteId(team))
      .sort((a, b) => getTeamShortName(a).localeCompare(getTeamShortName(b)))
  }, [db])

  const allPlayers = useMemo(() => {
    return getPlayerDirectory(db)
      .filter(player => getPlayerFavoriteId(player))
      .sort((a, b) => getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b)))
  }, [db])

  const teamById = useMemo(() => new Map(allTeams.map(team => [getTeamFavoriteId(team), team])), [allTeams])
  const playerById = useMemo(() => new Map(allPlayers.map(player => [getPlayerFavoriteId(player), player])), [allPlayers])

  const selectedTeams = draft.favoriteTeamIds.map(id => teamById.get(id)).filter(Boolean)
  const selectedPlayers = draft.favoritePlayerIds.map(id => playerById.get(id)).filter(Boolean)
  const changeCount = countChanges(baseFavorites, draft)

  const filteredTeams = useMemo(() => {
    const query = normalizeKey(teamQuery)
    return allTeams.filter(team => {
      if (!query) return true
      return [
        getTeamShortName(team),
        getTeamFullName(team),
        team.team_id
      ].some(value => normalizeKey(value).includes(query))
    })
  }, [allTeams, teamQuery])

  const teamFilterOptions = useMemo(() => {
    return allTeams.map(team => ({
      id: team.team_id || team.id || getTeamFavoriteId(team),
      label: getTeamShortName(team)
    }))
  }, [allTeams])

  const roleFilterOptions = useMemo(() => {
    return Array.from(new Set(allPlayers.map(player => player.role).filter(Boolean))).sort()
  }, [allPlayers])

  const filteredPlayers = useMemo(() => {
    const query = normalizeKey(playerQuery)
    return allPlayers.filter(player => {
      if (teamFilter !== 'ALL' && normalize(player.team_id || player.team_short_name) !== teamFilter) return false
      if (roleFilter !== 'ALL' && normalize(player.role) !== roleFilter) return false
      if (!query) return true
      return [
        getPlayerDisplayName(player),
        getPlayerBattleTag(player),
        player.player_name,
        player.battle_tag,
        player.battleTag,
        player.nickname,
        player.team_short_name,
        player.team_name,
        player.role
      ].some(value => normalizeKey(value).includes(query))
    })
  }, [allPlayers, playerQuery, roleFilter, teamFilter])

  if (!open) return null

  const updateDraft = updater => {
    setDraft(current => sanitizeFavoritesForSeason(
      typeof updater === 'function' ? updater(current) : updater,
      db
    ))
  }

  const addTeam = teamId => {
    const cleanId = getTeamFavoriteId(findTeamById(db, teamId)) || teamId
    if (draft.favoriteTeamIds.includes(cleanId)) return
    if (draft.favoriteTeamIds.length >= FAVORITE_LIMITS.teams) {
      setNotice(`最多关注 ${FAVORITE_LIMITS.teams} 支队伍`)
      return
    }
    setNotice('')
    updateDraft(current => ({
      ...current,
      primaryTeamId: current.primaryTeamId || cleanId,
      favoriteTeamIds: [...current.favoriteTeamIds, cleanId]
    }))
  }

  const removeTeam = teamId => {
    setNotice('')
    updateDraft(current => {
      const favoriteTeamIds = current.favoriteTeamIds.filter(id => id !== teamId)
      return {
        ...current,
        primaryTeamId: current.primaryTeamId === teamId ? favoriteTeamIds[0] || null : current.primaryTeamId,
        favoriteTeamIds
      }
    })
  }

  const makePrimaryTeam = teamId => {
    setNotice('')
    updateDraft(current => ({
      ...current,
      primaryTeamId: teamId,
      favoriteTeamIds: [
        teamId,
        ...current.favoriteTeamIds.filter(id => id !== teamId)
      ]
    }))
  }

  const moveTeam = (fromIndex, toIndex) => {
    setNotice('')
    updateDraft(current => ({
      ...current,
      favoriteTeamIds: moveItem(current.favoriteTeamIds, fromIndex, toIndex, 1)
    }))
  }

  const addPlayer = playerId => {
    const cleanId = getPlayerFavoriteId(findPlayerById(db, playerId)) || playerId
    if (draft.favoritePlayerIds.includes(cleanId)) return
    if (draft.favoritePlayerIds.length >= FAVORITE_LIMITS.players) {
      setNotice(`最多关注 ${FAVORITE_LIMITS.players} 名选手`)
      return
    }
    setNotice('')
    updateDraft(current => ({
      ...current,
      favoritePlayerIds: [...current.favoritePlayerIds, cleanId]
    }))
  }

  const removePlayer = playerId => {
    setNotice('')
    updateDraft(current => ({
      ...current,
      favoritePlayerIds: current.favoritePlayerIds.filter(id => id !== playerId)
    }))
  }

  const movePlayer = (fromIndex, toIndex) => {
    setNotice('')
    updateDraft(current => ({
      ...current,
      favoritePlayerIds: moveItem(current.favoritePlayerIds, fromIndex, toIndex)
    }))
  }

  const handleTeamDrop = (event, targetIndex) => {
    const fromId = event.dataTransfer.getData('text/favorite-team')
    const fromIndex = draft.favoriteTeamIds.indexOf(fromId)
    if (fromIndex >= 0) moveTeam(fromIndex, targetIndex)
  }

  const handlePlayerDrop = (event, targetIndex) => {
    const fromId = event.dataTransfer.getData('text/favorite-player')
    const fromIndex = draft.favoritePlayerIds.indexOf(fromId)
    if (fromIndex >= 0) movePlayer(fromIndex, targetIndex)
  }

  const save = () => {
    onSave?.(sanitizeFavoritesForSeason(draft, db))
  }

  const exportDraft = () => {
    const payload = createSeasonFavoritesExport(seasonId, draft, db)
    downloadJson(getExportFilename(payload.seasonId || seasonId), payload)
    setNotice(`已导出当前赛事关注备份：${getFavoritesCountText(payload.favorites)}`)
  }

  const importDraft = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const imported = parseSeasonFavoritesImport(text, seasonId, db)
      setDraft(imported)
      setNotice(`已导入备份：${getFavoritesCountText(imported)}，点击保存后生效`)
    } catch (error) {
      setNotice(getImportNotice(error))
    }
  }

  const selectedLabel = tab === 'teams' ? '已关注队伍' : '已关注选手'

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="favorite-manager-title">
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>FAVORITES</p>
            <h2 id="favorite-manager-title">管理关注</h2>
          </div>
          <div className={styles.headerSummary} aria-label="关注数量">
            <span>{draft.favoriteTeamIds.length} / {FAVORITE_LIMITS.teams} 队伍</span>
            <span>{draft.favoritePlayerIds.length} / {FAVORITE_LIMITS.players} 选手</span>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭关注管理">×</button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="关注类型">
          <button type="button" data-active={tab === 'teams'} onClick={() => setTab('teams')}>关注队伍</button>
          <button type="button" data-active={tab === 'players'} onClick={() => setTab('players')}>关注选手</button>
        </div>

        <div className={styles.body}>
          <aside className={styles.selectedPanel}>
            <div className={styles.panelHeading}>
              <span>{selectedLabel}</span>
              <strong>{tab === 'teams' ? `${draft.favoriteTeamIds.length} / ${FAVORITE_LIMITS.teams}` : `${draft.favoritePlayerIds.length} / ${FAVORITE_LIMITS.players}`}</strong>
            </div>

            <div className={styles.selectedList}>
              {tab === 'teams' ? (
                selectedTeams.length ? selectedTeams.map((team, index) => {
                  const id = getTeamFavoriteId(team)
                  const primary = id === draft.primaryTeamId
                  return (
                    <FavoriteSelectedTeamRow
                      key={id}
                      team={team}
                      index={index}
                      seasonId={seasonId}
                      primary={primary}
                      draggable={!primary}
                      onDragStart={event => event.dataTransfer.setData('text/favorite-team', id)}
                      onDrop={event => handleTeamDrop(event, index)}
                      onMove={moveTeam}
                      onMakePrimary={makePrimaryTeam}
                      onRemove={removeTeam}
                    />
                  )
                }) : <p className={styles.selectionEmpty}>尚未关注队伍</p>
              ) : (
                selectedPlayers.length ? selectedPlayers.map((player, index) => {
                  const id = getPlayerFavoriteId(player)
                  return (
                    <FavoriteSelectedPlayerRow
                      key={id}
                      player={player}
                      index={index}
                      draggable
                      onDragStart={event => event.dataTransfer.setData('text/favorite-player', id)}
                      onDrop={event => handlePlayerDrop(event, index)}
                      onMove={movePlayer}
                      onRemove={removePlayer}
                    />
                  )
                }) : <p className={styles.selectionEmpty}>尚未关注选手</p>
              )}
            </div>
          </aside>

          <section className={styles.browserPanel}>
            {tab === 'teams' ? (
              <>
                <div className={styles.browserTools}>
                  {notice ? <p className={styles.notice}>{notice}</p> : null}
                  <div className={styles.filterBar}>
                    <label>
                      <span>搜索队伍</span>
                      <input value={teamQuery} onChange={event => setTeamQuery(event.target.value)} placeholder="简称 / 全称" />
                    </label>
                  </div>
                </div>
                <div className={styles.optionGrid} data-kind="teams">
                  {filteredTeams.map(team => {
                    const teamId = getTeamFavoriteId(team)
                    return (
                      <FavoriteTeamOption
                        key={teamId}
                        team={team}
                        seasonId={seasonId}
                        selected={draft.favoriteTeamIds.includes(teamId)}
                        primary={draft.primaryTeamId === teamId}
                        disabled={draft.favoriteTeamIds.length >= FAVORITE_LIMITS.teams}
                        onToggle={addTeam}
                        onMakePrimary={makePrimaryTeam}
                      />
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <div className={styles.browserTools}>
                  {notice ? <p className={styles.notice}>{notice}</p> : null}
                  <div className={styles.filterBar} data-wide="true">
                    <label>
                      <span>搜索选手</span>
                      <input value={playerQuery} onChange={event => setPlayerQuery(event.target.value)} placeholder="昵称 / 战网 ID / 队伍" />
                    </label>
                    <label>
                      <span>队伍</span>
                      <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}>
                        <option value="ALL">全部队伍</option>
                        {teamFilterOptions.map(team => (
                          <option key={team.id} value={team.id}>{team.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>职责</span>
                      <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
                        <option value="ALL">全部职责</option>
                        {roleFilterOptions.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className={styles.optionGrid} data-kind="players">
                  {filteredPlayers.map(player => {
                    const playerId = getPlayerFavoriteId(player)
                    return (
                      <FavoritePlayerOption
                        key={playerId}
                        player={player}
                        team={findTeamById(db, player.team_id)}
                        selected={draft.favoritePlayerIds.includes(playerId)}
                        disabled={draft.favoritePlayerIds.length >= FAVORITE_LIMITS.players}
                        onToggle={addPlayer}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerMeta}>
            <span>未保存 {changeCount} 项</span>
            <div className={styles.backupActions} aria-label="关注备份">
              <button type="button" onClick={exportDraft}>导出备份</button>
              <button type="button" onClick={() => importInputRef.current?.click()}>导入备份</button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className={styles.fileInput}
                onChange={importDraft}
              />
            </div>
          </div>
          <div>
            <button type="button" onClick={onClose}>取消</button>
            <button className={styles.saveButton} type="button" onClick={save}>保存关注</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
