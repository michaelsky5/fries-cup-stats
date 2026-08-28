import AdvancePhaseHero from './AdvancePhaseHero.jsx'
import BracketMatchNode from './BracketMatchNode.jsx'
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
          <span>{round.id}</span>
          <strong>{getRoundTitle(round, locale)}</strong>
        </div>
        <em>{round.matches.length} MATCHES</em>
      </header>
      <div className={styles.singleElimMatches}>
        {round.matches.map(match => (
          <BracketMatchNode
            key={match.matchId || match.label}
            match={match}
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
          <span>FINALS DAY</span>
          <strong>{copy(locale, '决赛日', 'Finals Day')}</strong>
        </div>
        <em>{rounds.reduce((total, round) => total + round.matches.length, 0)} MATCHES</em>
      </header>
      <div className={styles.singleElimMedalMatches}>
        {sortedRounds.map(round => {
          const kind = getRoundKind(round)
          return (
            <section key={round.id} className={styles[`singleElimMedal_${kind}`]}>
              <header>
                <span>{round.id}</span>
                <strong>{getRoundTitle(round, locale)}</strong>
              </header>
              {round.matches.map(match => (
                <BracketMatchNode
                  key={match.matchId || match.label}
                  match={match}
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
          eyebrow={eyebrow}
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
          <span>ADVANCEMENT PATH</span>
          <h2 id="single-elim-path-title">{copy(locale, '晋级路径', 'Advancement Path')}</h2>
        </header>
        <ol>
          {rounds.map((round, index) => (
            <li key={round.id}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span><strong>{getRoundTitle(round, locale)}</strong><em>{round.matches.length} {copy(locale, '场', 'matches')} · {index < 2 ? 'FT3' : 'FT4'}</em></span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.singleElimBoard}>
        <header className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionLabel}>BRACKET ROUTE</span>
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
