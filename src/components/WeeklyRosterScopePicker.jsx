export default function WeeklyRosterScopePicker({value,onChange,scopes=[],en=false}) {
  return <label style={{display:'flex',gap:'.6rem',alignItems:'center',flexWrap:'wrap',marginBlock:'.8rem'}}>{en?'Roster':'名单范围'}
    <select value={value} onChange={event=>onChange(event.target.value)} aria-label={en?'Roster scope':'名单范围'}>
      <option value="current">{en?'Current team':'当前在队'}</option>
      {scopes.map(scope=><option key={scope.id} value={scope.id}>{scope.label}</option>)}
      <option value="history">{en?'All season records':'全季历史'}</option>
    </select>
    <small>{value==='history'?(en?'Includes former members':'包含离队记录，保留历史出场'):(en?'Weekly roster is not the sealed starting lineup':'周名单为参赛资格名单，比赛首发仍按房间同时公开')}</small>
  </label>
}
