import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import AdvanceEmptyState from './AdvanceEmptyState.jsx'
import AdvancePhaseNav from './AdvancePhaseNav.jsx'
import BracketRound from './BracketRound.jsx'
import FixedDoubleEliminationBracket from './FixedDoubleEliminationBracket.jsx'
import SingleEliminationBracket from './SingleEliminationBracket.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function roundType(round) {
  const text = `${round?.id || ''} ${round?.label || ''}`.toUpperCase()
  if (/GRAND|总决/.test(text)) return 'final'
  if (/LB|LOWER|LOSER|败者/.test(text)) return 'losers'
  if (/UB|UPPER|WINNER|胜者/.test(text)) return 'winners'
  return 'other'
}

export default function PlayoffBracket({
  bracket,
  title,
  eyebrow = 'BRACKET',
  t,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam,
  showFilter = true,
  singleElimination = false,
  locale = 'zh-CN',
  emptyTitle,
  emptyDescription
}) {
  const [filter, setFilter] = useState('all')
  const rounds = useMemo(() => bracket?.rounds || [], [bracket?.rounds])
  const filteredRounds = useMemo(() => {
    if (filter === 'all') return rounds
    return rounds.filter(round => roundType(round) === filter)
  }, [filter, rounds])
  const filters = [
    { key: 'all', label: t('advance.bracket.filter.all', uiText("全部", locale)) },
    { key: 'winners', label: t('advance.bracket.filter.winners', uiText("胜者组", locale)) },
    { key: 'losers', label: t('advance.bracket.filter.losers', uiText("败者组", locale)) },
    { key: 'final', label: t('advance.bracket.filter.final', uiText("总决赛", locale)) }
  ]

  if (bracket?.layout?.format === 'fixed_double_elimination') {
    return (
      <FixedDoubleEliminationBracket
        layout={bracket.layout}
        title={title}
        eyebrow={eyebrow}
        t={t}
        seasonId={seasonId}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      />
    )
  }

  if (!rounds.length) {
    return (
      <AdvanceEmptyState
        eyebrow={eyebrow}
        title={emptyTitle || t('advance.bracket.emptyTitle', uiText("暂无晋级图", locale))}
        description={emptyDescription || t('advance.bracket.emptyDesc', uiText("该阶段对阵尚未公布。", locale))}
      />
    )
  }

  if (singleElimination) {
    return (
      <SingleEliminationBracket
        bracket={bracket}
        title={title}
        eyebrow={eyebrow}
        locale={locale}
        t={t}
        seasonId={seasonId}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      />
    )
  }

  return (
    <section className={styles.bracketSection}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {showFilter ? (
          <AdvancePhaseNav
            items={filters}
            activeKey={filter}
            onChange={setFilter}
            ariaLabel={t('advance.bracket.filterLabel', '季后赛筛选')}
          />
        ) : null}
      </header>

      <div className={styles.bracketScrollHint}>{t('advance.bracket.scrollHint', uiText("横向滚动查看完整晋级图", locale))}</div>
      <div className={styles.bracketScroller}>
        <div className={styles.bracketCanvas}>
          {filteredRounds.map(round => (
            <BracketRound
              key={round.id}
              round={round}
              seasonId={seasonId}
              t={t}
              withSeason={withSeason}
              isFavoriteTeam={isFavoriteTeam}
              isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
