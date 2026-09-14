import { translateUiText } from '../../lib/uiText.js'
import { getRoleLabel, getRoleEnLabel } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatSeasonRatingValue, getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import { formatPlayerMatchStage, getRecordedPlayerHeroes } from '../player-dossier/playerDossierPresentation.js'
import { resolvePlayerStorySelection } from '../player-dossier/playerPersonalStory.js'

export function getPlayerStoryCardModel({ dossier, appearances, role, selection, seasonCode, locale }) {
  const chosen = resolvePlayerStorySelection(appearances, role, selection)
  const entry = dossier.roleEntries.find(item => item.role === role)
  if (!entry) return null
  const en = locale === 'en-US'
  const text = (zh, english) => translateUiText(en ? english : zh, locale)
  const roleLabel = text(getRoleLabel(role), getRoleEnLabel(role))
  const maps = chosen.matches.reduce((sum, match) => sum + match.maps.length, 0)
  const name = dossier.identity.displayName
  const date = match => Number.isFinite(Date.parse(match?.date)) ? match.dateLabel || '—' : '—'
  const result = match => text(({ win: '胜', loss: '负', draw: '平', pending: '进行中', unknown: '赛果未定' })[match.result] || '赛果未定', ({ win: 'WIN', loss: 'LOSS', draw: 'DRAW', pending: 'LIVE', unknown: 'UNSETTLED' })[match.result] || 'UNSETTLED')
  const score = match => match.scoreFor != null && match.scoreAgainst != null ? `${match.scoreFor} : ${match.scoreAgainst}` : '—'
  const model = {
    kind: chosen.kind, locale, role, roleLabel, seasonCode, identity: dossier.identity,
    title: text('我的这一季。', 'My season, on record.'),
    category: text('赛季档案', 'SEASON ARCHIVE'),
    rawHero: chosen.heroes[0]?.hero || '', heroCaption: text('本职责最多出场英雄', 'Most recorded hero in this role'),
    facts: [{ value: String(chosen.matches.length), label: text('场比赛出场', 'MATCHES PLAYED') }, { value: String(maps), label: text('图实际出场', 'MAPS PLAYED') }, { value: String(chosen.heroes.length), label: text('位出场英雄', 'HEROES RECORDED') }],
    detail: text(`${name} · ${dossier.identity.teamShort} · ${roleLabel}`, `${name} · ${dossier.identity.teamShort} · ${roleLabel}`),
    note: text('以已发布的个人出场为依据。同图换英雄不重复计算出场图数。', 'Based on published personal appearances. Hero switches do not add map appearances.'),
    rating: null,
    selectedMatchKey: '', selectedHeroKey: ''
  }
  if (chosen.kind === 'match') {
    const match = chosen.match
    const heroes = getRecordedPlayerHeroes([match])
    model.category = text('代表一战', 'A MATCH TO KEEP')
    model.title = `VS ${match.opponent.short}`
    model.seriesScore = score(match)
    model.detail = `${date(match)} · ${translateUiText(formatPlayerMatchStage(match.stage, en), locale)}`
    model.rawHero = heroes[0]?.hero || ''
    model.heroCaption = text('来自这一战的出场记录', 'Recorded in this match')
    model.facts = [{ value: Number.isFinite(match.rating) ? match.rating.toFixed(1) : '—', suffix: Number.isFinite(match.rating) ? '/ 10' : '', label: text(`${roleLabel}全场评分`, `${roleLabel} MATCH RATING`) }, { value: String(match.maps.length), label: text('图个人出场', 'PERSONAL MAP APPEARANCES') }, { value: result(match), label: text('所在队伍赛果', 'TEAM RESULT'), compact: true }]
    model.note = text('比分为本队在前；全场评分与出场图数只计本职责。', 'Score shows this player’s team first. Match rating and appearances include this role only.')
    model.selectedMatchKey = match.key
  } else if (chosen.kind === 'hero') {
    const hero = chosen.hero
    model.category = text('代表英雄', 'MY HERO RECORD')
    model.rawHero = hero.hero
    model.title = formatOwHeroName(hero.hero, locale)
    model.heroCaption = text('选自本季实际出场英雄', 'Chosen from this season’s appearances')
    model.detail = text(`这一季，有 ${hero.maps} 张地图留下了这个选择。`, `This choice is recorded on ${hero.maps} ${hero.maps === 1 ? 'map' : 'maps'} this season.`)
    const unsettled = hero.maps - hero.wins - hero.losses - hero.draws
    model.facts = [{ value: String(hero.maps), suffix: `/ ${maps}`, label: text('图有该英雄记录 / 本职责出场', 'HERO MAPS / ROLE MAPS') }, { value: String(hero.matches), label: text('场比赛使用', 'MATCHES RECORDED') }, { value: `${hero.wins}${text('胜', 'W')} / ${hero.losses}${text('负', 'L')}`, label: text(`地图赛果${hero.draws ? ` · ${hero.draws} 平` : ''}${unsettled ? ` · ${unsettled} 未定` : ''}`, `MAP RESULTS${hero.draws ? ` · ${hero.draws} D` : ''}${unsettled ? ` · ${unsettled} UNSETTLED` : ''}`), compact: true }]
    model.note = text('只计出现该英雄的本职责地图；图数不表示使用时长、熟练度或独立贡献。', 'Includes this role’s maps recording the hero. Counts do not measure playtime, proficiency or individual impact.')
    model.selectedHeroKey = hero.key
  } else if (maps > 0) {
    model.rating = { value: formatSeasonRatingValue(entry.entry), status: getSeasonRatingStatusLabel(entry.entry, locale) }
    if (chosen.hero) {
      const mostRecorded = chosen.hero.maps === chosen.heroes[0]?.maps
      const tied = chosen.heroes.filter(hero => hero.maps === chosen.hero.maps).length > 1
      model.rawHero = chosen.hero.hero
      model.heroCaption = mostRecorded ? tied ? text('本职责并列最多出场英雄', 'Joint most recorded hero in this role') : text('本职责最多出场英雄', 'Most recorded hero in this role') : text('选自本季实际出场英雄', 'Chosen from this season’s appearances')
      model.detail = text(`卡面英雄：${formatOwHeroName(chosen.hero.hero, locale)} · ${chosen.hero.maps} 图`, `Featured hero: ${formatOwHeroName(chosen.hero.hero, locale)} · ${chosen.hero.maps} ${chosen.hero.maps === 1 ? 'map' : 'maps'}`)
      model.selectedHeroKey = chosen.hero.key
    }
  } else {
    model.title = text('我在这一届。', 'Part of this season.')
    model.category = text('参赛选手档案', 'PLAYER ARCHIVE')
    model.facts = [{ value: roleLabel, label: text('登记职责', 'REGISTERED ROLE'), compact: true }, { value: dossier.identity.teamShort, label: text('所属战队', 'TEAM'), compact: true }, { value: seasonCode, label: text('参赛赛季', 'SEASON'), compact: true }]
    model.note = text('已收录本届登记身份，公开出场记录尚待补充。', 'The registered identity is on record. Published appearances are not available yet.')
  }
  model.heroLabel = model.rawHero ? formatOwHeroName(model.rawHero, locale) : dossier.identity.teamShort
  if (!model.rawHero) model.heroCaption = text('所属战队', 'TEAM IDENTITY')
  return model
}
