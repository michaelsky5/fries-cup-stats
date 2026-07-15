import { Link, useOutletContext } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { getSeasonRules } from '../../config/seasons.js'
import { formatMatchSchedule, getPublicStatusLabel } from '../../lib/scheduleFormat.js'
import { calculateSwissStandings } from '../../lib/swissEngine.js'
import { safeArr } from '../../lib/selectors.js'
import styles from './SchedulePage.module.css'

const SHANGHAI_TZ = 'Asia/Shanghai'
const FALLBACK_SWISS_RULES = {
  maxRounds: 6,
  directAdvanceWins: 5,
  lcqSurvivalWins: 3
}

function ui(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function isComplete(match) {
  const status = String(match?.status || '').toUpperCase()
  return status === 'COMPLETE' || status === 'COMPLETED'
}

function isLive(match) {
  const status = String(match?.status || '').toUpperCase()
  return status === 'IN_PROGRESS' || status === 'LIVE'
}

function normalizeStage(match) {
  const rawStage = String(match?.stage || '').toUpperCase()
  const matchId = String(match?.match_id || match?.raw_match_id || '').toUpperCase()

  if (rawStage === 'QUALIFIERS' || rawStage === 'GROUP') return 'SWISS'
  if (rawStage === 'GRAND_FINAL') return 'GRAND_FINAL'
  if (rawStage === 'PLAYOFFS' && matchId.includes('-GF-')) return 'GRAND_FINAL'
  if (rawStage === 'SWISS' || matchId.includes('-SWISS-')) return 'SWISS'
  if (rawStage === 'LCQ' || matchId.includes('-LCQ-')) return 'LCQ'
  if (rawStage === 'PLAYOFFS' || matchId.includes('-PLAYOFF') || matchId.includes('-WB-') || matchId.includes('-LB-')) {
    return 'PLAYOFFS'
  }

  return rawStage || 'OTHER'
}

function normalizeNoticeStage(stage) {
  const rawStage = String(stage || '').toUpperCase()
  if (rawStage === 'QUALIFIERS' || rawStage === 'GROUP') return 'SWISS'
  if (rawStage === 'GRAND_FINAL') return 'GRAND_FINAL'
  if (rawStage === 'LCQ') return 'LCQ'
  if (rawStage === 'PLAYOFFS') return 'PLAYOFFS'
  return rawStage || 'OTHER'
}

function stageLabel(stage, locale, t) {
  const normalized = String(stage || '').toUpperCase()
  if (normalized === 'SWISS') return t('schedule.swiss', 'Swiss')
  if (normalized === 'LCQ') return t('schedule.lcq', 'LCQ')
  if (normalized === 'PLAYOFFS') return t('schedule.playoffs', 'Playoffs')
  if (normalized === 'GRAND_FINAL') return t('schedule.grandFinal', 'Grand Final')
  return ui(locale, '璧涗簨闃舵', 'Stage')
}

function getRoundNumber(round) {
  const match = String(round || '').match(/(\d+)/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function getMatchTimestamp(match) {
  return new Date(match?.scheduled_at || match?.updated_at || 0).getTime() || 0
}

function sortMatches(matches, direction = 'asc') {
  return [...matches].sort((a, b) => {
    const timeDelta = getMatchTimestamp(a) - getMatchTimestamp(b)
    if (timeDelta !== 0) return direction === 'asc' ? timeDelta : -timeDelta

    const roundDelta = getRoundNumber(a?.round) - getRoundNumber(b?.round)
    if (roundDelta !== 0) return direction === 'asc' ? roundDelta : -roundDelta

    return String(a?.match_id || '').localeCompare(String(b?.match_id || ''))
  })
}

function sortNotices(notices) {
  return [...notices].sort((a, b) => {
    const timeA = new Date(a?.release_at || 0).getTime() || 0
    const timeB = new Date(b?.release_at || 0).getTime() || 0
    return timeA - timeB
  })
}

function groupByRound(matches) {
  const grouped = new Map()

  sortMatches(matches).forEach(match => {
    const key = match?.round || 'Round TBD'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(match)
  })

  return [...grouped.entries()]
    .map(([round, rows]) => ({ round, rows }))
    .sort((a, b) => getRoundNumber(a.round) - getRoundNumber(b.round))
}

function getRoundState(matches, selectedRound = '') {
  const rounds = groupByRound(matches)
  const activeRound = selectedRound && rounds.some(group => group.round === selectedRound)
    ? selectedRound
    : rounds[rounds.length - 1]?.round
  const activeGroup = rounds.find(group => group.round === activeRound)
  const activeRows = activeGroup?.rows || []

  return {
    rounds,
    activeRound,
    activeGroup,
    activeRows,
    completedCount: activeRows.filter(isComplete).length
  }
}

function getSwissSnapshotCount(matchCount) {
  const resultRows = Math.max(1, Math.ceil((Number(matchCount) || 0) / 3))
  return Math.max(6, resultRows * 2)
}

function compactRoundLabel(round) {
  const number = getRoundNumber(round)
  return Number.isFinite(number) && number !== Number.MAX_SAFE_INTEGER
    ? `R${number}`
    : String(round || 'TBD')
}

function compactMatchLabel(match) {
  const rawId = String(match?.match_id || match?.raw_match_id || '')
  const label = rawId.match(/-M(\d+)$/i)
  return label ? `M${label[1]}` : rawId || '--'
}

function groupUpcomingByDate(matches, locale) {
  const grouped = new Map()

  sortMatches(matches).forEach(match => {
    const time = getMatchTimestamp(match)
    const label = time
      ? new Intl.DateTimeFormat(locale, {
          timeZone: SHANGHAI_TZ,
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        }).format(time)
      : ui(locale, '鏃堕棿寰呭畾', 'TBD')

    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label).push(match)
  })

  return [...grouped.entries()].map(([label, rows]) => ({ label, rows }))
}

function getScore(match, side) {
  const team = side === 'A' ? match?.team_a : match?.team_b
  const value = team?.score
  return value === '' || value === undefined || value === null ? '-' : value
}

function getNoticeStageCounts(notices) {
  return notices.reduce((acc, notice) => {
    const stage = normalizeNoticeStage(notice?.stage)
    const matchCount = Number(notice?.match_count || 0)
    acc[stage] = (acc[stage] || 0) + matchCount
    return acc
  }, {})
}

function formatBracketType(value, locale) {
  if (!value) return ui(locale, '鍙岃触娣樻卑', 'Double Elimination')
  return String(value).replace(/_/g, ' ')
}

function formatNoticeRelease(notice, locale) {
  const label = [notice?.release_weekday, notice?.release_time].filter(Boolean).join(' ')
  return label || ui(locale, '寰呭畾', 'TBD')
}

function formatNoticeSchedule(notice, locale) {
  const label = [notice?.scheduled_weekday, notice?.scheduled_date].filter(Boolean).join(' / ')
  return label || ui(locale, '寰呭畾', 'TBD')
}

function toPositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function resolveSwissRules(rules) {
  return {
    maxRounds: toPositiveNumber(
      rules?.swissStage?.maxRounds ?? rules?.maxRounds ?? rules?.swiss?.round_count,
      FALLBACK_SWISS_RULES.maxRounds
    ),
    directAdvanceWins: toPositiveNumber(
      rules?.advancement?.directAdvanceWins ?? rules?.advanceWins,
      FALLBACK_SWISS_RULES.directAdvanceWins
    ),
    lcqSurvivalWins: toPositiveNumber(
      rules?.advancement?.lcqSurvivalWins ?? rules?.lcqSurvivalWins,
      FALLBACK_SWISS_RULES.lcqSurvivalWins
    )
  }
}

function getSwissZone(team, rules, locale) {
  const wins = Number(team?.match_wins || 0)
  const losses = Number(team?.match_losses || 0)
  const maxLossesAllowed = Math.max(0, rules.maxRounds - rules.lcqSurvivalWins)

  if (wins >= rules.directAdvanceWins) {
    return { key: 'direct', label: ui(locale, '\u76f4\u901a', 'Direct') }
  }

  if (wins >= rules.lcqSurvivalWins) {
    return { key: 'lcq', label: 'LCQ' }
  }

  if (losses > maxLossesAllowed) {
    return { key: 'out', label: ui(locale, '\u6dd8\u6c70', 'Out') }
  }

  return { key: 'active', label: ui(locale, '\u8fdb\u884c\u4e2d', 'Active') }
}

function formatPct(value) {
  const number = Number(value || 0)
  return `${(number * 100).toFixed(1)}%`
}

function getDetailLink(match, withSeason = path => path) {
  const matchId = match?.match_id || match?.raw_match_id
  return withSeason(matchId ? `/matches/${matchId}` : '/matches')
}

function OverviewScheduleRow({ match, locale, t, withSeason }) {
  const schedule = formatMatchSchedule(match, { locale, includeWeekday: true })
  const teamAName = match?.team_a?.short || match?.team_a?.name || 'TBD'
  const teamBName = match?.team_b?.short || match?.team_b?.name || 'TBD'
  const roundLabel = match?.round || ui(locale, '杞寰呭畾', 'Round TBD')
  const formatLabel = match?.format || 'TBD'

  return (
    <article className={`${styles.scheduleRow} ${isLive(match) ? styles.scheduleRowLive : ''}`}>
      <div className={styles.scheduleRowMeta}>
        <span>{stageLabel(match?.stage, locale, t)}</span>
        <span>{roundLabel}</span>
        <span>{formatLabel}</span>
      </div>

      <div className={styles.scheduleRowMain}>
        <div className={styles.scheduleTeams}>
          <span>{teamAName}</span>
          <small>VS</small>
          <span>{teamBName}</span>
        </div>

        <div className={styles.scheduleRowSide}>
          <span className={styles.scheduleTime} title={schedule.title}>{schedule.compact}</span>
          <strong>{getPublicStatusLabel(match?.status, locale)}</strong>
        </div>
      </div>

      <div className={styles.scheduleRowFoot}>
        <span>{match?.match_id || match?.raw_match_id || '--'}</span>
        <Link to={getDetailLink(match, withSeason)} className={styles.detailLink}>
          {t('schedule.viewDetails', 'Details')}
        </Link>
      </div>
    </article>
  )
}

function ResultRow({ match, locale, t }) {
  const schedule = formatMatchSchedule(match, { locale, includeWeekday: false })
  const teamAName = match?.team_a?.short || match?.team_a?.name || 'TBD'
  const teamBName = match?.team_b?.short || match?.team_b?.name || 'TBD'
  const roundLabel = match?.round || ui(locale, '\u5df2\u5b8c\u6210', 'Completed')

  return (
    <article className={styles.resultRow}>
      <div className={styles.resultMeta}>
        <span>{`${stageLabel(match?.stage, locale, t)} / ${roundLabel}`}</span>
        <span>{match?.format || 'TBD'}</span>
      </div>

      <div className={styles.resultMain}>
        <div className={styles.resultTeams}>
          <span>{teamAName}</span>
          <strong>{getScore(match, 'A')} : {getScore(match, 'B')}</strong>
          <span>{teamBName}</span>
        </div>

        <div className={styles.resultTime} title={schedule.title}>{schedule.compact}</div>
      </div>
    </article>
  )
}

function MatchCard({ match, locale, withSeason }) {
  const schedule = formatMatchSchedule(match, { locale, includeWeekday: false })
  const teamAName = match?.team_a?.short || match?.team_a?.name || 'TBD'
  const teamBName = match?.team_b?.short || match?.team_b?.name || 'TBD'
  const completed = isComplete(match)
  const live = isLive(match)
  const scoreA = getScore(match, 'A')
  const scoreB = getScore(match, 'B')
  const rawMatchId = match?.match_id || match?.raw_match_id || '--'
  const matchLabel = compactMatchLabel(match)
  const scheduleLabel = schedule.compact === 'TBD' ? '' : schedule.compact
  const winnerSide = Number(scoreA) > Number(scoreB)
    ? 'A'
    : Number(scoreB) > Number(scoreA)
      ? 'B'
      : ''
  const statusTone = completed
    ? styles.matchStatusDone
    : live
      ? styles.matchStatusLive
      : styles.matchStatusPending

  return (
    <Link
      to={getDetailLink(match, withSeason)}
      className={`${styles.matchCard} ${completed ? styles.matchComplete : ''}`}
    >
      <div className={styles.matchBody}>
        <div
          className={`${styles.teamName} ${winnerSide === 'A' ? styles.teamWinner : ''}`}
          title={match?.team_a?.name}
        >
          {teamAName}
        </div>
        <div className={styles.scoreBox}>
          <span>{scoreA}</span>
          <small>:</small>
          <span>{scoreB}</span>
        </div>
        <div
          className={`${styles.teamName} ${winnerSide === 'B' ? styles.teamWinner : ''}`}
          title={match?.team_b?.name}
        >
          {teamBName}
        </div>
      </div>

      <div className={styles.matchMetaStrip}>
        <div className={styles.matchMetaLeft}>
          <span className={styles.matchId} title={rawMatchId}>{matchLabel}</span>
          <span className={styles.matchDivider}>/</span>
          <span className={styles.matchFormatText}>{match?.format || 'TBD'}</span>
        </div>

        <div className={styles.matchMetaRight}>
          {scheduleLabel ? (
            <span className={styles.matchTime} title={schedule.title}>{scheduleLabel}</span>
          ) : null}
          {!completed ? (
            <span className={`${styles.matchStatusInline} ${statusTone}`}>
              {getPublicStatusLabel(match?.status, locale)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function ReleaseNoticePanel({ notices, locale }) {
  if (!notices.length) return null

  return (
    <section className={styles.noticeSection}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{ui(locale, '鍏紑鎻愰啋', 'Release Notice')}</div>
          <h2 className={styles.sectionTitle}>{ui(locale, '\u5f85\u516c\u5e03\u8f6e\u6b21', 'Pending Rounds')}</h2>
        </div>
        <span className={styles.sectionCount}>{notices.length}</span>
      </div>

      <div className={styles.noticeGrid}>
        {notices.map(notice => (
          <article
            key={notice?.id || `${notice?.stage}-${notice?.round}-${notice?.release_at}`}
            className={styles.noticeCard}
          >
            <div className={styles.noticeTop}>
              <span className={styles.noticeTag}>
                {notice?.round_label || notice?.round || ui(locale, '鏈疆璧涚▼', 'This Round')}
              </span>
              <span className={styles.noticeRelease}>{formatNoticeRelease(notice, locale)}</span>
            </div>

            <h3 className={styles.noticeTitle}>
              {notice?.title || ui(locale, '\u8d5b\u7a0b\u5f85\u516c\u5e03', 'Schedule Pending')}
            </h3>

            <p className={styles.noticeMessage}>
              {notice?.message || ui(locale, '\u8fd9\u4e00\u8f6e\u5bf9\u9635\u4f1a\u5728\u6307\u5b9a\u516c\u5f00\u65f6\u95f4\u81ea\u52a8\u653e\u51fa\u3002', 'This round will be published at the scheduled release time.')}
            </p>

            <div className={styles.noticeMeta}>
              <span>{notice?.scheduled_date || '--'}</span>
              <strong>{`${notice?.match_count || 0} ${ui(locale, '\u573a\u6bd4\u8d5b', 'Matches')}`}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function OverviewNoticeStrip({ notice, extraCount, locale }) {
  if (!notice) return null

  return (
    <div className={styles.overviewNoticeStrip}>
      <div className={styles.overviewNoticeText}>
        <span className={styles.overviewNoticeTag}>
          {notice?.round_label || notice?.round || ui(locale, '鏈疆璧涚▼', 'This Round')}
        </span>
        <strong>{notice?.title || ui(locale, '\u8d5b\u7a0b\u5f85\u516c\u5e03', 'Schedule Pending')}</strong>
      </div>
      <div className={styles.overviewNoticeMeta}>
        <span>{formatNoticeRelease(notice, locale)}</span>
        {extraCount > 0 ? <em>{`+${extraCount}`}</em> : null}
      </div>
    </div>
  )
}

function OverviewPendingPanel({ notice, notices, locale, t }) {
  if (!notice) return null

  return (
    <section className={`${styles.overviewPanel} ${styles.overviewPanelAccent}`}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{ui(locale, '鍏紑鎻愰啋', 'Release Notice')}</div>
          <h2 className={styles.sectionTitle}>{ui(locale, '涓嬫鍏紑', 'Next Release')}</h2>
        </div>
        <span className={styles.sectionCount}>{notices.length}</span>
      </div>

      <article className={styles.releaseFeature}>
        <div className={styles.releaseFeatureTop}>
          <span className={styles.releaseStage}>
            {stageLabel(notice?.stage, locale, t)} / {notice?.round_label || notice?.round || ui(locale, '鏈疆', 'Round')}
          </span>
          <span className={styles.releaseClock}>{formatNoticeRelease(notice, locale)}</span>
        </div>

        <h3 className={styles.releaseTitle}>{notice?.title || ui(locale, '\u8d5b\u7a0b\u5f85\u516c\u5e03', 'Schedule Pending')}</h3>
        <p className={styles.releaseMessage}>
          {notice?.message || ui(locale, '\u8fd9\u4e00\u8f6e\u5bf9\u9635\u4f1a\u5728\u6307\u5b9a\u516c\u5f00\u65f6\u95f4\u81ea\u52a8\u653e\u51fa\u3002', 'This round will be published at the scheduled release time.')}
        </p>

        <div className={styles.factGrid}>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '姣旇禌鏃ユ湡', 'Match Day')}</span>
            <strong className={styles.factValue}>{formatNoticeSchedule(notice, locale)}</strong>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '寰呭叕寮€灞€', 'Pending Matches')}</span>
            <strong className={styles.factValueAccent}>{notice?.match_count || 0}</strong>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '褰撳墠闃舵', 'Current Stage')}</span>
            <strong className={styles.factValue}>{stageLabel(notice?.stage, locale, t)}</strong>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '\u516c\u5f00\u72b6\u6001', 'Visibility')}</span>
            <strong className={styles.factValue}>{ui(locale, '绛夊緟鍏竷', 'Pending')}</strong>
          </div>
        </div>

        {notices.length > 1 ? (
          <div className={styles.releaseQueue}>
            {ui(locale, `\u53e6\u5916\u8fd8\u6709 ${notices.length - 1} \u8f6e\u7b49\u5f85\u516c\u5e03`, `${notices.length - 1} more rounds are queued`)}
          </div>
        ) : null}
      </article>
    </section>
  )
}

function OverviewSeasonCompletePanel({ latestResult, totalMatches, mapCount, locale, t }) {
  const schedule = latestResult ? formatMatchSchedule(latestResult, { locale, includeWeekday: false }) : null
  const teamAName = latestResult?.team_a?.short || latestResult?.team_a?.name || 'TBD'
  const teamBName = latestResult?.team_b?.short || latestResult?.team_b?.name || 'TBD'

  return (
    <section className={`${styles.overviewPanel} ${styles.overviewPanelAccent}`}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{ui(locale, '\u8d5b\u5b63\u72b6\u6001', 'Season Status')}</div>
          <h2 className={styles.sectionTitle}>{ui(locale, '\u8d5b\u5b63\u7ec8\u5c40', 'Season Complete')}</h2>
        </div>
        <span className={styles.sectionCount}>{ui(locale, '\u5b8c\u8d5b', 'Done')}</span>
      </div>

      <article className={styles.completeFeature}>
        <div className={styles.completeBadge}>{ui(locale, '\u5df2\u5168\u90e8\u5b8c\u8d5b', 'Season Complete')}</div>
        <h3 className={styles.completeTitle}>{ui(locale, '\u5f53\u524d\u8d5b\u5b63\u5df2\u5168\u90e8\u5b8c\u8d5b', 'The season is complete')}</h3>
        <p className={styles.completeMessage}>
          {ui(locale, '\u672c\u8d5b\u5b63\u516c\u5f00\u5bf9\u5c40\u5df2\u7ecf\u5168\u90e8\u7ed3\u675f\uff0c\u73b0\u5728\u53ef\u4ee5\u76f4\u63a5\u56de\u770b\u6700\u540e\u8d5b\u679c\u4e0e\u5404\u9636\u6bb5\u5bf9\u5c40\u3002', 'All public matches in this season have been completed.')}
        </p>

        {latestResult ? (
          <div className={styles.completeResult}>
            <div className={styles.completeResultMeta}>
              <span>{stageLabel(latestResult?.stage, locale, t)}</span>
              <span>{latestResult?.round || '--'}</span>
              <span>{latestResult?.format || 'TBD'}</span>
            </div>
            <div className={styles.completeScoreLine}>
              <span>{teamAName}</span>
              <strong>{getScore(latestResult, 'A')} : {getScore(latestResult, 'B')}</strong>
              <span>{teamBName}</span>
            </div>
            <div className={styles.completeResultTime}>{schedule?.compact}</div>
          </div>
        ) : null}

        <div className={styles.factGrid}>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '鍏紑瀵瑰眬', 'Public Matches')}</span>
            <strong className={styles.factValueAccent}>{totalMatches}</strong>
          </div>
          <div className={styles.factCard}>
            <span className={styles.factLabel}>{ui(locale, '鍦板浘鎬绘暟', 'Maps Played')}</span>
            <strong className={styles.factValue}>{mapCount}</strong>
          </div>
        </div>
      </article>
    </section>
  )
}

function OverviewStatusPanel({ notice, totalMatches, hiddenMatches, publicMatches, latestResults, locale, t, withSeason }) {
  const hasResults = latestResults.length > 0
  const heroValue = hiddenMatches > 0 ? hiddenMatches : publicMatches
  const heroLabel = hiddenMatches > 0
    ? ui(locale, '寰呭叕寮€灞€', 'Pending Matches')
    : ui(locale, '宸插叕寮€灞€', 'Public Matches')

  if (hasResults) {
    return (
      <section className={styles.overviewPanel}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionKicker}>{ui(locale, '\u6700\u65b0\u8d5b\u679c', 'Recent Results')}</div>
            <h2 className={styles.sectionTitle}>{ui(locale, '\u6700\u65b0\u8d5b\u679c', 'Recent Results')}</h2>
          </div>
          <Link to={withSeason('/matches')} className={styles.detailLink}>
            {ui(locale, '\u5bf9\u5c40\u6863\u6848', 'Match Archive')}
          </Link>
        </div>

        <div className={styles.rowStack}>
          {latestResults.map(match => (
            <ResultRow
              key={match?.match_id || match?.raw_match_id}
              match={match}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={styles.overviewPanel}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{ui(locale, '\u516c\u5f00\u72b6\u6001', 'Visibility Status')}</div>
          <h2 className={styles.sectionTitle}>{ui(locale, '\u5f53\u524d\u72b6\u6001', 'Current Status')}</h2>
        </div>
        <span className={styles.sectionCount}>{hiddenMatches || totalMatches || 0}</span>
      </div>

      <div className={styles.statusHero}>
        <div className={styles.statusHeroValue}>{heroValue}</div>
        <div className={styles.statusHeroLabel}>{heroLabel}</div>
      </div>

      <div className={styles.factGrid}>
        <div className={styles.factCard}>
          <span className={styles.factLabel}>{ui(locale, '宸插叕寮€灞€', 'Public Matches')}</span>
          <strong className={styles.factValue}>{publicMatches}</strong>
        </div>
        <div className={styles.factCard}>
          <span className={styles.factLabel}>{ui(locale, '寰呭叕寮€灞€', 'Pending Matches')}</span>
          <strong className={styles.factValueAccent}>{hiddenMatches}</strong>
        </div>
        <div className={styles.factCard}>
          <span className={styles.factLabel}>{ui(locale, '褰撳墠闃舵', 'Current Stage')}</span>
          <strong className={styles.factValue}>
            {notice ? stageLabel(notice?.stage, locale, t) : ui(locale, '绛夊緟鎺掔▼', 'Awaiting Schedule')}
          </strong>
        </div>
        <div className={styles.factCard}>
          <span className={styles.factLabel}>{ui(locale, '涓嬫鍏紑', 'Next Release')}</span>
          <strong className={styles.factValue}>
            {notice ? formatNoticeRelease(notice, locale) : ui(locale, '寰呭畾', 'TBD')}
          </strong>
        </div>
      </div>

      <div className={styles.statusSummary}>
        {notice ? (
          <>
            <span>{notice?.title || ui(locale, '\u8d5b\u7a0b\u5f85\u516c\u5e03', 'Schedule Pending')}</span>
            <strong>{formatNoticeSchedule(notice, locale)}</strong>
          </>
        ) : (
          <>
            <span>{ui(locale, '璧涗簨灏氭湭杩涘叆鍏紑璧涚▼闃舵', 'The season has not entered its public schedule phase yet')}</span>
            <strong>{ui(locale, '绛夊緟鎺掔▼', 'Awaiting Schedule')}</strong>
          </>
        )}
      </div>
    </section>
  )
}

function SwissSnapshotPanel({ standings, swissRules, locale, displayCount, withSeason }) {
  const visibleStandings = standings.slice(0, Math.min(standings.length, displayCount || 8))
  const directCount = standings.filter(team => Number(team?.match_wins || 0) >= swissRules.directAdvanceWins).length
  const lcqCount = standings.filter(team => {
    const wins = Number(team?.match_wins || 0)
    return wins >= swissRules.lcqSurvivalWins && wins < swissRules.directAdvanceWins
  }).length
  const totalTeams = standings.length

  return (
    <section className={styles.swissPanel}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{ui(locale, '\u6218\u961f\u6392\u540d', 'Team Rankings')}</div>
          <h2 className={styles.sectionTitle}>{ui(locale, '\u745e\u58eb\u8f6e\u6392\u540d', 'Swiss Standings')}</h2>
        </div>
        <Link to={withSeason('/standings')} className={styles.detailLink}>
          {ui(locale, '\u5b8c\u6574\u6392\u540d', 'Full Standings')}
        </Link>
      </div>

      <div className={styles.swissSnapshotStrip}>
        <div className={styles.swissSnapshotInline}>
          <span>{ui(locale, '\u76f4\u901a\u540d\u989d', 'Direct')}</span>
          <strong>{directCount}</strong>
        </div>
        <div className={styles.swissSnapshotInline}>
          <span>{ui(locale, '\u7a81\u56f4\u533a\u95f4', 'LCQ')}</span>
          <strong>{lcqCount}</strong>
        </div>
        <div className={styles.swissSnapshotInline}>
          <span>{ui(locale, '\u603b\u961f\u6570\u91cf', 'Teams')}</span>
          <strong>{totalTeams}</strong>
        </div>
      </div>

      <div className={styles.swissTableHead}>
        <span>#</span>
        <span>{ui(locale, '战队', 'Team')}</span>
        <span>W-L</span>
        <span>BHZ</span>
        <span>OMW</span>
        <span>{ui(locale, '区间', 'Zone')}</span>
      </div>

      <div className={styles.swissTable}>
        {visibleStandings.map(team => {
          const zone = getSwissZone(team, swissRules, locale)

          return (
            <Link
              key={team.team_id}
              to={withSeason(`/teams/${team.team_id}`)}
              className={styles.swissRow}
            >
              <div className={styles.swissRowRank}>{String(team.rank).padStart(2, '0')}</div>

              <div className={styles.swissRowTeam}>
                <strong>{team.team_short_name || team.team_id || team.team_name}</strong>
                <span>{team.team_name || team.team_short_name || team.team_id}</span>
              </div>

              <div className={styles.swissRowMetric}>{team.match_wins}-{team.match_losses}</div>
              <div className={styles.swissRowMetric}>{team.buchholz}</div>
              <div className={styles.swissRowMetric}>{formatPct(team.opponent_win_rate)}</div>
              <span className={`${styles.swissZoneBadge} ${styles[`swissZone_${zone.key}`]}`}>
                {zone.label}
              </span>
            </Link>
          )
        })}
      </div>

      <div className={styles.swissSnapshotFoot}>
        <span>{ui(locale, '\u540c\u5206\u987a\u5e8f', 'Tiebreak')}</span>
        <strong>BHZ / H2H / OMW / MAP</strong>
        <em>{`TOP ${visibleStandings.length}`}</em>
      </div>
    </section>
  )
}

function SwissRoundsPanel({ title, matches, roundState, onSelectRound, locale, t, withSeason }) {
  const { rounds, activeRound, activeGroup, activeRows, completedCount } = roundState
  const kicker = ui(locale, '\u8f6e\u6b21\u8d5b\u679c', 'Round Results')

  return (
    <section className={styles.swissPanel}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{kicker}</div>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        <span className={styles.sectionCount}>{matches.filter(isComplete).length}/{matches.length}</span>
      </div>

      {rounds.length === 0 ? (
        <div className={styles.emptyState}>{t('schedule.noMatches', 'No matches yet')}</div>
      ) : (
        <>
          <div className={styles.roundTabs}>
            {rounds.map(group => (
              <button
                key={group.round}
                type="button"
                onClick={() => onSelectRound(group.round)}
                className={`${styles.roundTab} ${group.round === activeRound ? styles.roundTabActive : ''}`}
              >
                <span>{compactRoundLabel(group.round)}</span>
                <strong>{group.rows.filter(isComplete).length}/{group.rows.length}</strong>
              </button>
            ))}
          </div>

          <div className={styles.roundBlock}>
            <div className={styles.roundTitle}>
              <span>{activeGroup?.round}</span>
              <strong>{completedCount}/{activeRows.length}</strong>
            </div>

            <div className={styles.roundGrid}>
              {activeRows.map(match => (
                <MatchCard
                  key={match?.match_id || match?.raw_match_id}
                  match={match}
                  locale={locale}
                  withSeason={withSeason}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function StageCard({ title, meta, complete, total, tone = 'default' }) {
  const progress = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <div className={`${styles.stageCard} ${styles[`stage_${tone}`]}`}>
      <div className={styles.stageCardTop}>
        <span>{title}</span>
        <strong>{complete}/{total}</strong>
      </div>
      <div className={styles.stageMeta}>{meta}</div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function StageSchedule({ title, subtitle, matches, locale, t, withSeason }) {
  const rounds = groupByRound(matches)
  const [selectedRound, setSelectedRound] = useState('')
  const activeRound = selectedRound && rounds.some(group => group.round === selectedRound)
    ? selectedRound
    : rounds[rounds.length - 1]?.round
  const activeGroup = rounds.find(group => group.round === activeRound)

  return (
    <section className={styles.stageSection}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionKicker}>{subtitle}</div>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        <span className={styles.sectionCount}>{matches.filter(isComplete).length}/{matches.length}</span>
      </div>

      {rounds.length === 0 ? (
        <div className={styles.emptyState}>{t('schedule.noMatches', 'No matches yet')}</div>
      ) : (
        <>
          <div className={styles.roundTabs}>
            {rounds.map(group => (
              <button
                key={group.round}
                type="button"
                onClick={() => setSelectedRound(group.round)}
                className={`${styles.roundTab} ${group.round === activeRound ? styles.roundTabActive : ''}`}
              >
                <span>{group.round}</span>
                <strong>{group.rows.filter(isComplete).length}/{group.rows.length}</strong>
              </button>
            ))}
          </div>

          <div className={styles.roundBlock}>
            <div className={styles.roundTitle}>
              <span>{activeGroup?.round}</span>
              <strong>{activeGroup?.rows.filter(isComplete).length || 0}/{activeGroup?.rows.length || 0}</strong>
            </div>

            <div className={styles.matchList}>
              {activeGroup?.rows.map(match => (
                <MatchCard
                  key={match?.match_id || match?.raw_match_id}
                  match={match}
                  locale={locale}
                  withSeason={withSeason}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default function SchedulePage() {
  const { db, season, locale, t, withSeason = path => path } = useOutletContext()
  const matches = safeArr(db?.matches)
  const scheduleAnnouncements = safeArr(db?.schedule_announcements)
  const rules = getSeasonRules(season, db)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSwissRound, setSelectedSwissRound] = useState('')
  const swissRules = useMemo(() => resolveSwissRules(rules), [rules])
  const swissStandings = useMemo(() => calculateSwissStandings(db), [db])

  const grouped = useMemo(() => {
    const result = {
      swiss: [],
      lcq: [],
      playoffs: [],
      grandFinal: []
    }

    matches.forEach(match => {
      const stage = normalizeStage(match)
      if (stage === 'SWISS') result.swiss.push(match)
      else if (stage === 'LCQ') result.lcq.push(match)
      else if (stage === 'GRAND_FINAL') result.grandFinal.push(match)
      else if (stage === 'PLAYOFFS') result.playoffs.push(match)
    })

    return result
  }, [matches])
  const swissRoundState = useMemo(
    () => getRoundState(grouped.swiss, selectedSwissRound),
    [grouped.swiss, selectedSwissRound]
  )
  const swissSnapshotCount = useMemo(
    () => Math.min(swissStandings.length, getSwissSnapshotCount(swissRoundState.activeRows.length)),
    [swissStandings.length, swissRoundState.activeRows.length]
  )

  const swissAnnouncements = useMemo(
    () => sortNotices(scheduleAnnouncements.filter(item => String(item?.stage || '').toUpperCase() === 'SWISS')),
    [scheduleAnnouncements]
  )

  const announcementStageCounts = useMemo(
    () => getNoticeStageCounts(scheduleAnnouncements),
    [scheduleAnnouncements]
  )

  const upcomingMatches = useMemo(() => {
    const liveMatches = sortMatches(matches.filter(match => !isComplete(match) && isLive(match)))
    const pendingMatches = sortMatches(
      matches.filter(match => !isComplete(match) && !isLive(match) && getMatchTimestamp(match) > 0)
    )

    return [...liveMatches, ...pendingMatches].slice(0, 8)
  }, [matches])

  const upcomingGroups = useMemo(
    () => groupUpcomingByDate(upcomingMatches, locale),
    [upcomingMatches, locale]
  )

  const latestResults = useMemo(
    () => sortMatches(matches.filter(isComplete), 'desc').slice(0, 5),
    [matches]
  )

  const visibleSwissMatches = grouped.swiss.length
  const visibleLcqMatches = grouped.lcq.length
  const visiblePlayoffMatches = grouped.playoffs.length
  const visibleGrandFinalMatches = grouped.grandFinal.length

  const hiddenSwissMatches = announcementStageCounts.SWISS || 0
  const hiddenLcqMatches = announcementStageCounts.LCQ || 0
  const hiddenPlayoffMatches = announcementStageCounts.PLAYOFFS || 0
  const hiddenGrandFinalMatches = announcementStageCounts.GRAND_FINAL || 0

  const swissTotalMatches = visibleSwissMatches + hiddenSwissMatches
  const lcqTotalMatches = visibleLcqMatches + hiddenLcqMatches
  const playoffTotalMatches = visiblePlayoffMatches + visibleGrandFinalMatches + hiddenPlayoffMatches + hiddenGrandFinalMatches
  const totalMatches = swissTotalMatches + lcqTotalMatches + playoffTotalMatches
  const completedMatches = [...grouped.swiss, ...grouped.lcq, ...grouped.playoffs, ...grouped.grandFinal]
    .filter(isComplete)
    .length
  const publicMatches = matches.length
  const hiddenMatches = scheduleAnnouncements.reduce((sum, item) => sum + Number(item?.match_count || 0), 0)
  const totalMaps = Number(db?.meta?.map_count || 0)
  const primaryNotice = swissAnnouncements[0] || null

  const tabs = [
    { key: 'overview', label: ui(locale, '\u603b\u89c8', 'Overview') },
    { key: 'swiss', label: t('schedule.swiss', 'Swiss') },
    { key: 'lcq', label: t('schedule.lcq', 'LCQ') },
    { key: 'playoffs', label: t('schedule.playoffs', 'Playoffs') }
  ]

  const seasonCode = season?.publicCode || db?.meta?.season_code || 'FCA'
  const seasonFinished = totalMatches > 0 && hiddenMatches === 0 && completedMatches >= totalMatches
  const showWeeklySchedule = upcomingGroups.length > 0
  const showPendingRelease = !showWeeklySchedule && Boolean(primaryNotice)
  const showSeasonComplete = !showWeeklySchedule && !showPendingRelease && seasonFinished

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>{ui(locale, '\u516c\u5f00\u65e5\u7a0b', 'Public Timeline')}</div>
          <h1 className={styles.heroTitle}>{ui(locale, '\u8d5b\u4e8b\u65e5\u7a0b', 'Event Schedule')}</h1>
          <p className={styles.heroDesc}>
            {ui(
              locale,
              '\u6309\u9636\u6bb5\u67e5\u770b\u516c\u5f00\u8d5b\u7a0b\u3001\u5f85\u516c\u5e03\u63d0\u9192\u4e0e\u5df2\u5b8c\u6210\u8d5b\u679c\u3002\u9009\u624b\u548c\u6559\u7ec3\u90fd\u53ef\u4ee5\u5728\u8fd9\u91cc\u76f4\u63a5\u8ddf\u8fdb\u6bcf\u5468\u6bd4\u8d5b\u5b89\u6392\u3002',
              'Follow release timing, upcoming matches, and completed results across every stage.'
            )}
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroCode}>{seasonCode}</div>
          <div className={styles.heroProgress}>{completedMatches}/{totalMatches}</div>
        </div>
      </section>

      <section className={styles.stageOverview}>
        <StageCard
          title={ui(locale, '\u516c\u5f00\u9884\u9009\u8d5b / \u745e\u58eb\u8f6e', 'Open Qualifier / Swiss')}
          meta={`${rules?.swissStage?.maxRounds || 6} ${ui(locale, '\u8f6e', 'Rounds')}`}
          complete={grouped.swiss.filter(isComplete).length}
          total={swissTotalMatches}
          tone="swiss"
        />
        <StageCard
          title={ui(locale, '\u516c\u5f00\u9884\u9009\u8d5b / \u7a81\u56f4\u8d5b', 'Open Qualifier / LCQ')}
          meta={`${rules?.advancement?.totalSlots || 8} ${ui(locale, '\u664b\u7ea7\u5e2d\u4f4d', 'Playoff Slots')}`}
          complete={grouped.lcq.filter(isComplete).length}
          total={lcqTotalMatches}
          tone="lcq"
        />
        <StageCard
          title={t('schedule.playoffs', 'Playoffs')}
          meta={formatBracketType(rules?.playoffs?.bracketType, locale)}
          complete={grouped.playoffs.filter(isComplete).length + grouped.grandFinal.filter(isComplete).length}
          total={playoffTotalMatches}
          tone="playoffs"
        />
      </section>

      <section className={styles.tabPanel}>
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'swiss' && (
            <ReleaseNoticePanel notices={swissAnnouncements} locale={locale} />
          )}

          {activeTab === 'overview' && (
            <section className={styles.overviewGrid}>
              {showWeeklySchedule ? (
                <section className={styles.overviewPanel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionKicker}>{ui(locale, '鏈懆璧涚▼', 'This Week')}</div>
                      <h2 className={styles.sectionTitle}>{ui(locale, '鏈懆璧涚▼', 'This Week')}</h2>
                    </div>
                    <span className={styles.sectionCount}>{upcomingMatches.length}</span>
                  </div>

                  <OverviewNoticeStrip
                    notice={primaryNotice}
                    extraCount={Math.max(swissAnnouncements.length - 1, 0)}
                    locale={locale}
                  />

                  <div className={styles.dayStack}>
                    {upcomingGroups.map(group => (
                      <section key={group.label} className={styles.dayGroup}>
                        <div className={styles.dayTitle}>
                          <span>{group.label}</span>
                          <strong>{group.rows.length}</strong>
                        </div>
                        <div className={styles.rowStack}>
                          {group.rows.map(match => (
                            <OverviewScheduleRow
                              key={match?.match_id || match?.raw_match_id}
                              match={match}
                              locale={locale}
                              t={t}
                              withSeason={withSeason}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ) : showPendingRelease ? (
                <OverviewPendingPanel
                  notice={primaryNotice}
                  notices={swissAnnouncements}
                  locale={locale}
                  t={t}
                />
              ) : showSeasonComplete ? (
                <OverviewSeasonCompletePanel
                  latestResult={latestResults[0]}
                  totalMatches={totalMatches}
                  mapCount={totalMaps}
                  locale={locale}
                  t={t}
                />
              ) : (
                <section className={styles.overviewPanel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionKicker}>{ui(locale, '\u8d5b\u4e8b\u72b6\u6001', 'Schedule Status')}</div>
                      <h2 className={styles.sectionTitle}>{ui(locale, '绛夊緟鎺掔▼', 'Awaiting Schedule')}</h2>
                    </div>
                    <span className={styles.sectionCount}>0</span>
                  </div>
                  <div className={styles.emptyState}>
                    <strong>{ui(locale, '褰撳墠杩樻病鏈夊叕寮€璧涚▼', 'No public schedule yet')}</strong>
                    <p className={styles.emptyNote}>
                      {ui(locale, '\u5bf9\u9635\u53d1\u5e03\u540e\u4f1a\u81ea\u52a8\u51fa\u73b0\u5728\u8fd9\u91cc\u3002', 'Published matchups will appear here automatically.')}
                    </p>
                  </div>
                </section>
              )}

              <OverviewStatusPanel
                notice={primaryNotice}
                totalMatches={totalMatches}
                hiddenMatches={hiddenMatches}
                publicMatches={publicMatches}
                latestResults={latestResults}
                locale={locale}
                t={t}
                withSeason={withSeason}
              />
            </section>
          )}

          {activeTab === 'swiss' && (
            <section className={styles.swissStageGrid}>
              <SwissSnapshotPanel
                standings={swissStandings}
                swissRules={swissRules}
                locale={locale}
                displayCount={swissSnapshotCount}
                withSeason={withSeason}
              />

              <SwissRoundsPanel
                title={t('schedule.swiss', 'Swiss')}
                matches={grouped.swiss}
                roundState={swissRoundState}
                onSelectRound={setSelectedSwissRound}
                locale={locale}
                t={t}
                withSeason={withSeason}
              />
            </section>
          )}

          {activeTab === 'lcq' && (
            <StageSchedule
              title={t('schedule.lcq', 'LCQ')}
              subtitle={ui(locale, '鍏紑棰勯€夎禌', 'Open Qualifier')}
              matches={grouped.lcq}
              locale={locale}
              t={t}
              withSeason={withSeason}
              />
          )}

          {activeTab === 'playoffs' && (
            <StageSchedule
              title={t('schedule.playoffs', 'Playoffs')}
              subtitle={t('schedule.grandFinal', 'Grand Final')}
              matches={[...grouped.playoffs, ...grouped.grandFinal]}
              locale={locale}
              t={t}
              withSeason={withSeason}
            />
          )}
        </div>
      </section>
    </div>
  )
}
