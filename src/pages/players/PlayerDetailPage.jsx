import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
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
import SignalPlayerDossier from '../../features/player-dossier/SignalPlayerDossier.jsx'
import SeasonRating from '../../features/rating/SeasonRating.jsx'
import { formatSeasonRatingValue, formatSeasonSampleRequirements, getSeasonRatingLabel, getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import { getShareHeroArtwork } from '../../features/player-share/heroShareArtworkResolver.js'
import {
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
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { getLocationPath, getSavedReturnScroll, getRestoreScrollState, getRestoreScrollY, readReturnState, restoreWindowScroll } from '../../lib/navigationState.js'
import { getMySpaceReturnLabel } from '../../lib/mySpaceNavigation.js'
import { formatOwHeroName, formatOwMapName, formatOwNamesInText } from '../../lib/heroes.js'
import styles from './PlayerDetailPage.module.css'

function getRoleClass(role) {
  const normalized = normalizeLeaderboardRole(role)
  if (normalized === 'TANK') return styles.roleTank
  if (normalized === 'DPS') return styles.roleDps
  if (normalized === 'SUPPORT') return styles.roleSupport
  return styles.roleFlex
}

function roleDisplay(role, locale = 'zh-CN') {
  const normalized = normalizeLeaderboardRole(role)
  if (locale === 'en-US') return normalized || 'ROLE'
  return uiText(getRoleLabel(normalized), locale)
}

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function formatMinutesLabel(value) {
  const minutes = Math.max(0, Math.round(Number(value) || 0))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatHeroLabel(value, locale) {
  const text = String(value || '').trim()
  if (!text || text === '-' || text === '—') return text
  return text.split(/\s*\/\s*/).map(hero => formatOwHeroName(hero, locale)).join(' / ')
}

function PlayerArtwork({ heroName, role, alt, className = '' }) {
  const artwork = useMemo(() => getShareHeroArtwork(heroName, role), [heroName, role])
  const [src, setSrc] = useState(artwork.src || artwork.fallbackSrc || '')

  useEffect(() => {
    setSrc(artwork.src || artwork.fallbackSrc || '')
  }, [artwork.fallbackSrc, artwork.src])

  if (!src) return null

  const crop = artwork.crop || {}
  const transform = `translate(${crop.translateX || 0}%, ${crop.translateY || 0}%) scale(${crop.scale || 1})`

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      style={{ objectPosition: crop.objectPosition || '50% 50%', transform }}
      onError={() => {
        if (artwork.fallbackSrc && src !== artwork.fallbackSrc) setSrc(artwork.fallbackSrc)
        else setSrc('')
      }}
    />
  )
}

function HeroThumb({ heroName, role, locale = 'zh-CN' }) {
  return (
    <div className={styles.heroThumb} data-role={normalizeLeaderboardRole(role)}>
      {heroName ? (
        <HeroArtwork hero={heroName} variant="roster" className={styles.heroThumbArtwork} locale={locale} />
      ) : <span>{String(heroName || 'FC').slice(0, 2).toUpperCase()}</span>}
    </div>
  )
}

function RadarTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className={styles.chartTooltip}>
      <strong>{data.subject}</strong>
      <span>{copy(locale, uiText("选手", locale), 'Player')}：{data.available ? `P${data.percentile}` : copy(locale, uiText("样本不足", locale), 'Limited sample')}</span>
      <span>{copy(locale, uiText("参考：同职责中位", locale), 'Reference: role median')}</span>
      {data.rawPlayer ? <em>{data.rawPlayer}</em> : null}
    </div>
  )
}

function SectionHeading({ kicker, title, meta, action }) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <span className={styles.sectionKicker}>{kicker}</span>
        <h2>{title}</h2>
        {meta ? <p>{meta}</p> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  )
}

function RoleTabs({ dossier, activeView, onChange, locale = 'zh-CN' }) {
  const totalMaps = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.maps || 0), 0)
  const totalMinutes = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.timeMins || 0), 0)
  const tabs = [
    ...(dossier.roles.length > 1 ? [{
      id: 'overview',
      label: copy(locale, uiText("综合档案", locale), 'Overview'),
      metric: `${totalMaps} MAPS`,
      detail: formatMinutesLabel(totalMinutes),
      role: ''
    }] : []),
    ...dossier.roleEntries.map(item => ({
      id: item.role,
      label: roleDisplay(item.role, locale),
      metric: `${getSeasonRatingLabel(item.entry, locale)} ${formatSeasonRatingValue(item.entry)}`,
      detail: `${item.summary.maps} MAPS · ${item.summary.timeLabel}`,
      role: item.role
    }))
  ]

  return (
    <nav className={styles.roleTabs} aria-label={copy(locale, uiText("选手职责", locale), 'Player roles')}>
      <div className={styles.roleTabsLabel} aria-hidden="true">
        <span>SELECT FILE</span>
        <b>{String(tabs.length).padStart(2, '0')}</b>
      </div>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.roleTab} ${tab.role ? getRoleClass(tab.role) : styles.roleFlex} ${activeView === tab.id ? styles.roleTabActive : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={activeView === tab.id ? 'page' : undefined}
        >
          <b>{String(index + 1).padStart(2, '0')}</b>
          <span>
            <strong>{tab.label}</strong>
            <small>{tab.detail}</small>
          </span>
          <em>{tab.metric}</em>
        </button>
      ))}
    </nav>
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
  const primaryRoleEntry = dossier.isOverview
    ? [...dossier.roleEntries].sort((a, b) => Number(b.summary.timeMins || 0) - Number(a.summary.timeMins || 0))[0]
    : null
  const summary = primaryRoleEntry?.summary || analysis.summary
  const ratingEntry = primaryRoleEntry?.entry || analysis.entry
  const heroPool = primaryRoleEntry?.heroPool || analysis.heroPool
  const topHero = heroPool[0]?.hero || summary.primaryHero
  const topHeroLabel = topHero ? formatOwHeroName(topHero, locale) : ''
  const teamPath = identity.teamRouteId ? withSeason(`/teams/${encodeURIComponent(identity.teamRouteId)}`) : ''
  const overviewMaps = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.maps || 0), 0)
  const overviewMinutes = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.timeMins || 0), 0)
  const displayedMaps = dossier.isOverview ? overviewMaps : summary.maps
  const displayedTime = dossier.isOverview ? formatMinutesLabel(overviewMinutes) : summary.timeLabel
  const fileNumber = String(identity.playerId || '').split('-').pop() || '0000'
  const compactIdentityName = Array.from(String(identity.displayName || '')).length > 11
  const roleLabel = dossier.isOverview
    ? copy(locale, '综合档案', 'OVERVIEW')
    : roleDisplay(summary.role, locale)

  return (
    <section className={`${styles.hero} ${getRoleClass(summary.role)}`}>
      <article className={styles.heroIdentity}>
        <header className={styles.identityHeader}>
          <span><i /> PLAYER DOSSIER</span>
          <b>#{fileNumber}</b>
        </header>
        <div className={styles.identityBody}>
          <span className={styles.teamLine}>{identity.teamShort} / {identity.teamFull}</span>
          <h1 className={compactIdentityName ? styles.compactIdentityName : ''}>{identity.displayName}</h1>
          {identity.battleTag ? <p className={styles.battleTag}>{identity.battleTag}</p> : null}
          <p className={styles.identitySummary}>
            {copy(
              locale,
              uiText("{0}职责 · {1} 张地图 · {2} 记录时长", locale, [roleDisplay(summary.role, locale), displayedMaps, displayedTime]),
              `${roleDisplay(summary.role, locale)} · ${displayedMaps} maps · ${displayedTime} recorded`
            )}
          </p>
          <div className={styles.heroTags}>
            <span>{roleLabel}</span>
            {dossier.isOverview ? <span>{copy(locale, uiText("主职责", locale), 'Primary role')} / {roleDisplay(summary.role, locale)}</span> : null}
            <span>{topHeroLabel ? `${copy(locale, '主力', 'Primary')} / ${topHeroLabel}` : copy(locale, uiText("英雄记录待写入", locale), 'Hero record pending')}</span>
          </div>
        </div>
        <footer className={styles.heroActions}>
          <button type="button" onClick={onFavorite} disabled={favoriteDisabled}>
            {favoriteLabel}
          </button>
          {teamPath ? <Link to={teamPath}>{copy(locale, uiText("查看战队", locale), 'View team')}</Link> : null}
          <button type="button" onClick={onExport} className={styles.secondaryAction}>
            {copy(locale, uiText("导出分享图", locale), 'Export card')}
          </button>
        </footer>
      </article>

      <figure className={styles.heroVisual}>
        <div className={styles.heroVisualGrid} aria-hidden="true" />
        {!topHero ? (
          <div className={`${styles.heroSignalGhost} ${styles.heroSignalGhostVisible}`} aria-hidden="true">
            <span><i /> HERO SIGNAL // 00</span>
            <strong>{copy(locale, uiText("暂无英雄数据", locale), 'NO HERO DATA')}</strong>
            <em>{copy(locale, uiText("等待比赛记录写入", locale), 'AWAITING MATCH RECORD')}</em>
          </div>
        ) : null}
        {topHero ? (
          <HeroArtwork
            hero={topHero}
            variant="spotlight"
            className={styles.heroArtwork}
            decorative
            priority
            locale={locale}
          />
        ) : null}
        <div className={styles.heroShade} aria-hidden="true" />
        <span className={styles.heroRoleFlag}>{roleDisplay(summary.role, locale)} / {normalizeLeaderboardRole(summary.role)}</span>
        <figcaption>
          <span>{copy(locale, uiText("主力英雄记录", locale), 'PRIMARY HERO RECORD')}</span>
          <strong>{topHeroLabel || copy(locale, uiText("等待数据", locale), 'PENDING')}</strong>
        </figcaption>
      </figure>

      <aside className={styles.ratingDock}>
        <header className={styles.ratingHeader}>
          <span>FCR26 / PLAYER FILE</span>
          <b>{roleLabel}</b>
        </header>
        <div className={styles.ratingCore}>
          <span className={styles.ratingLabel}>{dossier.isOverview && summary.eligible ? 'PRIMARY ROLE OVR' : getSeasonRatingLabel(ratingEntry, locale)}</span>
          <SeasonRating entry={ratingEntry} locale={locale} variant="large" />
          <p>{summary.eligible ? summary.rankLabel : getSeasonRatingStatusLabel(ratingEntry, locale)}</p>
        </div>
        <div className={styles.ratingFacts}>
          <span>
            <b>{displayedTime}</b>
            {copy(locale, uiText("职责记录时长", locale), 'Role-record time')}
          </span>
          <span>
            <b>{dossier.isOverview ? dossier.roles.length : (summary.eligible ? summary.scorePercentileLabel : '—')}</b>
            {dossier.isOverview ? copy(locale, uiText("有记录职责", locale), 'Recorded roles') : copy(locale, uiText("同职责分位", locale), 'Role percentile')}
          </span>
        </div>
        <footer className={styles.ratingFooter}>
          <small>{dossier.isOverview
            ? copy(locale, uiText("OVR 与排名取主职责独立样本，职责间不混算。", locale), 'OVR and rank use the independent primary-role sample.')
            : formatSeasonSampleRequirements(dossier.minTimeMins, locale)}</small>
          <b aria-hidden="true">↘</b>
        </footer>
      </aside>
    </section>
  )
}

function OverviewPanel({ dossier, onChange, withSeason, locale = 'zh-CN' }) {
  const totalMaps = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.maps || 0), 0)
  const totalMinutes = dossier.roleEntries.reduce((sum, item) => sum + Number(item.summary.timeMins || 0), 0)
  const rankedRoles = dossier.roleEntries.filter(item => item.summary.eligible).length
  const primaryRole = [...dossier.roleEntries]
    .sort((a, b) => Number(b.summary.timeMins || 0) - Number(a.summary.timeMins || 0))[0]
  const primaryRoleShare = totalMinutes
    ? Math.round((Number(primaryRole?.summary.timeMins || 0) / totalMinutes) * 100)
    : 0
  const roleProfileLabel = primaryRoleShare >= 80
    ? copy(locale, '单职责专精型', 'Role specialist')
    : primaryRoleShare >= 60
      ? copy(locale, '主职责倾向型', 'Primary-role leaning')
      : copy(locale, '多职责轮换型', 'Multi-role rotation')

  const heroPortfolio = Array.from(dossier.roleEntries.reduce((portfolio, item) => {
    item.heroPool.forEach(hero => {
      const key = String(hero.hero || '').trim().toLowerCase()
      if (!key) return
      const existing = portfolio.get(key) || {
        hero: hero.hero,
        minutes: 0,
        maps: 0,
        roles: new Set()
      }
      existing.minutes += Number(hero.minutes || 0)
      existing.maps += Number(hero.maps || 0)
      existing.roles.add(item.role)
      portfolio.set(key, existing)
    })
    return portfolio
  }, new Map()).values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6)

  const totalHeroMinutes = heroPortfolio.reduce((sum, hero) => sum + hero.minutes, 0)
  const recentPortfolio = Array.from(dossier.roleEntries.reduce((matches, item) => {
    item.recentMatches.forEach(match => {
      if (!matches.has(match.matchId)) matches.set(match.matchId, { ...match, role: item.role })
    })
    return matches
  }, new Map()).values())
    .sort((a, b) => Number(b.sortValue || 0) - Number(a.sortValue || 0))
    .slice(0, 5)

  return (
    <section className={styles.overviewPanel}>
      <SectionHeading
        kicker="ROLE FILES"
        title={copy(locale, uiText("职责轨迹", locale), 'Role portfolio')}
        meta={copy(locale, '每个职责独立计算样本、排名和赛季表现，避免跨职责混算。', 'Each role keeps an independent sample, rank and season profile.')}
        action={(
          <div className={styles.overviewSummary}>
            <span><b>{dossier.roles.length}</b>{copy(locale, uiText("个职责", locale), 'roles')}</span>
            <span><b>{totalMaps}</b>{copy(locale, uiText("张地图", locale), 'maps')}</span>
            <span><b>{rankedRoles}</b>{copy(locale, uiText("个有效排名", locale), 'ranked')}</span>
          </div>
        )}
      />
      <div className={styles.overviewLeadGrid}>
        <article className={`${styles.overviewIdentityCard} ${getRoleClass(primaryRole?.role)}`}>
          <span>SEASON POSITIONING</span>
          <h3>{roleProfileLabel}</h3>
          <p>{primaryRole
            ? copy(
                locale,
                uiText("{0}占职责记录的 {1}%，其余职责作为独立轮换样本，不合并评分。", locale, [roleDisplay(primaryRole.role, locale), primaryRoleShare]),
                `${roleDisplay(primaryRole.role, locale)} accounts for ${primaryRoleShare}% of recorded role time; secondary roles remain independent samples.`
              )
            : copy(locale, uiText("当前尚无足够职责记录。", locale), 'No role sample is available yet.')}</p>
          <div className={styles.overviewIdentityFacts}>
            <span><b>{formatMinutesLabel(totalMinutes)}</b>{copy(locale, uiText("职责记录时长", locale), 'Recorded time')}</span>
            <span><b>{totalMaps}</b>{copy(locale, uiText("职责地图记录", locale), 'Role-map records')}</span>
            <span><b>{heroPortfolio.length}</b>{copy(locale, uiText("主要英雄", locale), 'Key heroes')}</span>
          </div>
        </article>

        <section className={styles.roleMixPanel}>
          <div className={styles.overviewSubhead}>
            <span>ROLE DISTRIBUTION</span>
            <strong>{copy(locale, uiText("职责使用结构", locale), 'Role usage structure')}</strong>
          </div>
          <div className={styles.roleMixList}>
            {dossier.roleEntries.map(item => {
              const share = totalMinutes ? Math.round((Number(item.summary.timeMins || 0) / totalMinutes) * 100) : 0
              return (
                <button key={item.role} type="button" className={getRoleClass(item.role)} onClick={() => onChange(item.role)}>
                  <span>
                    <b>{roleDisplay(item.role, locale)}</b>
                    <em>{item.summary.timeLabel} · {getSeasonRatingLabel(item.entry, locale)} {formatSeasonRatingValue(item.entry)}</em>
                  </span>
                  <strong>{share}%</strong>
                  <i><span style={{ width: `${Math.max(3, share)}%` }} /></i>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className={styles.roleOverviewGrid}>
        {dossier.roleEntries.map((item, index) => {
          const hero = item.heroPool[0]?.hero || item.summary.primaryHero
          return (
            <article key={item.role} className={`${styles.roleOverviewCard} ${getRoleClass(item.role)}`}>
              <div className={styles.roleCardArtwork} aria-hidden="true">
                <PlayerArtwork heroName={hero} role={item.role} alt="" className={styles.roleCardImage} />
              </div>
              <div className={styles.roleCardShade} aria-hidden="true" />
              <div className={styles.roleCardIndex}>{String(index + 1).padStart(2, '0')}</div>
              <span className={styles.roleBadge}>{roleDisplay(item.role, locale)}</span>
              <div className={styles.roleCardBody}>
                <span>{copy(locale, uiText("职责档案", locale), 'ROLE FILE')}</span>
                <strong>{item.summary.primaryHero ? formatOwHeroName(item.summary.primaryHero, locale) : roleDisplay(item.role, locale)}</strong>
                <p>{item.summary.eligible ? item.summary.rankLabel : getSeasonRatingStatusLabel(item.entry, locale)}</p>
              </div>
              <div className={styles.roleCardFacts}>
                <span><SeasonRating entry={item.entry} locale={locale} /></span>
                <span><b>{item.summary.maps}</b>{copy(locale, uiText("地图", locale), 'Maps')}</span>
                <span><b>{item.summary.timeLabel}</b>{copy(locale, uiText("出场时长", locale), 'Time')}</span>
              </div>
              <button type="button" onClick={() => onChange(item.role)}>
                {copy(locale, uiText("进入职责档案", locale), 'Open role file')} <span>→</span>
              </button>
            </article>
          )
        })}
      </div>

      <div className={styles.overviewEvidence}>
        <section className={styles.overviewHeroes}>
          <div className={styles.overviewSubhead}>
            <span>CROSS-ROLE HERO PORTFOLIO</span>
            <strong>{copy(locale, uiText("跨职责英雄谱系", locale), 'Cross-role hero portfolio')}</strong>
          </div>
          {heroPortfolio.length ? (
            <div className={styles.overviewHeroGrid}>
              {heroPortfolio.map(hero => {
                const usage = totalHeroMinutes ? Math.round((hero.minutes / totalHeroMinutes) * 100) : 0
                const roles = Array.from(hero.roles)
                return (
                  <article key={hero.hero}>
                    <HeroThumb heroName={hero.hero} role={roles[0]} locale={locale} />
                    <div>
                      <strong>{formatOwHeroName(hero.hero, locale)}</strong>
                      <span>{roles.map(role => roleDisplay(role, locale)).join(' / ')}</span>
                    </div>
                    <b>{formatMinutesLabel(hero.minutes)}</b>
                    <i><span style={{ width: `${Math.max(4, usage)}%` }} /></i>
                  </article>
                )
              })}
            </div>
          ) : <div className={styles.darkEmpty}>{copy(locale, uiText("暂无英雄使用记录。", locale), 'No hero records yet.')}</div>}
        </section>

        <section className={styles.overviewRecent}>
          <div className={styles.overviewSubhead}>
            <span>RECENT APPEARANCES</span>
            <strong>{copy(locale, uiText("跨职责近期出场", locale), 'Recent appearances')}</strong>
          </div>
          {recentPortfolio.length ? (
            <div className={styles.overviewRecentList}>
              {recentPortfolio.map(match => (
                <Link key={match.matchId} to={withSeason(`/matches/${encodeURIComponent(match.matchId)}`)}>
                  <span>{roleDisplay(match.role, locale)}</span>
                  <div>
                    <strong>vs {match.opponent.short}</strong>
                    <small>{match.dateLabel} · {formatHeroLabel(match.heroLabel, locale)}</small>
                  </div>
                  <b>{match.scoreLabel}</b>
                </Link>
              ))}
            </div>
          ) : <div className={styles.darkEmpty}>{copy(locale, uiText("暂无近期比赛记录。", locale), 'No recent match records.')}</div>}
        </section>
      </div>
    </section>
  )
}

function AnalysisConsole({ analysis, locale = 'zh-CN' }) {
  const summary = analysis.summary
  const roleColor = getRoleColor(summary.role)
  const validRadar = analysis.radarData.some(item => item.available)

  return (
    <section className={`${styles.analysisConsole} ${getRoleClass(summary.role)}`}>
      <SectionHeading
        kicker="PERFORMANCE FINGERPRINT"
        title={copy(locale, uiText("赛季表现指纹", locale), 'Season performance fingerprint')}
        meta={copy(locale, '评分、职责维度与教练观察使用同一职责样本。', 'Rating, role dimensions and coaching notes share the same role sample.')}
      />
      <div className={styles.analysisGrid}>
        <div className={styles.scorePlate}>
          <span>ROLE POSITIONING</span>
          <strong>{summary.eligible ? summary.scorePercentileLabel : '—'}</strong>
          <p>{summary.eligible ? summary.rankLabel : getSeasonRatingStatusLabel(analysis.entry, locale)}</p>
          <div>
            <span><SeasonRating entry={analysis.entry} locale={locale} /></span>
            <span><b>{summary.maps}</b>{copy(locale, uiText("地图", locale), 'Maps')}</span>
            <span><b>{summary.timeLabel}</b>{copy(locale, uiText("出场", locale), 'Time')}</span>
          </div>
        </div>

        <div className={styles.radarPanel}>
          <div className={styles.panelLabel}>
            <span>ROLE RADAR</span>
            <strong>{copy(locale, uiText("选手 vs 同职责中位", locale), 'Player vs role median')}</strong>
          </div>
          <div className={styles.radarCanvas}>
            {validRadar ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analysis.radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid gridType="polygon" stroke="rgba(238,235,225,0.25)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#d8d5cb', fontSize: 11, fontWeight: 800 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip content={<RadarTooltip locale={locale} />} />
                  <Radar name="Role median" dataKey="Avg" stroke="rgba(238,235,225,0.42)" fill="rgba(238,235,225,0.04)" strokeDasharray="4 4" />
                  <Radar name="Player" dataKey="Player" stroke={roleColor} fill={roleColor} fillOpacity={0.24} strokeWidth={3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.inlineEmpty}>{copy(locale, uiText("比赛开始后更新雷达图", locale), 'Radar updates after match data arrives')}</div>
            )}
          </div>
        </div>

        <div className={styles.coachingPanel}>
          <div className={styles.panelLabel}>
            <span>COACHING READOUT</span>
            <strong>{copy(locale, uiText("教练观察", locale), 'Coaching notes')}</strong>
          </div>
          {analysis.scoutingNotes.length ? (
            <div className={styles.coachingNotes}>
              {analysis.scoutingNotes.slice(0, 3).map(note => (
                <article key={note.type}>
                  <span>{formatOwNamesInText(note.type, locale)}</span>
                  <p>{formatOwNamesInText(note.text, locale)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.inlineEmpty}>{copy(locale, uiText("样本不足，暂不生成观察。", locale), 'Not enough data for a readout.')}</div>
          )}
        </div>
      </div>

      {analysis.achievements.length ? (
        <div className={styles.achievementStrip}>
          <span>SEASON HIGHLIGHTS</span>
          {analysis.achievements.map(item => (
            <div key={`${item.label}-${item.value}`}>
              <strong>{formatOwNamesInText(item.label, locale)}</strong>
              {item.value ? <small>{formatOwNamesInText(item.value, locale)}</small> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function CoreStats({ analysis, metricMode, onModeChange, locale }) {
  return (
    <section className={styles.coreStatsSection}>
      <SectionHeading
        kicker="CORE STATS"
        title={copy(locale, uiText("六项核心数据", locale), 'Six core metrics')}
        meta={copy(locale, '展示当前职责的数值、同职责分位与赛事平均。', 'Role values, peer percentiles and tournament averages.')}
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
        {analysis.coreStats.map(stat => {
          const width = stat.percentile === null ? 0 : Math.max(3, Math.min(100, stat.percentile))
          return (
            <article key={stat.id} className={styles.coreStat}>
              <span>{stat.label}</span>
              <strong>{stat.valueLabel}</strong>
              <div className={styles.percentileRow}>
                <small>{stat.percentile === null ? copy(locale, uiText("样本不足", locale), 'Limited sample') : `P${stat.percentile}`}</small>
                <em>{copy(locale, uiText("平均", locale), 'Avg')} {stat.averageLabel}</em>
              </div>
              <div className={styles.percentileTrack}><i style={{ width: `${width}%` }} /></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RecentMatches({ matches, withSeason, playerId, role, locale = 'zh-CN' }) {
  return (
    <section className={styles.recentSection}>
      <SectionHeading
        kicker="ROLE APPEARANCES"
        title={copy(locale, uiText("近期职责出场", locale), 'Recent role appearances')}
        meta={copy(
          locale,
          '仅列当前职责实际登场的比赛；比分为本队整场赛果，右侧为该职责出场合计。',
          "Only matches with recorded role minutes; the score is the team result and the metric is this role's contribution."
        )}
      />
      {matches.length ? (
        <div className={styles.recentList}>
          {matches.map((match, index) => (
            <Link
              key={match.matchId}
              to={withSeason(`/matches/${encodeURIComponent(match.matchId)}?player=${encodeURIComponent(playerId)}&role=${role}`)}
              className={styles.recentRow}
            >
              <span className={styles.recentIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.recentOpponent}>
                <strong>vs {match.opponent.short}</strong>
                <small>
                  {match.dateLabel} · {formatHeroLabel(match.heroLabel, locale)} ·{' '}
                  {copy(locale, uiText("{0} 张地图", locale, [match.mapsPlayed]), `${match.mapsPlayed} maps`)} ·{' '}
                  {formatMinutesLabel(match.minutes)}
                </small>
              </div>
              <div className={styles.recentScore}>
                <small>{copy(locale, uiText("本队整场赛果", locale), 'Team result')}</small>
                <em>{match.scoreLabel}</em>
              </div>
              <div className={styles.recentMetric}>
                <small>{copy(locale, uiText("职责出场合计", locale), 'Role total')}</small>
                <b>{match.coreMetric.label} {match.coreMetric.value}</b>
              </div>
              <i aria-hidden="true">→</i>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.darkEmpty}>{copy(locale, uiText("当前职责暂无比赛记录。", locale), 'No match records for this role.')}</div>
      )}
    </section>
  )
}

function HeroPool({ heroes, role, locale = 'zh-CN' }) {
  const primary = heroes[0]
  const rest = heroes.slice(1, 5)
  const displayedHeroes = heroes.slice(0, 5)

  return (
    <section className={styles.heroPoolSection}>
      <SectionHeading
        kicker="HERO POOL"
        title={copy(locale, uiText("英雄池", locale), 'Hero pool')}
        meta={copy(locale, '主力英雄与职责内轮换结构。', 'Primary pick and role rotation.')}
      />
      {primary ? (
        <>
          <div className={styles.heroUsageStrip}>
            {displayedHeroes.map((hero, index) => (
              <span key={hero.hero} style={{ flexGrow: Math.max(8, Number(hero.usagePct || 0)) }}>
                <i>{String(index + 1).padStart(2, '0')}</i>
                <b>{formatOwHeroName(hero.hero, locale)}</b>
                <em>{hero.usageLabel}</em>
              </span>
            ))}
          </div>
          <div className={styles.heroPoolLayout}>
            <article className={styles.primaryHeroCard}>
              <div className={styles.primaryHeroArtwork} aria-hidden="true">
                <PlayerArtwork heroName={primary.hero} role={role} alt="" className={styles.primaryHeroImage} />
              </div>
              <div className={styles.primaryHeroShade} aria-hidden="true" />
              <span>{copy(locale, uiText("主力英雄", locale), 'Primary hero')}</span>
              <h3>{formatOwHeroName(primary.hero, locale)}</h3>
              <p>{primary.timeLabel} · {primary.usageLabel} · {primary.maps} {copy(locale, uiText("图", locale), 'maps')}</p>
              <strong>{primary.coreMetric.label} {primary.coreMetric.value}</strong>
            </article>
            <div className={styles.secondaryHeroes}>
              {rest.length ? rest.map(hero => (
                <article key={hero.hero} className={styles.secondaryHeroCard}>
                  <HeroThumb heroName={hero.hero} role={role} locale={locale} />
                  <div>
                    <strong>{formatOwHeroName(hero.hero, locale)}</strong>
                    <span>{hero.timeLabel}</span>
                    <small>{hero.usageLabel} · {hero.maps} {copy(locale, uiText("图", locale), 'maps')}</small>
                  </div>
                </article>
              )) : <div className={styles.darkEmpty}>{copy(locale, uiText("暂无更多英雄记录。", locale), 'No more hero records.')}</div>}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.darkEmpty}>{copy(locale, uiText("当前职责暂无英雄池数据。", locale), 'No hero-pool data for this role.')}</div>
      )}
    </section>
  )
}

function EvidenceDeck(props) {
  if (Number(props.sampleMaps || 0) < 3) {
    return <LimitedSampleEvidence {...props} />
  }

  return (
    <div className={styles.evidenceDeck}>
      <RecentMatches {...props} />
      <HeroPool heroes={props.heroes} role={props.role} locale={props.locale} />
    </div>
  )
}

function LimitedSampleEvidence({ matches, heroes, withSeason, playerId, role, summary, locale = 'zh-CN' }) {
  return (
    <section className={`${styles.limitedEvidence} ${getRoleClass(role)}`}>
      <SectionHeading
        kicker="LIMITED SAMPLE"
        title={copy(locale, uiText("有限样本摘要", locale), 'Limited-sample brief')}
        meta={copy(locale, '当前职责记录不足 3 张地图，合并展示比赛与英雄证据，暂不形成稳定趋势。', 'Fewer than three recorded maps; match and hero evidence are combined without claiming a stable trend.')}
        action={(
          <div className={styles.limitedSampleFacts}>
            <span><b>{summary?.maps || 0}</b>{copy(locale, uiText("张地图", locale), 'maps')}</span>
            <span><b>{summary?.timeLabel || '0m'}</b>{copy(locale, uiText("记录时长", locale), 'recorded')}</span>
            <span><b>{heroes.length}</b>{copy(locale, uiText("名英雄", locale), 'heroes')}</span>
          </div>
        )}
      />
      <div className={styles.limitedEvidenceGrid}>
        <div className={styles.limitedMatches}>
          <div className={styles.overviewSubhead}>
            <span>MATCH EVIDENCE</span>
            <strong>{copy(locale, uiText("已记录比赛", locale), 'Recorded matches')}</strong>
          </div>
          {matches.length ? matches.map((match, index) => (
            <Link
              key={match.matchId}
              to={withSeason(`/matches/${encodeURIComponent(match.matchId)}?player=${encodeURIComponent(playerId)}&role=${role}`)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>vs {match.opponent.short}</strong>
                <small>{match.dateLabel} · {formatHeroLabel(match.heroLabel, locale)}</small>
              </div>
              <b>{match.scoreLabel}</b>
              <em>{match.coreMetric.label} {match.coreMetric.value}</em>
            </Link>
          )) : <div className={styles.darkEmpty}>{copy(locale, uiText("当前职责暂无比赛记录。", locale), 'No match records for this role.')}</div>}
        </div>

        <div className={styles.limitedHeroes}>
          <div className={styles.overviewSubhead}>
            <span>HERO EVIDENCE</span>
            <strong>{copy(locale, uiText("英雄使用记录", locale), 'Hero usage records')}</strong>
          </div>
          {heroes.length ? heroes.slice(0, 4).map(hero => (
            <article key={hero.hero}>
              <HeroThumb heroName={hero.hero} role={role} locale={locale} />
              <div>
                <strong>{formatOwHeroName(hero.hero, locale)}</strong>
                <span>{hero.timeLabel} · {hero.maps} {copy(locale, uiText("图", locale), 'maps')}</span>
              </div>
              <b>{hero.usageLabel}</b>
            </article>
          )) : <div className={styles.darkEmpty}>{copy(locale, uiText("当前职责暂无英雄记录。", locale), 'No hero records for this role.')}</div>}
        </div>
      </div>
      <footer>
        <span>{copy(locale, uiText("解读边界", locale), 'Interpretation boundary')}</span>
        <p>{copy(locale, uiText("仅陈列已发生的选择与结果；达到排名门槛后，页面会自动切换为完整分析视图。", locale), 'Only observed picks and results are shown. The full analysis layout activates automatically after the ranking threshold is reached.')}</p>
      </footer>
    </section>
  )
}

function MapPerformance({ rows, mapMetric, onMetricChange, withSeason, locale = 'zh-CN' }) {
  const metric = PLAYER_MAP_METRICS.find(item => item.id === mapMetric) || PLAYER_MAP_METRICS[0]
  const scoredRows = rows.filter(row => Number.isFinite(Number(row.value)))
  const highest = scoredRows.reduce((best, row) => (!best || Number(row.value) > Number(best.value) ? row : best), null)
  const lowest = scoredRows.reduce((worst, row) => (!worst || Number(row.value) < Number(worst.value) ? row : worst), null)
  const heroCoverage = new Set(rows.map(row => String(row.hero || '').trim()).filter(Boolean)).size
  return (
    <section className={styles.mapSection}>
      <SectionHeading
        kicker="MAP PERFORMANCE"
        title={copy(locale, uiText("地图表现", locale), 'Map performance')}
        meta={copy(locale, '逐图查看英雄选择与核心指标，不使用平滑趋势。', 'Map-by-map hero picks and core metrics without smoothing.')}
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
        <>
          <div className={styles.mapInsightStrip}>
            <article className={styles.mapInsightPrimary}>
              <span>{copy(locale, uiText("当前指标高点", locale), 'Metric high')}</span>
              <strong>{highest ? formatOwMapName(highest.mapName, locale) : '—'}</strong>
              <b>{highest?.valueLabel || '—'} {metric.label}</b>
            </article>
            <article>
              <span>{copy(locale, uiText("当前指标低点", locale), 'Metric low')}</span>
              <strong>{lowest ? formatOwMapName(lowest.mapName, locale) : '—'}</strong>
              <b>{lowest?.valueLabel || '—'} {metric.label}</b>
            </article>
            <article>
              <span>{copy(locale, uiText("地图样本", locale), 'Map samples')}</span>
              <strong>{rows.length}</strong>
              <b>{copy(locale, uiText("逐图正式记录", locale), 'official map records')}</b>
            </article>
            <article>
              <span>{copy(locale, uiText("英雄覆盖", locale), 'Hero coverage')}</span>
              <strong>{heroCoverage}</strong>
              <b>{copy(locale, uiText("当前职责使用英雄", locale), 'heroes used in this role')}</b>
            </article>
          </div>
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
        </>
      ) : (
        <div className={styles.lightEmpty}>{copy(locale, uiText("当前职责暂无地图表现数据。", locale), 'No map performance data for this role.')}</div>
      )}
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
    togglePlayerFavorite,
    isKprHybridDesign = false
  } = useOutletContext()
  const { playerId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceReturn = readReturnState(location.state, { allowedPrefixes: ['/roster', '/matches', '/teams', '/players', '/leaderboard', '/heroes', '/maps', '/me', '/following'] })
  const backLabel = getMySpaceReturnLabel(sourceReturn.returnTo, locale) || (sourceReturn.returnTo.startsWith('/matches/') ? copy(locale, '返回比赛战报', 'Back to match')
    : sourceReturn.returnTo.startsWith('/roster') ? copy(locale, '返回阵容总览', 'Back to roster overview')
    : sourceReturn.returnTo.startsWith('/teams/') ? copy(locale, '返回队伍档案', 'Back to team')
    : /^\/teams(?:[?#]|$)/.test(sourceReturn.returnTo) ? copy(locale, '返回参赛队伍', 'Back to teams')
    : sourceReturn.returnTo.startsWith('/leaderboard') ? copy(locale, '返回选手排行', 'Back to rankings')
    : sourceReturn.returnTo.startsWith('/maps') ? copy(locale, '返回地图档案', 'Back to map')
    : sourceReturn.returnTo.startsWith('/heroes') ? copy(locale, '返回英雄档案', 'Back to hero')
      : copy(locale, '返回选手列表', 'Back to players'))
  const roleParam = normalizeLeaderboardRole(searchParams.get('role'))
  const [metricMode, setMetricMode] = useState('per10')
  const [mapMetric, setMapMetric] = useState('dmg')
  const [shareOpen, setShareOpen] = useState(false)
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)

  useEffect(() => {
    if (restoreScrollY !== null) restoreWindowScroll(restoreScrollY)
    else window.scrollTo(0, 0)
  }, [playerId, location.pathname, restoreScrollY])

  const dossier = useMemo(
    () => getPlayerDossier(db, playerId, roleParam, season),
    [db, playerId, roleParam, season]
  )

  const activeRoleData = dossier?.selectedRoleData || null
  const analysis = useMemo(() => {
    if (isKprHybridDesign || !db || !dossier || !activeRoleData) return null
    return getPlayerRoleAnalysis(db, dossier.basePlayer, activeRoleData.entry, season, metricMode, mapMetric)
  }, [activeRoleData, db, dossier, isKprHybridDesign, mapMetric, metricMode, season])

  const playerFavorited = dossier ? Boolean(isFavoritePlayer?.(dossier.basePlayer)) : false
  const playerFavoriteLimitReached = dossier && !playerFavorited && (favorites?.favoritePlayerIds?.length || 0) >= (favoriteLimits?.players || 12)

  const handleBack = () => {
    if (sourceReturn.returnTo) {
      const parentReturn = readReturnState({ returnTo: location.state?.parentReturnTo, returnScrollY: location.state?.parentReturnScrollY }, { allowedPrefixes: ['/roster', '/matches', '/teams', '/players', '/leaderboard', '/heroes', '/maps', '/me', '/following'] })
      navigate(sourceReturn.returnTo, { state: { ...getRestoreScrollState(sourceReturn.returnScrollY), ...(parentReturn.returnTo ? parentReturn : {}) } })
      return
    }
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(withSeason('/players'))
  }

  const handleViewChange = view => {
    const next = new URLSearchParams(searchParams)
    if (view === 'overview') next.delete('role')
    else next.set('role', view)
    setSearchParams(next, { state: location.state })
  }

  if (!dossier || (!isKprHybridDesign && !analysis)) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <span>{copy(locale, uiText("选手档案", locale), 'Player Profile')}</span>
          <h1>{copy(locale, uiText("未找到该选手档案", locale), 'Player profile not found')}</h1>
          <p>{copy(locale, uiText("请求的选手编号不存在，或当前赛季记录尚未载入。", locale), 'The requested player is not available in the current season records.')}</p>
          <button type="button" onClick={handleBack}>{backLabel}</button>
        </section>
      </div>
    )
  }

  if (isKprHybridDesign) return <SignalPlayerDossier
    db={db} dossier={dossier} season={season} seasonId={seasonId} locale={locale} updatedAtText={updatedAtText}
    onBack={handleBack} backLabel={backLabel} onFavorite={() => togglePlayerFavorite?.(dossier.basePlayer)}
    favorited={playerFavorited} favoriteDisabled={playerFavoriteLimitReached}
  />

  return (
    <div className={styles.shell}>
      <div className={styles.pageTopline}>
        <button type="button" onClick={handleBack}>← {backLabel}</button>
        <span>{t('player.detail.title', copy(locale, uiText("选手档案", locale), 'Player dossier'))} / {dossier.identity.playerId}</span>
      </div>

      <DossierHero
        dossier={dossier}
        analysis={analysis}
        withSeason={withSeason}
        onExport={() => setShareOpen(true)}
        onFavorite={() => togglePlayerFavorite?.(dossier.basePlayer)}
        favoriteLabel={playerFavorited
          ? copy(locale, '取消关注', 'Unfollow')
          : playerFavoriteLimitReached
            ? copy(locale, '关注已满', 'Limit reached')
            : copy(locale, '关注选手', 'Follow player')}
        favoriteDisabled={playerFavoriteLimitReached}
        locale={locale}
      />

      <RoleTabs dossier={dossier} activeView={dossier.selectedView} onChange={handleViewChange} locale={locale} />

      <main className={styles.dossierBody}>
        {dossier.isOverview ? (
          <OverviewPanel dossier={dossier} onChange={handleViewChange} withSeason={withSeason} locale={locale} />
        ) : (
          <>
            <AnalysisConsole analysis={analysis} locale={locale} />
            <CoreStats analysis={analysis} metricMode={metricMode} onModeChange={setMetricMode} locale={locale} />
            <EvidenceDeck
              matches={analysis.recentMatches}
              heroes={analysis.heroPool}
              sampleMaps={analysis.summary.maps}
              summary={analysis.summary}
              withSeason={withSeason}
              playerId={dossier.identity.playerId}
              role={analysis.summary.role}
              locale={locale}
            />
            <MapPerformance
              rows={analysis.mapPerformance}
              mapMetric={mapMetric}
              onMetricChange={setMapMetric}
              withSeason={withSeason}
              locale={locale}
            />
          </>
        )}
      </main>

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
