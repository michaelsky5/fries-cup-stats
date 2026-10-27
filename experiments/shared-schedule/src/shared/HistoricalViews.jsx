import { getActiveLocale } from './nativeLocales'
import { useMemo, useState } from 'react'
import { formatOwHeroNames, formatOwMapName, formatOwHeroName } from '../../../../src/lib/heroes.js'
import { getMatchScore, getMatchStatusText, getMatchTimeLabel, getTeamLabel, getFilterOptions } from '../../../../src/lib/matchesSelectors.js'
import { getMatchDossier } from '../../../../src/lib/matchDetailSelectors.js'
import { getPlayerDossier, getPlayerRoleAnalysis } from '../../../../src/lib/playerDetailSelectors.js'
import { getPlayerAppearances, getPlayerSeasonJourney } from '../../../../src/features/player-dossier/playerDossierPresentation.js'
import { getPlayerArchive, getPlayerCompanions } from '../../../../src/features/player-dossier/playerArchiveModel.js'
import { buildTeamIndexPreview } from '../../../../src/features/team-index/teamIndexModel.js'
import { matchesIndexTeam } from '../../../../src/features/team-index/teamIndexModel.js'
import { getEntryMetricValue, formatEntrySeasonOvr, METRIC_MODES } from '../../../../src/lib/leaderboardSelectors.js'
import { filterHistoricalMatches, historicalLeaderboard, publicEvidence } from './historicalModel'
import { idOf, playerIdOf, playerName, roleLabel, metricText } from './centerModel'
import { getSeasonName } from './publicSeasons'
import { openCenter } from '../platform'
import { SearchBox, FollowButton, StatsTable, TeamLogo } from './CenterViews'
import { PublicHeading, Section, Empty, Back, Choice, SectionTabs, Paged } from './PublicUi'
import './public-adapter.css'
import PosterCard from './PosterCard'
import PublicPlayer from './PublicPlayer'
import PublicTeamAnalysis from './PublicTeamAnalysis'
import PublicLeaderboard from './PublicLeaderboard'

const ROLES = [{ id: 'all', label: '全部职责' }, { id: 'TANK', label: '重装' }, { id: 'DPS', label: '输出' }, { id: 'SUPPORT', label: '支援' }]
const METRICS = [['score', '赛季总评 OVR'], ['elim', '消灭'], ['ast', '助攻'], ['dth', '阵亡'], ['dmg', '伤害'], ['heal', '治疗'], ['block', '阻挡']]
const values = (items, label) => [{ id: '', label }, ...items.filter(item => item !== 'ALL').map(item => ({ id: item, label: item }))]
export function PublicMatchList({ matches, selection }) {
  return <div className='public-match-list'>{matches.map(match => <button className='public-match-card' key={match.match_id} onClick={() => openCenter({ id: match.match_id }, selection)}><small>{match.stage} · {match.round} · {getMatchStatusText(match)} · {getMatchTimeLabel(match)}</small><span><b>{getTeamLabel(match.team_a)}</b><strong>{getMatchScore(match)}</strong><b>{getTeamLabel(match.team_b)}</b></span><small>{match.format} · {match.match_id}</small></button>)}</div>
}
function Ranking({ rows, selection, title = '最终名次' }) {
  return <Section title={title}><StatsTable columns={['名次', '队伍', '战绩 / 状态']} rows={rows.map((row, index) => ({ key: idOf(row) || index, cells: [row.final_rank || row.rank || row.current_rank || '—', <button className='center-table-link' onClick={() => openCenter({ team: row.teamId || idOf(row) }, selection)}>{row.teamShortName || row.team_short_name || row.short || row.team_name}</button>, row.recordLabel || (row.matchWins != null ? `${row.matchWins}-${row.matchLosses}` : '') || row.final_rank_text || row.qualification_status || '—'] }))} />{!rows.length ? <Empty>名次尚未公布。</Empty> : null}</Section>
}
function Overview({ model, selection, onNavigate }) {
  const advance = useMemo(() => publicEvidence(model.raw, model.season, 'advance'), [model.raw, model.season])
  const focus = advance.grandFinal || model.matches.at(-1)
  return <><PublicHeading title={getSeasonName(model.season)} lead={model.season.lifecycle === 'ARCHIVED' ? '赛事已归档。重看对阵、数据和我们共同完成的比赛。' : '赛程、参赛者与公开记录。'} code='EVENT' /><div className='public-summary'>{[['队伍', model.summary.teamCount], ['选手', model.summary.playerCount], ['比赛', model.summary.matchCount], ['地图', model.summary.mapCount]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>{advance.champion ? <Section title='冠军'><h2 className='public-champion'>{advance.champion.team_short_name || advance.champion.team_name}</h2><button className='center-link' onClick={() => openCenter({ team: idOf(advance.champion) }, selection)}>查看冠军档案 ↗</button></Section> : null}{focus ? <Section title={advance.grandFinal ? '总决赛' : '最新公开比赛'}><PublicMatchList matches={[focus]} selection={selection} /></Section> : null}<SectionTabs items={[['matches', '完整赛程'], ['advance', '晋级与排名'], ['review', '赛事回顾']]} onChange={onNavigate} /><Ranking rows={advance.final.slice(0, 8)} selection={selection} /></>
}
function Matches({ model, selection, browseState, onBrowseState }) {
  const state = browseState
  const rows = filterHistoricalMatches(model.matches, state)
  const options = getFilterOptions(model.matches)
  return <><PublicHeading title='每一场，都留下记录。' lead={getSeasonName(model.season)} code='MATCHES' /><div className='public-filters'><SearchBox value={state.query} onChange={query => onBrowseState({ query })} placeholder='搜索队伍、比赛编号…' /><Choice label='阶段' values={values(options.stages, '全部阶段')} value={state.stage} onChange={stage => onBrowseState({ stage, round: '' })} /><Choice label='轮次' values={values([...new Set(model.matches.filter(match => !state.stage || match.stage === state.stage).map(match => match.round))], '全部轮次')} value={state.round} onChange={round => onBrowseState({ round })} /><Choice label='队伍' values={[{ id: '', label: '全部队伍' }, ...model.teams.map(team => ({ id: team.routeId, label: team.shortName }))]} value={state.teamId} onChange={teamId => onBrowseState({ teamId })} /><Choice label='状态' values={[{ id: 'all', label: '全部比赛' }, { id: 'complete', label: '已结束' }, { id: 'live', label: '进行中' }, { id: 'upcoming', label: '待进行' }]} value={state.status} onChange={status => onBrowseState({ status })} /><Choice label='赛制' values={values(options.formats, '全部赛制')} value={state.format} onChange={format => onBrowseState({ format })} /></div><Section title='公开赛程' meta={`${rows.length} 场`}><Paged items={rows} page={state.page} onPage={page => onBrowseState({ page })} render={match => <PublicMatchList key={match.match_id} matches={[match]} selection={selection} />} /></Section></>
}
export function PublicMatchDetail({ raw, id, selection, mapOrder, onPublicRoute }) {
  const dossier = useMemo(() => getMatchDossier(raw, id, { locale: getActiveLocale() }), [raw, id, getActiveLocale()])
  const [mapIndex, setMapIndex] = useState(() => Math.max(0, (dossier?.mapRecords || []).findIndex(map => map.order === Number(mapOrder))))
  if (!dossier) return <><Back view='matches' selection={selection} /><Empty>这场比赛不在当前赛事公开记录中。</Empty></>
  const map = dossier.mapRecords[Math.min(mapIndex, dossier.mapRecords.length - 1)]
  return <><Back view='matches' selection={selection} /><PublicHeading title={dossier.title} lead={`${dossier.stageLabel} · ${dossier.roundLabel} · ${dossier.scheduleLabel}`} code='MATCH RECORD' /><div className='public-score'>{dossier.scoreLabel}</div><p className='center-note'>{dossier.statusLabel} · {dossier.formatLabel} · {dossier.statusNote}</p><SectionTabs items={[[dossier.teamA.id, `${dossier.teamA.short} · 队伍资料`], [dossier.teamB.id, `${dossier.teamB.short} · 队伍资料`]]} onChange={team => openCenter({ team }, selection)} /><Section title='地图记录' meta={dossier.mapCountLabel}><SectionTabs items={dossier.mapRecords.map((item, index) => [index, `${item.orderLabel} ${item.name}`])} value={mapIndex} onChange={index => { setMapIndex(index); onPublicRoute?.({ mapOrder: dossier.mapRecords[index]?.order }) }} />{map ? <><h3>{map.name} · {map.scoreA} : {map.scoreB}</h3><p>{map.type} · {map.matchTime || '时长待记录'} · {map.winnerLabel || '结果待公布'}</p><p className='center-note'>{map.notes}{map.teamABan || map.teamBBan ? ` · 禁用：${map.teamABan || '—'} / ${map.teamBBan || '—'}` : ''}</p>{[map.teamAStats, map.teamBStats].map((stats, index) => <Section key={index} title={index ? dossier.teamB.short : dossier.teamA.short}><StatsTable columns={['选手 / 英雄', '消灭', '助攻', '阵亡', '伤害', '治疗', '阻挡']} rows={stats.map(row => ({ key: row.key, cells: [<button className='center-table-link' onClick={() => row.playerId && openCenter({ player: row.playerId }, selection)}>{row.displayName}<small>{row.roleLabel} · {row.hero}</small></button>, row.eliminations, row.assists, row.deaths, metricText(row.damage), metricText(row.healing), metricText(row.mitigation)] }))} />{!stats.length ? <Empty>本图选手数据尚未公开。</Empty> : null}</Section>)}</> : <Empty>地图记录尚未公开。</Empty>}</Section><Section title='比赛分析'><p className='center-note'>评分与分析沿用 Stats 模型及样本要求。</p>{(dossier.analysisFacts || []).map((item, index) => <p key={index}>{typeof item === 'string' ? item : [item.label, item.value, item.text].filter(Boolean).join(' · ')}</p>)}{dossier.topRatedPlayer ? <button className='center-link' onClick={() => openCenter({ player: dossier.topRatedPlayer.player_id }, selection)}>最佳评分：{playerName(dossier.topRatedPlayer)} ↗</button> : null}</Section><p className='center-note'>公开比赛编号：{dossier.internalId}</p></>
}
function Roster({ model, selection, following, onFollow, browseState: state, onBrowseState }) {
  const q = String(state.query).normalize('NFKC').toLowerCase()
  const rows = (state.kind === 'players' ? model.players : model.teams).filter(item => [playerName(item), item.player_name, item.team_name, item.team_short_name, item.shortName, item.fullName].some(value => String(value || '').normalize('NFKC').toLowerCase().includes(q)) && (state.kind !== 'players' || (!state.teamId || item.team_id === state.teamId) && (state.role === 'all' || roleLabel(item.role) === roleLabel(state.role))))
  return <><PublicHeading title='人，与他们的队伍。' lead={getSeasonName(model.season)} code='ROSTER' /><SectionTabs items={[['teams', '队伍'], ['players', '选手']]} value={state.kind} onChange={kind => onBrowseState({ kind })} /><div className='public-filters'><SearchBox value={state.query} onChange={query => onBrowseState({ query })} placeholder='搜索选手或队伍…' />{state.kind === 'players' ? <><Choice label='职责' values={ROLES} value={state.role} onChange={role => onBrowseState({ role })} /><Choice label='队伍' values={[{ id: '', label: '全部队伍' }, ...model.teams.map(team => ({ id: team.routeId, label: team.shortName }))]} value={state.teamId} onChange={teamId => onBrowseState({ teamId })} /></> : null}</div><Section title='参赛阵容' meta={`${rows.length} 条记录`}><Paged items={rows} page={state.page} onPage={page => onBrowseState({ page })} render={item => <div className='public-directory-row' key={state.kind === 'teams' ? item.routeId : playerIdOf(item)}><button className='public-directory-link' onClick={() => openCenter(state.kind === 'teams' ? { team: item.routeId } : { player: playerIdOf(item) }, selection)}>{state.kind === 'teams' ? <TeamLogo team={item} /> : null}<b>{state.kind === 'teams' ? item.shortName : playerName(item)}</b><small>{state.kind === 'teams' ? `${item.fullName} · ${item.rosterSize} 名选手` : `${item.team_short_name} · ${roleLabel(item.role)}`}</small></button><FollowButton kind={state.kind} id={state.kind === 'teams' ? item.routeId : playerIdOf(item)} label={state.kind === 'teams' ? item.shortName : playerName(item)} following={following} onFollow={onFollow} /></div>} /></Section></>
}
function Advance({ model, selection, browseState: state, onBrowseState }) {
  const advance = useMemo(() => publicEvidence(model.raw, model.season, 'advance'), [model.raw, model.season])
  const phases = advance.phaseState.phases
  const phase = phases.includes(state.phase) ? state.phase : advance.phase
  const brackets = phase === 'breakthrough' ? advance.breakthrough : advance.playoffs
  const labels = { groups: '分组赛', swiss: '瑞士轮', breakthrough: '突围赛', playoffs: '淘汰赛', final: '最终排名' }
  return <><PublicHeading title='每一轮，走向下一站。' lead={getSeasonName(model.season)} code='ADVANCE' /><SectionTabs items={phases.map(item => [item, labels[item]])} value={phase} onChange={phase => onBrowseState({ phase })} />{phase === 'final' ? <Ranking rows={advance.final} selection={selection} /> : phase === 'groups' ? advance.groups.map(group => <Ranking key={group.groupLabel} rows={group.rows} title={`${group.groupLabel} 组`} selection={selection} />) : phase === 'swiss' ? <><Ranking rows={advance.swiss} title='瑞士轮积分榜' selection={selection} /><p className='center-note'>名次、晋级与同分规则沿用 Stats 已公布赛制。瑞士轮积分不替代最终排名。</p><StatsTable columns={['队伍', '小局', '净胜', 'Buchholz', '对手胜率']} rows={advance.swiss.map(row => ({ key: idOf(row), cells: [row.team_short_name, row.mapRecordLabel, row.mapDiffLabel, row.buchholz ?? '—', row.opponentWinRateLabel] }))} /></> : <Section title={labels[phase]}>{(brackets?.rounds || []).map(round => <Section key={round.id} title={round.label}><PublicMatchList matches={round.matches.map(node => node.raw).filter(Boolean)} selection={selection} /></Section>)}{!brackets?.rounds?.length ? <Empty>本阶段对阵尚未公开。</Empty> : null}</Section>}</>
}
function Database(props) {
  const { model, selection, browseState: state, onBrowseState } = props
  return <><PublicHeading title='每一局，留下数据。' lead={getSeasonName(model.season)} code='DATA' /><SectionTabs items={[['points', '最终名次'], ['players', '选手数据']]} value={state.tab} onChange={tab => onBrowseState({ tab })} />{state.tab === 'points' ? <Ranking rows={publicEvidence(model.raw, model.season, 'advance').final} selection={selection} /> : <PublicLeaderboard {...props} />}</>
}
function TeamProfile({ model, teamId, params, selection, following, onFollow, onPublicRoute }) {
  const team = model.raw.teams.find(item => idOf(item) === teamId)
  const [section, setSection] = useState(params.section || 'archive')
  const preview = useMemo(() => team && buildTeamIndexPreview(model.raw, model.season, team), [model.raw, model.season, team])
  if (!team) return <><Back view='roster' selection={selection} /><Empty>队伍资料未出现在当前公开赛事中。</Empty></>
  const matches = model.matches.filter(match => [match.team_a, match.team_b].some(side => matchesIndexTeam(team, side)))
  return <><Back view='roster' selection={selection} /><PublicHeading title={team.team_short_name || team.team_name} lead={team.team_name} code='TEAM DOSSIER' /><FollowButton kind='teams' id={teamId} label={team.team_short_name} following={following} onFollow={onFollow} /><p>{preview.standing.heading} · {preview.standing.label} · {preview.standing.zone}</p><SectionTabs items={[['archive', '队伍档案'], ['journey', '比赛历程'], ['analysis', '比赛分析']]} value={section} onChange={section => { setSection(section); onPublicRoute?.({ section }) }} />{section === 'archive' ? <Section title='参赛选手'>{preview.roster.map(player => <button className='public-directory-link' key={playerIdOf(player)} onClick={() => openCenter({ player: playerIdOf(player) }, selection)}><b>{playerName(player)}</b><small>{roleLabel(player.role)} · {player.identity?.secondary}</small></button>)}</Section> : section === 'journey' ? <>{preview.stages.map(stage => <Section key={stage.value} title={stage.title} meta={`${stage.count} 场`}><PublicMatchList matches={matches.filter(match => match.stage === stage.value)} selection={selection} /></Section>)}</> : <PublicTeamAnalysis raw={model.raw} teamId={teamId} selection={selection} params={params} onPublicRoute={onPublicRoute} />}<PosterCard title={team.team_short_name || team.team_name} subtitle={getSeasonName(model.season)} body={`${preview.standing.heading} · ${preview.standing.label}
${preview.roster.length} 名选手 · ${matches.length} 场公开比赛`} /><button className='center-link' onClick={() => openCenter({ story: 'team', subject: teamId }, selection)}>队伍回顾故事 ↗</button></>
}
function Following({ model, selection, following, onFollow }) {
  return <><PublicHeading title='下一场，还想看谁？' lead={`${getSeasonName(model.season)} · 关注保存在本机，按赛事分别保存。`} code='FOLLOWING' />{model.unavailableFollows ? <p className='center-note'>{model.unavailableFollows} 条关注暂未出现在公开记录中，已保留。</p> : null}<Section title='关注的队伍'>{model.followedTeams.map(team => <div className='public-directory-row' key={team.routeId}><button className='public-directory-link' onClick={() => openCenter({ team: team.routeId }, selection)}>{team.shortName}</button><FollowButton kind='teams' id={team.routeId} label={team.shortName} following={following} onFollow={onFollow} /></div>)}</Section><Section title='关注的选手'>{model.followedPlayers.map(player => <div className='public-directory-row' key={playerIdOf(player)}><button className='public-directory-link' onClick={() => openCenter({ player: playerIdOf(player) }, selection)}>{playerName(player)}</button><FollowButton kind='players' id={playerIdOf(player)} label={playerName(player)} following={following} onFollow={onFollow} /></div>)}</Section><Section title='相关比赛'><PublicMatchList matches={model.followedMatches} selection={selection} />{!model.followedMatches.length ? <Empty>在阵容或档案页关注后，可在这里查看相关比赛。</Empty> : null}</Section></>
}
export default function HistoricalViews(props) {
  const { view, params, model, selection } = props
  if (params.id) return <PublicMatchDetail raw={model.raw} id={params.id} selection={selection} mapOrder={params.mapOrder} onPublicRoute={props.onPublicRoute} />
  if (params.team) return <TeamProfile {...props} teamId={params.team} />
  if (params.player) return <PublicPlayer {...props} playerId={params.player} />
  if (view === 'matches') return <Matches {...props} />
  if (view === 'roster') return <Roster {...props} />
  if (view === 'advance') return <Advance {...props} />
  if (view === 'database') return <Database {...props} />
  if (view === 'space') return <Following {...props} />
  return <Overview {...props} />
}
