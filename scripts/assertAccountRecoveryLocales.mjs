import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ensureUiLocale, getUiCatalog } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'
import { accountSettingsError } from '../src/features/account-security/accountFoundationSettings.js'
import { validateRecoveryApplication, validateRecoveryPassword } from '../src/features/account-security/accountRecoveryModel.js'

const sources = [
  'src/pages/account/AccountRecoveryPage.jsx',
  'src/features/account-security/EmailChangePanel.jsx',
  'src/features/account-security/accountRecoveryModel.js',
  'src/features/account-security/accountFoundationSettings.js'
]
const messages = new Set(sources.flatMap(file => [...readFileSync(new URL('../' + file, import.meta.url), 'utf8')
  .matchAll(/'([^'\r\n]*[\u4e00-\u9fff][^'\r\n]*)'/g)].map(match => match[1])))
for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
  await ensureUiLocale(locale)
  for (const message of messages) {
    assert.equal(typeof getUiCatalog(locale)[message], 'string', `${locale}: missing catalog entry ${message}`)
    const translated = translateUiText(message, locale)
    assert(translated.trim(), `${locale}: empty message ${message}`)
    if (locale !== 'zh-TW') assert(!/[\u4e00-\u9fff]/.test(translated), `${locale}: untranslated message ${message}`)
  }
  for (const error of [
    accountSettingsError({ data: { error: 'EMAIL_CHANGE_CONFLICT' } }),
    accountSettingsError({ data: { error: 'RECOVERY_TOKEN_INVALID' } }),
    accountSettingsError({ status: 503 }),
    validateRecoveryApplication({ currentEmail: 'same@example.test', newEmail: 'same@example.test', reason: '', evidence: '' }),
    validateRecoveryPassword('short', 'other')
  ]) assert(translateUiText(error, locale), `${locale}: missing validation feedback`)
}
console.log(`Account recovery locales passed: ${messages.size} UI messages, status, validation and error copy in three locales.`)
