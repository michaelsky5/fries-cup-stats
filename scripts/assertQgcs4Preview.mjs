import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildQgcs4Preview, resolveQgcs4BattleTag } from './buildQgcs4Preview.mjs'
import { getOwHero } from '../src/lib/heroes.js'
import { getHeroArtwork } from '../src/lib/heroArtwork.js'
import { PLAYER_COPY } from '../src/features/scouting/qgcs4/qgcs4PlayerNotes.js'
import { QGCS4_NATIONALITY_BY_PLAYER_ID } from '../src/features/scouting/qgcs4/qgcs4IdentityOverrides.js'
import { POSITION_COPY, UI_COPY, localize, textFor } from '../src/features/scouting/qgcs4/qgcs4PreviewCopy.js'
import { COMPARISON_FOCUSES, getBoundaryPlayers, getComparisonFocus, getComparisonPlayers, getEvidenceMatches, getHeroMapRecords, getLanguage, getMetricReference, getPositionPlayers, LANGUAGES, POSITION_CONFIG, POSITIONS, previewLink, QGCS4_REPORT_VERSION } from '../src/features/scouting/qgcs4/qgcs4PreviewModel.js'
import { qgcs4SeasonReport } from '../src/features/scouting/seasonReports/qgcs4SeasonReport.js'
import { listGeneratedSeasonReports, validateSeasonReportAdapter } from '../src/features/scouting/seasonReports/seasonReportAdapters.js'
import { getSeasonReportDefinition, SEASON_REPORT_SCHEMA_VERSION } from '../src/features/scouting/seasonReports/seasonReportCatalog.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = relative => fs.readFile(path.join(root, relative), 'utf8')
const data = JSON.parse(await read('src/features/scouting/qgcs4/qgcs4PreviewData.json'))
let checks = 0
const check = (description, action) => { action(); checks++; console.log(`PASS ${description}`) }

check('fixed V30 / revision 3 source and 20 dossiers', () => {
  assert.equal(data.source.season, 'QGCS4')
  assert.equal(data.source.publishVersion, 30)
  assert.equal(data.auditRevision, 3)
  assert.equal(data.players.length, 43)
  assert.equal(data.players.filter(player => player.selected).length, 20)
  assert.equal(data.counts.retainedEveryRefit, 14)
  assert.equal(data.counts.realMaps, 124)
})
const rebuilt = await buildQgcs4Preview()
check('projection matches the research artifact without recalculating scores', () => assert.deepEqual(data, rebuilt))
const identitySource = JSON.parse(await read('artifacts/qgcs4-scouting-review-v30/source.json'))
check('BattleTags are linked only by the unique V30 event player ID and matching team', () => {
  for (const player of data.players) {
    const records = identitySource.players.filter(record => record.player_id === player.id)
    assert.equal(records.length, 1)
    assert.equal(player.battleTag, records[0].player_name)
    assert.equal(player.team, records[0].team_short_name)
  }
  assert.equal(data.players.find(player => player.name === 'JUBE').battleTag, '狂野之裤#5236841')
  const candidate = data.players[0]
  const identity = identitySource.players.find(player => player.player_id === candidate.id)
  assert.throws(() => resolveQgcs4BattleTag([], candidate), /Expected one event identity/)
  assert.throws(() => resolveQgcs4BattleTag([identity, identity], candidate), /Expected one event identity/)
  assert.throws(() => resolveQgcs4BattleTag([{ ...identity, team_short_name: 'another team' }], candidate), /Event team mismatch/)
  assert.throws(() => resolveQgcs4BattleTag([{ ...identity, player_name: candidate.name }], candidate), /Invalid recorded BattleTag/)
})
check('five roles contain four dossier players and fixed full comparison pools', () => {
  for (const position of POSITIONS) {
    const selected = getPositionPlayers(data, position)
    assert.equal(selected.length, 4)
    assert.equal(getPositionPlayers(data, position, false).length, { TANK: 9, HITSCAN: 6, FLEX_DPS: 10, MAIN_SUPPORT: 8, FLEX_SUPPORT: 10 }[position])
    assert(selected.every(player => player.poolSize > 4 && player.position === position))
    assert.deepEqual(selected.map(player => player.rank), [1, 2, 3, 4])
    assert.equal(getBoundaryPlayers(data, position).length, POSITION_CONFIG[position].boundary.length)
  }
})
check('nationality uses the owner-confirmed 20 event IDs, not a blanket fallback', () => {
  const confirmedIds = Object.keys(QGCS4_NATIONALITY_BY_PLAYER_ID)
  assert.equal(confirmedIds.length, 20)
  assert.deepEqual(confirmedIds.sort(), data.players.filter(player => player.selected).map(player => player.id).sort())
  for (const player of data.players) assert.equal(player.nationality, player.selected ? 'CN-MAINLAND' : null)
  assert.equal(QGCS4_NATIONALITY_BY_PLAYER_ID['FCR26-P0001'], undefined)
  for (const lang of LANGUAGES) assert(textFor(lang, 'nationalityMainland').length > 0)
})
check('every dossier has trilingual conclusions and exactly two real match references', () => {
  for (const player of data.players.filter(player => player.selected)) {
    assert(PLAYER_COPY[player.id], player.id)
    for (const key of ['lead', 'strength', 'watch', 'question']) for (const lang of LANGUAGES) assert(localize(PLAYER_COPY[player.id][key], lang)?.length > 5)
    const matches = getEvidenceMatches(player)
    assert.equal(matches.length, 2)
    for (const match of matches) {
      assert(match.mapsUsed.length > 0)
      assert.equal(match.mapsUsed.length, match.maps)
      const url = new URL(match.url)
      assert.equal(url.origin, 'https://stats.fries-cup.com')
      assert.equal(url.pathname, `/matches/${match.id}`)
      assert.equal(url.searchParams.get('season'), 'QGCS4')
      assert(['GROUP', 'PLAYOFFS'].includes(match.stage))
    }
    assert(Math.abs(player.contributions.reduce((sum, factor) => sum + factor.points, 0) - player.score) < .051)
  }
  assert.equal(Object.keys(PLAYER_COPY).length, 20)
})
check('all interface strings and role summaries have three languages', () => {
  for (const [key, lines] of Object.entries(UI_COPY)) {
    assert.equal(lines.length, 3, key)
    assert(lines.every(line => typeof line === 'string' && line.length > 0), key)
    for (const lang of LANGUAGES) assert.equal(typeof textFor(lang, key), 'string')
  }
  for (const position of POSITIONS) for (const key of ['name', 'headline', 'summary', 'boundary']) assert.equal(POSITION_COPY[position][key].filter(Boolean).length, 3)
  assert.equal(textFor('en', 'maps', { n: 1 }), '1 map')
  assert.equal(textFor('en', 'maps', { n: 2 }), '2 maps')
  assert.equal(textFor('en', 'mapCoverage', { n: 1 }), '1 distinct map')
  assert.equal(textFor('en', 'heroMapCell', { hero: 'Ana', map: 'Route 66', n: 1 }), 'Ana · Route 66 · 1 appearance')
  assert.equal(textFor('zh', 'maps', { n: 1 }), '1 图')
})
check('URL navigation preserves language and reading depth', () => {
  assert.equal(getLanguage('fr'), 'zh')
  for (const lang of LANGUAGES) for (const position of POSITIONS) {
    const url = new URL(previewLink({ position, lang, detail: true }), 'http://localhost')
    assert(url.pathname.endsWith(`/positions/${POSITION_CONFIG[position].slug}`))
    assert.equal(url.searchParams.get('lang'), lang === 'zh' ? null : lang)
    assert.equal(url.searchParams.get('view'), 'analysis')
  }
  assert(previewLink({ playerId: 'invalid/?#' }).endsWith('invalid%2F%3F%23'))
  assert.equal(previewLink({ basePath: '/scouting/season-preview/qgcs4' }), '/scouting/season-preview/qgcs4')
  const linked = new URL(previewLink({ playerId: 'QGCS4-test', lang: 'ko', detail: true, compare: 'first,second', focus: 'heroes' }), 'http://localhost')
  assert.equal(linked.searchParams.get('compare'), 'first,second')
  assert.equal(linked.searchParams.get('focus'), 'heroes')
  assert.equal(linked.searchParams.get('view'), 'analysis')
  assert(!previewLink({ focus: 'not-real' }).includes('focus='))
})
check('comparison accepts only 2–3 shortlisted players from the current position', () => {
  for (const position of POSITIONS) {
    const candidates = getPositionPlayers(data, position)
    const defaultIds = candidates.slice(0, 2).map(player => player.id)
    assert.deepEqual(getComparisonPlayers(data, position).map(player => player.id), defaultIds)
    assert.deepEqual(getComparisonPlayers(data, position, `${candidates[3].id},${candidates[1].id}`).map(player => player.id), [candidates[1].id, candidates[3].id])
    assert.equal(getComparisonPlayers(data, position, candidates.map(player => player.id).join(',')).length, 3)
    assert.deepEqual(getComparisonPlayers(data, position, 'invalid,invalid').map(player => player.id), defaultIds)
    const foreign = data.players.find(player => player.position !== position)
    const reference = data.players.find(player => player.position === position && !player.selected)
    assert.deepEqual(getComparisonPlayers(data, position, `${candidates[0].id},${foreign.id},${reference.id}`).map(player => player.id), defaultIds)
  }
})
check('four evidence focuses do not rescore, reorder or mutate the model', () => {
  const before = JSON.stringify(data)
  assert.equal(getComparisonFocus('invalid'), 'overall')
  for (const focus of COMPARISON_FOCUSES) {
    assert.equal(getComparisonFocus(focus), focus)
    for (const lang of LANGUAGES) {
      assert(textFor(lang, `focus_${focus}`).length > 0)
      assert(textFor(lang, `focusHint_${focus}`).length > 0)
    }
    for (const position of POSITIONS) getComparisonPlayers(data, position)
  }
  assert.equal(JSON.stringify(data), before)
  assert.equal(QGCS4_REPORT_VERSION, '0.2')
  assert.equal(data.modelVersion, 'qgcs4-selection-v0.1')
})
check('hero-map cells count actual scoped appearances and link only to their recorded matches', () => {
  for (const player of data.players.filter(player => player.selected)) {
    const before = JSON.stringify(player)
    const records = getHeroMapRecords(player)
    assert.equal(records.total, player.scope.maps, player.name)
    assert.equal(records.cells.reduce((sum, cell) => sum + cell.count, 0), records.total)
    for (const hero of player.heroes) assert.equal(records.cells.filter(cell => cell.hero === hero.hero).reduce((sum, cell) => sum + cell.count, 0), hero.maps)
    for (const cell of records.cells) {
      assert(cell.count >= cell.matchIds.length && cell.matchIds.length > 0)
      assert.equal(cell.count, player.matches.flatMap(match => match.mapsUsed).filter(map => map.map === cell.map && map.hero === cell.hero).length)
      for (const id of cell.matchIds) assert(player.matches.find(match => match.id === id)?.mapsUsed.some(map => map.map === cell.map && map.hero === cell.hero))
    }
    assert.deepEqual(getHeroMapRecords({ ...player, matches: [...player.matches, ...player.matches] }), records)
    assert.equal(JSON.stringify(player), before)
  }
})
check('radar uses all eligible peers and reverses deaths, without treating a rank as a probability', () => {
  const player = data.players.find(item => item.name === 'Yunzb')
  const result = getMetricReference(data, player, 'dth')
  assert.equal(result.total, 6)
  assert.equal(result.rank, 2)
  assert.equal(result.value, 5.43)
  for (const candidate of data.players) for (const key of POSITION_CONFIG[candidate.position].metrics) {
    const metric = getMetricReference(data, candidate, key)
    assert(metric.percentile > 0 && metric.percentile < 100)
    assert(metric.rank >= 1 && metric.rank <= candidate.poolSize)
    assert(Number.isFinite(metric.median))
  }
})
check('unknown stage evidence and shortlist stability remain separate', () => {
  const find = name => data.players.find(player => player.name === name)
  assert.equal(find('黄昏').stage.playoff.status, 'NOT_OBSERVED')
  assert.equal(find('黄昏').review.retained, 36)
  assert.equal(find('Yunzb').stage.playoff.status, 'LIMITED_REFERENCE')
  assert.equal(find('JUBE').stage.playoff.status, 'COMPARABLE')
  assert.equal(find('JUBE').stage.change.status, 'LIMITED_SAMPLE')
  assert.equal(find('小歪').review.ties, 1)
  assert.equal(find('小歪').review.retained, 32)
})
check('presentation payload contains no contact or inferred identity fields', () => {
  const forbidden = /^(contact|contacts|phone|email|mobile|wechat|qq|realName|input|trace|reproducibility)$/i
  const visit = value => {
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) { assert(!forbidden.test(key), `Unexpected payload key ${key}`); visit(item) }
  }
  visit(data)
  assert(Buffer.byteLength(JSON.stringify(data)) < 150 * 1024)
})
const heroes = [...new Set(data.players.flatMap(player => player.heroes.map(hero => hero.hero)))]
for (const name of heroes) {
  const hero = getOwHero(name)
  assert(hero, name)
  await fs.access(path.join(root, `public/heroes/${hero.role}/${hero.assetKey.replace(/-/g, '_')}.png`))
  const art = getHeroArtwork(name, 'spotlight')
  assert(art, name)
  await fs.access(path.join(root, 'public', art.src))
}
check('portraits and transparent hero artwork exist', () => assert(heroes.length > 10))
const router = await read('src/app/router.jsx')
check('preview routes live only inside the DEV-only route collection', () => {
  const start = router.indexOf('const developmentRoutes = import.meta.env.DEV ? [')
  const end = router.indexOf('] : []', start)
  assert(start >= 0 && end > start)
  const developmentRoutes = router.slice(start, end)
  assert(developmentRoutes.includes('/scouting/qgcs4-preview/players/:playerId'))
  assert(developmentRoutes.includes('/scouting/qgcs4-preview/positions/:positionSlug'))
  assert(!`${router.slice(0, start)}${router.slice(end)}`.includes('Qgcs4PreviewPage'))
})
const wrapper = await read('src/pages/scouting/qgcs4/Qgcs4PreviewPage.jsx')
const jsx = await Promise.all(['SeasonReportPage.jsx', 'SeasonReportEvidence.jsx', 'SeasonReportDecisionBoard.jsx', 'SeasonReportPrimitives.jsx'].map(file => read(`src/pages/scouting/season-report/${file}`)))
check('used literal copy keys exist; original live model is not imported', () => {
  for (const code of jsx) {
    for (const match of code.matchAll(/textFor\(lang, '([^']+)'\s*[,)]/g)) assert(UI_COPY[match[1]], match[1])
    assert(!/scoutingReportModel|scoutingArtifactClient|fetch\(/.test(code))
  }
})
const previewCss = await read('src/pages/scouting/season-report/SeasonReport.module.css')
check('presentation directly shares the FCR26 stylesheet and exact position colors', () => {
  for (const code of jsx) assert(code.includes("import report from '../ScoutingReportPage.module.css'"))
  assert.deepEqual(POSITIONS.map(position => POSITION_CONFIG[position].color), ['#5d9cff', '#ff6969', '#ff9f45', '#5dde8a', '#36c8d8'])
  assert(!/system-ui|#ebc842|\.report\s+h[1-6]\b/.test(previewCss))
})
const reportCss = await read('src/pages/scouting/ScoutingReportPage.module.css')
check('overview controls use the original rail treatment with warm-neutral undecorated surfaces', () => {
  assert(reportCss.includes('--report-bg: #0b0a09;'))
  assert(reportCss.includes('--report-panel: #12110f;'))
  assert(reportCss.includes('--report-panel-strong: #1a1815;'))
  assert(reportCss.includes('rgba(18, 17, 15, 0.86);'))
  assert(!reportCss.includes('linear-gradient(100deg, rgba(20, 25, 33, 0.98), rgba(12, 15, 20, 0.98))'))
  for (const coldNeutral of [
    'rgba(17, 21, 27', 'rgba(12, 15, 20', 'rgba(9, 11, 15', 'rgba(8, 11, 15',
    'rgba(9, 12, 16', 'rgba(11, 14, 19', '#11151b', '#10141a', '#090b0f',
  ]) assert(!reportCss.includes(coldNeutral), coldNeutral)
  assert(!reportCss.includes('--report-stat-accent'))
  assert(!reportCss.includes('.reportStats > div::after'))
  assert(!/font-size:\s*[6-9]px/.test(reportCss))
  assert(!/font:\s*[^;]*\s[6-9]px\//.test(reportCss))
  assert(/@media \(max-width: 720px\)[\s\S]*?\.languageSwitch button \{ min-width: 44px; height: 44px; \}/.test(reportCss))
  const statisticCardRule = reportCss.match(/\.reportStats > div\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  assert(statisticCardRule.includes('background: rgba(18, 17, 15, 0.94);'))
  assert(!/radial-gradient|linear-gradient/.test(statisticCardRule))
})

check('collapsed dossier evidence does not reserve phantom offscreen height', () => {
  assert(/\.coachAuditDisclosure:not\(\[open\]\),\s*\n\.detailVersionFooter\s*\{[\s\S]*?content-visibility:\s*visible;[\s\S]*?contain-intrinsic-size:\s*none;/.test(reportCss))
  assert(/\.detailPage\[data-audience='manager'\] \.profileGrid,[\s\S]*?\.managerProfessionalReference\s*\{[\s\S]*?content-visibility:\s*visible;[\s\S]*?contain-intrinsic-size:\s*none;/.test(reportCss))
  assert(/<ReportDisclosure title=\{textFor\(lang, 'furtherReading'\)\} kicker="SAME POSITION">/.test(jsx[0]))
  assert(/\.report\[data-season-scouting-report\]\[data-audience='coach'\] \.disclosure\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?contain-intrinsic-size:\s*none !important;/.test(previewCss))
})
const legacyReportPage = await read('src/pages/scouting/ScoutingReportPage.jsx')
const generatedReportPage = jsx[0]
const generatedPrimitives = jsx[3]
const sharedChrome = await read('src/pages/scouting/shared/ScoutingReportChrome.jsx')
check('legacy and generated seasons share the canonical report chrome and entry state', () => {
  assert(legacyReportPage.includes("from './shared/ScoutingReportChrome.jsx'"))
  assert(generatedPrimitives.includes("from '../shared/ScoutingReportChrome.jsx'"))
  for (const component of ['ScoutingReportHeader', 'ScoutingReportHero', 'ScoutingReportVersion', 'ScoutingReportAudience', 'ScoutingDossierSnapshot']) assert(sharedChrome.includes(`function ${component}`))
  assert(legacyReportPage.includes('<ScoutingDossierSnapshot'))
  assert(generatedReportPage.includes('<ScoutingDossierSnapshot'))
  assert(generatedReportPage.includes("decisionBriefTitle"))
  assert(generatedReportPage.includes("data-role-focus={position && !player ? 'true' : 'false'}"))
  assert(!generatedReportPage.includes('ScrollRestoration'))
  assert(generatedReportPage.includes('className={report.marketCardMain} to={positionHref}'))
})
check('one registered season adapter drives the shared report page', () => {
  assert.equal(SEASON_REPORT_SCHEMA_VERSION, 'season-scouting-report-v1')
  assert.equal(getSeasonReportDefinition('qgcs4').renderer, 'role-relative-v1')
  assert.equal(getSeasonReportDefinition('FCR26').renderer, 'legacy-fcr26')
  assert.equal(listGeneratedSeasonReports().length, 1)
  assert.equal(validateSeasonReportAdapter(qgcs4SeasonReport), qgcs4SeasonReport)
  assert.deepEqual(qgcs4SeasonReport.data, data)
  assert.match(wrapper, /createSeasonReportPage\(qgcs4SeasonReport\)/)
  assert(!/Qgcs4Evidence|Qgcs4DecisionBoard|Qgcs4Preview\.module\.css/.test(wrapper))
  for (const code of jsx) assert(!/features\/scouting\/qgcs4|Qgcs4Preview|QGCS4_REPORT/.test(code))
  assert(router.includes('/scouting/season-preview/:seasonId'))
  assert(router.includes('GeneratedSeasonReportRoute.jsx'))
})
console.log(`QGCS4 preview: ${checks} contracts passed. Browser/mobile verification is separate.`)
