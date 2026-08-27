export const DEFAULT_SEASON_ID = 'FCR26'
export const SEASON_STORAGE_KEY = 'fries_cup_stats_active_season'
export const SEASON_URL_PARAM = 'season'

const PREFER_LOCAL_DATA = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_PREFER_LOCAL_DATA === '1'

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
    preferLocalData: PREFER_LOCAL_DATA,
    reviewEnabled: true,
    switcherMeta: {
      championShort: 'AIP',
      matchCount: 137
    },
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
          directSlots: 4,
          breakthroughSlots: 20,
          withdrawnTeams: [
            'FCR26-T031',
            'FCR26-T023',
            'FCR26-T005',
            'FCR26-T003',
            'FCR26-T014',
            'FCR26-T030'
          ],
          tiebreakers: [
            'match_wins',
            'buchholz',
            'head_to_head',
            'opponent_win_rate',
            'map_diff',
            'tournament_ruling'
          ]
        },
        breakthrough: {
          status: 'ready',
          format: 'four_division_single_elimination',
          bracketSource: 'fixed_seeding',
          participantCount: 20,
          advanceSlots: 4,
          bracketLocked: true,
          rounds: {
            playIn: { bestOf: 3 },
            roundOf16: { bestOf: 3 },
            qualification: { bestOf: 5 }
          }
        },
        playoffs: {
          format: 'double_elimination',
          participantCount: 8,
          matchCount: 14,
          crossover: 'opposite_half',
          bracketSource: 'fixed_seeding',
          bracketLocked: true,
          eventWindow: {
            start: '2026-08-08T19:30:00+08:00',
            end: '2026-08-16T23:59:59+08:00',
            dailyWindow: '19:30 / 21:30 · 08/15 加开 17:30 · GF 20:00'
          },
          schedule: {
            1: '2026-08-08T19:30:00+08:00',
            2: '2026-08-08T21:30:00+08:00',
            3: '2026-08-08T21:30:00+08:00',
            4: '2026-08-08T19:30:00+08:00',
            5: '2026-08-09T19:30:00+08:00',
            6: '2026-08-09T19:30:00+08:00',
            7: '2026-08-09T21:30:00+08:00',
            8: '2026-08-09T21:30:00+08:00',
            9: '2026-08-14T20:00:00+08:00',
            10: '2026-08-14T20:00:00+08:00',
            11: '2026-08-15T17:30:00+08:00',
            12: '2026-08-15T19:30:00+08:00',
            13: '2026-08-15T21:30:00+08:00',
            14: '2026-08-16T20:00:00+08:00'
          },
          rounds: {
            standard: { firstTo: 3 },
            grandFinal: { firstTo: 4 }
          }
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
    id: 'QGCS4',
    publicCode: 'QGCS4',
    seriesCode: 'QGCS4',
    kind: 'PARTNER',
    organizer: '全高杯赛事组',
    partnerLabel: {
      zh: '合作赛事',
      en: 'Partner Event'
    },
    logoUrl: '/logos/QGCS4/hammer-cup.jpg',
    name: {
      zh: '全高杯 S4',
      en: 'Hammer Cup S4'
    },
    seriesName: {
      zh: '全高杯 S4',
      en: 'Hammer Cup S4'
    },
    switcherMeta: {
      teamCount: 19,
      playerCount: 116,
      matchCount: 36
    },
    proxyDataUrl: '/api/admin-public/seasons/QGCS4/publish/latest/data',
    dataUrl: 'https://admin.fries-cup.com/api/public/seasons/QGCS4/publish/latest/data',
    preferDirectData: true,
    proxyReportUrl: '/api/admin-public/seasons/QGCS4/publish/latest/report',
    localDataUrl: '/data/qgcs4_preseason_public.json',
    bootstrapLocalData: true,
    reviewEnabled: false,
    rankingMinTimeMins: 30,
    timeline: [
      {
        key: 'groups',
        code: 'GROUP STAGE',
        label: { zh: '小组赛', en: 'Group Stage' },
        date: '08.24—08.27',
        start: '2026-08-24T00:00:00+08:00',
        end: '2026-08-27T23:59:59+08:00',
        text: { zh: '19 支队伍分为 A—D 四组进行单循环比赛。', en: 'Nineteen teams play a round robin across Groups A-D.' },
        status: 'current'
      },
      {
        key: 'quarterfinals',
        code: 'QUARTERFINALS',
        label: { zh: '八强赛', en: 'Quarterfinals' },
        date: '08.28',
        start: '2026-08-28T00:00:00+08:00',
        end: '2026-08-28T23:59:59+08:00',
        text: { zh: '每组前二进入八强单败淘汰赛。', en: 'The top two teams from each group enter the single-elimination quarterfinals.' },
        status: 'upcoming'
      },
      {
        key: 'semifinals',
        code: 'SEMIFINALS',
        label: { zh: '半决赛', en: 'Semifinals' },
        date: '08.29',
        start: '2026-08-29T00:00:00+08:00',
        end: '2026-08-29T23:59:59+08:00',
        text: { zh: '八强胜者争夺总决赛席位。', en: 'Quarterfinal winners compete for grand-final places.' },
        status: 'upcoming'
      },
      {
        key: 'finals',
        code: 'FINALS',
        label: { zh: '季军赛 / 总决赛', en: 'Third Place / Grand Final' },
        date: '08.30',
        start: '2026-08-30T00:00:00+08:00',
        end: '2026-08-30T23:59:59+08:00',
        text: { zh: '季军赛与总决赛均为 FT4。', en: 'The third-place match and grand final are both FT4.' },
        status: 'upcoming'
      }
    ],
    rules: {
      competitionFormat: 'GROUP',
      rankingMinTimeMins: 30,
      advancement: {
        totalSlots: 8,
        groupAdvanceCount: 2
      },
      groupStage: {
        labels: ['A', 'B', 'C', 'D'],
        sizes: [5, 5, 5, 4],
        format: 'round_robin',
        matchFormat: 'FT3',
        advancePerGroup: 2,
        expectedMatches: 36,
        administrativeLossScore: [0, 3],
        drawScore: [0, 0],
        tiebreakers: [
          'match_wins',
          'map_differential',
          'maps_won',
          'head_to_head',
          'tiebreak_match'
        ],
        unresolvedTieStatus: 'pending_tiebreak'
      },
      advance: {
        phases: ['groups', 'playoffs', 'final'],
        groups: {
          format: 'four_group_round_robin',
          groupCount: 4,
          advancePerGroup: 2,
          participantCount: 19,
          matchCount: 36
        },
        playoffs: {
          format: 'single_elimination',
          participantCount: 8,
          matchCount: 8,
          bracketSource: 'backend',
          bracketLocked: false,
          seedOrder: ['A1', 'B1', 'D1', 'C1', 'D2', 'C2', 'A2', 'B2'],
          eventWindow: {
            start: '2026-08-28T18:00:00+08:00',
            end: '2026-08-30T23:59:59+08:00'
          },
          rounds: {
            quarterfinals: { firstTo: 3 },
            semifinals: { firstTo: 3 },
            thirdPlace: { firstTo: 4 },
            grandFinal: { firstTo: 4 }
          }
        }
      },
      playoffs: {
        bracketType: 'SINGLE_ELIMINATION',
        defaultFormat: 'FT3',
        thirdPlaceFormat: 'FT4',
        grandFinalFormat: 'FT4'
      },
      heroBans: {
        ruleset: 'FRIES_CUP'
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
    preferLocalData: PREFER_LOCAL_DATA,
    reviewEnabled: true,
    switcherMeta: {
      championShort: 'HYW',
      matchCount: 127
    },
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
