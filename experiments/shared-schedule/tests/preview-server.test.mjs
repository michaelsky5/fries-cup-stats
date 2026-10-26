import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createPreviewServer } from '../scripts/serve.mjs'

test('a failed upstream response body returns 502 and the preview server remains usable', async () => {
  let calls = 0
  const server = createPreviewServer(async () => ({ status: 200, text: async () => {
    if (++calls === 1) throw new Error('Upstream body interrupted')
    return JSON.stringify({ public: true })
  } }))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/public/seasons/FCW26/publish/latest/data`
    const failed = await fetch(url)
    assert.equal(failed.status, 502)
    assert.deepEqual(await failed.json(), { error: 'Public API unavailable' })
    const recovered = await fetch(url)
    assert.equal(recovered.status, 200)
    assert.deepEqual(await recovered.json(), { public: true })
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
