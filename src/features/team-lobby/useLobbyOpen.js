import { useEffect, useState } from 'react'
import { getLobbyConfig } from './lobbyApi.js'

const OPEN_LOBBY_MODES = new Set(['READ_ONLY', 'WRITE'])

// Read the lobby switch once per page load; a failed read is retried on the next visit.
let lobbyConfigRequest = null
function loadLobbyConfig() {
  lobbyConfigRequest ??= getLobbyConfig().catch(() => {
    lobbyConfigRequest = null
    return null
  })
  return lobbyConfigRequest
}

// A lobby that is OFF, still loading or unreadable counts as closed, so no page links to a
// lobby that only says "not open yet".
export function useLobbyOpen(enabled = true) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    loadLobbyConfig().then(config => {
      if (active) setOpen(OPEN_LOBBY_MODES.has(config?.mode))
    })
    return () => { active = false }
  }, [enabled])
  return enabled && open
}
