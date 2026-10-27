import { getActiveLocale } from './nativeLocales'
import { useMemo, useState } from 'react'
import { Input, Picker, ScrollView } from '@tarojs/components'
import { formatOwHeroNames, formatOwMapName } from '../../../../src/lib/heroes.js'
import { formatMatchSchedule } from '../../../../src/lib/scheduleFormat.js'
import { getPublishedTeamLogo } from '../../../../src/lib/teamLogoResolver.js'
import { weeklyMapSlots, weeklyScore, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle, mapResult } from './model'
import { filterDirectory, idOf, playerIdOf, playerName, roleLabel, metricText, METRICS, rankedPlayers, teamProfile, weeklyPublishedRank } from './centerModel'
import { changeMatch, openCenter, backToCenter, copyPublicLink } from '../platform'
import { MatchRow } from './SharedSchedule'
import { pageForCount } from './browseState'
import o from '../generated/StatsOverview.module.css'
import r from '../generated/StatsRoster.module.css'

const ROLES = [['all', '全部职责'], ['TANK', '重装'], ['DPS', '输出'], ['SUPPORT', '支援'], ['FLEX', '自由人']]
const scoreOf = match => ['live', 'complete', 'review', 'ruling'].includes(match.state) ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'
const dateOf = match => formatMatchSchedule(match, { locale: getActiveLocale(), includeWeekday: true }).label || '时间待定'

export function TeamLogo({ team, className = '' }) {
  const [failed, setFailed] = useState(false)
  const source = getPublishedTeamLogo(team)
  const logo = typeof source === 'string' && /^https:\/\//.test(source) ? source : ''
  const short = weeklyTeamShort(team)
  return <span className={`${className} center-logo`}>{logo && !failed ? <img src={logo} alt='' onError={() => setFailed(true)} /> : <b>{/[\u4e00-\u9fff]/.test(short) ? short.slice(0, 1) : short.slice(0, 4)}</b>}</span>
}
export function FollowButton({ kind, id, label, following, onFollow, dark = false }) {
  const active = (following[kind] || []).includes(id)
  return <button type='button' className={`${o.follow} center-follow ${dark ? 'center-follow-dark' : ''} ${active ? 'shared-selected' : ''}`} aria-label={`${active ? '取消关注' : '关注'}${label}`} aria-pressed={active} onClick={() => onFollow(kind, id)}>{active ? '★ 已关注' : '☆ 关注'}</button>
}
export function Heading({ title, lead, eyebrow, model, selection, onSelection }) {
  return <header className={o.heading}><div><p className={o.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{lead}</p></div>{model ? <Picker range={model.cycles.map(cycle => cycle.name || cycle.code)} value={Math.max(0, model.cycles.findIndex(cycle => cycle.id === model.cycle?.id))} onChange={event => {
    const cycle = model.cycles[Number(event.detail.value)]
    const weeks = cycle.weeks.filter(week => ['PUBLISHED', 'IN_PROGRESS', 'RESULT_REVIEW', 'CLOSED'].includes(week.status))
    const week = weeks.find(item => ['IN_PROGRESS', 'RESULT_REVIEW'].includes(item.status)) || weeks.at(-1)
    onSelection(current => ({ ...current, cycleId: cycle.id, weekId: week?.id || '', teamId: '' }))
  }}><span className='cycle-selector'><span>周期</span><b>{model.cycle?.name || '周期待公布'}⌄</b></span></Picker> : null}</header>
}
export function WeekRail({ model, onSelection }) {
  return <div className='shared-week-rail'>{model.weeks.map(week => <button key={week.id} className={model.week?.id === week.id ? 'shared-selected' : ''} onClick={() => onSelection(current => ({ ...current, weekId: week.id }))}>{weeklyWeekTitle(week, getActiveLocale())}<small>{weeklyStatusLabel(week.status, getActiveLocale())}</small></button>)}</div>
}
export function StatsTable({ columns, rows, className = '' }) {
  // Taro's HTML plugin omits table/tr/td on WeChat. These supported div/span
  // nodes retain the generated Stats tag classes and accessible H5 table roles.
  const count = columns?.length || rows[0]?.cells.length || 4
  const rowStyle = count === 4 ? undefined : { gridTemplateColumns: count > 4 ? `112px repeat(${count - 1}, minmax(72px, 1fr))` : `repeat(${count}, minmax(0, 1fr))`, ...(count > 4 ? { minWidth: `${112 + (count - 1) * 72}px` } : {}) }
  const tableStyle = count > 4 ? { width: rowStyle.minWidth, minWidth: rowStyle.minWidth } : undefined
  return <ScrollView scrollX className='public-table-scroll'><div className={`center-table shared-tag-table ${className}`} style={tableStyle} role='table'>
    {columns ? <div className='shared-tag-thead' role='rowgroup'><div className='shared-tag-tr' style={rowStyle} role='row'>{columns.map(label => <span className='shared-tag-th' role='columnheader' key={label}>{label}</span>)}</div></div> : null}
    <div className='shared-tag-tbody' role='rowgroup'>{rows.map(row => <div key={row.key} className={`shared-tag-tr ${row.className || ''}`} style={rowStyle} role='row'>{row.cells.map((cell, index) => <span key={index} className={`shared-tag-${index === row.headerIndex ? 'th' : 'td'}`} role={index === row.headerIndex ? 'rowheader' : 'cell'}>{cell}</span>)}</div>)}</div>
  </div></ScrollView>
}
export function Standings({ model, selection, onNavigate }) {
  return <section className={`${o.standings} center-standings`}>
    <div className={o.sectionBar}><h2>周期积分</h2><span>{model.cycle?.name || '周期待公布'}</span></div>
    <div className={o.standingsIntro}><p>每一局，带进这个周期。</p><span>展示本周期最新已公布积分，不随周次回溯。</span></div>
    {!model.isPilot && model.standings.length ? <StatsTable columns={['名次', '队伍', '已赛', '积分']} rows={model.standings.map(row => ({ key: row.team_id, headerIndex: 1, className: 'center-standing-row', cells: [<>{weeklyPublishedRank(row.display_rank)}{row.tied ? <small>并列</small> : null}</>, <button className='center-table-link' onClick={() => openCenter({ team: row.team_id }, selection)}><TeamLogo team={row.team} className={o.rowLogo} />{row.team_short_name || row.team_name || '资料待公布'}</button>, row.played ?? '—', <strong>{row.points ?? '—'}</strong>] }))} /> : <div className={o.pointsEmpty}><span>—</span><p>{model.isPilot ? '本周期保留比赛记录，不生成正式积分名次。' : '积分榜尚未公布。'}</p></div>}
    <p className={o.standingsNote}>同分保留公布的并列名次；不同队伍已赛场数可能不同。</p>
    <div className={o.pointsRule}><span>RR5</span><p><b>胜一局 2 分 · 负或平 1 分</b><small>常规完赛计分；弃权等特殊结果按赛事判定。</small></p></div>
    {onNavigate ? <button className={`${o.advanceLink} center-link`} onClick={() => onNavigate('advance')}>查看晋级形势 <span>↗</span></button> : null}
  </section>
}
export function Overview({ model, selection, onSelection, following, onFollow, onNavigate }) {
  const focus = model.focus
  return <>
    <Heading title='五局，都算数。' lead='从这一周的对阵，走向整个周期。' eyebrow='FRIES CUP / WEEKLY' {...{ model, selection, onSelection }} />
    <WeekRail {...{ model, onSelection }} />
    <div className={o.mainGrid}>
      <section className={o.matchSection}><div className={o.sectionBar}><h2>{weeklyWeekTitle(model.week, getActiveLocale())}</h2><span>{model.matches.length} 场对阵 · {model.complete} 场已结束</span></div>
        {focus ? <div className={`${o.spotlight} center-spotlight`}>
          <div className={o.matchTop}><span className={`${o.state} shared-state-${focus.state}`}><i />{weeklyStatusLabel(focus.state, getActiveLocale())}</span><span>{dateOf(focus)} <small>UTC+8</small></span><span>{focus.format || '赛制待公布'}</span></div>
          <div className={o.scoreboard}>{[focus.team_a, focus.team_b].map((team, side) => <div className={side ? o.teamB : o.teamA} key={side}><TeamLogo team={team} className={o.heroLogo} /><button className='center-team-title' onClick={() => openCenter({ team: idOf(team) }, selection)}><h3>{weeklyTeamShort(team)}</h3></button><p>{team.name || team.team_name}</p><FollowButton kind='teams' id={idOf(team)} label={weeklyTeamShort(team)} dark {...{ following, onFollow }} /></div>)}<div className={o.score}><strong>{scoreOf(focus)}</strong><span>{weeklyStatusLabel(focus.state, getActiveLocale())}</span></div></div>
          <div className={o.mapsSection}><div className={o.mapHeading}><b>五局进程</b><span>RR5 · 无论比分，都打满五局</span></div><ol className={o.mapRail}>{weeklyMapSlots(focus).map(slot => <li className={`shared-map-${slot.state}`} key={slot.order}><span className={o.mapNumber}>{String(slot.order).padStart(2, '0')}</span><b>{formatOwMapName(slot.map?.map_name) || '地图待公布'}</b><span>{mapResult(slot, focus)}</span>{slot.map ? <small>{weeklyScore(slot.map.score_a)} : {weeklyScore(slot.map.score_b)}</small> : null}</li>)}</ol></div>
          <div className={o.matchFooter}><span>地图记录与结果以公布内容为准。</span><button className='center-details-link shared-tag-a' onClick={() => changeMatch(focus.id, selection)}>比赛详情 ↗</button></div>
        </div> : <div className={o.empty}><h3>下一场，等你上场。</h3><p>公开赛程尚未公布。</p></div>}
      </section>
      <section className={o.matchList}><div className={o.listHeading}><h2>本周全部对阵</h2><button className={`${o.scheduleLink} center-link`} onClick={() => onNavigate('matches')}>完整赛程 ↗</button></div>{model.matches.map(match => <button className={o.matchRow} key={match.id} onClick={() => changeMatch(match.id, selection)}><span className={o.rowTime}><b>{weeklyStatusLabel(match.state, getActiveLocale())}</b><small>{dateOf(match)}</small></span><span className={o.rowTeam}><TeamLogo team={match.team_a} className={o.rowLogo} /><b>{weeklyTeamShort(match.team_a)}</b></span><strong className={o.rowScore}>{scoreOf(match)}</strong><span className={`${o.rowTeam} ${o.rowTeamB}`}><b>{weeklyTeamShort(match.team_b)}</b><TeamLogo team={match.team_b} className={o.rowLogo} /></span></button>)}</section>
      <Standings {...{ model, selection, onNavigate }} />
    </div>
    <section className={o.followingSection}><div><p className={o.eyebrow}>KEEP UP WITH YOUR TEAM</p><h2>下一周，还想看谁？</h2><p>关注队伍，把每一周连起来。关注保存在本机。</p></div><div className={o.followTeams}>{model.teams.map(team => <button key={idOf(team)} className={(following.teams || []).includes(idOf(team)) ? 'shared-selected' : ''} aria-pressed={(following.teams || []).includes(idOf(team))} onClick={() => onFollow('teams', idOf(team))}><TeamLogo team={team} className={o.rowLogo} /><b>{weeklyTeamShort(team)}</b><span>{following.teams.includes(idOf(team)) ? '★' : '☆'}</span></button>)}</div></section>
  </>
}
export function SearchBox({ value, onChange, placeholder }) {
  return <label className={r.search}><Input className='center-search shared-tag-input' value={value} onInput={event => onChange(event.detail.value)} placeholder={placeholder} maxlength={60} />{value ? <button className='shared-clear' onClick={() => onChange('')}>清除</button> : null}</label>
}
export function Pagination({ page, count, onChange }) {
  const pages = Math.ceil(count / 20)
  if (pages <= 1) return null
  return <div className='center-pagination'><button disabled={page === 0} onClick={() => onChange(page - 1)}>上一页</button><span>{page + 1} / {pages}</span><button disabled={page + 1 === pages} onClick={() => onChange(page + 1)}>下一页</button></div>
}
export function DirectoryRows({ items, kind, following, onFollow, selection }) {
  return <ul className={r.names}>{items.map((item, index) => {
    const team = kind === 'teams', id = team ? idOf(item) : playerIdOf(item)
    return <li key={id}><div className={r.nameRow}><button className={`center-directory-${team ? 'team' : 'player'}`} onClick={() => openCenter(team ? { team: id } : { player: id }, selection)}>{team ? <TeamLogo team={item} className={o.rowLogo} /> : <span className={r.serial}>{String(index + 1).padStart(2, '0')}</span>}<span className={r.rowIdentity}><strong>{team ? weeklyTeamShort(item) : playerName(item)}</strong><small>{team ? item.team_name : `${item.team_short_name || item.team_name || '所属队伍待公布'} · ${roleLabel(item.role)}`}</small></span><span className={r.selectionMark}>资料 ↗</span></button><FollowButton kind={kind} id={id} label={team ? weeklyTeamShort(item) : playerName(item)} {...{ following, onFollow }} /></div></li>
  })}</ul>
}
export function Roster({ model, selection, onSelection, following, onFollow, browseState, onBrowseState }) {
  const { kind, query, role, teamId } = browseState
  const setKind = kind => onBrowseState({ kind }), setQuery = query => onBrowseState({ query }), setRole = role => onBrowseState({ role }), setTeamId = teamId => onBrowseState({ teamId }), setPage = page => onBrowseState({ page })
  const rows = useMemo(() => filterDirectory(model, { kind, query, role, teamId }), [model, kind, query, role, teamId])
  const page = pageForCount(browseState.page, rows.length)
  const resetPage = update => { update(); setPage(0) }
  return <>
    <Heading title='谁，在这个赛场。' lead={`${model.teams.length} 支队伍 · ${model.players.length} 名公开选手`} eyebrow='FRIES CUP / ROSTER' {...{ model, selection, onSelection }} />
    <section className={`${r.directory} center-directory`}><div className={r.controls}><nav className={r.roleTabs}>{[['teams', '队伍'], ['players', '选手']].map(([key, label]) => <button key={key} className={`center-kind-${key} ${kind === key ? 'shared-selected' : ''}`} onClick={() => resetPage(() => setKind(key))}>{label}</button>)}</nav><SearchBox value={query} onChange={value => resetPage(() => setQuery(value))} placeholder='搜索队伍、选手或 BattleTag…' />{kind === 'players' ? <div className='center-filter-pickers'><Picker range={ROLES.map(([, label]) => label)} value={ROLES.findIndex(([key]) => key === role)} onChange={event => resetPage(() => setRole(ROLES[Number(event.detail.value)][0]))}><span className='team-choice'>{roleLabel(role) === '职责待公布' ? '全部职责' : roleLabel(role)}⌄</span></Picker><Picker range={['全部队伍', ...model.teams.map(weeklyTeamShort)]} value={Math.max(0, model.teams.findIndex(team => idOf(team) === teamId) + 1)} onChange={event => resetPage(() => setTeamId(Number(event.detail.value) ? idOf(model.teams[Number(event.detail.value) - 1]) : ''))}><span className='team-choice'>{teamId ? weeklyTeamShort(model.teams.find(team => idOf(team) === teamId)) : '全部队伍'}⌄</span></Picker></div> : null}</div><div className={r.directoryTop}><span>公开{kind === 'teams' ? '队伍' : '选手'}</span><small>{rows.length} 条结果</small></div>{rows.length ? <DirectoryRows items={rows.slice(page * 20, (page + 1) * 20)} {...{ kind, following, onFollow, selection }} /> : <p className={r.empty}>没有符合条件的资料。请调整搜索或筛选。</p>}<Pagination {...{ page }} count={rows.length} onChange={setPage} /></section>
  </>
}
export function Database({ model, selection, onSelection, following, onFollow, onNavigate, browseState, onBrowseState }) {
  const { tab, metric, role, query } = browseState
  const setTab = tab => onBrowseState({ tab }), setMetric = metric => onBrowseState({ metric }), setRole = role => onBrowseState({ role }), setQuery = query => onBrowseState({ query }), setPage = page => onBrowseState({ page })
  const rows = useMemo(() => rankedPlayers(model.players, metric, { role, query }), [model.players, metric, role, query])
  const page = pageForCount(browseState.page, rows.length)
  const resetPage = update => { update(); setPage(0) }
  return <><Heading title='每一局，留下数据。' lead='周期积分与已公布选手数据。' eyebrow='FRIES CUP / DATA' {...{ model, selection, onSelection }} /><nav className={r.roleTabs}>{[['points', '周期积分'], ['players', '选手数据']].map(([key, label]) => <button key={key} className={`center-data-${key} ${tab === key ? 'shared-selected' : ''}`} onClick={() => setTab(key)}>{label}</button>)}</nav>{tab === 'points' ? <Standings {...{ model, selection, onNavigate }} /> : <section className={`${r.directory} center-directory`}><div className={r.controls}><SearchBox value={query} onChange={value => resetPage(() => setQuery(value))} placeholder='搜索选手或队伍…' /><div className='center-filter-pickers'><Picker range={METRICS.map(([, label]) => `${label} / 10 分钟`)} value={METRICS.findIndex(([key]) => key === metric)} onChange={event => resetPage(() => setMetric(METRICS[Number(event.detail.value)][0]))}><span className='team-choice'>{METRICS.find(([key]) => key === metric)[1]} /10⌄</span></Picker><Picker range={ROLES.slice(0, 4).map(([, label]) => label)} value={ROLES.findIndex(([key]) => key === role)} onChange={event => resetPage(() => setRole(ROLES[Number(event.detail.value)][0]))}><span className='team-choice'>{role === 'all' ? '全部职责' : roleLabel(role)}⌄</span></Picker></div></div><div className={r.directoryTop}><span>每 10 分钟 · 数值降序</span><small>{rows.length} 名有记录选手</small></div><p className='center-note'>数据涵盖当前公开赛季，不随周期筛选。按指标数值降序排列，序号不代表综合实力；出场样本可能不同。</p><ul className={r.names}>{rows.slice(page * 20, (page + 1) * 20).map((player, index) => <li key={playerIdOf(player)}><div className={r.nameRow}><button className='center-stat-player' onClick={() => openCenter({ player: playerIdOf(player) }, selection)}><span className={r.serial}>{page * 20 + index + 1}</span><span className={r.rowIdentity}><strong>{playerName(player)}</strong><small>{player.team_short_name} · {roleLabel(player.totals.role)} · {player.totals.maps_played} 图</small></span><strong className='center-stat-value'>{metricText(player.totals[metric])}</strong></button></div></li>)}</ul>{!rows.length ? <p className={r.empty}>暂无符合条件的已公布数据。</p> : null}<Pagination {...{ page }} count={rows.length} onChange={setPage} /></section>}</>
}
export function Following({ model, selection, following, onFollow, onNavigate }) {
  const hasFollows = following.teams.length + following.players.length > 0
  return <><Heading title='下一周，还想看谁？' lead='我的关注 · 关注保存在本机，换设备不会自动同步。' eyebrow='FRIES CUP / FOLLOWING' /><div className={o.sectionBar}><h2>{model.followedTeams.length} 支队伍 · {model.followedPlayers.length} 名选手</h2></div>{model.unavailableFollows ? <p className='center-note'>有 {model.unavailableFollows} 条关注资料未出现在当前公开记录中，已保留本机记录。</p> : null}{!hasFollows ? <div className={o.empty}><h3>从一支队伍开始。</h3><p>在总览或参赛阵容中点击关注，再回来查看他们的比赛。</p><button className='center-primary' onClick={() => onNavigate('roster')}>去看看参赛阵容 ↗</button></div> : null}{model.followedTeams.length ? <section className='center-section'><div className={o.sectionBar}><h2>关注的队伍</h2></div><DirectoryRows items={model.followedTeams} kind='teams' {...{ following, onFollow, selection }} /></section> : null}{model.followedPlayers.length ? <section className='center-section'><div className={o.sectionBar}><h2>关注的选手</h2></div><DirectoryRows items={model.followedPlayers} kind='players' {...{ following, onFollow, selection }} /></section> : null}{hasFollows ? <section className='center-section'><div className={o.sectionBar}><h2>本周期相关比赛</h2><span>{model.followedMatches.length} 场</span></div>{model.followedMatches.length ? model.followedMatches.map(match => <div key={match.id}><p className='center-note'>{weeklyWeekTitle(match.week, getActiveLocale())}</p><MatchRow match={match} context={selection} /></div>) : <p className='center-note'>关注对象在本周期暂无公开比赛。</p>}</section> : null}</>
}
export function Advance({ model, selection, onSelection, onNavigate }) {
  return <><Heading title='把每一周，连起来。' lead='晋级形势 · 积分、阶段与已公布对阵。' eyebrow='FRIES CUP / ADVANCEMENT' {...{ model, selection, onSelection }} /><div className={o.standingsIntro}><p>{model.isPilot ? '试运行周期' : model.cycle?.status === 'PLAYOFFS' ? '周期季后赛' : model.cycle?.status === 'CLOSED' ? '本周期已结束' : '周期积分赛'}</p><span>晋级资格、名额与日期，以当期公示为准。积分排名不能直接当作晋级结果。</span></div><Standings {...{ model, selection }} /><section className='center-section'><div className={o.sectionBar}><h2>每周比赛记录</h2></div>{model.weekEntries.map(entry => <button key={entry.week.id} className='center-week-link center-link' onClick={() => { onSelection(current => ({ ...current, weekId: entry.week.id })); onNavigate('matches') }}><span>{weeklyWeekTitle(entry.week, getActiveLocale())}</span><small>{entry.matches.length} 场对阵 · {weeklyStatusLabel(entry.week.status, getActiveLocale())} ↗</small></button>)}</section><footer className={o.pathway}><div><span>01</span><b>每周上场</b><small>五局累计周期积分</small></div><div><span>02</span><b>周期季后赛</b><small>双败淘汰，继续向前</small></div><div><span>03</span><b>Weekly Major</b><small>走向更大的赛场</small></div><p>以上为周赛赛制路径，当前资格以公开赛事记录为准。</p></footer></>
}
export function TeamProfile({ model, teamId, selection, following, onFollow }) {
  const profile = teamProfile(model, teamId)
  return <><button className='shared-detail-back' onClick={() => backToCenter('roster', selection)}>← 返回</button>{!profile ? <div className={o.empty}><h3>未找到这支队伍的公开资料。</h3></div> : <>
    <Heading title={profile.team.team_name || weeklyTeamShort(profile.team)} lead={profile.team.team_short_name || 'FRIES CUP / TEAM'} eyebrow='FRIES CUP / TEAM DOSSIER' />
    <div className='center-profile-identity'><TeamLogo team={profile.team} className={o.heroLogo} /><FollowButton kind='teams' id={teamId} label={weeklyTeamShort(profile.team)} {...{ following, onFollow }} /></div>
    <div className={o.standingsIntro}><p>周期积分 {metricText(profile.standing?.points)} · 公布名次 {weeklyPublishedRank(profile.standing?.display_rank)}{profile.standing?.tied ? '（并列）' : ''}</p><span>{model.cycle?.name} · 已赛 {profile.standing?.played ?? '—'} 场</span></div>
    <section className='center-section'><div className={o.sectionBar}><h2>当前公开阵容</h2><span>{profile.members.length} 名选手</span></div><p className='center-note'>当前阵容目录；当周锁定阵容与实际出场以公开记录为准。</p><DirectoryRows items={profile.members} kind='players' {...{ following, onFollow, selection }} /></section>
    {profile.lockedMembers ? <section className='center-section'><div className={o.sectionBar}><h2>{weeklyWeekTitle(model.week, getActiveLocale())}锁定阵容</h2><span>{profile.lockedMembers.length} 名</span></div><DirectoryRows items={profile.lockedMembers} kind='players' {...{ following, onFollow, selection }} /></section> : null}
    <section className='center-section'><div className={o.sectionBar}><h2>本周期比赛</h2><span>{profile.matches.length} 场</span></div>{profile.matches.length ? profile.matches.map(match => <MatchRow key={match.id} match={match} context={selection} />) : <p className='center-note'>本周期暂无公开比赛。</p>}</section>
  </>}</>
}
export function PlayerProfile({ model, playerId, selection, following, onFollow }) {
  const player = model.players.find(item => playerIdOf(item) === playerId)
  const team = player && model.teams.find(item => idOf(item) === String(player.team_id))
  const totals = player?.totals
  return <><button className='shared-detail-back' onClick={() => backToCenter('roster', selection)}>← 返回</button>{!player ? <div className={o.empty}><h3>未找到这名选手的公开资料。</h3></div> : <>
    <Heading title={playerName(player)} lead={`${roleLabel(player.role)} · ${player.team_short_name || player.team_name || '所属队伍待公布'}`} eyebrow='FRIES CUP / PLAYER DOSSIER' />
    <div className='center-profile-identity'><p>{player.player_name || 'BattleTag 待公布'}</p><FollowButton kind='players' id={playerId} label={playerName(player)} {...{ following, onFollow }} /></div>
    {team ? <button className='center-week-link center-link' onClick={() => openCenter({ team: idOf(team) }, selection)}><span><TeamLogo team={team} className={o.rowLogo} /> {team.team_name}</span><small>队伍资料 ↗</small></button> : null}
    <section className={`${o.standings} center-section`}><div className={o.sectionBar}><h2>已公布赛季数据</h2><span>每 10 分钟</span></div>{totals && Number(totals.maps_played) > 0 ? <><div className={o.standingsIntro}><p>{totals.maps_played} 图出场 · {totals.total_time_played || '时长待公布'}</p><span>数据涵盖当前公开赛季记录，不随周次筛选。样本不同，不直接代表综合实力。</span></div><StatsTable className='center-metrics-table' rows={METRICS.map(([key, label]) => ({ key, headerIndex: 0, cells: [label, <strong>{metricText(totals[key])}</strong>] }))} /><p className='center-note'>常用英雄：{formatOwHeroNames(totals.top_3_heroes || []).join('、') || '尚未公布'}</p></> : <div className={o.pointsEmpty}><span>—</span><p>暂无已公布的地图统计，不以零值代替缺失数据。</p></div>}</section>
  </>}</>
}
export function PublicLinks({ model }) {
  const [notice, setNotice] = useState('')
  const rules = model?.cycle?.rulebook
  const url = rules?.slug && rules?.version ? `https://fries-cup.com/rules/?book=${encodeURIComponent(rules.slug)}&version=${encodeURIComponent(rules.version)}` : 'https://fries-cup.com/rules/'
  async function copy() { try { await copyPublicLink(url); setNotice('规则中心链接已复制，可在浏览器打开。') } catch (_) { setNotice('链接复制失败，请重试。') } }
  return <footer className='center-public-footer'><span>{model?.season?.name?.zh || '2026 薯条杯周赛'}</span><button className='center-link' onClick={copy}>复制规则中心链接 ↗</button>{notice ? <p>{notice}</p> : null}</footer>
}
