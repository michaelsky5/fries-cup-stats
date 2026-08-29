import AdvancePhaseHero from './AdvancePhaseHero.jsx'
import BracketMatchCard from './BracketMatchCard.jsx'
import { getMatchStatusLabelKey } from '../../lib/advanceSelectors.js'
import { getBracketMatchStatusText } from '../../lib/bracketPresentation.js'
import { pickLocale } from '../../lib/legacyI18n.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function copy(locale, zh, en) {
  return pickLocale(locale, zh, en)
}

function getRoundKind(round) {
  const text = `${round?.id || ''} ${round?.label || ''}`.toUpperCase()
  if (/GRAND|总决/.test(text)) return 'grand'
  if (/3RD|THIRD|季军/.test(text)) return 'third'
  if (/SEMI|半决/.test(text)) return 'semifinal'
  if (/QUARTER|八强/.test(text)) return 'quarterfinal'
  return 'round'
}

function getRoundTitle(round, locale) {
  const kind = getRoundKind(round)
  if (kind === 'quarterfinal') return copy(locale, '八强赛', 'Quarterfinals')
  if (kind === 'semifinal') return copy(locale, '半决赛', 'Semifinals')
  if (kind === 'third') return copy(locale, '季军赛', 'Third Place')
  if (kind === 'grand') return copy(locale, '总决赛', 'Grand Finals')
  return round?.label || round?.id || copy(locale, '淘汰赛', 'Playoffs')
}

function getRoundKicker(round, locale) {
  const kind = getRoundKind(round)
  if (kind === 'quarterfinal') return copy(locale, '八强阶段', 'Quarterfinals')
  if (kind === 'semifinal') return copy(locale, '四强阶段', 'Semifinals')
  if (kind === 'third') return copy(locale, '季军争夺', 'Third Place')
  if (kind === 'grand') return copy(locale, '冠军争夺', 'Grand Finals')
  return getRoundTitle(round, locale)
}

function getMatchCountLabel(count, locale) {
  return copy(locale, `${count} 场比赛`, `${count} ${count === 1 ? 'match' : 'matches'}`)
}

function getTeamLabel(team, locale) {
  return team?.short || team?.team_short_name || team?.name || team?.team_name || copy(locale, '待定', 'TBD')
}

function localizeMatch(match, round, locale) {
  const roundTitle = getRoundTitle(round, locale)
  const teamA = getTeamLabel(match?.teamA, locale)
  const teamB = getTeamLabel(match?.teamB, locale)

  return {
    ...match,
    round: roundTitle,
    stage: roundTitle,
    label: `${roundTitle} / ${teamA} ${copy(locale, '对阵', 'vs')} ${teamB}`
  }
}

function isCompleted(match) {
  return ['completed', 'finished', 'final'].includes(String(match?.status || '').toLowerCase())
}

function isLive(match) {
  return ['active', 'live', 'in_progress'].includes(String(match?.status || '').toLowerCase())
}

function getTeamKey(team) {
  if (!team || team.isTbd) return ''
  return String(team.team_id || team.id || team.team_short_name || team.short || team.name || '')
}

function getMatchCode(match) {
  const matchId = String(match?.matchId || match?.id || '')
  const matchNumber = matchId.match(/(?:^|-)M0*(\d+)$/i)?.[1]
  return matchNumber ? `M${Number(matchNumber)}` : matchId || 'MATCH'
}

function getFormatLabel(match, round) {
  const raw = String(match?.format || '').trim().toUpperCase()
  if (/^FT\d+$/.test(raw)) return raw
  const bestOf = Number(raw.match(/^(?:BO|BEST\s+OF)\s*(\d+)$/)?.[1] || 0)
  if (bestOf > 0) return `FT${Math.ceil(bestOf / 2)}`
  return ['grand', 'third'].includes(getRoundKind(round)) ? 'FT4' : 'FT3'
}

function isUnresolvedTeam(team) {
  const id = String(team?.team_id || team?.id || '').trim().toUpperCase()
  const label = getTeamLabel(team, 'en-US').toUpperCase()
  return Boolean(
    team?.isTbd ||
    !id ||
    id === 'TBD' ||
    /^(?:W|L)-?M\d+$/.test(label) ||
    label === 'TBD'
  )
}

function getWinnerTeam(match) {
  const winnerId = String(match?.winnerId || '')
  return [match?.teamA, match?.teamB].find(team => (
    [team?.team_id, team?.id].filter(Boolean).some(id => String(id) === winnerId)
  )) || null
}

function buildSlot(team, locale, score) {
  const unresolved = isUnresolvedTeam(team)
  return {
    source: unresolved ? getTeamLabel(team, locale) : '',
    team: unresolved ? { ...team, isTbd: true } : team,
    name: unresolved ? copy(locale, '待定', 'TBD') : getTeamLabel(team, locale),
    detail: unresolved
      ? copy(locale, '等待上轮结果', 'Awaiting previous result')
      : team?.name || team?.team_name || '',
    score
  }
}

function SingleEliminationMatchCard({
  match,
  round,
  locale,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const localizedMatch = localizeMatch(match, round, locale)
  const statusLabel = t(getMatchStatusLabelKey(localizedMatch.status), localizedMatch.status)
  const matchHref = localizedMatch.matchId ? withSeason(`/matches/${localizedMatch.matchId}`) : ''
  const kind = getRoundKind(round)

  return (
    <BracketMatchCard
      label={getMatchCode(localizedMatch)}
      formatLabel={getFormatLabel(localizedMatch, round)}
      status={localizedMatch.status}
      statusText={getBracketMatchStatusText(localizedMatch, statusLabel, locale)}
      href={matchHref}
      slots={[
        buildSlot(localizedMatch.teamA, locale, localizedMatch.scoreA),
        buildSlot(localizedMatch.teamB, locale, localizedMatch.scoreB)
      ]}
      winner={getWinnerTeam(localizedMatch)}
      accent={kind === 'grand' ? 'grandFinal' : kind === 'third' ? 'lowerFinal' : ''}
      seasonId={seasonId}
      withSeason={withSeason}
      isFavoriteTeam={isFavoriteTeam}
      isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      t={t}
    />
  )
}

function RoundColumn({
  round,
  step,
  locale,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const kind = getRoundKind(round)

  return (
    <section className={`${styles.singleElimColumn} ${styles[`singleElimColumn_${kind}`]}`}>
      <header className={styles.singleElimColumnHeader}>
        <b>{String(step).padStart(2, '0')}</b>
        <div>
          <span>{getRoundKicker(round, locale)}</span>
          <strong>{getRoundTitle(round, locale)}</strong>
        </div>
        <em>{getMatchCountLabel(round.matches.length, locale)}</em>
      </header>
      <div className={styles.singleElimMatches}>
        {round.matches.map(match => (
          <SingleEliminationMatchCard
            key={match.matchId || match.label}
            match={match}
            round={round}
            locale={locale}
            seasonId={seasonId}
            t={t}
            withSeason={withSeason}
            isFavoriteTeam={isFavoriteTeam}
            isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
          />
        ))}
      </div>
    </section>
  )
}

function MedalColumn({
  rounds,
  locale,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const sortedRounds = [...rounds].sort((left, right) => {
    const order = { grand: 0, third: 1 }
    return (order[getRoundKind(left)] ?? 2) - (order[getRoundKind(right)] ?? 2)
  })

  return (
    <section className={`${styles.singleElimColumn} ${styles.singleElimMedalColumn}`}>
      <header className={styles.singleElimColumnHeader}>
        <b>03</b>
        <div>
          <span>{copy(locale, '奖牌赛', 'Finals Day')}</span>
          <strong>{copy(locale, '决赛日', 'Finals Day')}</strong>
        </div>
        <em>{getMatchCountLabel(rounds.reduce((total, round) => total + round.matches.length, 0), locale)}</em>
      </header>
      <div className={styles.singleElimMedalMatches}>
        {sortedRounds.map(round => {
          const kind = getRoundKind(round)
          return (
            <section key={round.id} className={styles[`singleElimMedal_${kind}`]}>
              <header>
                <span>{getRoundKicker(round, locale)}</span>
                <strong>{getRoundTitle(round, locale)}</strong>
              </header>
              {round.matches.map(match => (
                <SingleEliminationMatchCard
                  key={match.matchId || match.label}
                  match={match}
                  round={round}
                  locale={locale}
                  seasonId={seasonId}
                  t={t}
                  withSeason={withSeason}
                  isFavoriteTeam={isFavoriteTeam}
                  isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
                />
              ))}
            </section>
          )
        })}
      </div>
    </section>
  )
}

export default function SingleEliminationBracket({
  bracket,
  title,
  eyebrow,
  locale = 'zh-CN',
  t,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const rounds = bracket?.rounds || []
  const quarterfinal = rounds.find(round => getRoundKind(round) === 'quarterfinal') || rounds[0]
  const semifinal = rounds.find(round => getRoundKind(round) === 'semifinal') || rounds[1]
  const medalRounds = rounds.filter(round => ['third', 'grand'].includes(getRoundKind(round)))
  const allMatches = rounds.flatMap(round => round.matches || [])
  const completedMatches = allMatches.filter(isCompleted).length
  const currentRound = rounds.find(round => round.matches?.some(isLive)) ||
    rounds.find(round => round.matches?.some(match => !isCompleted(match))) ||
    rounds.at(-1)
  const publishedTeams = new Set(
    (quarterfinal?.matches || []).flatMap(match => [getTeamKey(match.teamA), getTeamKey(match.teamB)]).filter(Boolean)
  )
  const teamCount = Math.max(publishedTeams.size, (quarterfinal?.matches?.length || 0) * 2)

  return (
    <div className={styles.phaseStack}>
      <section className={styles.singleElimDashboard}>
        <AdvancePhaseHero
          eyebrow={copy(locale, '八强季后赛', eyebrow || 'Top 8 Playoffs')}
          title={title}
          description={copy(
            locale,
            '八强单败晋级 · 八强赛与半决赛 FT3 · 季军赛与总决赛 FT4',
            'Single-elimination top eight · quarterfinals and semifinals FT3 · medal matches FT4'
          )}
          metrics={[
            { value: teamCount || 8, label: copy(locale, '支晋级队伍', 'Qualified Teams') },
            { value: allMatches.length, label: copy(locale, '场淘汰赛', 'Playoff Matches') },
            { value: 1, label: copy(locale, '个冠军席位', 'Champion Slot'), accent: true }
          ]}
        />
        <div className={styles.singleElimSummary}>
          <div><span>{copy(locale, '淘汰赛进度', 'Playoff Progress')}</span><strong>{completedMatches} / {allMatches.length}</strong></div>
          <div><span>{copy(locale, '当前轮次', 'Current Round')}</span><strong>{getRoundTitle(currentRound, locale)}</strong></div>
          <div><span>{copy(locale, '八强赛 / 半决赛', 'Quarterfinals / Semifinals')}</span><strong>FT3</strong></div>
          <div><span>{copy(locale, '季军赛 / 总决赛', 'Third Place / Grand Finals')}</span><strong>FT4</strong></div>
        </div>
      </section>

      <section className={styles.singleElimPath} aria-labelledby="single-elim-path-title">
        <header>
          <span>{copy(locale, '晋级路径', 'Advancement Path')}</span>
          <h2 id="single-elim-path-title">{copy(locale, '晋级路径', 'Advancement Path')}</h2>
        </header>
        <ol>
          {rounds.map((round, index) => (
            <li key={round.id}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span><strong>{getRoundTitle(round, locale)}</strong><em>{getMatchCountLabel(round.matches.length, locale)} · {index < 2 ? 'FT3' : 'FT4'}</em></span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.singleElimBoard}>
        <header className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionLabel}>{copy(locale, '晋级路线', 'Bracket Route')}</span>
            <h2>{copy(locale, '从八强到冠军', 'Road to the Championship')}</h2>
          </div>
          <p>{copy(locale, '对阵按真实晋级顺序排列；决赛日集中展示冠军与季军归属。', 'Matches follow the real advancement order, with both medal matches grouped on finals day.')}</p>
        </header>
        <div className={styles.singleElimScrollHint}>{copy(locale, '晋级路线  4 场 → 2 场 → 决赛日', 'Bracket route  4 matches → 2 matches → finals day')}</div>
        <div className={styles.singleElimScroller}>
          <div className={styles.singleElimGrid}>
            {quarterfinal ? (
              <RoundColumn
                round={quarterfinal}
                step={1}
                locale={locale}
                seasonId={seasonId}
                t={t}
                withSeason={withSeason}
                isFavoriteTeam={isFavoriteTeam}
                isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
              />
            ) : null}
            {semifinal ? (
              <RoundColumn
                round={semifinal}
                step={2}
                locale={locale}
                seasonId={seasonId}
                t={t}
                withSeason={withSeason}
                isFavoriteTeam={isFavoriteTeam}
                isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
              />
            ) : null}
            {medalRounds.length ? (
              <MedalColumn
                rounds={medalRounds}
                locale={locale}
                seasonId={seasonId}
                t={t}
                withSeason={withSeason}
                isFavoriteTeam={isFavoriteTeam}
                isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
