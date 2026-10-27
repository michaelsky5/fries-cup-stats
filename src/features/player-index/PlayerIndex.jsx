import { translateUiText as uiText } from '../../lib/uiText.js'
import { eventCenterText } from '../../lib/eventCenterCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getRosterRoleLabel, normalizeRosterRole } from '../../lib/rosterSelectors.js'
import RosterDirectory, { DirectoryHeading, DirectoryControls, DirectoryLink as RecordLink } from '../roster-directory/RosterDirectory.jsx'
import directoryStyles from '../roster-directory/RosterDirectory.module.css'
import { playerIndexText, playerPreviewText } from './playerIndexCopy.js'
import { formatPlayerPreviewDate, formatPlayerPreviewMetric, getPlayerRosterPeers, getPlayerTeamDisplayIdentity } from './playerPreviewModel.js'
import styles from './PlayerIndex.module.css'

const playerKey = player => player?.identity?.playerId || player?.player_id || player?.identity?.primary || ''
const teamFor = player => ({ team_id: player.teamRouteId, team_short_name: player.teamShortName, team_name: player.teamFullName })

export function PlayerIndexHeading({ seasonCode, locale }) {
  const en = locale === 'en-US'
  return <DirectoryHeading seasonCode={seasonCode} kicker={en ? 'THE PLAYERS' : uiText("本届参赛选手", locale)} title={eventCenterText('playersTitle', locale)} description={en ? 'Find players, their teams, and their records from this season.' : uiText("查找选手，查看所属队伍与本届比赛记录。", locale)} />
}

export function PlayerIndexControls({ roleTabs, ...props }) {
  const uiLocale = useUiLocale()
  const en = props.locale === 'en-US'
  return <DirectoryControls {...props} tabs={roleTabs} searchLabel={en ? 'Find a player' : uiText('查找选手', uiLocale)} searchPlaceholder={en ? 'Name, BattleTag or team…' : uiText('昵称、BattleTag 或队伍…', uiLocale)} translate={playerIndexText} />
}

function PlayerIdentity({ player, team, nameLength, seasonId, withSeason, locale }) {
  const en = locale === 'en-US'
  const teamId = player.teamRouteId || player.team_id
  const teamPath = teamId && !/^[?？—-]+$/.test(teamId) ? withSeason(`/teams/${teamId}`) : ''
  const identity = getPlayerTeamDisplayIdentity(player)
  const teamIdentity = <><TeamLogo team={team} teamShortName={identity.primary} seasonId={seasonId} className={styles.teamMark} /><span><b>{identity.primary}</b>{identity.secondary ? <small>{identity.secondary}</small> : null}</span>{teamPath ? <i aria-hidden="true">→</i> : null}</>
  return <div className={styles.identityBlock} data-player-identity>
    <h2 data-name-length={nameLength}>{player.identity.primary}</h2>
    {player.identity.secondary ? <p className={styles.battleTag}>{player.identity.secondary}</p> : null}
    {teamPath
      ? <RecordLink to={teamPath} className={styles.teamCard} label={(en ? 'Open team archive' : uiText("打开队伍档案", locale)) + ' · ' + identity.primary}>{teamIdentity}</RecordLink>
      : <div className={styles.teamCard}>{teamIdentity}</div>}
  </div>
}

function PlayerRoster({ player, peers, withSeason, locale }) {
  const teamId = player.teamRouteId || player.team_id
  const teamPath = teamId && !/^[?？—-]+$/.test(teamId) ? withSeason(`/teams/${teamId}`) : ''
  return <section className={styles.rosterFrame} data-player-roster aria-label={playerPreviewText('teamRoster', locale)}>
    <div className={styles.identityRoster}>
      <h3>{playerPreviewText('teamRoster', locale)}</h3>
      <ul>{peers.map(peer => <li key={playerKey(peer)} data-roster-peer={playerKey(peer)}>
        <RecordLink to={withSeason(`/players/${playerKey(peer)}`)} label={playerPreviewText('profile', locale) + ' · ' + peer.identity.primary}>
          <strong>{peer.identity.primary}</strong><small>{getRosterRoleLabel(peer.registrationRole, locale)}</small><span aria-hidden="true">→</span>
        </RecordLink>
      </li>)}</ul>
      {teamPath ? <RecordLink to={teamPath} className={styles.rosterLink}>{playerPreviewText('viewTeamRoster', locale)} <span aria-hidden="true">→</span></RecordLink> : null}
    </div>
  </section>
}

function PlayerPortrait({ player, rosterPlayers, previewData, seasonId, seasonCode, withSeason, onToggleFavorite, favoriteDisabled, locale }) {
  const en = locale === 'en-US'
  const heroes = previewData?.hasRoleRecords ? (player.heroNames?.length ? player.heroNames : [player.avatar?.heroName].filter(Boolean)) : []
  const recordedHeroes = previewData?.hasRecords ? previewData.heroes || [] : []
  const name = player.identity.primary
  const weightedLength = Array.from(name).reduce((length, char) => length + (/\p{Script=Han}/u.test(char) ? 1 : .56), 0)
  const maps = previewData?.maps || 0
  const minutes = previewData?.minutes || 0
  const role = normalizeRosterRole(previewData?.role || player.performanceRole || player.registrationRole)
  const hasMetrics = previewData?.metrics?.some(metric => metric.value !== null)
  const scopeLabel = previewData?.scopeRole ? playerPreviewText('roleData', locale, [getRosterRoleLabel(previewData.scopeRole, locale)]) : playerPreviewText('seasonData', locale)
  const heroLabel = heroes.length ? formatOwHeroName(heroes[0], locale) : ''
  const nameLength = weightedLength > 10 ? 'long' : weightedLength > 6 ? 'medium' : 'short'
  const recent = previewData?.recent
  const team = previewData?.team || teamFor(player)
  const peers = !heroes.length ? getPlayerRosterPeers(player, rosterPlayers) : []
  return <article className={styles.portrait} data-role={role} data-player-portrait={playerKey(player)} data-has-art={Boolean(heroes.length)} data-has-roster={Boolean(peers.length)} data-has-records={Boolean(previewData?.hasRecords)} data-name-length={nameLength} aria-label={en ? `Selected player ${name}` : uiText("当前选手 {0}", locale, [name])}>
    <header className={styles.portraitTop}>
      <span>{seasonCode} <i /> {playerPreviewText('overview', locale)}</span>
      {!previewData?.hasRoleRecords ? <b>{en ? 'Registered role · ' : uiText('报名职责 · ', locale)}{getRosterRoleLabel(player.registrationRole, locale)}</b> : null}
    </header>
    <div className={styles.scene}>
      {heroes.length ? <div className={styles.artFrame}><HeroArtwork hero={heroes[0]} variant="spotlight" decorative priority className={styles.art} locale={locale} /></div> : null}
      <div className={styles.identity}>
        <PlayerIdentity player={player} team={team} nameLength={nameLength} seasonId={seasonId} withSeason={withSeason} locale={locale} />
        <section className={styles.performance} aria-label={hasMetrics ? `${getRosterRoleLabel(role, locale)} · ${playerPreviewText('per10', locale)}` : playerPreviewText('performance', locale)}>
          <header>{hasMetrics ? <><span>{getRosterRoleLabel(role, locale)}</span><span>{playerPreviewText('per10', locale)}</span></> : <span>{playerPreviewText('performance', locale)}</span>}</header>
          {hasMetrics ? <dl>{previewData.metrics.map(metric => <div key={metric.id} data-preview-metric={metric.id}><dt>{playerPreviewText(metric.id, locale)}</dt><dd>{formatPlayerPreviewMetric(metric.value, metric.id, locale)}</dd></div>)}</dl> : <p>{previewData?.hasRoleRecords
            ? playerPreviewText('noMetricDetails', locale)
            : previewData?.scopeRole
              ? playerPreviewText('noRoleAppearance', locale, [getRosterRoleLabel(previewData.scopeRole, locale)])
              : playerPreviewText('noPublishedAppearance', locale)}</p>}
        </section>
      </div>
      {peers.length ? <PlayerRoster player={player} peers={peers} withSeason={withSeason} locale={locale} /> : null}
      {heroes.length ? <div className={styles.artCaption}><b>{heroLabel}</b></div> : null}
    </div>
    <div className={styles.recordStrip}>
      <div className={styles.heroRecord}><span>{playerPreviewText('heroes', locale)}</span><strong>{recordedHeroes.length ? recordedHeroes.map(hero => formatOwHeroName(hero, locale)).join(' / ') : '—'}</strong><small>{scopeLabel}</small></div>
      <div data-preview-maps><span>{playerPreviewText('maps', locale)}</span><b>{maps > 0 ? maps : '—'}</b></div>
      <div data-preview-minutes><span>{playerPreviewText('minutes', locale)}</span><b>{minutes > 0 ? Math.round(minutes) : '—'}{minutes > 0 ? <em>{playerPreviewText('minuteUnit', locale)}</em> : null}</b></div>
    </div>
    <section className={styles.recent} aria-label={playerPreviewText('recent', locale)}>
      <span>{playerPreviewText('recent', locale)}</span>
      {recent ? <RecordLink to={withSeason(`/matches/${encodeURIComponent(recent.matchId)}`)} label={`${playerPreviewText('recent', locale)} · ${recent.opponent}`}>
        <time>{formatPlayerPreviewDate(recent.timestamp, locale)}</time><span className={styles.opponent}>vs <strong>{recent.opponent}</strong></span>{recent.score ? <b className={styles.recentScore}>{recent.score}</b> : null}<small data-result={recent.result || undefined}>{playerPreviewText(recent.result || recent.state, locale)}</small><i aria-hidden="true">→</i>
      </RecordLink> : <p>{playerPreviewText(previewData?.hasRecords ? 'noRecentDetails' : 'noRecent', locale)}</p>}
    </section>
    <footer className={styles.portraitActions}>
      <button type="button" onClick={() => onToggleFavorite(player)} disabled={favoriteDisabled} aria-pressed={Boolean(player.isFavorite)} aria-label={player.isFavorite ? (en ? 'Unfollow player ' : uiText("取消关注选手 ", locale)) + name : favoriteDisabled ? (en ? 'Follow limit reached' : uiText("关注已满", locale)) : (en ? 'Follow player ' : uiText("关注选手 ", locale)) + name}>{player.isFavorite ? (en ? '★ Following' : uiText("★ 已关注", locale)) : favoriteDisabled ? (en ? 'Limit reached' : uiText("关注已满", locale)) : (en ? '☆ Follow' : uiText("☆ 关注选手", locale))}</button>
      <RecordLink to={withSeason(`/players/${playerKey(player)}`)}>{playerPreviewText('profile', locale)} <span aria-hidden="true">→</span></RecordLink>
    </footer>
  </article>
}

export default function PlayerIndex({ directoryRef, players, rosterPlayers = [], focusedPlayer, onFocusPlayer, startIndex, resultCount, mobileExpanded, controls, pagination, emptyState, ...portraitProps }) {
  const uiLocale = useUiLocale()
  const en = portraitProps.locale === 'en-US'
  const selectedKey = playerKey(focusedPlayer)
  return <RosterDirectory kind="players" label={en ? 'Player directory' : uiText("选手目录", uiLocale)} listTitle={playerPreviewText('listTitle', uiLocale)}
    directoryRef={directoryRef} items={players} focusedKey={selectedKey} getKey={playerKey} getName={player => player.identity.primary}
    renderIdentity={player => <span className={directoryStyles.rowIdentity}><strong>{player.identity.primary}{player.isFavorite ? ' ★' : ''}</strong><small>{getPlayerTeamDisplayIdentity(player).primary} <i /> {en ? 'Registered: ' : uiText('报名：', portraitProps.locale)}{getRosterRoleLabel(player.registrationRole, portraitProps.locale)}</small></span>}
    getHref={player => portraitProps.withSeason('/players/' + playerKey(player))} previewLabel={en ? 'Preview player' : uiText("预览选手", uiLocale)} archiveLabel={en ? 'Open player archive' : uiText("打开选手档案", uiLocale)}
    onFocus={onFocusPlayer} mobileExpanded={mobileExpanded} startIndex={startIndex} resultCount={resultCount} controls={controls} pagination={pagination} emptyState={emptyState} locale={portraitProps.locale}
    preview={focusedPlayer ? <PlayerPortrait key={selectedKey} player={focusedPlayer} rosterPlayers={rosterPlayers} {...portraitProps} /> : null}
    emptyPreview={{ kicker: en ? 'PLAYER ARCHIVE' : uiText("选手档案", uiLocale), title: eventCenterText('playersEmpty', uiLocale), description: eventCenterText('playersEmptyIntro', uiLocale) }}
  />
}
