import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPreviewServer } from './serve.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/h5-account-visual')
if (JSON.parse(fs.readFileSync(path.join(root, 'account-visual-fixture.json'), 'utf8')).synthetic !== true) throw new Error('Expected a marked synthetic visual build')
createPreviewServer(undefined, { root }).listen(3041, '127.0.0.1', () => console.log('Synthetic account UI only: http://127.0.0.1:3041/#/account/pages/index'))
