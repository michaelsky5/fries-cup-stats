import { translateUiText } from '../../lib/uiText.js'

const fields = { name: '队伍名称', shortName: '队伍简称', contact: '负责人 QQ', displayName: '选手称呼', battleTag: 'BattleTag', email: '邮箱', eligibility: '本人参赛资格', details: '队伍资料', ranks: '段位', rulesAccepted: '规则确认', logoImage: '队伍 Logo', logoUrl: '队标链接', profile: '本人资料', region: '赛区', history: '历史赛事表现', tank: '重装', damage: '输出', support: '支援', password: '密码', consent: '本人确认', countryGroup: '国籍／地区', countryOrRegion: '国籍或国家、地区', owcs2026: 'OWCS 参赛经历' }
const fieldLabels = new Set(Object.values(fields))

export function translateRegistrationError(message, locale) {
  return message.split('\n').map(line => {
    const translated = translateUiText(line, locale)
    if (translated !== line || !line.includes('：')) return translated
    const separator = line.indexOf('：')
    const labels = line.slice(0, separator).split(' / ')
    if (!labels.every(label => fieldLabels.has(label))) return translated
    return `${labels.map(label => translateUiText(label, locale)).join(' / ')}${/^(en|ko)/.test(locale) ? ': ' : '：'}${translateUiText(line.slice(separator + 1), locale)}`
  }).join('\n')
}

export function describeRegistrationError(failure) {
  const issues = failure.data?.issues || []
  return [failure.message, ...issues.map(issue => {
    if (typeof issue === 'string') return issue
    const label = (issue.path || []).map(key => fields[key] || key).join(' / ')
    let message = issue.message
    if (!/[\u3400-\u9fff]/u.test(message || '')) {
      if (issue.code === 'too_small') message = `至少需要 ${issue.minimum} 个字符。`
      else if (issue.code === 'too_big') message = `不能超过 ${issue.maximum} 个字符。`
      else if (issue.code === 'invalid_format') message = issue.format === 'email' ? '请填写完整、有效的邮箱地址。' : '格式不正确，请核对后重试。'
      else message = '请填写或选择有效内容，并完成必选确认。'
    }
    return `${label || '报名资料'}：${message}`
  })].filter(Boolean).join('\n')
}
