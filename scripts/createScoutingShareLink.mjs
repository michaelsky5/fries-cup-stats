import { randomBytes } from 'node:crypto'

function readOption(name) {
  const directIndex = process.argv.indexOf(`--${name}`)
  if (directIndex >= 0) return process.argv[directIndex + 1]
  const prefix = `--${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length)
}

function cleanLabel(value) {
  return String(value || 'Club access').replaceAll(',', ' ').replaceAll('=', ' ').trim() || 'Club access'
}

const baseUrlInput = readOption('base-url') || 'http://127.0.0.1:3026'
const language = readOption('lang') || 'zh'
const label = cleanLabel(readOption('label'))

try {
  if (!['zh', 'en', 'ko'].includes(language)) throw new Error('--lang must be zh, en, or ko.')

  const baseUrl = new URL(baseUrlInput)
  const shareKey = `fcr26-club-${randomBytes(18).toString('hex')}`
  const shareUrl = new URL(`/scouting/${shareKey}`, baseUrl)
  if (language !== 'zh') shareUrl.searchParams.set('lang', language)

  console.log(JSON.stringify({
    shareUrl: shareUrl.toString(),
    shareKey,
    viteEnvironmentValue: `${shareKey}=${label}`,
    vercelVariable: 'VITE_SCOUTING_ACCESS_KEYS',
    note: 'Anyone with this link can forward it. Replace the environment value and redeploy to rotate the link.'
  }, null, 2))
} catch (error) {
  console.error(error?.message || 'Unable to create scouting share link.')
  process.exitCode = 1
}
