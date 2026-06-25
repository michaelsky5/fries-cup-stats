import { Link } from 'react-router-dom'
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
      <section className={styles.swissIntro}>
        <div className={styles.swissIntroLead}>
          <span className={styles.sectionLabel}>SWISS STAGE</span>
          <h2>{t('advance.swiss.notStartedTitle', '瑞士轮尚未开始')}</h2>
          <p>{t('advance.swiss.notStartedDesc', '比赛开始后将展示完整积分榜、晋级区、突围区、竞争区、危险区、已出局队伍与同分规则。')}</p>
        </div>
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
      <section className={styles.swissSummary}>
        <div>
          <span>{t('advance.swiss.finalRounds', '瑞士轮轮次')}</span>
          <strong>{overview.rounds} / {overview.rounds}</strong>
        </div>
        <div>
          <span>{t('advance.swiss.finalSchedule', '瑞士轮赛程')}</span>
          <strong>{overview.completedMatches} / {overview.totalMatches}</strong>
        </div>
        <div>
          <span>{t('advance.swiss.teams', '参赛队伍')}</span>
          <strong>{overview.teamCount}</strong>
        </div>
        <div>
          <span>{t('advance.swiss.totalSlots', '最终晋级')}</span>
          <strong>{rules.totalSlots}</strong>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.swissSummary}>
      <div>
        <span>{t('advance.swiss.currentRound', '当前轮次')}</span>
        <strong>{overview.currentRound} / {overview.rounds}</strong>
      </div>
      <div>
        <span>{t('advance.swiss.roundProgress', '本轮进度')}</span>
        <strong>{overview.roundProgressLabel}</strong>
      </div>
      <div>
        <span>{t('advance.swiss.completedMatches', '已完成比赛')}</span>
        <strong>{overview.completedMatches}</strong>
      </div>
      <div>
        <span>{t('advance.swiss.nextStart', '下一开赛')}</span>
        <strong>{overview.nextStart || t('advance.common.tbd', 'TBD')}</strong>
      </div>
    </section>
  )
}
