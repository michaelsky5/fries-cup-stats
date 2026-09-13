import { translateUiText as uiText } from '../../lib/uiText.js'
import TeamLogo from '../matches/TeamLogo.jsx'
import { teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from './AdvanceSignal.module.css'

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function phaseNumber(summary) {
  if (summary?.competitionFormat === 'GROUP') {
    return { groups: 1, playoffs: 2, final: 3 }[summary?.phase] || 1
  }

  return { swiss: 1, breakthrough: 2, playoffs: 3, final: 4 }[summary?.phase] || 1
}

export default function AdvanceSignalHero({ seasonId, summary, result, bracketType, locale = 'zh-CN', t }) {
  const isArchive = Boolean(summary?.phaseState?.seasonFinished)
  const phaseLabel = summary?.phase ? t(`advance.phase.${summary.phase}`, summary.phase) : '—'
  const champion = result?.champion || summary?.champion
  const currentNumber = phaseNumber(summary)
  const phaseCount = summary?.competitionFormat === 'GROUP' ? 3 : 4
  const isSingleElimination = bracketType === 'single_elimination'

  return (
    <header className={styles.routePageHero} aria-labelledby="advance-signal-title" data-archive={isArchive ? 'true' : undefined}>
      <div className={styles.routeHeroGrid} aria-hidden="true" />
      <div className={styles.routeHeroTrace} aria-hidden="true"><i /><i /><i /></div>
      <span className={styles.routeHeroVertical} aria-hidden="true">ROUTE / {String(currentNumber).padStart(2, '0')}</span>

      <div className={styles.routeHeroTopline}>
        <span><i />{seasonId} / ADVANCEMENT</span>
        <span>{String(currentNumber).padStart(2, '0')} — {String(phaseCount).padStart(2, '0')} / {phaseLabel}</span>
        <span>{isArchive ? copy(locale, uiText("档案信号已锁定", locale), 'ARCHIVE SIGNAL LOCKED') : copy(locale, uiText("实时路径信号", locale), 'LIVE ROUTE SIGNAL')}</span>
      </div>

      <div className={styles.routeHeroStatement}>
        <span>THE ROAD TO THE TITLE</span>
        <h1 id="advance-signal-title">{copy(locale, <>{uiText("每一次胜负，", locale)}<em>{uiText("都有去向。", locale)}</em></>, <>EVERY RESULT<em>HAS A DESTINATION.</em></>)}</h1>
        <p>{isArchive
          ? copy(locale, uiText("选择一支队伍，系统会把整段季后赛压缩成一条路径；从第一场出发，沿每一次胜负抵达它的终点。", locale), 'Choose a team and the system compresses its postseason into one route—from the opening match through every result to its destination.')
          : copy(locale, uiText("选择一支队伍，沿每一次胜负，查看它的晋级去向和后续赛程。", locale), 'Choose a team and follow every result to see its advancement route and next matches.')}</p>
      </div>

      <div className={styles.routeHeroChampion}>
        <span>{isArchive ? 'ROUTE COMPLETE' : 'TITLE DESTINATION'}</span>
        <div>
          {champion ? <TeamLogo team={champion} seasonId={seasonId} className={styles.routeHeroChampionLogo} /> : <img src="/logos/fries-cup-symbol.png" alt="" />}
          <small>{copy(locale, uiText("最终抵达", locale), 'ARRIVAL')}</small>
        </div>
        <strong>{champion ? teamShort(champion) : 'TBD'}</strong>
        <p>{champion ? teamFull(champion) : copy(locale, uiText("冠军席位等待归属", locale), 'THE TITLE SLOT AWAITS')}</p>
        <b>{summary?.grandFinalScore || '— : —'}</b>
      </div>

      <div className={styles.routeHeroFooter}>
        <span>{copy(locale, uiText("胜者继续前进", locale), 'WINNERS ADVANCE')} <b>→</b></span>
        <span>{isSingleElimination
          ? copy(locale, uiText("败者止步冠军争夺", locale), 'LOSERS LEAVE THE TITLE RACE')
          : copy(locale, uiText("败者转入下一条生路", locale), 'LOSERS DROP TO THE NEXT LIFE')} <b>↘</b></span>
        <span>{copy(locale, uiText("向下选择阶段", locale), 'SCROLL TO CHOOSE A STAGE')} <b>↓</b></span>
      </div>
    </header>
  )
}
