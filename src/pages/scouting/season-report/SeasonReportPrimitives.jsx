import { useState } from 'react'
import { getOwHero } from '../../../lib/heroes.js'
import { getHeroArtwork } from '../../../lib/heroArtwork.js'
import report from '../ScoutingReportPage.module.css'
import {
  ScoutingReportAudience,
  ScoutingReportHeader,
  ScoutingReportHero,
  ScoutingReportVersion
} from '../shared/ScoutingReportChrome.jsx'
import styles from './SeasonReport.module.css'

export function createSeasonReportPrimitives(adapter) {
  const { COMPARISON_FOCUSES, LANGUAGES, reportVersion, previewLink, textFor } = adapter

  function ReportHeader({ navigation, onLanguageChange }) {
    const { lang } = navigation
    return <ScoutingReportHeader
      brandTo={previewLink(navigation)}
      accessLabel={textFor(lang, 'reportAccess')}
      accessValue={`${adapter.seasonId} · ${textFor(lang, 'preview')}`}
      languageLabel={textFor(lang, 'language')}
      languages={LANGUAGES.map(language => ({ value: language, label: language.toUpperCase() }))}
      activeLanguage={lang}
      onLanguageChange={onLanguageChange}
    />
  }

  function ReportVersion({ lang }) {
    return <ScoutingReportVersion items={[
      { label: textFor(lang, 'reportVersion'), value: textFor(lang, 'reportVersionValue', { version: reportVersion }) },
      { label: textFor(lang, 'dataAsOf'), value: adapter.dataAsOf || '2026.08.31 · V30' }
    ]} />
  }

  function ReportAudience({ lang, detail, onChange }) {
    return <ScoutingReportAudience
      label={textFor(lang, 'readingDepth')}
      activeValue={detail}
      activeLabel={textFor(lang, detail ? 'analysis' : 'conclusion')}
      activeHint={textFor(lang, detail ? 'coachHint' : 'managerHint')}
      options={[false, true].map(value => ({ value, label: textFor(lang, value ? 'analysis' : 'conclusion') }))}
      onChange={onChange}
    />
  }

  function ReportHero({ lang }) {
    const titleLead = textFor(lang, 'event')
    const titleReport = textFor(lang, 'report')
    return <ScoutingReportHero
      eyebrow="CONFIDENTIAL · TECHNICAL ANALYSIS"
      title={`${titleLead} ${titleReport}`}
      titleLead={titleLead}
      titleReport={titleReport}
      subtitle={textFor(lang, 'intro')}
      scopeLabel={textFor(lang, 'snapshotLabel')}
      scopeValue={textFor(lang, 'snapshotValue')}
      scopeMeta={`${adapter.seasonId} · ROLE-RELATIVE`}
    />
  }

  function EvidenceFocusSwitch({ lang, focus, onChange, className = report.commandScenarioSwitch }) {
    return <div className={className} role="group" aria-label={textFor(lang, 'compareFocus')}>{COMPARISON_FOCUSES.map((key, index) => <button type="button" key={key} aria-pressed={focus === key} className={focus === key ? report.commandScenarioActive : ''} onClick={() => onChange(key)}><span aria-hidden="true">0{index + 1}</span><strong>{textFor(lang, `focus_${key}`)}</strong></button>)}</div>
  }

  function ReportArtwork({ player, className, loading = 'lazy' }) {
    const hero = getOwHero(player.heroes[0]?.hero)
    const [failed, setFailed] = useState([])
    const original = hero ? `/review/hero-renders/${hero.role}/${hero.assetKey.replace(/_/g, '-')}.png` : ''
    const fallback = getHeroArtwork(player.heroes[0]?.hero, 'spotlight')?.src
    const src = [original, fallback].find(value => value && !failed.includes(value))
    return src ? <img className={className} src={src} alt="" aria-hidden="true" loading={loading} decoding="async" onError={() => setFailed(previous => [...previous, src])} /> : null
  }

  function ReportDisclosure({ id, title, meta, kicker = 'TECHNICAL EVIDENCE', open, className = '', children }) {
    return <details id={id} className={`${report.coachAuditDisclosure} ${styles.disclosure} ${className}`} open={open}>
      <summary><span>{kicker}</span><div><strong>{title}</strong>{meta ? <small>{meta}</small> : null}</div><b aria-hidden="true">＋</b></summary>
      <div className={styles.disclosureBody}>{children}</div>
    </details>
  }

  function ReportSectionHeading({ title, meta, eyebrow }) {
    return <div className={report.sectionHeading}><div>{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2>{meta ? <p>{meta}</p> : null}</div></div>
  }

  return { ReportHeader, ReportVersion, ReportAudience, ReportHero, EvidenceFocusSwitch, ReportArtwork, ReportDisclosure, ReportSectionHeading }
}
