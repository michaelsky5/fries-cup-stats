import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = fileURLToPath(new URL('..', import.meta.url))
let MapResultControl, bundleDir
before(async () => {
  bundleDir = await mkdtemp(join(root, '.map-result-component-test-'))
  const result = await build({ root, configFile: false, plugins: [react()], logLevel: 'error',
    build: { ssr: join(root, 'src/features/weekly-competition/MapResultControl.jsx'), write: false, minify: false } })
  for (const chunk of result.output.filter(item => item.type === 'chunk')) await writeFile(join(bundleDir, chunk.fileName), chunk.code)
  const entry = result.output.find(item => item.type === 'chunk' && item.isEntry)
  MapResultControl = (await import(pathToFileURL(join(bundleDir, entry.fileName)).href)).default
})
after(async () => {
  if (!bundleDir) return
  assert.ok(resolve(bundleDir).startsWith(resolve(root) + sep) && resolve(bundleDir).includes('.map-result-component-test-'))
  await rm(bundleDir, { recursive: true, force: true })
})

function render({ staff = true, required, proposal = { valid: false, status: 'EXPIRED', payload: { scoreA: 0, scoreB: 2 } }, correcting = false } = {}) {
  const data = {
    access: { staff, operatorMode: staff ? 'REFEREE' : 'TEAM_CAPTAINS', representativeTeams: ['a'] },
    match: { id: 'local-map-result-test', teamA: { name: 'A' }, teamB: { name: 'B' }, format: 'RR5' },
    map: { order: 1, name: 'Ilios' }, canRecordMapResult: true, canCorrectMapResult: true,
    captainAgreements: { result: proposal }, ...(required === undefined ? {} : { mapResultTakeoverReasonRequired: required })
  }
  return renderToStaticMarkup(React.createElement(MapResultControl, { data, disabled: false, mutate: async () => {}, correcting }))
}

test('assigned staff get the required public reason field even when the captain proposal has expired', () => {
  const html = render({ required: true })
  assert.match(html, /公开更正原因/)
  assert.match(html, /<textarea[^>]*required=""/)
})
test('the current API determines whether takeover requires a reason, rather than an expired proposal view', () => {
  assert.doesNotMatch(render({ required: false }), /<textarea/)
})
test('an older API still lets staff explain takeover of an expired or disputed proposal', () => {
  assert.match(render(), /<textarea/)
  assert.match(render({ proposal: { valid: true, status: 'DISPUTED', payload: { scoreA: 0, scoreB: 2 } } }), /<textarea/)
})
test('captain score proposals do not receive the staff takeover field', () => {
  assert.doesNotMatch(render({ staff: false, required: true }), /<textarea/)
})
test('staff correcting an already recorded result must still enter the correction reason', () => {
  assert.match(render({ required: false, correcting: true }), /<textarea[^>]*required=""/)
})
