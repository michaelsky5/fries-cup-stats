import assert from 'node:assert/strict'
import path from 'node:path'
import { build } from 'vite'
import { PRODUCTION_SYSTEM_APP_URL } from './productionBrowserEnv.mjs'

// Exercise Vite's browser substitution, rather than passing an explicit base
// to the source helpers (which cannot detect a missing production variable).
export async function checkProductionRoomLinks(root) {
  const bundle = await build({
    root, configFile: false, envDir: false, logLevel: 'silent',
    build: {
      write: false, minify: false,
      lib: {
        entry: {
          result: path.join(root, 'src/features/weekly-competition/roomResultLinks.js'),
          broadcast: path.join(root, 'src/features/weekly-competition/roomBroadcastLinks.js')
        },
        formats: ['es']
      }
    }
  })
  const output = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(result => result.output)
  async function exported(name) {
    const chunk = output.find(file => file.type === 'chunk' && file.exports.includes(name))
    assert.ok(chunk, `Missing built room link helper: ${name}`)
    assert.deepEqual(chunk.imports, [])
    const module = await import('data:text/javascript;base64,' + Buffer.from(chunk.code).toString('base64'))
    return module[name]
  }
  const resultUrl = await exported('systemPageUrl'), broadcastUrl = await exported('roomBroadcastUrl')
  for (const route of ['/submit/check', '/submit/synthetic-release-check?returnToRoom=1', '/match-workbench/synthetic-release-check']) {
    assert.equal(resultUrl(route), PRODUCTION_SYSTEM_APP_URL + route, 'Production battle report/review entry is missing or points to another System')
  }
  assert.equal(broadcastUrl('/api/weekly-broadcast/synthetic-release-check'), PRODUCTION_SYSTEM_APP_URL + '/api/weekly-broadcast/synthetic-release-check', 'Production room broadcast entry is missing or points to another System')
  return { systemOrigin: PRODUCTION_SYSTEM_APP_URL, reportAndReview: true, broadcast: true }
}
