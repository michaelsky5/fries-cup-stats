import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import sharp from 'sharp'
import { parse } from '@babel/parser'
import { portableScheduleCss } from './portable-css.mjs'
import { navigationSources, prepareNavigation } from './prepare-navigation.mjs'
import { mobileDesignSources, prepareMobileDesign } from './prepare-mobile-design.mjs'
import { nativePublicFoundationCss } from './prepare-public-foundation.mjs'
import './prepare-seasons.mjs'
import './prepare-team-model.mjs'
import './prepare-classic.mjs'
import './prepare-review-posters.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stats = path.resolve(root, '../..')
const out = path.join(root, 'src/generated')
fs.mkdirSync(out, { recursive: true })
const brandPath = path.join(stats, 'src/styles/fries-cup-data-system.css')
const brand = postcss.parse(fs.readFileSync(brandPath, 'utf8'))
// Public components also inherit the canonical portal and role palette from
// Stats' root tokens. Omitting these leaves var(--portal-yellow), for example,
// unresolved in the native account avatar and silently makes it transparent.
const rootTokensPath = 'src/styles/tokens.css'
const publicGlobalsPath = 'src/styles/globals.css'
fs.writeFileSync(path.join(out,'public-foundation.css'),nativePublicFoundationCss(fs.readFileSync(path.join(stats,publicGlobalsPath),'utf8')))
const rootTokens = postcss.parse(fs.readFileSync(path.join(stats, rootTokensPath), 'utf8'))
const inheritedDeclarations = rootTokens.nodes.filter(node => node.type === 'rule' && node.selector === ':root').flatMap(node => node.nodes.filter(declaration => declaration.type === 'decl' && declaration.prop.startsWith('--')).map(declaration => declaration.toString() + ';')).join('\n')
const rule = brand.nodes.find(node => node.type === 'rule' && node.selector.includes('[data-design="signal"]'))
if (!rule) throw new Error('Stats canonical design tokens not found')
const declarations = rule.nodes.filter(node => node.type === 'decl' && node.prop.startsWith('--fc-data-')).map(node => node.toString() + ';').join('\n')
const tokens = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))
const font = fs.readFileSync(path.join(stats, 'public/fonts/barlow-condensed/BarlowCondensed-Black.ttf')).toString('base64')
fs.writeFileSync(path.join(out, 'brand.css'), `/* postcss-pxtransform disable */\n/* Generated from current Stats tokens; do not edit. */\n@font-face {font-family:"FC Data Display";src:url("data:font/ttf;base64,${font}") format("truetype");font-weight:900;font-display:swap;}\n.shared-root {${inheritedDeclarations}\n${declarations}\n--font-sans:"PingFang SC","Microsoft YaHei",sans-serif;--font-mono:var(--font-sans);font-family:var(--font-sans);font-size:14px;line-height:1.5;background:var(--fc-data-paper);color:var(--fc-data-ink);}\n`)
const viewStyles = {
  StatsOverview: 'src/features/weekly-overview/SignalWeeklyOverview.module.css',
  StatsRoster: 'src/features/roster-directory/RosterDirectory.module.css'
}
const shareLogo = 'public/logos/fc_data_center.svg'
prepareMobileDesign(stats,out)
const sources = ['src/styles/fries-cup-data-system.css', 'src/features/match-schedule/SignalWeeklySchedule.module.css', 'src/features/match-schedule/weeklyScheduleModel.js', 'src/features/weekly-overview/weeklyOverviewModel.js', 'src/features/weekly-advance/weeklyAdvanceModel.js', ...Object.values(viewStyles), ...navigationSources, ...mobileDesignSources, rootTokensPath, publicGlobalsPath, shareLogo]
// Record the canonical model closure used by the native adapters as well as
// the generated styles. Boundary replacements do not pull Web storage/private
// season modules into this build. Team bindings are extracted from this source.
sources.push('src/locales/en-US.js', 'src/locales/ko-KR.js', 'src/locales/zh-TW.js', 'src/lib/locales.js', 'src/config/seasons.js', 'src/pages/teams/TeamDetailPage.jsx', 'public/fonts/barlow-condensed/BarlowCondensed-Black.ttf')
const seen = new Set()
function visit(filename) {
  if (seen.has(filename)) return
  seen.add(filename)
  const relative = path.relative(stats, filename).replaceAll('\\', '/')
  const canonical = relative.startsWith('src/') && !relative.startsWith('src/generated/') && !relative.startsWith('src/shared/')
  if (canonical) sources.push(relative)
  if (!/\.[cm]?jsx?$/.test(filename) || /[\\/]src[\\/](config[\\/]seasons|lib[\\/]localeCatalog)\.js$/.test(filename)) return
  const ast = parse(fs.readFileSync(filename, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
  for (const statement of ast.program.body) {
    const source = statement.source?.value
    if (typeof source !== 'string' || !source.startsWith('.')) continue
    const base = path.resolve(path.dirname(filename), source)
    const dependency = [base, `${base}.js`, `${base}.jsx`, `${base}.json`, path.join(base, 'index.js')].find(file => fs.existsSync(file) && fs.statSync(file).isFile())
    if (dependency && (dependency.startsWith(path.join(root, 'src') + path.sep) || dependency.startsWith(path.join(stats, 'src') + path.sep))) visit(dependency)
  }
}
for (const file of fs.readdirSync(path.join(root, 'src/shared'))) if (/\.[cm]?jsx?$/.test(file)) visit(path.join(root, 'src/shared', file))
visit(path.join(root, 'src/generated/canonicalTeamModel.js'))
visit(path.join(root, 'src/generated/poster/reviewPayload.js'))
visit(path.join(root, 'src/poster/pages/index.jsx'))
sources.push('src/pages/review/ReviewStoryPage.jsx','src/lib/reviewPoster.js','src/lib/reviewBoardingPass.js')
for (const name of fs.readdirSync(path.join(stats,'public/review/hero-marks'))) if (name.endsWith('.svg')) sources.push('public/review/hero-marks/'+name)
for (const dir of ['engine','pages','components']) for (const name of fs.readdirSync(path.join(stats,'src/EsportsManagerClassic',dir))) sources.push(`src/EsportsManagerClassic/${dir}/${name}`)
const manifest = Object.fromEntries(sources.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(stats, file))).digest('hex')]))
fs.writeFileSync(path.join(out, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(path.join(out, 'StatsSchedule.module.css'), portableScheduleCss(fs.readFileSync(path.join(stats, sources[1]), 'utf8')))
for (const [name, file] of Object.entries(viewStyles)) fs.writeFileSync(path.join(out, `${name}.module.css`), portableScheduleCss(fs.readFileSync(path.join(stats, file), 'utf8')))
await prepareNavigation(stats, out, tokens)
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#171a14" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>')).resize(48,48).png().toFile(path.join(out,'mobile-assets/search.png'))
await import('./prepare-locales.mjs')
await sharp(path.join(stats, shareLogo)).resize(500, 300, { fit: 'contain', background: tokens['--fc-data-paper'] }).extend({ top: 90, bottom: 90, left: 50, right: 50, background: tokens['--fc-data-paper'] }).png().toFile(path.join(out, 'share-public.png'))
console.log('Generated Stats tokens, font, mobile schedule and navigation design; models are imported directly.')
