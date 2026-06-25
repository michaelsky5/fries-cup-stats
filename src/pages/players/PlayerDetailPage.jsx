import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import PlayerShareDialog from '../../features/player-share/PlayerShareDialog.jsx'
import {
  getHeroAvatarSrc,
  getRoleColor,
  getRoleLabel,
  normalizeLeaderboardRole
} from '../../lib/leaderboardSelectors.js'
import {
  PLAYER_MAP_METRICS,
  PLAYER_METRIC_MODES,
  getPlayerDossier,
  getPlayerRoleAnalysis
} from '../../lib/playerDetailSelectors.js'
import { formatOwHeroName, formatOwMapName, formatOwNamesInText } from '../../lib/heroes.js'
import styles from './PlayerDetailPage.module.css'

function getRoleClass(role) {
  const normalized = normalizeLeaderboardRole(role)
  if (normalized === 'TANK') return styles.roleTank
  if (normalized === 'DPS') return styles.roleDps
  if (normalized === 'SUPPORT') return styles.roleSupport
  return styles.roleFlex
}

function roleDisplay(role) {
  const normalized = normalizeLeaderboardRole(role)
  return normalized === 'SUPPORT' ? 'SUPPORT' : normalized || 'ROLE'
}

function formatHeroLabel(value, locale) {
  const text = String(value || '').trim()
  if (!text || text === '-' || text === '—') return text
  return text.split(/\s*\/\s*/).map(hero => formatOwHeroName(hero, locale)).join(' / ')
}

function HeroPortrait({ heroName, role, initials, large = false, locale = 'zh-CN' }) {
  const [failed, setFailed] = useState(false)
  const src = heroName ? getHeroAvatarSrc(heroName, role) : ''
  const displayName = formatOwHeroName(heroName, locale)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={`${styles.portrait} ${large ? styles.portraitLarge : ''}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={displayName}
          className={styles.portraitImg}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

function HeroThumb({ heroName, role, locale = 'zh-CN' }) {
  const [failed, setFailed] = useState(false)
  const src = heroName ? getHeroAvatarSrc(heroName, role) : ''
  const displayName = formatOwHeroName(heroName, locale)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={styles.heroThumb}>
      {src && !failed ? (
        <img src={src} alt={displayName} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{String(heroName || 'FC').slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className={styles.chartTooltip}>
      <strong>{data.subject}</strong>
      <span>选手：{data.available ? `P${data.percentile}` : '样本不足'}</span>
      <span>参考：同职责中位</span>
      {data.rawPlayer ? <em>{data.rawPlayer}</em> : null}
    </div>
  )
}

function SectionHeading({ kicker, title, meta, action }) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <div className={styles.sectionKicker}>
          <span>{kicker}</span>
          <i aria-hidden="true" />
        </div>
        <h2>{title}</h2>
        {meta ? <p>{meta}</p> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  )
}

function RoleTabs({ roles, activeView, onChange }) {
  const showOverview = roles.length > 1
  const tabs = [
    ...(showOverview ? [{ id: 'overview', label: '综合资料', en: 'OVERVIEW' }] : []),
    ...roles.map(role => ({ id: role, label: roleDisplay(role), en: getRoleLabel(role) }))
  ]

  return (
    <nav className={styles.roleTabs} aria-label="选手职责">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={activeView === tab.id ? styles.roleTabActive : ''}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          <small>{tab.en}</small>
        </button>
      ))}
    </nav>
  )
}

function OverviewPanel({ dossier, onChange }) {
  return (
    <section className={styles.overviewPanel}>
      <SectionHeading
        kicker="ROLE FILES"
        title="综合资料"
        meta="不同职责的出场时间、地图数、数据评分和正式排名分开记录。"
      />
      <div className={styles.roleOverviewGrid}>
        {dossier.roleEntries.map(item => (
          <article key={item.role} className={`${styles.roleOverviewCard} ${getRoleClass(item.role)}`}>
            <div className={styles.roleOverviewTop}>
              <span>{roleDisplay(item.role)}</span>
              <strong>{item.summary.scoreLabel}</strong>
            </div>
            <div className={styles.roleOverviewFacts}>
              <span>
                <b>{item.summary.maps}</b>
                地图
              </span>
              <span>
                <b>{item.summary.timeLabel}</b>
                出场时间
              </span>
              <span>
                <b>{item.summary.rankLabel}</b>
                同职责排名
              </span>
            </div>
            <button type="button" onClick={() => onChange(item.role)}>
              进入 {roleDisplay(item.role)} 档案 →
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function DossierHero({
  dossier,
  analysis,
  withSeason,
  onExport,
  onFavorite,
  favoriteLabel,
  favoriteDisabled,
  locale = 'zh-CN'
}) {
  const { identity } = dossier
  const summary = analysis.summary
  const topHero = analysis.heroPool[0]?.hero || summary.primaryHero
  const primaryHeroName = formatOwHeroName(summary.primaryHero, locale)
  const teamPath = identity.teamRouteId ? withSeason(`/teams/${encodeURIComponent(identity.teamRouteId)}`) : ''
  const isEn = locale === 'en-US'

  return (
    <section className={`${styles.hero} ${getRoleClass(summary.role)}`}>
      <div className={styles.identityBlock}>
        <div className={styles.heroKicker}>
          <span>{isEn ? 'Player Profile' : '选手档案'}</span>
          <i aria-hidden="true" />
        </div>
        <HeroPortrait heroName={topHero} role={summary.role} initials={identity.initials} large locale={locale} />
        <h1>{identity.displayName}</h1>
        {identity.battleTag ? <p className={styles.battleTag}>{identity.battleTag}</p> : null}
        <div className={styles.identityMeta}>
          <span>{identity.teamShort} · {identity.teamFull}</span>
          <span>{dossier.isOverview ? (isEn ? 'Overview' : '综合资料') : roleDisplay(summary.role)}</span>
        </div>
        <div className={styles.heroActions}>
          <button type="button" onClick={onFavorite} disabled={favoriteDisabled}>
            {favoriteLabel}
          </button>
          {teamPath ? <Link to={teamPath}>查看战队 →</Link> : null}
          <button type="button" onClick={onExport} className={styles.textAction}>
            导出分享图 →
          </button>
        </div>
      </div>

      <div className={styles.summaryBlock}>
        <div className={styles.summaryTop}>
          <div>
            <span className={styles.summaryKicker}>CURRENT ROLE</span>
            <h2>{dossier.isOverview ? '综合资料' : roleDisplay(summary.role)}</h2>
          </div>
          <span className={styles.sampleBadge}>
            门槛 {dossier.minTimeMins} 分钟
          </span>
        </div>

        <div className={styles.summaryGrid}>
          <div>
            <span>出场地图</span>
            <strong>{summary.maps}</strong>
          </div>
          <div>
            <span>出场时间</span>
            <strong>{summary.timeLabel}</strong>
          </div>
          <div>
            <span>主力英雄</span>
            <strong>{summary.primaryHero ? primaryHeroName : '—'}</strong>
          </div>
          <div>
            <span>数据评分</span>
            <strong>{summary.scoreLabel}</strong>
          </div>
          <div>
            <span>同职责排名</span>
            <strong>{summary.rankLabel}</strong>
          </div>
          <div>
            <span>排名状态</span>
            <strong>{summary.eligible ? summary.scorePercentileLabel : '样本不足'}</strong>
          </div>
        </div>

        <p className={styles.scoreNotice}>数据评分仅依据赛事统计计算，不代表官方 MVP 评选。</p>
      </div>
    </section>
  )
}

function ScoreRadarPanel({ analysis }) {
  const summary = analysis.summary
  const roleColor = getRoleColor(summary.role)
  const validRadar = analysis.radarData.some(item => item.available)

  return (
    <section className={`${styles.scorePanel} ${getRoleClass(summary.role)}`}>
      <div className={styles.scorePlate}>
        <div className={styles.scoreLabel}>数据评分</div>
        <div className={styles.scoreValue}>{summary.scoreLabel}</div>
        <div className={styles.scoreRank}>
          {summary.eligible ? `${summary.rankLabel} · ${summary.scorePercentileLabel}` : '样本不足 · 不进入正式排名'}
        </div>
        <div className={styles.scoreMeta}>
          <span>{roleDisplay(summary.role)}</span>
          <span>{summary.qualifiedSize} 名有效样本</span>
        </div>
      </div>

      <div className={styles.radarPanel}>
        <div className={styles.radarTitle}>
          <span>ROLE RADAR</span>
          <strong>选手表现 vs 同职责中位</strong>
        </div>
        <div className={styles.radarCanvas}>
          {validRadar ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analysis.radarData} cx="50%" cy="50%" outerRadius="74%">
                <PolarGrid gridType="polygon" stroke="rgba(42,42,42,0.28)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#2a2a2a', fontSize: 12, fontWeight: 900 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<RadarTooltip />} />
                <Radar name="同职责中位" dataKey="Avg" stroke="rgba(42,42,42,0.42)" fill="rgba(42,42,42,0.08)" strokeDasharray="4 4" />
                <Radar name="选手" dataKey="Player" stroke={roleColor} fill={roleColor} fillOpacity={0.2} strokeWidth={3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.inlineEmpty}>比赛开始后更新雷达图</div>
          )}
        </div>
      </div>
    </section>
  )
}

function Achievements({ achievements, locale = 'zh-CN' }) {
  if (!achievements.length) return null
  return (
    <section className={styles.achievementStrip}>
      <span>SEASON ACHIEVEMENTS</span>
      {achievements.map(item => (
        <div key={`${item.label}-${item.value}`}>
          <strong>{formatOwNamesInText(item.label, locale)}</strong>
          {item.value ? <small>{formatOwNamesInText(item.value, locale)}</small> : null}
        </div>
      ))}
    </section>
  )
}

function CoreStats({ analysis, metricMode, onModeChange }) {
  return (
    <section className={styles.coreStatsSection}>
      <SectionHeading
        kicker="CORE STATS"
        title="六项核心数据"
        meta="按游戏内记分板顺序展示，默认使用每 10 分钟。"
        action={(
          <div className={styles.segmented}>
            {PLAYER_METRIC_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                className={metricMode === mode.id ? styles.segmentedActive : ''}
                onClick={() => onModeChange(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}
      />
      <div className={styles.coreStatsBand}>
        {analysis.coreStats.map(stat => (
          <div key={stat.id} className={styles.coreStat}>
            <span>{stat.label}</span>
            <strong>{stat.valueLabel}</strong>
            <small>{stat.percentile === null ? '样本不足' : `同职责 P${stat.percentile}`}</small>
            <em>平均 {stat.averageLabel}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

function RecentMatches({ matches, withSeason, playerId, role, locale = 'zh-CN' }) {
  return (
    <section className={styles.recentSection}>
      <SectionHeading kicker="RECENT MATCHES" title="最近比赛" meta="只统计当前选中职责的比赛记录。" />
      {matches.length ? (
        <div className={styles.recentList}>
          {matches.map(match => (
            <Link
              key={match.matchId}
              to={withSeason(`/matches/${encodeURIComponent(match.matchId)}?player=${encodeURIComponent(playerId)}&role=${role}`)}
              className={styles.recentRow}
            >
              <span>{match.dateLabel}</span>
              <strong>vs {match.opponent.short}</strong>
              <em>{match.scoreLabel}</em>
              <small>{roleDisplay(role)} · {formatHeroLabel(match.heroLabel, locale)}</small>
              <b>{match.coreMetric.label} {match.coreMetric.value}</b>
              <i aria-hidden="true">→</i>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.lightEmpty}>当前职责暂无比赛记录。</div>
      )}
    </section>
  )
}

function HeroPool({ heroes, role, locale = 'zh-CN' }) {
  const primary = heroes[0]
  const rest = heroes.slice(1)
  return (
    <section className={styles.heroPoolSection}>
      <SectionHeading kicker="HERO POOL" title="英雄池" meta="仅统计当前职责下的英雄使用记录。" />
      {primary ? (
        <div className={styles.heroPoolLayout}>
          <article className={styles.primaryHeroCard}>
            <HeroThumb heroName={primary.hero} role={role} locale={locale} />
            <div>
              <span>主力英雄</span>
              <h3>{formatOwHeroName(primary.hero, locale)}</h3>
              <p>{primary.timeLabel} · {primary.usageLabel} · {primary.maps} 张地图</p>
            </div>
            <strong>{primary.coreMetric.label} {primary.coreMetric.value}</strong>
          </article>
          <div className={styles.secondaryHeroes}>
            {rest.length ? rest.map(hero => (
              <article key={hero.hero} className={styles.secondaryHeroCard}>
                <HeroThumb heroName={hero.hero} role={role} locale={locale} />
                <strong>{formatOwHeroName(hero.hero, locale)}</strong>
                <span>{hero.timeLabel}</span>
                <small>{hero.usageLabel} · {hero.maps} 图</small>
              </article>
            )) : <div className={styles.lightEmpty}>暂无更多英雄记录。</div>}
          </div>
        </div>
      ) : (
        <div className={styles.lightEmpty}>当前职责暂无英雄池数据。</div>
      )}
    </section>
  )
}

function MapPerformance({ rows, mapMetric, onMetricChange, withSeason, locale = 'zh-CN' }) {
  const metric = PLAYER_MAP_METRICS.find(item => item.id === mapMetric) || PLAYER_MAP_METRICS[0]
  return (
    <section className={styles.mapSection}>
      <SectionHeading
        kicker="MAP PERFORMANCE"
        title="地图表现"
        meta="每一行对应一张真实地图，不使用平滑趋势线。"
        action={(
          <div className={styles.segmented}>
            {PLAYER_MAP_METRICS.map(item => (
              <button
                key={item.id}
                type="button"
                className={mapMetric === item.id ? styles.segmentedActive : ''}
                onClick={() => onMetricChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      />
      {rows.length ? (
        <div className={styles.mapRows}>
          {rows.map(row => (
            <Link key={row.key} to={withSeason(`/matches/${encodeURIComponent(row.matchId)}`)} className={styles.mapRow}>
              <span className={styles.mapIndex}>{String(row.order).padStart(2, '0')}</span>
              <div className={styles.mapNameBlock}>
                <strong>{formatOwMapName(row.mapName, locale)}</strong>
                <small>vs {row.opponent} · {row.dateLabel}</small>
              </div>
              <div className={styles.mapHero}>{formatOwHeroName(row.hero, locale)}</div>
              <div className={styles.mapBar} aria-label={`${metric.label} ${row.valueLabel}`}>
                <i style={{ width: `${Math.max(4, Math.min(100, (row.value / row.maxValue) * 100))}%` }} />
              </div>
              <b>{row.valueLabel}</b>
              <em>→</em>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.lightEmpty}>当前职责暂无地图表现数据。</div>
      )}
    </section>
  )
}

function ScoutingNotes({ notes, locale = 'zh-CN' }) {
  return (
    <section className={styles.notesSection}>
      <details>
        <summary>
          <span>SCOUTING NOTES</span>
          <strong>数据观察</strong>
          <em>基于赛事统计整理，仅供参考。</em>
        </summary>
        {notes.length ? (
          <div className={styles.notesGrid}>
            {notes.map(note => (
              <article key={note.type}>
                <span>{note.type}</span>
                <p>{formatOwNamesInText(note.text, locale)}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.lightEmpty}>样本不足，暂不展示数据观察。</div>
        )}
      </details>
    </section>
  )
}

export default function PlayerDetailPage() {
  const {
    db,
    season,
    seasonId,
    locale,
    t = (_key, fallback) => fallback,
    updatedAtText,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    isFavoritePlayer,
    togglePlayerFavorite
  } = useOutletContext()
  const { playerId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const roleParam = normalizeLeaderboardRole(searchParams.get('role'))
  const [metricMode, setMetricMode] = useState('per10')
  const [mapMetric, setMapMetric] = useState('dmg')
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [playerId])

  const dossier = useMemo(
    () => getPlayerDossier(db, playerId, roleParam, season),
    [db, playerId, roleParam, season]
  )

  const activeRoleData = dossier?.selectedRoleData || null
  const analysis = useMemo(() => {
    if (!db || !dossier || !activeRoleData) return null
    return getPlayerRoleAnalysis(db, dossier.basePlayer, activeRoleData.entry, season, metricMode, mapMetric)
  }, [activeRoleData, db, dossier, mapMetric, metricMode, season])

  const playerFavorited = dossier ? Boolean(isFavoritePlayer?.(dossier.basePlayer)) : false
  const playerFavoriteLimitReached = dossier && !playerFavorited && (favorites?.favoritePlayerIds?.length || 0) >= (favoriteLimits?.players || 12)

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(withSeason('/players'))
  }

  const handleViewChange = view => {
    const next = new URLSearchParams(searchParams)
    if (view === 'overview') next.delete('role')
    else next.set('role', view)
    setSearchParams(next)
  }

  if (!dossier || !analysis) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <span>{locale === 'en-US' ? 'Player Profile' : '选手档案'}</span>
          <h1>{locale === 'en-US' ? 'Player profile not found' : '未找到该选手档案'}</h1>
          <p>
            {locale === 'en-US'
              ? 'The requested player is not available in the current season records.'
              : '请求的选手编号不存在，或当前赛季记录尚未载入。'}
          </p>
          <button type="button" onClick={handleBack}>
            {locale === 'en-US' ? 'Back to players' : '返回选手列表'}
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.pageTopline}>
        <button type="button" onClick={handleBack}>← 返回选手列表</button>
        <span>{t('player.detail.title', '选手档案')} / {dossier.identity.playerId}</span>
      </div>

      <DossierHero
        dossier={dossier}
        analysis={analysis}
        withSeason={withSeason}
        onExport={() => {
          setShareOpen(true)
        }}
        onFavorite={() => togglePlayerFavorite?.(dossier.basePlayer)}
        favoriteLabel={playerFavorited ? '取消关注' : playerFavoriteLimitReached ? '关注已满' : '关注选手'}
        favoriteDisabled={playerFavoriteLimitReached}
        locale={locale}
      />

      <RoleTabs roles={dossier.roles} activeView={dossier.selectedView} onChange={handleViewChange} />

      {dossier.isOverview ? (
        <OverviewPanel dossier={dossier} onChange={handleViewChange} />
      ) : (
        <>
          <ScoreRadarPanel analysis={analysis} />
          <Achievements achievements={analysis.achievements} locale={locale} />
          <CoreStats analysis={analysis} metricMode={metricMode} onModeChange={setMetricMode} />
          <RecentMatches matches={analysis.recentMatches} withSeason={withSeason} playerId={dossier.identity.playerId} role={analysis.summary.role} locale={locale} />
          <HeroPool heroes={analysis.heroPool} role={analysis.summary.role} locale={locale} />
          <MapPerformance rows={analysis.mapPerformance} mapMetric={mapMetric} onMetricChange={setMapMetric} withSeason={withSeason} locale={locale} />
          <ScoutingNotes notes={analysis.scoutingNotes} locale={locale} />
        </>
      )}

      <PlayerShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        db={db}
        season={season}
        seasonId={seasonId}
        locale={locale}
        playerId={dossier.identity.playerId}
        roleEntries={dossier.roleEntries}
        currentRole={analysis.summary.role}
        updatedAtText={updatedAtText}
      />
    </div>
  )
}
