import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import styles from './TeamHeroControls.module.css'

export default function TeamHeroControls({ report, review, selectHero, en, locale, updateQuery }) {
  const { hero, member, sample, counts } = review
  const choices = [...new Map([...report.heroes, ...report.bans.opponent, ...report.bans.own, ...(hero ? [hero] : [])].map(item => [item.key, item])).values()]
    .map(item => ({ ...item, label: formatOwHeroName(item.hero, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
  const samples = [['recorded', en ? 'Hero recorded' : uiText("英雄有记录", locale)], ['opponent', en ? 'Opponent banned' : uiText("对手禁用", locale)], ['own', en ? 'Team banned' : uiText("本队禁用", locale)]]
  const mapUnit = count => en ? (count === 1 ? 'map' : 'maps') : uiText("图", locale)
  return <div id="hero-review-controls" className={styles.controls} tabIndex={-1} role="group" aria-label={en ? 'Review scope' : uiText("复盘范围", locale)}>
    <label><span>{en ? 'Player scope' : uiText("成员范围", locale)}</span><select value={member?.id || ''} onChange={event => updateQuery({ member: event.target.value || null, performanceMember: null })}>
      <option value="">{en ? 'All players' : uiText("全部成员", locale)}</option>
      {report.members.map(player => <option key={player.id} value={player.id}>{player.name} · {player.maps} {mapUnit(player.maps)}</option>)}
    </select></label>
    <label><span>{en ? 'Hero scope' : uiText("英雄范围", locale)}</span><select value={hero?.key || ''} onChange={event => selectHero(event.target.value || null)}>
      <option value="">{en ? 'All heroes' : uiText("全部英雄", locale)}</option>
      {choices.map(choice => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
    </select></label>
    {hero ? <div className={styles.samples} role="group" aria-label={en ? 'Hero review records' : uiText("英雄复盘记录类型", locale)}>{samples.map(([key, label]) => <button key={key} type="button" aria-pressed={sample === key}
      aria-label={`${label} · ${counts[key] === null ? (en ? 'unrecorded' : uiText("未收录", locale)) : `${counts[key]} ${mapUnit(counts[key])}`}`}
      onClick={() => updateQuery({ heroSample: key === 'recorded' ? null : key })}>
      <span>{label}</span><b>{counts[key] ?? '—'}<small>{counts[key] === null ? (en ? 'unrecorded' : uiText("未收录", locale)) : mapUnit(counts[key])}</small></b>
    </button>)}</div> : <p className={styles.hint}>{en ? 'Choose a hero to follow its players, lineups and bans.' : uiText("选择一个英雄，联动查阅成员、阵容与禁用。", locale)}<span>{en ? 'The three sections below share this scope.' : uiText("以下三个区域使用同一筛选范围。", locale)}</span></p>}
  </div>
}
