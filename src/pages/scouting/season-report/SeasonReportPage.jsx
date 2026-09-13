import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import report from '../ScoutingReportPage.module.css'
import styles from './SeasonReport.module.css'

import { createSeasonReportEvidence } from './SeasonReportEvidence.jsx'
import { createSeasonReportDecisionBoard } from './SeasonReportDecisionBoard.jsx'
import { createSeasonReportPrimitives } from './SeasonReportPrimitives.jsx'
import { ScoutingDossierSnapshot, ScoutingRoleFocusPanel, ScoutingRoleHeader, ScoutingRoleLeader, ScoutingRoleSwitch } from '../shared/ScoutingReportChrome.jsx'

const MANAGER_POSITION_SECTIONS = [
  ['role-cockpit', 'roleBrief'],
  ['position-comparison', 'compareShort'],
  ['role-ranking', 'rankPressure']
]
const COACH_POSITION_SECTIONS = [
  ['role-cockpit', 'selectionDecision'],
  ['position-comparison', 'deploymentFit'],
  ['candidate-dossiers', 'evidenceCheck'],
  ['role-method', 'methodShort']
]
const MANAGER_POSITION_SECTION_IDS = MANAGER_POSITION_SECTIONS.map(([id]) => id)
const COACH_POSITION_SECTION_IDS = COACH_POSITION_SECTIONS.map(([id]) => id)

export function createSeasonReportPage(adapter) {
  const { data, PLAYER_COPY, POSITION_COPY, localize, textFor, formatNumber, getBoundaryPlayers, getComparisonFocus, getLanguage, getMetricReference, getOverviewFocusValue, getPositionPlayers, POSITION_CONFIG, POSITIONS, previewLink } = adapter
  const { ContextEvidence, HeroIcon, HeroMapEvidence, HeroRecords, MatchEvidence, Methodology, ModelEvidence, PlayerRadar, StabilityEvidence, StageStatus } = createSeasonReportEvidence(adapter)
  const { EvidenceFocusSwitch, ReportArtwork, ReportAudience, ReportDisclosure, ReportHeader, ReportHero, ReportSectionHeading, ReportVersion } = createSeasonReportPrimitives(adapter)
  const SeasonReportDecisionBoard = createSeasonReportDecisionBoard(adapter)

  function useReportMetadata(lang, name) {
    useEffect(() => {
      const previousTitle = document.title
      const previousLang = document.documentElement.lang
      document.title = (name ? name + ' · ' : '') + textFor(lang, 'event') + ' · ' + textFor(lang, 'report')
      document.documentElement.lang = { zh: 'zh-CN', en: 'en-US', ko: 'ko-KR' }[lang]
      const previousMeta = ['robots', 'referrer'].map(key => {
        const existing = document.head.querySelector('meta[name="' + key + '"]')
        const element = existing || document.createElement('meta')
        const previous = element.getAttribute('content')
        element.name = key
        element.content = key === 'robots' ? 'noindex,nofollow,noarchive' : 'no-referrer'
        if (!existing) document.head.append(element)
        return { element, existing, previous }
      })
      return () => {
        document.title = previousTitle
        document.documentElement.lang = previousLang
        previousMeta.forEach(({ element, existing, previous }) => {
          if (!existing) element.remove()
          else if (previous === null) element.removeAttribute('content')
          else element.content = previous
        })
      }
    }, [lang, name])
  }

  function useActivePositionSection(enabled, hash, positionKey, sectionIds) {
    const hashId = hash ? decodeURIComponent(hash.replace(/^#/, '')) : ''
    const [activeSection, setActiveSection] = useState(sectionIds.includes(hashId) ? hashId : sectionIds[0])

    useEffect(() => {
      if (!enabled) return undefined
      let frame = 0
      const update = () => {
        frame = 0
        const stickyHeight = document.querySelector(`.${report.roleWorkspaceNav}`)?.getBoundingClientRect().height || 0
        const threshold = stickyHeight + 24
        let nextSection = sectionIds.includes(hashId) ? hashId : sectionIds[0]
        for (const id of sectionIds) {
          const section = document.getElementById(id)
          if (!section) continue
          const scrollMarginTop = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0
          if (section.getBoundingClientRect().top <= Math.max(threshold, scrollMarginTop) + 1) nextSection = id
          else break
        }
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12) nextSection = sectionIds.at(-1)
        setActiveSection(current => current === nextSection ? current : nextSection)
      }
      const scheduleUpdate = () => {
        if (frame) return
        frame = window.requestAnimationFrame(update)
      }
      scheduleUpdate()
      window.addEventListener('scroll', scheduleUpdate, { passive: true })
      window.addEventListener('resize', scheduleUpdate)
      return () => {
        if (frame) window.cancelAnimationFrame(frame)
        window.removeEventListener('scroll', scheduleUpdate)
        window.removeEventListener('resize', scheduleUpdate)
      }
    }, [enabled, hashId, positionKey, sectionIds])

    return activeSection
  }

  function useResetOnDepthChange(detail, targetId) {
    const previousDetail = useRef(detail)
    useEffect(() => {
      if (previousDetail.current === detail) return undefined
      previousDetail.current = detail
      let frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          const target = document.getElementById(targetId)
          target?.scrollIntoView({ block: 'start', behavior: 'instant' })
          target?.focus({ preventScroll: true })
        })
      })
      return () => window.cancelAnimationFrame(frame)
    }, [detail, targetId])
  }

  function ReviewBadge({ player, lang }) {
    const stable = player.review.retained === player.review.total
    return <span className={styles.reviewBadge} data-stable={stable}>{textFor(lang, stable ? 'steady' : 'sensitive')}</span>
  }

  function AudienceButtons({ lang, detail, onChange, className }) {
    return <div className={className} role="group" aria-label={textFor(lang, 'readingDepth')}>{[false, true].map(value => <button type="button" key={String(value)} aria-pressed={detail === value} data-active={String(detail === value)} onClick={() => onChange(value)}>{textFor(lang, value ? 'analysis' : 'conclusion')}</button>)}</div>
  }

  function Overview({ navigation, onDepthChange, onQueryChange }) {
    const { lang, detail, focus } = navigation
    return <>
      <ReportHero lang={lang} />
      <div className={report.reportControlRail}><ReportVersion lang={lang} /><ReportAudience lang={lang} detail={detail} onChange={onDepthChange} /></div>
      <section className={report.reportStats}>{[['dossierCount', data.counts.dossiers], ['positionsCount', 5], ['referencePlayers', data.counts.references], ['realMaps', data.counts.realMaps]].map(([key, value]) => <div key={key}><span>{textFor(lang, key)}</span><strong>{value}</strong></div>)}</section>
      <section className={report.executiveCommand}>
        <div className={report.commandHeader}>
          <div><span>00 · POSITION SCOUTING OVERVIEW</span><h2>{textFor(lang, 'overviewTitle')}</h2><p>{textFor(lang, 'overviewSubtitle')}</p></div>
          <div className={report.commandScenarioLabel}><small>{textFor(lang, 'compareFocus')}</small><strong>{textFor(lang, 'focus_' + focus)}</strong><span>{textFor(lang, 'focusNoReweight')}</span></div>
        </div>
        <EvidenceFocusSwitch lang={lang} focus={focus} onChange={key => onQueryChange('focus', key === 'overall' ? null : key)} />
        <div className={report.marketGrid}>{POSITIONS.map((position, index) => {
          const players = getPositionPlayers(data, position)
          const leader = players[0]
          const positionHref = previewLink({ ...navigation, position, compare: undefined })
          return <article key={position} className={report.marketCard} style={{ '--slot-color': POSITION_CONFIG[position].color }}>
            <Link className={report.marketCardMain} to={positionHref} aria-label={`${localize(POSITION_COPY[position].name, lang)} · ${leader.name}`}>
              <header className={report.marketCardHeader}><span>{'0' + (index + 1)} · {localize(POSITION_COPY[position].name, lang)}</span><b>{textFor(lang, 'poolBadge', { n: leader.poolSize })}</b></header>
              <div className={report.marketLeaderVisual}>
                <ReportArtwork player={leader} className={report.marketHeroArtwork} />
                <span><small>{textFor(lang, 'leaderLabel')}</small><strong>{leader.name}</strong><em>{leader.team}</em></span>
                <b><strong>{formatNumber(leader.score, lang)}</strong><small>{textFor(lang, 'technicalIndex')}</small></b>
              </div>
              <div className={report.marketHeadGap} data-density="manager">
                <span><small>{textFor(lang, 'runnerUp')}</small><strong>{players[1].name}</strong></span>
                <span><small>{textFor(lang, 'leadGap')}</small><strong>+{formatNumber(leader.score - players[1].score, lang)}</strong></span>
                <span><small>{textFor(lang, 'stageLabel')}</small><strong>{textFor(lang, 'maps', { n: leader.stage.playoff.maps })}</strong></span>
              </div>
              <div className={report.marketCandidateBars}>{players.map(player => {
                const value = getOverviewFocusValue(player, focus)
                return <span key={player.id}><small>{String(player.rank).padStart(2, '0')}</small><b>{player.name}</b><i aria-hidden="true"><em style={{ width: (value ?? 0) + '%' }} /></i><strong>{value === null ? '—' : formatNumber(value, lang)}</strong></span>
              })}</div>
              <p className={styles.marketMetricCaption}>{textFor(lang, 'overviewBar_' + focus)}</p>
              <div className={report.marketStress} data-density="manager" data-stress-status={leader.review.retained === leader.review.total ? 'STABLE' : 'SENSITIVE'}><span><small>{textFor(lang, 'leaderRetained')}</small><strong>{textFor(lang, 'retainedCount', { n: leader.review.retained, total: leader.review.total })}</strong></span></div>
            </Link>
            <footer className={report.marketCardFooter}><Link to={positionHref}>{textFor(lang, 'positionCta', { role: localize(POSITION_COPY[position].name, lang) })} →</Link><Link to={previewLink({ ...navigation, playerId: leader.id })}>{textFor(lang, 'profile')} ↗</Link></footer>
          </article>
        })}</div>
        <footer className={report.commandCaution}><span>{textFor(lang, 'selectionNote')}</span><p>{textFor(lang, 'gapCaution')}</p></footer>
      </section>
      <section className={styles.readingNotes}>
        <ReportSectionHeading title={textFor(lang, 'summaryThreeTitle')} />
        <div className={report.managerDecisionColumns}>{['stableSummary', 'evidenceSummary', 'supportSummary'].map((key, index) => <article key={key}><header><span>{'0' + (index + 1)}</span><strong>{textFor(lang, ['leaderRetained', 'stageLabel', 'positionRecord'][index])}</strong></header><p>{textFor(lang, key)}</p></article>)}</div>
      </section>
      <Methodology data={data} lang={lang} />
    </>
  }

  function CandidateCard({ player, navigation }) {
    const { lang } = navigation
    const notes = PLAYER_COPY[player.id]
    return <article className={report.profileCard + ' ' + styles.candidateCard} data-player-card={player.id}>
      <header><span className={styles.rank}>{String(player.rank).padStart(2, '0')}</span><HeroIcon name={player.heroes[0].hero} size={48} /><div className={styles.playerIdentity}><h3><Link to={previewLink({ ...navigation, playerId: player.id })}>{player.name}</Link></h3><span>{player.team}</span></div><div className={styles.cardScore}><span>{textFor(lang, 'technicalIndex')}</span><strong>{formatNumber(player.score, lang)}</strong></div></header>
      <ReviewBadge player={player} lang={lang} />
      <p className={styles.cardLead}>{localize(notes.lead, lang)}</p>
      <HeroRecords player={player} lang={lang} compact />
      <dl className={styles.cardNotes}><div><dt>{textFor(lang, 'advantage')}</dt><dd>{localize(notes.strength, lang)}</dd></div><div><dt>{textFor(lang, 'watch')}</dt><dd>{localize(notes.watch, lang)}</dd></div></dl>
      <div className={styles.cardStage}><span>{textFor(lang, 'stageLabel')} · {textFor(lang, 'series', { n: player.stage.playoff.matches })} / {textFor(lang, 'maps', { n: player.stage.playoff.maps })}</span><StageStatus player={player} lang={lang} /></div>
      {player.scope.maps > player.analyzed.maps ? <p className={styles.fine}>{textFor(lang, 'shortMapNote', { n: player.scope.maps - player.analyzed.maps })}</p> : null}
      <footer><span>{textFor(lang, 'appearance')} {textFor(lang, 'maps', { n: player.scope.maps })} · {textFor(lang, 'series', { n: player.scope.matches })}</span><Link to={previewLink({ ...navigation, playerId: player.id })}>{textFor(lang, 'profile')} ↗</Link></footer>
    </article>
  }

  function BoundaryComparison({ position, navigation }) {
    const { lang, detail } = navigation
    return <ReportDisclosure id="role-ranking" title={textFor(lang, 'boundaryTitle')} meta={localize(POSITION_COPY[position].boundary, lang)} kicker="SHORTLIST BOUNDARY" open={detail}>
      <div className={styles.boundaryGrid}>{getBoundaryPlayers(data, position).map(player => <article key={player.id}>
        <div><h3>{player.name}</h3><span>{player.team} · {textFor(lang, player.selected ? 'currentShortlist' : 'referenceOnly')}</span></div>
        <strong>{formatNumber(player.score, lang)}<small>{textFor(lang, 'technicalIndex')}</small></strong>
        <p>{textFor(lang, 'retainedCount', { n: player.review.retained, total: player.review.total })}{player.review.ties ? ' · ' + textFor(lang, 'tieCount', { n: player.review.ties }) : ''}</p>
        <HeroRecords player={player} lang={lang} compact />
        {player.selected ? <Link className={styles.textLink} to={previewLink({ ...navigation, playerId: player.id })}>{textFor(lang, 'profile')} ↗</Link> : null}
      </article>)}</div>
      <p className={styles.fine}>{textFor(lang, 'retentionMeaning')}</p><p className={styles.fine}>{textFor(lang, 'noAutomatic')}</p>
    </ReportDisclosure>
  }

  function CandidateStrip({ players, navigation }) {
    const { lang, detail } = navigation
    return <div className={report.roleCockpitCandidates + ' ' + styles.fourCandidates} data-audience={detail ? 'coach' : 'manager'}>
      <header><span>{textFor(lang, 'orderFixed')}</span><small>{textFor(lang, 'poolCaption', { total: players[0].poolSize })}</small></header>
      <div>{players.map(player => {
        const metrics = POSITION_CONFIG[player.position].metrics.map(key => ({ key, ...getMetricReference(data, player, key) })).sort((a, b) => b.percentile - a.percentile)
        return <Link key={player.id} to={previewLink({ ...navigation, playerId: player.id })}>
          <span className={report.roleCockpitCandidateRank}>{String(player.rank).padStart(2, '0')}</span><HeroIcon name={player.heroes[0].hero} size={42} />
          <div className={report.roleCockpitCandidateIdentity}><strong>{player.name}</strong><small>{player.team}</small></div>
          <b className={report.roleCockpitCandidateFit}><small>{textFor(lang, 'technicalIndex')}</small>{formatNumber(player.score, lang)}<em>{textFor(lang, 'poolRankPlain', { rank: player.rank, total: player.poolSize })}</em></b>
          {detail ? <div className={report.roleCockpitCandidateAxes}>{['profileFloor', 'consistency', 'versatility'].map(key => <span key={key}><small>{textFor(lang, 'factor_' + key)}</small><i aria-hidden="true"><em style={{ width: player.factors[key] + '%' }} /></i><b>{formatNumber(player.factors[key], lang, 0)}</b></span>)}</div> : <div className={report.roleCockpitCandidateRead}>{[metrics[0], metrics.at(-1)].map((metric, index) => <span key={metric.key}><small>{textFor(lang, index ? 'watch' : 'advantage')}</small><b>{textFor(lang, 'metric_' + metric.key)} · {textFor(lang, 'rankOf', { rank: metric.rank, total: metric.total })}</b></span>)}</div>}
          <footer><span>{textFor(lang, 'maps', { n: player.scope.maps })} · {textFor(lang, 'series', { n: player.scope.matches })}</span><b>{textFor(lang, 'profile')} ↗</b></footer>
        </Link>
      })}</div>
    </div>
  }

  function PositionPage({ position, navigation, onDepthChange, onQueryChange, onRoleChange }) {
    const { lang, detail, focus } = navigation
    const players = getPositionPlayers(data, position)
    const copy = POSITION_COPY[position]
    const leader = players[0]
    const sectionItems = detail ? COACH_POSITION_SECTIONS : MANAGER_POSITION_SECTIONS
    const sectionIds = detail ? COACH_POSITION_SECTION_IDS : MANAGER_POSITION_SECTION_IDS
    const activeSection = useActivePositionSection(true, navigation.hash, position, sectionIds)
    useResetOnDepthChange(detail, 'role-cockpit')
    useEffect(() => {
      const id = navigation.hash ? decodeURIComponent(navigation.hash.replace(/^#/, '')) : ''
      if (![...MANAGER_POSITION_SECTION_IDS, ...COACH_POSITION_SECTION_IDS].includes(id)) return undefined
      const section = document.getElementById(id)
      if (section?.tagName === 'DETAILS') section.open = true
      let timeout = 0
      const frame = window.requestAnimationFrame(() => {
        timeout = window.setTimeout(() => {
          if (!section) return
          const stickyHeight = document.querySelector(`.${report.roleWorkspaceNav}`)?.getBoundingClientRect().height || 0
          const scrollMarginTop = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0
          const top = window.scrollY + section.getBoundingClientRect().top - Math.max(stickyHeight + 24, scrollMarginTop)
          window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
        }, 160)
      })
      return () => {
        window.cancelAnimationFrame(frame)
        if (timeout) window.clearTimeout(timeout)
      }
    }, [detail, navigation.hash, position])
    const changeFocus = key => onQueryChange('focus', key === 'overall' ? null : key)
    const openSection = (event, id) => {
      event.preventDefault()
      const section = document.getElementById(id)
      if (section?.tagName === 'DETAILS') section.open = true
      const positionSection = () => {
        if (!section) return
        const stickyHeight = document.querySelector(`.${report.roleWorkspaceNav}`)?.getBoundingClientRect().height || 0
        const scrollMarginTop = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0
        const top = window.scrollY + section.getBoundingClientRect().top - Math.max(stickyHeight + 24, scrollMarginTop)
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
      }
      window.requestAnimationFrame(() => {
        positionSection()
        window.setTimeout(positionSection, 80)
      })
    }
    return <>
      <aside className={report.roleWorkspaceNav} data-audience={detail ? 'coach' : 'manager'}>
        <div className={report.roleWorkspacePrimary}>
          <Link className={report.roleWorkspaceBack} to={previewLink(navigation)}>← {textFor(lang, 'overview')}</Link>
          <div className={report.roleWorkspaceIdentity}><span>{textFor(lang, 'roleBrief')}</span><strong>{localize(copy.name, lang)}</strong><small>{textFor(lang, 'focus_' + focus)}</small></div>
          <AudienceButtons lang={lang} detail={detail} onChange={onDepthChange} className={report.roleWorkspaceAudience} />
        </div>
        <nav className={report.roleWorkspaceTasks} style={{ '--task-count': sectionItems.length }} aria-label={textFor(lang, 'roleBrief')}>{sectionItems.map(([id, key], index) => <a href={'#' + id} key={id} data-section-id={id} className={activeSection === id ? report.roleWorkspaceTaskActive : ''} aria-current={activeSection === id ? 'location' : undefined} onClick={event => openSection(event, id)}><span>{'0' + (index + 1)}</span>{textFor(lang, key)}</a>)}</nav>
      </aside>
      <section id="role-cockpit" className={report.roleCockpit} aria-labelledby="role-cockpit-title" tabIndex={-1}>
        <ScoutingRoleHeader
          eyebrow={`00 · ${localize(copy.name, 'en').toUpperCase()} SCOUTING BRIEF`}
          title={textFor(lang, 'positionTitle', { role: localize(copy.name, lang) })}
          titleId="role-cockpit-title"
          meta={`${textFor(lang, 'poolCaption', { total: leader.poolSize })} · ${textFor(lang, 'rankLegend')}`}
          requirementLabel={textFor(lang, 'compareFocus')}
          requirementValue={textFor(lang, 'focus_' + focus)}
          requirementMeta={textFor(lang, 'focusNoReweight')}
        />
        <ScoutingRoleSwitch
          label={textFor(lang, 'overview')}
          items={POSITIONS.map(key => ({ value: key, label: localize(POSITION_COPY[key].name, lang), secondary: lang === 'en' ? '' : localize(POSITION_COPY[key].name, 'en').toUpperCase() }))}
          activeValue={position}
          onChange={onRoleChange}
        />
        <div className={report.roleCockpitLeadGrid}>
          <ScoutingRoleLeader
            artwork={<ReportArtwork key={leader.id} player={leader} className={report.roleCockpitArtwork} loading="eager" />}
            verdict={`${textFor(lang, 'roleBrief')} · ${localize(copy.headline, lang)}`}
            name={leader.name}
            meta={`${leader.team} · ${textFor(lang, 'playerPoolCaption', { rank: leader.rank, total: leader.poolSize })}`}
            score={formatNumber(leader.score, lang)}
            scoreLabel={`${textFor(lang, 'technicalIndex')} · /100`}
            summary={localize(copy.summary, lang)}
            stats={{ density: 'manager', items: [
              { label: textFor(lang, 'leadGap'), value: `+${formatNumber(leader.score - players[1].score, lang)}` },
              { label: textFor(lang, 'leaderStage'), value: `${textFor(lang, 'series', { n: leader.stage.playoff.matches })} / ${textFor(lang, 'maps', { n: leader.stage.playoff.maps })}` },
              { label: textFor(lang, 'leaderRetained'), value: `${leader.review.retained} / ${leader.review.total}` }
            ] }}
          />
          <ScoutingRoleFocusPanel label={textFor(lang, 'compareFocus')} value={textFor(lang, 'focus_' + focus)} meta={textFor(lang, 'focusHint_' + focus)} footerLabel={`${adapter.seasonId} · MODEL BOUNDARY`} footerText={textFor(lang, 'focusNoReweight')}>
            <EvidenceFocusSwitch lang={lang} focus={focus} onChange={changeFocus} className={styles.cockpitFocusSwitch} />
          </ScoutingRoleFocusPanel>
        </div>
        <CandidateStrip players={players} navigation={navigation} />
        <footer className={report.roleCockpitCaution}><span>{adapter.seasonId} · MODEL BOUNDARY</span><p>{textFor(lang, 'gapCaution')} {textFor(lang, 'retentionMeaning')}</p></footer>
      </section>
      <SeasonReportDecisionBoard data={data} position={position} navigation={navigation} onQueryChange={onQueryChange} />
      <ReportDisclosure id="candidate-dossiers" title={textFor(lang, 'candidateDetails')} meta={textFor(lang, 'rankLegend')} kicker="PLAYER DOSSIERS" open={detail}>
        <div className={styles.candidateGrid}>{players.map(player => <CandidateCard key={player.id} player={player} navigation={navigation} />)}</div>
      </ReportDisclosure>
      <BoundaryComparison position={position} navigation={navigation} />
      <Methodology id="role-method" data={data} lang={lang} />
    </>
  }

  function PlayerSnapshot({ player, lang }) {
    const notes = PLAYER_COPY[player.id]
    const bandFor = value => {
      const level = value >= 85 ? 'LEADING' : value >= 70 ? 'STRONG' : value >= 55 ? 'ABOVE' : value >= 50 ? 'MIDDLE' : 'WATCH'
      return { level, label: textFor(lang, `decisionBand_${level}`) }
    }
    const lensKeys = ['profileFloor', 'consistency', 'versatility']
    return <ScoutingDossierSnapshot
      color={POSITION_CONFIG[player.position].color}
      eyebrow={`01 · ${textFor(lang, 'decisionBriefEyebrow').toUpperCase()}`}
      title={textFor(lang, 'decisionBriefTitle', { name: player.name })}
      badge={textFor(lang, 'playerPoolCaption', { rank: player.rank, total: player.poolSize })}
      summary={localize(notes.lead, lang)}
      positionLabel={textFor(lang, 'currentTechnicalPosition')}
      positionValue={localize(POSITION_COPY[player.position].name, lang)}
      rank={player.rank}
      total={player.poolSize}
      positionMeta={`${textFor(lang, 'technicalIndex')} · ${formatNumber(player.score, lang)} /100`}
      lenses={lensKeys.map(key => {
        const value = player.factors[key]
        const band = bandFor(value)
        return {
          id: key,
          label: textFor(lang, `briefFactor_${key}`),
          meta: textFor(lang, `briefFactorMeta_${key}`),
          value: formatNumber(value, lang, 0),
          numericValue: value,
          level: band.level,
          bandLabel: band.label,
          footer: textFor(lang, 'decisionScale')
        }
      })}
      footerItems={[
        {
          id: 'playoff-evidence',
          label: textFor(lang, 'stageLabel'),
          content: <><p>{textFor(lang, 'series', { n: player.stage.playoff.matches })} · {textFor(lang, 'maps', { n: player.stage.playoff.maps })}</p><StageStatus player={player} lang={lang} /></>
        },
        {
          id: 'shortlist-stability',
          label: textFor(lang, 'leaderRetained'),
          content: <><p>{textFor(lang, 'retainedCount', { n: player.review.retained, total: player.review.total })}</p><ReviewBadge player={player} lang={lang} /></>
        }
      ]}
    />
  }

  function PlayerPage({ player, navigation, onDepthChange }) {
    const { lang, detail } = navigation
    const notes = PLAYER_COPY[player.id]
    const role = localize(POSITION_COPY[player.position].name, lang)
    const candidates = getPositionPlayers(data, player.position)
    const current = candidates.findIndex(candidate => candidate.id === player.id)
    const positionHref = previewLink({ ...navigation, position: player.position })
    useResetOnDepthChange(detail, 'summary')
    return <>
      <nav className={report.detailNavigation} aria-label={textFor(lang, 'dossiers')}>
        <div className={report.detailRoleSequence}><span>{textFor(lang, 'dossiers')}</span><strong>{role} · {current + 1} / {candidates.length}</strong></div>
        <div className={report.adjacentPlayers}>{[[candidates[current - 1], 'previousPlayer'], [candidates[current + 1], 'nextPlayer']].map(([candidate, key]) => candidate ? <Link key={key} to={previewLink({ ...navigation, playerId: candidate.id })}><small>{textFor(lang, key)}</small><b>{candidate.name}</b></Link> : <span key={key} />)}</div>
      </nav>
      <aside className={report.detailContextNav} data-audience={detail ? 'coach' : 'manager'}>
        <div className={report.detailContextPrimary}>
          <Link className={report.detailContextBack} to={positionHref}>← {textFor(lang, 'positionCta', { role })}</Link>
          <div className={report.detailContextIdentity}><span>{textFor(lang, 'dossiers')}</span><strong>{role}</strong><small>{textFor(lang, 'focus_' + navigation.focus)}</small></div>
          <div className={report.detailContextActions}><AudienceButtons lang={lang} detail={detail} onChange={onDepthChange} className={report.detailAudienceButtons} /></div>
        </div>
      </aside>
      <section id="summary" className={report.playerAnalysis + (!detail ? ' ' + report.managerPlayerAnalysis : '')}>
        <div className={report.analysisHeader}>
          <div><span>PLAYER DOSSIER · {role}</span><h2 role="heading" aria-level="1">{player.name}</h2><p>{player.team} · {textFor(lang, 'playerPoolCaption', { rank: player.rank, total: player.poolSize })}</p>
            <div className={report.identityMetadata}><p className={report.battleTag}><b>{textFor(lang, 'battleTag')}</b> · <bdi>{player.battleTag}</bdi></p><p>{textFor(lang, player.nationality === 'CN-MAINLAND' ? 'nationalityMainland' : 'nationalityPending')}</p></div>
          </div>
          <div className={report.analysisScore}><strong>{formatNumber(player.score, lang)}</strong><small>{textFor(lang, 'technicalIndex')}</small><em>{textFor(lang, 'indexMeaning')}</em></div>
          <Link className={report.printButton} to={positionHref + '#position-comparison'}>{textFor(lang, 'compareShort')} ↗</Link>
        </div>
        <PlayerSnapshot player={player} lang={lang} />
        {player.scope.maps > player.analyzed.maps ? <p className={styles.fine}>{textFor(lang, 'shortMapNote', { n: player.scope.maps - player.analyzed.maps })}</p> : null}
        <div className={report.managerDecisionColumns}>{[['advantage', 'strength'], ['watch', 'watch']].map(([title, key], index) => <article key={key}><header><span>{'0' + (index + 1)}</span><strong>{textFor(lang, title)}</strong></header><ol><li><b>01</b><p>{localize(notes[key], lang)}</p></li>{key === 'watch' ? <li><b>02</b><p>{localize(notes.question, lang)}</p></li> : null}</ol></article>)}</div>
        <div className={report.profileGrid}>
          <PlayerRadar data={data} player={player} lang={lang} />
          <section className={report.profileCard}><header><h3>{textFor(lang, 'primaryHeroes')}</h3><p>{textFor(lang, 'heroMeasure')}</p></header><HeroRecords player={player} lang={lang} /><div className={styles.question}><h3>{textFor(lang, 'question')}</h3><p>{localize(notes.question, lang)}</p></div></section>
        </div>
        <HeroMapEvidence player={player} lang={lang} detail={detail} />
        <MatchEvidence player={player} lang={lang} />
        <ModelEvidence player={player} lang={lang} detail={detail} />
        <ContextEvidence player={player} lang={lang} detail={detail} />
        <StabilityEvidence player={player} lang={lang} detail={detail} />
      </section>
      <ReportDisclosure title={textFor(lang, 'furtherReading')} kicker="SAME POSITION">
        <div className={report.managerSelectedDossiers}>{candidates.filter(candidate => candidate.id !== player.id).map(candidate => <Link to={previewLink({ ...navigation, playerId: candidate.id })} key={candidate.id}><span>{candidate.name}</span><b>{textFor(lang, 'profile')} ↗</b></Link>)}</div>
      </ReportDisclosure>
      <Methodology data={data} lang={lang} />
    </>
  }

  function SeasonReportPage() {
    const { positionSlug, playerId } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()
    const navigate = useNavigate()
    const lang = getLanguage(searchParams.get('lang'))
    const detail = searchParams.get('view') === 'analysis'
    const navigation = { lang, detail, compare: searchParams.get('compare') || undefined, focus: getComparisonFocus(searchParams.get('focus')), hash: location.hash }
    const player = playerId ? data.players.find(candidate => candidate.id === playerId && candidate.selected) : null
    const position = player?.position || POSITIONS.find(key => POSITION_CONFIG[key].slug === positionSlug)
    const invalid = (playerId && !player) || (positionSlug && !position)
    const main = useRef(null)
    const previousPath = useRef('')
    const restoredLocation = useRef('')
    useReportMetadata(lang, player?.name)
    useEffect(() => {
      main.current?.focus({ preventScroll: true })
      const pathChanged = previousPath.current !== location.pathname
      previousPath.current = location.pathname
      const locationKey = `${location.pathname}${location.search}`
      if (restoredLocation.current === locationKey) return undefined
      restoredLocation.current = locationKey
      let savedScroll = null
      try {
        savedScroll = window.sessionStorage.getItem(`scouting:return-scroll:${adapter.seasonId}:${locationKey}`)
        if (savedScroll != null) window.sessionStorage.removeItem(`scouting:return-scroll:${adapter.seasonId}:${locationKey}`)
      } catch {
        savedScroll = null
      }
      const top = savedScroll == null ? 0 : Number(savedScroll)
      if (!pathChanged && savedScroll == null) return undefined
      const frame = window.requestAnimationFrame(() => window.scrollTo({ top: Number.isFinite(top) ? top : 0, behavior: 'instant' }))
      return () => window.cancelAnimationFrame(frame)
    }, [location.pathname, location.search])
    const setQuery = (key, value) => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set(key, value)
      else next.delete(key)
      setSearchParams(next, { replace: true, preventScrollReset: true })
    }
    const changeDepth = value => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set('view', 'analysis')
      else next.delete('view')
      const search = next.toString()
      navigate({ pathname: location.pathname, search: search ? '?' + search : '', hash: position ? '' : location.hash }, { replace: true, preventScrollReset: true })
    }
    const changeRole = key => navigate(previewLink({ ...navigation, position: key, compare: key === position ? navigation.compare : undefined }))
    const rememberPlayerEntry = event => {
      const link = event.target.closest?.('a[href]')
      if (!link) return
      try {
        const target = new URL(link.href, window.location.href)
        if (target.origin !== window.location.origin || !target.pathname.includes('/players/')) return
        const locationKey = `${location.pathname}${location.search}`
        window.sessionStorage.setItem(`scouting:return-scroll:${adapter.seasonId}:${locationKey}`, String(window.scrollY))
      } catch {
        // Returning to the previous reading position is an enhancement; navigation still works without storage.
      }
    }
    return <div className={report.page + (player ? ' ' + report.detailPage : '') + ' ' + styles.report} data-season-scouting-report={adapter.seasonId} data-language={lang} data-locale={{ zh: 'zh-CN', en: 'en-US', ko: 'ko-KR' }[lang]} data-position={position || 'overview'} data-audience={detail ? 'coach' : 'manager'} data-role-focus={position && !player ? 'true' : 'false'} data-reading-view={detail ? 'coach' : 'manager'} style={{ '--slot-color': POSITION_CONFIG[position]?.color || 'var(--fc-yellow)' }}>
      <a className={styles.skipLink} href="#report-main">{textFor(lang, 'skip')}</a>
      <ReportHeader navigation={navigation} onLanguageChange={language => setQuery('lang', language === 'zh' ? null : language)} />
      <main id="report-main" className={report.main + (player ? ' ' + report.detailMain : '')} ref={main} tabIndex={-1} onClickCapture={rememberPlayerEntry}>
        {invalid ? <section className={styles.empty}><h1>{textFor(lang, playerId ? 'empty' : 'positionEmpty')}</h1><p>{textFor(lang, 'emptyHint')}</p><Link to={previewLink({ lang })}>← {textFor(lang, 'overview')}</Link></section> : player ? <PlayerPage key={player.id} player={player} navigation={navigation} onDepthChange={changeDepth} /> : position ? <PositionPage key={position} position={position} navigation={navigation} onDepthChange={changeDepth} onQueryChange={setQuery} onRoleChange={changeRole} /> : <Overview navigation={navigation} onDepthChange={changeDepth} onQueryChange={setQuery} />}
        <footer className={report.detailVersionFooter}><ReportVersion lang={lang} /><p className={styles.fine}>{textFor(lang, 'previewNote')}</p><p className={styles.fine}>{textFor(lang, 'eventScope')}</p></footer>
      </main>
    </div>
  }

  return SeasonReportPage
}
