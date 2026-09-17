import { translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getExactScheduleTeam, getScheduleSearchTeams, getScheduleTeamCandidates } from './scheduleTeamSearch.js'
import styles from './ScheduleTeamSearch.module.css'

export default function ScheduleTeamSearch({ matches, value, onValueChange, onSelectTeam, onSearch, inputRef, variant = 'featured' }) {
  const { locale = 'zh-CN', seasonId } = useOutletContext()
  const en = locale === 'en-US'
  const uid = useId()
  const composing = useRef(false)
  const [isComposing, setIsComposing] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState({ query: '', index: -1 })
  const teams = useMemo(() => getScheduleSearchTeams(matches), [matches])
  const candidates = useMemo(() => getScheduleTeamCandidates(teams, value), [teams, value])
  const activeIndex = active.query === value && active.index < candidates.length ? active.index : -1
  const expanded = open && !isComposing && candidates.length > 0
  const select = team => { setOpen(false); setActive({ query: '', index: -1 }); onSelectTeam(team) }
  const submit = event => {
    event.preventDefault()
    if (composing.current) return
    const team = expanded && activeIndex >= 0 ? candidates[activeIndex] : getExactScheduleTeam(teams, value)
    if (team) select(team)
    else { setOpen(false); onSearch(value) }
  }
  const onKeyDown = event => {
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') { if (open) event.preventDefault(); setOpen(false); return }
    if (!candidates.length || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    setOpen(true)
    setActive({ query: value, index: !expanded || activeIndex < 0 ? event.key === 'ArrowDown' ? 0 : candidates.length - 1 : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length })
  }
  const label = variant === 'featured' ? en ? 'Find a team' : uiText("按队伍查找", locale) : en ? 'Search teams' : uiText("搜索队伍", locale)
  return <form className={styles.root} data-variant={variant} role="search" aria-label={en ? 'Find team fixtures' : uiText("查找队伍赛程", locale)} onSubmit={submit} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label className={variant === 'featured' ? styles.label : styles.srOnly} htmlFor={uid}>{label}</label>
    <div className={styles.inputRow}>
      {variant === 'index' ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg> : null}
      <ImeSafeInput id={uid} ref={inputRef} role="combobox" aria-expanded={expanded} aria-autocomplete="list" aria-controls={expanded ? uid + '-options' : undefined} aria-activedescendant={expanded && activeIndex >= 0 ? uid + '-option-' + activeIndex : undefined} aria-describedby={uid + '-help'} autoComplete="off" value={value} onValueChange={next => { setActive({ query: next, index: -1 }); setOpen(true); onValueChange(next) }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} onCompositionStart={() => { composing.current = true; setIsComposing(true); setOpen(false) }} onCompositionEnd={() => { composing.current = false; setIsComposing(false); setOpen(true) }} placeholder={en ? 'Team name or abbreviation…' : uiText("队伍名称或简称…", locale)} />
      {variant === 'featured' ? <button type="submit" className={styles.submit} aria-label={en ? 'Search matches' : uiText("查找比赛", locale)}><span aria-hidden="true">↗</span></button> : null}
      {variant === 'index' && value ? <button type="button" className={styles.clear} aria-label={en ? 'Clear team search' : uiText('清除队伍搜索', locale)} onClick={() => { onValueChange(''); setOpen(false); setActive({ query: '', index: -1 }); inputRef?.current?.focus({ preventScroll: true }) }}><span aria-hidden="true">×</span></button> : null}
    </div>
    <span className={styles.srOnly} id={uid + '-help'}>{en ? 'Use arrow keys to choose a team, Enter to open its fixtures, or Escape to close suggestions.' : uiText("使用上下键选择队伍，按回车查看赛程，按 Esc 关闭候选。", locale)}</span>
    {expanded ? <div className={styles.popup}>
      <div className={styles.popupHeading}>{en ? 'Choose a team' : uiText("选择队伍，查看本届赛程", locale)}</div>
      <ul id={uid + '-options'} role="listbox" aria-label={en ? 'Matching teams' : uiText("匹配队伍", locale)}>
        {candidates.map((team, index) => <li key={team.id} id={uid + '-option-' + index} role="option" aria-selected={activeIndex === index} aria-label={`${team.short} · ${team.full} · ${team.matchCount} ${en ? 'matches this season' : uiText("场本届比赛", locale)}`} onPointerDown={event => event.preventDefault()} onClick={() => select(team)} onMouseMove={() => setActive({ query: value, index })}>
          <TeamLogo team={team.team} seasonId={seasonId} className={styles.logo} />
          <span className={styles.identity}><strong>{team.short}</strong><small>{team.full}</small></span>
          <span className={styles.count}>{en ? `${team.matchCount} matches` : uiText("{0} 场", locale, [team.matchCount])}<i aria-hidden="true">↗</i></span>
        </li>)}
      </ul>
    </div> : null}
  </form>
}
