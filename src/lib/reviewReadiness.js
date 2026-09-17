function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function toCount(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function normalizeToken(value) {
  return String(value || '').trim().toUpperCase()
}

function getPublishedAt(db) {
  return db?.review_ready_at || db?.updated_at || db?.meta?.ranking_as_of || ''
}

function getPublishedAtMs(db) {
  const timestamp = Date.parse(getPublishedAt(db))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getStageCounts(matches) {
  return safeArr(matches).reduce((counts, match) => {
    const stage = normalizeToken(match?.stage) || 'UNKNOWN'
    counts[stage] = (counts[stage] || 0) + 1
    return counts
  }, {})
}

function getMatchRound(match) {
  return normalizeToken(
    match?.round_name ||
    match?.round_label ||
    match?.round ||
    match?.phase ||
    ''
  )
}

function getMatchStatus(match) {
  return normalizeToken(match?.status || match?.match_status)
}

function addMinimumCountIssue(issues, key, actual, expected) {
  if (!Number.isFinite(Number(expected))) return
  if (actual >= Number(expected)) return

  const issueKey = String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()

  issues.push({
    code: `${issueKey}_COUNT_TOO_LOW`,
    actual,
    expected: Number(expected)
  })
}

export function getReviewReadiness(season, db) {
  const issues = []
  const meta = db?.meta || {}
  const matches = safeArr(db?.matches)
  const requirements = season?.reviewRequirements || {}
  const stageCounts = getStageCounts(matches)
  const counts = {
    teams: safeArr(db?.teams).length,
    teamReviews: safeArr(db?.team_reviews).length,
    players: safeArr(db?.players).length,
    playerTotals: safeArr(db?.player_totals).length,
    matches: matches.length,
    maps: toCount(meta.map_count),
    standings: safeArr(db?.standings).length
  }

  if (!season?.reviewEnabled) {
    issues.push({ code: 'REVIEW_DISABLED' })
  }

  if (!meta.review_ready) {
    issues.push({ code: 'REVIEW_NOT_READY' })
  }

  if (!counts.teamReviews) {
    issues.push({ code: 'TEAM_REVIEWS_MISSING' })
  }

  Object.entries(requirements.minimumCounts || {}).forEach(([key, expected]) => {
    addMinimumCountIssue(issues, key, toCount(counts[key]), expected)
  })

  if (requirements.finalizedAt) {
    const requiredTimestamp = Date.parse(requirements.finalizedAt)
    const publishedTimestamp = getPublishedAtMs(db)

    if (!publishedTimestamp || (Number.isFinite(requiredTimestamp) && publishedTimestamp < requiredTimestamp)) {
      issues.push({
        code: 'REVIEW_SNAPSHOT_TOO_OLD',
        actual: getPublishedAt(db),
        expected: requirements.finalizedAt
      })
    }
  }

  Object.entries(requirements.stageMatches || {}).forEach(([stage, expected]) => {
    const normalizedStage = normalizeToken(stage)
    const actual = toCount(stageCounts[normalizedStage])
    if (actual >= Number(expected)) return

    issues.push({
      code: 'REVIEW_STAGE_INCOMPLETE',
      stage: normalizedStage,
      actual,
      expected: Number(expected)
    })
  })

  safeArr(requirements.requiredRounds).forEach(round => {
    const normalizedRound = normalizeToken(round)
    if (matches.some(match => getMatchRound(match) === normalizedRound)) return

    issues.push({
      code: 'REVIEW_ROUND_MISSING',
      round: normalizedRound
    })
  })

  if (requirements.requireAllMatchesComplete && matches.length) {
    const completeStatuses = new Set(
      safeArr(requirements.completeStatuses).length
        ? requirements.completeStatuses.map(normalizeToken)
        : ['COMPLETE', 'COMPLETED', 'FINISHED', 'FINAL']
    )
    const incompleteMatches = matches.filter(match => !completeStatuses.has(getMatchStatus(match)))

    if (incompleteMatches.length) {
      issues.push({
        code: 'REVIEW_MATCHES_INCOMPLETE',
        actual: incompleteMatches.length,
        expected: 0
      })
    }
  }

  return {
    available: issues.length === 0,
    issues,
    summary: {
      publishedAt: getPublishedAt(db),
      counts,
      stageCounts
    }
  }
}

export function isReviewReady(season, db) {
  return getReviewReadiness(season, db).available
}
