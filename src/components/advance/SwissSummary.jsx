import { Link } from 'react-router-dom'
import { teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function Fact({ label, value }) {
  return (
    <div className={styles.swissFact}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function SwissSummary({ overview, t, withSeason }) {
  const rules = overview.rules

  if (!overview.hasStarted) {
    return (
      <section className={styles.swissPrestartPanel}>
        <div className={styles.swissFactGrid}>
          <Fact label={t('advance.swiss.teams', '参赛队伍')} value={`${overview.teamCount} ${t('advance.unit.teams', '支队伍')}`} />
          <Fact label={t('advance.swiss.rounds', '瑞士轮轮次')} value={`${rules.maxRounds} ${t('advance.unit.rounds', '轮')}`} />
          <Fact label={t('advance.swiss.directCondition', '直通条件')} value={`${rules.directAdvanceWins}${t('advance.unit.wins', '胜')}`} />
          <Fact label={t('advance.swiss.breakthroughCondition', '突围资格')} value={`${rules.lcqSurvivalWins}${t('advance.unit.wins', '胜')}+`} />
          <Fact label={t('advance.swiss.totalSlots', '最终晋级')} value={`${rules.totalSlots} ${t('advance.unit.slots', '席')}`} />
        </div>
        <Link to={withSeason('/matches?view=list&tab=round')} className={styles.primaryAction}>
          {t('advance.swiss.viewRoundSchedule', '查看本轮赛程')} →
        </Link>
      </section>
    )
  }

  if (overview.seasonFinished || overview.swissFinished) {
    return (
      <section className={styles.swissRuleStrip}>
        <div>
          <span>01</span>
          <strong>{t('advance.swiss.format', '瑞士制')} · {overview.rounds} {t('advance.unit.rounds', '轮')}</strong>
          <em>{overview.teamCount} {t('advance.unit.teams', '支队伍')}</em>
        </div>
        <div>
          <span>02</span>
          <strong>{t('advance.swiss.directRule', '直通季后赛')} · {rules.directAdvanceWins} {t('advance.unit.wins', '胜')}</strong>
          <em>{rules.directSlots || 4} {t('advance.unit.slots', '个名额')}</em>
        </div>
        <div>
          <span>03</span>
          <strong>{t('advance.swiss.lcqRule', '进入突围赛')} · {rules.lcqSurvivalWins} {t('advance.unit.wins', '胜')}</strong>
          <em>{rules.breakthroughSlots || 20} {t('advance.unit.slots', '个名额')}</em>
        </div>
        <p>{t('advance.swiss.completed', '瑞士轮已结束')} · {overview.completedMatches} / {overview.totalMatches}</p>
      </section>
    )
  }

  const nextMatch = overview.nextMatch
  const nextMatchLabel = nextMatch
    ? `${teamShort(nextMatch.team_a)} VS ${teamShort(nextMatch.team_b)} · ${overview.nextStart || t('advance.common.tbd', 'TBD')}`
    : t('advance.common.tbd', 'TBD')

  return (
    <>
      <section className={styles.swissRuleStrip}>
        <div>
          <span>01</span>
          <strong>{t('advance.swiss.format', '瑞士制')} · {overview.rounds} {t('advance.unit.rounds', '轮')}</strong>
          <em>{overview.teamCount} {t('advance.unit.teams', '支队伍')} · {overview.completedMatches} / {overview.totalMatches} {t('advance.lcq.matches', '场比赛')}</em>
        </div>
        <div>
          <span>02</span>
          <strong>{t('advance.swiss.directRule', '直通季后赛')} · {rules.directAdvanceWins} {t('advance.unit.wins', '胜')}</strong>
          <em>{rules.directSlots || 4} {t('advance.unit.slots', '个名额')}</em>
        </div>
        <div>
          <span>03</span>
          <strong>{t('advance.swiss.lcqRule', '进入突围赛')} · {rules.lcqSurvivalWins} {t('advance.unit.wins', '胜')}</strong>
          <em>{rules.breakthroughSlots || 20} {t('advance.unit.slots', '个名额')}</em>
        </div>
        <p>{t('advance.swiss.roundShort', `第 ${overview.currentRound} / ${overview.rounds} 轮`, { current: overview.currentRound, total: overview.rounds })} · {overview.roundProgressLabel}</p>
      </section>
      <p className={styles.swissNextMatchStrip}>
        <span>{t('advance.swiss.nextMatch', '最后一场')}</span>
        <strong>{nextMatchLabel}</strong>
        <em>{t('advance.swiss.seedLockNotice', '比赛结束后将自动锁定全部突围赛与季后赛种子')}</em>
      </p>
    </>
  )
}
