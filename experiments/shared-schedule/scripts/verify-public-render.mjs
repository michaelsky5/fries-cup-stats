// Render the native adapter against real public snapshots. This catches JSX
// failures that pure model checks cannot see, without a second data fixture.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { transformSync } = require('@babel/core')
const trial = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stats = path.resolve(trial, '../..')
const cache = new Map()
const noAction = () => undefined
const component = tag => ({ children, ...props }) => React.createElement(tag, {
  ...(props.className ? { className: props.className } : {})
}, children)
const platform = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : noAction })
const taro = new Proxy({ __esModule: true, default: platform }, { get: (value, key) => key in value ? value[key] : noAction })
const components = new Proxy({ Button: component('button'), Picker: component('span'), Canvas: component('canvas') }, { get: (value, key) => value[key] || component('span') })

function resolveLocal(specifier, parent) {
  const filename = path.resolve(path.dirname(parent), specifier)
  return [filename, `${filename}.js`, `${filename}.jsx`, `${filename}.json`, path.join(filename, 'index.js')].find(fs.existsSync)
}
function load(filename) {
  if (filename === path.join(stats, 'src/config/seasons.js')) filename = path.join(trial, 'src/shared/publicSeasons.js')
  if (filename === path.join(stats, 'src/lib/locales.js')) filename = path.join(trial, 'src/shared/nativeLocales.js')
  if (filename === path.join(stats, 'src/lib/localeCatalog.js')) filename = path.join(trial, 'src/generated/localeCatalog.js')
  if (filename === path.join(trial, 'src/platform.js')) return platform
  if (!filename) throw new Error('Unresolved adapter dependency')
  if (/\.css$/.test(filename)) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
  if (/\.json$/.test(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({ DEV: false })')
  const { code } = transformSync(source, {
    filename, babelrc: false, configFile: false,
    presets: [[require('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [require('./native-copy.cjs'), require('@babel/plugin-transform-modules-commonjs')]
  })
  const localRequire = name => name === '@tarojs/taro' ? taro : name === '@tarojs/components' ? components : name.startsWith('.') ? load(resolveLocal(name, filename)) : require(name)
  new Script(`(function(require,module,exports){${code}\n})`, { filename }).runInThisContext()(localRequire, module, module.exports)
  return module.exports
}

const { SEASONS } = load(path.join(trial, 'src/shared/publicSeasons.js'))
const { validatePublicSnapshot } = load(path.join(trial, 'src/shared/publicSnapshot.js'))
const { initialSelection } = load(path.join(trial, 'src/shared/model.js'))
const { createBrowseState } = load(path.join(trial, 'src/shared/browseState.js'))
const { emptyFollowing } = load(path.join(trial, 'src/shared/followingStore.js'))
const { publicEvidence } = load(path.join(trial, 'src/shared/historicalModel.js'))
const { getReviewReadiness } = load(path.join(stats, 'src/lib/reviewReadiness.js'))
const { prepareReviewDb } = load(path.join(stats, 'src/lib/reviewSeason.js'))
const builders = load(path.join(stats, 'src/lib/reviewStoryBuilders.js'))
const { publicStoryScenes } = load(path.join(trial, 'src/shared/publicStoryModel.js'))
const { activateLocale } = load(path.join(trial, 'src/shared/nativeLocales.js'))
const { protectPublicIdentities } = load(path.join(trial, 'src/shared/nativeCopy.js'))
const Center = load(path.join(trial, 'src/shared/SharedCenter.jsx')).default
const Archive=load(path.join(trial,'src/shared/NativeArchivePage.jsx')).default
const Match=load(path.join(trial,'src/shared/NativeMatchPage.jsx')).default
const nativeRenderers=Object.fromEntries(['directory','ranking','following','player','team','evidence','review','advance'].map(kind=>[kind,load(path.join(trial,`src/${kind}/pages/index.jsx`)).Render]))
const {publicPageKind}=load(path.join(trial,'src/shared/centerPaths.js'))
const reports = [], failures = []
process.env.TARO_ENV = 'weapp'
for (const locale of ['zh-CN','en-US','ko-KR','zh-TW']) for (const season of SEASONS) {
  activateLocale(locale)
  const raw = validatePublicSnapshot(JSON.parse(fs.readFileSync(path.join(process.argv[2], `${season.id}-public.json`), 'utf8')), season)
  protectPublicIdentities(raw)
  const selection = { ...(season.competitionFormat === 'WEEKLY' ? initialSelection(raw) : {}), seasonId: season.id }
  const browseState = createBrowseState(), following = emptyFollowing(season.id)
  const run = (label, view, params = {}, browse = browseState) => {
    try {
      const kind=publicPageKind({view,season:season.id,...params})
      const Renderer=kind==='match'?Match:kind==='archive'?Archive:nativeRenderers[kind]||Center
      const html = renderToStaticMarkup(React.createElement(Renderer, {
        raw, season, locale, selection, view, params: { season: season.id, ...params }, following,
        browseState: browse, onBrowseState: noAction, onFollow: noAction, onNavigate: noAction,
        onSelection: noAction, onPublicRoute:noAction, fetchedAt: Date.now(), onRetry: noAction
      }))
      assert.ok(html.includes('center-root') && html.length > 250, 'Expected a full native center')
      if (params.story) assert.ok(html.includes('storyCanvas'), 'Expected canonical story scenes, not an empty fallback')
      if(Renderer===Archive)for(const chapter of ['archive-season-atlas','archive-title-road','archive-player-files'])assert.ok(html.includes(chapter),'Expected the original full historical home')
      if(Renderer===Match)assert.ok(html.includes('signal-coach'),'Expected the original Signal match detail')
      reports.push({ season: season.id, locale, label, bytes: Buffer.byteLength(html) })
    } catch (error) { failures.push({ season: season.id, locale, label, error: error.message }) }
  }
  for (const view of ['overview', 'matches', 'database', 'space', 'advance', 'roster', 'maps', 'heroes', 'staff', 'review', 'history']) run(view, view)
  run('leaderboard', 'database', {}, { ...browseState, database: { ...browseState.database, tab: 'players' } })
  run('players', 'roster', {directory:'players'})
  run('teams', 'roster', {directory:'teams'})
  for (const phase of publicEvidence(raw, season, 'advance').phaseState.phases) run(`advance:${phase}`, 'advance', {}, { ...browseState, advance: { ...browseState.advance, phase } })
  for (const match of [raw.matches[0], raw.matches.at(-1)]) run(`match:${match.match_id}`, 'matches', { id: match.match_id })
  for (const section of ['archive', 'journey', 'analysis']) {
    run(`team:${section}`, 'roster', { team: raw.teams[0].team_id, dossierView:section==='archive'?'':section })
    run(`player:${section}`, 'roster', { player: raw.players[0].player_id, dossierView:section==='archive'?'':section })
  }
  for (const topic of ['team', 'members', 'heroes', 'opponents', 'maps']) run(`team-analysis:${topic}`, 'roster', { team: raw.teams[0].team_id, section: 'analysis', topic })
  const maps = publicEvidence(raw, season, 'maps'), heroes = publicEvidence(raw, season, 'heroes'), staff = publicEvidence(raw, season, 'staff')
  run('map-detail', 'maps', { map: maps.maps[0].routeName })
  run('hero-detail', 'heroes', { hero: heroes.heroes[0].name })
  for (const person of [staff.find(item => item.team), staff.find(item => !item.team)].filter(Boolean)) run(`staff:${person.id}`, 'staff', { staff: person.id })
  if (getReviewReadiness(season, raw).available) {
    const db = prepareReviewDb(raw)
    const stories = [
      { story: 'tournament', scenes: builders.buildTournamentStory(db) },
      { story: 'player', subject: raw.players[0].player_id, scenes: builders.buildPlayerStory(db, raw.players[0].player_id) },
      { story: 'team', subject: raw.teams[0].team_id, scenes: builders.buildTeamStory(db, raw.teams[0].team_id) }
    ]
    for (const person of staff) {
      if (!person.team && ['admin', 'caster'].includes(person.role)) {
        const key = person.id.split(':').slice(2).join(':')
        stories.push({ story: 'staff-key', role: person.role, subject: key, scenes: builders.buildStaffStory(db, person.role, key) })
        break
      }
    }
    const teamStaff = staff.find(person => person.team && person.identityKey)
    if (teamStaff) stories.push({ story: 'person', subject: teamStaff.identityKey }, { story: 'staff', subject: teamStaff.id })
    for (const { scenes: _rawScenes, ...params } of stories) {
      const scenes = publicStoryScenes(raw, params, locale)
      for (let scene = 0; scene < scenes.length; scene++) run(`story:${params.story}:${scene}`, 'review', { ...params, scene: String(scene+1) })
    }
  }
}
const report = { cases: reports.length + failures.length, passed: reports.length, failures, renders: reports }
if (process.argv[3]) fs.writeFileSync(path.join(process.argv[3], 'public-render-smoke.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ cases: report.cases, passed: report.passed, failures: [...new Map(failures.map(item => [item.error, item])).values()] }))
if (failures.length) process.exitCode = 1
