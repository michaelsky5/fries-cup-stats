import TeamLogo from '../matches/TeamLogo.jsx'
import { teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function SummaryItem({ label, value, accent = false }) {
  return (
    <div className={`${styles.headerMetric} ${accent ? styles.headerMetricAccent : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

export default function AdvanceHeader({ seasonId, summary, result, t }) {
  const isArchive = summary?.phaseState?.seasonFinished
  const champion = summary?.champion
  const completedChampionMatches = (result?.championPath || []).filter(match => match.status === 'completed')
  const championWins = completedChampionMatches.filter(match => match.won).length
  const championLosses = completedChampionMatches.length - championWins
  const championRecord = completedChampionMatches.length
    ? `${championWins} ${t('advance.summary.wins', '胜')} · ${championLosses} ${t('advance.summary.losses', '负')}`
    : '-'

  return (
    <section className={styles.advanceHeader}>
      <div className={styles.headerCopy}>
        <span className={styles.headerKicker}>ADVANCE</span>
        <h1>{t('advance.title', '晋级形势')}</h1>
        <p>
          {isArchive
            ? t('advance.header.archiveDesc', '查看最终排名、完整季后赛路径与冠军晋级历程。')
            : t('advance.header.currentDesc', '查看公开预选赛、瑞士轮积分、突围赛对阵与季后赛晋级路径。')}
        </p>
      </div>

      <aside className={styles.headerStatus}>
        {isArchive ? (
          <>
            <SummaryItem label={t('advance.summary.eventStatus', '赛事状态')} value={t('advance.summary.finished', '赛季已结束')} />
            <div className={styles.headerChampion}>
              <span>{t('advance.summary.champion', '冠军')}</span>
              <div>
                <TeamLogo team={champion} seasonId={seasonId} className={styles.headerChampionLogo} />
                <strong>{teamShort(champion)}</strong>
              </div>
            </div>
            <SummaryItem label={t('advance.summary.grandFinal', '总决赛')} value={summary?.grandFinalScore} />
            <SummaryItem
              label={t('advance.summary.championRecord', '夺冠战绩')}
              value={championRecord}
              accent
            />
          </>
        ) : (
          <>
            <SummaryItem label={t('advance.summary.currentPhase', '当前阶段')} value={t(`advance.phase.${summary?.phase}`, summary?.phase)} />
            <SummaryItem label={t('advance.summary.currentRound', '当前轮次')} value={summary?.roundLabel ? `${t('advance.swiss.roundPrefix', '瑞士轮第')} ${summary.roundLabel}` : '-'} />
            <SummaryItem label={t('advance.summary.roundProgress', '本轮进度')} value={summary?.roundProgressLabel} />
            <SummaryItem label={t('advance.summary.nextPhase', '下一阶段')} value={summary?.nextPhase ? t(`advance.phase.${summary.nextPhase}`, summary.nextPhase) : '-'} />
          </>
        )}
      </aside>
    </section>
  )
}
