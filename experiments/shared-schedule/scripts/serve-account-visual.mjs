import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPreviewServer } from './serve.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/h5-account-visual')
if (JSON.parse(fs.readFileSync(path.join(root, 'account-visual-fixture.json'), 'utf8')).synthetic !== true) throw new Error('Expected a marked synthetic visual build')
const port = Number(process.env.NATIVE_ACCOUNT_VISUAL_PORT || 3041)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local visual preview port')
createPreviewServer(undefined, { root }).listen(port, '127.0.0.1', () => console.log('Synthetic account UI only: http://127.0.0.1:' + port + '/#/account/pages/index'))
