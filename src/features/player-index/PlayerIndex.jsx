import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getRosterRoleLabel, normalizeRosterRole } from '../../lib/rosterSelectors.js'
import RosterDirectory, { DirectoryHeading, DirectoryControls, DirectoryLink as RecordLink } from '../roster-directory/RosterDirectory.jsx'
import directoryStyles from '../roster-directory/RosterDirectory.module.css'
import { playerIndexText } from './playerIndexCopy.js'
import styles from './PlayerIndex.module.css'

const playerKey = player => player?.identity?.playerId || player?.player_id || player?.identity?.primary || ''
const teamFor = player => ({ team_id: player.teamRouteId, team_short_name: player.teamShortName, team_name: player.teamFullName })

export function PlayerIndexHeading({ seasonCode, count, total, locale }) {
  const en = locale === 'en-US'
  return <DirectoryHeading seasonCode={seasonCode} count={count} total={total} kicker={en ? 'THE PLAYERS' : uiText("本届参赛选手", locale)} title={en ? <>Every player.<br className={directoryStyles.englishBreak} /> Part of the season.</> : <>{uiText("每一个名字，", locale)}<span>{uiText("都在赛场。", locale)}</span></>} description={en ? 'Find players, their teams, and their records from this season.' : uiText("查找选手，查看所属队伍与本届比赛记录。", locale)} unit={en ? 'players' : uiText("位选手", locale)} />
}

export function PlayerIndexControls({ roleTabs, ...props }) {
  const uiLocale = useUiLocale()
  const en = props.locale === 'en-US'
  return <DirectoryControls {...props} tabs={roleTabs} searchLabel={en ? 'Find a player' : uiText('查找选手', uiLocale)} searchPlaceholder={en ? 'Name, BattleTag or team…' : uiText('昵称、BattleTag 或队伍…', uiLocale)} translate={playerIndexText} />
}

function PlayerPortrait({ player, seasonId, seasonCode, withSeason, onToggleFavorite, favoriteDisabled, locale, scopeLabel }) {
  const en = locale === 'en-US'
  const heroes = player.hasStats ? (player.heroNames?.length ? player.heroNames : [player.avatar?.heroName].filter(Boolean)) : []
  const name = player.identity.primary
  const weightedLength = Array.from(name).reduce((length, char) => length + (/\p{Script=Han}/u.test(char) ? 1 : .56), 0)
  const maps = Number(player.maps_played)
  const minutes = Number(player.raw_time_mins)
  const role = normalizeRosterRole(player.role)
  const heroLabel = heroes.length ? formatOwHeroName(heroes[0], locale) : ''
  const nameLength = weightedLength > 10 ? 'long' : weightedLength > 6 ? 'medium' : 'short'
  const hasRecords = heroes.length > 0 || maps > 0 || minutes > 0
  return <article className={styles.portrait} data-role={role} data-player-portrait={playerKey(player)} data-has-art={Boolean(heroes.length)} data-name-length={nameLength} aria-label={en ? `Selected player ${name}` : uiText("当前选手 {0}", locale, [name])}>
    <header className={styles.portraitTop}>
      <span>{seasonCode} <i /> {en ? 'PLAYER ARCHIVE' : uiText("选手档案", locale)}</span>
      <b>{playerIndexText(getRosterRoleLabel(player.role), locale)}</b>
    </header>
    <div className={styles.scene}>
      <span className={styles.teamEcho} aria-hidden="true">{player.teamShortName}</span>
      {heroes.length ? <div className={styles.artFrame}><HeroArtwork hero={heroes[0]} variant="spotlight" decorative priority className={styles.art} locale={locale} /></div> : <div className={styles.identityArt} aria-hidden="true"><TeamLogo team={teamFor(player)} seasonId={seasonId} className={styles.identityMark} large /><span>{player.teamShortName} · {en ? 'TEAM IDENTITY' : uiText("所属队伍", locale)}</span></div>}
      <div className={styles.identity}>
        <span className={styles.nameLabel}>{en ? 'ON THE ROSTER' : uiText("参赛选手", locale)}</span>
        <h2 data-name-length={nameLength}>{name}</h2>
        <p className={styles.battleTag}>{player.identity.secondary || '—'}</p>
      </div>
      <RecordLink to={withSeason(`/teams/${player.teamRouteId}`)} className={styles.teamCard} label={`${en ? 'Open team archive' : uiText("打开队伍档案", locale)} ${player.teamShortName}`}>
        <TeamLogo team={teamFor(player)} seasonId={seasonId} className={styles.teamMark} />
        <span><b>{player.teamShortName}</b><small>{player.teamFullName}</small></span><i aria-hidden="true">↗</i>
      </RecordLink>
      {heroes.length ? <div className={styles.artCaption}><span>{en ? 'RECORDED HERO' : uiText("英雄出场记录", locale)}</span><b>{heroLabel}</b></div> : null}
    </div>
    {hasRecords ? <div className={styles.recordStrip}>
      <div className={styles.heroRecord}><span>{en ? 'Recorded heroes' : uiText("已记录英雄", locale)}</span><strong>{heroes.length ? heroes.slice(0, 3).map(hero => formatOwHeroName(hero, locale)).join(' / ') : '—'}</strong><small>{scopeLabel}</small></div>
      <div><span>{en ? 'Maps' : uiText("出场地图", locale)}</span><b>{maps > 0 ? maps : '—'}</b></div>
      <div><span>{en ? 'Minutes' : uiText("出场分钟", locale)}</span><b>{minutes > 0 ? Math.round(minutes) : '—'}</b></div>
    </div> : <div className={styles.recordEmpty}><strong>{en ? 'On this season’s roster' : uiText("已收录于本届参赛名单", locale)}</strong><p>{en ? 'No published appearance data yet.' : uiText("暂无已发布的出场数据。", locale)}</p><small>{scopeLabel}</small></div>}
    <footer className={styles.portraitActions}>
      <button type="button" onClick={() => onToggleFavorite(player)} disabled={favoriteDisabled} aria-pressed={Boolean(player.isFavorite)} aria-label={player.isFavorite ? (en ? 'Unfollow player ' : uiText("取消关注选手 ", locale)) + name : favoriteDisabled ? (en ? 'Follow limit reached' : uiText("关注已满", locale)) : (en ? 'Follow player ' : uiText("关注选手 ", locale)) + name}>{player.isFavorite ? (en ? '★ Following' : uiText("★ 已关注", locale)) : favoriteDisabled ? (en ? 'Limit reached' : uiText("关注已满", locale)) : (en ? '☆ Follow' : uiText("☆ 关注选手", locale))}</button>
      <RecordLink to={withSeason(`/players/${playerKey(player)}`)}>{en ? 'Explore player archive' : uiText("走进选手档案", locale)} <span aria-hidden="true">↗</span></RecordLink>
    </footer>
  </article>
}

export default function PlayerIndex({ directoryRef, players, focusedPlayer, onFocusPlayer, startIndex, resultCount, mobileExpanded, controls, pagination, emptyState, ...portraitProps }) {
  const uiLocale = useUiLocale()
  const en = portraitProps.locale === 'en-US'
  const selectedKey = playerKey(focusedPlayer)
  return <RosterDirectory kind="players" label={en ? 'Player directory' : uiText("选手目录", uiLocale)} listTitle={en ? 'THE ROSTER' : uiText("选手索引", uiLocale)}
    directoryRef={directoryRef} items={players} focusedKey={selectedKey} getKey={playerKey} getName={player => player.identity.primary}
    renderIdentity={player => <span className={directoryStyles.rowIdentity}><strong>{player.identity.primary}{player.isFavorite ? ' ★' : ''}</strong><small>{player.teamShortName} <i /> {playerIndexText(getRosterRoleLabel(player.role), portraitProps.locale)}</small></span>}
    getHref={player => portraitProps.withSeason('/players/' + playerKey(player))} previewLabel={en ? 'Preview player' : uiText("预览选手", uiLocale)} archiveLabel={en ? 'Open player archive' : uiText("打开选手档案", uiLocale)}
    onFocus={onFocusPlayer} mobileExpanded={mobileExpanded} startIndex={startIndex} resultCount={resultCount} controls={controls} pagination={pagination} emptyState={emptyState} locale={portraitProps.locale}
    preview={focusedPlayer ? <PlayerPortrait key={selectedKey} player={focusedPlayer} {...portraitProps} /> : null}
    emptyPreview={{ kicker: en ? 'PLAYER ARCHIVE' : uiText("选手档案", uiLocale), title: en ? 'Find your next name.' : uiText("下一个名字，等你发现。", uiLocale), description: en ? 'Change the filters to explore this season’s roster.' : uiText("调整筛选，继续浏览本届参赛名单。", uiLocale) }}
  />
}
