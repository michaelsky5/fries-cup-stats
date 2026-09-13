function hasRecordedAppearance(player) {
  if (typeof player?.hasAppearance === 'boolean') return player.hasAppearance
  return Number(player?.mapsPlayed || 0) > 0 || Number(player?.timeMins || 0) > 0
}

function getPlayerKey(player, index = 0) {
  return String(player?.id || player?.name || `player-${index}`)
}

function getCandidates(player) {
  const candidates = Array.isArray(player?.heroCandidates) ? player.heroCandidates.filter(candidate => candidate?.key) : []
  if (candidates.length) return candidates

  const fallbackKey = player?.heroKey || player?.artwork?.src || player?.avatarSrc
  if (!fallbackKey) return []
  return [{
    key: fallbackKey,
    name: player?.hero || '当前英雄',
    avatarSrc: player?.avatarSrc || '',
    hasArtwork: player?.hasArtwork !== false,
    artwork: player?.artwork || {}
  }]
}

export function getShareAppearedPlayers(model) {
  const registeredPlayers = model?.rosterPlayers?.length ? model.rosterPlayers : model?.corePlayers
  return (Array.isArray(registeredPlayers) ? registeredPlayers : [])
    .slice(0, 7)
    .filter(hasRecordedAppearance)
}

export function createAutomaticHeroSelections(model) {
  const players = getShareAppearedPlayers(model)
  let best = { score: Number.NEGATIVE_INFINITY, selections: {} }

  function visit(index, used, selections, score) {
    if (index >= players.length) {
      if (score > best.score) best = { score, selections: { ...selections } }
      return
    }

    const player = players[index]
    const playerKey = getPlayerKey(player, index)
    const candidates = getCandidates(player)
    if (!candidates.length) {
      visit(index + 1, used, selections, score)
      return
    }

    candidates.forEach((candidate, candidateIndex) => {
      const isNew = !used.has(candidate.key)
      selections[playerKey] = candidate.key
      if (isNew) used.add(candidate.key)
      visit(index + 1, used, selections, score + (isNew ? 1000 : 0) - candidateIndex)
      if (isNew) used.delete(candidate.key)
      delete selections[playerKey]
    })
  }

  visit(0, new Set(), {}, 0)
  return best.selections
}

export function applyHeroSelections(model, selections = {}) {
  if (!model) return model

  const updatePlayer = (player, index) => {
    const selectedKey = selections[getPlayerKey(player, index)]
    const candidate = getCandidates(player).find(item => item.key === selectedKey)
    if (!candidate) return player

    return {
      ...player,
      hero: candidate.name || player.hero,
      heroKey: candidate.key,
      avatarSrc: candidate.avatarSrc || player.avatarSrc,
      hasArtwork: candidate.hasArtwork !== false,
      artwork: candidate.artwork || player.artwork
    }
  }

  return {
    ...model,
    rosterPlayers: model.rosterPlayers?.map(updatePlayer),
    corePlayers: model.corePlayers?.map(updatePlayer)
  }
}

export function getHeroSelectionSummary(model, selections = {}) {
  const players = getShareAppearedPlayers(model)
  const usage = new Map()

  players.forEach((player, index) => {
    const playerKey = getPlayerKey(player, index)
    const candidate = getCandidates(player).find(item => item.key === selections[playerKey]) || getCandidates(player)[0]
    if (!candidate?.key) return
    usage.set(candidate.key, (usage.get(candidate.key) || 0) + 1)
  })

  return {
    duplicateGroups: [...usage.values()].filter(count => count > 1).length,
    distinctHeroes: usage.size,
    totalPlayers: players.length
  }
}

export function getHeroEditorRows(model) {
  return getShareAppearedPlayers(model).map((player, index) => ({
    player,
    playerKey: getPlayerKey(player, index),
    candidates: getCandidates(player)
  }))
}
