import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPredictionBoard, fetchPredictionLeaderboard, savePrediction } from './predictionApi.js'
import { buildPredictionCenterView, filterPredictionMatches, getPredictionEmptyCopy } from './predictionCenterModel.js'
import styles from './PredictionCenter.module.css'

const LOCK_LABELS = {
  OPEN: '开放中', SCHEDULE_LOCK: '已锁盘', MATCH_STARTED: '比赛已开始', MATCH_IN_PROGRESS: '比赛进行中',
  MATCH_SUBMITTED: '赛果确认中', MATCH_COMPLETE: '比赛已结束', MATCH_LOCKED: '赛果已锁定', MATCH_CANCELLED: '比赛取消',
  ADMIN_FORCE_LOCK: '人工锁盘', ADMIN_FORCE_OPEN: '限时重开', ADMIN_REOPEN_EXPIRED: '重开已结束',
  SCHEDULE_DELAY_AFTER_LOCK: '延期前已锁盘', MATCH_SETTLED: '已结算', PREDICTIONS_DISABLED: '本届竞猜关闭',
  MATCH_TEAMS_PENDING: '对阵待定', SCHEDULE_PENDING: '时间待定', LOCK_MATERIALIZED: '已锁盘'
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '比赛时间待定'
}

function teamName(team) {
  return team?.shortName || team?.name || 'TBD'
}

function scoreOptions(targetWins) {
  return [
    ...Array.from({ length: targetWins }, (_, index) => [targetWins, index]),
    ...Array.from({ length: targetWins }, (_, index) => [index, targetWins])
  ]
}

function initialDraft(match) {
  return match.myPrediction
    ? { scoreA: match.myPrediction.scoreA, scoreB: match.myPrediction.scoreB, isPublic: match.myPrediction.isPublic }
    : { scoreA: null, scoreB: null, isPublic: false }
}

function TeamMark({ team }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.teamMark}>
      {team?.logoUrl ? <img src={team.logoUrl} alt="" /> : <span>{teamName(team).slice(0, 2)}</span>}
      <div><strong>{teamName(team)}</strong><small>{team?.name || uiText("对阵待定", uiLocale)}</small></div>
    </div>
  )
}

function MatchPredictionCard({ match, policy, eligibility, draft, onDraft, onSave, busy }) {
  const uiLocale = useUiLocale()
  const options = scoreOptions(match.targetWins)
  const settled = match.settlement?.myAward
  const hasSelection = Number.isInteger(draft.scoreA) && Number.isInteger(draft.scoreB)
  return (
    <article id={`prediction-match-${match.id}`} className={styles.matchCard} data-locked={match.lockState.locked} data-settled={Boolean(match.settlement)} data-lifecycle={match.lifecycle?.tone}>
      <header>
        <div><span>{match.stage} · {match.roundLabel || match.displayName}</span><p>{formatTime(match.scheduledAt)}</p></div>
        <em data-open={!match.lockState.locked}>{LOCK_LABELS[match.lockState.reason] || match.lockState.reason}</em>
      </header>
      <div className={styles.versus}>
        <TeamMark team={match.teamA} />
        <b>VS</b>
        <TeamMark team={match.teamB} />
      </div>

      <div className={styles.lifecycleStatus} data-tone={match.lifecycle?.tone}>
        <strong>{match.lifecycle?.label}</strong>
        <span>{match.lifecycle?.detail}</span>
      </div>

      {match.canPredict ? (
        <div className={styles.editor}>
          <div className={styles.scoreOptions}>
            {options.map(([scoreA, scoreB]) => <button key={`${scoreA}-${scoreB}`} type="button" aria-label={uiText("预测 {0} {1} 比 {2} {3}", uiLocale, [teamName(match.teamA), scoreA, scoreB, teamName(match.teamB)])} data-selected={draft.scoreA === scoreA && draft.scoreB === scoreB} onClick={() => onDraft({ ...draft, scoreA, scoreB })}><span>{teamName(match.teamA)}</span><strong>{scoreA} : {scoreB}</strong><span>{teamName(match.teamB)}</span></button>)}
          </div>
          <div className={styles.submitRow}><label><input type="checkbox" checked={draft.isPublic} onChange={event => onDraft({ ...draft, isPublic: event.target.checked })} />{uiText("锁盘后公开我的选择", uiLocale)}</label><button type="button" disabled={busy || !hasSelection} onClick={onSave}>{busy ? uiText("保存中…", uiLocale) : !hasSelection ? uiText("先选择比分", uiLocale) : match.myPrediction ? uiText("更新预测", uiLocale) : uiText("提交预测", uiLocale)}</button></div>
          <p>{uiText("锁盘前可反复修改，以最后一次提交为准。", uiLocale)}</p>
        </div>
      ) : !match.lockState.locked && !eligibility?.eligible ? <div className={styles.noPick}>{uiText("验证邮箱后即可提交本场预测", uiLocale)}</div> : match.myPrediction ? (
        <div className={styles.myLockedPick}><span>{uiText("我的预测", uiLocale)}</span><strong>{teamName(match.teamA)} {match.myPrediction.scoreA} : {match.myPrediction.scoreB} {teamName(match.teamB)}</strong><em>{match.myPrediction.isPublic ? uiText("已公开", uiLocale) : uiText("仅自己可见", uiLocale)}</em></div>
      ) : <div className={styles.noPick}>{uiText("本场未提交预测", uiLocale)}</div>}

      {match.lockState.locked && match.support ? (
        <section className={styles.support}>
          <div><span>{teamName(match.teamA)} {match.support.teamAPercentage}%</span><span>{match.support.teamBPercentage}% {teamName(match.teamB)}</span></div>
          <div className={styles.supportBar}><i style={{ width: `${match.support.teamAPercentage}%` }} /></div>
          <p>{match.support.total}{uiText(" 人参与 · 锁盘后才显示匿名支持比例", uiLocale)}</p>
        </section>
      ) : null}

      {match.status === 'CANCELLED' ? <div className={styles.voidResult}>{uiText("比赛取消，本场预测作废且不计分。", uiLocale)}</div> : null}
      {match.settlement ? <div className={styles.settlement}><div><span>{uiText("官方赛果", uiLocale)}</span><strong>{teamName(match.teamA)} {match.scoreA} : {match.scoreB} {teamName(match.teamB)}</strong></div>{settled ? <b data-points={settled.points > 0}>{settled.points > 0 ? `+${settled.points}` : '0'}{uiText(" 分", uiLocale)}<small>{settled.exactScoreCorrect ? uiText("精确比分", uiLocale) : settled.winnerCorrect ? uiText("猜中胜负", uiLocale) : uiText("未命中", uiLocale)}</small></b> : <b>{uiText("未参与", uiLocale)}</b>}</div> : null}
      <footer>{uiText("猜中胜负 +", uiLocale)}{policy.winnerPoints}{uiText(" · 精确比分再 +", uiLocale)}{policy.exactScoreBonus}</footer>
    </article>
  )
}

export default function PredictionCenter({ seasonId, standalone = false }) {
  const uiLocale = useUiLocale()
  const [tab, setTab] = useState('board')
  const [filter, setFilter] = useState('AVAILABLE')
  const [board, setBoard] = useState({ policy: { winnerPoints: 3, exactScoreBonus: 2 }, eligibility: { eligible: true }, matches: [] })
  const [leaderboard, setLeaderboard] = useState({ leaderboard: [], viewer: null, participants: 0 })
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [rankingError, setRankingError] = useState('')

  const load = useCallback(async () => {
    if (!seasonId) return
    setLoading(true); setError(''); setRankingError('')
    try {
      const [boardResult, leaderboardResult] = await Promise.allSettled([
        fetchPredictionBoard(seasonId),
        fetchPredictionLeaderboard(seasonId)
      ])
      if (boardResult.status === 'rejected') throw boardResult.reason
      const nextBoard = boardResult.value
      setBoard(nextBoard || { policy: { winnerPoints: 3, exactScoreBonus: 2 }, eligibility: { eligible: true }, matches: [] })
      setDrafts(Object.fromEntries((nextBoard?.matches || []).map(match => [match.id, initialDraft(match)])))
      if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value || { leaderboard: [], viewer: null, participants: 0 })
      else setRankingError(leaderboardResult.reason?.message || '排行榜暂时无法同步，竞猜场次仍可正常使用。')
    } catch (loadError) { setError(loadError?.message || '竞猜中心加载失败，请稍后重试。') }
    finally { setLoading(false) }
  }, [seasonId])

  useEffect(() => { load() }, [load])

  const centerView = useMemo(() => buildPredictionCenterView(board, leaderboard), [board, leaderboard])
  const visibleMatches = useMemo(
    () => filterPredictionMatches(centerView.matches, { tab, filter }),
    [centerView.matches, filter, tab]
  )
  const emptyCopy = useMemo(() => getPredictionEmptyCopy(tab, filter), [filter, tab])

  const submit = async match => {
    const draft = drafts[match.id]
    if (!Number.isInteger(draft?.scoreA) || !Number.isInteger(draft?.scoreB)) {
      setError('请先主动选择一个比分。')
      return
    }
    setBusy(match.id); setError('')
    try {
      await savePrediction(match.id, draft)
      await load()
    } catch (saveError) { setError(saveError?.message || '预测保存失败，请刷新后重试。') }
    finally { setBusy('') }
  }

  const switchToAction = action => {
    if (action.tab) setTab(action.tab)
    if (action.filter) setFilter(action.filter)
    requestAnimationFrame(() => {
      const target = action.targetId ? document.getElementById(`prediction-match-${action.targetId}`) : document.getElementById('prediction-content')
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const switchTab = value => {
    setTab(value)
    if (value === 'board') setFilter('AVAILABLE')
    if (value === 'mine') setFilter('ALL')
  }

  const Heading = standalone ? 'h1' : 'h2'
  const securityUrl = `/me?section=security${seasonId ? `&season=${encodeURIComponent(seasonId)}` : ''}`
  const tabs = [
    ['board', '竞猜场次', 'MATCHES', centerView.counts.open],
    ['mine', '我的预测', 'MY PICKS', centerView.counts.submitted],
    ['ranking', '本届排行', 'RANKING', centerView.counts.participants]
  ]

  return (
    <section className={`${styles.center} ${standalone ? styles.standalone : ''}`}>
      <header className={styles.hero}>
        <div><span>PREDICTION WORKSPACE</span><Heading>{uiText("赛事竞猜", uiLocale)}</Heading><p>{uiText("预测胜负和精确比分，积累本届独立积分；每届单独排行，只用于社区娱乐，不涉及购买、下注或兑现。", uiLocale)}</p></div>
        <button type="button" onClick={load} disabled={loading}>{loading ? uiText("同步中", uiLocale) : uiText("刷新状态", uiLocale)}</button>
      </header>

      <section className={styles.actionHero} data-action={centerView.action.key}>
        <div className={styles.actionMain}>
          <span>{centerView.action.eyebrow}</span>
          <strong>{centerView.action.headline}</strong>
          <p>{centerView.action.description}</p>
          {centerView.action.href === 'security'
            ? <Link to={securityUrl}>{centerView.action.label} →</Link>
            : <button type="button" onClick={() => switchToAction(centerView.action)}>{centerView.action.label} →</button>}
        </div>
        <div className={styles.actionScore}>
          <span>MY FCR POINTS</span>
          <strong>{centerView.viewer.points}<small>{uiText("分", uiLocale)}</small></strong>
          <em>{centerView.viewer.rank ? uiText("本届第 {0} 名", uiLocale, [centerView.viewer.rank]) : uiText("尚未进入本届排行", uiLocale)}</em>
          <p>{centerView.viewer.participated}{uiText(" 场已结算 · ", uiLocale)}{centerView.viewer.exactScoreCorrect}{uiText(" 场精确 · ", uiLocale)}{centerView.viewer.accuracy}{uiText("% 命中率", uiLocale)}</p>
        </div>
      </section>

      <section className={styles.factRail} aria-label={uiText("竞猜状态摘要", uiLocale)}>
        {centerView.facts.map(fact => <div key={fact.key}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}
        <div className={styles.ruleFact}><span>{uiText("固定得分", uiLocale)}</span><strong>+{board.policy?.winnerPoints ?? 3}<small> / +{board.policy?.exactScoreBonus ?? 2}</small></strong><small>{uiText("胜负命中 / 精确比分加分", uiLocale)}</small></div>
      </section>

      <section className={styles.lifecycleRail} aria-label={uiText("我的竞猜流程", uiLocale)}>
        <header><div><span>MY PREDICTION FLOW</span><strong>{uiText("我的竞猜进度", uiLocale)}</strong></div><p>{uiText("从提交到结算，每场预测都保留清晰、只读可追溯的状态。", uiLocale)}</p></header>
        <div>
          {centerView.lifecycle.map((stage, index) => (
            <button key={stage.key} type="button" data-stage={stage.key} data-empty={stage.value === 0} onClick={() => switchToAction(stage)}>
              <span>0{index + 1}</span><strong>{stage.value}</strong><b>{stage.label}</b><small>{stage.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <nav className={styles.tabs} role="tablist" aria-label={uiText("竞猜中心视图", uiLocale)}>
        {tabs.map(([value, label, en, count]) => <button key={value} type="button" role="tab" aria-selected={tab === value} aria-controls="prediction-content" data-active={tab === value} onClick={() => switchTab(value)}><span>{label}</span><em>{en}</em><b>{count}</b></button>)}
      </nav>
      {error ? <div className={styles.error}>{error}<button type="button" onClick={load}>{uiText("重试", uiLocale)}</button></div> : null}
      {!board.eligibility?.eligible ? <div className={styles.notice}>{uiText("邮箱验证完成后才可以提交或修改预测；场次、赛果和榜单仍可正常查看。", uiLocale)}</div> : null}

      <section id="prediction-content" className={styles.contentPanel} role="tabpanel">
        {tab !== 'ranking' ? <>
          <div className={styles.toolbar}>
            <div>
              <span>{tab === 'board' ? 'MATCH BOARD' : 'MY PICK HISTORY'}</span>
              <strong>{tab === 'board' ? uiText("选择一场比赛开始预测", uiLocale) : uiText("我的预测 · {0} 场", uiLocale, [visibleMatches.length])}</strong>
              <p>{tab === 'board' ? uiText("开放场次优先显示；锁盘后可以在“我的预测”中查看支持比例与结算结果。", uiLocale) : uiText("未锁盘场次仍可修改，锁盘后保留只读记录；赛后待结算与已结算会分别标记。", uiLocale)}</p>
            </div>
            <div className={styles.filters}>
              {(tab === 'board'
                ? [['AVAILABLE', '待预测'], ['OPEN', '开放中'], ['SETTLED', '已结算'], ['ALL', '全部']]
                : [['ALL', '全部'], ['EDITABLE', '可修改'], ['LOCKED', '已锁盘'], ['PENDING', '待结算'], ['SETTLED', '已结算']]
              ).map(([value, label]) => <button key={value} type="button" data-active={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
            </div>
          </div>
          {loading ? <div className={styles.empty}>{uiText("正在读取竞猜场次…", uiLocale)}</div> : visibleMatches.length ? <div className={styles.grid}>{visibleMatches.map(match => <MatchPredictionCard key={match.id} match={match} policy={board.policy} eligibility={board.eligibility} draft={drafts[match.id] || initialDraft(match)} onDraft={draft => setDrafts(current => ({ ...current, [match.id]: draft }))} onSave={() => submit(match)} busy={busy === match.id} />)}</div> : <div className={styles.empty}><span>{emptyCopy[0]}</span><strong>{emptyCopy[1]}</strong><p>{emptyCopy[2]}</p></div>}
        </> : (
          <section className={styles.ranking}>
            <header><div><span>FCR POINTS</span><h3>{seasonId}{uiText(" 竞猜榜", uiLocale)}</h3><p>{uiText("每届独立排行；同分并列，精确比分、胜负命中和命中率仅作为表现数据展示。", uiLocale)}</p></div><em>{leaderboard.participants}{uiText(" 人上榜", uiLocale)}</em></header>
            {rankingError ? <div className={styles.error}>{rankingError}<button type="button" onClick={load}>{uiText("重试榜单", uiLocale)}</button></div> : null}
            {leaderboard.viewer ? <div className={styles.viewerRow}><span>{uiText("我的排名", uiLocale)}</span><strong>#{leaderboard.viewer.rank}</strong><b>{leaderboard.viewer.points}{uiText(" 分", uiLocale)}</b><em>{leaderboard.viewer.exactScoreCorrect}{uiText(" 场精确 · ", uiLocale)}{leaderboard.viewer.winnerCorrect}/{leaderboard.viewer.participated}{uiText(" 胜负命中", uiLocale)}</em></div> : <div className={styles.viewerEmpty}><span>NOT RANKED YET</span><strong>{uiText("提交并结算一场预测后进入本届排行", uiLocale)}</strong></div>}
            {leaderboard.leaderboard.length ? <div className={styles.rankTable}><div className={styles.rankHead}><span>{uiText("排名", uiLocale)}</span><span>{uiText("用户", uiLocale)}</span><span>{uiText("积分", uiLocale)}</span><span>{uiText("精确", uiLocale)}</span><span>{uiText("胜负命中", uiLocale)}</span><span>{uiText("命中率", uiLocale)}</span></div>{leaderboard.leaderboard.map(row => <div key={row.userId} data-viewer={leaderboard.viewer?.userId === row.userId}><b>#{row.rank}</b><span>{row.displayName}<small>{row.username ? `@${row.username}` : ''}</small></span><strong>{row.points}</strong><span>{row.exactScoreCorrect}</span><span>{row.winnerCorrect}/{row.participated}</span><span>{Math.round(row.accuracy * 100)}%</span></div>)}</div> : <div className={styles.empty}><span>RANKING EMPTY</span><strong>{uiText("本届排行榜等待首场结算", uiLocale)}</strong><p>{uiText("赛果正式确认后，积分会自动进入本届排行榜。", uiLocale)}</p></div>}
          </section>
        )}
      </section>

      <section className={styles.scoringGuide} aria-label={uiText("竞猜积分说明", uiLocale)}>
        <header><span>SCORING RULES</span><strong>{uiText("积分如何计算", uiLocale)}</strong><p>{uiText("每届独立累计，只有正式结算的场次进入排行榜。", uiLocale)}</p></header>
        <div><span>01</span><strong>{uiText("猜中胜负", uiLocale)}</strong><b>+{board.policy?.winnerPoints ?? 3}{uiText(" 分", uiLocale)}</b><small>{uiText("无论比分是否精确，只要胜方正确即可获得。", uiLocale)}</small></div>
        <div><span>02</span><strong>{uiText("精确比分", uiLocale)}</strong><b>{uiText("再 +", uiLocale)}{board.policy?.exactScoreBonus ?? 2}{uiText(" 分", uiLocale)}</b><small>{uiText("建立在猜中胜负之上，作为额外奖励累加。", uiLocale)}</small></div>
        <div><span>03</span><strong>{uiText("未命中", uiLocale)}</strong><b>{uiText("0 分", uiLocale)}</b><small>{uiText("不扣分；已经锁盘的选择不能补交或修改。", uiLocale)}</small></div>
        <div><span>04</span><strong>{uiText("取消或作废", uiLocale)}</strong><b>{uiText("不计分", uiLocale)}</b><small>{uiText("场次取消或结算撤销后，不保留本场所得积分。", uiLocale)}</small></div>
      </section>
    </section>
  )
}
