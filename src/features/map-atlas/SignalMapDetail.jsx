import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import SignalSwitch from '../../components/common/SignalSwitch.jsx'
import { formatOwHeroName, formatOwMapMode, formatOwMapName } from '../../lib/heroes.js'
import { getLocationPath, getRestoreScrollState, getRestoreScrollY, getReturnState, getSavedReturnScroll, readReturnState, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { buildMapAtlas, findAtlasMap, formatMapDuration, HERO_ROLES, mapImageUrl } from './mapAtlasModel.js'
import { Arrow, AtlasEmpty, AtlasImage, AtlasNav, ChapterHeading, HeroPortrait, percent, useAtlasQuery } from './MapAtlasShared.jsx'
import styles from './MapAtlas.module.css'

const ROLE_NAMES = { tank: ['重装', 'Tank'], damage: ['输出', 'Damage'], support: ['支援', 'Support'], other: ['其他', 'Other'] }
const METRIC_NAMES = { eliminations: ['最高消灭', 'Eliminations'], assists: ['最多助攻', 'Assists'], damage: ['最高伤害', 'Damage'], healing: ['最高治疗', 'Healing'], mitigation: ['最高减伤', 'Mitigation'] }

function stageLabel(value, isEn) {
  if (isEn) return value
  return { SWISS: '瑞士轮', LCQ: '突围赛', PLAYOFFS: '季后赛', GROUP: '小组赛', GROUP_STAGE: '小组赛' }[value] || value
}

function roundLabel(value, isEn) {
  if (isEn) return value
  const labels = { 'GRAND FINALS': '总决赛', FINALS: '决赛', SEMIFINALS: '半决赛', QUARTERFINALS: '八强赛', 'PLAY-IN': '入围赛', QUALIFICATION: '资格赛', 'UB QF': '胜者组八强赛', 'UB SF': '胜者组半决赛', 'UB FINAL': '胜者组决赛', 'LB FINAL': '败者组决赛' }
  return labels[value.toUpperCase()] || value.replace(/^ROUND OF\s*(\d+)$/i, '$1 强赛').replace(/^ROUND\s*0?(\d+)$/i, '第 $1 轮').replace(/^LB R(\d+)$/i, '败者组第 $1 轮').replace(/^GROUP\s+(\w+)\s*\/\s*DAY\s+(\d+)$/i, '$1 组 · 第 $2 比赛日')
}

function recordDate(value, locale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'en-US' ? 'en-GB' : 'zh-CN', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(value))
}

function MapEnvironment({ map, locale, onExplore }) {
  const isEn = locale === 'en-US'
  const [params, update] = useAtlasQuery()
  const view = params.get('mapView') === 'lineups' ? 'lineups' : 'heroes'
  const role = [...HERO_ROLES, 'other'].includes(params.get('mapRole')) ? params.get('mapRole') : 'all'
  const lineupKey = params.get('mapComposition') || ''
  const setView = value => update({ mapView: value === 'heroes' ? '' : value })
  const setRole = value => update({ mapRole: value === 'all' ? '' : value })
  const setLineupKey = value => update({ mapComposition: value })
  const lineupButtonRef = useRef(null)
  const roleButtonRefs = useRef({})
  const composition = map.compositions.find(row => row.key === lineupKey) || map.compositions[0]
  const availableRoles = map.heroStats.some(hero => hero.role === 'other') ? [...HERO_ROLES, 'other'] : HERO_ROLES
  const roles = role === 'all' ? availableRoles : [role]
  return <section className={styles.chapter} id="map-environment">
    <ChapterHeading number="01" english="THE HERO ENVIRONMENT" title={isEn ? 'Heroes, then compositions.' : uiText("英雄与阵容。", locale)}>
      <span>{map.heroSamples} {isEn ? 'team-side samples' : uiText("份队伍单图样本", locale)}</span>
    </ChapterHeading>
    <div className={styles.environmentToolbar}>
      <div className={styles.viewSwitch} aria-label={isEn ? 'Environment view' : uiText("英雄环境视图", locale)}>
        <button type="button" aria-pressed={view === 'heroes'} onClick={() => setView('heroes')}>{isEn ? 'Hero presence' : uiText("英雄出场", locale)}</button>
        <button ref={lineupButtonRef} type="button" aria-pressed={view === 'lineups'} onClick={() => setView('lineups')}>{isEn ? 'Compositions' : uiText("阵容组合", locale)}</button>
      </div>
      {view === 'heroes' ? <div className={styles.roleSwitch} aria-label={isEn ? 'Hero role' : uiText("英雄职责", locale)}>
        <button type="button" aria-pressed={role === 'all'} onClick={() => setRole('all')}>{isEn ? 'All roles' : uiText("全部职责", locale)}</button>
        {availableRoles.map(item => <button ref={node => { roleButtonRefs.current[item] = node }} type="button" key={item} aria-pressed={role === item} onClick={() => setRole(item)}>{ROLE_NAMES[item][isEn ? 1 : 0]}</button>)}
      </div> : <span className={styles.muted}>{map.lineupSamples} {isEn ? 'five-hero records' : uiText("个五英雄阵容样本", locale)}</span>}
    </div>
    {view === 'heroes' ? map.heroStats.length ? <>
      <div className={styles.heroColumns} data-single={role !== 'all'}>
        {roles.map(item => {
          const all = map.heroStats.filter(hero => hero.role === item)
          const leader = all[0]
          const visible = role === 'all' ? all.slice(1, 4) : all.slice(1)
          const tied = leader && all[1]?.count === leader.count
          return <div className={styles.heroRoleColumn} key={item}>
            <h3><span>{ROLE_NAMES[item][isEn ? 1 : 0]}</span><small>{all.length} {isEn ? 'heroes' : uiText("位英雄", locale)}</small></h3>
            {leader ? <button type="button" className={styles.roleLeader} onClick={() => onExplore({ type: 'hero', key: leader.key, label: formatOwHeroName(leader.name, locale) })} aria-label={`${formatOwHeroName(leader.name, locale)} · ${percent(leader.rate)} · ${isEn ? 'view matches' : uiText("查看相关比赛", locale)}`}>
              <HeroPortrait name={leader.name} className={styles.leaderPortrait} />
              <span className={styles.leaderIdentity}><small>{tied ? (isEn ? 'Joint most recorded' : uiText("并列出场最多", locale)) : (isEn ? 'Most recorded' : uiText("出场最多", locale))}</small><strong>{formatOwHeroName(leader.name, locale)}</strong><b>{percent(leader.rate)}</b><span>{leader.count} / {map.heroSamples} {isEn ? 'samples' : uiText("份记录", locale)}</span></span>
              <Arrow />
            </button> : <p className={styles.inlineEmpty}>{isEn ? 'No hero records.' : uiText("暂无该职责的英雄记录。", locale)}</p>}
            <div className={styles.roleRunners}>{visible.map(hero => <button type="button" className={styles.heroPresence} key={hero.key} onClick={() => onExplore({ type: 'hero', key: hero.key, label: formatOwHeroName(hero.name, locale) })} aria-label={`${formatOwHeroName(hero.name, locale)} · ${percent(hero.rate)} · ${isEn ? 'view matches' : uiText("查看相关比赛", locale)}`}>
              <HeroPortrait name={hero.name} className={styles.heroAvatar} />
              <span className={styles.heroPresenceInfo}><span><strong>{formatOwHeroName(hero.name, locale)}</strong><b>{percent(hero.rate)}</b></span><span className={styles.heroTrack} aria-hidden="true"><i style={{ width: percent(hero.rate) }} /></span><small>{hero.count} / {map.heroSamples} {isEn ? 'samples' : uiText("样本", locale)}</small></span><Arrow />
            </button>)}</div>
            {role === 'all' && all.length > visible.length + 1 ? <button type="button" className={styles.textButton} onClick={() => { setRole(item); roleButtonRefs.current[item]?.focus() }}>{isEn ? `All ${all.length} heroes` : uiText("查看全部 {0} 位", locale, [all.length])}<Arrow /></button> : null}
          </div>
        })}
      </div>
      {map.compositions.length ? <button className={styles.lineupTeaser} type="button" aria-label={isEn ? 'Explore compositions' : uiText("查看阵容组合", locale)} onClick={() => { setView('lineups'); lineupButtonRef.current?.focus() }}>
        <span className={styles.miniLineup}>{map.compositions[0].heroes.map(hero => <HeroPortrait key={hero.key} name={hero.name} />)}</span>
        <span><strong>{isEn ? 'Explore recorded compositions' : uiText("继续看，英雄如何组成阵容。", locale)}</strong><small>{map.lineupSamples} {isEn ? 'complete samples' : uiText("份完整阵容样本", locale)} · {map.compositions.length} {isEn ? 'distinct combinations' : uiText("种组合", locale)}</small></span><Arrow />
      </button> : null}
      <p className={styles.annotation}>{isEn ? 'Presence = team-side records containing this hero ÷ team-side records with hero data. Select a hero to find the supporting matches.' : uiText("出场率 = 出现该英雄的队伍单图记录数 ÷ 有英雄数据的队伍单图记录数。选择英雄，可查看对应比赛。", locale)}</p>
    </> : <AtlasEmpty title={isEn ? 'Hero records are not available yet' : uiText("尚无英雄统计", locale)}>{isEn ? 'Map results remain available below.' : uiText("仍可在下方查看已发布的地图赛果。", locale)}</AtlasEmpty> : composition ? <div className={styles.compositionLayout}>
      <div className={styles.compositionFeature}>
        <div className={styles.compositionHeadline}><span>{isEn ? 'RECORDED COMPOSITION' : uiText("记录中的阵容", locale)}</span><strong>{composition.count}<small>{isEn ? 'appearances' : uiText("次出现", locale)}</small></strong></div>
        <div className={styles.lineupPortraits}>{composition.heroes.map(hero => <div key={hero.key}><HeroPortrait name={hero.name} /><strong>{formatOwHeroName(hero.name, locale)}</strong><small>{ROLE_NAMES[hero.role]?.[isEn ? 1 : 0] || ''}</small></div>)}</div>
        <p>{percent(composition.share)} {isEn ? 'of complete composition samples' : uiText("的完整阵容样本", locale)}<span>{composition.teamNames.slice(0, 3).join(' / ')}</span></p>
        <button type="button" className={styles.textButton} onClick={() => onExplore({ type: 'lineup', key: composition.key, label: isEn ? 'Selected composition' : uiText("所选阵容", locale) })}>{isEn ? 'Explore its matches' : uiText("查看这套阵容的比赛", locale)}<Arrow down /></button>
      </div>
      <div className={styles.compositionChoices}><span className={styles.eyebrow}>{isEn ? 'MOST RECORDED / TOP 6' : uiText("出现次数 / 前 6 种组合", locale)}</span>{map.compositions.slice(0, 6).map((row, index) => <button type="button" key={row.key} aria-pressed={composition.key === row.key} onClick={() => setLineupKey(row.key)} aria-label={`${isEn ? 'Composition' : uiText("阵容", locale)} ${index + 1}：${row.heroes.map(hero => formatOwHeroName(hero.name, locale)).join('、')}`}>
        <span>{String(index + 1).padStart(2, '0')}</span><span className={styles.miniLineup}>{row.heroes.map(hero => <HeroPortrait key={hero.key} name={hero.name} />)}</span><strong>{row.count}<small>{percent(row.share)}</small></strong>
      </button>)}<p className={styles.annotation}>{isEn ? 'Each sample is the five distinct heroes recorded for one team on one map.' : uiText("每个样本为同一队伍在单张地图记录中的五位不同英雄。", locale)}</p></div>
    </div> : <AtlasEmpty title={isEn ? 'No complete compositions' : uiText("暂无完整阵容样本", locale)}>{isEn ? 'A composition requires five distinct recorded heroes.' : uiText("完整阵容需要一侧队伍记录中包含五位不同英雄。", locale)}</AtlasEmpty>}
  </section>
}

function MapTeams({ map, locale, seasonId, withSeason, onExplore, returnState, onNavigate }) {
  const isEn = locale === 'en-US'
  const [params, update] = useAtlasQuery()
  const sort = params.get('mapTeamSort') === 'plays' ? 'plays' : 'wins'
  const minimum = params.get('mapTeamMinimum') === '2'
  const expanded = params.get('mapTeams') === 'all'
  const rows = map.teams.filter(team => !minimum || team.plays >= 2).sort((a, b) => sort === 'plays' ? b.plays - a.plays || b.wins - a.wins : b.wins - a.wins || b.plays - a.plays)
  const maxPlays = Math.max(1, ...rows.map(team => team.plays))
  return <section className={styles.chapter} id="map-teams">
    <ChapterHeading number="02" english="TEAMS ON THIS GROUND" title={isEn ? 'Every team leaves a record.' : uiText("每支队伍的地图战绩。", locale)}><span>{map.teams.length} {isEn ? 'teams' : uiText("支队伍", locale)}</span></ChapterHeading>
    <div className={styles.teamToolbar}>
      <div className={styles.teamReadingGuide}>
        <p>{isEn ? 'Bar length shows map records. Read wins alongside the sample size.' : uiText("胜场与样本一起看。条形总长代表地图记录数。", locale)}</p>
        <div className={styles.resultLegend}><span><i />{isEn ? 'Win' : uiText("胜", locale)}</span><span><i data-result="loss" />{isEn ? 'Loss' : uiText("负", locale)}</span><span><i data-result="other" />{isEn ? 'Draw / unknown' : uiText("平 / 未知", locale)}</span></div>
      </div>
      <div className={styles.teamControls}>
        <SignalSwitch checked={minimum} onChange={checked => update({ mapTeamMinimum: checked ? '2' : '', mapTeams: '' })}>{isEn ? 'At least 2 map records' : uiText("至少有 2 条地图记录", locale)}</SignalSwitch>
        <select aria-label={isEn ? 'Sort team results' : uiText("战队排序", locale)} value={sort} onChange={event => update({ mapTeamSort: event.target.value })}><option value="wins">{isEn ? 'By wins' : uiText("按胜场", locale)}</option><option value="plays">{isEn ? 'By appearances' : uiText("按记录数", locale)}</option></select>
      </div>
    </div>
    <div className={styles.teamTable}>
        <div className={styles.teamTableHeading} aria-hidden="true"><span>{isEn ? 'TEAM / SAMPLE' : uiText("队伍 / 样本", locale)}</span><span>{isEn ? 'RESULTS' : uiText("地图胜负", locale)}</span><span>{isEn ? 'WIN RATE' : uiText("胜率", locale)}</span><span>{isEn ? 'ON THIS MAP' : uiText("本图比赛", locale)}</span></div>
        {(expanded ? rows : rows.slice(0, 8)).map(team => <div className={styles.teamResult} key={team.key}>
          <div className={styles.teamName}><TeamLogo team={team.record} teamName={team.name} teamShortName={team.short} seasonId={seasonId} className={styles.teamLogo} />{team.id ? <Link to={withSeason(`/teams/${encodeURIComponent(team.id)}`)} state={returnState} onClick={onNavigate}>{team.short}</Link> : <strong>{team.short}</strong>}<small>{team.plays} {isEn ? 'maps' : uiText("图", locale)}{team.plays === 1 ? (isEn ? ' · small sample' : uiText(" · 小样本", locale)) : ''}</small></div>
          <div className={styles.teamResultBars}><div className={styles.resultTrack} style={{ width: percent(team.plays / maxPlays) }} aria-hidden="true"><i style={{ flex: team.wins }} /><i data-result="loss" style={{ flex: team.losses }} /><i data-result="other" style={{ flex: team.draws + team.unknown }} /></div><span>{isEn ? `${team.wins}W · ${team.losses}L` : uiText("{0} 胜 · {1} 负", locale, [team.wins, team.losses])}{team.draws ? ` · ${team.draws} ${isEn ? 'draw' : uiText("平", locale)}` : ''}{team.unknown ? ` · ${team.unknown} ${isEn ? 'unknown' : uiText("未知", locale)}` : ''}</span></div>
          <strong className={styles.teamWinRate}>{team.winRate === null ? '—' : percent(team.winRate, 0)}</strong>
          <button className={styles.teamExplore} type="button" onClick={() => onExplore({ type: 'team', key: team.key, label: team.short })} aria-label={isEn ? `View ${team.short} matches on this map` : uiText("查看 {0} 在本地图的比赛", locale, [team.short])}>{isEn ? 'Matches' : uiText("查看比赛", locale)}<Arrow down /></button>
        </div>)}
        {!rows.length ? <p className={styles.inlineEmpty}>{isEn ? 'No teams meet this sample size.' : uiText("暂无队伍达到该样本数。", locale)}</p> : null}
        {rows.length > 8 ? <button type="button" className={styles.expandButton} onClick={() => update({ mapTeams: expanded ? '' : 'all' })}>{expanded ? (isEn ? 'Show fewer teams' : uiText("收起队伍", locale)) : (isEn ? `All ${rows.length} teams` : uiText("查看全部 {0} 支队伍", locale, [rows.length]))}<Arrow down /></button> : null}
    </div>
  </section>
}

function MapRecords({ map, locale, withSeason, filter, onClear, returnState, onNavigate }) {
  const isEn = locale === 'en-US'
  const [params, update] = useAtlasQuery()
  const search = params.get('mapRecordSearch') || ''
  const limit = Math.min(map.records.length, Math.max(8, Number(params.get('mapRecordLimit')) || 8))
  const stage = params.get('mapStage') || ''
  const stages = [...new Set(map.records.map(record => record.stage))].filter(Boolean)
  const query = search.trim().toLowerCase()
  const rows = map.records.filter(record => {
    const matchesHero = filter?.type !== 'hero' || record.heroKeys.has(filter.key)
    const matchesLineup = filter?.type !== 'lineup' || record.compositionKeys.has(filter.key)
    const matchesTeam = filter?.type !== 'team' || record.teamKeys.has(filter.key)
    return matchesHero && matchesLineup && matchesTeam && (!stage || record.stage === stage) && (!query || [record.a.name, record.a.short, record.b.name, record.b.short, record.stage, record.round, stageLabel(record.stage, isEn), roundLabel(record.round, isEn)].join(' ').toLowerCase().includes(query))
  })
  const toRecord = record => withSeason(`/matches/${encodeURIComponent(record.matchId)}?map=${record.order}`)
  return <section className={styles.chapter}>
    <ChapterHeading number="03" english="BACK TO THE MATCHES" title={isEn ? 'Matches & map records.' : uiText("比赛与单图纪录。", locale)}><span role="status" aria-live="polite">{rows.length} {isEn ? 'map records' : uiText("条地图记录", locale)}</span></ChapterHeading>
    {!filter && !query && !stage && map.extremes.length ? <div className={styles.recordHighlights}><h3>{isEn ? 'Single-map records' : uiText("单图纪录", locale)}<small>{isEn ? 'RAW TOTALS' : uiText("原始总量", locale)}</small></h3><div className={styles.extremes} aria-label={isEn ? 'Map-wide single-game records, raw totals' : uiText("本地图单图极值，原始总量", locale)}>{map.extremes.map(record => <div key={record.metric}><span>{METRIC_NAMES[record.metric][isEn ? 1 : 0]}</span><strong>{record.value.toLocaleString()}</strong><div><HeroPortrait name={record.hero} /><span>{record.playerId ? <Link to={withSeason(`/players/${encodeURIComponent(record.playerId)}`)} state={returnState} onClick={onNavigate}>{record.player || record.playerId}</Link> : record.player || '—'}<small>{formatOwHeroName(record.hero, locale)}</small></span></div><Link className={styles.recordSource} to={toRecord(record.record)} state={returnState} onClick={onNavigate}>{isEn ? 'View match' : uiText("查看比赛", locale)}<Arrow /></Link></div>)}</div></div> : null}
    <div className={styles.recordToolbar}>
      <label className={styles.searchField}><ImeSafeInput aria-label={isEn ? 'Find a team or round' : uiText("搜索战队或轮次", locale)} placeholder={isEn ? 'Find a team or round…' : uiText("搜索战队或轮次…", locale)} value={search} onValueChange={value => update({ mapRecordSearch: value, mapRecordLimit: '' })} />{search ? <button type="button" aria-label={isEn ? 'Clear match search' : uiText("清除比赛搜索", locale)} onClick={() => update({ mapRecordSearch: '', mapRecordLimit: '' })}>×</button> : null}</label>
      {filter ? <button type="button" className={styles.filterChip} onClick={onClear} aria-label={`${isEn ? 'Clear filter' : uiText("清除筛选", locale)}：${filter.label}`}>{filter.label}<span aria-hidden="true">×</span></button> : null}
      {stages.length > 1 || stage ? <select aria-label={isEn ? 'Filter match stage' : uiText("筛选比赛阶段", locale)} value={stage} onChange={event => update({ mapStage: event.target.value, mapRecordLimit: '' })}><option value="">{isEn ? 'All stages' : uiText("全部阶段", locale)}</option>{stage && !stages.includes(stage) ? <option value={stage}>{stageLabel(stage, isEn)}</option> : null}{stages.map(item => <option key={item} value={item}>{stageLabel(item, isEn)}</option>)}</select> : null}
    </div>
    <div className={styles.recordOrder}><p>{isEn ? 'Newest first · map scores' : uiText("按比赛时间倒序 · 显示本图比分", locale)}</p>{filter?.type === 'hero' ? <Link to={withSeason(`/heroes?hero=${encodeURIComponent(filter.key)}&heroMap=${encodeURIComponent(map.name)}`)} state={returnState} onClick={onNavigate}>{isEn ? 'Explore hero profile' : uiText("查看英雄档案", locale)}<Arrow /></Link> : null}{filter || query || stage ? <button type="button" onClick={() => update({ mapHero: '', mapTeam: '', mapLineup: '', mapRecordSearch: '', mapStage: '', mapRecordLimit: '' })}>{isEn ? 'Clear all filters' : uiText("清除全部筛选", locale)} ×</button> : null}</div>
    {rows.length ? <div className={styles.matchRecords}>{rows.slice(0, limit).map(record => <Link className={styles.matchRecord} to={toRecord(record)} state={returnState} onClick={onNavigate} key={record.id}>
      <span className={styles.matchRecordMeta}><strong>{recordDate(record.date, locale)}</strong><small>{stageLabel(record.stage, isEn)} · {roundLabel(record.round, isEn)}</small></span>
      <span className={styles.matchRecordTeams}><span data-winner={record.winner === 'A'}>{record.a.short || '—'}</span><strong><b data-winner={record.winner === 'A'}>{record.scoreA ?? '—'}</b><i>:</i><b data-winner={record.winner === 'B'}>{record.scoreB ?? '—'}</b></strong><span data-winner={record.winner === 'B'}>{record.b.short || '—'}</span></span>
      <span className={styles.matchRecordTime}>{record.administrative ? <span className={styles.ruling}>{isEn ? 'Ruling' : uiText("裁决", locale)}</span> : formatMapDuration(record.duration)}<small>{isEn ? `Map ${record.order}` : uiText("第 {0} 图", locale, [record.order])}</small></span><Arrow />
    </Link>)}</div> : <AtlasEmpty title={isEn ? 'No matching records' : uiText("没有匹配的比赛记录", locale)}>{isEn ? 'Try another search or stage, or clear the current filter.' : uiText("试试其他搜索词或比赛阶段，或清除当前筛选。", locale)}</AtlasEmpty>}
    {rows.length > limit ? <button type="button" className={styles.expandButton} onClick={() => update({ mapRecordLimit: limit + 16 })}>{isEn ? `More records (${Math.min(limit, rows.length)} / ${rows.length})` : uiText("继续查看（{0} / {1}）", locale, [Math.min(limit, rows.length), rows.length])}<Arrow down /></button> : null}
  </section>
}

function MapDetailView({ map, atlas, locale, seasonId, withSeason, backTo, backState, sourceState, backLabel }) {
  const isEn = locale === 'en-US'
  const location = useLocation()
  const [params, update] = useAtlasQuery()
  const heroFilter = params.get('mapHero')
  const teamFilter = params.get('mapTeam')
  const lineupFilter = params.get('mapLineup')
  const recordFilter = heroFilter ? { type: 'hero', key: heroFilter, label: formatOwHeroName(map.heroStats.find(hero => hero.key === heroFilter)?.name || heroFilter, locale) }
    : teamFilter ? { type: 'team', key: teamFilter, label: map.teams.find(team => team.key === teamFilter)?.short || teamFilter }
    : lineupFilter ? { type: 'lineup', key: lineupFilter, label: isEn ? 'Selected composition' : uiText("所选阵容", locale) } : null
  const returnState = { ...getReturnState(location), parentReturnTo: backTo }
  const onNavigate = () => saveReturnScroll(location)
  const recordsRef = useRef(null)
  const mode = atlas.modes.find(item => item.type === map.type)
  const topModeCount = Math.max(1, ...mode.maps.map(item => item.count))
  const explore = filter => {
    update({ mapHero: filter?.type === 'hero' ? filter.key : '', mapTeam: filter?.type === 'team' ? filter.key : '', mapLineup: filter?.type === 'lineup' ? filter.key : '', mapRecordSearch: '', mapStage: '', mapRecordLimit: '' })
    recordsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    recordsRef.current?.focus({ preventScroll: true })
  }
  return <div className={styles.shell} data-map-atlas="detail" data-i18n-ignore>
    <AtlasNav locale={locale} withSeason={withSeason} backTo={backTo} backState={backState} backLabel={backLabel} indexTo={/^\/maps(?:\?|$)/.test(backTo) ? backTo : withSeason('/maps')} />
    <header className={styles.detailHero}>
      <div className={styles.mapIdentity}>
        <span className={styles.eyebrow}>{formatOwMapMode(map.type, locale)} / {isEn ? 'MAP PROFILE' : uiText("地图档案", locale)}</span>
        <h1>{formatOwMapName(map.name, locale)}</h1>
        {!isEn ? <span className={styles.mapEnglish}>{map.name.toUpperCase()}</span> : null}
        <div className={styles.heroStatistic}>
          <strong>{map.count}</strong>
          <p><b>{isEn ? 'published map records' : uiText("条已发布地图记录", locale)}</b><small>{isEn ? `No. ${map.modeRank} in ${formatOwMapMode(map.type, locale)} by records` : uiText("在{0}中，记录数排第 {1}", locale, [formatOwMapMode(map.type, locale), map.modeRank])}</small></p>
        </div>
      </div>
      <div className={styles.mapLandscape}><AtlasImage src={mapImageUrl(map)} alt={formatOwMapName(map.name, locale)} eager /><span className={styles.landscapeCaption}><b>{formatOwMapMode(map.type, locale)}</b><span>{isEn ? 'SEASON MAP ARCHIVE' : uiText("赛季地图档案", locale)} / {map.name.toUpperCase()}</span></span></div>
      <dl className={styles.heroSummary}>
        <div><dt>{isEn ? 'Share of this mode' : uiText("模式内占比", locale)}</dt><dd>{percent(map.modeShare)}</dd><small>{map.count} / {mode.count} {isEn ? 'mode records' : uiText("条同模式记录", locale)}</small></div>
        <div><dt>{isEn ? 'Season share' : uiText("全赛季占比", locale)}</dt><dd>{percent(map.share)}</dd><small>{map.count} / {atlas.totalRecords} {isEn ? 'records' : uiText("条记录", locale)}</small></div>
        <div><dt>{isEn ? 'Average map time' : uiText("平均单图时长", locale)}</dt><dd>{formatMapDuration(map.avgDuration)}</dd><small>{map.durationSamples} {isEn ? 'timed records' : uiText("份时长样本", locale)}</small></div>
        <div><dt><a href="#map-teams">{isEn ? 'Teams recorded' : uiText("参赛队伍", locale)}<Arrow down /></a></dt><dd>{map.teams.length}</dd><small>{isEn ? 'teams on this map' : uiText("支队伍留下记录", locale)}</small></div>
      </dl>
      <section className={styles.modeContext} aria-label={isEn ? 'Other maps in this mode' : uiText("同模式地图比较", locale)}>
        <div className={styles.modeContextHeading}><h2>{isEn ? `${formatOwMapMode(map.type, locale)} in context` : uiText("同模式地图", locale)}</h2><span>{isEn ? `Records / share of ${mode.count} in this mode` : uiText("记录数 / 占同模式 {0} 条的比例", locale, [mode.count])}</span></div>
        <div className={styles.modeComparison}>{mode.maps.map(item => <Link to={withSeason(`/maps/${encodeURIComponent(item.routeName)}`)} state={sourceState} key={item.name} className={styles.modeComparisonRow} aria-current={item.name === map.name ? 'page' : undefined}><span>{formatOwMapName(item.name, locale)}</span><span aria-hidden="true"><i style={{ width: percent(item.count / topModeCount) }} /></span><strong>{item.count}</strong><small>{percent(item.modeShare)}</small></Link>)}</div>
      </section>
    </header>

    <div className={styles.detailContents} aria-label={isEn ? 'On this page' : uiText("本页内容", locale)}><span>{isEn ? 'ON THIS MAP' : uiText("沿着地图读比赛", locale)}</span><a href="#map-environment">01 {isEn ? 'Heroes & lineups' : uiText("英雄与阵容", locale)}</a><a href="#map-teams">02 {isEn ? 'Team results' : uiText("战队表现", locale)}</a><a href="#map-records">03 {isEn ? 'Match records' : uiText("比赛记录", locale)}</a></div>

    <MapEnvironment map={map} locale={locale} onExplore={explore} />
    <MapTeams map={map} locale={locale} seasonId={seasonId} withSeason={withSeason} onExplore={explore} returnState={returnState} onNavigate={onNavigate} />
    <div id="map-records" ref={recordsRef} tabIndex={-1} className={styles.recordAnchor}><MapRecords key={`${recordFilter?.type || 'all'}:${recordFilter?.key || ''}`} map={map} locale={locale} withSeason={withSeason} filter={recordFilter} onClear={() => update({ mapHero: '', mapTeam: '', mapLineup: '', mapRecordLimit: '' })} returnState={returnState} onNavigate={onNavigate} /></div>
    <details className={styles.method}><summary>{isEn ? 'Reading the samples' : uiText("如何理解这些样本", locale)}</summary><p>{isEn ? `${map.count} named map records from completed series; ${map.administrativeCount} administrative results. Administrative results remain in the match and team record but are excluded from time, hero and composition samples. Average duration uses ${map.durationSamples} records with valid time. Hero presence deduplicates each hero per team-side; compositions require five distinct heroes. Win rate uses records with a known outcome, including draws. Single-map records are raw totals, not per-10-minute ratings.` : uiText("本页包含已结束系列赛中的 {0} 条具名地图记录，其中 {1} 条为裁决。裁决保留在赛果和战队记录中，不计入时长、英雄和阵容样本。平均时长以 {2} 条有效时长为分母。英雄出场按每队每图去重，阵容样本要求五位不同英雄。胜率以胜负或平局明确的记录为分母。单图极值为原始总量，不是每十分钟评分。", locale, [map.count, map.administrativeCount, map.durationSamples])}</p></details>
    <Link to={backTo} state={backState} className={styles.bottomBack}><Arrow back />{backLabel}<span>MAP ATLAS</span></Link>
  </div>
}

export default function SignalMapDetail() {
  const { db, locale = 'zh-CN', seasonId, withSeason = path => path } = useOutletContext()
  const { mapName = '' } = useParams()
  const location = useLocation()
  const atlas = useMemo(() => buildMapAtlas(db), [db])
  const map = findAtlasMap(atlas, mapName)
  const navigationType = useNavigationType()
  const incomingSource = readReturnState(location.state?.returnTo ? location.state : { returnTo: location.state?.mapAtlasReturn }, { allowedPrefixes: ['/maps', '/heroes'] })
  const sourceCandidate = { ...incomingSource, parentReturnTo: location.state?.parentReturnTo, parentReturnScrollY: location.state?.parentReturnScrollY }
  const [retainedSource, setRetainedSource] = useState(sourceCandidate)
  if (incomingSource.returnTo && ['returnTo', 'returnScrollY', 'parentReturnTo', 'parentReturnScrollY'].some(key => sourceCandidate[key] !== retainedSource[key])) setRetainedSource(sourceCandidate)
  const sourceState = incomingSource.returnTo ? sourceCandidate : retainedSource
  const backTo = sourceState.returnTo || withSeason('/maps')
  const parentState = readReturnState({ returnTo: sourceState.parentReturnTo, returnScrollY: sourceState.parentReturnScrollY }, { allowedPrefixes: ['/maps', '/heroes'] })
  const backState = { ...getRestoreScrollState(sourceState.returnScrollY), ...(parentState.returnTo ? parentState : {}) }
  const backLabel = backTo.startsWith('/heroes') ? (locale === 'en-US' ? 'Back to hero' : uiText("返回英雄档案", locale)) : (locale === 'en-US' ? 'Back to all maps' : uiText("返回地图索引", locale))
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    if (restoreScrollY !== null) restoreWindowScroll(restoreScrollY)
    else if (location.hash) {
      const frame = requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' }))
      return () => cancelAnimationFrame(frame)
    } else if (navigationType === 'PUSH') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [mapName, location.key, location.hash, navigationType, restoreScrollY])
  if (!map) return <div className={styles.shell}><AtlasNav locale={locale} withSeason={withSeason} backTo={backTo} backState={backState} backLabel={backLabel} indexTo={/^\/maps(?:\?|$)/.test(backTo) ? backTo : withSeason('/maps')} /><AtlasEmpty title={locale === 'en-US' ? 'No map records yet' : uiText("暂无这张地图的记录", locale)} action={<Link className={styles.primaryLink} to={withSeason('/maps')}>{locale === 'en-US' ? 'Browse maps' : uiText("浏览已有地图", locale)}<Arrow /></Link>}>{locale === 'en-US' ? 'This map has no published results in the selected season.' : uiText("当前赛季还没有发布这张地图的有效赛果。", locale)}</AtlasEmpty></div>
  return <MapDetailView key={`${seasonId}:${map.name}`} map={map} atlas={atlas} locale={locale} seasonId={seasonId} withSeason={withSeason} backTo={backTo} backState={backState} sourceState={sourceState} backLabel={backLabel} />
}
