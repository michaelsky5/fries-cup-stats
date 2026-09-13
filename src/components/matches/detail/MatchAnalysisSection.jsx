import { translateUiText as uiText } from '../../../lib/uiText.js'
import MatchPerformancePanel from './MatchPerformancePanel.jsx'
import TeamMirrorComparison from './TeamMirrorComparison.jsx'
import styles from './matchDetailStyles.js'

export default function MatchAnalysisSection({ dossier, analysisRef, withSeason, locale = 'zh-CN', t }) {
  if (!dossier.state.canShowResults || dossier.state.isForfeit) {
    return (
      <section className={styles.analysisSection} ref={analysisRef} id="match-analysis">
        <header className={styles.sectionHead}>
          <div>
            <div className={styles.sectionEyebrow}>MATCH ANALYSIS</div>
            <h2 className={styles.sectionTitle}>{t('matchDetail.analysis', 'Match Analysis')}</h2>
          </div>
        </header>
        <div className={styles.statePanel}>
          <h2 className={styles.stateTitle}>{dossier.statusLabel}</h2>
          <p className={styles.stateBody}>
            {dossier.statusNote || t('matchDetail.unavailableNotice', 'This match currently does not generate map or stat records.')}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.analysisSection} ref={analysisRef} id="match-analysis">
      <header className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>MATCH ANALYSIS</div>
          <h2 className={styles.sectionTitle}>{t('matchDetail.analysis', 'Match Analysis')}</h2>
        </div>
      </header>

      {!dossier.hasCompletePlayerStats ? (
        <p className={styles.statsNotice} role="status">
          {locale === 'en-US'
            ? `Player statistics are incomplete. Published data covers ${dossier.statsMapCount} of ${dossier.completedMaps.length} recorded maps.`
            : uiText("选手统计尚未齐全，目前有 {0} / {1} 张地图提供统计；下方仅汇总已发布数据。", locale, [dossier.statsMapCount, dossier.completedMaps.length])}
        </p>
      ) : null}

      <div className={styles.analysisFrame}>
        {dossier.statsMapCount > 0 ? <div className={styles.analysisGrid}>
          <TeamMirrorComparison comparison={dossier.comparison} t={t} />
          <MatchPerformancePanel dossier={dossier} withSeason={withSeason} locale={locale} t={t} />
        </div> : null}

        {dossier.analysisFacts?.length ? (
          <div className={styles.analysisFacts}>
            {dossier.analysisFacts.map(fact => (
              <div key={fact.key} className={styles.analysisFact} data-tone={fact.tone || 'base'}>
                <span>{fact.codeKey ? t(fact.codeKey, fact.en || fact.key) : fact.en}</span>
                <strong>{fact.labelKey ? t(fact.labelKey, fact.label || fact.key) : fact.label}</strong>
                <b>{fact.value}</b>
                {fact.detail ? <em>{fact.detail}</em> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
