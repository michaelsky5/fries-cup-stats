import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function teamId(team) {
  return team?.team_id || team?.id || ''
}

function sameTeam(left, right) {
  const leftId = teamId(left)
  const rightId = teamId(right)
  return Boolean(leftId && rightId && leftId === rightId)
}

function formatSchedule(value) {
  if (!value) return 'TBD'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'TBD'
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}

function SlotLine({ slot, score, winner, seasonId, withSeason, t }) {
  const team = slot?.team
  const isWinner = sameTeam(team, winner)
  const placeholder = slot?.type === 'winner'
    ? t('advance.lcq.winnerOf', `M${slot.winnerOf} 胜者`, { match: slot.winnerOf })
    : t('advance.lcq.seedSlot', `LCQ #${slot?.seed}`, { seed: slot?.seed })
  const content = (
    <>
      <span className={styles.lcqSlotSeed}>{slot?.type === 'seed' ? `#${slot.seed}` : 'W'}</span>
      {team ? <TeamLogo team={team} seasonId={seasonId} className={styles.lcqTeamLogo} /> : <i className={styles.lcqTeamPlaceholder} />}
      <strong>{team?.team_short_name || team?.short || team?.team_name || team?.name || placeholder}</strong>
      <b>{score === '' || score === null || score === undefined ? '—' : score}</b>
    </>
  )

  if (!teamId(team)) {
    return <div className={`${styles.lcqSlot} ${isWinner ? styles.lcqSlotWinner : ''}`}>{content}</div>
  }

  return (
    <Link
      to={withSeason(`/teams/${teamId(team)}`)}
      className={`${styles.lcqSlot} ${isWinner ? styles.lcqSlotWinner : ''}`}
    >
      {content}
    </Link>
  )
}

function LcqMatch({ match, seasonId, withSeason, t }) {
  const statusText = match.status === 'active'
    ? t('advance.matchStatus.active', '进行中')
    : match.status === 'completed'
      ? t('advance.matchStatus.completed', '已结束')
      : formatSchedule(match.scheduledAt)

  return (
    <article className={`${styles.lcqMatch} ${styles[`lcqMatch_${match.status}`] || ''} ${styles[`lcqMatch_${match.round}`] || ''}`}>
      <header>
        <span>{match.label}</span>
        <b>BO{match.bestOf}</b>
        <time>{statusText}</time>
      </header>
      <div>
        {match.slots.map((slot, index) => (
          <SlotLine
            key={`${match.number}-${index}`}
            slot={slot}
            score={match.scores[index]}
            winner={match.winner}
            seasonId={seasonId}
            withSeason={withSeason}
            t={t}
          />
        ))}
      </div>
      {match.id ? <Link className={styles.lcqMatchLink} to={withSeason(`/matches/${match.id}`)}>{t('advance.common.details', '查看比赛')}</Link> : null}
    </article>
  )
}

function FlowArrow({ muted = false, className = '' }) {
  return <i className={`${styles.lcqFlowArrow} ${muted ? styles.lcqFlowArrowMuted : ''} ${className}`} aria-hidden="true" />
}

function MergeConnector() {
  return <i className={styles.lcqMergeConnector} aria-hidden="true" />
}

function Division({ division, seasonId, withSeason, t }) {
  const winner = division.qualificationMatch.winner
  const directSeeds = division.roundOf16Matches[1].slots
    .filter(slot => slot.type === 'seed')
    .map(slot => `#${slot.seed}`)
    .join(' / ')
  return (
    <section className={styles.lcqDivision}>
      <header className={styles.lcqDivisionHeader}>
        <span>DIV {String(division.number).padStart(2, '0')}</span>
        <strong>{division.seeds.map(seed => `#${seed}`).join(' / ')}</strong>
      </header>
      <div className={styles.lcqDivisionFlow}>
        <div className={`${styles.lcqFlowColumn} ${styles.lcqPlayInColumn}`}>
          <LcqMatch match={division.playInMatch} seasonId={seasonId} withSeason={withSeason} t={t} />
        </div>
        <FlowArrow className={styles.lcqPlayInArrow} />
        <div className={styles.lcqDirectEntry}>
          <span>DIRECT ENTRY</span>
          <strong>{directSeeds}</strong>
          <em>{t('advance.lcq.directEntry', '直接进入 16 强')}</em>
        </div>
        <FlowArrow muted className={styles.lcqDirectEntryArrow} />
        <div className={`${styles.lcqFlowColumn} ${styles.lcqFlowColumnDouble}`}>
          {division.roundOf16Matches.map(match => (
            <LcqMatch key={match.number} match={match} seasonId={seasonId} withSeason={withSeason} t={t} />
          ))}
        </div>
        <MergeConnector />
        <div className={`${styles.lcqFlowColumn} ${styles.lcqQualificationColumn}`}>
          <LcqMatch match={division.qualificationMatch} seasonId={seasonId} withSeason={withSeason} t={t} />
        </div>
        <FlowArrow className={styles.lcqQualificationArrow} />
        <div className={styles.lcqAdvanceSlot}>
          <b>{String(division.number).padStart(2, '0')}</b>
          <span>{t('advance.lcq.divisionWinner', '分区冠军')}</span>
          {winner ? <TeamLogo team={winner} seasonId={seasonId} className={styles.lcqAdvanceLogo} /> : null}
          <strong>{winner?.team_short_name || winner?.short || t('advance.lcq.toPlayoffs', '晋级季后赛')}</strong>
        </div>
      </div>
    </section>
  )
}

export default function FourDivisionLcqBracket({ layout, seasonId, withSeason, t }) {
  return (
    <section className={styles.lcqSection}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>LAST CHANCE QUALIFIER</span>
          <h2>{t('advance.breakthrough.title', '突围赛晋级图')}</h2>
        </div>
        <div className={styles.lcqMetrics}>
          <span><b>{layout.participantCount}</b>{t('advance.lcq.teams', '支队伍')}</span>
          <span><b>{layout.totalMatches}</b>{t('advance.lcq.matches', '场比赛')}</span>
          <span className={styles.lcqMetricAccent}><b>{layout.advanceSlots}</b>{t('advance.lcq.slots', '个名额')}</span>
        </div>
      </header>

      <div className={styles.lcqRuleStrip}>
        <div>
          <span>01</span>
          <strong>{t('advance.lcq.playIn', '入围赛')} · BO3</strong>
          <em>07/18 · 20:00 / 21:00</em>
        </div>
        <div>
          <span>02</span>
          <strong>{t('advance.lcq.roundOf16', '16 强')} · BO3</strong>
          <em>07/19 · 20:00 / 21:00</em>
        </div>
        <div>
          <span>03</span>
          <strong>{t('advance.lcq.qualification', '晋级赛')} · BO5</strong>
          <em>07/25–26 · 20:00 / 21:30</em>
        </div>
        <p>{layout.bracketLocked ? t('advance.lcq.locked', '固定签位 · 不重新排位') : null}</p>
      </div>

      <div className={styles.lcqPool}>
        <header>
          <div>
            <span className={styles.sectionLabel}>LCQ POOL</span>
            <strong>{layout.rankingsLocked ? t('advance.lcq.finalSeeds', '瑞士轮最终种子') : t('advance.lcq.seedPending', '瑞士轮结束后锁定种子')}</strong>
          </div>
          <em>{layout.completedMatches} / {layout.totalMatches}</em>
        </header>
        <div>
          {layout.seededTeams.map(slot => (
            <div key={slot.seed} className={styles.lcqPoolSlot}>
              <span>{String(slot.seed).padStart(2, '0')}</span>
              <strong>{slot.team?.team_short_name || slot.team?.short || `LCQ #${slot.seed}`}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.lcqBracketLead}>
        <span>{t('advance.lcq.routeLabel', '固定晋级路径')}</span>
        <strong>{t('advance.lcq.routeDesc', '#13–20 号种子先打入围赛；每个分区仅产生 1 个季后赛席位')}</strong>
        <em>{t('advance.bracket.scrollHint', '窄屏可横向滚动查看完整晋级图')}</em>
      </div>
      <div className={styles.lcqScroller}>
        <div className={styles.lcqCanvas}>
          <div className={styles.lcqRoundGuide}>
            <div className={styles.lcqRoundGuideIntro}>
              <span>FOUR DIVISIONS</span>
              <strong>{t('advance.lcq.singleElimination', '单败淘汰')}</strong>
            </div>
            <div>
              <span>01 · PLAY-IN</span>
              <strong>{t('advance.lcq.playIn', '入围赛')}</strong>
              <em>4 MATCHES · BO3</em>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>02 · ROUND OF 16</span>
              <strong>{t('advance.lcq.roundOf16', '16 强')}</strong>
              <em>8 MATCHES · BO3</em>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>03 · QUALIFICATION</span>
              <strong>{t('advance.lcq.qualification', '晋级赛')}</strong>
              <em>4 MATCHES · BO5</em>
            </div>
            <i aria-hidden="true" />
            <div className={styles.lcqRoundGuideAdvance}>
              <span>04 · ADVANCE</span>
              <strong>{t('advance.lcq.playoffSlots', '季后赛席位')}</strong>
              <em>4 TEAMS</em>
            </div>
          </div>
          {layout.divisions.map(division => (
            <Division key={division.number} division={division} seasonId={seasonId} withSeason={withSeason} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
