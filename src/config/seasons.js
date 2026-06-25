export const DEFAULT_SEASON_ID = 'FCA26'
export const SEASON_STORAGE_KEY = 'fries_cup_stats_active_season'
export const SEASON_URL_PARAM = 'season'

export const SEASONS = [
  {
    id: 'FCR26',
    publicCode: 'FCR2026',
    seriesCode: 'FCS2026',
    name: {
      zh: '2026 薯条杯常规赛',
      en: 'Fries Cup Regular 2026'
    },
    seriesName: {
      zh: '2026 薯条杯系列赛',
      en: 'Fries Cup Series 2026'
    },
    proxyDataUrl: '/api/admin-public/seasons/FCR26/publish/latest/data',
    proxyReportUrl: '/api/admin-public/seasons/FCR26/publish/latest/report',
    dataUrl: 'https://admin.fries-cup.com/api/public/seasons/FCR26/publish/latest/data',
    reportUrl: 'https://admin.fries-cup.com/api/public/seasons/FCR26/publish/latest/report',
    localDataUrl: '/data/fcr2026_local_public.json',
    localReportUrl: '',
    preferLocalData: true,
    reviewEnabled: false,
    rankingMinTimeMins: 30,
    rules: {
      rankingMinTimeMins: 30,
      swissStage: { maxRounds: 6 },
      advancement: {
        totalSlots: 8,
        directAdvanceWins: 5,
        lcqSurvivalWins: 3
      },
      advance: {
        phases: ['swiss', 'breakthrough', 'playoffs', 'final'],
        swiss: {
          rounds: 6,
          matchesPerRound: 19,
          directSlots: null,
          breakthroughSlots: null,
          tiebreakers: [
            'match_wins',
            'buchholz',
            'head_to_head',
            'opponent_win_rate',
            'tournament_ruling'
          ]
        },
        breakthrough: {
          status: 'pending_rules',
          format: null,
          bracketSource: 'backend'
        },
        playoffs: {
          format: 'double_elimination',
          crossover: null,
          bracketSource: 'backend'
        }
      },
      playoffs: {
        bracketType: 'DOUBLE_ELIMINATION',
        defaultFormat: 'FT3',
        grandFinalFormat: 'FT4'
      }
    }
  },
  {
    id: 'FCA26',
    publicCode: 'FCA2026',
    seriesCode: 'FCS2026',
    name: {
      zh: '2026 薯条杯学院赛',
      en: 'Fries Cup Academy 2026'
    },
    seriesName: {
      zh: '2026 薯条杯系列赛',
      en: 'Fries Cup Series 2026'
    },
    proxyDataUrl: '/api/admin-public/seasons/FCA26/publish/latest/data',
    proxyReportUrl: '/api/admin-public/seasons/FCA26/publish/latest/report',
    dataUrl: 'https://admin.fries-cup.com/api/public/seasons/FCA26/publish/latest/data',
    reportUrl: 'https://admin.fries-cup.com/api/public/seasons/FCA26/publish/latest/report',
    localDataUrl: '/data/friescup_db_review_ready.json',
    localReportUrl: '/data/friescup_db_review_ready_report.json',
    reviewEnabled: true,
    rankingMinTimeMins: 30,
    rules: {
      rankingMinTimeMins: 30,
      swissStage: { maxRounds: 6 },
      advancement: {
        totalSlots: 8,
        directAdvanceWins: 5,
        lcqSurvivalWins: 3
      },
      advance: {
        phases: ['swiss', 'breakthrough', 'playoffs', 'final'],
        swiss: {
          rounds: 6,
          directSlots: null,
          breakthroughSlots: null,
          tiebreakers: [
            'match_wins',
            'buchholz',
            'head_to_head',
            'opponent_win_rate',
            'tournament_ruling'
          ]
        },
        breakthrough: {
          status: 'completed',
          format: 'single_elimination',
          bracketSource: 'backend'
        },
        playoffs: {
          format: 'double_elimination',
          crossover: false,
          bracketSource: 'backend'
        }
      },
      lcqStage: {
        format: 'SINGLE_ELIM_WITH_5TH'
      },
      playoffs: {
        bracketType: 'DOUBLE_ELIMINATION',
        defaultFormat: 'FT3',
        grandFinalFormat: 'FT4'
      }
    }
  }
]

export function getSeasonById(seasonId) {
  const id = String(seasonId || '').trim().toUpperCase()
  return SEASONS.find(season => season.id === id || String(season.publicCode).toUpperCase() === id) ||
    SEASONS.find(season => season.id === DEFAULT_SEASON_ID) ||
    SEASONS[0]
}

function normalizeSeasonAlias(value) {
  return String(value || '').trim().toUpperCase()
}

const SEASON_URL_ALIASES = SEASONS.reduce((aliases, season) => {
  const canonicalId = season.id
  const values = [
    season.id,
    season.publicCode,
    season.id.replace(/26$/, '2026')
  ]

  values.forEach(value => {
    const alias = normalizeSeasonAlias(value)
    if (alias) aliases[alias] = canonicalId
  })

  return aliases
}, {})

export function resolveSeasonFromUrl(value) {
  const alias = normalizeSeasonAlias(value)
  if (!alias) return null
  return SEASON_URL_ALIASES[alias] || null
}

export function getInitialSeasonId() {
  if (typeof window === 'undefined') return getStoredSeasonId()

  const params = new URLSearchParams(window.location.search)
  if (!params.has(SEASON_URL_PARAM)) return getStoredSeasonId()

  return resolveSeasonFromUrl(params.get(SEASON_URL_PARAM)) || DEFAULT_SEASON_ID
}

export function getSeasonSearch(search, seasonId) {
  const params = new URLSearchParams(search || '')
  params.set(SEASON_URL_PARAM, getSeasonById(seasonId).publicCode)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function withSeason(path, seasonId, currentSearch = '') {
  const rawPath = String(path || '')
  if (!rawPath || /^[a-z][a-z0-9+.-]*:/i.test(rawPath) || rawPath.startsWith('#')) {
    return rawPath
  }

  const [pathAndQuery, hash = ''] = rawPath.split('#')
  const queryIndex = pathAndQuery.indexOf('?')
  const pathname = queryIndex >= 0 ? pathAndQuery.slice(0, queryIndex) : pathAndQuery
  const targetQuery = queryIndex >= 0 ? pathAndQuery.slice(queryIndex + 1) : ''
  const params = new URLSearchParams(currentSearch || '')
  const targetParams = new URLSearchParams(targetQuery)

  targetParams.forEach((value, key) => {
    params.set(key, value)
  })

  params.set(SEASON_URL_PARAM, getSeasonById(seasonId).publicCode)

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

export function getStoredSeasonId() {
  if (typeof window === 'undefined') return DEFAULT_SEASON_ID
  const stored = window.localStorage.getItem(SEASON_STORAGE_KEY)
  return getSeasonById(stored).id
}

export function setStoredSeasonId(seasonId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEASON_STORAGE_KEY, getSeasonById(seasonId).id)
}

export function getSeasonName(season, locale = 'zh-CN') {
  const target = season || getSeasonById()
  return locale === 'en-US' ? target.name.en : target.name.zh
}

export function getSeasonLabel(season, locale = 'zh-CN') {
  const target = season || getSeasonById()
  return `${getSeasonName(target, locale)} (${target.publicCode})`
}

export function getSeasonRules(season, db) {
  const sourceRules = db?.meta?.rules || db?.season?.rules || db?.meta?.season_rules
  return {
    ...(season?.rules || {}),
    ...(sourceRules && typeof sourceRules === 'object' ? sourceRules : {})
  }
}

export function seasonHasReview(season, db) {
  return Boolean(
    season?.reviewEnabled &&
    db?.meta?.review_ready &&
    Array.isArray(db?.team_reviews) &&
    db.team_reviews.length > 0
  )
}
