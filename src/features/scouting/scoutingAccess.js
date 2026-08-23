const DEFAULT_SCOUTING_ACCESS_RECORD = {
  key: 'fcr26-club-bf2ab4eb84ee0a8562a0617080b3996d5785',
  label: 'FCR 2026 Club Preview'
}

function parseConfiguredAccessRecords() {
  const configured = String(import.meta.env?.VITE_SCOUTING_ACCESS_KEYS || '').trim()
  if (!configured) return []

  return configured.split(',').map(item => {
    const [key, ...labelParts] = item.split('=')
    return {
      key: String(key || '').trim(),
      label: labelParts.join('=').trim() || 'Club access'
    }
  }).filter(item => item.key)
}

export function getScoutingAccessRecord(shareKey) {
  const key = String(shareKey || '').trim()
  if (!key) return null

  const configured = parseConfiguredAccessRecords().find(item => item.key === key)
  if (configured) return configured

  if (key === DEFAULT_SCOUTING_ACCESS_RECORD.key) {
    return DEFAULT_SCOUTING_ACCESS_RECORD
  }

  if (import.meta.env?.DEV && key === 'club-preview-2026') {
    return { key, label: 'Prototype club access' }
  }

  return null
}
