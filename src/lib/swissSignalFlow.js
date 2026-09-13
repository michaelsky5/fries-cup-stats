import { isByeTeam } from './swissEngine.js'

const safeArr = value => Array.isArray(value) ? value : []
const COMPLETE_STATUSES = new Set(['COMPLETE', 'COMPLETED', 'FINISHED', 'FINAL'])

const normalize = value => String(value ?? '').trim().toLowerCase()

function numericScore(value) {
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function teamAliases(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalize).filter(Boolean)
}

function roundNumber(match) {
  const explicit = `${match?.round || ''} ${match?.stage || ''}`.match(/(?:ROUND|R)\s*[-_]?\s*(\d+)/i)
  if (explicit) return Number(explicit[1])
  const id = String(match?.match_id || match?.id || '')
  return Number(id.match(/(?:SWISS[-_]?R|ROUND[-_\s]?)(\d+)/i)?.[1] || 0)
}

function matchId(match) {
  return String(match?.match_id || match?.id || '')
}

function matchIsComplete(match) {
  const status = String(match?.status || '').trim().toUpperCase()
  return COMPLETE_STATUSES.has(status) || (!status && Boolean(match?.winner))
}

function compareMatches(a, b) {
  const roundDelta = roundNumber(a) - roundNumber(b)
  if (roundDelta) return roundDelta
  const timeA = new Date(a?.scheduled_at || a?.match_date || 0).getTime() || 0
  const timeB = new Date(b?.scheduled_at || b?.match_date || 0).getTime() || 0
  if (timeA !== timeB) return timeA - timeB
  return matchId(a).localeCompare(matchId(b))
}

function resultSides(match, aAliases, bAliases) {
  if (!matchIsComplete(match)) return ['pending', 'pending']

  const scoreA = numericScore(match?.team_a?.score)
  const scoreB = numericScore(match?.team_b?.score)
  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    return scoreA > scoreB ? ['win', 'loss'] : ['loss', 'win']
  }

  const winner = normalize(match?.winner_id || match?.winner_team_id || match?.winner)
  if (winner && aAliases.includes(winner)) return ['win', 'loss']
  if (winner && bAliases.includes(winner)) return ['loss', 'win']
  return ['idle', 'idle']
}

function perspectiveScore(match, side) {
  const own = numericScore(side === 'a' ? match?.team_a?.score : match?.team_b?.score)
  const opponent = numericScore(side === 'a' ? match?.team_b?.score : match?.team_a?.score)
  return own === null || opponent === null ? '—' : `${own}:${opponent}`
}

function groupPosition(index, count) {
  if (count <= 1) return .5
  return .12 + (index * .76) / (count - 1)
}

function recordSort(a, b) {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (a.losses !== b.losses) return a.losses - b.losses
  return (b.wins + b.losses) - (a.wins + a.losses)
}

function aggregateEdge(target, key, edge) {
  const current = target.get(key)
  if (current) {
    current.count += 1
    current.teamIds.push(edge.teamId)
    return
  }
  target.set(key, { ...edge, count: 1, teamIds: [edge.teamId] })
}

export function buildSwissSignalFlow(rows = [], matches = [], roundCount = 6) {
  const teams = safeArr(rows)
  const roundsTotal = Math.max(1, Number(roundCount) || 1)
  const canonicalByAlias = new Map()
  const rowById = new Map()
  const stateById = new Map()
  const stepsByTeam = new Map()

  teams.forEach(row => {
    const id = String(row?.team_id || row?.id || row?.team_short_name || '')
    if (!id) return
    rowById.set(id, row)
    stateById.set(id, { wins: 0, losses: 0 })
    stepsByTeam.set(id, [])
    teamAliases(row).forEach(alias => canonicalByAlias.set(alias, id))
  })

  const resolveTeamId = team => teamAliases(team).map(alias => canonicalByAlias.get(alias)).find(Boolean) || ''
  const sortedMatches = safeArr(matches).sort(compareMatches)
  const rounds = []

  for (let round = 1; round <= roundsTotal; round += 1) {
    const roundMatches = sortedMatches.filter(match => roundNumber(match) === round)
    const officialRoundMatches = roundMatches.filter(match => !isByeTeam(match?.team_a) && !isByeTeam(match?.team_b))
    const stepById = new Map()

    roundMatches.forEach(match => {
      const teamAId = resolveTeamId(match?.team_a)
      const teamBId = resolveTeamId(match?.team_b)
      if (!teamAId && !teamBId) return

      const aliasesA = teamAliases(match?.team_a)
      const aliasesB = teamAliases(match?.team_b)
      const [resultA, resultB] = resultSides(match, aliasesA, aliasesB)
      const entries = [
        { id: teamAId, side: 'a', result: resultA, opponentId: teamBId, opponent: match?.team_b },
        { id: teamBId, side: 'b', result: resultB, opponentId: teamAId, opponent: match?.team_a }
      ]

      entries.forEach(entry => {
        if (!entry.id) return
        const state = stateById.get(entry.id)
        if (!state) return
        if (entry.result === 'win') state.wins += 1
        if (entry.result === 'loss') state.losses += 1
        stepById.set(entry.id, {
          round,
          match,
          matchId: matchId(match),
          opponent: rowById.get(entry.opponentId) || entry.opponent || null,
          result: entry.result,
          score: perspectiveScore(match, entry.side)
        })
      })
    })

    const snapshots = teams.flatMap(team => {
      const id = String(team?.team_id || team?.id || team?.team_short_name || '')
      const state = stateById.get(id) || { wins: 0, losses: 0 }
      const matchStep = stepById.get(id)
      if (!matchStep) return []
      const snapshot = {
        team,
        teamId: id,
        round,
        wins: state.wins,
        losses: state.losses,
        record: `${state.wins}-${state.losses}`,
        match: matchStep?.match || null,
        matchId: matchStep?.matchId || '',
        opponent: matchStep?.opponent || null,
        result: matchStep?.result || 'idle',
        score: matchStep?.score || '—'
      }
      stepsByTeam.get(id)?.push(snapshot)
      return [snapshot]
    })

    const groupMap = new Map()
    snapshots.forEach(snapshot => {
      const group = groupMap.get(snapshot.record) || {
        key: snapshot.record,
        record: snapshot.record,
        wins: snapshot.wins,
        losses: snapshot.losses,
        teams: []
      }
      group.teams.push(snapshot.team)
      groupMap.set(snapshot.record, group)
    })

    const groups = [...groupMap.values()].sort(recordSort)
    groups.forEach((group, index) => {
      group.position = groupPosition(index, groups.length)
      group.teams.forEach(team => {
        const teamId = String(team?.team_id || team?.id || team?.team_short_name || '')
        const snapshot = snapshots.find(item => item.teamId === teamId)
        if (snapshot) snapshot.position = group.position
      })
    })

    rounds.push({
      round,
      matches: officialRoundMatches.length,
      completedMatches: officialRoundMatches.filter(matchIsComplete).length,
      records: roundMatches.length,
      completedRecords: roundMatches.filter(matchIsComplete).length,
      byeRecords: roundMatches.length - officialRoundMatches.length,
      groups,
      snapshots
    })
  }

  const edgeMap = new Map()
  teams.forEach(team => {
    const teamId = String(team?.team_id || team?.id || team?.team_short_name || '')
    const steps = stepsByTeam.get(teamId) || []
    for (let index = 0; index < steps.length - 1; index += 1) {
      const from = steps[index]
      const to = steps[index + 1]
      const key = `${from.round}:${from.record}>${to.round}:${to.record}:${to.result}`
      aggregateEdge(edgeMap, key, {
        teamId,
        fromRound: from.round,
        fromRecord: from.record,
        fromPosition: from.position,
        toRound: to.round,
        toRecord: to.record,
        toPosition: to.position,
        result: to.result
      })
    }
  })

  const finalEdgeMap = new Map()
  teams.forEach(team => {
    const teamId = String(team?.team_id || team?.id || team?.team_short_name || '')
    const last = stepsByTeam.get(teamId)?.at(-1)
    if (!last) return
    const status = team?.status || 'contending'
    aggregateEdge(finalEdgeMap, `${last.record}>${status}`, {
      teamId,
      fromRound: last.round,
      fromRecord: last.record,
      fromPosition: last.position,
      status,
      result: status
    })
  })

  return {
    rounds,
    edges: [...edgeMap.values()],
    finalEdges: [...finalEdgeMap.values()],
    stepsByTeam
  }
}
