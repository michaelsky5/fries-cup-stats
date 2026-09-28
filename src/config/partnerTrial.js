export function getPartnerTrialConfig(env = {}) {
  if (env.VITE_PARTNER_TRIAL !== '1') return null
  const ids = [...new Set(String(env.VITE_PARTNER_TRIAL_SEASONS || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean))]
  if (!ids.length || ids.some(id => !/^TRIAL[A-Z0-9_-]{1,20}$/.test(id))) throw new Error('试用构建需要明确的 TRIAL 赛事白名单。')
  return { ids }
}
export function assertTrialProxyTarget(target) {
  const url = new URL(target)
  if (!(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('试用代理必须使用 HTTPS 或本机地址。')
  if (!['localhost', '127.0.0.1', '[::1]', 'test-admin.fries-cup.com'].includes(url.hostname)) throw new Error('试用代理不能连接正式后台。')
  return target
}
export const PARTNER_TRIAL = getPartnerTrialConfig(import.meta.env || {})
export function buildTrialCatalog(config) {
  return config.ids.map(id => ({
    id, publicCode: id, kind: 'PARTNER', lifecycle: 'ACTIVE', partnerTrial: true, reviewEnabled: false,
    name: { zh: `合作赛事试用 · ${id}`, en: `Partner event trial · ${id}` },
    proxyDataUrl: `/api/admin-public/seasons/${id}/publish/latest/data`,
    proxyReportUrl: `/api/admin-public/seasons/${id}/publish/latest/report`,
    rules: { weeklyCompetition: { enabled: false }, registration: { enabled: false } }
  }))
}
export function assertTrialSnapshot(data, season) {
  if (!season.partnerTrial) return data
  const actual = data?.meta?.season_id || data?.season?.id
  if (actual !== season.id) throw new Error('TRIAL_SEASON_MISMATCH')
  if (season.trialEntrySeasonId && season.trialEntrySeasonId !== season.id && data?.season?.rules?.partnerTrial?.entrySeasonId !== season.trialEntrySeasonId) throw new Error('TRIAL_ENTRY_MISMATCH')
  return data
}

export function trialSeasonFromManifest(config, requestedId, manifest) {
  if (!/^TRIAL[A-Z0-9_-]{1,20}$/.test(requestedId) || manifest?.seasonId !== requestedId || !config.ids.includes(manifest.entrySeasonId)) throw new Error('TRIAL_ENTRY_MISMATCH')
  const [season] = buildTrialCatalog({ ids: [requestedId] })
  return { ...season, displayCode: 'TRIAL', trialEntrySeasonId: manifest.entrySeasonId,
    name: { zh: manifest.name || '我的合作赛事试用', en: 'My partner event trial' } }
}
