const STAGES = {
  GROUP: { title: '小组赛', label: 'GROUP STAGE' },
  SWISS: { title: '瑞士轮', label: 'SWISS STAGE' },
  LCQ: { title: '突围赛', label: 'BREAKTHROUGH' },
  PLAYOFFS: { title: '季后赛', label: 'PLAYOFFS · FINAL INCLUDED' }
}

export function getMatchArchiveStages(matches = []) {
  const counts = new Map()
  for (const match of matches) {
    const stage = String(match?.stage || '').trim().toUpperCase()
    if (stage) counts.set(stage, (counts.get(stage) || 0) + 1)
  }
  const values = [...Object.keys(STAGES), ...counts.keys()].filter((value, index, all) => all.indexOf(value) === index && counts.has(value))
  return values.map(value => ({ value, ...(STAGES[value] || { title: value, label: value }), count: counts.get(value) }))
}
