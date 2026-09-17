import { Link } from 'react-router-dom'

import styles from '../ScoutingReportPage.module.css'

function BrandLink({ to }) {
  const content = <><img src="/logos/fc_logo.svg" alt="" /><span><b>FRIES CUP</b><small>PERFORMANCE INTELLIGENCE</small></span></>
  return typeof to === 'string' && /^https?:\/\//.test(to)
    ? <a className={styles.brand} href={to} aria-label="Fries Cup">{content}</a>
    : <Link className={styles.brand} to={to} aria-label="Fries Cup">{content}</Link>
}

export function ScoutingReportHeader({ brandTo, accessLabel, accessValue, languageLabel, languages, activeLanguage, onLanguageChange }) {
  return <header className={styles.header}>
    <BrandLink to={brandTo} />
    <div className={styles.headerMeta}><span>{accessLabel}</span><b>{accessValue}</b></div>
    <nav className={styles.languageSwitch} aria-label={languageLabel}>{languages.map(language => <button type="button" key={language.value} className={activeLanguage === language.value ? styles.languageActive : ''} aria-pressed={activeLanguage === language.value} onClick={() => onLanguageChange(language.value)}>{language.label}</button>)}</nav>
  </header>
}

export function ScoutingReportHero({ eyebrow, title, titleLead, titleReport, subtitle, scopeLabel, scopeValue, scopeMeta }) {
  return <section className={styles.hero}>
    <div>
      <span className={styles.confidential}>{eyebrow}</span>
      <h1 aria-label={title}><span className={styles.heroTitleLead}>{titleLead}</span>{' '}<span className={styles.heroTitleReport}>{titleReport}</span></h1>
      <p>{subtitle}</p>
    </div>
    <aside><span>{scopeLabel}</span><strong>{scopeValue}</strong><small>{scopeMeta}</small></aside>
  </section>
}

export function ScoutingReportVersion({ items }) {
  return <div className={styles.versionStamp}>{items.map(item => <span key={item.label}><small>{item.label}</small><b>{item.value}</b></span>)}</div>
}

export function ScoutingReportAudience({ label, activeValue, activeLabel, activeHint, options, onChange }) {
  return <section className={styles.audienceMode} aria-label={label}>
    <div><span>{label}</span><strong>{activeLabel}</strong><small>{activeHint}</small></div>
    <div className={styles.audienceModeButtons}>{options.map((option, index) => <button type="button" key={String(option.value)} aria-pressed={activeValue === option.value} className={activeValue === option.value ? styles.audienceModeActive : ''} onClick={() => onChange(option.value)}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><b>{option.label}</b></button>)}</div>
  </section>
}

export function ScoutingRoleHeader({ eyebrow, title, titleId, meta, requirementLabel, requirementValue, requirementMeta }) {
  return <header className={styles.roleCockpitHeader}>
    <div><span>{eyebrow}</span><h1 id={titleId}>{title}</h1><p>{meta}</p></div>
    <div className={styles.roleCockpitRequirement}><small>{requirementLabel}</small><strong>{requirementValue}</strong><span>{requirementMeta}</span></div>
  </header>
}

export function ScoutingRoleSwitch({ label, items, activeValue, onChange }) {
  return <nav className={styles.roleCockpitRoleSwitch} aria-label={label}>{items.map((item, index) => <button type="button" key={item.value} aria-pressed={item.value === activeValue} onClick={() => onChange(item.value)}><span>{String(index + 1).padStart(2, '0')}</span><span className={styles.subroleButtonLabel}><b>{item.label}</b>{item.secondary ? <small>{item.secondary}</small> : null}</span></button>)}</nav>
}

export function ScoutingRoleLeader({ artwork, marketStatus, verdict, name, meta, score, scoreLabel, summary, stats }) {
  return <article className={styles.roleCockpitLeader} data-market-status={marketStatus}>
    {artwork}
    <div className={styles.roleCockpitLeaderIdentity}><span>{verdict}</span><strong>{name}</strong><small>{meta}</small></div>
    <div className={styles.roleCockpitFit}><strong>{score}</strong><span>{scoreLabel}</span></div>
    <p>{summary}</p>
    <div className={styles.roleCockpitLeadStats} data-density={stats.density}>{stats.items.map(item => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div>
  </article>
}

export function ScoutingRoleFocusPanel({ label, value, meta, children, footerLabel, footerText }) {
  return <aside className={styles.roleCockpitScenarios}>
    <header><span>{label}</span><strong>{value}</strong><p>{meta}</p></header>
    {children}
    <footer><span>{footerLabel}</span><p>{footerText}</p></footer>
  </aside>
}

export function ScoutingDossierSnapshot({
  color,
  titleId = 'manager-player-snapshot-title',
  eyebrow,
  title,
  badge,
  summary,
  positionLabel,
  positionValue,
  rank,
  total,
  positionMeta,
  lenses = [],
  footerItems = []
}) {
  return <section className={styles.managerPlayerSnapshot} style={{ '--slot-color': color }} aria-labelledby={titleId}>
    <header className={styles.managerPlayerSnapshotHeader}>
      <div>
        <span>{eyebrow}</span>
        <h3 id={titleId}>{title}</h3>
        <strong>{badge}</strong>
        <p>{summary}</p>
      </div>
      <aside>
        <span>{positionLabel}</span>
        <strong>{positionValue}</strong>
        <b>#{rank}<small>/ {total}</small></b>
        <p>{positionMeta}</p>
      </aside>
    </header>

    <div className={styles.managerPlayerSnapshotLenses}>
      {lenses.map((lens, index) => {
        const numericValue = Number(lens.numericValue ?? lens.value)
        const fill = Number.isFinite(numericValue) ? Math.max(3, Math.min(100, numericValue)) : 0
        return <article key={lens.id} data-level={lens.level}>
          <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{lens.label}</strong><small>{lens.meta}</small></div></header>
          <div><strong>{lens.value}<small>{lens.valueSuffix ?? '/100'}</small></strong>{lens.bandLabel ? <b>{lens.bandLabel}</b> : null}</div>
          <i aria-hidden="true"><em style={{ width: `${fill}%` }} /><span /></i>
          <footer>{lens.footer}</footer>
        </article>
      })}
    </div>

    <footer className={styles.managerPlayerSnapshotFooter}>
      {footerItems.map(item => <article key={item.id}><span>{item.label}</span>{item.content}</article>)}
    </footer>
  </section>
}
