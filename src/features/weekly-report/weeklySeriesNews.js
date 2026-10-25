import { pickUiLocale } from '../../lib/uiText.js'
import { newspaperTeamName } from './weeklyReportPresentation.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { verifiedSeriesMaps } from './weeklySeriesFacts.js'

// First-to series stop at the winning map. Never reuse the fixed-five narrative.
export function buildSeriesMatchNews(report, match, locale, recordedMapScore) {
  const text = (zh, en, ko, tw, values = []) => pickUiLocale(locale, zh, en, ko, tw)
    .replace(/\{(\d+)\}/g, (_, index) => values[index])
  const sides = [match.team_a, match.team_b]
  const ids = sides.map(team => String(team?.id || team?.team_id || ''))
  const scores = sides.map(team => typeof team?.score === 'boolean' || team?.score == null || String(team.score).trim() === '' || !Number.isInteger(Number(team.score)) || Number(team.score) < 0 ? null : Number(team.score))
  const winningSide = scores.every(Number.isFinite) && scores[0] !== scores[1] ? Number(scores[1] > scores[0]) : null
  const reversed = match.state === 'complete' && winningSide === 1
  const displayTeams = reversed ? [...sides].reverse() : sides
  const displayScores = reversed ? [...scores].reverse() : scores
  const names = sides.map(newspaperTeamName)
  const result = `${newspaperTeamName(displayTeams[0])} ${displayScores[0] ?? '—'}:${displayScores[1] ?? '—'} ${newspaperTeamName(displayTeams[1])}`
  const maps = report.maps.filter(map => map.matchId === match.id).sort((a, b) => a.order - b.order)
  const verified = /^FT[234]$/i.test(match.format || '') && verifiedSeriesMaps(match, maps)
  const running = [0, 0]
  const sequence = verified ? maps.map(map => {
    const side = ids.indexOf(String(map.winner)); running[side]++
    const recorded = recordedMapScore(map, side)
    return { order: map.order, map_name: map.map_name, map_type: map.map_type,
      winnerSide: (reversed ? 1 - side : side) === 0 ? 'a' : 'b', winnerName: names[side], ...recorded,
      mapScore: recorded.mapScore && (reversed ? [...recorded.mapScore].reverse() : recorded.mapScore),
      runningScore: reversed ? [...running].reverse() : [...running] }
  }) : []
  const target = Number(String(match.format).slice(2))
  const decisive = verified && maps.length === target * 2 - 1 ? maps.at(-1) : null
  const winner = winningSide === null ? '' : names[winningSide], loser = winningSide === null ? '' : names[1 - winningSide]
  const wins = winningSide === null ? null : scores[winningSide], losses = winningSide === null ? null : scores[1 - winningSide]
  const title = match.state === 'ruling'
    ? text('{0} 与 {1}：判定结果已公布', '{0}–{1}: ruling confirmed', '{0}–{1}: 공식 판정 확정', '{0} 與 {1}：判定結果已公布', names)
    : winningSide === null
      ? text('{0} 与 {1}：赛果记录待补齐', '{0}–{1}: result records pending', '{0}–{1}: 결과 기록 보완 대기', '{0} 與 {1}：賽果記錄待補齊', names)
      : text('{0} 以 {1}:{2} 战胜 {3}', '{0} beats {3} {1}:{2}', '{0}, {3}에 {1}:{2} 승리', '{0} 以 {1}:{2} 戰勝 {3}', [winner, wins, losses, loser])
  let brief = text('已确认比分 {0}；逐图记录待补齐。', 'Confirmed result: {0}. Map records are incomplete.', '확정 결과: {0}. 맵 기록 보완 대기.', '已確認比分 {0}；逐圖記錄待補齊。', [result])
  let editorialMark = null
  if (match.state === 'ruling') brief = text('本场以赛事判定结束，比分为已确认的裁定结果。', 'This match was decided by an official ruling; the score is the confirmed awarded result.', '공식 판정으로 종료된 경기이며 점수는 확정된 판정 결과입니다.', '本場以賽事判定結束，比分為已確認的裁定結果。')
  else if (verified) {
    brief = text('{0} 场制共进行 {1} 图，{2} 以 {3}:{4} 获胜。', '{2} wins {3}:{4} after {1} maps in this {0} series.', '{0} 시리즈 {1}개 맵 진행, {2} {3}:{4} 승리.', '{0} 場制共進行 {1} 圖，{2} 以 {3}:{4} 獲勝。', [match.format, maps.length, winner, wins, losses])
    if (losses === 0) editorialMark = { kind: 'series-sweep', label: text('横扫获胜', 'CLEAN SWEEP', '무실점 승리', '橫掃獲勝') }
    if (decisive) editorialMark = { kind: 'series-decider', label: text('决胜图胜出', 'DECIDER WON', '최종 맵 승리', '決勝圖勝出') }
  }
  const visualNote = decisive ? text('第 {0} 图 {1} 决定胜负。', 'Map {0}, {1}, settles the series.', '{0}번째 맵 {1}에서 승부 결정.', '第 {0} 圖 {1} 決定勝負。', [decisive.order, formatOwMapName(decisive.map_name, locale)]) : brief
  return { id: match.id, title, shortTitle: title, brief, visualNote, editorialMark,
    newsKind: editorialMark?.kind || (match.state === 'ruling' ? 'ruling' : 'result'),
    displayTeams, displayScores, sourceScoreOrder: names, scoreOrder: displayTeams.map(newspaperTeamName),
    result, sourceResult: `${names[0]} ${scores[0] ?? '—'}:${scores[1] ?? '—'} ${names[1]}`,
    paragraphs: [brief], maps, sequence, decisive, firstMapComeback: verified && String(maps[0].winner) !== ids[winningSide],
    image: verified ? decisive || maps.at(-1) : null, sources: [match.id], path: `/matches/${encodeURIComponent(match.id)}`, seriesFormat: match.format }
}
