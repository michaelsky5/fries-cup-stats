import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const environment = { ...process.env, TARO_ENV: 'h5', NATIVE_ACCOUNT_VISUAL_FIXTURE: '1' }
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: environment, stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) process.exit(result.status || 1)
}
run(['scripts/prepare-design.mjs'])
run(['scripts/check-native-boundaries.mjs'])
run(['scripts/prepare-intl.mjs'])
const cli = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@tarojs/cli/package.json'), 'utf8'))
run([path.join(root, 'node_modules/@tarojs/cli', cli.bin.taro), 'build', '--type', 'h5'])
fs.writeFileSync(path.join(root, 'dist/h5-account-visual/account-visual-fixture.json'), JSON.stringify({ synthetic: true, productionAcceptance: false }) + '\n')
