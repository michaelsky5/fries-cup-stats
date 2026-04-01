// src/EsportsManager/pages/FantasyBattle.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import styles from './FantasyBattle.module.css'
import { getRandomBossTeam, calculateTeamPower } from '../engine/managerEngine'
import { TACTICS, executeSimulation } from '../engine/simEngine'
import { getRunState, processBattleResult } from '../engine/runEngine'

const MAP_POOL = [
  { name: '釜山', type: 'CONTROL', img: '/maps/Control/Busan.jpg' },
  { name: '伊利奥斯', type: 'CONTROL', img: '/maps/Control/Ilios.jpg' },
  { name: '漓江塔', type: 'CONTROL', img: '/maps/Control/Lijiang_Tower.jpg' },
  { name: '尼泊尔', type: 'CONTROL', img: '/maps/Control/Nepal.jpg' },
  { name: '绿洲城', type: 'CONTROL', img: '/maps/Control/Oasis.jpg' },
  { name: '萨摩亚', type: 'CONTROL', img: '/maps/Control/Samoa.jpg' },
  { name: '皇家赛道', type: 'ESCORT', img: '/maps/Escort/Circuit_Royal.jpg' },
  { name: '多拉多', type: 'ESCORT', img: '/maps/Escort/Dorado.jpg' },
  { name: '哈瓦那', type: 'ESCORT', img: '/maps/Escort/Havana.jpg' },
  { name: '渣客镇', type: 'ESCORT', img: '/maps/Escort/Junkertown.jpg' },
  { name: '里阿尔托', type: 'ESCORT', img: '/maps/Escort/Rialto.jpg' },
  { name: '66号公路', type: 'ESCORT', img: '/maps/Escort/Route_66.jpg' },
  { name: '香巴里寺院', type: 'ESCORT', img: '/maps/Escort/Shambali.jpg' },
  { name: '监测站：直布罗陀', type: 'ESCORT', img: '/maps/Escort/Watchpoint_Gibraltar.jpg' },
  { name: '暴雪世界', type: 'HYBRID', img: '/maps/Hybrid/Blizzard_World.jpg' },
  { name: '艾兴瓦尔德', type: 'HYBRID', img: '/maps/Hybrid/Eichenwalde.jpg' },
  { name: '好莱坞', type: 'HYBRID', img: '/maps/Hybrid/Hollywood.jpg' },
  { name: '国王大道', type: 'HYBRID', img: '/maps/Hybrid/Kings_Row.jpg' },
  { name: '中城', type: 'HYBRID', img: '/maps/Hybrid/Midtown.jpg' },
  { name: '努巴尼', type: 'HYBRID', img: '/maps/Hybrid/Numbani.jpg' },
  { name: '帕拉伊索', type: 'HYBRID', img: '/maps/Hybrid/Paraiso.jpg' },
  { name: '斗兽场', type: 'PUSH', img: '/maps/Push/Colosseo.jpg' },
  { name: '埃斯佩兰萨', type: 'PUSH', img: '/maps/Push/Esperanca.jpg' },
  { name: '新皇后街', type: 'PUSH', img: '/maps/Push/New_Queen_Street.jpg' },
  { name: '卢纳萨皮', type: 'PUSH', img: '/maps/Push/Runasapi.jpg' },
  { name: '新渣客城', type: 'FLASHPOINT', img: '/maps/Flashpoint/New_Junk_City.jpg' },
  { name: '苏拉瓦萨', type: 'FLASHPOINT', img: '/maps/Flashpoint/Suravasa.jpg' }
]

// 👇 全新特质图标合集 (用于赛中头像闪烁与日志高亮，包含了传奇大爹的神格)
const TRAIT_ICONS = ['💎', '🩸', '🗡️', '🥊', '👼', '🔥', '🛡️', '🚜', '🃏', '🍼', '☢️', '♿', '🕸️', '🙈', '❓', '苟', '🗣️', '🛑', '💉', '⚡', '👁️', '🦍', '🎯', '🐼', '👽', '🟣', '🐸', '🔪', '🪟', '📊', '🐙', '😎'];

const ROLE_SLOTS = ['TANK', 'DPS-1', 'DPS-2', 'SUP-1', 'SUP-2']
const ENEMY_LABELS = ['FRONTLINE', 'DAMAGE-1', 'DAMAGE-2', 'MAIN SUPPORT', 'FLEX SUPPORT']
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function getHeroAvatarUrl(role, heroName) {
  if (!heroName) return ''
  const dir = role === 'DPS' ? 'damage' : role === 'SUP' ? 'support' : 'tank'
  const cleanName = heroName.toLowerCase().replace(/[úü]/g, 'u').replace(/ö/g, 'o').replace(/[\.\s:\-_]/g, '')
  const dict = {
    '末日铁拳': 'doomfist', '奥丽莎': 'orisa', '莱因哈特': 'reinhardt', '路霸': 'roadhog', '西格玛': 'sigma', '温斯顿': 'winston', '破坏球': 'wreckingball', '哈蒙德': 'wreckingball', '查莉娅': 'zarya', '拉玛刹': 'ramattra', '渣客女王': 'junkerqueen', '毛加': 'mauga',
    '艾什': 'ashe', '堡垒': 'bastion', '卡西迪': 'cassidy', '回声': 'echo', '源氏': 'genji', '半藏': 'hanzo', '狂鼠': 'junkrat', '美': 'mei', '法老之鹰': 'pharah', '死神': 'reaper', '索杰恩': 'sojourn', '士兵：76': 'soldier76', '黑影': 'sombra', '秩序之光': 'symmetra', '托比昂': 'torbjorn', '猎空': 'tracer', '黑百合': 'widowmaker', '探险家': 'venture', '安然': 'anran',
    '安娜': 'ana', '巴蒂斯特': 'baptiste', '布丽吉塔': 'brigitte', '伊拉锐': 'illari', '雾子': 'kiriko', '生命编织者': 'lifeweaver', '卢西奥': 'lucio', '天使': 'mercy', '莫伊拉': 'moira', '禅雅塔': 'zenyatta', '朱诺': 'juno'
  }
  const fileName = dict[heroName] || cleanName
  return `/heroes/${dir}/${fileName}.png`
}

function getRoleLabel(role) {
  if (role === 'TANK') return 'TANK'
  if (role === 'SUP') return 'SUPPORT'
  return 'DAMAGE'
}

function getRoleBadge(role) {
  if (role === 'TANK') return 'T'
  if (role === 'SUP') return 'S'
  return 'D'
}

function HudCard({ label, value, meta, tone = '' }) {
  return (
    <div className={`${styles.hudCard} ${tone ? styles[tone] : ''}`}>
      <span className={styles.hudLabel}>{label}</span>
      <span className={styles.hudValue}>{value}</span>
      {meta ? <span className={styles.hudMeta}>{meta}</span> : null}
    </div>
  )
}

export default function FantasyBattle() {
  const { db } = useOutletContext()
  const navigate = useNavigate()
  const logEndRef = useRef(null)

  const [runState, setRunState] = useState(null)
  const [currentMatch, setCurrentMatch] = useState(null)
  const [myRoster, setMyRoster] = useState([])
  const [myPower, setMyPower] = useState(0)
  const [bossTeam, setBossTeam] = useState(null)

  const [score, setScore] = useState({ myTeam: 0, boss: 0 })
  const [roundHistory, setRoundHistory] = useState([])
  const [currentMapNum, setCurrentMapNum] = useState(1)
  const [lastWinner, setLastWinner] = useState(null)
  const [phase, setPhase] = useState('READY')
  const [activeMap, setActiveMap] = useState(null)
  const [clashData, setClashData] = useState({ myFinal: 0, bossFinal: 0 })
  const [logs, setLogs] = useState(['[系统] 正在连接赛事服务器...'])
  const [seriesStats, setSeriesStats] = useState({})

  const [selectedTactic, setSelectedTactic] = useState(null)
  const [tacticCounterResult, setTacticCounterResult] = useState(null)
  const [livePowerScore, setLivePowerScore] = useState({ my: 0, boss: 0, total: 0 })
  const [highlightedPlayer, setHighlightedPlayer] = useState(null)
  const [stageOverlay, setStageOverlay] = useState(null)

  useEffect(() => {
    const state = getRunState()
    if (!state) return navigate('/shop')
    setRunState(state)

    const savedRoster = localStorage.getItem('fca_my_roster')
    const savedPower = localStorage.getItem('fca_my_power')
    if (!savedRoster || !savedPower) return navigate('/shop')

    const roster = JSON.parse(savedRoster)
    setMyRoster(roster)
    setMyPower(Number(savedPower))

    const initStats = {}
    roster.forEach(p => { initStats[p.player_id] = { elim: 0, dmg: 0, heal: 0, score: 0 } })
    setSeriesStats(initStats)

    const savedMatchInfo = localStorage.getItem('fca_current_match')
    let matchInfo
    if (savedMatchInfo) matchInfo = JSON.parse(savedMatchInfo)
    else matchInfo = { team: getRandomBossTeam(db), rewardMoney: 150, rewardRelic: null }

    setCurrentMatch(matchInfo)
    setBossTeam(matchInfo.team)
    setLogs(prev => [...prev, `[赛事] 第 ${state.currentNode} 关挑战：你的战队 VS ${matchInfo.team.team_name}`])
  }, [db, navigate])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, phase])

  // 👇 核心修复 1：强制职业排序，防止标签套错人
  const roleOrder = { 'TANK': 1, 'DPS': 2, 'SUP': 3 }
  const sortedRoster = useMemo(() => {
    return [...myRoster].sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
  }, [myRoster])

  const phaseMeta = useMemo(() => {
    const map = {
      READY: { label: 'READY CHECK', desc: '准备开始下一局，等待你启动对决。' },
      PICKING: { label: 'MAP PICK', desc: '系统正在为本局锁定地图。' },
      TACTIC: { label: 'TACTIC SELECT', desc: '请主教练下达本局战术。' },
      TACTIC_REVEAL: { label: 'TACTIC REVEAL', desc: '双方战术亮牌，进入开牌阶段。' },
      CLASHING: { label: 'LIVE CLASH', desc: '系统正在实时演算本局对抗过程。' },
      RESULT: { label: 'ROUND RESULT', desc: '本局已结束，准备进入下一局。' },
      END: { label: 'FINAL REPORT', desc: '系列赛结束，正在展示结算报告。' }
    }
    return map[phase] || map.READY
  }, [phase])

  const fmvpPlayer = useMemo(() => {
    if (phase !== 'END' || !sortedRoster.length) return null
    let mvp = sortedRoster[0]
    let maxScore = -Infinity
    sortedRoster.forEach(p => {
      const scoreValue = seriesStats[p.player_id]?.score || 0
      if (scoreValue > maxScore) {
        maxScore = scoreValue
        mvp = p
      }
    })
    return mvp
  }, [phase, sortedRoster, seriesStats])

  const pickerLabel = currentMapNum === 1 ? '随机系统' : lastWinner === 'BOSS' ? '你的战队' : bossTeam?.team_short_name
  const displayStageMap = phase === 'READY' || phase === 'PICKING' ? null : activeMap
  const currentMapLabel = displayStageMap ? `${displayStageMap.name} · ${displayStageMap.type}` : `NEXT PICK · ${pickerLabel}`
  const myClashPercent = livePowerScore.total > 0 ? (livePowerScore.my / livePowerScore.total) * 100 : 50
  const isSeriesFinished = phase === 'END'
  const isSeriesWin = score.myTeam >= 3
  const latestLog = logs[logs.length - 1] || '等待战斗开始...'
  const myPowerDisplay = myPower > 0 ? myPower : 'SYNC'
  const readyWinRate = Math.max(15, Math.min(85, Math.round(((Number(myPower) || 0) / Math.max(1, (Number(myPower) || 0) + (Number(bossTeam?.powerScore) || 0))) * 100)))
  
  const objectiveMeta = useMemo(() => {
    const type = displayStageMap?.type
    if (type === 'ESCORT') return { label: 'PAYLOAD', short: 'ESC', state: 'CARGO ONLINE', detail: '护送图 / 载具推进' }
    if (type === 'HYBRID') return { label: 'HYBRID ASSAULT', short: 'HYB', state: 'GATE BREACH', detail: '混合图 / 攻点转车' }
    if (type === 'PUSH') return { label: 'PUSH BOT', short: 'PUSH', state: 'BOT UNLOCKED', detail: '推进图 / 机器人争夺' }
    if (type === 'FLASHPOINT') return { label: 'FLASHPOINT', short: 'FP', state: 'POINT ROTATION', detail: '闪点图 / 多点轮转' }
    if (type === 'CONTROL') return { label: 'CONTROL POINT', short: 'CP', state: 'POINT OPEN', detail: '控制图 / 中央抢点' }
    return { label: 'OBJECTIVE PREVIEW', short: 'NEXT', state: 'MAP LOCK PENDING', detail: '等待地图锁定后显示目标' }
  }, [displayStageMap])

  const enemyUnits = useMemo(() => {
    const roles = ['TANK', 'DPS', 'DPS', 'SUP', 'SUP']
    const base = bossTeam?.powerScore || 80
    return roles.map((role, index) => ({
      id: `${role}-${index + 1}`,
      role,
      label: ENEMY_LABELS[index],
      power: Math.max(40, Math.round(base + (index - 2) * 2))
    }))
  }, [bossTeam])

  // 👇 修复使用 sortedRoster，保证赛场排位整洁
  const myUnits = useMemo(() => {
    if (!sortedRoster.length) return []
    return sortedRoster.map((player, index) => ({
      ...player,
      slot: ROLE_SLOTS[index] || player.role,
      hero: player.most_played_hero || 'UNKNOWN HERO',
      avatar: getHeroAvatarUrl(player.role, player.most_played_hero),
      scoreValue: seriesStats[player.player_id]?.score || 0
    }))
  }, [sortedRoster, seriesStats])

  const playNextMap = async () => {
    if (phase === 'END') return
    setPhase('PICKING')
    const pickerName = currentMapNum > 1 ? (lastWinner === 'BOSS' ? '你的战队' : bossTeam.team_short_name) : '赛事委员会 (随机)'

    setLogs(prev => [...prev, `--- 第 ${currentMapNum} 局 ---`, `[BP环节] 等待 ${pickerName} 选择地图...`])
    await sleep(1200)

    const selectedMap = MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)]
    setActiveMap(selectedMap)
    setStageOverlay({ title: 'MAP LOCKED', sub: `${selectedMap.name} // ${selectedMap.type}` })
    setLogs(prev => [...prev, `[BP环节] 锁定了地图：【${selectedMap.name}】`])

    await sleep(900)
    setStageOverlay(null)
    await sleep(300)

    setPhase('TACTIC')
    setLogs(prev => [...prev, '[教练席] 比赛即将开始，请主教练下达战术指令！'])
  }

  const handleTacticSelect = async tacticId => {
    const myTactic = TACTICS.find(t => t.id === tacticId)
    setSelectedTactic(myTactic)

    setPhase('TACTIC_REVEAL')
    setLogs(prev => [...prev, `[教练席] 战术指令已下达：『${myTactic.name}』`])
    await sleep(1400)

    const { activeSynergy } = calculateTeamPower(sortedRoster)
    const simResult = executeSimulation(sortedRoster, bossTeam, tacticId, activeMap.name, currentMapNum, activeSynergy, runState.relics)

    if (simResult.logs.some(l => l.includes('战术压制') || l.includes('阵容压制'))) setTacticCounterResult('WIN')
    else if (simResult.logs.some(l => l.includes('战术受挫') || l.includes('阵容劣势'))) setTacticCounterResult('LOSS')
    else setTacticCounterResult('DRAW')

    await sleep(1000)
    setStageOverlay({ title: 'ROUND START', sub: `MAP ${currentMapNum} // ${activeMap.name}` })
    await sleep(700)
    setStageOverlay(null)

    setPhase('CLASHING')

    let currentMyPwr = myPower * 5
    let currentBossPwr = (bossTeam.powerScore || 80) * 5
    setLivePowerScore({ my: currentMyPwr, boss: currentBossPwr, total: currentMyPwr + currentBossPwr })
    await sleep(700)

    for (let i = 0; i < simResult.logs.length - 1; i += 1) {
      const log = simResult.logs[i]
      setLogs(prev => [...prev, log])

      let myDelta = 0
      let bossDelta = 0

      // 👇 核心修复 2：全量特质图标匹配，触发头像高光闪烁！
      if (TRAIT_ICONS.some(icon => log.includes(icon))) {
        const player = sortedRoster.find(p => log.includes(p.display_name))
        if (player) {
          setHighlightedPlayer(player.player_id)
          myDelta += 300
        }
      } else setHighlightedPlayer(null)

      if (log.includes('战术压制') || log.includes('阵容压制')) myDelta += 500
      if (log.includes('战术受挫') || log.includes('阵容劣势')) myDelta -= 500
      if (log.includes('敌方爆种🚨')) bossDelta += 600
      if (log.includes('致命失误')) myDelta -= 1000
      if (log.includes('赞助商')) myDelta += 400

      myDelta += (Math.random() - 0.5) * 150
      bossDelta += (Math.random() - 0.5) * 150

      currentMyPwr = Math.max(100, currentMyPwr + myDelta)
      currentBossPwr = Math.max(100, currentBossPwr + bossDelta)
      setLivePowerScore({ my: currentMyPwr, boss: currentBossPwr, total: currentMyPwr + currentBossPwr })

      await sleep(900)
    }

    setHighlightedPlayer(null)
    setLivePowerScore({ my: simResult.myFinal, boss: simResult.bossFinal, total: simResult.myFinal + simResult.bossFinal })
    setClashData({ myFinal: simResult.myFinal, bossFinal: simResult.bossFinal })
    await sleep(1200)

    setPhase('RESULT')
    const isMyWin = simResult.isWin
    setLastWinner(isMyWin ? 'ME' : 'BOSS')
    setRoundHistory(prev => [...prev, isMyWin ? 'WIN' : 'LOSS'])
    setLogs(prev => [...prev, simResult.logs[simResult.logs.length - 1]])

    if (isMyWin) setScore(s => ({ ...s, myTeam: s.myTeam + 1 }))
    else setScore(s => ({ ...s, boss: s.boss + 1 }))

    setSeriesStats(prev => {
      const next = { ...prev }
      sortedRoster.forEach(p => {
        next[p.player_id].elim += simResult.matchStats[p.player_id].elim
        next[p.player_id].dmg += simResult.matchStats[p.player_id].dmg
        next[p.player_id].heal += simResult.matchStats[p.player_id].heal
        next[p.player_id].score += simResult.matchStats[p.player_id].score
      })
      return next
    })

    await sleep(1500)
    checkSeriesWinner(isMyWin ? score.myTeam + 1 : score.myTeam, isMyWin ? score.boss : score.boss + 1)
  }

  const checkSeriesWinner = (myScore, bossScore) => {
    if (myScore >= 3 || bossScore >= 3) {
      setPhase('END')
      const hasWonSeries = myScore >= 3
      const clearedNode = runState?.currentNode || 0
      const postMatchResult = processBattleResult(runState, hasWonSeries, currentMatch, db)
      const rewardLogs = hasWonSeries ? [`💰 获得赛事奖金: $${currentMatch.rewardMoney}K`] : ['📉 比赛失利。扣除 1 点战队生命值！(获得低保安慰金)']

      if (hasWonSeries && currentMatch.rewardRelic) rewardLogs.push(`🎁 获得战利品/赞助：【${currentMatch.rewardRelic.name}】！`)
      if (postMatchResult.isGameOver) rewardLogs.push('💀 战队生命值已耗尽。GAME OVER.')

      setRunState(postMatchResult.state)

      if (hasWonSeries && clearedNode > 0 && clearedNode % 5 === 0) {
        setLogs(prev => [
          ...prev,
          '=============================',
          `🏆 极限突破！你成功征服了 Stage ${clearedNode}！`,
          ...rewardLogs,
          '🎉 正在为您生成阶段性纪念海报...'
        ])
        localStorage.removeItem('fca_current_match')
        setTimeout(() => navigate('/champion'), 3000)
        return
      }

      setLogs(prev => [...prev, '=============================', hasWonSeries ? '🏆 恭喜！你赢得了本场 BO5！' : '💀 遗憾落败！', ...rewardLogs])
      localStorage.removeItem('fca_current_match')
    } else {
      setCurrentMapNum(prev => prev + 1)
      setPhase('READY')
    }
  }

  const getLogClass = log => {
    if (log.includes('🏆') || log.includes('Victory')) return styles.textWin
    if (log.includes('💀') || log.includes('Defeat') || log.includes('🚨') || log.includes('致命失误') || log.includes('📉') || log.includes('GAME OVER') || log.includes('劣势') || log.includes('受挫')) return styles.textLoss
    if (log.includes('✨') || log.includes('羁绊点亮') || log.includes('压制')) return styles.textSynergy
    if (log.includes('BP环节') || log.includes('阵容博弈') || log.includes('战术博弈')) return styles.textMap
    if (log.includes('赞助商') || log.includes('🎁') || log.includes('💰') || log.includes('神格')) return styles.textSponsor
    if (TRAIT_ICONS.some(icon => log.includes(icon))) return styles.textTrait
    return ''
  }

  if (!bossTeam || !currentMatch) return <div className={styles.loadingShell}>连接赛场中...</div>

  return (
    <div className={styles.container}>
      {activeMap && (
        <div className={`${styles.mapBackground} ${phase !== 'READY' ? styles.mapFadeIn : ''}`} style={{ backgroundImage: `url(${activeMap.img})` }}>
          <div className={styles.mapOverlay} />
          <div className={styles.mapSpotlight} />
          <div className={styles.scanlines} />
        </div>
      )}

      <header className={styles.battleHud}>
        <div className={styles.hudTop}>
          <div className={styles.hudBrand}>
            <span className={styles.hudBrandCn}>梦幻战队模式</span>
            <span className={styles.hudBrandEn}>OW STYLE LIVE BATTLE HUD</span>
          </div>
          <div className={styles.hudPhase}>
            <span className={styles.hudPhaseLabel}>PHASE</span>
            <span className={styles.hudPhaseValue}>{phaseMeta.label}</span>
          </div>
        </div>

        <div className={styles.hudMain}>
          <div className={`${styles.teamBlock} ${styles.teamBlockMy}`}>
            <div className={styles.teamBlockKicker}>ATTACKER / YOUR TEAM</div>
            <div className={styles.teamBlockName}>我的梦幻战队</div>
            <div className={styles.teamBlockMetaRow}>
              <div className={styles.teamBlockOvr}>{myPowerDisplay} OVR</div>
              <div className={styles.teamSubMeta}>{sortedRoster.length} PLAYERS LOCKED</div>
            </div>
          </div>

          <div className={styles.centerScore}>
            <div className={styles.scoreSeries}>BEST OF 5</div>
            <div className={styles.scoreNumbers}>
              <span className={styles.myScore}>{score.myTeam}</span>
              <span className={styles.scoreDash}>:</span>
              <span className={styles.bossScore}>{score.boss}</span>
            </div>
            <div className={styles.scoreRoundMeta}>{isSeriesFinished ? (isSeriesWin ? 'SERIES WON' : 'SERIES LOST') : `MAP ${currentMapNum} / ${activeMap?.type || 'TBD'}`}</div>
            <div className={styles.seriesHistory}>
              {[0, 1, 2, 3, 4].map(index => {
                const result = roundHistory[index]
                return <span key={index} className={`${styles.seriesDot} ${result === 'WIN' ? styles.seriesDotWin : result === 'LOSS' ? styles.seriesDotLoss : ''}`} />
              })}
            </div>
          </div>

          <div className={`${styles.teamBlock} ${styles.teamBlockBoss}`}>
            <div className={styles.teamBlockKicker}>DEFENDER / OPPONENT</div>
            <div className={styles.teamBlockNameBoss}>{bossTeam.team_short_name}</div>
            <div className={`${styles.teamBlockMetaRow} ${styles.teamBlockMetaRowBoss}`}>
              <div className={styles.teamSubMeta}>NODE {runState?.currentNode ?? '--'}</div>
              <div className={styles.teamBlockOvr}>{bossTeam.powerScore} OVR</div>
            </div>
          </div>
        </div>

        <div className={styles.hudCards}>
          <HudCard label="CURRENT MAP" value={currentMapLabel} meta="MAP STATUS / OBJECTIVE" tone="hudAccent" />
          <HudCard label="REWARD" value={`$${currentMatch.rewardMoney}K`} meta={currentMatch.rewardRelic ? `DROP: ${currentMatch.rewardRelic.name}` : 'NO RELIC DROP'} />
          <HudCard label="RUN HP" value={Array(runState?.hp || 0).fill('❤').join('') || '--'} meta="CURRENT LIFE STATUS" tone="hudWarn" />
          <HudCard label="BATTLE STATUS" value={phaseMeta.label} meta={phaseMeta.desc} />
        </div>
      </header>

      <div className={styles.stageLayout}>
        <section className={styles.stagePanel}>
          <div className={styles.stageTopBar}>
            <div className={styles.stageMapInfo}>
              <span className={styles.stageKicker}>BATTLE STAGE</span>
              <div className={styles.stageTitle}>MAP {currentMapNum} · {displayStageMap?.name || 'Awaiting Lock-In'}</div>
              <div className={styles.stageSub}>{displayStageMap ? `${displayStageMap.type} · ${objectiveMeta.detail}` : `NEXT PICKER · ${pickerLabel}`}</div>
            </div>
            <div className={styles.stagePills}>
              <span className={styles.stagePill}>5V5</span>
              <span className={styles.stagePill}>{objectiveMeta.label}</span>
              <span className={styles.stagePill}>{currentMatch.rewardRelic ? 'ELITE DROP' : 'STANDARD MATCH'}</span>
            </div>
          </div>

          <div className={styles.liveTicker}>
            <span className={styles.liveTickerLabel}>LIVE FEED</span>
            <span className={`${styles.liveTickerText} ${getLogClass(latestLog)}`}>{latestLog}</span>
          </div>

          <div className={styles.stageFrame}>
            {stageOverlay && (
              <div className={styles.stageOverlay}>
                <div className={styles.stageOverlayTitle}>{stageOverlay.title}</div>
                <div className={styles.stageOverlaySub}>{stageOverlay.sub}</div>
              </div>
            )}

            {isSeriesFinished ? (
              <div className={styles.postMatchReport}>
                <div className={styles.pmTop}>
                  <div className={styles.pmKicker}>POST MATCH REPORT</div>
                  <h2 className={styles.pmTitle}>{isSeriesWin ? '🏆 夺冠结算 / CHAMPIONS' : '💀 战败结算 / DEFEAT'}</h2>
                </div>

                {fmvpPlayer && (
                  <div className={styles.mvpBox}>
                    <div className={styles.mvpLabel}>队内最有价值选手 / FMVP</div>
                    <div className={styles.mvpName}>{fmvpPlayer.display_name} ({fmvpPlayer.role})</div>
                    <div className={styles.mvpStats}>本场系列赛中贡献了全队最高的综合表现分。</div>
                  </div>
                )}

                <div className={styles.reportTableWrap}>
                  <table className={styles.statsTable}>
                    <thead>
                      <tr>
                        <th>选手</th>
                        <th>位置</th>
                        <th>总击杀</th>
                        <th>总伤害</th>
                        <th>总治疗</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 👇 核心修复 3：结算表格加上 SSR 王冠和觉醒星标 */}
                      {sortedRoster.map(p => {
                        const s = seriesStats[p.player_id]
                        const isLegend = p.player_id?.startsWith('L-')
                        const badge = isLegend ? '👑 ' : (p.isAwakened ? '⭐ ' : '')
                        
                        return (
                          <tr key={p.player_id} className={p.player_id === fmvpPlayer?.player_id ? styles.rowMvp : ''}>
                            <td className={styles.tdName}>{badge}{p.display_name} {p.player_id === fmvpPlayer?.player_id ? '🏆' : ''}</td>
                            <td className={styles[p.role?.toLowerCase() || 'dps']}>{p.role}</td>
                            <td>{s?.elim}</td>
                            <td className={styles.textDmg}>{s?.dmg?.toLocaleString?.() ?? 0}</td>
                            <td className={styles.textHeal}>{s?.heal?.toLocaleString?.() ?? 0}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {phase === 'READY' && (
                  <div className={styles.readyPanel}>
                    <div className={styles.readyHeader}>
                      <div className={styles.readyHeaderMain}>
                        <div className={styles.readyKicker}>ROUND {currentMapNum} READY</div>
                        <div className={styles.readyTitle}>{currentMapNum === 1 ? '系列赛开场部署' : `准备进入第 ${currentMapNum} 局交火`}</div>
                        <div className={styles.readyDesc}>当前对手为 <strong>{bossTeam.team_short_name}</strong>，基础奖励为 <strong>${currentMatch.rewardMoney}K</strong>。{currentMatch.rewardRelic ? <> 若击败精英对手，还有机会获得 <strong>{currentMatch.rewardRelic.name}</strong>。</> : null}</div>
                      </div>
                      <div className={styles.readyVsBadge}>ATTACK / DEFEND</div>
                    </div>

                    <div className={styles.readyBattlefield}>
                      <div className={`${styles.readyFormation} ${styles.readyFormationMy}`}>
                        <div className={styles.readyFormationHead}>
                          <span className={styles.readyFormationLabel}>ATTACKER / YOUR TEAM</span>
                          <span className={styles.readyFormationMeta}>{myPowerDisplay} OVR</span>
                        </div>
                        <div className={styles.readyFormationStack}>
                          {myUnits.map(unit => (
                            <div key={unit.player_id} className={`${styles.readyUnitCard} ${styles.readyUnitCardMy}`}>
                              <div className={`${styles.readyUnitBadge} ${styles[unit.role.toLowerCase()]}`}>{unit.slot}</div>
                              <div className={styles.readyUnitAvatarWrap}>
                                {unit.avatar ? (
                                  <img src={unit.avatar} className={`${styles.readyUnitAvatar} ${styles[unit.role.toLowerCase()]}`} alt={unit.display_name} onError={e => { e.currentTarget.style.display = 'none' }} />
                                ) : (
                                  <div className={`${styles.readyUnitAvatarFallback} ${styles[unit.role.toLowerCase()]}`}>{getRoleBadge(unit.role)}</div>
                                )}
                              </div>
                              <div className={styles.readyUnitInfo}>
                                {/* 👇 左侧阵容名单也加上了 SSR 王冠 */}
                                <div className={styles.readyUnitName}>{unit.player_id?.startsWith('L-') ? '👑 ' : ''}{unit.display_name}</div>
                                <div className={styles.readyUnitMeta}>{unit.hero} · {getRoleLabel(unit.role)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={styles.readyCenter}>
                        <div className={styles.readyBroadcast}>
                          <span className={styles.readyBroadcastTag}>TACTICAL BROADCAST</span>
                          <span className={styles.readyBroadcastMain}>{objectiveMeta.label}</span>
                          <span className={styles.readyBroadcastSub}>NEXT PICKER // {pickerLabel}</span>
                        </div>

                        <div className={styles.readyObjectiveCore}>
                          <div className={styles.readyObjectiveRingOuter} />
                          <div className={styles.readyObjectiveRingMid} />
                          <div className={styles.readyObjectiveRingInner}>
                            <span className={styles.readyObjectiveState}>MAP LOCK PENDING</span>
                            <span className={styles.readyObjectiveValue}>NEXT</span>
                            <span className={styles.readyObjectiveName}>{pickerLabel}</span>
                          </div>
                        </div>

                        <div className={styles.readyCenterRail}>
                          <div className={styles.readyCenterStat}>
                            <span className={styles.readyCenterLabel}>ENGAGE READY</span>
                            <span className={styles.readyCenterValue}>{readyWinRate}%</span>
                            <span className={styles.readyCenterMeta}>FIGHT WIN PROBABILITY</span>
                          </div>
                          <div className={styles.readyCenterStat}>
                            <span className={styles.readyCenterLabel}>OBJECTIVE</span>
                            <span className={styles.readyCenterValue}>{objectiveMeta.short}</span>
                            <span className={styles.readyCenterMeta}>{objectiveMeta.detail}</span>
                          </div>
                          <div className={styles.readyCenterStat}>
                            <span className={styles.readyCenterLabel}>REWARD</span>
                            <span className={styles.readyCenterValue}>{currentMatch.rewardRelic ? 'DROP' : `$${currentMatch.rewardMoney}K`}</span>
                            <span className={styles.readyCenterMeta}>{currentMatch.rewardRelic ? currentMatch.rewardRelic.name : 'STANDARD BONUS'}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`${styles.readyFormation} ${styles.readyFormationBoss}`}>
                        <div className={styles.readyFormationHead}>
                          <span className={styles.readyFormationLabel}>DEFENDER / OPPONENT</span>
                          <span className={styles.readyFormationMeta}>{bossTeam.powerScore} OVR</span>
                        </div>
                        <div className={styles.readyFormationStack}>
                          {enemyUnits.map(unit => (
                            <div key={unit.id} className={`${styles.readyUnitCard} ${styles.readyUnitCardBoss}`}>
                              <div className={styles.readyUnitInfoBoss}>
                                <div className={styles.readyUnitNameBoss}>{unit.label}</div>
                                <div className={styles.readyUnitMetaBoss}>{unit.role} · {unit.power} PWR</div>
                              </div>
                              <div className={`${styles.readyEnemyCore} ${styles[unit.role.toLowerCase()]}`}>{getRoleBadge(unit.role)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {phase === 'PICKING' && <div className={styles.pickingAlert}>等待 {pickerLabel} 选图...</div>}

                {phase === 'TACTIC' && (
                  <div className={styles.tacticBoard}>
                    <div className={styles.tacticBoardHead}>
                      <div className={styles.tacticBoardKicker}>TACTICAL DEPLOYMENT</div>
                      <h3 className={styles.tacticTitle}>选择这一局的主打法</h3>
                      <p className={styles.tacticSub}>像守望先锋赛前布阵一样，为这张地图决定节奏、前压方式与资源分配。</p>
                    </div>

                    <div className={styles.tacticCards}>
                      {TACTICS.map(t => (
                        <button key={t.id} className={styles.tacticCard} style={{ '--tactic-color': t.color }} onClick={() => handleTacticSelect(t.id)}>
                          <div className={styles.tacticName}>{t.name}</div>
                          <div className={styles.tacticDesc}>{t.desc}</div>
                          <div className={styles.tacticRisk}>{t.risk}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {phase === 'TACTIC_REVEAL' && (
                  <div className={styles.tacticRevealGrid}>
                    <div className={`${styles.tacticShowCard} ${tacticCounterResult === 'WIN' ? styles.counterShake : ''}`}>
                      <div className={styles.tacticShowHeader}>YOUR TACTIC</div>
                      <div className={styles.tacticShowBody}>
                        <div className={styles.tacticShowName} style={{ color: selectedTactic?.color }}>{selectedTactic?.name}</div>
                        <div className={styles.tacticShowDesc}>{selectedTactic?.desc}</div>
                        {tacticCounterResult === 'WIN' && <div className={styles.counteredLabel}>SUCCESS / 克制</div>}
                        {tacticCounterResult === 'DRAW' && <div className={styles.counteredLabel}>EVEN / 均势</div>}
                      </div>
                    </div>

                    <div className={styles.revealVs}>VS</div>

                    <div className={`${styles.tacticShowCardBoss} ${tacticCounterResult === 'LOSS' ? styles.counterShake : ''}`}>
                      <div className={styles.tacticShowHeaderBoss}>ENEMY TACTIC</div>
                      <div className={styles.tacticShowBody}>
                        <div className={styles.tacticShowName}>?? ANALYZING ??</div>
                        <div className={styles.tacticShowDesc}>敌方阵容正在锁定资源倾斜、先手节奏与站位优先级。</div>
                        {tacticCounterResult === 'LOSS' && <div className={styles.counteredLabel}>FAILED / 被克</div>}
                      </div>
                    </div>
                  </div>
                )}

                {(phase === 'CLASHING' || phase === 'RESULT') && (
                  <div className={styles.battlefield}>
                    <div className={`${styles.teamColumn} ${styles.teamColumnMy}`}>
                      <div className={styles.teamColumnHeader}>YOUR LINEUP</div>
                      <div className={styles.lineupStack}>
                        {myUnits.map(unit => (
                          <div key={unit.player_id} className={`${styles.avatarCard} ${highlightedPlayer === unit.player_id ? styles.avatarCardActive : ''}`}>
                            <div className={`${styles.slotBadge} ${styles[unit.role.toLowerCase()]}`}>{unit.slot}</div>
                            <div className={styles.avatarWrapper}>
                              {unit.avatar ? (
                                <img src={unit.avatar} className={`${styles.faceAvatar} ${styles[unit.role.toLowerCase()]} ${highlightedPlayer === unit.player_id ? styles.avatarClutch : ''}`} alt={unit.display_name} onError={e => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className={`${styles.faceAvatarFallback} ${styles[unit.role.toLowerCase()]}`}>{getRoleBadge(unit.role)}</div>
                              )}
                              {highlightedPlayer === unit.player_id && <div className={styles.clutchText}>TRAIT!</div>}
                            </div>
                            <div className={styles.avatarInfo}>
                              <div className={styles.avatarTopRow}>
                                {/* 👇 战斗界面的头像旁边也加上 SSR 王冠 */}
                                <div className={styles.avatarName}>{unit.player_id?.startsWith('L-') ? '👑 ' : ''}{unit.display_name}</div>
                                <div className={`${styles.rolePill} ${styles[unit.role.toLowerCase()]}`}>{getRoleLabel(unit.role)}</div>
                              </div>
                              <div className={styles.avatarHero}>{unit.hero}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.centerBattleCore}>
                      <div className={styles.roundBanner}>
                        <span className={styles.roundBannerMain}>MAP {currentMapNum}</span>
                        <span className={styles.roundBannerSub}>{displayStageMap?.name}</span>
                        <span className={styles.roundBannerType}>{objectiveMeta.label}</span>
                      </div>

                      <div className={styles.objectiveCore}>
                        <div className={styles.objectiveRingOuter} />
                        <div className={styles.objectiveRingMid} />
                        <div className={styles.objectiveRingInner}>
                          <span className={styles.objectiveLabel}>{objectiveMeta.state}</span>
                          <span className={styles.objectiveValue}>{objectiveMeta.short}</span>
                          <span className={styles.objectiveSubValue}>{displayStageMap?.type || 'OBJECTIVE'}</span>
                        </div>
                      </div>

                      <div className={styles.powerHeader}>
                        <span>TEAM FIGHT MOMENTUM</span>
                        <span>{Math.round(myClashPercent)}% / {Math.round(100 - myClashPercent)}%</span>
                      </div>

                      <div className={styles.tugOfWar}>
                        <div className={styles.tugBarLeft} style={{ width: `${myClashPercent}%` }}>{Math.floor(livePowerScore.my)} PWR</div>
                        <div className={styles.tugBarRight} style={{ width: `${100 - myClashPercent}%` }}>{Math.floor(livePowerScore.boss)} PWR</div>
                        <div className={styles.tugVS}>TEAM FIGHT</div>
                      </div>

                      <div className={styles.clashNumbers}>
                        <div className={styles.clashMetric}>
                          <span className={styles.clashMetricLabel}>MY FINAL</span>
                          <span className={styles.clashMetricValue}>{Math.floor(clashData.myFinal || livePowerScore.my)}</span>
                        </div>
                        <div className={styles.clashMetric}>
                          <span className={styles.clashMetricLabel}>BOSS FINAL</span>
                          <span className={styles.clashMetricValue}>{Math.floor(clashData.bossFinal || livePowerScore.boss)}</span>
                        </div>
                      </div>

                      <div className={styles.killFeedMock}>
                        <span className={styles.killFeedTag}>LIVE CALL</span>
                        <span className={`${styles.killFeedText} ${getLogClass(latestLog)}`}>{latestLog}</span>
                      </div>
                    </div>

                    <div className={`${styles.teamColumn} ${styles.teamColumnBoss}`}>
                      <div className={`${styles.teamColumnHeader} ${styles.enemyHeader}`}>BOSS LINEUP</div>
                      <div className={styles.lineupStack}>
                        {enemyUnits.map(unit => (
                          <div key={unit.id} className={`${styles.enemyUnit} ${styles.enemyUnitCard}`}>
                            <div className={styles.enemyUnitInfo}>
                              <div className={styles.avatarTopRow}>
                                <div className={styles.enemyUnitLabel}>{unit.label}</div>
                                <div className={`${styles.rolePill} ${styles[unit.role.toLowerCase()]}`}>{getRoleLabel(unit.role)}</div>
                              </div>
                              <div className={styles.enemyUnitMeta}>{unit.role} · {unit.power} PWR</div>
                            </div>
                            <div className={`${styles.enemyUnitCore} ${styles[unit.role.toLowerCase()]}`}>{getRoleBadge(unit.role)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {phase === 'RESULT' && <div className={`${styles.resultBanner} ${livePowerScore.my >= livePowerScore.boss ? styles.bannerWin : styles.bannerLoss}`}>{livePowerScore.my >= livePowerScore.boss ? 'ROUND WON' : 'ROUND LOST'}</div>}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.controls}>
            {phase === 'READY' && <button className={styles.btnPlay} onClick={playNextMap}>{currentMapNum === 1 ? '启动对决 / START MATCH' : `进入第 ${currentMapNum} 局`}</button>}
            {(phase === 'PICKING' || phase === 'CLASHING' || phase === 'TACTIC_REVEAL' || phase === 'RESULT') && <button className={styles.btnDisabled} disabled>模拟演算中...</button>}
            {phase === 'END' && <button className={styles.btnReturn} onClick={() => navigate('/shop')}>返回战队大本营 / RETURN TO HUB</button>}
          </div>
        </section>

        <aside className={styles.sidePanel}>
          <div className={styles.intelPanel}>
            <div className={styles.intelKicker}>MATCH INTEL</div>
            <div className={styles.intelGrid}>
              <div className={styles.intelItem}><span className={styles.intelLabel}>OPPONENT</span><span className={styles.intelValue}>{bossTeam.team_name || bossTeam.team_short_name}</span></div>
              <div className={styles.intelItem}><span className={styles.intelLabel}>BOSS OVR</span><span className={styles.intelValue}>{bossTeam.powerScore}</span></div>
              <div className={styles.intelItem}><span className={styles.intelLabel}>OBJECTIVE</span><span className={styles.intelValue}>{objectiveMeta.label}</span></div>
              <div className={styles.intelItem}><span className={styles.intelLabel}>MAP STATE</span><span className={styles.intelValue}>{currentMapLabel}</span></div>
            </div>
          </div>

          <div className={styles.roleScoutPanel}>
            <div className={styles.intelKicker}>ROLE SCOUT</div>
            <div className={styles.roleScoutList}>
              {enemyUnits.map(unit => (
                <div key={unit.id} className={styles.roleScoutItem}>
                  <span className={`${styles.roleScoutBadge} ${styles[unit.role.toLowerCase()]}`}>{getRoleBadge(unit.role)}</span>
                  <div className={styles.roleScoutInfo}>
                    <div className={styles.roleScoutTitle}>{unit.label}</div>
                    <div className={styles.roleScoutMeta}>{unit.role} · {unit.power} PWR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.logTerminal}>
            <div className={styles.termHeader}>
              <span className={styles.dotRed} />
              <span className={styles.dotYellow} />
              <span className={styles.dotGreen} />
              <span className={styles.termTitle}>LIVE_CAST.EXE</span>
            </div>

            <div className={styles.termBody}>
              {logs.map((log, idx) => <div key={idx} className={`${styles.logLine} ${getLogClass(log)}`}>{log}</div>)}
              {(phase === 'CLASHING' || phase === 'PICKING' || phase === 'TACTIC_REVEAL') && <div className={styles.logLinePulse}>&gt; 系统演算中...</div>}
              <div ref={logEndRef} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}