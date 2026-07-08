export const RATING_MODEL_VERSION = 'v1.0'

export const RATING_METRICS = [
  'elims',
  'assists',
  'survival',
  'damage',
  'healing',
  'blocked'
]

export const METRIC_DEFINITIONS = {
  elims: {
    label: 'Elims',
    per10Key: 'elimsPer10',
    totalKeys: ['elims', 'eliminations', 'total_elim', 'elim']
  },
  assists: {
    label: 'Assists',
    per10Key: 'assistsPer10',
    totalKeys: ['assists', 'asts', 'total_ast', 'ast']
  },
  deaths: {
    label: 'Deaths',
    per10Key: 'deathsPer10',
    totalKeys: ['deaths', 'dths', 'total_dth', 'dth']
  },
  survival: {
    label: 'Survival',
    sourceMetric: 'deaths',
    per10Key: 'deathsPer10'
  },
  damage: {
    label: 'Damage',
    per10Key: 'damagePer10',
    totalKeys: ['damage', 'total_dmg', 'dmg']
  },
  healing: {
    label: 'Healing',
    per10Key: 'healingPer10',
    totalKeys: ['healing', 'heal', 'total_heal']
  },
  blocked: {
    label: 'Blocked',
    per10Key: 'blockedPer10',
    totalKeys: ['blocked', 'block', 'mitigation', 'total_block']
  }
}

export const METRIC_DIRECTIONS = {
  elims: 'positive',
  assists: 'positive',
  survival: 'positive',
  damage: 'positive',
  healing: 'positive',
  blocked: 'positive',
  deaths: 'negative'
}

export const PROFILE_WEIGHTS = {
  dive_tank: {
    subrole: 'TANK',
    appliesTo: ['D.Va', 'Winston'],
    weights: { elims: 20, assists: 16, survival: 24, damage: 14, blocked: 22, healing: 4 }
  },
  disrupt_tank: {
    subrole: 'TANK',
    appliesTo: ['Doomfist', 'Wrecking Ball'],
    weights: { elims: 22, assists: 18, survival: 30, damage: 18, blocked: 8, healing: 4 }
  },
  brawl_tank: {
    subrole: 'TANK',
    appliesTo: ['Hazard', 'Junker Queen', 'Mauga', 'Reinhardt', 'Zarya'],
    weights: { elims: 22, assists: 12, survival: 22, damage: 24, blocked: 15, healing: 5 }
  },
  poke_tank: {
    subrole: 'TANK',
    appliesTo: ['Sigma', 'Domina', '金驭'],
    weights: { elims: 16, assists: 8, survival: 24, damage: 26, blocked: 24, healing: 2 }
  },
  anchor_tank: {
    subrole: 'TANK',
    appliesTo: ['Orisa'],
    weights: { elims: 18, assists: 12, survival: 28, damage: 18, blocked: 24, healing: 0 }
  },
  tempo_tank: {
    subrole: 'TANK',
    appliesTo: ['Ramattra'],
    weights: { elims: 20, assists: 12, survival: 22, damage: 24, blocked: 20, healing: 2 }
  },
  pick_tank: {
    subrole: 'TANK',
    appliesTo: ['Roadhog'],
    weights: { elims: 30, assists: 8, survival: 28, damage: 22, blocked: 2, healing: 10 }
  },

  poke_hitscan: {
    subrole: 'HITSCAN',
    appliesTo: ['Ashe', 'Hanzo', 'Freja', 'Sierra', '西拉'],
    weights: { elims: 30, assists: 8, survival: 24, damage: 34, healing: 2, blocked: 2 }
  },
  midrange_hitscan: {
    subrole: 'HITSCAN',
    appliesTo: ['Cassidy', 'Emre'],
    weights: { elims: 32, assists: 10, survival: 24, damage: 30, healing: 2, blocked: 2 }
  },
  rail_hitscan: {
    subrole: 'HITSCAN',
    appliesTo: ['Sojourn'],
    weights: { elims: 36, assists: 6, survival: 24, damage: 32, healing: 1, blocked: 1 }
  },
  tracking_hitscan: {
    subrole: 'HITSCAN',
    appliesTo: ['Soldier: 76'],
    weights: { elims: 28, assists: 6, survival: 22, damage: 34, healing: 8, blocked: 2 }
  },
  sniper_hitscan: {
    subrole: 'HITSCAN',
    appliesTo: ['Widowmaker'],
    weights: { elims: 40, assists: 4, survival: 30, damage: 24, healing: 1, blocked: 1 }
  },
  turret_damage: {
    subrole: 'HITSCAN',
    appliesTo: ['Bastion'],
    weights: { elims: 24, assists: 8, survival: 20, damage: 40, healing: 4, blocked: 4 }
  },

  flanker_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Tracer', 'Genji', 'Sombra', 'Vendetta'],
    weights: { elims: 30, assists: 14, survival: 30, damage: 20, healing: 4, blocked: 2 }
  },
  brawl_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Reaper', 'Venture'],
    weights: { elims: 28, assists: 8, survival: 26, damage: 28, healing: 6, blocked: 4 }
  },
  projectile_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Echo', 'Junkrat', 'Pharah', 'Anran', 'Shion', '死怨'],
    weights: { elims: 28, assists: 12, survival: 22, damage: 32, healing: 2, blocked: 4 }
  },
  utility_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Mei'],
    weights: { elims: 20, assists: 22, survival: 24, damage: 20, healing: 8, blocked: 6 }
  },
  barrier_utility_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Symmetra'],
    weights: { elims: 22, assists: 20, survival: 22, damage: 24, healing: 0, blocked: 12 }
  },
  area_control_flex: {
    subrole: 'FLEX_DPS',
    appliesTo: ['Torbjörn'],
    weights: { elims: 26, assists: 12, survival: 24, damage: 34, healing: 2, blocked: 2 }
  },

  tempo_main_support: {
    subrole: 'MAIN_SUPPORT',
    appliesTo: ['Lúcio', 'Juno', 'Jetpack Cat'],
    weights: { elims: 8, assists: 28, survival: 24, damage: 8, healing: 18, blocked: 14 }
  },
  pocket_main_support: {
    subrole: 'MAIN_SUPPORT',
    appliesTo: ['Mercy'],
    weights: { elims: 2, assists: 34, survival: 30, damage: 2, healing: 30, blocked: 2 }
  },
  protector_main_support: {
    subrole: 'MAIN_SUPPORT',
    appliesTo: ['Brigitte', 'Lifeweaver'],
    weights: { elims: 6, assists: 24, survival: 24, damage: 6, healing: 24, blocked: 16 }
  },
  utility_main_support: {
    subrole: 'MAIN_SUPPORT',
    appliesTo: ['Wuyang', 'Mizuki'],
    weights: { elims: 10, assists: 24, survival: 22, damage: 10, healing: 26, blocked: 8 }
  },

  utility_flex_support: {
    subrole: 'FLEX_SUPPORT',
    appliesTo: ['Ana', 'Kiriko'],
    weights: { elims: 8, assists: 26, survival: 22, damage: 10, healing: 32, blocked: 2 }
  },
  hybrid_flex_support: {
    subrole: 'FLEX_SUPPORT',
    appliesTo: ['Baptiste'],
    weights: { elims: 12, assists: 22, survival: 20, damage: 18, healing: 26, blocked: 2 }
  },
  damage_flex_support: {
    subrole: 'FLEX_SUPPORT',
    appliesTo: ['Illari', 'Zenyatta'],
    weights: { elims: 18, assists: 20, survival: 20, damage: 24, healing: 16, blocked: 2 }
  },
  volume_flex_support: {
    subrole: 'FLEX_SUPPORT',
    appliesTo: ['Moira'],
    weights: { elims: 10, assists: 16, survival: 24, damage: 20, healing: 28, blocked: 2 }
  }
}

export const DEFAULT_PROFILE_BY_SUBROLE = {
  TANK: 'brawl_tank',
  HITSCAN: 'poke_hitscan',
  FLEX_DPS: 'projectile_flex',
  MAIN_SUPPORT: 'tempo_main_support',
  FLEX_SUPPORT: 'utility_flex_support'
}

export const BASELINE_BLEND_CONFIG = {
  HERO_OK: {
    hero: 0.5,
    profile: 0.3,
    subrole: 0.2
  },
  HERO_LOW_SAMPLE: {
    hero: 0,
    profile: 0.6,
    subrole: 0.4
  },
  HERO_VERY_LOW_SAMPLE: {
    hero: 0,
    profile: 0.7,
    subrole: 0.3
  },
  PROFILE_LOW_SAMPLE: {
    hero: 0,
    profile: 0,
    subrole: 1
  }
}

export const SAMPLE_ELIGIBILITY_CONFIG = {
  ok: {
    minSampleLogs: 20,
    minTotalPlaytimeMinutes: 120
  },
  lowSample: {
    minSampleLogs: 5
  },
  statuses: {
    ok: 'OK',
    low: 'LOW_SAMPLE',
    veryLow: 'VERY_LOW_SAMPLE',
    unrated: 'UNRATED'
  }
}

export const CLAMP_CONFIG = {
  useWinsorizedPercentiles: true,
  neutralPercentile: 50,
  clampPercentile: 'p95',
  fallbackOrder: ['hero', 'profile', 'subrole'],
  metrics: {
    damage: {
      clampAt: 'p95',
      protectedProfiles: ['turret_damage', 'projectile_flex', 'rail_hitscan', 'area_control_flex']
    },
    blocked: {
      clampAt: 'p95',
      maxMetricPercentile: 95,
      protectedProfiles: ['barrier_utility_flex', 'poke_tank', 'anchor_tank', 'dive_tank']
    },
    healing: {
      diminishingAfter: 'p90',
      clampAt: 'p95',
      postP90PercentileMultiplier: 0.5
    },
    deaths: {
      clampAt: 'p95',
      reversedAs: 'survival'
    }
  }
}

export const MAP_RATING_CONFIG = {
  min: 5.5,
  max: 9.8,
  curve: [
    { percentile: 0, value: 5.5 },
    { percentile: 5, value: 5.5 },
    { percentile: 25, value: 6.4 },
    { percentile: 50, value: 7.0 },
    { percentile: 70, value: 7.6 },
    { percentile: 85, value: 8.3 },
    { percentile: 95, value: 9.0 },
    { percentile: 99, value: 9.5 },
    { percentile: 100, value: 9.8 }
  ],
  winningSideBonus: {
    min: 0.15,
    max: 0.25,
    enabledForSeasonScore: false
  },
  losingSidePenalty: 0
}

export const OVR_CONFIG = {
  min: 60,
  max: 99,
  unratedValue: 'UNRATED',
  requireSampleStatus: 'OK',
  curve: [
    { percentile: 0, value: 60 },
    { percentile: 25, value: 70 },
    { percentile: 50, value: 78 },
    { percentile: 70, value: 83 },
    { percentile: 85, value: 88 },
    { percentile: 95, value: 94 },
    { percentile: 99, value: 98 },
    { percentile: 100, value: 99 }
  ]
}

export const SEASON_SCORE_CONFIG = {
  neutralScore: 50,
  confidenceFloor: 0.65,
  timeTargetMultiplier: 3,
  minMapCount: 2,
  targetMapCount: 10,
  solidConfidence: 0.85,
  stableConfidence: 0.95,
  provisionalOvrCap: 89,
  solidOvrCap: 94
}

export const SUPPORT_MINIMUM_RULES = {
  enabled: true,
  subroles: ['MAIN_SUPPORT', 'FLEX_SUPPORT'],
  exemptProfiles: ['damage_flex_support'],
  healingPercentileBelow: 10,
  assistsPercentileBelow: 60,
  survivalPercentileBelow: 60,
  rawScoreCap: 75
}
