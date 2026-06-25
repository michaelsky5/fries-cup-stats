import { useMemo, useState } from 'react'
import AdvanceEmptyState from './AdvanceEmptyState.jsx'
import AdvancePhaseNav from './AdvancePhaseNav.jsx'
import BracketRound from './BracketRound.jsx'
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
  showFilter = true
}) {
  const [filter, setFilter] = useState('all')
  const rounds = bracket?.rounds || []
  const filteredRounds = useMemo(() => {
    if (filter === 'all') return rounds
    return rounds.filter(round => roundType(round) === filter)
  }, [filter, rounds])
  const filters = [
    { key: 'all', label: t('advance.bracket.filter.all', '全部') },
    { key: 'winners', label: t('advance.bracket.filter.winners', '胜者组') },
    { key: 'losers', label: t('advance.bracket.filter.losers', '败者组') },
    { key: 'final', label: t('advance.bracket.filter.final', '总决赛') }
  ]

  if (!rounds.length) {
    return (
      <AdvanceEmptyState
        eyebrow={eyebrow}
        title={t('advance.bracket.emptyTitle', '暂无晋级图')}
        description={t('advance.bracket.emptyDesc', '该阶段对阵尚未公布。')}
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

      <div className={styles.bracketScrollHint}>{t('advance.bracket.scrollHint', '横向滚动查看完整晋级图')}</div>
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
