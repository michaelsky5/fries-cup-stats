import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import {
  getCachedScoutingIndex,
  getCachedScoutingPlayer,
  loadScoutingIndex,
  loadScoutingPlayer
} from '../../features/scouting/scoutingArtifactClient.js'
import { getScoutingAccessRecord } from '../../features/scouting/scoutingAccess.js'
import styles from './ScoutingReportRoute.module.css'

const LOCALES = [
  { id: 'zh', locale: 'zh-CN' },
  { id: 'en', locale: 'en-US' },
  { id: 'ko', locale: 'ko-KR' }
]

const SUBROLE_ORDER = ['TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT']

const COPY = {
  'zh-CN': {
    title: '薯条杯 2026 选手技术分析报告',
    access: '俱乐部专属访问',
    eyebrow: 'CONFIDENTIAL · PERFORMANCE INTELLIGENCE',
    overviewLead: '薯条杯 2026',
    overviewTitle: '选手技术分析报告',
    overviewMeta: '25 人技术摘要优先呈现，完整经理与教练判断依据正在准备。',
    playerMeta: '选手身份与技术摘要已就绪，完整判断依据正在准备。',
    shellPhase: '访问确认',
    summaryPhase: '技术摘要',
    analysisPhase: '完整判断',
    phaseLabel: '报告准备进度',
    indexLoading: '正在准备 25 人技术摘要',
    playerLoading: '正在准备选手技术摘要',
    analysisLoading: '技术摘要已就绪，正在准备完整判断依据',
    ready: '完成',
    dossierCount: '分析档案',
    priorityCount: '优先候选',
    extendedCount: '延伸考察',
    watchCount: '观察名单',
    positionPreview: '五位置摘要',
    positionLeader: '当前技术首选',
    battleTag: '战网 ID',
    nationality: '国籍',
    rank: '分路顺位',
    fit: '模型基础分',
    fitShort: '基础分',
    invalid: '该专属链接不可用，请向报告提供方获取新的访问地址。',
    error: '技术分析数据暂时无法载入，请稍后重试。'
  },
  'en-US': {
    title: 'Fries Cup 2026 Player Performance Report',
    access: 'Club-only access',
    eyebrow: 'CONFIDENTIAL · PERFORMANCE INTELLIGENCE',
    overviewLead: 'FRIES CUP 2026',
    overviewTitle: 'PLAYER PERFORMANCE REPORT',
    overviewMeta: 'The 25-player technical summary appears first while full manager and coach evidence is prepared.',
    playerMeta: 'Player identity and the technical summary are ready while the full decision evidence is prepared.',
    shellPhase: 'Access confirmed',
    summaryPhase: 'Technical summary',
    analysisPhase: 'Full decision evidence',
    phaseLabel: 'Report preparation',
    indexLoading: 'Preparing the 25-player technical summary',
    playerLoading: 'Preparing the player technical summary',
    analysisLoading: 'Technical summary ready · preparing full decision evidence',
    ready: 'Complete',
    dossierCount: 'Dossiers',
    priorityCount: 'Priority',
    extendedCount: 'Extended',
    watchCount: 'Watch',
    positionPreview: 'Five-position summary',
    positionLeader: 'Current technical primary',
    battleTag: 'Battle.net ID',
    nationality: 'Nationality',
    rank: 'Position rank',
    fit: 'Base model score',
    fitShort: 'Base score',
    invalid: 'This dedicated link is unavailable. Request a new access URL from the report provider.',
    error: 'Technical analysis data is temporarily unavailable. Please try again later.'
  },
  'ko-KR': {
    title: 'Fries Cup 2026 선수 경기력 분석 보고서',
    access: '구단 전용 접근',
    eyebrow: 'CONFIDENTIAL · PERFORMANCE INTELLIGENCE',
    overviewLead: 'FRIES CUP 2026',
    overviewTitle: '선수 경기력 분석 보고서',
    overviewMeta: '25인 기술 요약을 먼저 제공하며 전체 매니저·코치 판단 근거를 준비하고 있습니다.',
    playerMeta: '선수 정보와 기술 요약이 준비되었으며 전체 판단 근거를 준비하고 있습니다.',
    shellPhase: '접근 확인',
    summaryPhase: '기술 요약',
    analysisPhase: '전체 판단 근거',
    phaseLabel: '보고서 준비 진행',
    indexLoading: '25인 기술 요약을 준비하는 중',
    playerLoading: '선수 기술 요약을 준비하는 중',
    analysisLoading: '기술 요약 준비 완료 · 전체 판단 근거 준비 중',
    ready: '완료',
    dossierCount: '분석 프로필',
    priorityCount: '우선 후보',
    extendedCount: '확장 검토',
    watchCount: '관찰 명단',
    positionPreview: '5개 포지션 요약',
    positionLeader: '현재 기술 1순위',
    battleTag: 'Battle.net ID',
    nationality: '국적',
    rank: '포지션 순위',
    fit: '기본 모델 점수',
    fitShort: '기초 점수',
    invalid: '이 전용 링크를 사용할 수 없습니다. 보고서 제공자에게 새 링크를 요청하세요.',
    error: '기술 분석 데이터를 불러올 수 없습니다. 잠시 후 다시 시도하세요.'
  }
}

const SUBROLE_LABELS = {
  TANK: { 'zh-CN': '坦克', 'en-US': 'TANK', 'ko-KR': '탱커' },
  HITSCAN: { 'zh-CN': '长枪', 'en-US': 'HITSCAN', 'ko-KR': '히트스캔' },
  FLEX_DPS: { 'zh-CN': '自由人', 'en-US': 'FLEX DPS', 'ko-KR': '플렉스 DPS' },
  MAIN_SUPPORT: { 'zh-CN': '群辅', 'en-US': 'MAIN SUPPORT', 'ko-KR': '메인 서포트' },
  FLEX_SUPPORT: { 'zh-CN': '枪辅', 'en-US': 'FLEX SUPPORT', 'ko-KR': '플렉스 서포트' }
}

const NATIONALITY_LABELS = {
  'CN-MAINLAND': { 'zh-CN': '中国大陆', 'en-US': 'Mainland China', 'ko-KR': '중국 본토' },
  KR: { 'zh-CN': '韩国', 'en-US': 'South Korea', 'ko-KR': '대한민국' }
}

let reportModulePromise = null
let reportModuleReady = false

function loadFullReportModule() {
  if (!reportModulePromise) {
    reportModulePromise = import('./ScoutingReportPage.jsx').then(module => {
      reportModuleReady = true
      return module
    })
  }
  return reportModulePromise
}

const FullOverviewReport = lazy(() => loadFullReportModule().then(module => ({ default: module.default })))
const FullPlayerReport = lazy(() => loadFullReportModule().then(module => ({ default: module.ScoutingPlayerPage })))

function getLocale(searchParams) {
  const language = searchParams.get('lang')
  if (language === 'en') return 'en-US'
  if (language === 'ko') return 'ko-KR'
  return 'zh-CN'
}

function getSubroleLabel(subrole, locale) {
  return SUBROLE_LABELS[subrole]?.[locale] || subrole || '—'
}

function getNationalityLabel(nationality, locale) {
  return NATIONALITY_LABELS[nationality]?.[locale] || nationality || '—'
}

function useFullReportWarmup(enabled) {
  const [state, setState] = useState(() => ({ ready: reportModuleReady, error: null }))

  useEffect(() => {
    if (!enabled || reportModuleReady) {
      if (enabled && reportModuleReady) setState({ ready: true, error: null })
      return undefined
    }

    let active = true
    let idleId = null
    let timeoutId = null
    const startLoad = () => {
      loadFullReportModule()
        .then(() => {
          if (active) setState({ ready: true, error: null })
        })
        .catch(error => {
          if (active) setState({ ready: false, error })
        })
    }
    const frameId = window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(startLoad, { timeout: 700 })
      } else {
        timeoutId = window.setTimeout(startLoad, 0)
      }
    })

    return () => {
      active = false
      window.cancelAnimationFrame(frameId)
      if (idleId !== null) window.cancelIdleCallback(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [enabled])

  return state
}

function useOverviewWarmup(enabled) {
  const [state, setState] = useState(() => ({ data: enabled ? getCachedScoutingIndex() : null, error: null }))

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    loadScoutingIndex()
      .then(data => {
        if (active) setState({ data, error: null })
      })
      .catch(error => {
        if (active) setState({ data: null, error })
      })
    return () => { active = false }
  }, [enabled])

  return state
}

function usePlayerWarmup(playerId, enabled) {
  const [state, setState] = useState(() => ({
    playerId,
    index: enabled ? getCachedScoutingIndex() : null,
    player: enabled ? getCachedScoutingPlayer(playerId) : null,
    error: null
  }))

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const cachedIndex = getCachedScoutingIndex()
    const cachedPlayer = getCachedScoutingPlayer(playerId)
    setState({ playerId, index: cachedIndex, player: cachedPlayer, error: null })

    const indexRequest = loadScoutingIndex()
    const playerRequest = loadScoutingPlayer(playerId)

    indexRequest
      .then(index => {
        if (active) setState(current => ({ ...current, playerId, index }))
      })
      .catch(error => {
        if (active) setState(current => ({ ...current, playerId, error }))
      })
    playerRequest
      .then(player => {
        if (active) setState(current => ({ ...current, playerId, player }))
      })
      .catch(error => {
        if (active) setState(current => ({ ...current, playerId, error }))
      })

    return () => { active = false }
  }, [enabled, playerId])

  if (state.playerId !== playerId) return { index: null, player: null, error: null }
  return state
}

function ShellHeader({ accessRecord, locale, onLocaleChange }) {
  const t = COPY[locale]
  return (
    <header className={styles.header}>
      <a href="https://fries-cup.com/" className={styles.brand} aria-label="Fries Cup">
        <img src="/logos/fc_logo.svg" alt="" />
        <span><b>FRIES CUP</b><small>PERFORMANCE INTELLIGENCE</small></span>
      </a>
      <div className={styles.access}><span>{t.access}</span><b>{accessRecord.label}</b></div>
      <nav className={styles.languages} aria-label="Language">
        {LOCALES.map(item => (
          <button key={item.id} type="button" aria-pressed={locale === item.locale} onClick={() => onLocaleChange(item.id)}>
            {item.id.toUpperCase()}
          </button>
        ))}
      </nav>
    </header>
  )
}

function PhaseProgress({ locale, summaryReady, analysisReady, error }) {
  const t = COPY[locale]
  const steps = [
    { label: t.shellPhase, ready: true },
    { label: t.summaryPhase, ready: summaryReady },
    { label: t.analysisPhase, ready: analysisReady }
  ]
  const completed = steps.filter(step => step.ready).length
  const activeIndex = Math.min(completed, steps.length - 1)

  return (
    <section className={styles.progress} role={error ? 'alert' : 'status'} aria-live="polite" aria-busy={!analysisReady && !error}>
      <header><span>{t.phaseLabel}</span><b>{error ? t.error : `${completed} / ${steps.length}`}</b></header>
      <div className={styles.progressTrack} aria-hidden="true"><i style={{ width: `${(completed / steps.length) * 100}%` }} /></div>
      <ol>
        {steps.map((step, index) => (
          <li key={step.label} data-state={step.ready ? 'ready' : index === activeIndex ? 'active' : 'waiting'}>
            <i>{step.ready ? '✓' : String(index + 1).padStart(2, '0')}</i>
            <span>{step.label}</span>
            <small>{step.ready ? t.ready : '…'}</small>
          </li>
        ))}
      </ol>
    </section>
  )
}

function OverviewSummary({ index, locale }) {
  const t = COPY[locale]
  if (!index) {
    return <div className={styles.summarySkeleton} aria-hidden="true"><i /><i /><i /><i /><i /></div>
  }

  const stats = [
    [t.dossierCount, index.selectedCount],
    [t.priorityCount, index.priorityCount],
    [t.extendedCount, index.extendedCount],
    [t.watchCount, index.watchCount]
  ]

  return (
    <section className={styles.overviewSummary}>
      <div className={styles.stats}>
        {stats.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className={styles.positionSummary}>
        <header><span>POSITION SNAPSHOT</span><b>{t.positionPreview}</b></header>
        <div>
          {SUBROLE_ORDER.map(subrole => {
            const leader = index.players
              .filter(player => player.subrole === subrole)
              .sort((a, b) => a.highSampleSubroleRank - b.highSampleSubroleRank)[0]
            return (
              <article key={subrole}>
                <span>{getSubroleLabel(subrole, locale)}</span>
                <strong>{leader?.identity?.displayName || '—'}</strong>
                <small>{t.positionLeader}</small>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PlayerSummary({ player, locale }) {
  const t = COPY[locale]
  if (!player) {
    return <div className={`${styles.summarySkeleton} ${styles.playerSkeleton}`} aria-hidden="true"><i /><i /><i /></div>
  }

  return (
    <section className={styles.playerSummary}>
      <div>
        <span>PLAYER DOSSIER · TECHNICAL SUMMARY</span>
        <h1>{player.identity.displayName}</h1>
        <p>{getSubroleLabel(player.subrole, locale)} · {player.identity.teamShort}</p>
        <dl>
          <div><dt>{t.battleTag}</dt><dd>{player.identity.battleTag || '—'}</dd></div>
          <div><dt>{t.nationality}</dt><dd>{getNationalityLabel(player.identity.nationality, locale)}</dd></div>
        </dl>
      </div>
      <aside>
        <strong>{player.selection.score}</strong><small>{t.fitShort}</small>
        <p>{t.rank} {player.highSampleSubroleRank} / {player.highSampleSubroleTotal}</p>
        <span>{t.fit}</span>
      </aside>
    </section>
  )
}

function ReportShell({ accessRecord, locale, onLocaleChange, mode, index, player, moduleReady, error }) {
  const t = COPY[locale]
  const summaryReady = mode === 'player' ? Boolean(player) : Boolean(index)
  const analysisReady = summaryReady && Boolean(index) && moduleReady
  const statusText = !summaryReady
    ? mode === 'player' ? t.playerLoading : t.indexLoading
    : t.analysisLoading

  return (
    <div className={styles.shell} data-mode={mode} data-locale={locale}>
      <ShellHeader accessRecord={accessRecord} locale={locale} onLocaleChange={onLocaleChange} />
      <main className={styles.main}>
        {mode === 'overview' ? (
          <section className={styles.hero}>
            <span>{t.eyebrow}</span>
            <h1><b>{t.overviewLead}</b> {t.overviewTitle}</h1>
            <p>{t.overviewMeta}</p>
          </section>
        ) : null}
        {mode === 'player' ? <PlayerSummary player={player} locale={locale} /> : null}
        <PhaseProgress locale={locale} summaryReady={summaryReady} analysisReady={analysisReady} error={error} />
        <p className={styles.statusText}>{error ? t.error : statusText}</p>
        {mode === 'overview' ? <OverviewSummary index={index} locale={locale} /> : null}
      </main>
    </div>
  )
}

function AccessDeniedShell({ locale }) {
  return <main className={`${styles.shell} ${styles.denied}`}><span>ACCESS DENIED</span><h1>{COPY[locale].title}</h1><p>{COPY[locale].invalid}</p></main>
}

function useShellLocale(searchParams, setSearchParams) {
  const locale = getLocale(searchParams)
  const changeLocale = nextLanguage => {
    const next = new URLSearchParams(searchParams)
    if (nextLanguage === 'zh') next.delete('lang')
    else next.set('lang', nextLanguage)
    setSearchParams(next, { replace: true })
  }
  return { locale, changeLocale }
}

function useScoutingPrivacyMeta() {
  useEffect(() => {
    const definitions = [
      ['robots', 'noindex,nofollow,noarchive,nosnippet'],
      ['referrer', 'no-referrer']
    ]
    const snapshots = definitions.map(([name, content]) => {
      const existing = document.head.querySelector(`meta[name="${name}"]`)
      const element = existing || document.createElement('meta')
      const previousContent = existing?.getAttribute('content') ?? null
      if (!existing) {
        element.setAttribute('name', name)
        document.head.append(element)
      }
      element.setAttribute('content', content)
      return { element, created: !existing, previousContent }
    })

    return () => {
      snapshots.forEach(({ element, created, previousContent }) => {
        if (created) element.remove()
        else if (previousContent === null) element.removeAttribute('content')
        else element.setAttribute('content', previousContent)
      })
    }
  }, [])
}

export default function ScoutingOverviewRoute() {
  const { shareKey } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locale, changeLocale } = useShellLocale(searchParams, setSearchParams)
  const accessRecord = useMemo(() => getScoutingAccessRecord(shareKey), [shareKey])
  const { data: index, error: dataError } = useOverviewWarmup(Boolean(accessRecord))
  const { ready: moduleReady, error: moduleError } = useFullReportWarmup(Boolean(accessRecord))
  const ready = Boolean(index) && moduleReady
  useScoutingPrivacyMeta()

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = COPY[locale].title
  }, [locale])

  if (!accessRecord) return <AccessDeniedShell locale={locale} />
  if (ready) {
    return <Suspense fallback={<ReportShell accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} mode="overview" index={index} moduleReady={moduleReady} />}><FullOverviewReport /></Suspense>
  }
  return <ReportShell accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} mode="overview" index={index} moduleReady={moduleReady} error={dataError || moduleError} />
}

export function ScoutingPlayerRoute() {
  const { shareKey, playerId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locale, changeLocale } = useShellLocale(searchParams, setSearchParams)
  const accessRecord = useMemo(() => getScoutingAccessRecord(shareKey), [shareKey])
  const { index, player, error: dataError } = usePlayerWarmup(playerId, Boolean(accessRecord))
  const { ready: moduleReady, error: moduleError } = useFullReportWarmup(Boolean(accessRecord))
  const ready = Boolean(index) && Boolean(player) && moduleReady
  const playerDisplayName = player?.identity?.displayName || ''
  useScoutingPrivacyMeta()

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = playerDisplayName ? `${playerDisplayName} · ${COPY[locale].title}` : COPY[locale].title
  }, [locale, playerDisplayName])

  if (!accessRecord) return <AccessDeniedShell locale={locale} />
  if (ready) {
    return <Suspense fallback={<ReportShell accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} mode="player" index={index} player={player} moduleReady={moduleReady} />}><FullPlayerReport /></Suspense>
  }
  return <ReportShell accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} mode="player" index={index} player={player} moduleReady={moduleReady} error={dataError || moduleError} />
}
