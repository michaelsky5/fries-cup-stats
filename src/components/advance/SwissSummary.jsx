import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
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
  const uiLocale = useUiLocale()
  const rules = overview.rules

  if (!overview.hasStarted) {
    return (
      <section className={styles.swissPrestartPanel}>
        <div className={styles.swissFactGrid}>
          <Fact label={t('advance.swiss.teams', uiText("参赛队伍", uiLocale))} value={`${overview.teamCount} ${t('advance.unit.teams', '支队伍')}`} />
          <Fact label={t('advance.swiss.rounds', uiText("瑞士轮轮次", uiLocale))} value={`${rules.maxRounds} ${t('advance.unit.rounds', '轮')}`} />
          <Fact label={t('advance.swiss.directCondition', uiText("直通条件", uiLocale))} value={`${rules.directAdvanceWins}${t('advance.unit.wins', '胜')}`} />
          <Fact label={t('advance.swiss.breakthroughCondition', uiText("突围资格", uiLocale))} value={`${rules.lcqSurvivalWins}${t('advance.unit.wins', '胜')}+`} />
          <Fact label={t('advance.swiss.totalSlots', uiText("最终晋级", uiLocale))} value={`${rules.totalSlots} ${t('advance.unit.slots', '席')}`} />
        </div>
        <Link to={withSeason('/matches?view=list&tab=round')} className={styles.primaryAction}>
          {t('advance.swiss.viewRoundSchedule', uiText("查看本轮赛程", uiLocale))} →
        </Link>
      </section>
    )
  }

  if (overview.seasonFinished || overview.swissFinished) {
    return (
      <section className={styles.swissRuleStrip}>
        <div>
          <span>01</span>
          <strong>{t('advance.swiss.format', uiText("瑞士制", uiLocale))} · {overview.rounds} {t('advance.unit.rounds', uiText("轮", uiLocale))}</strong>
          <em>{overview.teamCount} {t('advance.unit.teams', uiText("支队伍", uiLocale))}</em>
        </div>
        <div>
          <span>02</span>
          <strong>{t('advance.swiss.directRule', uiText("直通季后赛", uiLocale))} · {rules.directAdvanceWins} {t('advance.unit.wins', uiText("胜", uiLocale))}</strong>
          <em>{rules.directSlots || 4} {t('advance.unit.slots', uiText("个名额", uiLocale))}</em>
        </div>
        <div>
          <span>03</span>
          <strong>{t('advance.swiss.lcqRule', uiText("进入突围赛", uiLocale))} · {rules.lcqSurvivalWins} {t('advance.unit.wins', uiText("胜", uiLocale))}</strong>
          <em>{rules.breakthroughSlots || 20} {t('advance.unit.slots', uiText("个名额", uiLocale))}</em>
        </div>
        <p>{t('advance.swiss.completed', uiText("瑞士轮已结束", uiLocale))} · {overview.completedMatches} / {overview.totalMatches}</p>
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
          <strong>{t('advance.swiss.format', uiText("瑞士制", uiLocale))} · {overview.rounds} {t('advance.unit.rounds', uiText("轮", uiLocale))}</strong>
          <em>{overview.teamCount} {t('advance.unit.teams', uiText("支队伍", uiLocale))} · {overview.completedMatches} / {overview.totalMatches} {t('advance.lcq.matches', uiText("场比赛", uiLocale))}</em>
        </div>
        <div>
          <span>02</span>
          <strong>{t('advance.swiss.directRule', uiText("直通季后赛", uiLocale))} · {rules.directAdvanceWins} {t('advance.unit.wins', uiText("胜", uiLocale))}</strong>
          <em>{rules.directSlots || 4} {t('advance.unit.slots', uiText("个名额", uiLocale))}</em>
        </div>
        <div>
          <span>03</span>
          <strong>{t('advance.swiss.lcqRule', uiText("进入突围赛", uiLocale))} · {rules.lcqSurvivalWins} {t('advance.unit.wins', uiText("胜", uiLocale))}</strong>
          <em>{rules.breakthroughSlots || 20} {t('advance.unit.slots', uiText("个名额", uiLocale))}</em>
        </div>
        <p>{t('advance.swiss.roundShort', uiText("第 {0} / {1} 轮", uiLocale, [overview.currentRound, overview.rounds]), { current: overview.currentRound, total: overview.rounds })} · {overview.roundProgressLabel}</p>
      </section>
      <p className={styles.swissNextMatchStrip}>
        <span>{t('advance.swiss.nextMatch', uiText("最后一场", uiLocale))}</span>
        <strong>{nextMatchLabel}</strong>
        <em>{t('advance.swiss.seedLockNotice', uiText("比赛结束后将自动锁定全部突围赛与季后赛种子", uiLocale))}</em>
      </p>
    </>
  )
}
