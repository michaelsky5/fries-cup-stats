import { getArchiveMembers, getArchiveMatchReading } from './teamArchiveContent.js'
import { buildDossierSummary, getDossierStageLabel } from './teamDossierPresentation.js'
import { getDossierSceneRows, getDossierSeasonStory } from './teamDossierScenes.js'

const opponentId = row => String(row.opponent?.id || row.opponent?.team_id || '')

// Only five individually identified teammates form a shared appearance sample.
export function getTeamSharedAppearances(roster, rows, locale = 'zh-CN') {
  const members = getArchiveMembers(roster, rows, locale)
  const maps = new Map()
  for (const member of members) for (const record of member.records) {
    const key = `${record.match.match_id}:${record.mapIndex}`
    if (!maps.has(key)) maps.set(key, { record, ids: new Set() })
    maps.get(key).ids.add(member.playerId)
  }
  const groups = new Map()
  for (const { record, ids } of maps.values()) {
    if (ids.size !== 5) continue
    const playerIds = [...ids].sort()
    const key = JSON.stringify(playerIds)
    if (!groups.has(key)) groups.set(key, { playerIds, records: [] })
    groups.get(key).records.push(record)
  }
  const cohorts = [...groups.values()].sort((a, b) => b.records.length - a.records.length)
  return { members, cohort: cohorts[0] || null, completeMaps: cohorts.reduce((sum, group) => sum + group.records.length, 0) }
}

export function getTeamReadingFindings(mapPool) {
  const maps = [...mapPool].sort((a, b) => b.maps - a.maps || b.wins - a.wins || a.name.localeCompare(b.name))
  const most = maps[0] || null
  const review = maps.filter(map => map.maps >= 3 && map.losses > 0 && map.name !== most?.name)
    .sort((a, b) => a.winRate - b.winRate || b.maps - a.maps || a.name.localeCompare(b.name))[0] || null
  let rematch = null
  for (const map of maps) {
    const prior = new Map()
    for (const record of map.records) {
      const opponent = opponentId(record)
      if (!opponent || !['win', 'loss'].includes(record.mapOutcome)) continue
      const before = prior.get(opponent)
      if (before && before.match.match_id !== record.match.match_id && before.mapOutcome !== record.mapOutcome) {
        rematch = { map, before, after: record }
      }
      prior.set(opponent, record)
    }
    if (rematch) break
  }
  return { most, mostTies: most ? maps.filter(map => map.maps === most.maps).length - 1 : 0, review, rematch, small: maps.filter(map => map.maps < 3), maps, samples: maps.reduce((sum, map) => sum + map.maps, 0) }
}

export function getTeamSeasonChapters(matchRows, advanceState, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const rows = getDossierSceneRows(matchRows)
  const played = rows.filter(row => row.decided && !row.administrative)
  const story = getDossierSeasonStory(rows, advanceState, locale)
  if (!played.length) return []
  const chapters = []
  const used = new Set()
  const add = (row, values) => {
    if (!row || used.has(row.match.match_id)) return
    used.add(row.match.match_id)
    chapters.push({ row, records: [row], ...values })
  }
  const opening = played.filter(row => row.match.stage === played[0].match.stage)
  const openingStage = getDossierStageLabel(played[0].match.stage, locale)
  const openingRecord = buildDossierSummary(opening)
  const nextStage = played.find(row => row.match.stage !== played[0].match.stage)
  const multiStage = Boolean(nextStage)
  if (multiStage && played[0].match.stage !== 'PLAYOFFS') {
    add(opening.at(-1), {
      kind: 'opening', records: opening,
      title: en ? `It began in the ${openingStage.toLowerCase()}.` : `从${openingStage}启程。`,
      reading: en ? `${opening.length} played series: ${openingRecord.wins} wins, ${openingRecord.losses} losses${openingRecord.draws ? `, ${openingRecord.draws} draws` : ''}. The next chapter moves to ${getDossierStageLabel(nextStage.match.stage, locale)}.`
        : `${opening.length} 场实际交手，${openingRecord.wins} 胜 ${openingRecord.losses} 负${openingRecord.draws ? ` ${openingRecord.draws} 平` : ''}。此后的比赛，进入${getDossierStageLabel(nextStage.match.stage, locale)}。`,
      note: en ? 'Byes and administrative results remain in the complete ledger.' : '轮空与判罚记录另见完整赛程。'
    })
  } else add(played[0], { kind: 'opening', title: en ? 'The first match on record.' : '这一季，从这场开始。', reading: getArchiveMatchReading(played[0], rows, locale) })

  if (story.comeback) {
    const setback = story.milestones[0]
    add(setback, { kind: 'setback', title: en ? 'The route turns to the lower bracket.' : '转入败者组。', reading: en ? `A ${setback.scoreLabel} loss to ${setback.opponentLabel} ended the upper-bracket route. The team continued through the lower bracket.` : `${setback.scoreLabel} 负于 ${setback.opponentLabel}，胜者组的路在这里转弯。此后，队伍从败者组继续前进。` })
    const rematch = story.milestones.find(row => row !== setback && opponentId(row) && opponentId(row) === opponentId(setback) && row.tone === 'win')
    if (rematch) {
      const lowerFinal = /^(LB\s+(F|finals?)|lower bracket finals?|败者组决赛)$/i.test(String(rematch.match.round || '').trim())
      add(rematch, { kind: 'return', title: en ? `Facing ${rematch.opponentLabel}, again.` : `再次相遇，${rematch.opponentLabel}。`, reading: getArchiveMatchReading(rematch, rows, locale) + (lowerFinal ? (en ? ' This lower-bracket final win secured a place in the grand final.' : ' 这场败者组决赛的胜利，带来了通往总决赛的位置。') : ''), note: en ? `Earlier meeting · ${setback.timeLabel.split(' ')[0]} · ${setback.scoreLabel}` : `上一次交手 · ${setback.timeLabel.split(' ')[0]} · ${setback.scoreLabel}`, previous: setback })
    }
  } else {
    // The opening chapter already covers its whole stage. Do not pull an
    // earlier loss out of that stage and sort it ahead of the opening chapter.
    const afterOpening = played.slice(played.indexOf(chapters[0].row) + 1, -1)
    const stageEntry = afterOpening.find(row => row.match.stage !== played[0].match.stage)
    if (stageEntry) add(stageEntry, { kind: 'stage', title: en ? `Into the ${getDossierStageLabel(stageEntry.match.stage, locale).toLowerCase()}.` : `来到${getDossierStageLabel(stageEntry.match.stage, locale)}。`, reading: getArchiveMatchReading(stageEntry, rows, locale) })
    const loss = afterOpening.find(row => row.tone === 'loss' && row !== stageEntry)
    if (loss) add(loss, { kind: 'setback', title: en ? 'A loss along the way.' : '途中，也有失利。', reading: getArchiveMatchReading(loss, rows, locale) })
  }
  const latest = played.at(-1)
  const champion = advanceState.isArchived && advanceState.rank === 1 && latest.tone === 'win' && /^(grand finals?|总决赛)$/i.test(String(latest.match.round || '').trim())
  add(latest, { kind: champion ? 'champion' : 'latest', title: champion ? (en ? 'The season ends with a title.' : '这一季，定格在冠军。') : advanceState.isArchived ? (en ? 'The final entry of this season.' : '这一季的最后一页。') : (en ? 'The latest chapter, so far.' : '最近一章，故事待续。'), reading: champion ? (en ? `${latest.scoreLabel} against ${latest.opponentLabel} in the grand final. ${getArchiveMatchReading(latest, rows, locale)}` : `总决赛 ${latest.scoreLabel} 战胜 ${latest.opponentLabel}。${getArchiveMatchReading(latest, rows, locale)}`) : getArchiveMatchReading(latest, rows, locale) })
  return chapters.sort((a, b) => rows.indexOf(a.row) - rows.indexOf(b.row))
}
