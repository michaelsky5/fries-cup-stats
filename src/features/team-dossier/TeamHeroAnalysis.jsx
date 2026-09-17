import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef } from 'react'
import { PerformanceEvidence, HeroPortrait, roleLabel } from './TeamPerformancePrimitives.jsx'
import { getHeroReview } from './teamHeroReview.js'
import TeamHeroControls from './TeamHeroControls.jsx'
import TeamHeroReview from './TeamHeroReview.jsx'
import TeamLineupReadings from './TeamLineupReadings.jsx'
import TeamBanReadings from './TeamBanReadings.jsx'
import base from './TeamPerformance.module.css'
import styles from './TeamHeroAnalysis.module.css'

export default function TeamHeroAnalysis({ report, ...context }) {
  const { en, locale, params, updateQuery, opened } = context
  const mapUnit = count => en ? (count === 1 ? 'map' : 'maps') : uiText("图", locale)
  const heroKey = params.get('performanceHero')
  const memberId = params.get('member') || params.get('performanceMember')
  const sample = params.get('heroSample')
  const review = useMemo(() => getHeroReview(report, { heroKey, memberId, sample }, locale), [report, heroKey, memberId, sample, locale])
  const { hero: selectedHero, member, heroes } = review
  const focusRequested = useRef(false)
  const selectedKey = selectedHero?.key
  useEffect(() => {
    if (!focusRequested.current) return
    focusRequested.current = false
    const target = document.getElementById(selectedKey ? 'performance-hero-evidence' : 'hero-review-controls')
    target?.focus({ preventScroll: true })
    document.getElementById('hero-review-controls')?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [selectedKey, sample])
  const selectHero = (key, nextSample = 'recorded') => {
    if (selectedKey === key && review.sample === nextSample) {
      const target = document.getElementById('performance-hero-evidence')
      target?.focus({ preventScroll: true })
      document.getElementById('hero-review-controls')?.scrollIntoView({ block: 'start', behavior: 'instant' })
      return
    }
    focusRequested.current = true
    updateQuery({ performanceHero: key, heroSample: nextSample === 'recorded' ? null : nextSample, teamEvidence: opened.filter(id => id !== 'hero-picker').join(',') })
  }
  const heroButton = (hero, index, directory = false) => <button type="button" key={hero.key} className={styles.heroRow}
    aria-label={en ? `Review ${hero.label}, ${hero.maps} ${mapUnit(hero.maps)}` : uiText("复盘{0}，{1}图", locale, [hero.label, hero.maps])}
    aria-pressed={selectedKey === hero.key}
    onClick={() => selectHero(selectedKey === hero.key ? null : hero.key)}>
    {!directory ? <span className={styles.rank} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span> : null}
    <HeroPortrait hero={hero.hero} />
    <span className={styles.heroName}><b>{hero.label}</b>{!directory ? <span className={styles.frequencyTrack} aria-hidden="true"><i style={{ width: `${review.base.records.length ? hero.maps / review.base.records.length * 100 : 0}%` }} /></span> : null}</span>
    <span className={styles.heroValue}><strong>{hero.maps}<small>{mapUnit(hero.maps)}</small></strong><span>{selectedKey === hero.key ? (en ? 'Selected −' : uiText("已选 −", locale)) : (en ? 'Review ↗' : uiText("复盘 ↗", locale))}</span></span>
  </button>
  const grid = all => <div className={styles.heroGrid} data-member={Boolean(member)}>{['TANK', 'DPS', 'SUP'].filter(role => !member || heroes.some(hero => hero.role === role)).map(role => {
    const choices = heroes.filter(hero => hero.role === role)
    return <div key={role} className={styles.roleColumn}>
      <header><b>{roleLabel(role, en, locale)}</b><span>{choices.length} {en ? 'heroes' : uiText("位英雄", locale)}</span></header>
      {(all ? choices : choices.slice(0, 5)).map((hero, index) => heroButton(hero, index))}
      {!choices.length ? <p className={styles.roleEmpty}>{en ? 'No hero records in this role.' : uiText("当前职责暂无英雄记录。", locale)}</p> : null}
    </div>
  })}</div>
  const sampleLabel = review.sample === 'recorded' ? (en ? 'Hero recorded' : uiText("英雄有记录", locale)) : review.sample === 'opponent' ? (en ? 'Opponent banned' : uiText("对手禁用", locale)) : (en ? 'Team banned' : uiText("本队禁用", locale))
  const scopeLabel = selectedHero ? `${selectedHero.label} · ${sampleLabel}${member ? ` · ${member.name}` : ''}` : member ? (en ? `${member.name} · appearance maps` : uiText("{0} · 出场地图", locale, [member.name])) : (en ? 'All players · current stage' : uiText("全部成员 · 当前赛段", locale))
  const relatedContext = { ...context, highlightHero: selectedKey, memberId: member?.id, playerNames: Object.fromEntries(report.members.map(player => [player.id, player.name])) }

  return <section id="performance-heroes" className={`${base.section} ${styles.heroSection}`}>
    <h2 className={styles.srOnly}>{en ? 'Heroes & lineups' : uiText("英雄与阵容", locale)}</h2>
    <TeamHeroControls report={report} review={review} selectHero={selectHero} {...context} />
    {!selectedHero ? <section className={styles.heroIndex} aria-labelledby="hero-records-title">
      <header className={styles.indexHeading}><div><span className={styles.eyebrow}>01 / HERO RECORDS</span><h3 id="hero-records-title">{en ? 'Heroes on record' : uiText("英雄记录", locale)}</h3></div><p>{scopeLabel}<span>{en ? 'Compare within each role' : uiText("按职责，找到主要选择", locale)}</span></p></header>
      {heroes.length ? grid(false) : <p className={styles.empty}>{en ? 'No identifiable hero records in this selection.' : uiText("当前选择下暂无可识别的英雄记录。", locale)}</p>}
      {heroes.length ? <p className={styles.recordNote}>{en ? `Final hero records, not playtime or starting picks. Bars share the same ${review.base.records.length}-map scale.` : uiText("仅为最终英雄记录，不代表使用时长或首发；横条统一以当前 {0} 张地图为尺度。", locale, [review.base.records.length])}</p> : null}
      {heroes.length > 5 ? <PerformanceEvidence id="hero-directory" title={en ? `Browse all ${heroes.length} recorded heroes` : uiText("查看全部 {0} 位有记录的英雄", locale, [heroes.length])} {...context}>
        <div className={styles.heroDirectory}>{heroes.map((hero, index) => heroButton(hero, index, true))}</div>
      </PerformanceEvidence> : null}
    </section> : null}
    {selectedHero ? <TeamHeroReview review={review} scopeLabel={scopeLabel} {...relatedContext} /> : null}
    <TeamLineupReadings report={review.report} scopeLabel={scopeLabel} {...relatedContext} />
    <TeamBanReadings report={review.report} scopeLabel={scopeLabel} onReviewHero={selectHero} {...relatedContext} />
  </section>
}
