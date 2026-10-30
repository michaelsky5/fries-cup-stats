import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicSnapshotFileStore, PUBLIC_CACHE_MAX_BYTES } from '../src/shared/publicSnapshotCache.js'

test('the public file cache keeps events separate and bounds both disk reads and UTF-8 writes', async () => {
  const files = new Map(), calls = []
  const fileSystem = {
    stat({ path, success }) { success({ stats: { size: files.get(path)?.length || 0 } }) },
    readFile({ filePath, success }) { success({ data: files.get(filePath) }) },
    writeFile({ filePath, data, success }) { calls.push(filePath); files.set(filePath, data); success({}) }
  }
  const weekly = createPublicSnapshotFileStore({ fileSystem, root: '/device', seasonId: 'FCW26' })
  const archive = createPublicSnapshotFileStore({ fileSystem, root: '/device', seasonId: 'FCR26' })
  await weekly.write({ data: '公开记录', version: 1 })
  await archive.write({ data: 'Archive', version: 1 })
  assert.deepEqual(await weekly.read(), { data: '公开记录', version: 1 })
  assert.deepEqual(await archive.read(), { data: 'Archive', version: 1 })
  assert.notEqual(calls[0], calls[1])
  await weekly.write({ data: '汉'.repeat(PUBLIC_CACHE_MAX_BYTES / 2) })
  assert.equal(calls.length, 2, 'Oversized multibyte public data is not saved')
  fileSystem.stat = ({ success }) => success({ stats: { size: PUBLIC_CACHE_MAX_BYTES + 1 } })
  fileSystem.readFile = () => assert.fail('Oversized disk content must not be read')
  assert.equal(await weekly.read(), null)
  assert.throws(() => createPublicSnapshotFileStore({ fileSystem, root: '/device', seasonId: '../account' }), /Unknown/)
})
