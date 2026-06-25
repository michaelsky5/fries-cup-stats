import AdvancePendingState from './AdvancePendingState.jsx'
import PlayoffBracket from './PlayoffBracket.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function BreakthroughPhasePanel({
  state,
  t,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  if (state.status === 'pending_rules') {
    return (
      <AdvancePendingState
        eyebrow="BREAKTHROUGH"
        title={t('advance.breakthrough.pendingTitle', '突围赛规则待确认')}
        description={t('advance.breakthrough.pendingDesc', '瑞士轮结束后，赛事组将根据最终晋级情况公布突围赛赛制与对阵。')}
        items={[
          t('advance.breakthrough.pendingFormat', '赛制'),
          t('advance.breakthrough.pendingBracket', '对阵'),
          t('advance.breakthrough.pendingSlots', '晋级名额'),
          t('advance.breakthrough.pendingSchedule', '比赛时间')
        ]}
      />
    )
  }

  return (
    <div className={styles.phaseStack}>
      <PlayoffBracket
        bracket={state.bracket}
        eyebrow="BREAKTHROUGH"
        title={t('advance.breakthrough.title', '突围赛晋级图')}
        t={t}
        seasonId={seasonId}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
        showFilter={false}
      />
    </div>
  )
}
