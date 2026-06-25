import {
  formatNum,
  getHeroImage,
  getMapImage,
  getMatchById,
  getMatchWinnerId,
  getPlayerById,
  getPlayerDisplayName,
  getPlayerTotalById,
  getRoleCn,
  getScheduledText,
  getStaffAvatar,
  getTeamById,
  getTeamLogo,
  getTeamMatches,
  getTeamPlayers,
  getTeamReviewById,
  heroNameToSlug,
  mapNameToFileName,
  normalizeText,
  safeArr
} from './reviewAssets.js'
import { getStaffReview } from './reviewSearch.js'
import {
  heroCn,
  mapCn,
  mapTypeCn,
  stageCn,
  roleDeepNarrative
} from './reviewI18n.js'

function uniq(list) {
  return Array.from(new Set(safeArr(list).filter(Boolean).map(String)))
}

function uniqueCount(list) {
  return uniq(list).length
}

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function pickFirstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function pickNumber(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      if (Number.isFinite(num)) return num
    }
  }

  return fallback
}

function getRankNumber(rankText) {
  const text = String(rankText || '').replace(/\s+/g, '')

  if (!text) return null
  if (text.includes('冠军')) return 1
  if (text.includes('亚军')) return 2
  if (text.includes('季军')) return 3
  if (text.includes('殿军')) return 4

  const range = text.match(/第?(\d+)[-–—~至到](\d+)名?/)
  if (range) return Number(range[1])

  const single = text.match(/第?(\d+)名/)
  if (single) return Number(single[1])

  return null
}

function getRankWatermark(rankText) {
  const text = String(rankText || '').replace(/\s+/g, '')

  if (!text) return 'FINAL RANK'
  if (text.includes('冠军')) return 'CHAMPION'
  if (text.includes('亚军')) return 'RUNNER-UP'
  if (text.includes('季军')) return '3RD PLACE'
  if (text.includes('殿军')) return '4TH PLACE'

  const range = text.match(/第?(\d+)[-–—~至到](\d+)名?/)
  if (range) return `RANK ${range[1]}-${range[2]}`

  const single = text.match(/第?(\d+)名/)
  if (single) return `RANK ${single[1]}`

  return 'FINAL RANK'
}

function isPlayoffRank(rankText) {
  const rank = getRankNumber(rankText)
  if (rank !== null) return rank >= 1 && rank <= 8

  const text = String(rankText || '')
  return text.includes('前八') || text.includes('八强') || text.includes('季后淘汰赛')
}

function getCompetitionPhaseLabel(rankText) {
  const rank = getRankNumber(rankText)

  if (rank !== null && rank <= 8) return '季后淘汰赛参与者'
  if (rank !== null && rank > 8) return '公开预选赛参与者'

  const text = String(rankText || '')
  if (text.includes('季后') || text.includes('前八') || text.includes('八强')) return '季后淘汰赛参与者'

  return '公开预选赛参与者'
}

function getRankStory(rankText) {
  const text = String(rankText || '')
  const rank = getRankNumber(text)

  if (rank === 1 || text.includes('冠军')) {
    return {
      label: '冠军',
      title: '你们把这个赛季走到了最后',
      body: '冠军不是某一个瞬间突然发生的。它由每一场比赛、每一张地图、每一次等待和每一个站上赛场的人共同组成。'
    }
  }

  if (rank === 2 || text.includes('亚军')) {
    return {
      label: '亚军',
      title: '你们走到了决赛附近',
      body: '亚军不是失败的另一个名字。它说明这支队伍真的走到了最后的舞台附近，也把自己的名字留在了这届比赛最靠后的章节里。'
    }
  }

  if (rank === 3 || text.includes('季军')) {
    return {
      label: '季军',
      title: '你们站上了前三的位置',
      body: '前三不是轻易留下的名次。它说明这支队伍不是路过，而是真的在这个赛季里打出了足够被记住的位置。'
    }
  }

  if (rank === 4 || text.includes('殿军')) {
    return {
      label: '殿军',
      title: '你们走进了四强的争夺',
      body: '四强意味着你们已经进入了这个赛季最靠近终局的区域。它不是全部，但它足够成为这支队伍被记录下来的节点。'
    }
  }

  if (rank !== null && rank >= 5 && rank <= 8) {
    return {
      label: '季后淘汰赛',
      title: '你们进入了季后淘汰赛',
      body: '进入前八意味着你们不只是完成了公开预选赛，而是把自己的赛季延伸到了季后淘汰赛。这里的每一场比赛，都更接近终局。'
    }
  }

  if (rank !== null && rank > 8) {
    return {
      label: '公开预选赛',
      title: '你们把故事留在了公开预选赛',
      body: '公开预选赛不是背景。瑞士轮、突围赛、等待、对阵和结算，都是这届学院赛真正发生过的一部分。不是每支队伍都会走到最后，但每支队伍都让这届比赛变得完整。'
    }
  }

  return {
    label: text || '赛季归档',
    title: '你们完成了自己的赛季',
    body: '成绩会被写进表格，但它不是全部。真正被留下来的，是这支队伍曾经进入赛场，打过比赛，也成为这届学院赛的一部分。'
  }
}

function getPlayoffStory(rankText) {
  if (!isPlayoffRank(rankText)) return null

  const rank = getRankNumber(rankText)

  if (rank === 1) {
    return {
      title: '你们站到了季后淘汰赛的终点',
      body: '从公开预选赛到季后淘汰赛，冠军不是直接出现的。它是一场场比赛之后，被队伍亲手打出来的结果。'
    }
  }

  if (rank === 2) {
    return {
      title: '你们把赛季打进了最终舞台',
      body: '决赛不是每支队伍都能抵达的位置。它意味着这支队伍已经穿过了公开预选赛，也穿过了季后淘汰赛的大部分压力。'
    }
  }

  if (rank && rank <= 4) {
    return {
      title: '你们进入了季后淘汰赛深处',
      body: '四强附近的比赛，往往会留下更重的记忆。胜负会被记录，但那些接近终局的地图，也会被参与者记住。'
    }
  }

  return {
    title: '你们进入了季后淘汰赛',
    body: '前八不是终点，但它是分界线。它说明这支队伍不只是完成了公开预选赛，也真正站进了淘汰赛的语境里。'
  }
}

function getRankMemoryLine(rankText, subject = '对手') {
  const text = String(rankText || '')
  const rank = getRankNumber(text)

  if (rank === 1 || text.includes('冠军')) return `${subject}最终拿到了冠军`
  if (rank === 2 || text.includes('亚军')) return `${subject}最终走到了决赛`
  if (rank === 3 || text.includes('季军')) return `${subject}最终站上了前三`
  if (rank === 4 || text.includes('殿军')) return `${subject}最终进入了四强`
  if (rank !== null && rank >= 5 && rank <= 8) return `${subject}最终进入了季后淘汰赛`
  if (rank !== null && rank > 8) return `${subject}最终停在公开预选赛阶段`
  if (text) return `${subject}最终成绩：${text}`

  return ''
}

const DEFAULT_TEAM_LOGO = '/logos/fc_logo.png'

function getSafeTeamLogo(teamLike, db) {
  const key = typeof teamLike === 'object'
    ? pickFirstValue(teamLike.short, teamLike.team_short_name, teamLike.team_name, teamLike.name)
    : String(teamLike || '').trim()
  const team = key ? getTeamById(db, key) : null
  const logoKey = pickFirstValue(team?.team_short_name, team?.short, team?.team_id, team?.id, key)

  return logoKey ? (getTeamLogo(logoKey, db) || DEFAULT_TEAM_LOGO) : DEFAULT_TEAM_LOGO
}

function getPlayerTotalForPlayer(db, player) {
  const directKeys = [
    player?.player_id,
    player?.id,
    player?.fca_id,
    player?.account_id,
    player?.battle_tag,
    player?.player_name
  ].filter(Boolean)

  for (const key of directKeys) {
    const total = getPlayerTotalById(db, key)
    if (total) return total
  }

  const candidates = getIdentityValues(player)
  return safeArr(db?.player_totals).find(row => identityOverlaps(row, candidates)) || null
}

function getRosterPlayerName(player, total) {
  const tag = getPlayerBattleTag(player, total || player)
  const raw = pickFirstValue(
    player?.display_name,
    player?.nickname,
    player?.name,
    total?.display_name,
    total?.nickname,
    total?.name,
    total?.player_name,
    player?.player_name,
    getPlayerDisplayName(total || player)
  )

  if (!raw && tag) return tag.replace(/#\d+$/g, '')
  if (tag && normalizeText(raw) === normalizeText(tag)) return raw.replace(/#\d+$/g, '')

  return String(raw || 'UNKNOWN PLAYER').trim()
}

function getPlayerTopHeroes(player, total, limit = 3) {
  const logs = getValidLogs(player)
  const fromLogs = getHeroPool(logs).slice(0, limit)

  if (fromLogs.length) return fromLogs

  const fallbackHeroes = [
    total?.top_hero,
    total?.most_played_hero,
    total?.main_hero,
    total?.hero,
    player?.top_hero,
    player?.most_played_hero,
    player?.main_hero,
    player?.hero
  ].filter(Boolean)

  return uniq(fallbackHeroes).slice(0, limit).map(hero => ({
    hero,
    role: total?.role || player?.role,
    minutes: 0,
    count: 0
  }))
}

function getPlayerRoleSummary(player, total) {
  const logs = getValidLogs(player)
  const roleMap = new Map()

  logs.forEach(log => {
    const role = pickFirstValue(log?.role, log?.heroRole, log?.position)
    const roleText = getRoleCn(role)
    if (!roleText) return

    const minutes = Number(log?.playtimeMinutes || log?.playtime_minutes || 0)
    roleMap.set(roleText, (roleMap.get(roleText) || 0) + (Number.isFinite(minutes) && minutes > 0 ? minutes : 1))
  })

  if (!roleMap.size) {
    const fallbackRole = getRoleCn(total?.role || player?.role)
    return fallbackRole || ''
  }

  const order = { 坦克: 1, 输出: 2, 辅助: 3 }

  return Array.from(roleMap.entries())
    .sort((a, b) => {
      const orderDiff = (order[a[0]] || 9) - (order[b[0]] || 9)
      if (orderDiff !== 0) return orderDiff
      return b[1] - a[1]
    })
    .map(([role]) => role)
    .join(' / ')
}

function buildTeamRosterCards(db, players) {
  return safeArr(players).map(player => {
    const total = getPlayerTotalForPlayer(db, player)
    const source = total || player
    const battleTag = getPlayerBattleTag(player, source)
    const role = source?.role || player?.role
    const roleText = getPlayerRoleSummary(player, total) || getRoleCn(role)
    const logs = getValidLogs(player)
    const mapCount = uniqueCount(logs.map(log => getLineupGroupKey(log)).filter(Boolean)) || logs.length
    const topHeroes = getPlayerTopHeroes(player, total, 3)
    const heroNames = topHeroes.map(item => heroCn(item.hero)).filter(Boolean)
    const primaryHero = topHeroes[0] || null

    return {
      title: getRosterPlayerName(player, total),
      battleTag,
      tag: battleTag,
      meta: roleText,
      value: mapCount ? `${mapCount} 张地图记录` : '阵容成员',
      image: primaryHero ? getHeroImage(primaryHero.hero, primaryHero.role || role) : '',
      heroes: heroNames,
      hero: heroNames[0] || '',
      role: roleText
    }
  })
}

function getLineupGroupKey(log) {
  const matchKey = pickFirstValue(
    log?.match_id,
    log?.matchId,
    log?.match_code,
    log?.matchCode,
    log?.series_id,
    log?.seriesId,
    log?.match_name,
    log?.matchName,
    log?.match,
    log?.fixture_id,
    log?.fixtureId
  )

  const mapKey = pickFirstValue(
    log?.map_id,
    log?.mapId,
    log?.map_code,
    log?.mapCode,
    log?.map_name,
    log?.mapName,
    log?.map,
    log?.map_index,
    log?.mapIndex,
    log?.game_id,
    log?.gameId
  )

  if (!matchKey || !mapKey) return ''
  return `${matchKey}::${mapKey}`
}

function getLineupLogMinutes(log) {
  const raw = pickFirstValue(
    log?.minutes,
    log?.minute,
    log?.played_minutes,
    log?.time_played_min,
    log?.time_played,
    log?.play_time,
    log?.duration,
    log?.hero_time,
    log?.time
  )

  const num = Number(String(raw ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(num) && num > 0 ? num : 1
}

function getLineupRoleRank(role) {
  const text = String(role || '').toLowerCase()

  if (text.includes('tank') || text.includes('坦克')) return 1
  if (text.includes('dps') || text.includes('damage') || text.includes('输出')) return 2
  if (text.includes('support') || text.includes('辅助')) return 3

  return 9
}

function getLineupTopStage(stageMap) {
  return Array.from(stageMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

function getCoachMostUsedLineup(db, players) {
  const mapGroups = new Map()

  safeArr(players).forEach(player => {
    const total = getPlayerTotalForPlayer(db, player)
    const playerName = getRosterPlayerName(player, total)
    const playerKey = pickFirstValue(
      player?.player_id,
      player?.id,
      player?.battle_tag,
      player?.battleTag,
      player?.battletag,
      playerName
    )

    if (!playerKey || !playerName) return

    getValidLogs(player).forEach(log => {
      const groupKey = getLineupGroupKey(log)
      if (!groupKey) return

      if (!mapGroups.has(groupKey)) {
        mapGroups.set(groupKey, {
          key: groupKey,
          matchKey: pickFirstValue(log?.match_id, log?.matchId, log?.match_code, log?.matchCode, log?.match),
          mapKey: pickFirstValue(log?.map_id, log?.mapId, log?.map_name, log?.mapName, log?.map),
          stage: pickFirstValue(log?.stage, log?.phase, log?.round_stage),
          players: new Map()
        })
      }

      const group = mapGroups.get(groupKey)
      const minutes = getLineupLogMinutes(log)
      const prev = group.players.get(playerKey)
      const topHeroes = getPlayerTopHeroes(player, total, 3)
      const heroNames = topHeroes.map(item => heroCn(item.hero)).filter(Boolean)
      const primaryHero = topHeroes[0] || null
      const role = total?.role || player?.role || log?.role

      group.players.set(playerKey, {
        key: playerKey,
        name: playerName,
        battleTag: getPlayerBattleTag(player, total),
        role,
        roleCn: getRoleCn(role),
        minutes: (prev?.minutes || 0) + minutes,
        heroes: heroNames,
        image: primaryHero ? getHeroImage(primaryHero.hero, primaryHero.role || role) : ''
      })
    })
  })

  const comboMap = new Map()

  mapGroups.forEach(group => {
    const members = Array.from(group.players.values())
      .filter(item => item.name)
      .sort((a, b) => {
        const roleDiff = getLineupRoleRank(a.role) - getLineupRoleRank(b.role)
        if (roleDiff !== 0) return roleDiff
        if (b.minutes !== a.minutes) return b.minutes - a.minutes
        return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN')
      })
      .slice(0, 5)

    if (members.length < 5) return

    const comboKey = members.map(item => item.key).sort().join('|')
    const prev = comboMap.get(comboKey) || {
      count: 0,
      totalMinutes: 0,
      players: members,
      mapKeys: new Set(),
      matchKeys: new Set(),
      stages: new Map()
    }

    prev.count += 1
    prev.totalMinutes += members.reduce((sum, item) => sum + Number(item.minutes || 0), 0)
    prev.mapKeys.add(group.key)
    if (group.matchKey) prev.matchKeys.add(group.matchKey)

    if (group.stage) {
      prev.stages.set(group.stage, (prev.stages.get(group.stage) || 0) + 1)
    }

    comboMap.set(comboKey, prev)
  })

  const best = Array.from(comboMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.totalMinutes - a.totalMinutes
    })[0]

  if (!best) return null

  const stage = getLineupTopStage(best.stages)

  return {
    count: best.count,
    matchCount: best.matchKeys.size,
    stage,
    stageLabel: stage ? stageCn(stage) : '',
    players: best.players.map(player => ({
      title: player.name,
      battleTag: player.battleTag,
      tag: player.battleTag,
      meta: player.roleCn,
      note: '阵容成员',
      image: player.image,
      heroes: player.heroes || [],
      role: player.roleCn
    }))
  }
}

function getTeamKeyMatch(matches, candidates) {
  const rows = safeArr(matches).filter(Boolean)
  if (!rows.length) return null

  return [...rows].sort((a, b) => {
    const diffA = getScoreDiff(a)
    const diffB = getScoreDiff(b)
    const closeA = Number.isFinite(diffA) ? Math.max(0, 18 - diffA * 5) : 0
    const closeB = Number.isFinite(diffB) ? Math.max(0, 18 - diffB * 5) : 0
    const winA = getMatchResultText(a, candidates) === '胜利' ? 4 : 0
    const winB = getMatchResultText(b, candidates) === '胜利' ? 4 : 0

    return (getMatchImportanceScore(b) + closeB + winB) - (getMatchImportanceScore(a) + closeA + winA)
  })[0] || null
}

function cleanBattleTag(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^FCA26-P\d+$/i.test(raw)) return ''
  return raw
}

function getPlayerBattleTag(player, source) {
  const candidates = [
    player?.battle_tag,
    player?.battletag,
    player?.battleTag,
    player?.player_tag,
    player?.account,
    player?.account_id,
    player?.game_id,
    source?.battle_tag,
    source?.battletag,
    source?.battleTag,
    source?.player_tag,
    source?.account,
    source?.account_id,
    source?.game_id,
    player?.player_name,
    source?.player_name,
    player?.name,
    source?.name
  ].map(cleanBattleTag).filter(Boolean)

  const withHash = candidates.find(value => /#\d{3,}$/i.test(value))
  if (withHash) return withHash

  return candidates[0] || ''
}

function stripHashTag(value) {
  return String(value || '').replace(/#\d+$/g, '').trim()
}

function getPublicName(value, fallback = '') {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return stripHashTag(raw) || raw || fallback
}

function getFullTag(value) {
  return String(value || '').trim()
}


const STAFF_DISPLAY_ALIASES = {
  michaelsky5: 'SKY',
  交易大师邦桑迪: '牛萨库斯',
  GHOST: 'GHOST',
  在桜花散落前: '小枝',
  江川鹤一: '江川鹤一',
  缚虎君: '缚虎',
  只看漫天繁星与你: 'Roya',
  桑榆: '桑榆',
  纳纳克绝不熬夜: '南宫',
  丧命: '丧命',
  咸鱼咸: '咸鱼咸',
  Iris: '鸢尾',
  转生成雷电将军: '雷电将军',
  CHILLBOI: 'HAJIMI',
  我在黄昏淇里: '良良子',
  君子与月齐辉: '君子',
  LuckyBoy: 'LuckyBoy',
  寒冷的笑: '小云',
  疯狂大堡垒: '大堡垒',
  对面买菜超级加倍: '滴查',
  MaverickOvO: 'Maverick',
  AvIcII: 'Avicii',
  雾星月: '雾星月',
  Eleven: '伊莱文',
  我一世背叛: '我一世背叛',
  雨说丶: '雨说',
  Bella: '贝拉',
  身上有麻衣在爬: 'Z12'
}

function getStaffAliasName(value, fallback = '') {
  const raw = String(value || '').trim()
  const publicName = getPublicName(raw, raw)
  const candidates = [raw, publicName, stripHashTag(raw)].filter(Boolean)

  for (const candidate of candidates) {
    if (STAFF_DISPLAY_ALIASES[candidate]) return STAFF_DISPLAY_ALIASES[candidate]
  }

  const normalized = candidates.map(item => normalizeText(item)).filter(Boolean)
  const matchedKey = Object.keys(STAFF_DISPLAY_ALIASES).find(key => normalized.includes(normalizeText(key)))

  return matchedKey ? STAFF_DISPLAY_ALIASES[matchedKey] : (fallback || publicName || raw)
}


function samePersonName(a, b) {
  const left = normalizeText(getPublicName(a) || a)
  const right = normalizeText(getPublicName(b) || b)
  const leftFull = normalizeText(a)
  const rightFull = normalizeText(b)

  if (!left && !leftFull) return false
  if (!right && !rightFull) return false

  return left === right || leftFull === rightFull
}

function getMatchShortTitle(match) {
  if (!match) return ''

  const round = getRoundDisplay(match.round)
  const stage = stageCn(match.stage)
  const display = getMatchDisplayName(match)
  const raw = `${stage} ${round} ${display}`.toUpperCase()

  if (raw.includes('GRAND FINAL') || raw.includes('总决赛') || raw.includes('决赛')) return '总决赛'
  if (raw.includes('FINAL')) return '决赛'
  if (raw.includes('PLAYOFF') || stage.includes('季后')) return round || stage || display
  if (round) return round
  return stage || display
}

function getMatchStoryTitle(match, fallback = '这场比赛') {
  const title = getMatchShortTitle(match)
  return title || fallback
}

function buildPartnerCard(person) {
  const name = pickFirstValue(
    person?.name,
    person?.publicName,
    person?.staff_name,
    person?.caster_name,
    person?.commentator_name,
    person?.admin_name,
    person?.display_name,
    person
  )

  const count = person?.count ?? person?.match_count ?? person?.matches_count ?? 0
  const publicName = getPublicName(name, 'UNKNOWN')

  return {
    title: publicName,
    battleTag: getFullTag(name),
    meta: getFullTag(name) !== publicName ? getFullTag(name) : '',
    value: `${count} 次`,
    image: getStaffAvatar(name)
  }
}

function getMatchCasterNames(match) {
  const broadcast = match?.broadcast || {}

  return splitNames([
    match?.casters,
    match?.caster,
    match?.commentators,
    match?.commentator,
    match?.commentary,
    match?.caster_names,
    match?.commentator_names,
    match?.casterName,
    match?.commentatorName,
    match?.caster_1,
    match?.caster_2,
    match?.caster1,
    match?.caster2,
    match?.解说,
    broadcast?.casters,
    broadcast?.caster,
    broadcast?.commentators,
    broadcast?.commentator,
    broadcast?.caster_names,
    broadcast?.commentator_names,
    broadcast?.caster_a,
    broadcast?.caster_b,
    broadcast?.casterA,
    broadcast?.casterB,
    broadcast?.caster_1,
    broadcast?.caster_2,
    broadcast?.caster1,
    broadcast?.caster2,
    broadcast?.解说
  ])
}

function getMatchStaffNames(match) {
  const broadcast = match?.broadcast || {}

  return splitNames([
    match?.staffs,
    match?.staff,
    match?.admins,
    match?.admin,
    match?.referees,
    match?.referee,
    match?.observers,
    match?.observer,
    match?.operators,
    match?.operator,
    match?.staff_names,
    match?.admin_names,
    match?.staffName,
    match?.adminName,
    match?.staff_1,
    match?.staff_2,
    match?.admin_1,
    match?.admin_2,
    match?.admin1,
    match?.admin2,
    match?.赛管,
    broadcast?.staffs,
    broadcast?.staff,
    broadcast?.admins,
    broadcast?.admin,
    broadcast?.staff_names,
    broadcast?.admin_names,
    broadcast?.staffName,
    broadcast?.adminName,
    broadcast?.admin_a,
    broadcast?.admin_b,
    broadcast?.adminA,
    broadcast?.adminB,
    broadcast?.admin_1,
    broadcast?.admin_2,
    broadcast?.admin1,
    broadcast?.admin2,
    broadcast?.赛管
  ])
}

function mergeNameCount(map, name, increment = 1) {
  const raw = String(name || '').trim()
  const publicName = getPublicName(raw)

  if (!publicName) return

  const key = normalizeText(publicName)
  const prev = map.get(key) || {
    name: raw,
    publicName,
    count: 0
  }

  prev.count += Number(increment || 1)

  if (!/#\d+$/i.test(prev.name) && /#\d+$/i.test(raw)) {
    prev.name = raw
  }

  map.set(key, prev)
}

function nameCountRows(map, limit = 8) {
  const rows = [...map.values()]
    .filter(item => item.publicName)
    .sort((a, b) => b.count - a.count || a.publicName.localeCompare(b.publicName))

  const max = Number(limit)
  return Number.isFinite(max) ? rows.slice(0, Math.max(0, max)) : rows
}

function countPeopleFromMatches(matches, getNames, selfNames = []) {
  const map = new Map()

  safeArr(matches).forEach(match => {
    getNames(match).forEach(name => {
      const isSelf = safeArr(selfNames).some(self => samePersonName(self, name))
      if (!isSelf) mergeNameCount(map, name, 1)
    })
  })

  return nameCountRows(map, 12)
}

function normalizePartnerRows(partners) {
  const map = new Map()

  safeArr(partners).flatMap(item => safeArr(item)).forEach(partner => {
    const name = pickFirstValue(
      partner?.name,
      partner?.publicName,
      partner?.staff_name,
      partner?.caster_name,
      partner?.commentator_name,
      partner?.admin_name,
      partner?.display_name,
      partner
    )

    const count = partner?.count ?? partner?.match_count ?? partner?.matches_count ?? 1
    mergeNameCount(map, name, count)
  })

  return nameCountRows(map, 12)
}

function getStaffFallbackCrossPartners(staff, isCaster) {
  const rows = []

  const raw = isCaster
    ? pickFirstValue(
      staff?.staff_partners,
      staff?.admin_partners,
      staff?.referee_partners,
      staff?.observer_partners,
      staff?.operator_partners,
      staff?.cross_partners,
      staff?.crossRolePartners
    )
    : pickFirstValue(
      staff?.caster_partners,
      staff?.commentator_partners,
      staff?.commentary_partners,
      staff?.cross_partners,
      staff?.crossRolePartners
    )

  safeArr(raw).forEach(item => rows.push(item))

  return normalizePartnerRows(rows)
}

function mergePartnerRows(primary, fallback, limit = 12) {
  const map = new Map()

  safeArr([...safeArr(primary), ...safeArr(fallback)]).forEach(item => {
    const name = item?.name || item?.publicName || item?.staff_name || item?.display_name || item
    const count = item?.count ?? item?.match_count ?? 1
    mergeNameCount(map, name, count)
  })

  return nameCountRows(map, limit)
}

function getStaffCollaborationGroups(staff, matches, isCaster) {
  const selfNames = [
    staff?.staff_name,
    staff?.caster_name,
    staff?.commentator_name,
    staff?.admin_name,
    staff?.name,
    staff?.display_name,
    staff?.key,
    staff?.staff_key
  ].filter(Boolean)

  const sameRoleFromMatches = countPeopleFromMatches(
    matches,
    isCaster ? getMatchCasterNames : getMatchStaffNames,
    selfNames
  )

  const sameRolePartners = sameRoleFromMatches.length
    ? sameRoleFromMatches
    : normalizePartnerRows(staff?.partners)

  const crossRoleFromMatches = countPeopleFromMatches(
    matches,
    isCaster ? getMatchStaffNames : getMatchCasterNames,
    selfNames
  )

  const crossRoleFallback = getStaffFallbackCrossPartners(staff, isCaster)
  const crossRolePartners = mergePartnerRows(crossRoleFromMatches, crossRoleFallback, 12)

  return {
    sameRolePartners,
    crossRolePartners
  }
}

function getBestNarrativeBar(dataBars) {
  const rows = safeArr(dataBars).filter(row => Number(row?.score || 0) > 0)
  if (!rows.length) return null

  const normal = rows.filter(row => !row.lowerIsBetter).sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0]
  const defensive = rows.filter(row => row.lowerIsBetter).sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0]

  if (!normal) return defensive || null
  if (!defensive) return normal

  if (Number(defensive.score || 0) >= 95 && Number(normal.score || 0) < 80) return defensive
  return normal
}

function getTeamSeasonOpponent(db, matches, candidates, keyMatch, lastMatch) {
  const map = new Map()

  safeArr(matches).forEach(match => {
    const opponent = getOpponentByCandidates(match, candidates)
    const name = getTeamDisplay(opponent)

    if (!opponent || !name || name === '对手') return

    const key = normalizeText(name)
    const rankText = getTeamFinalRankText(db, opponent)
    const diff = getScoreDiff(match)
    const importance = getMatchImportanceScore(match)
    const prev = map.get(key) || {
      name,
      opponent,
      rankText,
      count: 0,
      matches: [],
      score: 0
    }

    prev.count += 1
    prev.matches.push(match)
    prev.rankText = prev.rankText || rankText
    prev.score += importance

    if (String(rankText).includes('冠军')) prev.score += 40
    if (keyMatch && (match === keyMatch || match.match_id === keyMatch.match_id)) prev.score += 24
    if (lastMatch && (match === lastMatch || match.match_id === lastMatch.match_id)) prev.score += 12
    if (Number.isFinite(diff)) prev.score += Math.max(0, 10 - diff * 3)

    map.set(key, prev)
  })

  const best = [...map.values()].sort((a, b) => b.score - a.score || b.count - a.count)[0]
  if (!best) return null

  const representativeMatch = best.matches
    .slice()
    .sort((a, b) => getMatchImportanceScore(b) - getMatchImportanceScore(a))[0]

  return {
    ...best,
    representativeMatch,
    matchCard: representativeMatch ? buildMatchCard(db, representativeMatch, candidates, {
      title: '赛季对手所在比赛',
      note: best.rankText ? getRankMemoryLine(best.rankText, '这支队伍') : '这支队伍构成了你们赛季里的一个参照。'
    }) : null
  }
}

function getGrandFinalMatch(matches) {
  const rows = safeArr(matches).filter(Boolean)

  return rows.find(match => {
    const text = `${stageCn(match.stage)} ${getRoundDisplay(match.round)} ${getMatchDisplayName(match)}`.toUpperCase()
    return text.includes('GRAND FINAL') || text.includes('总决赛')
  }) || [...rows].sort((a, b) => getMatchImportanceScore(b) - getMatchImportanceScore(a))[0] || null
}

function getAllTeamLikeRows(db) {
  const rows = [
    ...safeArr(db?.team_reviews),
    ...safeArr(db?.teams)
  ]

  const map = new Map()

  rows.forEach(row => {
    const key = normalizeText(pickFirstValue(row?.short, row?.team_short_name, row?.team_id, row?.team_name, row?.name))
    if (!key) return
    map.set(key, { ...(map.get(key) || {}), ...row })
  })

  return [...map.values()]
}

function getStaffReviewRows(db) {
  const direct = [
    ...safeArr(db?.staff_reviews),
    ...safeArr(db?.staff_review),
    ...safeArr(db?.staffReviews),
    ...safeArr(db?.caster_reviews),
    ...safeArr(db?.caster_review),
    ...safeArr(db?.casters),
    ...safeArr(db?.admins),
    ...safeArr(db?.staff)
  ]

  const discovered = []

  Object.values(db || {}).forEach(value => {
    if (!Array.isArray(value)) return

    value.forEach(row => {
      if (!row || typeof row !== 'object') return

      const name = pickFirstValue(row.staff_name, row.caster_name, row.admin_name, row.display_name, row.name)
      const hasReviewShape = row.match_count !== undefined || row.matches || row.stages || row.teams_seen || row.partners

      if (name && hasReviewShape) discovered.push(row)
    })
  })

  const map = new Map()

  ;[...direct, ...discovered].forEach(row => {
    if (!row || typeof row !== 'object') return

    const name = pickFirstValue(row.staff_name, row.caster_name, row.admin_name, row.display_name, row.name)
    const role = inferStaffReviewRole(row)
    const key = `${role}:${normalizeText(getPublicName(name))}`

    if (!name || !key) return
    map.set(key, row)
  })

  return [...map.values()]
}

function inferStaffReviewRole(row) {
  const text = [
    row?.staff_type,
    row?.type,
    row?.category,
    row?.role,
    row?.source,
    row?.kind
  ].filter(Boolean).join(' ').toLowerCase()

  if (row?.caster_name || text.includes('caster') || text.includes('commentator') || text.includes('解说')) return 'caster'
  if (row?.admin_name || text.includes('staff') || text.includes('admin') || text.includes('referee') || text.includes('observer') || text.includes('赛管') || text.includes('裁判') || text.includes('导播')) return 'staff'

  return ''
}

function getIdentityValues(value) {
  if (!value) return []

  if (typeof value !== 'object') {
    return [String(value)]
  }

  return [
    value.id,
    value.team_id,
    value.player_id,
    value.short,
    value.team_short_name,
    value.name,
    value.team_name,
    value.display_name,
    value.nickname,
    value.player_name
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== '').map(String)
}

function identityOverlaps(source, candidates) {
  const sourceKeys = getIdentityValues(source).map(normalizeText).filter(Boolean)
  const candidateKeys = safeArr(candidates).map(normalizeText).filter(Boolean)

  if (!sourceKeys.length || !candidateKeys.length) return false

  const set = new Set(sourceKeys)
  return candidateKeys.some(key => set.has(key))
}

function getTeamCandidateValues(teamId, team, review) {
  return uniq([
    teamId,
    ...getIdentityValues(team),
    ...getIdentityValues(review)
  ])
}

function getTeamDisplay(teamLike) {
  if (!teamLike) return '对手'
  return teamLike.short || teamLike.team_short_name || teamLike.name || teamLike.team_name || '对手'
}

function getTeamShortName(team, review, source = {}) {
  return pickFirstValue(
    source.team_short_name,
    source.short,
    review?.team_short_name,
    review?.short,
    team?.team_short_name,
    team?.short
  )
}

function getTeamFullName(team, review) {
  return pickFirstValue(
    review?.team_name,
    review?.name,
    team?.team_name,
    team?.name
  )
}

function getTeamFinalRankText(db, teamLike) {
  if (!teamLike) return ''

  const team = getTeamById(db, teamLike)
  const review = getTeamReviewById(db, teamLike)

  return pickFirstValue(
    review?.final_rank_text,
    review?.rank_text,
    team?.final_rank_text,
    team?.rank_text,
    teamLike?.final_rank_text,
    teamLike?.rank_text
  )
}

function getMatchSide(match, candidates) {
  if (!match) return ''
  if (identityOverlaps(match?.team_a, candidates)) return 'A'
  if (identityOverlaps(match?.team_b, candidates)) return 'B'
  return ''
}

function getOpponentByCandidates(match, candidates) {
  const side = getMatchSide(match, candidates)
  if (side === 'A') return match?.team_b || null
  if (side === 'B') return match?.team_a || null
  return null
}

function getTeamSideScore(match, side) {
  if (!match || !side) return null

  if (side === 'A') {
    const value = match?.team_a?.score ?? match?.score_a ?? match?.teamAScore
    return value === undefined || value === null || value === '' ? null : Number(value)
  }

  const value = match?.team_b?.score ?? match?.score_b ?? match?.teamBScore
  return value === undefined || value === null || value === '' ? null : Number(value)
}

function getScoreText(match) {
  const a = getTeamSideScore(match, 'A')
  const b = getTeamSideScore(match, 'B')

  if (Number.isFinite(a) && Number.isFinite(b)) return `${a}\u00A0-\u00A0${b}`
  return ''
}

function getMatchResultText(match, candidates) {
  const side = getMatchSide(match, candidates)
  if (!side) return ''

  const winner = getMatchWinnerId(match)

  if (winner) {
    if (side === 'A' && identityOverlaps(match?.team_a, winner)) return '胜利'
    if (side === 'B' && identityOverlaps(match?.team_b, winner)) return '胜利'
    if (identityOverlaps(winner, candidates)) return '胜利'
    return '失利'
  }

  const own = getTeamSideScore(match, side)
  const opp = getTeamSideScore(match, side === 'A' ? 'B' : 'A')

  if (Number.isFinite(own) && Number.isFinite(opp)) {
    if (own > opp) return '胜利'
    if (own < opp) return '失利'
    return '平局'
  }

  return ''
}

function getScoreDiff(match) {
  const a = getTeamSideScore(match, 'A')
  const b = getTeamSideScore(match, 'B')

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.abs(a - b)
}

function isTeamWinner(match, teamId, team, review) {
  const candidates = getTeamCandidateValues(teamId, team, review)
  const winner = getMatchWinnerId(match)

  if (!winner) return false
  if (identityOverlaps(winner, candidates)) return true

  const winnerSide = identityOverlaps(match?.team_a, winner) ? match?.team_a : identityOverlaps(match?.team_b, winner) ? match?.team_b : null
  return winnerSide ? identityOverlaps(winnerSide, candidates) : false
}

function getMatchDisplayName(match) {
  return match?.match_display_name || match?.matchDisplayName || match?.match_id || '这场比赛'
}

function getRoundDisplay(round) {
  const raw = String(round || '').trim()
  if (!raw) return ''

  const upper = raw
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if ((upper.includes('GRAND') && upper.includes('FINAL')) || upper.includes('总决赛')) return '总决赛'

  if ((upper.includes('WINNER') || upper.includes('UPPER') || upper.includes('胜者')) && upper.includes('FINAL')) return '胜者组决赛'
  if ((upper.includes('LOSER') || upper.includes('LOWER') || upper.includes('败者')) && upper.includes('FINAL')) return '败者组决赛'

  if ((upper.includes('WINNER') || upper.includes('UPPER') || upper.includes('胜者')) && (upper.includes('SEMI') || upper.includes('SEMIFINAL'))) return '胜者组半决赛'
  if ((upper.includes('LOSER') || upper.includes('LOWER') || upper.includes('败者')) && (upper.includes('SEMI') || upper.includes('SEMIFINAL'))) return '败者组半决赛'

  if (upper.includes('FINAL')) return '决赛'
  if (upper.includes('SEMIFINAL') || upper.includes('SEMI FINAL') || upper.includes('SEMI')) return '半决赛'
  if (upper.includes('QUARTER')) return '四分之一决赛'

  if (upper.includes('ROUND OF 8') || upper === 'RO8') return '八强赛'
  if (upper.includes('ROUND OF 4') || upper === 'RO4') return '四强赛'
  if (upper.includes('ROUND OF 16') || upper === 'RO16') return '十六强赛'

  if (upper.includes('SWISS')) return '瑞士轮'
  if (upper.includes('LCQ')) return '突围赛'
  if (upper.includes('PLAYOFF')) return '季后淘汰赛'

  const roundMatch = upper.match(/^(?:ROUND|R)\s*(\d+)$/)
  if (roundMatch) return `第${roundMatch[1]}轮`

  return raw
}

function getMatchMeta(match) {
  if (!match) return ''

  return [
    stageCn(match.stage),
    getRoundDisplay(match.round),
    getScheduledText(match)
  ].filter(Boolean).join(' / ')
}

function buildMatchCard(db, match, candidates, options = {}) {
  if (!match) return null

  const opponent = getOpponentByCandidates(match, candidates)
  const opponentRank = getTeamFinalRankText(db, opponent)
  const result = getMatchResultText(match, candidates)
  const score = getScoreText(match)

  return {
    title: options.title || getMatchDisplayName(match),
    left: getTeamDisplay(match.team_a),
    right: getTeamDisplay(match.team_b),
    score,
    result,
    meta: getMatchMeta(match),
    note: options.note || '',
    opponent: getTeamDisplay(opponent),
    opponentRank,
    opponentMemory: getRankMemoryLine(opponentRank, '对手'),
    stage: stageCn(match.stage),
    round: getRoundDisplay(match.round),
    time: getScheduledText(match),
    matchId: match.match_id || match.id || ''
  }
}

function resolveMatch(db, item) {
  if (!item) return null

  if (item.team_a || item.team_b || item.match_id) {
    const resolved = getMatchById(db, item.match_id || item.id || item.raw_match_id)
    return resolved || item
  }

  return getMatchById(db, item)
}

function sortMatches(matches) {
  return safeArr(matches).filter(Boolean).sort((a, b) => {
    const timeA = String(getScheduledText(a) || a.scheduled_at || a.match_id || '')
    const timeB = String(getScheduledText(b) || b.scheduled_at || b.match_id || '')
    return timeA.localeCompare(timeB)
  })
}

function getValidLogs(player) {
  return safeArr(player?.match_logs || player?.live_match_logs)
    .filter(log => Number(log?.playtimeMinutes || 0) > 0 && (log?.hero || log?.mapName || log?.matchId))
}

function getHydratedLogs(db, logs) {
  return safeArr(logs).map((log, index) => {
    const match = getMatchById(db, log.matchId)
    return { log, match, index }
  }).sort((a, b) => {
    const timeA = String(getScheduledText(a.match) || a.match?.match_id || a.index)
    const timeB = String(getScheduledText(b.match) || b.match?.match_id || b.index)
    return timeA.localeCompare(timeB)
  })
}

function parseRouteDateText(value) {
  const text = String(value || '').trim()
  if (!text) return null

  const full = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (full) {
    const year = full[1]
    const month = full[2].padStart(2, '0')
    const day = full[3].padStart(2, '0')

    return {
      sort: `${year}-${month}-${day}`,
      display: `${year}.${month}.${day}`
    }
  }

  const monthDay = text.match(/(\d{1,2})[月./-](\d{1,2})/)
  if (monthDay) {
    const month = monthDay[1].padStart(2, '0')
    const day = monthDay[2].padStart(2, '0')

    return {
      sort: `2026-${month}-${day}`,
      display: `2026.${month}.${day}`
    }
  }

  const parsed = Date.parse(text)
  if (Number.isFinite(parsed)) {
    const date = new Date(parsed)
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return {
      sort: `${year}-${month}-${day}`,
      display: `${year}.${month}.${day}`
    }
  }

  return null
}

function getPlayerRouteDateRows(hydratedLogs) {
  return safeArr(hydratedLogs)
    .map(row => {
      const match = row?.match
      const raw = pickFirstValue(
        match?.scheduled_at,
        match?.scheduledAt,
        match?.start_time,
        match?.startTime,
        match?.match_date,
        match?.date,
        getScheduledText(match)
      )

      const parsed = parseRouteDateText(raw)
      if (!parsed) return null

      return {
        ...parsed,
        match,
        log: row.log
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.sort.localeCompare(b.sort))
}

function getHeroPool(logs) {
  const map = new Map()

  logs.forEach(log => {
    if (!log.hero) return

    const key = heroNameToSlug(log.hero)
    const prev = map.get(key) || {
      hero: log.hero,
      minutes: 0,
      count: 0,
      role: log.role
    }

    prev.minutes += Number(log.playtimeMinutes || 0)
    prev.count += 1
    if (log.role) prev.role = log.role

    map.set(key, prev)
  })

  return [...map.values()].sort((a, b) => b.minutes - a.minutes || b.count - a.count)
}

function getMapInstanceKey(log) {
  const matchKey = pickFirstValue(
    log?.matchId,
    log?.match_id,
    log?.matchCode,
    log?.match_code,
    log?.match
  )

  const mapKey = pickFirstValue(
    log?.mapIndex,
    log?.map_index,
    log?.gameIndex,
    log?.game_index,
    log?.mapName,
    log?.map_name,
    log?.map
  )

  return [matchKey, mapKey].filter(Boolean).join('::') || mapNameToFileName(log?.mapName || log?.map_name || '')
}

function getMapPool(logs) {
  const map = new Map()

  logs.forEach(log => {
    const rawMapName = log.mapName || log.map_name || log.map
    if (!rawMapName) return

    const key = mapNameToFileName(rawMapName)
    const instanceKey = getMapInstanceKey(log)

    const prev = map.get(key) || {
      mapName: rawMapName,
      mapType: log.mapType || log.map_type,
      count: 0,
      recordCount: 0,
      minutes: 0,
      instances: new Set(),
      heroes: new Map()
    }

    prev.recordCount += 1
    prev.minutes += Number(log.playtimeMinutes || log.playtime_minutes || 0)

    if (instanceKey) prev.instances.add(instanceKey)
    if (log.mapType || log.map_type) prev.mapType = log.mapType || log.map_type

    if (log.hero) {
      const heroKey = heroNameToSlug(log.hero)
      const heroPrev = prev.heroes.get(heroKey) || { hero: log.hero, minutes: 0, count: 0 }

      heroPrev.minutes += Number(log.playtimeMinutes || log.playtime_minutes || 0)
      heroPrev.count += 1

      prev.heroes.set(heroKey, heroPrev)
    }

    map.set(key, prev)
  })

  return [...map.values()].map(item => {
    const topHero = [...item.heroes.values()].sort((a, b) => b.minutes - a.minutes || b.count - a.count)[0]
    const count = item.instances?.size || item.recordCount || 0

    return {
      ...item,
      count,
      topHero
    }
  }).sort((a, b) => b.count - a.count || b.minutes - a.minutes)
}

function getMapTypeDistribution(logs) {
  const map = new Map()

  logs.forEach(log => {
    const type = mapTypeCn(log.mapType || 'UNKNOWN')
    const prev = map.get(type) || { label: type, count: 0, minutes: 0 }

    prev.count += 1
    prev.minutes += Number(log.playtimeMinutes || 0)

    map.set(type, prev)
  })

  const rows = [...map.values()].sort((a, b) => b.count - a.count || b.minutes - a.minutes)
  const max = Math.max(...rows.map(item => item.count), 1)

  return rows.map(item => ({
    label: item.label,
    value: item.count,
    displayValue: `${item.count} 张`,
    score: Math.round((item.count / max) * 100),
    note: `${formatNum(item.minutes, 1)} 分钟`
  }))
}

function getHeroGalleryItems(heroPool, role) {
  return safeArr(heroPool).slice(0, 4).map((item, index) => ({
    src: getHeroImage(item.hero, item.role || role),
    title: heroCn(item.hero),
    meta: `${formatNum(item.minutes, 1)} 分钟`,
    count: item.count,
    isPrimary: index === 0
  })).filter(item => item.src)
}

function getMapVisualImage(mapItem) {
  if (!mapItem?.mapName) return ''
  return getMapImage(mapItem.mapType, mapItem.mapName)
}

function getMapCards(mapPool) {
  return safeArr(mapPool).slice(0, 3).map(item => ({
    title: mapCn(item.mapName),
    meta: mapTypeCn(item.mapType),
    value: `${item.count} 次`,
    sub: `${formatNum(item.minutes, 1)} 分钟`,
    image: getMapVisualImage(item),
    note: item.topHero ? `最常使用：${heroCn(item.topHero.hero)}` : ''
  }))
}

function getPeakLog(logs, role) {
  const r = String(role || '').toUpperCase()

  const scoreLog = log => {
    const totals = log?.totals || {}

    if (r === 'SUP' || r === 'SUPPORT') {
      return Number(totals.healing || 0) + Number(totals.assists || 0) * 180 - Number(totals.deaths || 0) * 120
    }

    if (r === 'TANK') {
      return Number(totals.blocked || 0) * 0.55 + Number(totals.damage || 0) * 0.35 + Number(totals.elims || 0) * 180 - Number(totals.deaths || 0) * 120
    }

    return Number(totals.damage || 0) + Number(totals.elims || 0) * 260 - Number(totals.deaths || 0) * 120
  }

  return [...logs].sort((a, b) => scoreLog(b) - scoreLog(a))[0] || null
}

function getRoleMainMetric(role) {
  const r = String(role || '').toUpperCase()

  if (r === 'TANK') return { key: 'avg_block', label: '阻挡 /10', en: 'BLOCK / 10' }
  if (r === 'SUP' || r === 'SUPPORT') return { key: 'avg_heal', label: '治疗 /10', en: 'HEALING / 10' }

  return { key: 'avg_dmg', label: '伤害 /10', en: 'DAMAGE / 10' }
}

function getRoleTone(role) {
  const r = String(role || '').toUpperCase()

  if (r === 'TANK') return 'blue'
  if (r === 'SUP' || r === 'SUPPORT') return 'green'

  return 'red'
}

function getMetricPercentile(pool, key, value, lowerIsBetter = false) {
  const rows = safeArr(pool)
    .map(row => Number(row?.[key] ?? 0))
    .filter(num => Number.isFinite(num))

  if (!rows.length) return 0

  if (lowerIsBetter) {
    const betterOrEqual = rows.filter(num => num >= value).length
    return Math.round((betterOrEqual / rows.length) * 100)
  }

  const belowOrEqual = rows.filter(num => num <= value).length
  return Math.round((belowOrEqual / rows.length) * 100)
}

function getRoleDataBars(db, source, role) {
  const r = String(role || '').toUpperCase()
  const pool = safeArr(db?.player_totals)
    .filter(row => String(row.role || '').toUpperCase() === r && Number(row.raw_time_mins || 0) >= 20)

  const metrics = r === 'TANK'
    ? [
      { key: 'avg_block', label: '承压空间', value: pickNumber(source, ['avg_block'], 0), display: `${formatNum(pickNumber(source, ['avg_block'], 0), 2)} 阻挡 /10` },
      { key: 'avg_dmg', label: '前排输出', value: pickNumber(source, ['avg_dmg', 'avg_damage'], 0), display: `${formatNum(pickNumber(source, ['avg_dmg', 'avg_damage'], 0), 2)} 伤害 /10` },
      { key: 'avg_elim', label: '击杀参与', value: pickNumber(source, ['avg_elim', 'avg_elims'], 0), display: `${formatNum(pickNumber(source, ['avg_elim', 'avg_elims'], 0), 2)} 击杀 /10` },
      { key: 'avg_dth', label: '生存控制', value: pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), display: `${formatNum(pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), 2)} 死亡 /10`, lowerIsBetter: true }
    ]
    : r === 'SUP' || r === 'SUPPORT'
      ? [
        { key: 'avg_heal', label: '治疗支撑', value: pickNumber(source, ['avg_heal', 'avg_healing'], 0), display: `${formatNum(pickNumber(source, ['avg_heal', 'avg_healing'], 0), 2)} 治疗 /10` },
        { key: 'avg_ast', label: '团队连接', value: pickNumber(source, ['avg_ast', 'avg_assist', 'avg_assists'], 0), display: `${formatNum(pickNumber(source, ['avg_ast', 'avg_assist', 'avg_assists'], 0), 2)} 助攻 /10` },
        { key: 'avg_elim', label: '反打参与', value: pickNumber(source, ['avg_elim', 'avg_elims'], 0), display: `${formatNum(pickNumber(source, ['avg_elim', 'avg_elims'], 0), 2)} 击杀 /10` },
        { key: 'avg_dth', label: '生存控制', value: pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), display: `${formatNum(pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), 2)} 死亡 /10`, lowerIsBetter: true }
      ]
      : [
        { key: 'avg_dmg', label: '持续火力', value: pickNumber(source, ['avg_dmg', 'avg_damage'], 0), display: `${formatNum(pickNumber(source, ['avg_dmg', 'avg_damage'], 0), 2)} 伤害 /10` },
        { key: 'avg_elim', label: '击杀转化', value: pickNumber(source, ['avg_elim', 'avg_elims'], 0), display: `${formatNum(pickNumber(source, ['avg_elim', 'avg_elims'], 0), 2)} 击杀 /10` },
        { key: 'avg_ast', label: '团队联动', value: pickNumber(source, ['avg_ast', 'avg_assist', 'avg_assists'], 0), display: `${formatNum(pickNumber(source, ['avg_ast', 'avg_assist', 'avg_assists'], 0), 2)} 助攻 /10` },
        { key: 'avg_dth', label: '生存控制', value: pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), display: `${formatNum(pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0), 2)} 死亡 /10`, lowerIsBetter: true }
      ]

  const maxValue = Math.max(...metrics.map(item => item.value), 1)

  return metrics.map(item => {
    const score = pool.length >= 4
      ? getMetricPercentile(pool, item.key, item.value, item.lowerIsBetter)
      : Math.round((item.value / maxValue) * 100)

    return {
      label: item.label,
      value: item.value,
      displayValue: item.display,
      score: Math.max(8, Math.min(100, score)),
      lowerIsBetter: Boolean(item.lowerIsBetter)
    }
  }).filter(item => Number(item.value) > 0 || item.lowerIsBetter)
}

function getRoleInsight(playerName, role, dataBars) {
  const best = getBestNarrativeBar(dataBars)

  if (!best) {
    return {
      title: '你的赛季画像，不只由一个数字决定',
      body: `${playerName} 的这段赛季记录，更像是一组被保存下来的出场痕迹。它不一定夸张，但它确实存在。`
    }
  }

  const r = String(role || '').toUpperCase()

  if (best.label.includes('持续火力')) {
    return {
      title: '你最亮眼的地方，是持续制造压力',
      body: `在这份赛季数据里，${best.label}是最醒目的部分。你不是只在某一刻打出伤害，而是在很多团战里持续把压力留给对手。`
    }
  }

  if (best.label.includes('击杀')) {
    return {
      title: '你最亮眼的地方，是把机会变成结果',
      body: `${best.label}成为你这赛季最突出的标签。它说明你不只是参与团战，也在一些关键回合里把机会真正转成了击杀。`
    }
  }

  if (best.label.includes('治疗')) {
    return {
      title: '你最亮眼的地方，是让队友还有下一次机会',
      body: `${best.label}是这份数据里最突出的部分。辅助不总在镜头中央，但很多比赛是在这样的支撑下才被继续打下去的。`
    }
  }

  if (best.label.includes('团队') || best.label.includes('联动')) {
    return {
      title: '你最亮眼的地方，是和队伍连接在一起',
      body: `${best.label}成为你这赛季最清晰的标签。它说明你留下的不是孤立数据，而是和队伍一起完成的回合。`
    }
  }

  if (best.label.includes('生存')) {
    return {
      title: '你最亮眼的地方，是把自己留在场上',
      body: `${best.label}是你这赛季最值得记住的部分。活下来不只是少犯错，它也意味着你能把下一次技能、下一次支援、下一次输出留给队伍。`
    }
  }

  if (r === 'TANK') {
    return {
      title: '你最亮眼的地方，是站在团战最前面',
      body: `${best.label}成为你的赛季标签。很多价值不会直接变成击杀播报，但它会变成队伍可以继续推进的空间。`
    }
  }

  return {
    title: `你最亮眼的地方，是${best.label}`,
    body: `${best.label}是这份赛季数据里最突出的部分。它不代表你的全部，但足够成为这个赛季留给你的一个标签。`
  }
}

function getSeasonIdentitySummary({
  playerName,
  role,
  finalRankText,
  mapCount,
  matchCount,
  minutes,
  topHero,
  topMap,
  roleBars,
  keyMemory
}) {
  const r = String(role || '').toUpperCase()
  const bestBar = getBestNarrativeBar(roleBars)
  const heroName = topHero ? heroCn(topHero.hero) : ''
  const mapName = topMap ? mapCn(topMap.mapName) : ''
  const rankText = String(finalRankText || '').trim()

  let tag = '被记录下来的参赛者'
  let title = '这个赛季，你留下了自己的位置'
  let body = `${playerName} 的赛季不只是一组平均数据。它由 ${mapCount || 0} 张地图、${matchCount || 0} 场比赛，以及那些真正发生过的团战组成。`
  let quoteTitle = '这是一份属于你的赛季标签'
  let quoteBody = '它不是排行榜，也不是最终定义，而是数据中心替你保存下来的一个侧影。'

  if (rankText.includes('冠军')) {
    tag = '冠军路上的名字'
    title = '你的赛季标签，是冠军队伍的一部分'
    body = `最终成绩写成了 ${rankText}，但这不是这段旅程的全部。你在 ${mapCount || 0} 张地图里留下过出场记录，也和队伍一起把这个赛季走到了最高处。`
    quoteTitle = '冠军不是一个人的名字'
    quoteBody = '它由很多场比赛、很多次等待、很多张地图和很多个被记录下来的名字组成。'
  } else if (rankText.includes('亚军')) {
    tag = '决赛路上的参与者'
    title = '你的赛季标签，是走到终局附近'
    body = `最终成绩是 ${rankText}。你们离最后的最高处只差一步，但在抵达那里之前，你已经把自己的名字留在了这段路线里。`
    quoteTitle = '差一步，也是一整段路'
    quoteBody = '亚军不是失败的另一个名字，它也代表这支队伍真的走到了最后的舞台附近。'
  } else if (rankText.includes('季军') || rankText.includes('殿军') || rankText.includes('第4名')) {
    tag = '终局附近的参赛者'
    title = '你的赛季标签，是站进最后的争夺'
    body = `最终成绩是 ${rankText}。这意味着你的赛季不是停在边缘，而是真的走进了这届比赛最靠近终局的位置。`
    quoteTitle = '你不是只经过了这个赛季'
    quoteBody = '你和队伍一起走到了更靠近结尾的地方，这本身就值得被单独记下。'
  } else if (isPlayoffRank(rankText)) {
    tag = '季后淘汰赛参与者'
    title = '你的赛季标签，是进入季后淘汰赛的名字'
    body = `最终成绩是 ${rankText}。进入前八意味着你们不只是完成了公开预选赛，而是把自己的赛季延伸到了季后淘汰赛。`
    quoteTitle = '前八不是终点，但它是分界线'
    quoteBody = '它说明这支队伍曾经真正站进过季后淘汰赛的语境里。'
  } else if (getRankNumber(rankText) && getRankNumber(rankText) > 8) {
    tag = getCompetitionPhaseLabel(rankText)
    title = '你的赛季标签，是公开预选赛里的名字'
    body = `最终成绩是 ${rankText}。这说明你们没有进入季后淘汰赛，但你仍然完整参与了公开预选赛阶段。瑞士轮、突围赛、等待、对阵和结算，都是这届学院赛真正发生过的一部分。`
    quoteTitle = '公开预选赛不是背景'
    quoteBody = '它是所有故事开始的地方。不是每支队伍都会走到最后，但每个进入赛程的人，都让这届比赛变得更完整。'
  } else if (Number(mapCount) >= 30) {
    tag = '长线出场者'
    title = '你的赛季标签，是稳定地留在场上'
    body = `${mapCount} 张地图不是一个偶然数字。它说明你不是短暂路过，而是在这届学院赛里持续出现、持续被记录。`
    quoteTitle = '稳定本身，也是一种故事'
    quoteBody = '不是每个选手都会用一个爆炸瞬间被记住，有些人是靠一次次出场慢慢留下痕迹。'
  } else if (Number(minutes) >= 180) {
    tag = '长时间参赛者'
    title = '你的赛季标签，是把时间真正留在比赛里'
    body = `${formatNum(minutes, 1)} 分钟不是冷冰冰的时长。它意味着你真的把一部分时间交给了这届比赛，也把自己留在了这份记录里。`
    quoteTitle = '时间会被结算，但也会被保存'
    quoteBody = '每一分钟都曾经发生在一张地图、一次团战、一次等待和一次结果之间。'
  } else if (bestBar?.label?.includes('持续火力')) {
    tag = '持续火力点'
    title = '你的赛季标签，是持续制造压力'
    body = `如果只从这份数据里挑一个最亮的侧面，那会是${bestBar.label}。你留下的不是一次孤立高光，而是很多团战里持续存在的火力。`
    quoteTitle = '有些压力，不会只出现在击杀播报里'
    quoteBody = '它会体现在对手的退让、资源的消耗，以及每一次不得不处理你的瞬间。'
  } else if (bestBar?.label?.includes('击杀')) {
    tag = '机会终结者'
    title = '你的赛季标签，是把机会变成结果'
    body = `${bestBar.label}是你这份数据里最清晰的部分。它说明你不只是参与团战，也在一些回合里把机会真正转成了结果。`
    quoteTitle = '击杀不是全部，但它会让瞬间被看见'
    quoteBody = '当机会出现时，有人需要把它接住。这是这份数据替你留下的痕迹。'
  } else if (bestBar?.label?.includes('治疗')) {
    tag = '团队支撑点'
    title = '你的赛季标签，是让队友还有下一次机会'
    body = `${bestBar.label}成为你这份记录里最突出的侧面。辅助不总在镜头中央，但很多团战能继续，是因为有人把队伍留在场上。`
    quoteTitle = '支撑不是背景'
    quoteBody = '它是下一次进攻、下一次反打、下一次续住团战的前提。'
  } else if (bestBar?.label?.includes('生存')) {
    tag = '场上留存者'
    title = '你的赛季标签，是把自己留在场上'
    body = `${bestBar.label}是你这份数据里最值得记住的一项。活下来不只是少犯错，它也意味着你能把下一次技能、下一次支援或下一次输出留给队伍。`
    quoteTitle = '活下来，也是一种影响比赛的方式'
    quoteBody = '很多回合不是靠一个瞬间改变，而是靠有人一直没有离开场上。'
  } else if (r === 'TANK') {
    tag = '前排空间制造者'
    title = '你的赛季标签，是站在团战最前面'
    body = `${playerName} 的很多价值不会直接变成击杀播报。前排的意义，是承压、开路、占位，以及让队伍能够继续往前。`
    quoteTitle = '前排不是数据表里最容易解释的位置'
    quoteBody = '但每一次推进、每一次站位、每一次吸收压力，都会改变队伍能不能继续打。'
  } else if (r === 'SUP' || r === 'SUPPORT') {
    tag = '队伍支撑者'
    title = '你的赛季标签，是把队伍连接起来'
    body = `${playerName} 的赛季不只在治疗数字里。辅助的位置，常常是在混乱里判断谁还能被留下、哪一次技能能改变下一波。`
    quoteTitle = '辅助不是站在故事外面的人'
    quoteBody = '他们只是经常把别人送到镜头中央。'
  } else if (heroName) {
    tag = `${heroName} 使用者`
    title = `你的赛季标签，和 ${heroName} 绑在了一起`
    body = `${heroName} 是你这个赛季最常使用的英雄。很多人回想你的赛季时，也许最先想起的就是这个英雄留在场上的样子。`
    quoteTitle = '有些英雄，会成为一个赛季的影子'
    quoteBody = '它不一定代表你的全部，但它确实替你留在了这届比赛的记忆里。'
  }

  if (keyMemory?.title && !rankText.includes('冠军')) {
    quoteBody = `${quoteBody}${quoteBody.endsWith('。') ? '' : '。'}另外，${keyMemory.title.replace(/[，。]$/g, '')}，也会成为这份回顾里更具体的一页。`
  }

  return {
    tag,
    title,
    body,
    quoteTitle,
    quoteBody,
    chips: [
      tag,
      heroName ? `代表英雄：${heroName}` : '',
      mapName ? `常驻地图：${mapName}` : '',
      rankText || ''
    ].filter(Boolean),
    statLines: [
      { label: '赛季标签', value: tag, sub: 'SEASON TAG' },
      { label: '代表英雄', value: heroName || '-', sub: 'SIGNATURE' },
      { label: '常驻地图', value: mapName || '-', sub: 'MAP MEMORY' }
    ]
  }
}

function getPeakText(log, role) {
  const totals = log?.totals || {}
  const r = String(role || '').toUpperCase()
  const mapName = mapCn(log?.mapName)
  const heroName = heroCn(log?.hero)

  if (r === 'SUP' || r === 'SUPPORT') {
    return {
      value: formatNum(totals.healing, 0),
      label: '单图治疗',
      title: '有一张地图，记住了你的支撑',
      body: `在 ${mapName}，你使用 ${heroName} 留下了这个赛季最突出的支援记录。镜头可能不会总是追着辅助，但每一次被续住的团战，都不是凭空发生的。`
    }
  }

  if (r === 'TANK') {
    return {
      value: formatNum(totals.blocked, 0),
      label: '单图阻挡',
      title: '有一张地图，记住了你站在最前面',
      body: `在 ${mapName}，你使用 ${heroName} 承担了最正面的压力。很多东西没有变成击杀播报，但它们变成了队伍能继续推进的空间。`
    }
  }

  return {
    value: formatNum(totals.damage, 0),
    label: '单图伤害',
    title: '有一张地图，记住了你的火力',
    body: `在 ${mapName}，你使用 ${heroName} 把输出打进了数据里。团战会结束，但这一页会替你记住那个瞬间。`
  }
}

function getPlayerKeyMemory(db, hydratedLogs, teamCandidates, peakLog) {
  const rows = safeArr(hydratedLogs).filter(row => row.match)
  if (!rows.length) return null

  const withOpponentRank = rows.map(row => {
    const opponent = getOpponentByCandidates(row.match, teamCandidates)
    const opponentRank = getTeamFinalRankText(db, opponent)
    const result = getMatchResultText(row.match, teamCandidates)
    const diff = getScoreDiff(row.match)

    return { ...row, opponent, opponentRank, result, diff }
  })

  const vsChampion = withOpponentRank.find(row => String(row.opponentRank || '').includes('冠军'))
  if (vsChampion) {
    return {
      log: vsChampion.log,
      match: vsChampion.match,
      title: '有一场比赛，你遇见了最后的冠军',
      body: `那是 ${getMatchDisplayName(vsChampion.match)}。对手 ${getTeamDisplay(vsChampion.opponent)} 最终拿到了冠军。也许当时没人知道故事会这样结束，但现在回看，这场比赛已经有了新的重量。`,
      chips: [stageCn(vsChampion.match.stage), getRoundDisplay(vsChampion.match.round), getTeamDisplay(vsChampion.opponent)].filter(Boolean),
      matchCard: buildMatchCard(db, vsChampion.match, teamCandidates, {
        title: '对阵最终冠军',
        note: '这场比赛后来成为你赛季记忆里更特殊的一页。'
      })
    }
  }

  const closeLoss = withOpponentRank.find(row => row.result === '失利' && Number.isFinite(row.diff) && row.diff <= 1)
  if (closeLoss) {
    return {
      log: closeLoss.log,
      match: closeLoss.match,
      title: '有一场比赛，只差最后一步',
      body: `那是 ${getMatchDisplayName(closeLoss.match)}。比分很接近，结果却没有站在你们这边。这样的比赛最容易被时间冲淡，但也最容易在回想时重新浮上来。`,
      chips: [stageCn(closeLoss.match.stage), getRoundDisplay(closeLoss.match.round), getScoreText(closeLoss.match)].filter(Boolean),
      matchCard: buildMatchCard(db, closeLoss.match, teamCandidates, {
        title: '最接近的一场失利',
        note: '有些遗憾不会写进排名，但会留在记忆里。'
      })
    }
  }

  const peakRow = peakLog ? rows.find(row => row.log === peakLog || row.log?.matchId === peakLog.matchId) : null
  if (peakRow) {
    return {
      log: peakRow.log,
      match: peakRow.match,
      title: '有一场比赛，留下了你的个人高光',
      body: '这场比赛不一定是整个赛季最大的舞台，但它留下了你最突出的单图记录。数据在这里不只是数字，而是一个曾经发生过的瞬间。',
      chips: [mapCn(peakRow.log.mapName), heroCn(peakRow.log.hero), getMatchDisplayName(peakRow.match)].filter(Boolean),
      matchCard: buildMatchCard(db, peakRow.match, teamCandidates, {
        title: '个人高光所在比赛',
        note: '你的单图高光从这里被保存下来。'
      })
    }
  }

  const last = rows[rows.length - 1]
  return {
    log: last.log,
    match: last.match,
    title: '最后一次被记录的出场，也是一段结束',
    body: `那是 ${getMatchDisplayName(last.match)}。很多赛季不是突然结束的，而是在最后一张地图、最后一次结算、最后一次退出房间后，慢慢变成回忆。`,
    chips: [stageCn(last.match.stage), getRoundDisplay(last.match.round), getScheduledText(last.match)].filter(Boolean),
    matchCard: buildMatchCard(db, last.match, teamCandidates, {
      title: '最后一次出场记录',
      note: '这是你在这份数据里留下的最后一个比赛节点。'
    })
  }
}

function pickFinalRankTone(rankText) {
  const text = String(rankText || '')
  if (text.includes('冠军')) return 'gold'
  if (text.includes('亚军')) return 'silver'
  if (text.includes('季军')) return 'bronze'
  return 'gold'
}

function getOrganizerMessageScene() {
  return {
    kind: 'organizer',
    tone: 'gold',
    eyebrow: 'FINAL ARCHIVE',
    title: '写在归档之前',
    body: '比赛总会结束，赛程表也总会被归档。\n\n但我希望，当你翻到这里的时候，\n你能想起某一张地图、某一次团战、\n某一个队友、某一场遗憾，\n或者某一个你觉得“还好我来过”的瞬间。\n\n谢谢你参加 2026 薯条杯学院赛。\n正是因为你们的存在，薯条杯才成为薯条杯。\n不止比赛，更是热爱。\n\nmichaelsky5\n2026年5月18日',
    chips: ['薯条杯学院赛', '2026', '谢谢你来过'],
    storyQuote: {
      title: '这不是最完美的一届比赛',
      body: '但它是我们一起完成的一届比赛。'
    },
    isOrganizerMessage: true,
    excludeFromPoster: true
  }
}

function inferVisualType(scene, profile = {}) {
  const kind = String(scene?.kind || '')
  const eyebrow = String(scene?.eyebrow || '').toUpperCase()

  if (kind === 'organizer') return 'organizer'
  if (kind === 'cover') return 'cover'
  if (kind === 'ending') return 'final'
  if (kind === 'spotlight') return 'spotlight'
  if (eyebrow.includes('ONE MAP') || eyebrow.includes('PEAK')) return 'peakHighlight'
  if (eyebrow.includes('OPPONENT')) return 'keyMatch'
  if (eyebrow.includes('ADJUSTMENT')) return 'roleMemory'
  if (kind === 'metric') return 'dataImpact'
  if (eyebrow.includes('PLAYOFFS')) return 'playoffs'
  if (eyebrow.includes('FIRST')) return 'firstStep'
  if (eyebrow.includes('ROLE')) return 'roleMemory'
  if (eyebrow.includes('MAP MEMORY')) return 'mapMemory'
  if (eyebrow.includes('LAST MATCH') || eyebrow.includes('LAST RECORD')) return 'keyMatch'
  if (eyebrow.includes('KEY') || eyebrow.includes('REGRET')) return 'keyMatch'
  if (eyebrow.includes('TAG')) return 'seasonTag'
  if (eyebrow.includes('NOT ALONE')) return 'roster'
  if (eyebrow.includes('PARTNER')) return 'partners'
  if (profile.storyType === 'staff') return 'staff'

  return 'archive'
}

function inferBadge(scene, profile = {}) {
  const eyebrow = String(scene?.eyebrow || '').toUpperCase()

  if (scene?.kind === 'organizer') return 'FROM ORGANIZER'
  if (eyebrow.includes('PLAYOFFS')) return 'PLAYOFFS'
  if (eyebrow.includes('FIRST')) return 'FIRST STEP'
  if (eyebrow.includes('KEY')) return 'KEY MATCH'
  if (eyebrow.includes('REGRET')) return 'MEMORY MATCH'
  if (eyebrow.includes('TAG')) return 'SEASON TAG'
  if (eyebrow.includes('PARTNER')) return 'PARTNERS'
  if (scene?.kind === 'cover') return profile.cardBadge || 'OFFICIAL CARD'
  if (scene?.kind === 'ending') return 'FINAL ARCHIVE'
  if (scene?.kind === 'metric') return scene.metricLabel || 'SEASON DATA'
  if (scene?.kind === 'spotlight') return 'SIGNATURE'
  if (profile.storyType === 'staff') return profile.staffBadge || 'STAFF ARCHIVE'

  return 'SEASON STORY'
}

function inferWatermark(scene, profile = {}) {
  if (scene?.watermark) return scene.watermark
  if (scene?.metric) return String(scene.metric)

  const title = String(scene?.title || '')
  const eyebrow = String(scene?.eyebrow || '').toUpperCase()

  if (scene?.kind === 'organizer') return 'THANK YOU'
  if (title.includes('冠军')) return 'CHAMPION'
  if (title.includes('亚军')) return 'FINALIST'
  if (title.includes('季军')) return 'PODIUM'
  if (title.includes('殿军') || title.includes('第4名')) return 'TOP 4'
  if (title.includes('季后淘汰赛')) return 'PLAYOFFS'
  if (eyebrow.includes('PARTNER')) return 'DUO'
  if (eyebrow.includes('KEY') || eyebrow.includes('REGRET')) return 'MATCH'
  if (eyebrow.includes('TAG')) return 'TAG'

  if (scene?.kind === 'cover') return profile.coverWatermark || '2026'
  if (scene?.kind === 'ending') return profile.endWatermark || 'ARCHIVE'

  return ''
}

function inferBackgroundWords(scene, profile = {}) {
  if (scene?.backgroundWords?.length) return scene.backgroundWords

  const visualType = inferVisualType(scene, profile)

  if (visualType === 'organizer') return ['THANKS', 'ARCHIVE', 'TOGETHER', 'MEMORY']
  if (visualType === 'cover') return ['FRIES CUP', '2026', 'SEASON', 'REVIEW']
  if (visualType === 'dataImpact') return ['DATA', 'MATCH', 'MAPS', 'RECORDED']
  if (visualType === 'spotlight') return ['HERO', 'SIGNATURE', 'TIME', 'MEMORY']
  if (visualType === 'peakHighlight') return ['PEAK', 'MAP', 'MOMENT', 'RECORDED']
  if (visualType === 'roleMemory') return ['ROLE', 'POSITION', 'TEAM', 'VALUE']
  if (visualType === 'playoffs') return ['TOP 8', 'PLAYOFFS', 'LOCKED IN', 'ELIMINATION']
  if (visualType === 'firstStep') return ['FIRST', 'START', 'READY', 'ENTER']
  if (visualType === 'mapMemory') return ['MAP', 'ROUND', 'POINT', 'PAYLOAD']
  if (visualType === 'keyMatch') return ['VERSUS', 'PRESSURE', 'RESULT', 'SERIES']
  if (visualType === 'seasonTag') return ['TAG', 'PLAYER', 'SEASON', 'IDENTITY']
  if (visualType === 'roster') return ['ROSTER', 'TEAM', 'PLAYERS', 'TOGETHER']
  if (visualType === 'partners') return ['PARTNER', 'DUO', 'CREW', 'SYNC']
  if (visualType === 'final') return ['FINAL', 'RESULT', 'ARCHIVE', 'REMEMBERED']
  if (profile.storyType === 'staff') return ['STAFF', 'MATCH', 'STAGE', 'BEHIND']

  return ['ARCHIVE', 'STORY', 'SEASON', 'MEMORY']
}

function withVisualMeta(scenes, profile = {}) {
  return safeArr(scenes).map((scene, index) => ({
    ...scene,
    visualType: scene.visualType || inferVisualType(scene, profile),
    badge: scene.badge || inferBadge(scene, profile),
    watermark: scene.watermark || inferWatermark(scene, profile),
    backgroundWords: scene.backgroundWords || inferBackgroundWords(scene, profile),
    sceneNo: index + 1
  }))
}

export function buildPlayerStory(db, playerId) {
  const player = getPlayerById(db, playerId)
  const total = getPlayerTotalById(db, playerId)
  const source = total || player

  if (!source) return []

  const logs = getValidLogs(player)
  const hydratedLogs = getHydratedLogs(db, logs)
  const heroPool = getHeroPool(logs)
  const topHero = heroPool[0] || null
  const mapPool = getMapPool(logs)
  const topMap = mapPool[0] || null
  const mapCards = getMapCards(mapPool)
  const mapTypeBars = getMapTypeDistribution(logs)
  const peakLog = getPeakLog(logs, source.role || player?.role)
  const peak = peakLog ? getPeakText(peakLog, source.role || player?.role) : null

  const matchCount = uniqueCount(logs.map(log => log.matchId)) || toNumber(source.matches_played || source.match_count, 0)
  const mapCount = logs.length || toNumber(source.maps_played || source.map_count, 0)
  const minutes = logs.reduce((sum, log) => sum + Number(log.playtimeMinutes || 0), 0) || toNumber(source.raw_time_mins || source.playtimeMinutes, 0)

  const team = getTeamById(db, source.team_id || player?.team_id || source.team_short_name || player?.team_short_name)
  const teamReview = getTeamReviewById(db, source.team_id || player?.team_id || source.team_short_name || player?.team_short_name)
  const role = source.role || player?.role || 'FLEX'
  const roleCn = getRoleCn(role)
  const tone = getRoleTone(role)
  const teamShort = getTeamShortName(team, teamReview, source) || player?.team_short_name
  const teamFullName = getTeamFullName(team, teamReview) || teamShort
  const teamCandidates = getTeamCandidateValues(source.team_id || player?.team_id || teamShort, team, teamReview)
  const finalRankText = source.team_final_rank_text || teamReview?.final_rank_text || team?.final_rank_text || ''
  const playerName = getPlayerDisplayName(source)
  const playerTag = getPlayerBattleTag(player, source)
  const shouldShowPlayerTag = playerTag && normalizeText(playerTag) !== normalizeText(playerName)

  const firstRow = hydratedLogs.find(row => row.match) || hydratedLogs[0]
  const firstLog = firstRow?.log || logs[0]
  const firstMatch = firstRow?.match || (firstLog ? getMatchById(db, firstLog.matchId) : null)
  const firstTime = firstMatch ? getScheduledText(firstMatch) : ''

  const routeDateRows = getPlayerRouteDateRows(hydratedLogs)
  const routeStartDate = routeDateRows[0]?.display || parseRouteDateText(firstTime)?.display || ''
  const routeEndDate = routeDateRows[routeDateRows.length - 1]?.display || routeStartDate
  const routeFrom = '2026 薯条杯学院赛'
  const routeTo = finalRankText || '赛季归档'
  const firstMatchLabel = firstMatch ? getMatchDisplayName(firstMatch) : ''
  const lastRouteMatch = routeDateRows[routeDateRows.length - 1]?.match || null
  const lastMatchLabel = lastRouteMatch ? getMatchDisplayName(lastRouteMatch) : ''

  const firstMatchCard = firstMatch ? buildMatchCard(db, firstMatch, teamCandidates, {
    title: '第一次出场记录',
    note: '这是你在薯条杯学院赛里被记录下来的第一场比赛。'
  }) : null
  const firstOpponentMemory = firstMatchCard?.opponentMemory || ''
  const firstOpponentName = firstMatchCard?.opponent || ''
  const lastOpponent = lastRouteMatch ? getOpponentByCandidates(lastRouteMatch, teamCandidates) : null
  const lastOpponentName = lastOpponent ? getTeamDisplay(lastOpponent) : ''
  const firstOpponentRankLine = firstOpponentMemory
  const playerMatchRows = []
  const playerMatchSeen = new Set()

  hydratedLogs.forEach(row => {
    const match = row?.match
    const key = match?.match_id || match?.id || getMatchDisplayName(match)
    if (!match || !key || playerMatchSeen.has(key)) return
    playerMatchSeen.add(key)
    playerMatchRows.push(match)
  })

  const playerWins = playerMatchRows.filter(match => getMatchResultText(match, teamCandidates) === '胜利').length
  const playerLosses = playerMatchRows.filter(match => getMatchResultText(match, teamCandidates) === '失利').length
  const seasonRecordText = playerMatchRows.length ? `${playerWins}W-${playerLosses}L` : ''

  const mainMetric = getRoleMainMetric(role)
  const mainMetricValue = pickNumber(source, [mainMetric.key], 0)
  const elimPer10 = pickNumber(source, ['avg_elim', 'avg_elims'], 0)
  const deathPer10 = pickNumber(source, ['avg_dth', 'avg_death', 'avg_deaths'], 0)

  const roleBars = getRoleDataBars(db, source, role)
  const roleInsight = getRoleInsight(playerName, role, roleBars)

  const deepRoleCopy = roleDeepNarrative(role, {
    playerName,
    topHero: topHero ? heroCn(topHero.hero) : '',
    mapCount,
    minutes,
    deathsPer10: deathPer10,
    mainMetricValue
  })

  const peakMatch = peakLog ? getMatchById(db, peakLog.matchId) : null
  const peakMatchCard = peakMatch ? buildMatchCard(db, peakMatch, teamCandidates, {
    title: '单图高光所在比赛',
    note: peak?.label ? `这张图留下了你的${peak.label}。` : '这张图留下了你的个人高光。'
  }) : null
  const keyMemory = getPlayerKeyMemory(db, hydratedLogs, teamCandidates, peakLog)
  const seasonIdentity = getSeasonIdentitySummary({
    playerName,
    role,
    finalRankText,
    mapCount,
    matchCount,
    minutes,
    topHero,
    topMap,
    roleBars,
    keyMemory
  })


  return withVisualMeta([
    {
      kind: 'cover',
      tone: pickFinalRankTone(finalRankText),
      eyebrow: '2026 FRIES CUP',
      title: `${playerName}，这是你的学院赛`,
      subTitle: shouldShowPlayerTag ? playerTag : '',
      body: '比赛已经结束，但你的名字还留在这里。接下来这几页，不只是数据，而是你在薯条杯走过的路。',
      teamFullName,
      routeStartDate,
      routeEndDate,
      routeFrom,
      routeTo,
      firstOpponentName,
      first_opponent_name: firstOpponentName,
      lastOpponentName,
      last_opponent_name: lastOpponentName,
      firstOpponentRankLine,
      first_opponent_rank_line: firstOpponentRankLine,
      seasonRecordText,
      season_record_text: seasonRecordText,
      firstMatchLabel,
      lastMatchLabel,
      chips: [teamShort || '未知队伍', roleCn, finalRankText].filter(Boolean),
      image: teamShort ? getSafeTeamLogo(teamShort, db) : DEFAULT_TEAM_LOGO,
      storyQuote: {
        title: '你的赛季从这里被重新打开',
        body: '这不是一份冷冰冰的数据表，而是一段被比赛记录下来的个人轨迹。'
      }
    },
    {
      kind: 'narrative',
      tone,
      eyebrow: 'FIRST RECORDED MOMENT',
      title: firstTime ? `记录从 ${firstTime} 开始` : '你的名字，进入了赛季档案',
      body: firstLog
        ? `第一次被记录下来的出场，是 ${getMatchDisplayName(firstMatch) || firstLog.matchDisplayName || firstLog.matchId}。${firstOpponentMemory ? `${firstOpponentMemory}，让这场比赛在回看时多了一层意义。` : '当时没人知道这个赛季会怎样结束，但这一刻已经足够说明：你来了。'}`
        : '有些故事不一定从第一张地图开始。但只要名字被留下，就说明你曾经是这届薯条杯的一部分。',
      matchCard: firstMatchCard,
      chips: firstLog ? [mapCn(firstLog.mapName), heroCn(firstLog.hero), firstMatchCard?.opponentMemory].filter(Boolean) : []
    },
    {
      kind: 'metric',
      tone,
      eyebrow: 'YOU WERE THERE',
      title: `这个赛季，你出现在 ${mapCount} 张地图里`,
      metric: String(mapCount),
      metricLabel: 'MAPS RECORDED',
      body: mapCards.length
        ? `这些地图组成了你的赛季轨迹。你最常出现的地图是 ${mapCards[0].title}，它和另外 ${Math.max(0, mapCards.length - 1)} 张地图一起，把你的比赛足迹留了下来。`
        : '这些地图组成了你的赛季轨迹。它们里面有胜利、失误、等待、压力，也有别人未必看见的坚持。',
      statLines: [
        { label: '比赛场次', value: matchCount },
        { label: '出场时间', value: formatNum(minutes, 1), sub: '分钟' },
        { label: '队伍', value: teamShort || '-' }
      ],
      mapCards,
      dataBars: mapTypeBars,
      storyQuote: {
        title: '地图不是背景，而是记忆发生的地方',
        body: topMap ? `${mapCn(topMap.mapName)} 是你这个赛季最常被记录的地图。` : '每一张地图都保存着不同的交火、等待和结算。'
      }
    },
    {
      kind: 'spotlight',
      tone,
      eyebrow: 'SIGNATURE HERO',
      title: topHero ? `最像这个赛季的你：${heroCn(topHero.hero)}` : '这个赛季，你没有被单一英雄定义',
      body: topHero
        ? `你使用 ${heroCn(topHero.hero)} 的时间最多。它像是这个赛季替你留在镜头里的影子。`
        : '没有一个英雄能完整概括你。你留下的是一个更分散，也更真实的赛季痕迹。',
      image: topHero ? getHeroImage(topHero.hero, topHero.role || role) : '',
      images: getHeroGalleryItems(heroPool, role),
      chips: topHero ? [`${formatNum(topHero.minutes, 1)} 分钟`, `${topHero.count} 张地图`] : []
    },
    {
      kind: 'narrative',
      tone,
      eyebrow: 'ROLE MEMORY',
      title: roleInsight.title || deepRoleCopy.title,
      body: roleInsight.body || deepRoleCopy.body,
      dataBars: roleBars,
      storyQuote: roleInsight,
      statLines: [
        { label: mainMetric.label, value: formatNum(mainMetricValue, 2), sub: mainMetric.en },
        { label: '击杀 /10', value: formatNum(elimPer10, 2), sub: 'ELIM / 10' },
        { label: '死亡 /10', value: formatNum(deathPer10, 2), sub: 'DEATH / 10' }
      ]
    },
    {
      kind: 'metric',
      visualType: 'peakHighlight',
      tone,
      eyebrow: 'ONE MAP REMEMBERS',
      title: peak?.title || '有些高光，不一定完整写进数据里',
      metric: peak?.value || '—',
      metricLabel: peak?.label || 'PEAK MOMENT',
      peak,
      body: peak?.body || '也许某些瞬间没有被完整记录，但它们曾经发生在比赛里，也发生在你的赛季里。',
      matchCard: peakMatchCard,
      storyQuote: {
        title: '这不是赛季平均值，而是一个具体瞬间',
        body: peakLog ? `${mapCn(peakLog.mapName)}、${heroCn(peakLog.hero)}、${getMatchDisplayName(peakMatch)}，一起组成了你的单图高光。` : '高光不一定每次都被看见，但数据会把它留下来。'
      },
      chips: peakLog ? [
        mapCn(peakLog.mapName),
        heroCn(peakLog.hero),
        getMatchDisplayName(peakMatch) || peakLog.matchDisplayName
      ].filter(Boolean) : []
    },
    {
      kind: 'narrative',
      tone,
      eyebrow: 'SEASON TAG',
      title: seasonIdentity.title,
      body: seasonIdentity.body,
      storyQuote: {
        title: seasonIdentity.quoteTitle,
        body: seasonIdentity.quoteBody
      },
      statLines: seasonIdentity.statLines,
      chips: seasonIdentity.chips
    },
    {
      kind: 'narrative',
      tone,
      eyebrow: 'MAP MEMORY',
      title: topMap ? `你最常出现的地图是\n${mapCn(topMap.mapName)}` : '每一张地图，都是赛季的一小块切片',
      body: topMap
        ? `${mapCn(topMap.mapName)} 出现了 ${topMap.count} 次。${topMap.topHero ? `在这张地图上，你最常使用的是 ${heroCn(topMap.topHero.hero)}。` : '也许你已经记不清每一次交火，但这张地图确实反复出现在你的学院赛里。'}`
        : '地图不只是背景。它们是每一场推进、团战、等待和结算真正发生的地方。',
      mapImage: getMapVisualImage(topMap),
      mapCards,
      chips: topMap ? [mapTypeCn(topMap.mapType), `${formatNum(topMap.minutes, 1)} 分钟`, topMap.topHero ? heroCn(topMap.topHero.hero) : ''].filter(Boolean) : []
    },
    ...(keyMemory ? [{
      kind: 'narrative',
      tone,
      eyebrow: keyMemory.title.includes('差') || keyMemory.title.includes('最后') ? 'REGRET / KEY MATCH' : 'KEY MATCH MEMORY',
      title: keyMemory.title,
      body: keyMemory.body,
      matchCard: keyMemory.matchCard,
      chips: keyMemory.chips
    }] : []),
    {
      kind: 'ending',
      tone: pickFinalRankTone(finalRankText),
      eyebrow: 'FRIES CUP ARCHIVE',
      title: `你和 ${teamShort || '队伍'}，走完了这个赛季`,
      metric: finalRankText || '',
      metricLabel: finalRankText ? 'FINAL RESULT' : '',
      watermark: getRankWatermark(finalRankText),
      body: finalRankText
        ? '成绩是句号，但不是全部。真正被留下来的，是你曾经站在这里，和队伍一起，把一个赛季打完。'
        : '也许这个赛季没有一个漂亮的句号，但它仍然是一次完整的抵达。',
      image: teamShort ? getSafeTeamLogo(teamShort, db) : DEFAULT_TEAM_LOGO,
      storyQuote: {
        title: '你来过，你战斗过，你被记录了',
        body: finalRankText ? `最终成绩是 ${finalRankText}。但真正留在这里的，是你参与过这个赛季。` : '这段赛季没有被删除，它被写进了薯条杯的数据中心。'
      },
      chips: ['你来过', '你战斗过', '你被记录了']
    },
    getOrganizerMessageScene()
  ], {
    storyType: 'player',
    cardBadge: 'PLAYER OFFICIAL CARD',
    coverWatermark: playerName,
    endWatermark: finalRankText || 'ARCHIVE'
  })
}

function getPerspectiveCopy(as) {
  if (as === 'manager') {
    return '这个赛季，你做的不只是报名、沟通和确认赛程。你把一支队伍带进了赛场，也陪他们走完了属于自己的旅程。'
  }

  if (as === 'coach') {
    return '这个赛季，你参与的是那些不一定会出现在数据里的部分：准备、调整、复盘、沟通，以及一次次重新开始。'
  }

  return '这个赛季，这支队伍把自己的名字写进了薯条杯学院赛。'
}

function getPerspectiveChip(as) {
  if (as === 'manager') return 'MANAGER'
  if (as === 'coach') return 'COACH'
  if (as === 'manager-coach') return 'MANAGER / COACH'
  return 'TEAM'
}

function getPerspectiveClassLabel(as) {
  if (as === 'manager') return '经理'
  if (as === 'coach') return '教练'
  if (as === 'manager-coach') return '经理 / 教练'
  return '队伍'
}

function getIdentityCandidateText(value) {
  if (value === undefined || value === null || value === '') return ''

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = getIdentityCandidateText(item)
      if (text) return text
    }

    return ''
  }

  if (typeof value === 'object') {
    return pickFirstValue(
      value.battle_tag,
      value.battleTag,
      value.battletag,
      value.raw,
      value.tag,
      value.account,
      value.account_id,
      value.accountId,
      value.game_id,
      value.gameId,
      value.display_name,
      value.displayName,
      value.nickname,
      value.nick,
      value.public_name,
      value.publicName,
      value.name,
      value.player_name,
      value.staff_name,
      value.manager_name,
      value.coach_name,
      value.value,
      value.label
    )
  }

  return String(value || '').trim()
}

function getIdentityDisplayText(value) {
  if (value === undefined || value === null || value === '') return ''

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = getIdentityDisplayText(item)
      if (text) return text
    }

    return ''
  }

  if (typeof value === 'object') {
    const display = pickFirstValue(
      value.display_name,
      value.displayName,
      value.nickname,
      value.nick,
      value.public_name,
      value.publicName,
      value.name,
      value.player_name,
      value.staff_name,
      value.manager_name,
      value.coach_name,
      value.label,
      value.value
    )

    if (display) return display

    return getPublicName(getIdentityCandidateText(value))
  }

  return getPublicName(value)
}

function pickIdentityField(sources, keys) {
  for (const source of safeArr(sources)) {
    if (!source || typeof source !== 'object') continue

    for (const key of keys) {
      const value = source[key]
      const text = getIdentityCandidateText(value)
      if (text) return text
    }
  }

  return ''
}

function pickIdentityDisplayField(sources, keys) {
  for (const source of safeArr(sources)) {
    if (!source || typeof source !== 'object') continue

    for (const key of keys) {
      const value = source[key]
      const text = getIdentityDisplayText(value)
      if (text) return text
    }
  }

  return ''
}

function collectNestedIdentitySources(sources) {
  const rows = []
  const seen = new Set()

  function push(source) {
    if (!source || typeof source !== 'object') return
    if (seen.has(source)) return
    seen.add(source)
    rows.push(source)
  }

  safeArr(sources).forEach(source => {
    push(source)
    push(source?.staff)
    push(source?.staff_info)
    push(source?.staffInfo)
    push(source?.team_staff)
    push(source?.teamStaff)
    push(source?.members)
    push(source?.roles)
  })

  return rows
}

function collectRoleIdentityRows(sources, role) {
  const roleKeys = role === 'coach'
    ? ['coaches', 'coach', 'coach_info', 'coachInfo', 'coach_staff', 'coachStaff']
    : ['managers', 'manager', 'manager_info', 'managerInfo', 'manager_staff', 'managerStaff']

  const rows = []

  collectNestedIdentitySources(sources).forEach(source => {
    roleKeys.forEach(key => {
      const value = source?.[key]
      if (value === undefined || value === null || value === '') return

      if (Array.isArray(value)) rows.push(...value)
      else rows.push(value)
    })
  })

  return rows.filter(Boolean)
}

function pickIdentityFieldFromRows(rows) {
  for (const row of safeArr(rows)) {
    const text = getIdentityCandidateText(row)
    if (text) return text
  }

  return ''
}

function pickIdentityDisplayFromRows(rows) {
  for (const row of safeArr(rows)) {
    const text = getIdentityDisplayText(row)
    if (text) return text
  }

  return ''
}

function cleanIdentityCallsign(value, fallback = '') {
  const text = String(value || '').trim()
  if (!text) return fallback
  return getPublicName(text, text) || fallback
}

function getTeamRoleIdentity(team, review, as, fallbackShort = '', fallbackName = '') {
  const sources = [
    review,
    review?.staff,
    review?.staff_info,
    review?.staffInfo,
    review?.team_staff,
    review?.teamStaff,
    team,
    team?.staff,
    team?.staff_info,
    team?.staffInfo,
    team?.team_staff,
    team?.teamStaff
  ].filter(Boolean)

  const managerRows = collectRoleIdentityRows(sources, 'manager')
  const coachRows = collectRoleIdentityRows(sources, 'coach')

  const managerKeys = [
    'manager_battle_tag',
    'managerBattleTag',
    'manager_battletag',
    'managerBattletag',
    'manager_tag',
    'managerTag',
    'manager_account',
    'managerAccount',
    'manager_id',
    'managerId',
    'manager_name',
    'managerName',
    'manager_display_name',
    'managerDisplayName',
    'manager_nickname',
    'managerNickname',
    'manager',
    'managers'
  ]

  const coachKeys = [
    'coach_battle_tag',
    'coachBattleTag',
    'coach_battletag',
    'coachBattletag',
    'coach_tag',
    'coachTag',
    'coach_account',
    'coachAccount',
    'coach_id',
    'coachId',
    'coach_name',
    'coachName',
    'coach_display_name',
    'coachDisplayName',
    'coach_nickname',
    'coachNickname',
    'coach',
    'coaches'
  ]

  const dualKeys = [
    'manager_coach_battle_tag',
    'managerCoachBattleTag',
    'manager_coach_battletag',
    'managerCoachBattletag',
    'manager_coach_tag',
    'managerCoachTag',
    'manager_coach_account',
    'managerCoachAccount',
    'manager_coach_name',
    'managerCoachName',
    'manager_coach_display_name',
    'managerCoachDisplayName',
    'manager_coach_nickname',
    'managerCoachNickname',
    'manager_coach',
    'managerCoach',
    'dual_role_battle_tag',
    'dualRoleBattleTag',
    'dual_role_tag',
    'dualRoleTag',
    'dual_role_name',
    'dualRoleName',
    'dual_role',
    'dualRole'
  ]

  const managerTag = cleanBattleTag(pickIdentityFieldFromRows(managerRows) || pickIdentityField(sources, managerKeys))
  const coachTag = cleanBattleTag(pickIdentityFieldFromRows(coachRows) || pickIdentityField(sources, coachKeys))
  const dualTag = cleanBattleTag(pickIdentityField(sources, dualKeys))

  const managerCallsign = cleanIdentityCallsign(pickIdentityDisplayFromRows(managerRows) || pickIdentityDisplayField(sources, [
    'manager_display_name',
    'managerDisplayName',
    'manager_nickname',
    'managerNickname',
    'manager_name',
    'managerName',
    'manager',
    'managers'
  ]))

  const coachCallsign = cleanIdentityCallsign(pickIdentityDisplayFromRows(coachRows) || pickIdentityDisplayField(sources, [
    'coach_display_name',
    'coachDisplayName',
    'coach_nickname',
    'coachNickname',
    'coach_name',
    'coachName',
    'coach',
    'coaches'
  ]))

  const dualCallsign = cleanIdentityCallsign(pickIdentityDisplayField(sources, [
    'manager_coach_display_name',
    'managerCoachDisplayName',
    'manager_coach_nickname',
    'managerCoachNickname',
    'manager_coach_name',
    'managerCoachName',
    'manager_coach',
    'managerCoach',
    'dual_role_name',
    'dualRoleName',
    'dual_role',
    'dualRole'
  ]))

  let explicitCallsign = cleanIdentityCallsign(pickIdentityDisplayField(sources, [
    as === 'coach' ? 'coach_nickname' : 'manager_nickname',
    as === 'coach' ? 'coachNickname' : 'managerNickname',
    as === 'coach' ? 'coach_display_name' : 'manager_display_name',
    as === 'coach' ? 'coachDisplayName' : 'managerDisplayName',
    'display_name',
    'displayName',
    'nickname',
    'public_name',
    'publicName'
  ]))

  if (as === 'manager') explicitCallsign = managerCallsign || explicitCallsign
  if (as === 'coach') explicitCallsign = coachCallsign || explicitCallsign
  if (as === 'manager-coach') {
    explicitCallsign = dualCallsign || managerCallsign || coachCallsign || explicitCallsign
    if (managerCallsign && coachCallsign && !samePersonName(managerCallsign, coachCallsign)) {
      explicitCallsign = `${managerCallsign} / ${coachCallsign}`
    }
  }

  let issuedTo = ''

  if (as === 'manager-coach') {
    if (dualTag) {
      issuedTo = dualTag
    } else if (managerTag && coachTag && !samePersonName(managerTag, coachTag)) {
      issuedTo = `${managerTag} / ${coachTag}`
    } else {
      issuedTo = managerTag || coachTag
    }
  } else if (as === 'manager') {
    issuedTo = managerTag
  } else if (as === 'coach') {
    issuedTo = coachTag
  }

  issuedTo = cleanBattleTag(issuedTo) || fallbackShort || fallbackName || ''
  const callsign = cleanIdentityCallsign(explicitCallsign, getPublicName(issuedTo, fallbackShort || fallbackName || issuedTo))
  const classLabel = getPerspectiveClassLabel(as)

  return {
    issuedTo,
    battleTag: issuedTo,
    callsign,
    classLabel,
    managerTag,
    coachTag,
    dualTag
  }
}
function isManagerPerspective(as) {
  return as === 'manager' || as === 'manager-coach'
}

function isCoachPerspective(as) {
  return as === 'coach' || as === 'manager-coach'
}

function isManagerCoachPerspective(as) {
  return as === 'manager-coach'
}

function getFirstStepBody(as, firstMatch, firstOpponentRankLine) {
  if (!firstMatch) {
    return '有些赛季不是从一场比赛开始的，而是从报名、确认和等待开始的。'
  }

  const base = `那一场发生在 ${getScheduledText(firstMatch) || '赛程记录中'}。`

  if (as === 'coach') {
    return `${base} 对教练来说，第一场不是简单的开始，而是第一次看到准备、判断和队伍执行真正接受比赛检验。${firstOpponentRankLine ? `后来回看，${firstOpponentRankLine}，这也让这场开局多了一层记忆。` : ''}`
  }

  if (as === 'manager') {
    return `${base} 对经理来说，第一场不只是开赛，而是此前所有报名、排期、沟通终于落到了现实里。${firstOpponentRankLine ? `后来回看，${firstOpponentRankLine}，这也让这场开局多了一层记忆。` : ''}`
  }

  return `${base} 从这里开始，这支队伍真正进入了赛场。${firstOpponentRankLine ? firstOpponentRankLine : ''}`
}

function getRosterBody(as) {
  if (as === 'coach') {
    return '教练看到的，往往不是名单，而是每个位置如何被安排，每个选手如何进入体系，以及每一场之后还能怎么调整。'
  }

  if (as === 'manager') {
    return '经理看到的，往往不只是单个选手的数据，而是这些人如何被组织起来，如何确认时间，如何一起走进赛场。'
  }

  return '一支队伍不是一个缩写。它由这些名字、位置、英雄和出场记录组成。'
}

function getStageTimeline(stageEntries) {
  return stageEntries.map(([stage, row]) => ({
    label: stageCn(stage),
    value: `${row.wins ?? row.match_wins ?? 0}W-${row.losses ?? row.match_losses ?? 0}L`,
    meta: row.maps ? `${row.maps} 地图` : ''
  }))
}

function getStageBars(stageEntries) {
  const rows = stageEntries.map(([stage, row]) => ({
    label: stageCn(stage),
    wins: toNumber(row.wins ?? row.match_wins, 0),
    losses: toNumber(row.losses ?? row.match_losses, 0)
  }))
  const max = Math.max(...rows.map(row => row.wins + row.losses), 1)

  return rows.map(row => ({
    label: row.label,
    value: row.wins + row.losses,
    displayValue: `${row.wins}W-${row.losses}L`,
    score: Math.round(((row.wins + row.losses) / max) * 100)
  }))
}

export function buildTeamStory(db, teamId, as = 'team') {
  const team = getTeamById(db, teamId)
  const review = getTeamReviewById(db, teamId)
  const players = getTeamPlayers(db, teamId)
  const matches = getTeamMatches(db, teamId)
  const record = review?.season_record || {}

  if (!team && !review) return []

  const name = getTeamFullName(team, review)
  const short = getTeamShortName(team, review)
  const finalRankText = review?.final_rank_text || team?.final_rank_text || ''
  const perspectiveIdentity = getTeamRoleIdentity(team, review, as, short, name)
  const stageRecord = review?.stage_record || {}
  const stageEntries = Object.entries(stageRecord)
  const teamCandidates = getTeamCandidateValues(teamId, team, review)

  const sortedMatches = sortMatches(matches)
  const firstMatch = sortedMatches[0]
  const lastMatch = sortedMatches[sortedMatches.length - 1]
  const routeStartDate = parseRouteDateText(getScheduledText(firstMatch))?.display || ''
  const routeEndDate = parseRouteDateText(getScheduledText(lastMatch))?.display || routeStartDate
  const routeFrom = '2026 薯条杯学院赛'
  const routeTo = finalRankText || '赛季归档'
  const firstMatchLabel = firstMatch ? getMatchDisplayName(firstMatch) : ''
  const lastMatchLabel = lastMatch ? getMatchDisplayName(lastMatch) : ''
  const firstOpponent = firstMatch ? getOpponentByCandidates(firstMatch, teamCandidates) : null
  const lastOpponent = lastMatch ? getOpponentByCandidates(lastMatch, teamCandidates) : null

  const firstMatchCard = firstMatch ? buildMatchCard(db, firstMatch, teamCandidates, {
    title: '队伍第一场比赛',
    note: '这是这支队伍真正进入赛场的第一刻。'
  }) : null

  const lastMatchCard = lastMatch ? buildMatchCard(db, lastMatch, teamCandidates, {
    title: '队伍最后一场比赛',
    note: '这是这支队伍在本届学院赛里被记录的最后一战。'
  }) : null

  const fallbackWins = matches.filter(match => isTeamWinner(match, teamId, team, review)).length
  const wins = toNumber(record.match_wins, fallbackWins)
  const played = toNumber(record.matches_played, matches.length)
  const losses = toNumber(record.match_losses, Math.max(0, played - wins))
  const mapsPlayed = toNumber(record.maps_played, 0)

  const keyMatches = review?.key_matches || {}
  const keyMatchId = keyMatches.championship_match || keyMatches.final_match || keyMatches.hardest_match || keyMatches.first_match
  const resolvedKeyMatch = keyMatchId ? getMatchById(db, keyMatchId) : null
  const keyMatch = resolvedKeyMatch || getTeamKeyMatch(sortedMatches, teamCandidates) || lastMatch || firstMatch
  const keyOpponent = keyMatch ? getOpponentByCandidates(keyMatch, teamCandidates) : null
  const keyMatchCard = keyMatch ? buildMatchCard(db, keyMatch, teamCandidates, {
    title: resolvedKeyMatch ? '队伍关键比赛' : '代表这段旅程的一场比赛',
    note: resolvedKeyMatch ? '这场比赛适合作为这支队伍赛季的切片。' : '系统没有找到指定关键战，因此选取了这支队伍赛季中最有代表性的一场。'
  }) : null

  const rankStory = getRankStory(finalRankText)
  const playoffStory = getPlayoffStory(finalRankText)
  const stageTimeline = getStageTimeline(stageEntries)
  const stageBars = getStageBars(stageEntries)
  const firstOpponentRankLine = firstMatchCard?.opponentMemory || ''
  const firstOpponentName = firstOpponent ? getTeamDisplay(firstOpponent) : ''
  const lastOpponentName = lastOpponent ? getTeamDisplay(lastOpponent) : ''
  const seasonRecordText = `${wins}W-${losses}L`
  const rosterCards = buildTeamRosterCards(db, players).sort((a, b) => {
    const roleDiff = getLineupRoleRank(a.role || a.meta) - getLineupRoleRank(b.role || b.meta)
    if (roleDiff !== 0) return roleDiff
    return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN')
  })
  const playoffTeamCards = getPlayoffTeamCards(db)
  const seasonOpponent = isManagerPerspective(as)
    ? getTeamSeasonOpponent(db, sortedMatches, teamCandidates, keyMatch, lastMatch)
    : null

  const seasonOpponentRank = getRankNumber(seasonOpponent?.rankText)

  const shouldShowSeasonOpponent = Boolean(
    isManagerPerspective(as) &&
    !isManagerCoachPerspective(as) &&
    seasonOpponent &&
    (
      Number(seasonOpponent.count) >= 2 ||
      String(seasonOpponent.rankText || '').includes('冠军') ||
      String(seasonOpponent.rankText || '').includes('亚军') ||
      String(seasonOpponent.rankText || '').includes('季军') ||
      String(seasonOpponent.rankText || '').includes('殿军') ||
      (seasonOpponentRank !== null && seasonOpponentRank <= 4)
    )
  )

  const coachMostUsedLineup = isCoachPerspective(as)
    ? getCoachMostUsedLineup(db, players)
    : null

  const teamLogs = safeArr(players).flatMap(player => getValidLogs(player))
  const teamMapPool = getMapPool(teamLogs)
  const teamMapCards = getMapCards(teamMapPool)
  const teamMapTypeBars = getMapTypeDistribution(teamLogs)
  const topTeamMap = teamMapPool[0] || null

  return withVisualMeta([
    {
      kind: 'cover',
      tone: pickFinalRankTone(finalRankText),
      eyebrow: 'TEAM SEASON REVIEW',
      title: `${short || name} 的赛季旅程`,
      body: getPerspectiveCopy(as),
      image: short ? getSafeTeamLogo(short, db) : DEFAULT_TEAM_LOGO,
      teamFullName: name,
      teamShortName: short,
      team_short_name: short,
      issuedTo: perspectiveIdentity.issuedTo,
      issued_to: perspectiveIdentity.issuedTo,
      battleTag: perspectiveIdentity.battleTag,
      callsign: perspectiveIdentity.callsign,
      identityClass: perspectiveIdentity.classLabel,
      identity_class: perspectiveIdentity.classLabel,
      managerTag: perspectiveIdentity.managerTag,
      coachTag: perspectiveIdentity.coachTag,
      routeStartDate,
      routeEndDate,
      routeFrom,
      routeTo,
      firstMatchLabel,
      first_match_label: firstMatchLabel,
      lastMatchLabel,
      last_match_label: lastMatchLabel,
      firstOpponentName,
      first_opponent_name: firstOpponentName,
      lastOpponentName,
      last_opponent_name: lastOpponentName,
      seasonRecordText,
      season_record_text: seasonRecordText,
      chips: [name, finalRankText, getPerspectiveChip(as)].filter(Boolean),
      storyQuote: {
        title: as === 'coach' ? '你参与的是队伍如何被调整' : '你见证的是队伍如何被带进赛场',
        body: getPerspectiveCopy(as)
      }
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'THE FIRST STEP',
      title: firstMatch ? `第一场，是对阵 ${getTeamDisplay(firstOpponent)}` : '这支队伍从报名表走向了赛场',
      body: getFirstStepBody(as, firstMatch, firstOpponentRankLine),
      matchCard: firstMatchCard,
      chips: firstMatch ? [stageCn(firstMatch.stage), getRoundDisplay(firstMatch.round), firstOpponentRankLine].filter(Boolean) : []
    },
    {
      kind: 'metric',
      tone: 'gold',
      eyebrow: 'THE ROAD',
      title: `你们一共打了 ${played} 场比赛`,
      metric: String(played),
      metricLabel: 'MATCHES PLAYED',
      body: '这不是一个人的路线。每一场比赛背后都有选手、经理、教练、赛管和对手。你们从其中穿过，留下了自己的版本。',
      statLines: [
        { label: '胜场', value: wins },
        { label: '负场', value: losses },
        { label: '地图', value: mapsPlayed || '-' }
      ],
      timeline: [
        firstMatch ? { label: '第一场', value: getTeamDisplay(firstOpponent), meta: getScheduledText(firstMatch) } : null,
        keyMatch ? { label: '关键战', value: getTeamDisplay(keyOpponent), meta: stageCn(keyMatch.stage) } : null,
        lastMatch ? { label: '最后一战', value: getTeamDisplay(lastOpponent), meta: getScheduledText(lastMatch) } : null,
        finalRankText ? { label: '最终成绩', value: finalRankText, meta: 'FINAL RESULT' } : null
      ].filter(Boolean)
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'STAGE BY STAGE',
      title: stageEntries.length ? '你们不是突然走到这里的' : '这段旅程被完整归档',
      body: stageEntries.length
        ? `你们经过了 ${stageEntries.map(([stage]) => stageCn(stage)).join('、')}。每个阶段都有不同的压力，也有不同的答案。`
        : '这支队伍的赛季数据已经被保存下来。后续可以继续加入更详细的阶段叙事。',
      timeline: stageTimeline,
      dataBars: stageBars,
      chips: stageEntries.map(([stage, row]) => `${stageCn(stage)}：${row.wins ?? row.match_wins ?? 0}W-${row.losses ?? row.match_losses ?? 0}L`)
    },
        ...(isManagerCoachPerspective(as) ? [{
      kind: 'narrative',
      tone: 'gold',
      visualType: coachMostUsedLineup ? 'lineup' : 'roleMemory',
      eyebrow: 'MANAGER / COACH',
      title: coachMostUsedLineup
        ? '一边组织，一边决定阵容'
        : '你把队伍带进赛场，也陪它准备下一场',
      rosterTitle: coachMostUsedLineup ? 'MOST USED LINEUP' : '',
      rosterCards: coachMostUsedLineup?.players || [],
      body: coachMostUsedLineup
        ? `这个赛季，你不只负责报名、排期和沟通，也参与复盘、准备和阵容选择。${short || name || '这支队伍'} 要站上赛场，也要找到最稳定的五人组合。最终，这套阵容被拿出 ${coachMostUsedLineup.count} 次，成为队伍最熟悉的比赛形状。`
        : `这个赛季，你不只负责让 ${short || name || '这支队伍'} 站上赛场，也陪他们完成每一场比赛前后的准备。组织、沟通、复盘和调整，都压在同一个身份里。`,
      storyQuote: {
        title: '你做的是两份工作',
        body: seasonOpponent
          ? `你要处理赛程，也要处理阵容；你要面对队伍内部，也要面对 ${seasonOpponent.name} 这样的赛季对手。`
          : '你要处理赛程，也要处理阵容；你要把队伍组织起来，也要陪他们找到下一场比赛的答案。'
      },
      chips: [
        '双重身份',
        coachMostUsedLineup ? `同阵 ${coachMostUsedLineup.count} 次` : null,
        seasonOpponent?.name ? `对手：${seasonOpponent.name}` : null,
        '组织',
        '准备',
        '调整'
      ].filter(Boolean)
    }] : []),
    ...(as === 'coach' ? [{
  kind: 'narrative',
  tone: 'gold',
  visualType: 'lineup',
  eyebrow: 'ADJUSTMENT',
  title: coachMostUsedLineup
    ? '最常被你们拿出的五人'
    : '真正难的，是下一场怎么打',
  rosterTitle: coachMostUsedLineup ? 'MOST USED LINEUP' : '',
  rosterCards: coachMostUsedLineup?.players || [],
  body: coachMostUsedLineup
    ? `这个赛季，教练面对的不是比分本身，而是下一场要怎么准备、谁该被放到哪里、哪五个人最适合一起上场。最终，这套五人组合被你们拿出了 ${coachMostUsedLineup.count} 次，成为这支队伍最熟悉的比赛形状。`
    : `每一场结束后，教练面对的不是比分本身，而是下一场要怎么准备、谁该被放到哪里、哪张地图还要不要继续选择。这个赛季，${short || name || '这支队伍'} 打了 ${played} 场比赛。胜负会被记录下来，但调整往往发生在那些没有被写进比分的地方。`,
  storyQuote: {
    title: coachMostUsedLineup
      ? '阵容不是名单，而是答案'
      : '复盘不是为了证明过去',
    body: coachMostUsedLineup
      ? `这套阵容出现了 ${coachMostUsedLineup.count} 次。它记录的是教练最常交出的那份选择。`
      : '它是为了让下一场比赛，有新的答案。'
  },
  chips: [
    coachMostUsedLineup ? `${coachMostUsedLineup.count} 次使用` : null,
    coachMostUsedLineup?.stageLabel,
    '阵容选择',
    '复盘',
    '调整'
  ].filter(Boolean)
}] : []),
    ...(playoffStory ? [{
      kind: 'narrative',
      tone: pickFinalRankTone(finalRankText),
      eyebrow: 'PLAYOFFS',
      title: playoffStory.title,
      body: playoffStory.body,
      teamCards: playoffTeamCards,
      storyQuote: {
        title: '从这里开始，每一场都更接近终局',
        body: finalRankText
          ? `${short || name || '这支队伍'} 最终留下的成绩是 ${finalRankText}。这不是单独一场比赛决定的，而是整个赛季一步步走出来的结果。`
          : '季后淘汰赛不是另一个背景，而是这支队伍赛季里最靠近终局的章节。'
      },
      chips: [
        '前八队伍',
        '季后淘汰赛归档',
        finalRankText || null
      ].filter(Boolean)
    }] : []),
    {
      kind: 'metric',
      tone: 'gold',
      eyebrow: 'MAPS REMEMBER',
      title: `你们留下了 ${mapsPlayed} 张地图记录`,
      metric: String(mapsPlayed),
      metricLabel: 'MAPS',
      body: topTeamMap
        ? `地图是比赛最真实的单位。你们最常被记录的地图是 ${mapCn(topTeamMap.mapName)}，它和其他地图一起，保存了这支队伍真正走过的路线。`
        : '地图是比赛最真实的单位。比分会被总结，排名会被压缩，但一张张地图会记得队伍真正走过的路。',
      statLines: [
        { label: '地图胜场', value: record.map_wins ?? '-' },
        { label: '地图负场', value: record.map_losses ?? '-' },
        { label: '队员人数', value: players.length }
      ],
      mapCards: teamMapCards,
      dataBars: teamMapTypeBars,
      storyQuote: {
        title: '地图不是背景，而是队伍记忆发生的地方',
        body: topTeamMap ? `${mapCn(topTeamMap.mapName)} 是这支队伍最常被记录的地图。` : '每一张地图都保存着不同的交火、等待和结算。'
      },
      chips: topTeamMap ? [
        mapCn(topTeamMap.mapName),
        mapTypeCn(topTeamMap.mapType),
        `${formatNum(topTeamMap.minutes, 1)} 分钟`
      ].filter(Boolean) : []
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'KEY MATCH',
      title: keyMatch ? '有一场比赛，适合作为你们的赛季切片' : '总会有一场比赛，代表这段旅程',
      body: keyMatch
        ? `那是 ${getMatchDisplayName(keyMatch)}。对手是 ${getTeamDisplay(keyOpponent)}。在这样的比赛里，队伍不只是打出结果，也打出记忆。`
        : '有些比赛不一定因为比分被记住，而是因为它让队伍真正成为队伍。',
      matchCard: keyMatchCard,
      statLines: keyMatch ? [
        { label: '阶段', value: stageCn(keyMatch.stage) || '-' },
        { label: '回合', value: getRoundDisplay(keyMatch.round) || '-' },
        { label: '比分', value: getScoreText(keyMatch) || '-' }
      ] : [],
      chips: keyMatch ? [stageCn(keyMatch.stage), getRoundDisplay(keyMatch.round), getScheduledText(keyMatch)].filter(Boolean) : []
    },
    ...(shouldShowSeasonOpponent ? [{
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'SEASON OPPONENT',
      title: seasonOpponent.rankText && String(seasonOpponent.rankText).includes('冠军')
        ? `你们遇见了后来的冠军`
        : `有些对手，是这支队伍赛季里的参照`,
      watermark: seasonOpponent.name,
      body: seasonOpponent.rankText && String(seasonOpponent.rankText).includes('冠军')
        ? `这个赛季，${short || name || '你们'} 和 ${seasonOpponent.name} 在赛程里相遇了 ${seasonOpponent.count} 次。后来，${seasonOpponent.name} 走到了最后。对经理来说，这样的对手不只是赛程表另一边的名字，它也会改变等待、沟通、确认和赛季记忆的形状。`
        : `这个赛季，${short || name || '你们'} 和 ${seasonOpponent.name} 在赛程里相遇了 ${seasonOpponent.count} 次。对经理来说，对手不只是赛程表另一边的名字，它也会改变等待、沟通、确认和赛季记忆的形状。`,
      statLines: [
        { label: '相遇次数', value: seasonOpponent.count },
        { label: '代表比赛', value: getMatchStoryTitle(seasonOpponent.representativeMatch) || '-' },
        { label: '对手成绩', value: seasonOpponent.rankText || '-' }
      ],
      storyQuote: {
        title: seasonOpponent.rankText && String(seasonOpponent.rankText).includes('冠军')
          ? '你们遇见的不只是一个对手'
          : '对手也是赛季记忆的一部分',
        body: seasonOpponent.rankText && String(seasonOpponent.rankText).includes('冠军')
          ? `${seasonOpponent.name} 后来拿到了冠军。现在回看，这次相遇也成了你们赛季里更特殊的一页。`
          : '每一个对手，都会让这支队伍的赛季有不同的形状。'
      },
      chips: [
        seasonOpponent.name,
        `${seasonOpponent.count} 次相遇`,
        seasonOpponent.rankText
      ].filter(Boolean)
    }] : []),
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'NOT ALONE',
      title: `${players.length} 名选手组成了队伍的名单`,
      body: getRosterBody(as),
      rosterCards,
      chips: rosterCards.map(player => player.title)
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'LAST MATCH',
      title: lastMatch ? `最后一战，是对阵 ${getTeamDisplay(lastOpponent)}` : '每一段赛季，都会走向自己的终点',
      body: lastMatch
        ? `这场比赛发生在 ${getScheduledText(lastMatch) || '赛程记录中'}。它不一定能概括整支队伍，但它确实成为了这个赛季的最后一个比赛节点。`
        : '有些结束没有很响亮的声音，但只要赛季被记录，它就不是空白。',
      matchCard: lastMatchCard,
      statLines: lastMatch ? [
        { label: '阶段', value: stageCn(lastMatch.stage) || '-' },
        { label: '回合', value: getRoundDisplay(lastMatch.round) || '-' },
        { label: '比分', value: getScoreText(lastMatch) || '-' }
      ] : [],
      storyQuote: {
        title: '最后一战不是全部，但它是句点',
        body: lastMatch ? `对阵 ${getTeamDisplay(lastOpponent)} 的这场比赛，成为了这支队伍本届学院赛的最后一个比赛节点。` : '每支队伍都会有自己的结尾，而结尾也应该被记录。'
      },
      chips: lastMatch ? [stageCn(lastMatch.stage), getRoundDisplay(lastMatch.round), getScoreText(lastMatch)].filter(Boolean) : []
    },
    {
      kind: 'ending',
      tone: pickFinalRankTone(finalRankText),
      eyebrow: 'FINAL RESULT',
      title: rankStory.title,
      body: rankStory.body,
      watermark: getRankWatermark(finalRankText),
      image: short ? getSafeTeamLogo(short, db) : DEFAULT_TEAM_LOGO,
      storyQuote: {
        title: '这支队伍走完了自己的版本',
        body: rankStory.body
      },
      chips: lastMatch ? [`最后一战：${getTeamDisplay(lastOpponent)}`, rankStory.label, 'TEAM REVIEW COMPLETE'] : [rankStory.label, 'TEAM REVIEW COMPLETE'].filter(Boolean)
    },
    getOrganizerMessageScene()
  ], {
    storyType: 'team',
    cardBadge: 'TEAM OFFICIAL CARD',
    coverWatermark: short || name || 'TEAM',
    endWatermark: finalRankText || 'ARCHIVE'
  })
}

function getMatchImportanceScore(match) {
  const text = [
    match?.stage,
    match?.round,
    match?.match_display_name,
    match?.matchDisplayName,
    match?.match_id
  ].filter(Boolean).join(' ').toLowerCase()

  let score = 0

  if (text.includes('grand final') || text.includes('总决赛')) score += 100
  if (text.includes('final') || text.includes('决赛')) score += 70
  if (text.includes('playoff') || text.includes('季后')) score += 45
  if (text.includes('lcq') || text.includes('突围')) score += 28
  if (text.includes('swiss') || text.includes('瑞士')) score += 12

  const diff = getScoreDiff(match)
  if (Number.isFinite(diff)) score += Math.max(0, 12 - diff * 4)

  return score
}

function getTopStaffMatch(db, staffMatches) {
  const matches = safeArr(staffMatches).map(item => resolveMatch(db, item)).filter(Boolean)
  return [...matches].sort((a, b) => getMatchImportanceScore(b) - getMatchImportanceScore(a))[0] || null
}

function getStaffStageBars(stages) {
  const rows = safeArr(stages)
  const max = Math.max(...rows.map(row => Number(row.count || 0)), 1)

  return rows.map(row => ({
    label: stageCn(row.name),
    value: Number(row.count || 0),
    displayValue: `${row.count} 场`,
    score: Math.round((Number(row.count || 0) / max) * 100)
  }))
}

export function buildStaffStory(db, staffType, staffKey) {
  const staff = getStaffReview(db, staffType, staffKey)
  if (!staff) return []

  const isCaster = staffType === 'caster'
  const staffLabel = isCaster ? '解说' : '赛管'
  const staffName = staff.staff_name || staff.name || staffKey
  const fullStaffTag = getFullTag(staffName)
  const publicStaffName = getStaffAliasName(staffName, getPublicName(staffName, staffName))
  const topStage = staff.stages?.[0]
  const topTeam = staff.teams_seen?.[0]
  const matches = sortMatches(safeArr(staff.matches).map(item => resolveMatch(db, item)).filter(Boolean))
  const collaboration = getStaffCollaborationGroups(staff, matches, isCaster)
  const sameRolePartners = collaboration.sameRolePartners
  const crossRolePartners = collaboration.crossRolePartners
  const topPartner = sameRolePartners[0] || normalizePartnerRows(staff.partners)[0] || null
  const topCrossPartner = crossRolePartners[0] || null

  const topOverallPartner = [
    topPartner ? {
      ...topPartner,
      partnerRole: isCaster ? 'caster' : 'staff'
    } : null,
    topCrossPartner ? {
      ...topCrossPartner,
      partnerRole: isCaster ? 'staff' : 'caster'
    } : null
  ].filter(Boolean).sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0] || null

  const topOverallPartnerTitle = topOverallPartner
    ? isCaster
      ? topOverallPartner.partnerRole === 'caster'
        ? `你最常一起解说的搭档，是 ${topOverallPartner.publicName}`
        : `你最常协作的赛管，是 ${topOverallPartner.publicName}`
      : topOverallPartner.partnerRole === 'caster'
        ? `你最常协作的解说，是 ${topOverallPartner.publicName}`
        : `你最常一起执行赛事的赛管，是 ${topOverallPartner.publicName}`
    : isCaster
      ? '有些声音，是一起完成比赛的'
      : '有些工作，是靠协作完成的'

  const topOverallPartnerBody = topOverallPartner
    ? isCaster
      ? topOverallPartner.partnerRole === 'caster'
        ? `你和 ${topOverallPartner.publicName} 在这个赛季共同出现了 ${topOverallPartner.count} 次。解说不是一个人的独白，很多比赛的节奏、情绪和记忆，是由搭档一起托起来的。`
        : `你和 ${topOverallPartner.publicName} 在这个赛季协作了 ${topOverallPartner.count} 次。解说的声音被观众听见之前，也需要有人确认流程、处理等待，把比赛稳稳送到台前。`
      : topOverallPartner.partnerRole === 'caster'
        ? `你和 ${topOverallPartner.publicName} 在这个赛季协作了 ${topOverallPartner.count} 次。赛事执行不只发生在后台，也会和解说、直播和观众看到的比赛节奏连接在一起。`
        : `你和 ${topOverallPartner.publicName} 在这个赛季共同执行了 ${topOverallPartner.count} 次。确认、记录、等待和处理，往往都不是一个人完成的。`
    : isCaster
      ? '这个赛季里，你用自己的声音参与比赛。即使没有固定搭档，每一次开口都让比赛多了一层被观看的方式。'
      : '这个赛季里，你参与的是幕后运行。即使没有固定搭档，每一次执行也都让比赛更接近顺利完成。'
  const firstMatch = matches[0]
  const lastMatch = matches[matches.length - 1]
  const topMatch = getTopStaffMatch(db, matches)
  const avatar = getStaffAvatar(staffName)

  const firstMatchCard = firstMatch ? buildMatchCard(db, firstMatch, [], {
    title: isCaster ? '第一次开麦记录' : '第一次赛管记录',
    note: isCaster ? '这是你第一次出现在解说记录里的比赛。' : '这是你第一次出现在赛管记录里的比赛。'
  }) : null

  const topMatchCard = topMatch ? buildMatchCard(db, topMatch, [], {
    title: isCaster ? '最高规格解说场次' : '最高规格赛管场次',
    note: isCaster ? '这场比赛是你这届赛事里最有分量的解说记录之一。' : '这场比赛是你这届赛事里最有分量的赛管记录之一。'
  }) : null

  const lastMatchCard = lastMatch ? buildMatchCard(db, lastMatch, [], {
    title: isCaster ? '最后一次解说记录' : '最后一次赛管记录',
    note: isCaster ? '这是你在这份解说记录里的最后一场。' : '这是你在这份赛管记录里的最后一场。'
  }) : null


  return withVisualMeta([
    {
      kind: 'cover',
      tone: isCaster ? 'purple' : 'blue',
      storyType: 'staff',
      story_type: 'staff',
      staffType,
      staff_type: staffType,
      cardKind: isCaster ? 'caster' : 'staff',
      card_kind: isCaster ? 'caster' : 'staff',
      posterCardKind: isCaster ? 'caster' : 'staff',
      poster_card_kind: isCaster ? 'caster' : 'staff',
      eyebrow: isCaster ? 'CASTER SEASON REVIEW' : 'STAFF SEASON REVIEW',
      title: `${publicStaffName} 的赛季回顾`,
      subTitle: fullStaffTag !== publicStaffName ? fullStaffTag : '',
      body: isCaster
        ? '这个赛季，你用声音陪比赛走过了一段路。每一次推进、反打、暂停和终局，都曾经通过你的表达被看见。'
        : '这个赛季，你站在赛事背后，让一场场比赛能够顺利发生。镜头不一定总会拍到幕后，但比赛能完成，本身就有你的痕迹。',
      image: avatar,
      issuedTo: fullStaffTag || staffKey,
      issued_to: fullStaffTag || staffKey,
      battleTag: fullStaffTag || staffKey,
      callsign: publicStaffName,
      displayName: publicStaffName,
      display_name: publicStaffName,
      staffTag: !isCaster ? (fullStaffTag || staffKey) : '',
      casterTag: isCaster ? (fullStaffTag || staffKey) : '',
      identityClass: staffLabel,
      identity_class: staffLabel,
      chips: [staffLabel, `${staff.match_count} 场比赛`, fullStaffTag !== publicStaffName ? fullStaffTag : ''].filter(Boolean),
      storyQuote: {
        title: isCaster ? '你不是比赛的一方，但你见证了比赛被讲述' : '你不在比分里，但你让比赛得以发生',
        body: isCaster ? '声音不会出现在比分表里，但它会决定比赛如何被观看、被理解、被记住。' : '真正顺利的比赛，往往看起来什么都没有发生。但那正是赛管工作的意义。'
      }
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: isCaster ? 'FIRST CAST' : 'FIRST STAFF RECORD',
      title: firstMatch ? `第一次记录，是从 ${getMatchStoryTitle(firstMatch)} 开始` : `你的${staffLabel}记录从这里开始`,
      body: firstMatch
        ? isCaster
          ? `那场比赛发生在 ${getScheduledText(firstMatch) || '赛程记录中'}。从这场开始，你的声音进入了 2026 薯条杯学院赛。`
          : `那场比赛发生在 ${getScheduledText(firstMatch) || '赛程记录中'}。从这场开始，你成为了赛事运行记录的一部分。`
        : `有些工作不是从一个响亮的瞬间开始的，但只要名字被记录，你就已经在这届赛事里留下了位置。`,
      matchCard: firstMatchCard,
      chips: firstMatch ? [stageCn(firstMatch.stage), getRoundDisplay(firstMatch.round), getScheduledText(firstMatch), getMatchDisplayName(firstMatch)].filter(Boolean) : []
    },
    {
      kind: 'metric',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: 'YOU WERE THERE',
      title: `你参与了 ${staff.match_count} 场比赛`,
      metric: String(staff.match_count),
      metricLabel: 'MATCHES',
      body: isCaster
        ? '每一场被你解说过的比赛，都不只是赛程表上的一行。它们曾经通过你的声音，被更多人看见。'
        : '这些比赛背后有确认、记录、等待和执行。它们不总是出现在镜头里，但比赛能开始，本身就是一种结果。',
      statLines: [
        { label: '涉及阶段', value: safeArr(staff.stages).length },
        { label: '见证队伍', value: safeArr(staff.teams_seen).length },
        { label: '协作搭档', value: sameRolePartners.length + crossRolePartners.length || safeArr(staff.partners).length }
      ]
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: 'STAGE MEMORY',
      title: topStage ? `你参与最多的阶段是 ${stageCn(topStage.name)}` : '你参与过这个赛季的不同阶段',
      body: topStage
        ? `这个阶段里，你出现了 ${topStage.count} 次。它可能不是最轻松的部分，但它构成了你在薯条杯里的主要记忆。`
        : '不同阶段有不同的压力，而你参与的是让这些阶段真正运转起来的部分。',
      dataBars: getStaffStageBars(staff.stages),
      timeline: safeArr(staff.stages).slice(0, 6).map(stage => ({
        label: stageCn(stage.name),
        value: `${stage.count} 场`,
        meta: isCaster ? 'CASTED' : 'STAFF'
      })),
      chips: safeArr(staff.stages).slice(0, 6).map(stage => `${stageCn(stage.name)} × ${stage.count}`)
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: 'TEAMS SEEN',
      title: topTeam ? `你最常见证的队伍是 ${topTeam.name}` : '你见证了很多队伍的赛季',
      body: topTeam
        ? `你和 ${topTeam.name} 在赛程里多次相遇。对他们来说，那是比赛；对你来说，那也是你赛季记录的一部分。`
        : '你不属于某一支队伍，但你见证了许多队伍如何走进赛场。',
      teamCards: safeArr(staff.teams_seen).slice(0, 6).map(team => ({
        title: team.name,
        value: `${team.count} 次`,
        image: getSafeTeamLogo(team.name, db),
        note: getRankMemoryLine(getTeamFinalRankText(db, team.name), '这支队伍')
      })),
      chips: safeArr(staff.teams_seen).slice(0, 8).map(team => `${team.name} × ${team.count}`)
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: isCaster ? 'CASTER PARTNERS' : 'STAFF PARTNERS',
      title: topOverallPartnerTitle,
      body: topOverallPartnerBody,
      partnerCards: sameRolePartners.slice(0, 6).map(buildPartnerCard),
      crossPartnerCards: crossRolePartners.slice(0, 6).map(buildPartnerCard),
      partnerGroups: [
        {
          title: isCaster ? '解说搭档' : '协作赛管',
          cards: sameRolePartners.slice(0, 4).map(buildPartnerCard)
        },
        {
          title: isCaster ? '协作赛管' : '协作解说',
          cards: crossRolePartners.slice(0, 4).map(buildPartnerCard)
        }
      ].filter(group => group.cards.length),
      chips: [
        ...sameRolePartners.slice(0, 4).map(partner => `${partner.publicName} × ${partner.count}`),
        ...crossRolePartners.slice(0, 4).map(partner => `${partner.publicName} × ${partner.count}`)
      ]
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: isCaster ? 'BIGGEST STAGE' : 'KEY STAFF MATCH',
      title: topMatch ? `你参与过的最高规格比赛，是${getMatchStoryTitle(topMatch)}` : '有些比赛，会成为一届赛事的节点',
      body: topMatch
        ? isCaster
          ? `这场比赛发生在 ${stageCn(topMatch.stage)}。当比赛越接近终局，解说的声音也越像是在替这届赛事做记录。`
          : `这场比赛发生在 ${stageCn(topMatch.stage)}。越接近关键节点，赛事运行就越需要有人把它稳稳托住。`
        : isCaster
          ? '并不是每一次解说都在最高舞台，但每一次开口都让比赛多了一层被看见的方式。'
          : '并不是每一次赛管记录都在最高舞台，但每一次执行都让比赛更接近顺利完成。',
      matchCard: topMatchCard,
      chips: topMatch ? [stageCn(topMatch.stage), getRoundDisplay(topMatch.round), getScheduledText(topMatch), getMatchDisplayName(topMatch)].filter(Boolean) : []
    },
    {
      kind: 'narrative',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: 'LAST RECORD',
      title: lastMatch
        ? isCaster
          ? `最后一次解说，也停在了${getMatchStoryTitle(lastMatch)}`
          : `最后一次记录，也停在了${getMatchStoryTitle(lastMatch)}`
        : '每一段参与，都会有自己的最后一页',
      body: lastMatch
        ? isCaster
          ? '那是你这份解说记录里的最后一场。比赛会结束，但声音曾经在那里出现过。'
          : '那是你这份赛管记录里的最后一场。比赛会结束，但它能被完整记录下来，本身就有你的参与。'
        : '有些结尾不一定响亮，但它仍然属于这届赛事的一部分。',
      matchCard: lastMatchCard,
      chips: lastMatch ? [stageCn(lastMatch.stage), getRoundDisplay(lastMatch.round), getScheduledText(lastMatch), getMatchDisplayName(lastMatch)].filter(Boolean) : []
    },
    {
      kind: 'ending',
      tone: isCaster ? 'purple' : 'blue',
      eyebrow: 'FRIES CUP ARCHIVE',
      title: isCaster
        ? '你的声音，留在了赛季里'
        : '幕后，也有被记住的痕迹',
      body: isCaster
        ? '谢谢你把比赛讲给大家听。那些团战，不只存在于比分里，也曾被你的声音记录。2026 薯条杯学院赛，也有你留下的一部分。'
        : '谢谢你让比赛稳定运行着。那些比赛得以被确认、被记录、被执行，也被顺利地完成。2026 薯条杯学院赛，也有你留下的一部分。',
      image: avatar,
      storyQuote: {
        title: isCaster ? '你用声音见证过这届赛事' : '你用执行托住过这届赛事',
        body: isCaster ? '比赛会结束，回放会沉下去，但有些声音会和那场比赛一起被记住。' : '没有人会记住每一次确认和等待，但比赛能够完成，就是这份工作的痕迹。'
      },
      chips: lastMatch ? [stageCn(lastMatch.stage), getScheduledText(lastMatch), 'SEASON REVIEW COMPLETE'].filter(Boolean) : ['SEASON REVIEW COMPLETE']
    },
    getOrganizerMessageScene()
  ], {
    storyType: 'staff',
    cardBadge: isCaster ? 'CASTER OFFICIAL CARD' : 'STAFF OFFICIAL CARD',
    staffBadge: isCaster ? 'CASTER ARCHIVE' : 'STAFF ARCHIVE',
    coverWatermark: publicStaffName,
    endWatermark: isCaster ? 'VOICE' : 'BEHIND'
  })
}

function getAllMatches(db) {
  return safeArr(db?.matches).filter(Boolean)
}

function getTournamentStageStats(matches) {
  const map = new Map()

  safeArr(matches).forEach(match => {
    const label = stageCn(match.stage || 'UNKNOWN')
    const prev = map.get(label) || { label, count: 0 }
    prev.count += 1
    map.set(label, prev)
  })

  const rows = [...map.values()].sort((a, b) => b.count - a.count)
  const max = Math.max(...rows.map(row => row.count), 1)

  return rows.map(row => ({
    label: row.label,
    value: row.count,
    displayValue: `${row.count} 场`,
    score: Math.round((row.count / max) * 100)
  }))
}

function getTournamentMapPool(db) {
  return getMapPool(safeArr(db?.players).flatMap(player => getValidLogs(player)))
}

function getTopPlayerCards(db) {
  return safeArr(db?.player_totals)
    .filter(row => Number(row.raw_time_mins || 0) >= 20)
    .map(row => {
      const role = String(row.role || '').toUpperCase()
      const mainMetric = getRoleMainMetric(role)
      const value = Number(row[mainMetric.key] || 0)

      return {
        title: getPlayerDisplayName(row),
        value: `${formatNum(value, 2)}`,
        meta: mainMetric.label,
        note: [row.team_short_name || row.team_name, getRoleCn(row.role)].filter(Boolean).join(' / '),
        scoreValue: value
      }
    })
    .sort((a, b) => b.scoreValue - a.scoreValue)
    .slice(0, 6)
}

function getPlayoffTeamCards(db) {
  return getAllTeamLikeRows(db)
    .map(row => {
      const rankText = row.final_rank_text || row.rank_text || ''
      const teamName = row.short || row.team_short_name || row.team_name || row.name || row.team_id
      return {
        row,
        rank: getRankNumber(rankText) ?? 999,
        rankText,
        teamName
      }
    })
    .filter(item => item.teamName && item.rank >= 1 && item.rank <= 8)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map(item => ({
      title: item.teamName,
      value: item.rankText,
      image: getSafeTeamLogo(item.teamName, db),
      note: getRankStory(item.rankText).label
    }))
}

function getChampionReview(db) {
  return getAllTeamLikeRows(db).find(row => {
    const text = String(row.final_rank_text || row.rank_text || '')
    return getRankNumber(text) === 1 || text.includes('冠军')
  }) || null
}

function splitNames(value) {
  if (value === undefined || value === null || value === '') return []

  if (Array.isArray(value)) {
    return value.flatMap(item => splitNames(item))
  }

  if (typeof value === 'object') {
    return splitNames(pickFirstValue(
      value.name,
      value.publicName,
      value.staff_name,
      value.caster_name,
      value.commentator_name,
      value.admin_name,
      value.display_name,
      value.nickname,
      value.label,
      value.value
    ))
  }

  const splitter = new RegExp('[、,，/|;；\\s]+', 'g')

  return String(value || '')
    .split(splitter)
    .map(name => name.trim())
    .filter(Boolean)
}

function getTournamentStaffSummary(db, matches) {
  const casterMap = new Map()
  const staffMap = new Map()

  safeArr(matches).forEach(match => {
    getMatchCasterNames(match).forEach(name => mergeNameCount(casterMap, name, 1))
    getMatchStaffNames(match).forEach(name => mergeNameCount(staffMap, name, 1))
  })

  if (!casterMap.size || !staffMap.size) {
    getStaffReviewRows(db).forEach(row => {
      const name = pickFirstValue(
        row.staff_name,
        row.caster_name,
        row.commentator_name,
        row.admin_name,
        row.display_name,
        row.name
      )

      const role = inferStaffReviewRole(row)
      const count = Number(row.match_count ?? row.matches_count ?? safeArr(row.matches).length ?? 1) || 1

      if (!name) return
      if (!casterMap.size && role === 'caster') mergeNameCount(casterMap, name, count)
      if (!staffMap.size && role === 'staff') mergeNameCount(staffMap, name, count)
    })
  }

  const allCasterRows = nameCountRows(casterMap, Infinity)
  const allStaffRows = nameCountRows(staffMap, Infinity)

  const casterRows = allCasterRows.slice(0, 12)
  const staffRows = allStaffRows.slice(0, 12)

  return {
    casterCount: allCasterRows.length,
    staffCount: allStaffRows.length,
    casterNames: allCasterRows.map(row => row.publicName).slice(0, 4),
    staffNames: allStaffRows.map(row => row.publicName).slice(0, 4),
    casterCards: casterRows.slice(0, 4).map(row => buildPartnerCard(row)),
    staffCards: staffRows.slice(0, 4).map(row => buildPartnerCard(row))
  }
}

export function buildTournamentStory(db) {
  const matches = sortMatches(getAllMatches(db))
  const teamReviews = getAllTeamLikeRows(db)
  const teamCount = teamReviews.length || safeArr(db?.teams).length
  const matchCount = matches.length
  const mapPool = getTournamentMapPool(db)
  const mapCards = getMapCards(mapPool)
  const topMap = mapPool[0] || null
  const playoffTeamCards = getPlayoffTeamCards(db)
  const championReview = getChampionReview(db)
  const championShort = championReview?.short || championReview?.team_short_name || championReview?.team_name || championReview?.name || ''
  const championRankText = championReview?.final_rank_text || championReview?.rank_text || '冠军'
  const championTeam = championShort ? getTeamById(db, championShort) : null
  const championMatches = championShort ? getTeamMatches(db, championShort) : []
  const sortedChampionMatches = sortMatches(championMatches)
  const firstChampionMatch = sortedChampionMatches[0]
  const lastChampionMatch = sortedChampionMatches[sortedChampionMatches.length - 1]
  const grandFinalMatch = getGrandFinalMatch(matches)
  const grandFinalCard = grandFinalMatch ? buildMatchCard(db, grandFinalMatch, [], {
    title: '最后一场比赛',
    note: '这是整届比赛最终汇到一起的地方。'
  }) : null
  const stageBars = getTournamentStageStats(matches)
  const topPlayerCards = getTopPlayerCards(db)
  const staffSummary = getTournamentStaffSummary(db, matches)

  return withVisualMeta([
    {
      kind: 'cover',
      tone: 'gold',
      eyebrow: 'TOURNAMENT REVIEW',
      title: '2026 薯条杯学院赛',
      body: '这是属于整届比赛的回顾。从公开预选赛到季后淘汰赛，从第一场对阵到最后一次归档，这里保存的是所有人一起完成的一届比赛。',
      image: '/logos/fca_logo.png',
      chips: ['公开预选赛', '季后淘汰赛', '赛事总回顾'],
      storyQuote: {
        title: '这不是某一个人的回顾',
        body: '这是这届薯条杯学院赛被重新打开后的完整故事。'
      }
    },
    {
      kind: 'metric',
      tone: 'gold',
      eyebrow: 'OPEN QUALIFIER',
      title: '所有故事，都从公开预选赛开始',
      metric: String(teamCount || '—'),
      metricLabel: 'TEAMS',
      body: '公开预选赛由瑞士轮和突围赛组成。不是每支队伍都会进入季后淘汰赛，但每支队伍都让这届比赛从一张报名表变成了真正发生过的赛程。',
      statLines: [
        { label: '队伍数量', value: teamCount || '-' },
        { label: '比赛场次', value: matchCount || '-' },
        { label: '阶段', value: '瑞士轮 / 突围赛' }
      ],
      dataBars: stageBars,
      chips: ['瑞士轮', '突围赛', '公开预选赛']
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'SWISS ROUND',
      title: '瑞士轮，是很多队伍第一次进入赛程的地方',
      body: '瑞士轮不是背景板。它承载了最早的试探、磨合、等待和第一批胜负。很多故事没有走到最后，但它们确实从这里开始。',
      dataBars: stageBars.filter(row => String(row.label).includes('瑞士') || String(row.label).toUpperCase().includes('SWISS')),
      storyQuote: {
        title: '第一阶段也值得被记住',
        body: '不是只有决赛才叫比赛。所有人第一次进入房间、第一次确认对阵、第一次打完地图，都属于这届赛事。'
      },
      chips: ['瑞士轮', '第一批对阵', '公开预选赛']
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'LCQ',
      title: '突围赛，是季后门票前最后的压力',
      body: '突围赛把公开预选赛推向了更紧的地方。有人从这里继续向前，有人停在门口，但每一次争夺都让季后淘汰赛的名单变得更具体。',
      dataBars: stageBars.filter(row => String(row.label).includes('突围') || String(row.label).toUpperCase().includes('LCQ')),
      storyQuote: {
        title: '停在门口，也不是空白',
        body: '能够被记录下来，本身就是这届比赛的一部分。'
      },
      chips: ['突围赛', '季后门票', '公开预选赛']
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'PLAYOFFS',
      title: '八支队伍，进入季后淘汰赛',
      body: '季后淘汰赛不是另一个赛季，而是公开预选赛之后被筛出来的终局部分。进入前八的队伍，把自己的故事延伸到了更残酷、更接近结尾的阶段。',
      teamCards: playoffTeamCards,
      chips: playoffTeamCards.map(card => card.title).filter(Boolean)
    },
    {
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'CHAMPION ROAD',
      title: championShort ? `${championShort}，走到了最后` : '冠军之路，被写进归档',
      body: championShort
        ? `${championShort} 最终获得了 ${championRankText}。冠军不是一场比赛决定的，而是从第一场到最后一场之间，所有地图、对手和结果共同写出来的。`
        : '冠军之路不是凭空出现的。它从公开预选赛开始，在季后淘汰赛完成，最后被写进这届赛事的归档。',
      timeline: [
        firstChampionMatch ? {
          label: '第一场',
          value: getMatchDisplayName(firstChampionMatch),
          meta: getScheduledText(firstChampionMatch)
        } : null,
        lastChampionMatch ? {
          label: '最后一战',
          value: getMatchDisplayName(lastChampionMatch),
          meta: getScheduledText(lastChampionMatch)
        } : null,
        championRankText ? {
          label: '最终成绩',
          value: championRankText,
          meta: 'CHAMPION'
        } : null
      ].filter(Boolean),
      chips: [championShort, championRankText, championTeam?.name || championReview?.team_name].filter(Boolean)
    },
    ...(grandFinalMatch ? [{
      kind: 'narrative',
      tone: 'gold',
      eyebrow: 'GRAND FINAL',
      title: `最后一场比赛，是 ${getTeamDisplay(grandFinalMatch.team_a)} 对阵 ${getTeamDisplay(grandFinalMatch.team_b)}`,
      body: `${getScoreText(grandFinalMatch) ? `比分写成了 ${getScoreText(grandFinalMatch)}。` : ''}但它不只是一个结果。它是所有公开预选赛、突围赛、季后淘汰赛最终汇到一起的地方。`,
      matchCard: grandFinalCard,
      statLines: [
        { label: '阶段', value: stageCn(grandFinalMatch.stage) || '-' },
        { label: '回合', value: getRoundDisplay(grandFinalMatch.round) || '-' },
        { label: '比分', value: getScoreText(grandFinalMatch) || '-' }
      ],
      chips: [stageCn(grandFinalMatch.stage), getRoundDisplay(grandFinalMatch.round), getScheduledText(grandFinalMatch)].filter(Boolean)
    }] : []),
    {
      kind: 'narrative',
      tone: 'green',
      eyebrow: 'MAP MEMORY',
      title: topMap ? `最常被记录的地图是 ${mapCn(topMap.mapName)}` : '地图记住了这届比赛的发生地点',
      body: topMap
        ? `${mapCn(topMap.mapName)} 在数据中出现了 ${topMap.count} 次。地图不只是背景，它是团战、等待、推进、失误和翻盘真正发生的地方。`
        : '每一张地图都保存着不同的比赛痕迹。它们不是背景，而是记忆发生的地方。',
      mapImage: getMapVisualImage(topMap),
      mapCards,
      chips: topMap ? [mapTypeCn(topMap.mapType), `${topMap.count} 次`, `${formatNum(topMap.minutes, 1)} 分钟`].filter(Boolean) : []
    },
    {
      kind: 'narrative',
      tone: 'red',
      visualType: 'playersRemembered',
      eyebrow: 'PLAYERS REMEMBERED',
      title: '这些名字，构成了比赛里的高光',
      body: '排行榜能显示谁更高，但赛季回顾想保存的是另一件事：这些数字背后，每一个名字都曾经站在地图里，参与过某一场真实发生的比赛。',
      playerCards: topPlayerCards,
      chips: topPlayerCards.slice(0, 6).map(player => player.title)
    },
    {
      kind: 'narrative',
      tone: 'purple',
      visualType: 'partners',
      eyebrow: 'VOICE AND STAFF',
      title: '比赛被看见，也被托住',
      body: '一届社区赛事不只由选手完成。有人讲述比赛，有人确认流程，有人处理等待，也有人把每一场比赛托到能够开始、能够结束、能够归档的位置。',
      partnerGroups: [
        {
          title: '解说出场',
          cards: staffSummary.casterCards || []
        },
        {
          title: '赛管出场',
          cards: staffSummary.staffCards || []
        }
      ].filter(group => group.cards.length),
      statLines: [
        { label: '解说人数', value: staffSummary.casterCount || '-' },
        { label: '赛管人数', value: staffSummary.staffCount || '-' },
        { label: '比赛场次', value: matchCount || '-' }
      ],
      chips: [
        ...safeArr(staffSummary.casterNames).slice(0, 2),
        ...safeArr(staffSummary.staffNames).slice(0, 2)
      ].filter(Boolean)
    },
    getOrganizerMessageScene()
  ], {
    storyType: 'tournament',
    cardBadge: 'TOURNAMENT OFFICIAL REVIEW',
    coverWatermark: 'FCA 2026',
    endWatermark: 'ARCHIVE'
  })
}
