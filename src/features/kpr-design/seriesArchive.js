const SERIES_ARCHIVES = Object.freeze({
  FCS2026: Object.freeze({
    code: 'FCS2026',
    eventCodes: Object.freeze(['FCA2026', 'FCR2026']),
    podium: Object.freeze([
      Object.freeze({ rank: 1, club: 'TNS', logo: '/logos/FCR/TNS.png' }),
      Object.freeze({ rank: 2, club: 'SPC', logo: '/logos/FCR/SPC.png' }),
      Object.freeze({ rank: 3, club: 'XCFN', logo: '/logos/FCR/XCFN.G.png' })
    ])
  })
})

export function getSeriesArchive(seriesCode) {
  return SERIES_ARCHIVES[String(seriesCode || '').trim().toUpperCase()] || null
}
