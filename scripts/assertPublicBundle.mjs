import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const build = resolve(process.argv[2] || 'dist')
const manifest = JSON.parse(readFileSync(resolve(build, '.vite/manifest.json'), 'utf8'))
const roots = ['index.html', 'src/app/App.jsx', 'src/layouts/DataLayout.jsx', 'src/pages/home/HomePage.jsx', 'src/features/weekly-overview/SignalWeeklyOverview.jsx']
const visited = new Set()
function visit(key) {
  if (visited.has(key)) return
  const entry = manifest[key]
  assert.ok(entry, `Missing built route: ${key}`)
  visited.add(key)
  for (const dependency of entry.imports || []) visit(dependency)
}
roots.forEach(visit)
const files = [...visited].map(key => manifest[key].file)
assert.ok(!files.some(file => /scoringEngineAdapter|StandardHomePage|KprArchive|RadarChart|pdf-lib|html2canvas|traditionalConverter/.test(file)), 'the weekly landing route must not eagerly load archive, scoring, chart or export libraries')
const images = Object.entries(manifest).filter(([key]) => /node_modules\/(?:html2canvas|html-to-image)\//.test(key))
assert.equal(images.length, 2, 'both image exporters remain separate dynamic entries')
for (const [key, entry] of images) {
  assert.equal(entry.isDynamicEntry, true)
  assert.equal(visited.has(key), false)
}
const gzipBytes = files.filter(file => file.endsWith('.js')).reduce((sum, file) => sum + gzipSync(readFileSync(resolve(build, file))).length, 0)
assert.ok(gzipBytes < 420_000, `Weekly landing JavaScript exceeded 420 kB gzip: ${gzipBytes}`)
console.log(JSON.stringify({ staticChunks: files.length, gzipBytes, boundary: 'Built dependency graph; browser request and font/asset budgets are verified separately.' }))
