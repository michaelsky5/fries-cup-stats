import { translateUiText as uiText } from '../../lib/uiText.js'
import Link from './AdvanceRecordLink.jsx'
import TeamLogo from '../matches/TeamLogo.jsx'
import { teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from './AdvanceSignal.module.css'

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function teamRouteId(team) {
  return team?.team_id || team?.id || teamShort(team)
}

function score(value) {
  return Number.isFinite(Number(value)) ? Number(value) : '—'
}

export default function AdvanceSignalFinal({
  result,
  seasonId,
  locale = 'zh-CN',
  withSeason,
  getPhaseHref,
  originPhase = 'swiss',
  singleElimination = false,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const champion = result?.champion
  const path = result?.championPath || []
  const ranking = result?.finalRanking || []
  const podium = ranking.slice(0, 3)
  const remaining = ranking.slice(3)
  const completedPath = path.filter(item => item.status === 'completed')
  const wins = completedPath.filter(item => item.won).length
  const losses = completedPath.length - wins
  const grandFinal = result?.grandFinal
  const grandFinalLabel = grandFinal
    ? `${teamShort(grandFinal.team_a)} ${score(grandFinal.team_a?.score)} : ${score(grandFinal.team_b?.score)} ${teamShort(grandFinal.team_b)}`
    : copy(locale, '待确认', 'PENDING')

  return (
    <div className={styles.finalIndex} data-chapter={singleElimination ? '03' : '04'}>
      <header className={styles.chapterIntro}>
        <div>
          <span>{singleElimination ? '03' : '04'} / TITLE RECORD / {seasonId}</span>
          <h2>{copy(locale, <>{uiText("每一步，", locale)}<em>{uiText("通向此刻。", locale)}</em></>, <>Every round.{' '}<em>Led to this moment.</em></>)}</h2>
        </div>
        <p>{copy(locale, uiText("冠军不是一张结果卡，而是一条可以从头重新走过的完整比赛路径。", locale), 'A champion is not a result card, but a complete match route that can be retraced from the start.')}</p>
      </header>

      <div className={styles.finalWorkspace}>
        <aside className={styles.championAside} aria-label={copy(locale, uiText("冠军档案", locale), 'Champion dossier')}>
          <div className={styles.championDossier}>
            <header>
              <span>CHAMPION DOSSIER <b>/</b> {seasonId}</span>
              <em>★</em>
            </header>

            <div className={styles.championVisual}>
              <span className={styles.championRankMark} aria-hidden="true">01</span>
              <TeamLogo team={champion} seasonId={seasonId} className={styles.championLogo} />
              <small>{copy(locale, uiText("赛季冠军", locale), 'SEASON CHAMPION')} <i aria-hidden="true">↘</i></small>
            </div>

            <div className={styles.championIdentity}>
              <span>{seasonId} <b>/</b> WINNER</span>
              <h2>{teamShort(champion)}</h2>
              <p>{teamFull(champion)}</p>
            </div>

            <div className={styles.finalScore}>
              <span>{copy(locale, uiText("总决赛", locale), 'GRAND FINAL')}</span>
              <strong>{grandFinalLabel}</strong>
            </div>

            <div className={styles.championMetrics}>
              <span>{copy(locale, uiText("夺冠路径", locale), 'TITLE RUN')} <b>{String(completedPath.length).padStart(2, '0')} MATCHES</b></span>
              <dl>
                <div><dt>{copy(locale, uiText("比赛", locale), 'MATCHES')}</dt><dd>{completedPath.length || '—'}</dd></div>
                <div><dt>{copy(locale, uiText("胜场", locale), 'WINS')}</dt><dd>{completedPath.length ? wins : '—'}</dd></div>
                <div><dt>{copy(locale, uiText("负场", locale), 'LOSSES')}</dt><dd>{completedPath.length ? losses : '—'}</dd></div>
              </dl>
            </div>

            <nav className={styles.dossierActions} aria-label={copy(locale, uiText("冠军档案相关入口", locale), 'Champion dossier links')}>
              <Link to={getPhaseHref('playoffs')}>
                <span>{copy(locale, uiText("查看完整季后赛晋级图", locale), 'Open full playoff bracket')}</span>
                <b aria-hidden="true">↗</b>
              </Link>
            </nav>
          </div>
          <p className={styles.dossierHint}>{copy(locale, uiText("一个冠军，一条完整路径。", locale), 'ONE CHAMPION. EVERY STEP.')}</p>
        </aside>

        <section className={styles.routeSection} aria-labelledby="signal-champion-route-title">
          <header className={styles.sectionEyebrow}>
            <span>CHAMPION ROUTE × {String(path.length).padStart(2, '0')}</span>
            <p>{copy(locale, uiText("沿比赛顺序读取冠军路径，点击任一场进入比赛档案。", locale), 'Follow the title route in match order. Open any match for its dossier.')} <b aria-hidden="true">↗</b></p>
          </header>

          <div className={styles.routeTable} role="table" aria-label={copy(locale, uiText("冠军比赛路径", locale), 'Champion match route')}>
            <div className={styles.routeTableHead} role="row">
              <span role="columnheader">NO.</span>
              <span role="columnheader">{copy(locale, uiText("阶段 / 比赛", locale), 'STAGE / MATCH')}</span>
              <span role="columnheader">{copy(locale, uiText("对手", locale), 'OPPONENT')}</span>
              <span role="columnheader">{copy(locale, uiText("比分", locale), 'SCORE')}</span>
              <span role="columnheader">{copy(locale, uiText("结果", locale), 'RESULT')}</span>
            </div>

            {path.length ? (
              <ol className={styles.routeRows}>
                {path.map((item, index) => (
                  <li key={item.matchId || `${item.stage}-${index}`} data-result={item.won ? 'win' : 'loss'}>
                    <Link to={withSeason(`/matches/${item.matchId}`)}>
                      <span className={styles.routeNumber}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={styles.routeStage}>
                        <strong>{item.stage || copy(locale, uiText("淘汰赛", locale), 'Playoffs')}</strong>
                        <small>{copy(locale, uiText("比赛档案", locale), 'MATCH DOSSIER')}</small>
                      </span>
                      <span className={styles.routeOpponent}>
                        <TeamLogo team={item.opponent} seasonId={seasonId} className={styles.routeLogo} />
                        <span>
                          <strong>{teamShort(item.opponent)}</strong>
                          <small>{teamFull(item.opponent)}</small>
                        </span>
                      </span>
                      <strong className={styles.routeScore}>{item.scoreLabel || '—'}</strong>
                      <span className={styles.routeResult}>{item.won ? 'W' : 'L'}<i aria-hidden="true">↗</i></span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyRoute}>{copy(locale, uiText("冠军路径尚未形成。", locale), 'The champion route is not available yet.')}</p>
            )}
          </div>
        </section>


      </div>

      {ranking.length ? (
        <section className={styles.finalOrder} aria-labelledby="signal-final-order-title">
          <header className={styles.orderHeading}>
            <div>
              <span>FINAL ORDER / {String(ranking.length).padStart(2, '0')}</span>
              <h2 id="signal-final-order-title">{copy(locale, uiText("最终排名", locale), 'Final order')}</h2>
            </div>
            <p>{copy(locale, uiText("赛季最终名次按官方发布顺序归档。", locale), 'The final order follows the official published ranking.')}</p>
          </header>

          <div className={styles.podiumStrip}>
            {podium.map(team => (
              <Link key={teamRouteId(team)} to={withSeason(`/teams/${teamRouteId(team)}`)} data-rank={team.final_rank}>
                <span>{String(team.final_rank).padStart(2, '0')}</span>
                <TeamLogo team={team} seasonId={seasonId} className={styles.podiumLogo} />
                <strong>{teamShort(team)}</strong>
                <small>{teamFull(team)}</small>
              </Link>
            ))}
          </div>

          {remaining.length ? (
            <ol className={styles.orderRows} start="4">
              {remaining.map(team => {
                const favorite = isFavoriteTeam?.(team)
                const primary = isPrimaryFavoriteTeam?.(team)
                return (
                  <li key={teamRouteId(team)}>
                    <Link to={withSeason(`/teams/${teamRouteId(team)}`)}>
                      <span>{String(team.final_rank).padStart(2, '0')}</span>
                      <TeamLogo team={team} seasonId={seasonId} className={styles.orderLogo} />
                      <strong>{teamShort(team)}</strong>
                      <small>{teamFull(team)}</small>
                      {primary ? <em>PRIMARY</em> : favorite ? <em>FOLLOWING</em> : null}
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </section>
      ) : null}

      <footer className={styles.finalFoot}>
        <span>DATA SOURCE / OFFICIAL SEASON RECORD</span>
        <Link to={getPhaseHref(originPhase)}>
          {singleElimination
            ? copy(locale, uiText("查看小组赛最终积分榜", locale), 'Open final group standings')
            : copy(locale, uiText("查看瑞士轮最终积分榜", locale), 'Open final Swiss standings')}
          <b aria-hidden="true">↗</b>
        </Link>
      </footer>
    </div>
  )
}
