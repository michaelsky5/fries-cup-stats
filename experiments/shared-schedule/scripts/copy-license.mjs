import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
if (!['h5', 'weapp'].includes(target)) throw new Error('Expected h5 or weapp')
fs.copyFileSync(path.resolve(root, '../../public/fonts/barlow-condensed/OFL.txt'), path.join(root, 'dist', target, 'FONT-LICENSE.txt'))
const packages = ['intl-getcanonicallocales', 'intl-locale', 'intl-localematcher', 'intl-enumerator', 'intl-pluralrules', 'intl-numberformat', 'intl-datetimeformat', 'ecma402-abstract', 'fast-memoize']
const notices = packages.map(name => `@formatjs/${name}\n\n` + fs.readFileSync(path.join(root, 'node_modules/@formatjs', name, 'LICENSE.md'), 'utf8'))
fs.writeFileSync(path.join(root, 'dist', target, 'INTL-LICENSES.txt'), notices.join('\n\n'))
fs.cpSync(path.join(root, 'src/generated/navigation'), path.join(root, 'dist', target, 'assets/navigation'), { recursive: true })
fs.cpSync(path.join(root, 'src/generated/mobile-assets'), path.join(root, 'dist', target, 'assets/mobile'), { recursive: true })
fs.copyFileSync(path.join(root, 'src/generated/share-public.png'), path.join(root, 'dist', target, 'assets/share-public.png'))
if (fs.existsSync(path.join(root,'dist',target,'poster/pages/index.js'))) fs.cpSync(path.join(root,'src/poster/assets'),path.join(root,'dist',target,'poster/assets/review-emblems'),{recursive:true})
fs.copyFileSync(path.resolve(root,'../../node_modules/qrcode/license'),path.join(root,'dist',target,'QRCODE-LICENSE.txt'))

fs.cpSync(path.resolve(root, '../../node_modules/opencc-js/LICENSES'), path.join(root, 'dist', target, 'OPENCC-LICENSES'), {recursive:true})
fs.copyFileSync(path.resolve(root, '../../node_modules/opencc-js/LICENSE'), path.join(root, 'dist', target, 'OPENCC-LICENSE.txt'))
fs.copyFileSync(path.resolve(root, '../../node_modules/opencc-js/THIRD_PARTY_LICENSES.md'), path.join(root, 'dist', target, 'OPENCC-THIRD-PARTY-LICENSES.md'))
