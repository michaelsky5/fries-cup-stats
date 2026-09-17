export function getBanComparison(bans, preferredSide = 'opponent') {
  const rows = new Map()
  for (const side of ['opponent', 'own']) {
    for (const entry of bans[side]) {
      if (!rows.has(entry.key)) rows.set(entry.key, { key: entry.key, hero: entry.hero, label: entry.label })
      rows.get(entry.key)[side] = entry
    }
  }
  const first = preferredSide === 'own' ? 'own' : 'opponent'
  const second = first === 'own' ? 'opponent' : 'own'
  return [...rows.values()].map(row => ({
    ...row,
    ...Object.fromEntries(['opponent', 'own'].map(side => [side, {
      maps: row[side]?.maps ?? (bans[`${side}Coverage`] > 0 ? 0 : null),
      records: row[side]?.records ?? []
    }]))
  })).sort((a, b) => (b[first].maps ?? 0) - (a[first].maps ?? 0)
    || (b[second].maps ?? 0) - (a[second].maps ?? 0) || a.key.localeCompare(b.key))
}
