const safeArr = v => Array.isArray(v) ? v : []

const toNumber = value => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function isCompletedMatch(match) {
  return match?.status === 'COMPLETE' || match?.status === 'COMPLETED'
}

function isSwissMatch(match) {
  const stage = String(match?.stage || '').toUpperCase()
  const round = String(match?.round || '').toUpperCase()
  const matchId = String(match?.match_id || '').toUpperCase()
  const displayName = String(match?.match_display_name || '').toUpperCase()
  const text = `${stage} ${round} ${matchId} ${displayName}`

  const excluded = ['LCQ', 'PLAYOFF', '季后赛', '最后资格赛', '淘汰', 'ELIMINATION', 'QUARTER', 'SEMI', 'FINAL', '八强', '四强', '-WB-', '-LB-', '-GF-']
  if (excluded.some(keyword => text.includes(keyword))) return false

  if (stage === 'SWISS' || stage === 'QUALIFIERS' || stage === 'GROUP') return true
  return text.includes('SWISS') || text.includes('瑞士')
}

export function calculateSwissStandings(db) {
  const teams = safeArr(db?.teams)
  const matches = safeArr(db?.matches).filter(match => isSwissMatch(match) && isCompletedMatch(match))
  const standings = {}

  teams.forEach((team, index) => {
    standings[team.team_id] = {
      ...team,
      __seedOrder: index,
      team_id: team.team_id,
      team_short_name: team.team_short_name || team.team_name || team.team_id,
      team_name: team.team_name || team.team_short_name || team.team_id,
      match_wins: 0,
      match_losses: 0,
      map_wins: 0,
      map_losses: 0,
      map_diff: 0,
      played_opponents: [],
      h2h: {},
      buchholz: 0,
      opponent_win_rate: 0
    }
  })

  const ensureTeam = (id, shortName, fullName) => {
    const key = String(id || '').trim()
    if (!key) return null

    if (!standings[key]) {
      standings[key] = {
        __seedOrder: Number.MAX_SAFE_INTEGER,
        team_id: key,
        team_short_name: shortName || fullName || key,
        team_name: fullName || shortName || key,
        match_wins: 0,
        match_losses: 0,
        map_wins: 0,
        map_losses: 0,
        map_diff: 0,
        played_opponents: [],
        h2h: {},
        buchholz: 0,
        opponent_win_rate: 0
      }
    }

    const row = standings[key]
    if ((!row.team_short_name || row.team_short_name === key) && shortName) row.team_short_name = shortName
    if ((!row.team_name || row.team_name === key) && fullName) row.team_name = fullName
    return row
  }

  matches.forEach(match => {
    const aId = String(match?.team_a?.id || '').trim()
    const bId = String(match?.team_b?.id || '').trim()
    if (!aId || !bId) return

    const teamA = ensureTeam(aId, match?.team_a?.short, match?.team_a?.name)
    const teamB = ensureTeam(bId, match?.team_b?.short, match?.team_b?.name)
    if (!teamA || !teamB) return

    teamA.played_opponents.push(bId)
    teamB.played_opponents.push(aId)

    const scoreA = toNumber(match?.team_a?.score) ?? 0
    const scoreB = toNumber(match?.team_b?.score) ?? 0

    teamA.map_wins += scoreA
    teamA.map_losses += scoreB
    teamB.map_wins += scoreB
    teamB.map_losses += scoreA
    teamA.map_diff += scoreA - scoreB
    teamB.map_diff += scoreB - scoreA

    const aWins = scoreA > scoreB
    const bWins = scoreB > scoreA

    if (aWins) {
      teamA.match_wins += 1
      teamB.match_losses += 1
      teamA.h2h[bId] = 'WIN'
      teamB.h2h[aId] = 'LOSS'
    } else if (bWins) {
      teamB.match_wins += 1
      teamA.match_losses += 1
      teamB.h2h[aId] = 'WIN'
      teamA.h2h[bId] = 'LOSS'
    }
  })

  const rows = Object.values(standings).map(row => ({
    ...row,
    matches_played: row.match_wins + row.match_losses
  }))

  const rowById = new Map(rows.map(row => [row.team_id, row]))

  rows.forEach(row => {
    let oppTotalWins = 0
    let oppTotalGames = 0

    row.played_opponents.forEach(oppId => {
      const opp = rowById.get(oppId)
      if (!opp) return
      oppTotalWins += opp.match_wins
      oppTotalGames += opp.match_wins + opp.match_losses
    })

    row.buchholz = oppTotalWins
    row.opponent_win_rate = oppTotalGames > 0 ? oppTotalWins / oppTotalGames : 0
  })

  const baseSorted = [...rows].sort((a, b) => {
    if (b.match_wins !== a.match_wins) return b.match_wins - a.match_wins
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz
    return 0
  })

  const finalRows = []
  let pointer = 0

  while (pointer < baseSorted.length) {
    const current = baseSorted[pointer]
    const group = [current]
    pointer += 1

    while (
      pointer < baseSorted.length &&
      baseSorted[pointer].match_wins === current.match_wins &&
      baseSorted[pointer].buchholz === current.buchholz
    ) {
      group.push(baseSorted[pointer])
      pointer += 1
    }

    if (group.length === 2) {
      const [a, b] = group
      const aVsB = a.h2h?.[b.team_id]
      const bVsA = b.h2h?.[a.team_id]

      if (aVsB === 'WIN' && bVsA === 'LOSS') {
        finalRows.push(a, b)
        continue
      }

      if (aVsB === 'LOSS' && bVsA === 'WIN') {
        finalRows.push(b, a)
        continue
      }
    }

    group.sort((a, b) => {
      if (b.opponent_win_rate !== a.opponent_win_rate) return b.opponent_win_rate - a.opponent_win_rate
      return a.__seedOrder - b.__seedOrder
    })

    finalRows.push(...group)
  }

  return finalRows.map((row, index) => {
    const { __seedOrder, ...rest } = row
    return { ...rest, rank: index + 1 }
  })
}