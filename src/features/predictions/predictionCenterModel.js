const RESULT_PENDING_STATUSES = new Set(['SUBMITTED', 'COMPLETE', 'LOCKED'])
const RESULT_PENDING_REASONS = new Set(['MATCH_SUBMITTED', 'MATCH_COMPLETE', 'MATCH_LOCKED'])
const MATCH_RUNNING_STATUSES = new Set(['IN_PROGRESS'])
const MATCH_RUNNING_REASONS = new Set(['MATCH_STARTED', 'MATCH_IN_PROGRESS'])

function matchTime(match) {
  const value = new Date(match?.scheduledAt || 0).getTime()
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value
}

function matchLabel(match) {
  const teamA = match?.teamA?.shortName || match?.teamA?.name || 'TBD'
  const teamB = match?.teamB?.shortName || match?.teamB?.name || 'TBD'
  return `${teamA} vs ${teamB}`
}

export function sortPredictionMatches(matches = []) {
  return [...matches].sort((left, right) => matchTime(left) - matchTime(right))
}

export function getPredictionLifecycle(match = {}) {
  const status = String(match.status || '').toUpperCase()
  const reason = String(match.lockState?.reason || '').toUpperCase()
  const locked = Boolean(match.lockState?.locked)
  const submitted = Boolean(match.myPrediction)

  if (status === 'CANCELLED' || reason === 'MATCH_CANCELLED') {
    return { key: 'CANCELLED', label: '比赛已取消', detail: '本场预测作废，不计积分。', tone: 'muted' }
  }
  if (match.settlement) {
    return { key: 'SETTLED', label: '已结算', detail: submitted ? '积分和本届排名已经更新。' : '官方赛果与竞猜结算已经确认。', tone: 'settled' }
  }
  if (submitted && (RESULT_PENDING_STATUSES.has(status) || RESULT_PENDING_REASONS.has(reason))) {
    return { key: 'AWAITING', label: '赛后待结算', detail: '正式赛果确认中，结算后积分会自动更新。', tone: 'pending' }
  }
  if (submitted && (MATCH_RUNNING_STATUSES.has(status) || MATCH_RUNNING_REASONS.has(reason))) {
    return { key: 'LOCKED', label: '比赛进行中', detail: '预测已经锁定，等待比赛结束与赛果确认。', tone: 'locked' }
  }
  if (!locked && submitted) {
    return { key: 'EDITABLE', label: '已提交 · 可修改', detail: '锁盘前仍可调整，以最后一次提交为准。', tone: 'editable' }
  }
  if (!locked && !submitted) {
    return { key: 'AVAILABLE', label: '等待预测', detail: '尚未提交，请在锁盘前完成预测。', tone: 'available' }
  }
  if (submitted) {
    return { key: 'LOCKED', label: '已提交 · 待开赛', detail: '本场已经锁盘，预测保留为只读记录。', tone: 'locked' }
  }
  return { key: 'MISSED', label: '已错过', detail: '本场已经锁盘，无法补交预测。', tone: 'muted' }
}

function decoratePredictionMatches(matches = []) {
  return sortPredictionMatches(matches).map(match => ({
    ...match,
    lifecycle: getPredictionLifecycle(match)
  }))
}

export function filterPredictionMatches(matches = [], { tab = 'board', filter = 'AVAILABLE' } = {}) {
  const sorted = decoratePredictionMatches(matches)
  if (tab === 'mine') {
    const mine = sorted.filter(match => Boolean(match.myPrediction))
    if (filter === 'ALL') return mine
    if (filter === 'EDITABLE') return mine.filter(match => match.lifecycle.key === 'EDITABLE')
    if (filter === 'LOCKED') return mine.filter(match => match.lifecycle.key === 'LOCKED')
    if (filter === 'PENDING') return mine.filter(match => match.lifecycle.key === 'AWAITING')
    if (filter === 'SETTLED') return mine.filter(match => match.lifecycle.key === 'SETTLED')
    return mine
  }
  if (filter === 'ALL') return sorted
  if (filter === 'OPEN') return sorted.filter(match => ['AVAILABLE', 'EDITABLE'].includes(match.lifecycle.key))
  if (filter === 'SETTLED') return sorted.filter(match => match.lifecycle.key === 'SETTLED')
  return sorted.filter(match => match.lifecycle.key === 'AVAILABLE')
}

export function getPredictionEmptyCopy(tab, filter) {
  if (tab === 'mine') {
    const copies = {
      EDITABLE: ['NO EDITABLE PICKS', '没有仍可修改的预测', '已提交且尚未锁盘的预测会出现在这里。'],
      LOCKED: ['NO LOCKED PICKS', '没有已锁盘的预测', '预测锁盘或比赛开始后会进入这一阶段。'],
      PENDING: ['NO PENDING RESULTS', '没有待结算的预测', '比赛结束并提交赛果后，会等待赛果确认和统一结算。'],
      SETTLED: ['NO SETTLED PICKS', '还没有已结算记录', '正式赛果确认后，所得积分会保留在这里。']
    }
    return copies[filter] || ['MY PICKS EMPTY', '还没有提交过预测', '返回竞猜场次，选择一场尚未锁盘的比赛开始。']
  }
  if (filter === 'SETTLED') return ['NO SETTLEMENTS', '本届还没有已结算竞猜', '正式赛果确认后，结算记录会出现在这里。']
  if (filter === 'ALL') return ['NO MATCHES', '本届还没有竞猜场次', '新赛程确认后会自动出现在这里。']
  if (filter === 'OPEN') return ['NO OPEN MATCHES', '当前没有开放中的竞猜', '新场次开放或限时重开后会出现在这里。']
  return ['ALL PICKS SAVED', '当前没有待提交的预测', '你可以检查“我的预测”，或等待下一批场次开放。']
}

export function buildPredictionCenterView(board = {}, leaderboard = {}) {
  const matches = decoratePredictionMatches(board?.matches || [])
  const eligible = board?.eligibility?.eligible !== false
  const byLifecycle = key => matches.filter(match => match.lifecycle.key === key)
  const openWithoutPick = byLifecycle('AVAILABLE')
  const submittedOpen = byLifecycle('EDITABLE')
  const lockedPending = byLifecycle('LOCKED')
  const awaitingSettlement = byLifecycle('AWAITING')
  const settledMatches = byLifecycle('SETTLED')
  const submittedMatches = matches.filter(match => Boolean(match.myPrediction))
  const settledSubmitted = settledMatches.filter(match => Boolean(match.myPrediction))
  const openMatches = [...openWithoutPick, ...submittedOpen]
  const viewer = leaderboard?.viewer || null
  const participated = Number(viewer?.participated || settledSubmitted.length || 0)
  const winnerCorrect = Number(viewer?.winnerCorrect || 0)
  const accuracy = participated ? Math.round((winnerCorrect / participated) * 100) : 0

  let action
  if (!eligible) {
    action = {
      key: 'verify',
      eyebrow: 'ACCOUNT REQUIRED',
      headline: '完成邮箱验证后即可参与',
      description: `目前有 ${openMatches.length} 场开放竞猜；验证前仍可查看场次、赛果和排行榜。`,
      label: '前往账号设置',
      href: 'security'
    }
  } else if (openWithoutPick.length) {
    const nextMatch = openWithoutPick[0]
    action = {
      key: 'predict',
      eyebrow: 'NEXT PICK',
      headline: `还有 ${openWithoutPick.length} 场等待你预测`,
      description: `下一场是 ${matchLabel(nextMatch)}；锁盘前可以反复修改，以最后一次提交为准。`,
      label: '现在预测',
      tab: 'board',
      filter: 'AVAILABLE',
      targetId: nextMatch.id
    }
  } else if (submittedOpen.length) {
    action = {
      key: 'complete',
      eyebrow: 'ALL PICKS SAVED',
      headline: '当前开放场次都已提交',
      description: `你有 ${submittedOpen.length} 场预测尚未锁盘；如需调整，可在“我的预测”中修改。`,
      label: '检查可修改预测',
      tab: 'mine',
      filter: 'EDITABLE',
      targetId: submittedOpen[0]?.id || ''
    }
  } else if (awaitingSettlement.length) {
    action = {
      key: 'waiting',
      eyebrow: 'RESULT PENDING',
      headline: '赛果已提交，等待正式结算',
      description: `${awaitingSettlement.length} 场预测正在等待赛果确认；结算完成后积分和排名会自动更新。`,
      label: '查看待结算预测',
      tab: 'mine',
      filter: 'PENDING',
      targetId: awaitingSettlement[0]?.id || ''
    }
  } else if (lockedPending.length) {
    action = {
      key: 'locked',
      eyebrow: 'PICKS LOCKED',
      headline: '预测已锁盘，等待比赛进行',
      description: `${lockedPending.length} 场预测已经只读保留；比赛结束并确认赛果后会进入结算。`,
      label: '查看已锁盘预测',
      tab: 'mine',
      filter: 'LOCKED',
      targetId: lockedPending[0]?.id || ''
    }
  } else if (settledSubmitted.length) {
    action = {
      key: 'settled',
      eyebrow: 'ROUND COMPLETE',
      headline: '本轮竞猜已经结算',
      description: `你已结算 ${settledSubmitted.length} 场，本届累计 ${Number(viewer?.points || 0)} 分。新赛程确认后会自动开放下一轮。`,
      label: '查看本届排行',
      tab: 'ranking'
    }
  } else {
    action = {
      key: 'empty',
      eyebrow: 'WAITING FOR MATCHES',
      headline: '等待本届竞猜开放',
      description: '对阵与比赛时间确认后，可参与场次会自动出现在这里。',
      label: '查看本届排行',
      tab: 'ranking'
    }
  }

  const lifecycle = [
    { key: 'available', label: '当前可预测', value: openWithoutPick.length, detail: openWithoutPick.length ? '需要在锁盘前提交' : '当前没有遗漏', tab: 'board', filter: 'AVAILABLE', targetId: openWithoutPick[0]?.id || '' },
    { key: 'submitted', label: '已提交待开赛', value: submittedOpen.length + lockedPending.length, detail: lockedPending.length ? `${lockedPending.length} 场已锁盘` : '锁盘前仍可修改', tab: 'mine', filter: submittedOpen.length ? 'EDITABLE' : 'LOCKED', targetId: (submittedOpen[0] || lockedPending[0])?.id || '' },
    { key: 'pending', label: '赛后待结算', value: awaitingSettlement.length, detail: '等待正式赛果确认', tab: 'mine', filter: 'PENDING', targetId: awaitingSettlement[0]?.id || '' },
    { key: 'settled', label: '已结算记录', value: settledSubmitted.length, detail: '积分计入本届排行', tab: 'mine', filter: 'SETTLED', targetId: settledSubmitted[0]?.id || '' }
  ]

  return {
    action,
    matches,
    lifecycle,
    counts: {
      open: openMatches.length,
      unsubmitted: openWithoutPick.length,
      editable: submittedOpen.length,
      submitted: submittedMatches.length,
      locked: lockedPending.length,
      settled: settledMatches.length,
      settledMine: settledSubmitted.length,
      awaitingSettlement: awaitingSettlement.length,
      participants: Number(leaderboard?.participants || 0)
    },
    viewer: {
      rank: viewer?.rank || null,
      points: Number(viewer?.points || 0),
      participated,
      winnerCorrect,
      exactScoreCorrect: Number(viewer?.exactScoreCorrect || 0),
      accuracy
    },
    facts: [
      { key: 'open', label: '开放场次', value: String(openMatches.length), detail: openWithoutPick.length ? `${openWithoutPick.length} 场待提交` : '当前已全部提交' },
      { key: 'submitted', label: '我的预测', value: String(submittedMatches.length), detail: awaitingSettlement.length ? `${awaitingSettlement.length} 场赛后待结算` : '包含只读与结算记录' },
      { key: 'settled', label: '已经结算', value: String(settledSubmitted.length), detail: `${winnerCorrect} 场猜中胜负` },
      { key: 'points', label: '本届积分', value: String(Number(viewer?.points || 0)), detail: viewer?.rank ? `当前第 ${viewer.rank} 名` : '结算后进入排行' }
    ]
  }
}
