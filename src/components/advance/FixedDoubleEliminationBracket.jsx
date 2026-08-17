import { getMatchStatusLabelKey } from '../../lib/advanceSelectors.js'
import AdvancePhaseHero from './AdvancePhaseHero.jsx'
import BracketMatchCard from './BracketMatchCard.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function formatWindowDate(value) {
  const text = String(value || '')
  const match = text.match(/\d{4}-(\d{2})-(\d{2})/)
  return match ? `${match[1]}/${match[2]}` : '-'
}

function formatMatchTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
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

function slotSourceLabel(slot) {
  if (slot.seed) return `#${slot.seed}`
  if (slot.winnerOf) return `W-M${slot.winnerOf}`
  if (slot.loserOf) return `L-M${slot.loserOf}`
  return 'TBD'
}

function PlayoffMatchCard({
  match,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam,
  t
}) {
  const matchTime = formatMatchTime(match.scheduledAt)
  const matchHref = match.matchId ? withSeason(`/matches/${match.matchId}`) : ''
  const statusLabel = t(getMatchStatusLabelKey(match.status), match.status)
  const statusText = ['active', 'completed', 'postponed', 'cancelled'].includes(match.status)
    ? statusLabel
    : matchTime || statusLabel

  return (
    <BracketMatchCard
      label={match.label}
      formatLabel={`FT${match.firstTo}`}
      status={match.status}
      statusText={statusText}
      href={matchHref}
      slots={match.slots.map((slot, index) => ({
        source: slotSourceLabel(slot),
        team: slot.team,
        name: slot.team?.team_short_name || slot.team?.short || t('advance.common.tbd', '待定'),
        detail: slot.team?.team_name || slot.team?.name || t('advance.common.tbd', '待定'),
        score: index === 0 ? match.scoreA : match.scoreB,
        crossover: slot.crossover
      }))}
      winner={match.winner}
      accent={match.round}
      seasonId={seasonId}
      withSeason={withSeason}
      isFavoriteTeam={isFavoriteTeam}
      isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      t={t}
    />
  )
}

function FlowConnector({ className = '', variant = 'single' }) {
  return <i className={`${styles.playoffFlowConnector} ${styles[`playoffFlowConnector_${variant}`]} ${className}`} aria-hidden="true" />
}

function MatchPosition({ className, match, cardProps }) {
  return (
    <div className={`${styles.playoffMatchPosition} ${className}`}>
      <PlayoffMatchCard match={match} {...cardProps} />
    </div>
  )
}

function LaneGuide({ items }) {
  return (
    <div className={styles.playoffLaneGuide}>
      {items.map((item, index) => (
        <div key={item.key}>
          <span>{String(index + 1).padStart(2, '0')} · {item.english}</span>
          <strong>{item.label}</strong>
          <em>
            {item.meta}
            {item.badge ? <b>{item.badge}</b> : null}
          </em>
        </div>
      ))}
    </div>
  )
}

function PlayoffLane({ type, matchesByNumber, cardProps, t }) {
  const isUpper = type === 'upper'
  const guideItems = isUpper
    ? [
        { key: 'upper-r1', english: 'UPPER ROUND 1', label: t('advance.playoffs.round.upperRound1', '胜者组首轮'), meta: 'M1–M4 · FT3' },
        { key: 'upper-sf', english: 'UPPER SEMIFINAL', label: t('advance.playoffs.round.upperSemifinal', '胜者组半决赛'), meta: 'M7–M8 · FT3' },
        { key: 'upper-final', english: 'UPPER FINAL', label: t('advance.playoffs.round.upperFinal', '胜者组决赛'), meta: 'M11 · FT3' }
      ]
    : [
        { key: 'lower-r1', english: 'LOWER ROUND 1', label: t('advance.playoffs.round.lowerRound1', '败者组第一轮'), meta: 'M5–M6 · FT3' },
        {
          key: 'lower-r2',
          english: 'LOWER ROUND 2',
          label: t('advance.playoffs.round.lowerRound2', '败者组第二轮'),
          meta: 'M9–M10 · FT3',
          badge: t('advance.playoffs.crossoverShort', '上下半区交叉')
        },
        { key: 'lower-r3', english: 'LOWER ROUND 3', label: t('advance.playoffs.round.lowerRound3', '败者组第三轮'), meta: 'M12 · FT3' },
        { key: 'lower-final', english: 'LOWER FINAL', label: t('advance.playoffs.round.lowerFinal', '败者组决赛'), meta: 'M13 · FT3' }
      ]

  return (
    <section className={`${styles.playoffFlowLane} ${isUpper ? styles.playoffUpperLane : styles.playoffLowerLane}`}>
      <aside className={styles.playoffLaneLabel}>
        <span>{isUpper ? 'UPPER' : 'LOWER'}</span>
        <strong>{isUpper ? t('advance.bracket.filter.winners', '胜者组') : t('advance.bracket.filter.losers', '败者组')}</strong>
        <em>{isUpper
          ? t('advance.playoffs.upperHint', '保持全胜，直通总决赛')
          : t('advance.playoffs.crossoverNote', 'M9 / M10 交换上下半区')}
        </em>
      </aside>
      <div className={styles.playoffLaneContent}>
        <LaneGuide items={guideItems} />
        <div className={styles.playoffLaneGrid}>
          {isUpper ? (
            <>
              <MatchPosition className={styles.playoffGridM1} match={matchesByNumber.get(1)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM2} match={matchesByNumber.get(2)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM3} match={matchesByNumber.get(3)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM4} match={matchesByNumber.get(4)} cardProps={cardProps} />
              <FlowConnector variant="mergeTop" />
              <FlowConnector variant="mergeBottom" />
              <MatchPosition className={styles.playoffGridM7} match={matchesByNumber.get(7)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM8} match={matchesByNumber.get(8)} cardProps={cardProps} />
              <FlowConnector variant="mergeAll" />
              <MatchPosition className={styles.playoffGridM11} match={matchesByNumber.get(11)} cardProps={cardProps} />
            </>
          ) : (
            <>
              <MatchPosition className={styles.playoffGridM5} match={matchesByNumber.get(5)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM6} match={matchesByNumber.get(6)} cardProps={cardProps} />
              <FlowConnector variant="parallel" />
              <MatchPosition className={styles.playoffGridM9} match={matchesByNumber.get(9)} cardProps={cardProps} />
              <MatchPosition className={styles.playoffGridM10} match={matchesByNumber.get(10)} cardProps={cardProps} />
              <FlowConnector variant="mergeAll" />
              <MatchPosition className={styles.playoffGridM12} match={matchesByNumber.get(12)} cardProps={cardProps} />
              <FlowConnector variant="single" />
              <MatchPosition className={styles.playoffGridM13} match={matchesByNumber.get(13)} cardProps={cardProps} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function GrandFinalColumn({ match, cardProps, t }) {
  const championName = match?.winner?.team_short_name || match?.winner?.short || match?.winner?.team_name || match?.winner?.name
  const championFullName = match?.winner?.team_name || match?.winner?.name || ''

  return (
    <section className={styles.playoffGrandFinalColumn}>
      <header>
        <span>04 · GRAND FINAL</span>
        <strong>{t('advance.playoffs.round.grandFinal', '总决赛')}</strong>
        <em>M14 · FT4</em>
      </header>
      <div className={styles.playoffGrandFinalBody}>
        <div className={styles.playoffGrandFinalStage}>
          <div className={styles.playoffGrandFinalRoute}>
            <span><b>W-M11</b>{t('advance.playoffs.upperChampion', '胜者组冠军')}</span>
            <i>VS</i>
            <span><b>W-M13</b>{t('advance.playoffs.lowerChampion', '败者组冠军')}</span>
          </div>
          <MatchPosition className={styles.playoffGrandFinalMatch} match={match} cardProps={cardProps} />
          <i className={styles.playoffGrandFinalToChampion} aria-hidden="true" />
          <div className={styles.playoffChampionTarget}>
            <span>WINNER</span>
            <strong>{championName || t('advance.playoffs.seasonChampion', '赛季总冠军')}</strong>
            {championName && championFullName !== championName ? <em>{championFullName}</em> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function FixedDoubleEliminationBracket({
  layout,
  title,
  eyebrow,
  t,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const eventWindow = layout.eventWindow || {}
  const dateRange = `${formatWindowDate(eventWindow.start)}–${formatWindowDate(eventWindow.end)}`
  const matchesByNumber = new Map(layout.matches.map(match => [match.number, match]))
  const cardProps = { seasonId, withSeason, isFavoriteTeam, isPrimaryFavoriteTeam, t }

  return (
    <section className={styles.fixedPlayoffSection}>
      <AdvancePhaseHero
        eyebrow={eyebrow}
        title={title}
        description={t('advance.playoffs.fixedDesc', '8 支队伍 · 固定种子双败 · 败者组交叉落位 · 无重置赛')}
        metrics={[
          { value: layout.participantCount, label: t('advance.playoffs.teams', '支队伍') },
          { value: layout.totalMatches, label: t('advance.playoffs.matches', '场比赛') },
          { value: 'FT3', label: t('advance.playoffs.grandFinalFt4', '总决赛 FT4'), accent: true }
        ]}
      />

      <div className={styles.playoffRuleStrip}>
        <div><span>01</span><strong>{t('advance.playoffs.openingDay', '胜者组首轮')} · FT3</strong><em>08/08 · 19:30 / 21:30</em></div>
        <div><span>02</span><strong>{t('advance.playoffs.eliminationDay', '胜者组半决赛 / 败者组')} · FT3</strong><em>08/09 · 19:30 / 21:30</em></div>
        <div><span>03</span><strong>{t('advance.playoffs.finalWeekend', '决赛周末')} · FT3</strong><em>08/14 · 20:00 双台 · 08/15 · 17:30 / 19:30 / 21:30</em></div>
        <div><span>04</span><strong>{t('advance.playoffs.grandFinal', '总决赛')} · FT4</strong><em>08/16 · 20:00</em></div>
        <p>{layout.bracketLocked ? t('advance.playoffs.lockedRule', '固定签位 · 无重置赛') : null}</p>
      </div>

      <p className={styles.bracketScheduleNoticeStrip}>
        <span>{t('advance.scheduleNotice.label', '赛程时间说明')}</span>
        <strong>{t('advance.scheduleNotice.delay', '赛程时间为计划开赛时间；同一直播间连续进行的场次，如前一场延时，后续比赛将依次顺延。')}</strong>
      </p>

      <div className={`${styles.lcqPool} ${styles.playoffSeedPool}`}>
        <header>
          <div>
            <span className={styles.sectionLabel}>PLAYOFF SEEDS</span>
            <strong>
              {t('advance.playoffs.seedRanking', `已锁定 ${layout.lockedSeedCount} / ${layout.participantCount} 个种子`, {
                locked: layout.lockedSeedCount,
                total: layout.participantCount
              })}
            </strong>
          </div>
          <em>{dateRange}</em>
        </header>
        <div>
          {layout.seededTeams.map(team => (
            <div key={team.seed} className={styles.lcqPoolSlot}>
              <span>{String(team.seed).padStart(2, '0')}</span>
              <strong>
                {team.isTbd
                  ? t('advance.playoffs.seedSlot', `季后赛 #${team.seed}`, { seed: team.seed })
                  : team.team_short_name || team.short || team.team_name || team.name}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.playoffBracketLead}>
        <span>{t('advance.playoffs.routeLabel', '双败晋级路径')}</span>
        <strong>{t('advance.playoffs.flowHint', 'W = 胜者 · L = 败者；M9 / M10 采用反半区落位，避免同路径过早重赛')}</strong>
        <em>{t('advance.bracket.scrollHint', '窄屏可横向滚动查看完整晋级图')}</em>
      </div>

      <div className={styles.fixedPlayoffScroller}>
        <div className={styles.fixedPlayoffCanvas}>
          <div className={styles.playoffBracketLanes}>
            <PlayoffLane type="upper" matchesByNumber={matchesByNumber} cardProps={cardProps} t={t} />
            <PlayoffLane type="lower" matchesByNumber={matchesByNumber} cardProps={cardProps} t={t} />
          </div>
          <i className={styles.playoffGrandMergeConnector} aria-hidden="true" />
          <GrandFinalColumn match={matchesByNumber.get(14)} cardProps={cardProps} t={t} />
        </div>
      </div>
    </section>
  )
}
