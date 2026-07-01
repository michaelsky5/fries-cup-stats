import { useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import styles from './ManagerNextPage.module.css'
import {
  buildExportFileName,
  buildNextPlayerPool,
  calculateActiveRunPower,
  deployRunRoster,
  finishActiveRun,
  getLevelProgress,
  getManagerTitle,
  getRoleCounts,
  getRosterBuildReport,
  getSigningPreview,
  getUnlockedPerks,
  hireRunPlayer,
  importManagerSave,
  isRunRosterComplete,
  loadManagerSave,
  MARKET_REFRESH_COST,
  refreshRunMarket,
  resolveRunChoice,
  RUN_ROSTER_REQUIREMENTS,
  serializeManagerSave,
  simulateRunMatch,
  sellRunPlayer,
  startNewRun
} from '../engine/saveManager.js'

function cx(...items) {
  return items.filter(Boolean).join(' ')
}

function StatPill({ label, value, sub, tone = 'default' }) {
  return (
    <div className={cx(styles.statPill, styles[`stat_${tone}`])}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <em>{sub}</em> : null}
    </div>
  )
}

function CommandButton({ label, value, onClick, disabled, tone = 'default' }) {
  return (
    <button type="button" className={cx(styles.commandButton, styles[`command_${tone}`])} onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

function PlayerRow({ player, actionLabel, onAction }) {
  return (
    <div className={styles.playerRow}>
      <div className={styles.playerRole}>{player.role}</div>
      <div className={styles.playerMain}>
        <strong>{player.name}</strong>
        <span>{player.team} / {player.hero || '未知英雄'} / {player.styleName || player.playstyle || '均衡'} / {player.risk || '常规'}</span>
      </div>
      <div className={styles.playerPower}>{player.ovr}</div>
      <div className={styles.traitList}>
        {(player.traits || []).map(trait => <span key={trait}>{trait}</span>)}
      </div>
      {onAction ? (
        <button type="button" className={styles.rowAction} onClick={() => onAction(player.id)}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function SeasonMap({ run }) {
  if (!run?.route?.length) {
    return (
      <aside className={styles.seasonMap}>
        <div className={styles.sideHead}>
          <span>ROUTE</span>
          <strong>等待开局</strong>
        </div>
        <div className={styles.emptyMap}>NEW RUN</div>
      </aside>
    )
  }

  return (
    <aside className={styles.seasonMap}>
      <div className={styles.sideHead}>
        <span>SEASON MAP</span>
        <strong>Stage {run.stage} / {run.targetStage}</strong>
      </div>
      <div className={styles.routeStack}>
        {run.route.map((type, index) => {
          const stage = index + 1
          const state = stage < run.stage ? 'done' : stage === run.stage ? 'current' : 'next'
          return (
            <div key={`${type}-${stage}`} className={cx(styles.routeNode, styles[`route_${state}`])}>
              <span>{String(stage).padStart(2, '0')}</span>
              <strong>{getNodeLabel(type)}</strong>
              <i />
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function StartPanel({ onStart, disabled, poolCounts, playerPoolSize, hall }) {
  return (
    <section className={styles.startPanel}>
      <div className={styles.broadcastBackdrop} aria-hidden="true" />
      <div className={styles.startCopy}>
        <span>FRIES CUP ROGUE MANAGER</span>
        <h1>开局组队</h1>
        <p>2000K 预算，组出 1T / 2D / 2S，然后把这支队伍推进赛季路线。</p>
      </div>
      <div className={styles.startActions}>
        <button type="button" className={styles.bigStartButton} onClick={onStart} disabled={disabled}>
          <span>NEW RUN</span>
          <strong>进入选人室</strong>
        </button>
        <div className={styles.poolReadout}>
          <StatPill label="候选池" value={playerPoolSize} sub="当前赛季数据" />
          <StatPill label="TANK" value={poolCounts.TANK} />
          <StatPill label="DPS" value={poolCounts.DPS} />
          <StatPill label="SUP" value={poolCounts.SUP} />
        </div>
      </div>
      {hall.length ? (
        <div className={styles.quickHall}>
          {hall.slice(0, 2).map(record => (
            <article key={record.id}>
              <span>{record.result}</span>
              <strong>Stage {record.stage} / {record.power}</strong>
              <em>{record.roster?.map(player => player.name).slice(0, 3).join(' / ')}</em>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function EncounterPanel({ run, onChoice, onMatch }) {
  const encounter = run?.encounter
  if (!encounter) return null

  const isMatch = encounter.type === 'match' || encounter.type === 'boss'

  return (
    <section className={styles.encounterPanel}>
      <div className={styles.stageHeader}>
        <div>
          <span>{encounter.label}</span>
          <h2>{encounter.title}</h2>
        </div>
        <b>{isMatch ? 'MATCH' : 'CHOICE'}</b>
      </div>
      <p className={styles.encounterDesc}>{encounter.desc}</p>

      {isMatch ? (
        <div className={styles.matchBoard}>
          <div className={styles.opponentCard}>
            <span>OPPONENT</span>
            <strong>{encounter.opponent?.name || '未知对手'}</strong>
            <em>{encounter.opponent?.scout || '暂无情报'}</em>
          </div>
          <div className={styles.powerCard}>
            <span>POWER</span>
            <strong>{encounter.opponent?.power || '--'}</strong>
            <em>{encounter.opponent?.tacticStyle || 'BALANCED'}</em>
          </div>
          <button type="button" className={styles.matchButton} onClick={onMatch}>
            <span>LOCK IN</span>
            <strong>执行比赛</strong>
          </button>
        </div>
      ) : (
        <div className={styles.choiceGrid}>
          {(encounter.choices || []).map(choice => (
            <button key={choice.id} type="button" className={styles.choiceCard} onClick={() => onChoice(choice.id)}>
              <span>{choice.rarity || (choice.cost ? `${choice.cost}K` : 'OPTION')}</span>
              <strong>{choice.name}</strong>
              <em>{choice.desc}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ReviewPanel({ review }) {
  if (!review) return null

  return (
    <section className={styles.reviewPanel}>
      <div className={styles.panelHead}>
        <span>POST MATCH</span>
        <strong>{review.result === 'WIN' ? '胜利复盘' : '失利复盘'}</strong>
      </div>
      <div className={styles.reviewGrid}>
        <StatPill label="最终得分" value={review.finalScore} sub={`阵容 ${review.rosterPower}`} tone={review.result === 'WIN' ? 'good' : 'danger'} />
        <StatPill label="对手强度" value={review.opponentPower} sub={review.opponent} />
        <StatPill label="战术边际" value={review.counterEdge > 0 ? `+${review.counterEdge}` : review.counterEdge} sub={review.tactic} />
        <StatPill label="关键选手" value={review.keyPlayer} sub={review.opponentTactic} />
      </div>
      <div className={styles.reviewNotes}>
        {(review.notes || []).map(note => <span key={note}>{note}</span>)}
      </div>
    </section>
  )
}

function ModifierStack({ run, compact = false }) {
  const groups = [
    { key: 'relics', label: '遗物', items: run?.relics || [] },
    { key: 'curses', label: '诅咒', items: run?.curses || [] },
    { key: 'temporaryBuffs', label: '爆种', items: run?.temporaryBuffs || [] }
  ].filter(group => group.items.length)

  if (!groups.length) {
    return compact ? <p className={styles.emptyText}>暂无遗物或临时效果。</p> : null
  }

  return (
    <div className={styles.modifierStack}>
      {groups.map(group => (
        <div key={group.key} className={styles.modifierGroup}>
          <div className={styles.miniHead}>
            <span>{group.key.toUpperCase()}</span>
            <strong>{group.label}</strong>
          </div>
          <div className={styles.modifierList}>
            {group.items.map(item => (
              <article key={item.id} className={group.key === 'curses' ? styles.curseItem : ''}>
                <span>{item.rarity || (item.duration ? `${item.duration} 场` : 'RUN')}</span>
                <strong>{item.name}</strong>
                <em>{item.desc || `还剩 ${item.duration || 1} 场。`}</em>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BuilderPanel({ run, onHire, onSell, onRefresh, onDeploy }) {
  if (!run) return null

  const counts = getRoleCounts(run.roster)
  const complete = isRunRosterComplete(run)
  const refreshCost = Number(run.freeRefreshes || 0) > 0 ? 0 : MARKET_REFRESH_COST
  const report = getRosterBuildReport(run.roster, run.sponsors, run.tactic)

  return (
    <section className={styles.builderPanel}>
      <div className={styles.stageHeader}>
        <div>
          <span>OPENING ROSTER</span>
          <h2>2000K 组建首发</h2>
        </div>
        <button type="button" className={styles.deployButton} onClick={onDeploy} disabled={!complete}>
          确认出征
        </button>
      </div>

      <div className={styles.builderGrid}>
        <div className={styles.rosterDraft}>
          <div className={styles.roleMeter}>
            {Object.entries(RUN_ROSTER_REQUIREMENTS).map(([role, required]) => (
              <span key={role} className={counts[role] === required ? styles.roleFilled : ''}>
                {role} {counts[role]}/{required}
              </span>
            ))}
          </div>

          <div className={styles.buildReport}>
            <span>BUILD READ</span>
            <strong>{report.dominantStyle?.label || '阵容未成型'}</strong>
            <em>{report.summary}</em>
            <div className={styles.bonusList}>
              {report.bonuses.length ? (
                report.bonuses.slice(0, 4).map(bonus => (
                  <b key={bonus.id}>+{bonus.value} {bonus.label}</b>
                ))
              ) : (
                <b>暂无羁绊奖励</b>
              )}
            </div>
          </div>

          <div className={styles.rosterList}>
            {(run.roster || []).length ? (
              run.roster.map(player => (
                <PlayerRow key={player.id} player={player} actionLabel="解约" onAction={onSell} />
              ))
            ) : (
              <p className={styles.emptyText}>首发席位空置。</p>
            )}
          </div>
        </div>

        <div className={styles.marketPanel}>
          <div className={styles.marketHead}>
            <div>
              <span>SCOUT MARKET</span>
              <strong>候选市场</strong>
            </div>
            <button type="button" onClick={onRefresh} disabled={run.funds < refreshCost}>
              刷新 {refreshCost === 0 ? 'FREE' : `${refreshCost}K`}
            </button>
          </div>

          <div className={styles.marketGrid}>
            {(run.market || []).length ? (
              (run.market || []).map(player => {
                const roleFull = counts[player.role] >= (RUN_ROSTER_REQUIREMENTS[player.role] || 0)
                const tooExpensive = Number(run.funds || 0) < Number(player.price || 0)
                const preview = getSigningPreview(run, player)
                return (
                  <button
                    key={player.id}
                    type="button"
                    className={styles.marketCard}
                    onClick={() => onHire(player.id)}
                    disabled={roleFull || tooExpensive}
                  >
                    <span>{player.role} / {player.price}K / {preview?.fitLabel || '候选'}</span>
                    <strong>{player.name}</strong>
                    <em>{player.team} / {player.hero || '未知英雄'} / {player.styleName || player.playstyle || '均衡'}</em>
                    <b>{preview ? `${preview.powerDelta >= 0 ? '+' : ''}${preview.powerDelta} 战力` : `${player.ovr} OVR`}</b>
                    <small>{roleFull ? '位置已满' : tooExpensive ? '资金不足' : preview?.notes?.join(' / ') || (player.traits || []).join(' / ')}</small>
                    <div className={styles.marketTags}>
                      <i>OVR {player.ovr}</i>
                      <i>上限 {player.ceiling || player.ovr}</i>
                      <i>{player.risk || '常规'}</i>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className={styles.emptyText}>当前没有可用候选人。</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function RunSidebar({ run, activePower, activeCounts }) {
  if (!run) {
    return (
      <aside className={styles.runSidebar}>
        <div className={styles.sideHead}>
          <span>LOCKER ROOM</span>
          <strong>暂无队伍</strong>
        </div>
        <p className={styles.emptyText}>开始一局后，阵容、效果和日志会固定在这里。</p>
      </aside>
    )
  }

  return (
    <aside className={styles.runSidebar}>
      <div className={styles.sideHead}>
        <span>{run.status === 'building' ? 'DRAFT ROOM' : 'RUN CONSOLE'}</span>
        <strong>{run.status === 'building' ? '组队阶段' : `Stage ${run.stage}`}</strong>
      </div>

      <div className={styles.sideStats}>
        <StatPill label="战力" value={activePower} sub={`资金 ${run.funds}K`} tone="gold" />
        <StatPill label="生命" value={run.hp} sub={`士气 ${run.morale}`} tone={run.hp <= 1 ? 'danger' : 'good'} />
        <StatPill label="情报" value={run.intel} sub={`${run.sponsors?.length || 0} 赞助`} />
        <StatPill label="首发" value={`${run.roster?.length || 0}/5`} sub={`T${activeCounts.TANK} D${activeCounts.DPS} S${activeCounts.SUP}`} />
      </div>

      <div className={styles.sidebarBlock}>
        <div className={styles.miniHead}>
          <span>STARTING FIVE</span>
          <strong>阵容</strong>
        </div>
        <div className={styles.compactRoster}>
          {(run.roster || []).length ? (
            run.roster.map(player => (
              <div key={player.id} className={styles.compactPlayer}>
                <span>{player.role}</span>
                <strong>{player.name}</strong>
                <em>{player.ovr}</em>
              </div>
            ))
          ) : (
            <p className={styles.emptyText}>还没有签人。</p>
          )}
        </div>
      </div>

      <div className={styles.sidebarBlock}>
        <div className={styles.miniHead}>
          <span>MODIFIERS</span>
          <strong>遗物与状态</strong>
        </div>
        <ModifierStack run={run} compact />
      </div>

      <div className={styles.sidebarBlock}>
        <div className={styles.miniHead}>
          <span>LOG</span>
          <strong>最近记录</strong>
        </div>
        <div className={styles.logList}>
          {(run.history || []).slice(0, 5).map((item, index) => (
            <div key={`${item.type}-${index}`} className={styles.logItem}>
              <span>{String(item.type || 'LOG').toUpperCase()}</span>
              <em>{item.text}</em>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function MetaConsole({
  save,
  hall,
  perks,
  levelInfo,
  title,
  winRate,
  playerPool,
  fileInputRef,
  importText,
  importMode,
  onDownload,
  onCopySave,
  onImport,
  onFilePicked,
  onImportTextChange,
  onImportModeChange
}) {
  return (
    <section className={styles.metaConsole}>
      <details className={styles.metaPanel}>
        <summary>
          <span>META</span>
          <strong>经理档案</strong>
        </summary>
        <div className={styles.metaGrid}>
          <StatPill label="等级" value={`LV ${levelInfo.level}`} sub={`${title} / ${levelInfo.xp} XP`} tone="gold" />
          <StatPill label="执教" value={save.profile.totalRuns} sub={`${save.profile.completedRuns} 次结算`} />
          <StatPill label="冠军" value={save.profile.championships} sub={`最高 Stage ${save.profile.bestStage}`} />
          <StatPill label="胜率" value={`${winRate}%`} sub={`${playerPool.length} 候选`} />
        </div>
        <div className={styles.perkGrid}>
          {perks.map(perk => (
            <article key={perk.id} className={cx(styles.perkItem, perk.unlocked && styles.perkUnlocked)}>
              <span>LV {perk.level}</span>
              <strong>{perk.name}</strong>
              <em>{perk.desc}</em>
              <b>{perk.unlocked ? '已解锁' : '待解锁'}</b>
            </article>
          ))}
        </div>
      </details>

      <details className={styles.metaPanel}>
        <summary>
          <span>SAVE</span>
          <strong>存档包</strong>
        </summary>
        <div className={styles.saveToolGrid}>
          <div className={styles.exportBox}>
            <button type="button" onClick={onDownload}>下载 JSON</button>
            <button type="button" onClick={onCopySave}>复制文本</button>
          </div>
          <div className={styles.importBox}>
            <div className={styles.importControls}>
              <button type="button" onClick={() => fileInputRef.current?.click()}>选择文件</button>
              <select value={importMode} onChange={event => onImportModeChange(event.target.value)} aria-label="导入方式">
                <option value="replace">覆盖当前存档</option>
                <option value="merge">只合并图鉴</option>
              </select>
            </div>
            <textarea
              value={importText}
              onChange={event => onImportTextChange(event.target.value)}
              placeholder="粘贴 friesCupManagerNextSave JSON..."
            />
            <button type="button" onClick={onImport} disabled={!importText.trim()}>确认导入</button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFilePicked} hidden />
          </div>
        </div>
      </details>

      <details className={styles.metaPanel}>
        <summary>
          <span>HALL</span>
          <strong>名人堂</strong>
        </summary>
        {hall.length ? (
          <div className={styles.hallGrid}>
            {hall.map(record => (
              <article key={record.id} className={styles.hallItem}>
                <span>{record.result}</span>
                <strong>Stage {record.stage} / {record.power}</strong>
                <em>{record.xpEarned} XP</em>
                <p>{record.roster?.map(player => player.name).join(' / ')}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>还没有结算记录。</p>
        )}
      </details>
    </section>
  )
}

function getNodeLabel(type) {
  const labels = {
    draft: '选秀',
    sponsor: '赞助',
    relic: '遗物',
    tactic: '战术',
    event: '事件',
    match: '比赛',
    boss: '决赛'
  }
  return labels[type] || type
}

export default function ManagerNextPage() {
  const { db, withSeason = path => path } = useOutletContext() || {}
  const fileInputRef = useRef(null)
  const [save, setSave] = useState(() => loadManagerSave())
  const [importText, setImportText] = useState('')
  const [importMode, setImportMode] = useState('replace')
  const [message, setMessage] = useState('经理终端已上线。')

  const playerPool = useMemo(() => buildNextPlayerPool(db), [db])
  const levelInfo = useMemo(() => getLevelProgress(save.profile), [save.profile])
  const title = useMemo(() => getManagerTitle(save.profile), [save.profile])
  const perks = useMemo(() => getUnlockedPerks(save.profile), [save.profile])
  const activeRun = save.activeRun
  const activePower = activeRun ? calculateActiveRunPower(activeRun) : 0
  const activeCounts = activeRun ? getRoleCounts(activeRun.roster) : getRoleCounts([])
  const isBuildingRun = activeRun?.status === 'building'
  const hall = Array.isArray(save.hallOfFame) ? save.hallOfFame.slice(0, 4) : []
  const winRate = save.profile.lifetimeMatches > 0
    ? Math.round((save.profile.lifetimeWins / save.profile.lifetimeMatches) * 100)
    : 0
  const progressPercent = Math.round(levelInfo.progress * 100)
  const poolCounts = useMemo(() => getRoleCounts(playerPool), [playerPool])
  const canStartRun = Object.entries(RUN_ROSTER_REQUIREMENTS).every(([role, required]) => poolCounts[role] >= required)
  const currentEncounter = activeRun?.encounter || null
  const isMatchNode = !isBuildingRun && (currentEncounter?.type === 'match' || currentEncounter?.type === 'boss')

  const setAndReport = (nextSave, nextMessage) => {
    setSave(nextSave)
    setMessage(nextMessage)
  }

  const handleStartRun = () => {
    if (!canStartRun) {
      setMessage('当前数据不足以组建 1T / 2D / 2S 首发。')
      return
    }

    if (activeRun && !window.confirm('当前 Run 尚未结算，确定要开始新的 Run 吗？')) return
    setAndReport(startNewRun(save, playerPool), '开局市场已生成。')
  }

  const handlePlayMatch = () => {
    if (!activeRun) return
    const nextSave = simulateRunMatch(save, playerPool)
    setAndReport(nextSave, nextSave.activeRun ? '比赛已结算，赛季继续推进。' : 'Run 已结算，名人堂已更新。')
  }

  const handleNodeChoice = choiceId => {
    const result = resolveRunChoice(save, choiceId, playerPool)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setAndReport(result.save, result.message)
  }

  const handleFinishRun = () => {
    if (!activeRun) return
    setAndReport(finishActiveRun(save, 'retired'), isBuildingRun ? '本次组队已放弃。' : '当前 Run 已主动结算。')
  }

  const handleHirePlayer = playerId => {
    const result = hireRunPlayer(save, playerId, playerPool)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setAndReport(result.save, result.message)
  }

  const handleSellPlayer = playerId => {
    const result = sellRunPlayer(save, playerId, playerPool)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setAndReport(result.save, result.message)
  }

  const handleRefreshMarket = () => {
    const result = refreshRunMarket(save, playerPool)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setAndReport(result.save, result.message)
  }

  const handleDeployRoster = () => {
    const result = deployRunRoster(save, playerPool)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setAndReport(result.save, result.message)
  }

  const handleDownload = () => {
    const blob = new Blob([serializeManagerSave(save)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildExportFileName(save)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setMessage('存档 JSON 已导出。')
  }

  const handleCopySave = async () => {
    const text = serializeManagerSave(save)
    if (!navigator.clipboard) {
      setImportText(text)
      setMessage('浏览器无法直接复制，当前存档已放入导入框。')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setMessage('当前存档已复制。')
    } catch {
      setImportText(text)
      setMessage('复制权限被拦截，当前存档已放入导入框。')
    }
  }

  const handleImport = () => {
    const result = importManagerSave(importText, importMode)
    if (!result.ok) {
      setMessage(result.error)
      return
    }

    setSave(result.save)
    setImportText('')
    setMessage(importMode === 'merge' ? '图鉴和名人堂已合并。' : '存档已覆盖导入。')
  }

  const handleFilePicked = event => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportText(String(reader.result || ''))
      setMessage(`已读取 ${file.name}。`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.gameShell}>
        <header className={styles.gameTopbar}>
          <div className={styles.gameBrand}>
            <span>FM NEXT</span>
            <strong>电竞经理：肉鸽赛季</strong>
            <em>{title} / LV {levelInfo.level}</em>
          </div>

          <div className={styles.hudBar}>
            <StatPill label="战力" value={activeRun ? activePower : '--'} sub={activeRun ? `Stage ${activeRun.stage}` : '待开局'} tone="gold" />
            <StatPill label="资金" value={activeRun ? `${activeRun.funds}K` : '2000K'} sub="预算" />
            <StatPill label="生命" value={activeRun ? activeRun.hp : '--'} sub="HP" tone={activeRun?.hp <= 1 ? 'danger' : 'good'} />
            <StatPill label="士气" value={activeRun ? activeRun.morale : '--'} sub="MORALE" />
            <StatPill label="情报" value={activeRun ? activeRun.intel : '--'} sub="INTEL" />
          </div>

          <div className={styles.topActions}>
            <Link className={styles.classicLink} to={withSeason('/fantasy')}>经典版</Link>
            <div className={styles.xpTrack} aria-label="经理等级进度">
              <i style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        <div className={styles.commandDock}>
          <CommandButton label={activeRun ? 'RESTART' : 'NEW RUN'} value={activeRun ? '重开组队' : '开始组队'} onClick={handleStartRun} disabled={!canStartRun} tone="primary" />
          <CommandButton label="MATCH" value={isBuildingRun ? '先出征' : isMatchNode ? '执行比赛' : '等待节点'} onClick={handlePlayMatch} disabled={!activeRun || !isMatchNode} />
          <CommandButton label="SETTLE" value={isBuildingRun ? '放弃组队' : '结算 Run'} onClick={handleFinishRun} disabled={!activeRun} tone="danger" />
          <div className={styles.ticker}>{message}</div>
        </div>

        <main className={styles.gameBoard}>
          <SeasonMap run={activeRun} />

          <section className={styles.stagePane}>
            {activeRun ? (
              isBuildingRun ? (
                <BuilderPanel
                  run={activeRun}
                  onHire={handleHirePlayer}
                  onSell={handleSellPlayer}
                  onRefresh={handleRefreshMarket}
                  onDeploy={handleDeployRoster}
                />
              ) : (
                <>
                  <EncounterPanel run={activeRun} onChoice={handleNodeChoice} onMatch={handlePlayMatch} />
                  <ReviewPanel review={activeRun.lastReview} />
                </>
              )
            ) : (
              <StartPanel
                onStart={handleStartRun}
                disabled={!canStartRun}
                poolCounts={poolCounts}
                playerPoolSize={playerPool.length}
                hall={hall}
              />
            )}
          </section>

          <RunSidebar run={activeRun} activePower={activePower} activeCounts={activeCounts} />
        </main>

        <MetaConsole
          save={save}
          hall={hall}
          perks={perks}
          levelInfo={levelInfo}
          title={title}
          winRate={winRate}
          playerPool={playerPool}
          fileInputRef={fileInputRef}
          importText={importText}
          importMode={importMode}
          onDownload={handleDownload}
          onCopySave={handleCopySave}
          onImport={handleImport}
          onFilePicked={handleFilePicked}
          onImportTextChange={setImportText}
          onImportModeChange={setImportMode}
        />
      </div>
    </div>
  )
}
