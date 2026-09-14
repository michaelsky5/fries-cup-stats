import { pickUiLocale } from './uiText.js'
import { REVIEW_SOURCE_SCENE } from './reviewSource.js'

// QGCS4 uses the regular-season scenes and renderer. Only event/format copy
// changes here; match, identity and performance records keep their source values.
export function adaptPartnerReviewScene(scene, locale = 'zh-CN') {
  const text = (...values) => pickUiLocale(locale, ...values)
  const group = text('小组赛', 'Group stage', '조별 리그', '小組賽')
  const event = text('全高杯 S4', 'Hammer Cup S4', '해머 컵 S4', '全高杯 S4')
  function adapt(value, key = '') {
    if (Array.isArray(value)) return value.map(item => adapt(item, key))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, adapt(item, name)]))
    if (typeof value !== 'string' || /(?:Id|_id|image|url|avatar|logo|battleTag)$/i.test(key)) return value
    return value
      .replace(/(?:2026\s*)?薯条杯(?:常规赛|学院赛)|(?:2026\s*)?Fries Cup (?:Regular Season|Academy Series)|2026 프라이즈 컵 (?:정규 시즌|아카데미 대회)/gi, event)
      .replace(/瑞士轮[、，· /]*(?:和)?突围赛|Swiss (?:Round|Stage) (?:and|\/|·) (?:LCQ|Last Chance Qualifier)|스위스 (?:라운드|스테이지)(?:와| ·| \/) (?:최종 선발전|최종 진출전)/gi, group)
      .replace(/公开预选赛(?:阶段)?|瑞士轮|突围赛|Open Qualifier|Swiss (?:Round|Stage)|Last Chance Qualifier|공개 예선|오픈 예선|스위스 (?:라운드|스테이지)|최종 선발전|최종 진출전/gi, group)
      .replace(/双败淘汰/g, '单败淘汰')
      .replace(/Double[- ]Elimination/gi, 'Single elimination')
      .replace(/더블 엘리미네이션/g, '싱글 엘리미네이션')
      .replace(/\bGROUP\b/g, group)
  }
  const result = { ...adapt(scene), [REVIEW_SOURCE_SCENE]: scene[REVIEW_SOURCE_SCENE] || scene }
  if (result.badge) result.badge = result.badge.replace('OFFICIAL', 'PARTNER')
  if (scene.eyebrow === 'OPEN QUALIFIER' && scene.storyType === 'tournament') {
    result.title = text('从小组赛，写下第一行', 'The first chapter begins in groups', '조별 리그에서 시작된 첫 장', '從小組賽，寫下第一行')
    result.body = text('19 支队伍从小组赛出发，8 支队伍进入单败淘汰赛。每一场对阵，都构成了这一届全高杯。', '19 teams began in the group stage; eight advanced to the single-elimination playoffs. Every match belongs to this edition of Hammer Cup.', '19개 팀이 조별 리그에서 출발했고, 8개 팀이 싱글 엘리미네이션 플레이오프에 진출했습니다. 모든 경기가 이번 해머 컵의 한 부분입니다.', '19 支隊伍從小組賽出發，8 支隊伍進入單敗淘汰賽。每一場對陣，都構成了這一屆全高杯。')
    result.chips = [group, text('单败淘汰赛', 'Single-elimination playoffs', '싱글 엘리미네이션 플레이오프', '單敗淘汰賽')]
  }
  if (scene.eyebrow === 'PLAYOFFS' && scene.storyType === 'tournament') {
    result.body = text('八支队伍进入单败淘汰赛，胜者继续争夺冠军。半决赛失利的两支队伍，继续通过季军赛确定名次。', 'Eight teams entered single-elimination playoffs. Winners stayed in the title race; the semifinal losers met in the third-place match.', '8개 팀이 싱글 엘리미네이션 플레이오프에 진출했습니다. 승자는 우승 경쟁을 이어 갔고, 준결승 패자는 3위 결정전에서 만났습니다.', '八支隊伍進入單敗淘汰賽，勝者繼續爭奪冠軍。半決賽失利的兩支隊伍，繼續透過季軍賽確定名次。')
  }
  if (scene.kind === 'act') {
    const playoffs = scene.seasonAct === 'playoffs'
    result.title = playoffs ? text('季后淘汰赛', 'Playoffs', '플레이오프', '季後淘汰賽') : group
    result.subTitle = playoffs ? text('单败淘汰 · 总决赛', 'Single elimination · Grand final', '싱글 엘리미네이션 · 그랜드 파이널', '單敗淘汰 · 總決賽') : event
    result.body = playoffs
      ? text('八支队伍，继续走向最后一场。', 'Eight teams continued toward the final match.', '8개 팀이 마지막 경기를 향해 나아갔습니다.', '八支隊伍，繼續走向最後一場。')
      : text('从小组赛开始，把每一次出场重新放映。', 'Replay the appearances that began in the group stage.', '조별 리그에서 시작된 출전 기록을 다시 상영합니다.', '從小組賽開始，把每一次出場重新放映。')
    result.stages = playoffs ? ['SINGLE ELIMINATION', 'GRAND FINAL'] : ['GROUP STAGE']
    result.backgroundWords = playoffs ? ['PLAYOFFS', 'FINAL'] : ['GROUP STAGE', 'BEGIN']
  }
  return result
}
