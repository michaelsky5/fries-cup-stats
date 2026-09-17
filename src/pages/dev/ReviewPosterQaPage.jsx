import { useEffect, useMemo, useState } from 'react'
import { buildCinemaReviewScenes } from '../../lib/reviewCinema.js'
import { getDb } from '../../lib/db.js'
import {
  applyDirectorCutSelection,
  DIRECTOR_CUT_HERO_CATALOG,
  getDirectorCutSelection
} from '../../lib/directorCutProfiles.js'
import { DIRECTOR_CUT_HERO_EMBLEMS, generatePosterPng, getPosterPayload } from '../../lib/reviewPoster.js'
import { prepareReviewDb } from '../../lib/reviewSeason.js'
import { buildPlayerStory, buildTeamStory } from '../../lib/reviewStoryBuilders.js'
import styles from './ReviewPosterQaPage.module.css'

const SEASON_ID = 'FCR26'
const SEASON_QUERY = 'FCR2026'
const PAGE_SIZE = 8
const DIRECTOR_PAGE_SIZE = 6
const DIRECTOR_PAGE_COUNT = Math.ceil(DIRECTOR_CUT_HERO_CATALOG.length / DIRECTOR_PAGE_SIZE)
const DIRECTOR_REFERENCE_PLAYER_ID = 'FCR26-P0042'

const FILTERS = [
  { id: 'all', label: '全部队伍' },
  { id: 'real', label: '真实队标' },
  { id: 'fallback', label: 'OW 回退' },
  { id: 'long', label: '长名称' },
  { id: 'attention', label: '重点关注' }
]

const DIRECTOR_FILTERS = [
  { id: 'all', label: '全部英雄' },
  { id: 'tank', label: '重装' },
  { id: 'damage', label: '输出' },
  { id: 'support', label: '辅助' }
]

function safeText(value, fallback = '') {
  return String(value ?? '').trim() || fallback
}

function getVisualTextLength(value) {
  return [...safeText(value)].reduce((total, char) => total + ((char.codePointAt(0) || 0) > 255 ? 2 : 1), 0)
}

function getTeamEntries(db) {
  const players = Array.isArray(db?.players) ? db.players : []

  return (Array.isArray(db?.teams) ? db.teams : []).map(team => {
    const teamId = safeText(team?.team_id || team?.id)
    const teamName = safeText(team?.team_name || team?.name, 'UNNAMED TEAM')
    const shortName = safeText(team?.team_short_name || team?.short_name, teamName)
    const scenes = buildCinemaReviewScenes(buildTeamStory(db, teamId), {
      isRegular: true,
      locale: 'zh-CN'
    })
    const payload = {
      ...getPosterPayload(scenes),
      cardKind: 'team'
    }
    const ticket = payload.identityTicket || payload.playerTicket || {}
    const logoUrl = safeText(ticket.teamLogo || payload.image)
    const teamPlayers = players.filter(player => safeText(player?.team_id) === teamId)
    const longName = getVisualTextLength(teamName) > 20 || getVisualTextLength(shortName) > 10

    return {
      teamId,
      teamName,
      shortName,
      finalRank: safeText(team?.final_rank_text || team?.current_rank_text || ticket.dest, '未定'),
      playerCount: teamPlayers.length,
      logoUrl,
      longName,
      payload,
      storyUrl: `/review/story/team/${encodeURIComponent(teamId)}?season=${SEASON_QUERY}&lang=zh&poster=film`
    }
  }).sort((a, b) => a.shortName.localeCompare(b.shortName, 'en-US'))
}

function getDirectorHeroEntries(db) {
  const players = Array.isArray(db?.players) ? db.players : []
  const referencePlayer = players.find(player => safeText(player?.player_id || player?.id) === DIRECTOR_REFERENCE_PLAYER_ID)
    || players.find(player => /michaelsky5|sky#?51764/i.test([
      player?.player_name,
      player?.display_name,
      player?.nickname
    ].filter(Boolean).join(' ')))
    || players[0]
  const playerId = safeText(referencePlayer?.player_id || referencePlayer?.id)
  const scenes = buildCinemaReviewScenes(buildPlayerStory(db, playerId), {
    isRegular: true,
    locale: 'zh-CN'
  })
  const basePayload = {
    ...getPosterPayload(scenes),
    cardKind: 'player'
  }

  return DIRECTOR_CUT_HERO_CATALOG.map(hero => {
    const selection = getDirectorCutSelection(basePayload, hero.id, 'zh-CN')
    const profile = selection.profile || hero.profile

    return {
      heroId: hero.id,
      heroName: selection.heroName || hero.zh || hero.en,
      heroNameEn: hero.en,
      role: hero.role,
      render: hero.render,
      profile,
      payload: applyDirectorCutSelection(basePayload, selection)
    }
  })
}

function probeLogo(url) {
  if (!url || /\/OW\.png(?:$|[?#])/i.test(url)) return Promise.resolve('fallback')

  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => resolve('real')
    image.onerror = () => resolve('fallback')
    image.src = url
  })
}

function PosterQaCard({ entry, logoStatus, renderVersion }) {
  const [posterUrl, setPosterUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let generatedUrl = ''

    setPosterUrl('')
    setError('')
    generatePosterPng(entry.payload, { format: 'poster' })
      .then(url => {
        generatedUrl = url
        if (!active) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setError('PNG 生成失败')
          return
        }
        setPosterUrl(url)
      })
      .catch(err => {
        if (active) setError(err?.message || 'PNG 生成失败')
      })

    return () => {
      active = false
      if (generatedUrl) URL.revokeObjectURL(generatedUrl)
    }
  }, [entry, renderVersion])

  const statusLabel = logoStatus === 'real'
    ? 'REAL CREST'
    : logoStatus === 'fallback'
      ? 'OW FALLBACK'
      : 'CHECKING ASSET'

  return (
    <article className={styles.card} data-logo-status={logoStatus || 'pending'}>
      <div className={styles.posterFrame}>
        {posterUrl ? (
          <img src={posterUrl} alt={`${entry.shortName} 电影海报质检预览`} />
        ) : error ? (
          <div className={styles.posterError}><b>RENDER ERROR</b><span>{error}</span></div>
        ) : (
          <div className={styles.posterLoading}><i /><b>RENDERING</b><span>1080 × 1920</span></div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <div><span>{entry.teamId}</span><strong>{entry.shortName}</strong></div>
          <b>{statusLabel}</b>
        </div>
        <p title={entry.teamName}>{entry.teamName}</p>
        <div className={styles.badges}>
          {entry.longName ? <span>LONG NAME</span> : null}
          <span>{entry.finalRank}</span>
          <span>{entry.playerCount} PLAYERS</span>
        </div>
        <div className={styles.assetPath} title={entry.logoUrl || 'No crest source'}>
          {entry.logoUrl || 'NO CREST SOURCE / OW DEFAULT'}
        </div>
        <div className={styles.cardActions}>
          <a href={entry.storyUrl} target="_blank" rel="noreferrer">打开海报</a>
          <a href={entry.storyUrl.replace('&poster=film', '')} target="_blank" rel="noreferrer">查看回顾</a>
        </div>
      </div>
    </article>
  )
}

function DirectorHeroQaCard({ entry, renderVersion }) {
  const [posterUrl, setPosterUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let generatedUrl = ''

    setPosterUrl('')
    setError('')
    generatePosterPng(entry.payload, { format: 'directorCut' })
      .then(url => {
        generatedUrl = url
        if (!active) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setError('PNG 生成失败')
          return
        }
        setPosterUrl(url)
      })
      .catch(err => {
        if (active) setError(err?.message || 'PNG 生成失败')
      })

    return () => {
      active = false
      if (generatedUrl) URL.revokeObjectURL(generatedUrl)
    }
  }, [entry, renderVersion])

  const profile = entry.profile || {}

  return (
    <article
      className={`${styles.card} ${styles.directorCard}`}
      data-hero-id={entry.heroId}
      data-hero-role={entry.role}
      data-motif={profile.type}
      data-story={profile.story?.id || 'missing'}
      data-line-layer={profile.lineLayer || 'missing'}
      data-line-grammar={profile.ambientField?.family || 'missing'}
    >
      <div className={`${styles.posterFrame} ${styles.directorFrame}`}>
        {posterUrl ? (
          <img src={posterUrl} alt={`${entry.heroNameEn} 导演剪辑版构图质检预览`} />
        ) : error ? (
          <div className={styles.posterError}><b>RENDER ERROR</b><span>{error}</span></div>
        ) : (
          <div className={styles.posterLoading}><i /><b>RENDERING</b><span>1920 × 1080</span></div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <div><span>{profile.code} · {entry.role?.toLocaleUpperCase('en-US')}</span><strong>{entry.heroName}</strong></div>
          <b>{entry.heroNameEn}</b>
        </div>
        <p title={profile.label}>{profile.label}</p>
        <div className={styles.badges}>
          <span>{profile.type?.toLocaleUpperCase('en-US')}</span>
          <span>{profile.composition?.toLocaleUpperCase('en-US')}</span>
          <span title={profile.ambientField?.intent}>FIELD {safeText(profile.ambientField?.family, 'MISSING').toLocaleUpperCase('en-US')}</span>
          <span title={profile.story?.anchor}>STORY {safeText(profile.story?.id, 'MISSING').toLocaleUpperCase('en-US')}</span>
          <span>SCALE {Number(profile.subjectScale || 1).toFixed(3)}</span>
          <span>X {Number(profile.subjectX || 0).toFixed(3)}</span>
          <span>Y {Number(profile.subjectY || 0).toFixed(3)}</span>
        </div>
        <div className={styles.calibrationLine}>
          <span>FRAME {safeText(profile.subjectFraming, 'LEGACY').toLocaleUpperCase('en-US')}</span>
          <span>SYMBOL XY {Number(profile.heroEmblemX || 0).toFixed(3)} / {Number(profile.heroEmblemY || 0).toFixed(3)}</span>
          <span>MOTIF {Number(profile.motifStrength || 0).toFixed(2)}</span>
          <span>EMBLEM {safeText(profile.story?.emblem, 'MISSING').toLocaleUpperCase('en-US')}</span>
          <span>RIM {Number(profile.rimStrength || 0).toFixed(2)}</span>
          <span>REVIEW {safeText(profile.stageReview, 'UNREVIEWED')}</span>
        </div>
      </div>
    </article>
  )
}

function TeamPosterQaPage() {
  const [entries, setEntries] = useState([])
  const [logoStatuses, setLogoStatuses] = useState({})
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [renderVersion, setRenderVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getDb(SEASON_ID)
      .then(rawDb => {
        if (!active) return
        const nextEntries = getTeamEntries(prepareReviewDb(rawDb))
        setEntries(nextEntries)
      })
      .catch(err => {
        if (active) setError(err?.message || '质检数据加载失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!entries.length) return undefined

    Promise.all(entries.map(async entry => [entry.teamId, await probeLogo(entry.logoUrl)]))
      .then(results => {
        if (active) setLogoStatuses(Object.fromEntries(results))
      })

    return () => {
      active = false
    }
  }, [entries])

  const counts = useMemo(() => entries.reduce((result, entry) => {
    const status = logoStatuses[entry.teamId]
    result.all += 1
    if (status === 'real') result.real += 1
    if (status === 'fallback') result.fallback += 1
    if (entry.longName) result.long += 1
    if (status === 'fallback' || entry.longName) result.attention += 1
    return result
  }, { all: 0, real: 0, fallback: 0, long: 0, attention: 0 }), [entries, logoStatuses])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('en-US')
    return entries.filter(entry => {
      const status = logoStatuses[entry.teamId]
      const matchesFilter = filter === 'all'
        || (filter === 'real' && status === 'real')
        || (filter === 'fallback' && status === 'fallback')
        || (filter === 'long' && entry.longName)
        || (filter === 'attention' && (status === 'fallback' || entry.longName))
      const matchesQuery = !normalizedQuery || [entry.teamId, entry.shortName, entry.teamName]
        .some(value => value.toLocaleLowerCase('en-US').includes(normalizedQuery))
      return matchesFilter && matchesQuery
    })
  }, [entries, filter, logoStatuses, query])

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageEntries = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter, query])

  if (loading) {
    return <main className={styles.statePage}><b>LOADING POSTER QA WALL</b><span>正在整理全部队伍档案…</span></main>
  }

  if (error) {
    return <main className={styles.statePage}><b>QA WALL UNAVAILABLE</b><span>{error}</span></main>
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>DEV ONLY / FCR 2026</span>
          <h1>赛季电影海报质检墙</h1>
          <p>使用与正式下载相同的 Canvas 渲染器，分批检查全部 38 支队伍。</p>
        </div>
        <div className={styles.heroStats}>
          <div><strong>{counts.all}</strong><span>TEAMS</span></div>
          <div><strong>{counts.real}</strong><span>REAL CRESTS</span></div>
          <div><strong>{counts.fallback}</strong><span>OW FALLBACKS</span></div>
          <div><strong>{counts.attention}</strong><span>ATTENTION</span></div>
        </div>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              <span>{item.label}</span>
              <b>{counts[item.id]}</b>
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <span>SEARCH TEAM</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="简称 / 全称 / 队伍 ID" />
        </label>
        <button type="button" className={styles.rerender} onClick={() => setRenderVersion(value => value + 1)}>
          重新渲染当前页
        </button>
      </section>

      <section className={styles.wallHead}>
        <div><span>VISIBLE SET</span><strong>{filteredEntries.length} 支队伍</strong></div>
        <p>每页仅渲染 {PAGE_SIZE} 张完整 PNG，以控制浏览器内存。</p>
        <div><span>PAGE</span><strong>{safePage} / {pageCount}</strong></div>
      </section>

      <section className={styles.wall} aria-label="队伍电影海报质检列表">
        {pageEntries.length ? pageEntries.map(entry => (
          <PosterQaCard
            key={`${entry.teamId}-${renderVersion}`}
            entry={entry}
            logoStatus={logoStatuses[entry.teamId]}
            renderVersion={renderVersion}
          />
        )) : (
          <div className={styles.empty}><strong>没有匹配的队伍</strong><span>调整筛选条件或搜索词。</span></div>
        )}
      </section>

      <nav className={styles.pagination} aria-label="质检墙分页">
        <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>← 上一页</button>
        <div>{Array.from({ length: pageCount }, (_, index) => index + 1).map(value => (
          <button key={value} type="button" aria-current={safePage === value ? 'page' : undefined} onClick={() => setPage(value)}>{value}</button>
        ))}</div>
        <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>下一页 →</button>
      </nav>
    </main>
  )
}

function DirectorHeroQaPage() {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [renderVersion, setRenderVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getDb(SEASON_ID, { preferLocalData: true })
      .then(rawDb => {
        if (!active) return
        setEntries(getDirectorHeroEntries(prepareReviewDb(rawDb)))
      })
      .catch(err => {
        if (active) setError(err?.message || '英雄质检数据加载失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const counts = useMemo(() => entries.reduce((result, entry) => {
    result.all += 1
    if (entry.role && Object.prototype.hasOwnProperty.call(result, entry.role)) result[entry.role] += 1
    return result
  }, { all: 0, tank: 0, damage: 0, support: 0 }), [entries])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('en-US')
    return entries.filter(entry => {
      const matchesFilter = filter === 'all' || entry.role === filter
      const matchesQuery = !normalizedQuery || [
        entry.heroId,
        entry.heroName,
        entry.heroNameEn,
        entry.profile?.label,
        entry.profile?.type,
        entry.profile?.ambientField?.family,
        entry.profile?.ambientField?.intent
      ].some(value => safeText(value).toLocaleLowerCase('en-US').includes(normalizedQuery))
      return matchesFilter && matchesQuery
    })
  }, [entries, filter, query])

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / DIRECTOR_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageEntries = filteredEntries.slice((safePage - 1) * DIRECTOR_PAGE_SIZE, safePage * DIRECTOR_PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter, query])

  if (loading) {
    return <main className={styles.statePage}><b>LOADING HERO QA WALL</b><span>正在载入本地 FCR26 英雄质检数据…</span></main>
  }

  if (error) {
    return <main className={styles.statePage}><b>HERO QA WALL UNAVAILABLE</b><span>{error}</span></main>
  }

  return (
    <main className={`${styles.page} ${styles.directorPage}`}>
      <header className={styles.hero}>
        <div>
          <span>DEV ONLY / DIRECTOR'S CUT / FCR 2026</span>
          <h1>全英雄导演剪辑版构图质检墙</h1>
          <p>逐个英雄使用正式 Canvas 生成链路，检查透明边界、标题安全区、信息栏遮挡与母题可见度。</p>
        </div>
        <div className={styles.heroStats}>
          <div><strong>{counts.all}</strong><span>HEROES</span></div>
          <div><strong>{counts.tank}</strong><span>TANK</span></div>
          <div><strong>{counts.damage}</strong><span>DAMAGE</span></div>
          <div><strong>{counts.support}</strong><span>SUPPORT</span></div>
        </div>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.filters}>
          {DIRECTOR_FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              <span>{item.label}</span>
              <b>{counts[item.id]}</b>
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <span>SEARCH HERO</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="中文名 / 英文名 / 英雄 ID / 母题" />
        </label>
        <button type="button" className={styles.rerender} onClick={() => setRenderVersion(value => value + 1)}>
          重新渲染当前页
        </button>
      </section>

      <section className={styles.wallHead}>
        <div><span>VISIBLE SET</span><strong>{filteredEntries.length} 个英雄</strong></div>
        <p>每页仅渲染 {DIRECTOR_PAGE_SIZE} 张完整 PNG；逐张看主体边界，不以角色类型代替验收。</p>
        <div><span>PAGE</span><strong>{safePage} / {pageCount}</strong></div>
      </section>

      <section
        className={`${styles.wall} ${styles.directorWall} ${pageEntries.length === 1 ? styles.directorSolo : ''}`}
        aria-label="全英雄导演剪辑版构图质检列表"
      >
        {pageEntries.length ? pageEntries.map(entry => (
          <DirectorHeroQaCard
            key={`${entry.heroId}-${renderVersion}`}
            entry={entry}
            renderVersion={renderVersion}
          />
        )) : (
          <div className={styles.empty}><strong>没有匹配的英雄</strong><span>调整筛选条件或搜索词。</span></div>
        )}
      </section>

      <nav className={styles.pagination} aria-label="英雄质检墙分页">
        <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>← 上一页</button>
        <div>{Array.from({ length: pageCount }, (_, index) => index + 1).map(value => (
          <button key={value} type="button" aria-current={safePage === value ? 'page' : undefined} onClick={() => setPage(value)}>{value}</button>
        ))}</div>
        <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>下一页 →</button>
      </nav>
    </main>
  )
}

function DirectorHeroPreviewPage() {
  const heroId = safeText(new URLSearchParams(window.location.search).get('hero'), 'widowmaker')
    .toLocaleLowerCase('en-US')
  const [entry, setEntry] = useState(null)
  const [posterUrl, setPosterUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setError('')
    getDb(SEASON_ID, { preferLocalData: true })
      .then(rawDb => {
        if (!active) return
        const nextEntry = getDirectorHeroEntries(prepareReviewDb(rawDb))
          .find(item => item.heroId === heroId)
        if (!nextEntry) throw new Error(`未找到英雄 ${heroId}`)
        setEntry(nextEntry)
      })
      .catch(err => {
        if (active) setError(err?.message || '英雄预览数据加载失败')
      })

    return () => {
      active = false
    }
  }, [heroId])

  useEffect(() => {
    let active = true
    let generatedUrl = ''
    if (!entry) return undefined

    generatePosterPng(entry.payload, { format: 'directorCut' })
      .then(async url => {
        generatedUrl = url
        if (!active) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) throw new Error('PNG 生成失败')
        const response = await fetch(url)
        const blob = await response.blob()
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(reader.error || new Error('PNG 读取失败'))
          reader.readAsDataURL(blob)
        })
        if (generatedUrl) URL.revokeObjectURL(generatedUrl)
        generatedUrl = ''
        if (active) setPosterUrl(dataUrl)
      })
      .catch(err => {
        if (active) setError(err?.message || 'PNG 生成失败')
      })

    return () => {
      active = false
      if (generatedUrl) URL.revokeObjectURL(generatedUrl)
    }
  }, [entry])

  if (error) {
    return <main className={styles.previewState}><b>DIRECTOR PREVIEW UNAVAILABLE</b><span>{error}</span></main>
  }

  if (!posterUrl || !entry) {
    return <main className={styles.previewState}><b>RENDERING DIRECTOR PREVIEW</b><span>{heroId} · 1920 × 1080</span></main>
  }

  return (
    <main className={styles.directorPreviewOnly} data-hero-id={entry.heroId} data-render-ready="true">
      <img src={posterUrl} alt={`${entry.heroNameEn} 导演剪辑版完整预览`} />
    </main>
  )
}

// A stable contact sheet avoids full-page screenshot stitching while six Canvas
// renders are finishing. The same production PNGs are inspected at share scale.
async function inspectDirectorEmblemBounds(entry) {
  const image = new Image()
  const asset = DIRECTOR_CUT_HERO_EMBLEMS[entry.heroId.replaceAll('-', '_')]
  if (!asset) throw new Error(`${entry.heroId}: missing SVG catalog entry`)
  image.src = `${asset}?v=${entry.profile.stageReview}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || !canvas.width || !canvas.height) throw new Error(`${entry.heroId}: empty SVG`)
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let left = canvas.width
  let top = canvas.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      // Ignore near-transparent authored glow, but preserve all visible strokes.
      if (pixels[(y * canvas.width + x) * 4 + 3] < 28) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left) throw new Error(`${entry.heroId}: SVG has no visible pixels`)
  const profile = entry.profile
  const width = (profile.heroMarkCropWidth ?? 0.5) * canvas.width
  const height = (profile.heroMarkCropHeight ?? 0.68) * canvas.height
  const frameLeft = Math.max(0, Math.min(canvas.width - width, profile.heroMarkAnchorX * canvas.width - width / 2))
  const frameTop = Math.max(0, Math.min(canvas.height - height, profile.heroMarkAnchorY * canvas.height - height / 2))
  const clipped = profile.heroMarkIsolated === true && (
    left < frameLeft - 1 || top < frameTop - 1 || right > frameLeft + width + 1 || bottom > frameTop + height + 1
  )
  return { bounds: [left, top, right, bottom], clipped }
}

function DirectorHeroContactSheetPage() {
  const params = new URLSearchParams(window.location.search)
  const page = Math.max(1, Math.min(DIRECTOR_PAGE_COUNT, Math.floor(Number(params.get('page')) || 1)))
  const cellWidth = params.get('size') === '480' ? 480 : 640
  const [sheet, setSheet] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setSheet('')
    setItems([])
    setError('')
    const render = async () => {
      const db = prepareReviewDb(await getDb(SEASON_ID, { preferLocalData: true }))
      const entries = getDirectorHeroEntries(db).slice((page - 1) * DIRECTOR_PAGE_SIZE, page * DIRECTOR_PAGE_SIZE)
      const imageHeight = cellWidth * 9 / 16
      const rowHeight = imageHeight + 32
      const canvas = document.createElement('canvas')
      canvas.width = cellWidth * 2
      canvas.height = Math.ceil(entries.length / 2) * rowHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Contact sheet Canvas unavailable')
      ctx.fillStyle = '#080909'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const completed = []
      for (const [index, entry] of entries.entries()) {
        if (!active) return
        const emblem = await inspectDirectorEmblemBounds(entry)
        const url = await generatePosterPng(entry.payload, { format: 'directorCut' })
        if (!url) throw new Error(`${entry.heroId}: PNG generation failed`)
        try {
          const image = new Image()
          image.src = url
          await image.decode()
          if (!active) return
          if (!image.naturalWidth || !image.naturalHeight) throw new Error(`${entry.heroId}: empty image`)
          const x = (index % 2) * cellWidth
          const y = Math.floor(index / 2) * rowHeight
          ctx.drawImage(image, x, y, cellWidth, imageHeight)
          ctx.font = '600 14px sans-serif'
          ctx.fillStyle = '#c8bc8b'
          ctx.fillText(`${entry.profile.code}  ${entry.heroNameEn}  /  ${entry.profile.ambientField?.family}`, x + 20, y + imageHeight + 20)
          completed.push({ id: entry.heroId, width: image.naturalWidth, height: image.naturalHeight, ...emblem })
        } finally {
          URL.revokeObjectURL(url)
        }
      }
      if (active) {
        setItems(completed)
        setSheet(canvas.toDataURL('image/png'))
      }
    }
    render().catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [page, cellWidth])

  if (error) return <main className={styles.previewState}><b>CONTACT SHEET ERROR</b><span>{error}</span></main>
  if (!sheet) return <main className={styles.previewState}><b>RENDERING CONTACT SHEET</b><span>PAGE {page} · {cellWidth} × {cellWidth * 9 / 16}</span></main>
  return (
    <main className={styles.directorContactSheet} data-render-ready="true" data-rendered-heroes={JSON.stringify(items)}>
      <img src={sheet} alt={`导演剪辑版逐英雄质检 · 第 ${page} 页 · ${cellWidth} 像素`} />
      <details>
        <summary>SVG 实测边界：{items.length} 张已解码 · {items.filter(item => item.clipped).length} 个裁切警告</summary>
        <ul>{items.map(item => <li key={item.id}>{item.id} · {item.width} × {item.height} · SVG {item.bounds?.join(', ') || '待重绘'} · {item.clipped ? 'CLIPPED' : 'CONTAINED'}</li>)}</ul>
      </details>
      <nav aria-label="联系表分页">
        {Array.from({ length: DIRECTOR_PAGE_COUNT }, (_, index) => index + 1).map(value => (
          <a key={value} href={`?mode=director-sheet&page=${value}&size=${cellWidth}`} aria-current={page === value ? 'page' : undefined}>{value}</a>
        ))}
        <a href={`?mode=director-sheet&page=${page}&size=${cellWidth === 480 ? 640 : 480}`}>{cellWidth === 480 ? '640px 检查' : '480px 分享检查'}</a>
        <a href="?mode=director-heroes">返回英雄质检墙</a>
      </nav>
    </main>
  )
}

export default function ReviewPosterQaPage() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'director-preview') return <DirectorHeroPreviewPage />
  if (mode === 'director-sheet') return <DirectorHeroContactSheetPage />
  if (mode === 'director-heroes') return <DirectorHeroQaPage />
  return <TeamPosterQaPage />
}
