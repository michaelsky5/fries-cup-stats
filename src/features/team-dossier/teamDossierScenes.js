export const getDossierPlayerKey = player => String(player.identity?.playerId || player.player_id || player.nickname || player.player_name || '')
export const getDossierPlayerName = player => player.identity?.primary || player.nickname || player.player_name || player.player_id
export const getDossierPlayerHero = player => player.avatar?.heroName || player.most_played_hero || ''

// A representative image selection, never a declaration of an official starting lineup.
export function getDossierGalleryCast(roster) {
  const appeared = roster.filter(player => getDossierPlayerHero(player) && (Number(player.maps_played) > 0 || Number(player.raw_time_mins) > 0))
  const chosen = []
  for (const [roles, count] of [[['TANK'], 1], [['DPS', 'DAMAGE'], 2], [['SUP', 'SUPPORT'], 2]]) {
    chosen.push(...appeared.filter(player => roles.includes(player.role)).slice(0, count))
  }
  const keys = new Set(chosen.map(getDossierPlayerKey))
  return [...chosen, ...appeared.filter(player => !keys.has(getDossierPlayerKey(player)))].slice(0, 5)
}

const opponentKey = row => row.opponent?.id || row.opponent?.team_id || row.opponentLabel || ''
const isLowerBracket = row => /^(LB\b|lower\b)|败者组/i.test(row.match.round || '')
const isGrandFinal = row => /^(grand finals?|总决赛)$/i.test(String(row.match.round || '').trim())

export function getDossierSceneRows(rows) {
  const numberedRound = row => Number(String(row.match.round || '').match(/^(?:round\s*|第\s*)?(\d+)(?:\s*轮)?$/i)?.[1]) || null
  const undatedByes = rows.filter(row => row.bye && numberedRound(row) && getMatchTimeLabel(row.match) === '时间待定')
  const path = rows.filter(row => !undatedByes.includes(row))
  // A bye has no kickoff time; its published round still locates it in the season.
  for (const bye of undatedByes) {
    const nextRound = path.findIndex(row => row.match.stage === bye.match.stage && numberedRound(row) > numberedRound(bye))
    const lastInStage = path.findLastIndex(row => row.match.stage === bye.match.stage)
    path.splice(nextRound >= 0 ? nextRound : lastInStage >= 0 ? lastInStage + 1 : path.length, 0, bye)
  }
  return path
}

export function getDossierSeasonStory(rows, advanceState, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const played = rows.filter(row => row.decided && !row.administrative)
  const latest = played.at(-1)
  const final = played.findLast(isGrandFinal)
  const loss = final ? played.slice(0, played.indexOf(final)).findLast(row => row.tone === 'loss' && row.match.stage === 'PLAYOFFS') : null
  const afterLoss = loss ? played.slice(played.indexOf(loss) + 1) : []
  const champion = advanceState.isArchived && advanceState.rank === 1 && final?.tone === 'win'
  const comeback = Boolean(champion && loss && afterLoss.some(row => isLowerBracket(row) && row.tone === 'win'))
  const rematch = loss && opponentKey(loss) ? afterLoss.find(row => opponentKey(row) === opponentKey(loss) && row.tone === 'win') : null
  const stageEntry = played.find(row => row.match.stage === 'PLAYOFFS')
  const middleWin = played.slice(1, -1).findLast(row => row.tone === 'win')
  const next = rows.find(row => row.live) || rows.find(row => row.tone === 'pending')
  const candidates = comeback ? [loss, rematch || afterLoss.find(row => isLowerBracket(row)), final] : [played[0], middleWin || stageEntry, advanceState.isArchived ? latest : next || latest]
  const used = new Set()
  const milestones = candidates.filter(row => {
    if (!row || used.has(row.match.match_id)) return false
    used.add(row.match.match_id)
    return true
  })
  return {
    comeback,
    title: comeback ? (en ? 'THE WAY\nBACK.' : '从败者组\n归来。')
      : champion ? (en ? 'THE ROAD\nTO FIRST.' : '冠军，\n一路走来。')
        : next ? (en ? 'STILL\nIN PLAY.' : '故事，\n仍在继续。')
          : played.length ? (en ? 'A SEASON\nON RECORD.' : '这一季，\n一路至此。') : (en ? 'THE STORY\nSTARTS HERE.' : '这一季，\n从这里开始。'),
    kicker: comeback ? 'THE COMEBACK' : champion ? 'THE CHAMPIONSHIP RUN' : 'THE SEASON JOURNAL',
    milestones,
    focus: next || final || latest || rows.find(row => !row.bye && !row.cancelled) || rows[0] || null
  }
}

export function getDossierViewHref(pathname, search, view, chapter) {
  const base = pathname.replace(/\/(?:journey|analysis)\/?$/, '').replace(/\/$/, '')
  const params = new URLSearchParams(search)
  params.delete('chapter')
  params.delete('tab')
  if (chapter) params.set('chapter', chapter)
  const query = params.toString()
  return `${base}${['journey', 'analysis'].includes(view) ? `/${view}` : ''}${query ? `?${query}` : ''}`
}

export function getDossierView(pathname, search) {
  const params = new URLSearchParams(search)
  const chapter = params.get('chapter') || ({ matches: 'journey', stats: 'records' })[params.get('tab')]
  if (/\/analysis\/?$/.test(pathname) || ['maps', 'records'].includes(chapter)) return 'analysis'
  if (/\/journey\/?$/.test(pathname) || chapter === 'journey') return 'journey'
  return 'gallery'
}
import { getMatchTimeLabel } from '../../lib/matchesSelectors.js'
