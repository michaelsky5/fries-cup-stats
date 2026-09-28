const report = JSON.parse(document.getElementById('report-data').textContent)
const $ = id => document.getElementById(id)
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const fixed = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—'
const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
const label = { FCA26: 'FCA · 学院赛', FCR26: 'FCR · 常规赛', QGCS4: '全高杯 S4' }
const modelLabel = { elo: '基础 Elo', glicko: 'Glicko', roster: 'Glicko + 阵容', performance: 'Glicko + 阵容 + 表现' }
const statusLabel = { SUPPORTED: '样本达标', PROVISIONAL: '暂定', UNRATED: '未评级' }
let activeSeason = report.seasons.find(season => season.seasonId === 'FCR26') || report.seasons[0]
let activeTeam = activeSeason.ratings[0]?.id
const teamName = id => activeSeason.ratings.find(team => team.id === id)?.short || activeSeason.ratings.find(team => team.id === id)?.name || id
const pill = team => `<span class="pill ${team.status === 'SUPPORTED' ? '' : team.status === 'UNRATED' ? 'unrated' : 'pending'}">${statusLabel[team.status]}</span>`
const signed = value => `${value > 0 ? '+' : ''}${fixed(value)}`

function renderTable() {
  const search = $('team-search').value.trim().toLowerCase()
  const teams = activeSeason.ratings.filter(team => [team.short, team.name, team.id].some(value => value.toLowerCase().includes(search)))
  $('visible-count').textContent = `${teams.length} / ${activeSeason.ratings.length} 支登记队伍 · 截至 ${activeSeason.asOf}`
  $('team-rows').innerHTML = teams.length ? teams.map(team => `<tr class="${team.id === activeTeam ? 'selected' : ''}"><td><button class="team-button" data-team="${escapeHtml(team.id)}" aria-pressed="${team.id === activeTeam}">${escapeHtml(team.short || team.name)}<small>${escapeHtml(team.name)}</small></button></td><td class="number score">${fixed(team.rating, 0)}</td><td class="number">${team.interval ? team.interval.map(value => fixed(value, 0)).join('–') : '—'}</td><td class="number">${team.matches} / ${team.opponents}</td><td>${pill(team)}${team.band ? `<small class="fine"> ${team.band} 档</small>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">没有匹配的队伍，请调整搜索。</td></tr>'
  for (const button of $('team-rows').querySelectorAll('[data-team]')) button.addEventListener('click', () => { activeTeam = button.dataset.team; renderTable(); renderDetail() })
}

function chart(history) {
  if (!history.length) return '<p class="fine">没有正常比赛记录。</p>'
  const values = [1500, ...history.map(row => row.ratingAfter)]
  const low = Math.min(...values) - 70, high = Math.max(...values) + 70
  const x = index => 46 + index / Math.max(1, values.length - 1) * 548
  const y = value => 152 - (value - low) / (high - low) * 130
  const points = values.map((value, i) => `${x(i)},${y(value)}`).join(' ')
  return `<svg class="chart" viewBox="0 0 620 185" role="img" aria-label="评级随比赛日变化，初始为 1500 分"><line x1="46" x2="594" y1="${y(1500)}" y2="${y(1500)}" stroke="#506070" stroke-dasharray="4 4"/><text x="3" y="${y(1500) + 4}" fill="#aab7c7" font-size="11">1500</text><polyline points="${points}" fill="none" stroke="#d4f477" stroke-width="2.5"/>${history.map((row, i) => `<circle cx="${x(i + 1)}" cy="${y(row.ratingAfter)}" r="3" fill="#d4f477"><title>${escapeHtml(row.date)} · ${fixed(row.ratingAfter)}</title></circle>`).join('')}<text x="46" y="179" fill="#aab7c7" font-size="11">${escapeHtml(history[0].date)}</text><text x="594" y="179" fill="#aab7c7" text-anchor="end" font-size="11">${escapeHtml(history.at(-1).date)}</text></svg>`
}

function renderDetail() {
  const team = activeSeason.ratings.find(row => row.id === activeTeam)
  if (!team) { $('team-detail').innerHTML = '<p>选择队伍查看记录。</p>'; return }
  const history = activeSeason.history.filter(row => row.teamId === team.id && row.model === 'roster')
  const records = [...history].reverse().map(row => `<tr><td class="number">${escapeHtml(row.date.slice(5))}<br><span class="fine">${row.matchIds.length} 场</span></td><td>${row.opponents.map(opponent => `${escapeHtml(teamName(opponent.id))} <span class="fine">${fixed(opponent.rating, 0)}</span> ${opponent.result === 1 ? '胜' : opponent.result === 0 ? '负' : '平'}`).join('<br>')}</td><td class="number ${row.delta >= 0 ? 'positive' : 'negative'}">${signed(row.delta)}<br><span class="fine">赛果 ${signed(row.resultDelta)}<br>阵容 ${signed(row.rosterDelta)}</span></td><td class="number">${fixed(row.ratingAfter, 0)}</td></tr>`).join('')
  $('team-detail').innerHTML = `<div class="detail-head"><div><h2>${escapeHtml(team.short || team.name)}</h2><div class="subtle">${escapeHtml(team.name)}</div>${pill(team)}</div><div><div class="big-score">${fixed(team.rating, 0)}</div><div class="fine">${team.interval ? `${team.interval.map(value => fixed(value, 0)).join('–')} · 模型区间` : '等待正常比赛'}</div></div></div>
    <div class="detail-grid"><div><strong>${team.wins}–${team.losses}${team.draws ? `–${team.draws}` : ''}</strong><span>胜 / 负${team.draws ? ' / 平' : ''}</span></div><div><strong>${team.opponents}</strong><span>不同对手</span></div><div><strong>${percent(team.rosterCoverage)}</strong><span>阵容覆盖</span></div></div>
    <p class="fine">${team.reasons.length ? escapeHtml(team.reasons.join('；')) : `实验分档 ${team.band}；模型区间覆盖 ${team.possibleBands.join('–')} 档，供内部研判。`}</p>
    <h3>评级轨迹</h3>${chart(history)}<p class="fine">每个节点为一个比赛日结束后的评级；同日比赛统一更新。</p>
    <h3>逐日变化依据</h3><div class="history table-scroll"><table><thead><tr><th>日期</th><th>对手赛前分 / 赛果</th><th>变化</th><th>赛后分</th></tr></thead><tbody>${records || '<tr><td colspan="4">没有更新记录。</td></tr>'}</tbody></table></div>
    <details><summary>阵容与申报信息</summary><p>最近核对阵容：${escapeHtml(team.rosterDate || '无')}；较大阵容变化 ${team.rosterChanges} 次；最近连续可核对 ${team.stableMatches} 场。</p><p>归档申报：${escapeHtml(Object.entries(team.declarations).map(([rank, n]) => `${rank} ${n} 人`).join('、') || '未提供')}。</p><p class="fine">申报分布来自归档名单，只用于人工对照；未参与评级，不等同于每场首发。比较范围：${escapeHtml(team.scope)}。</p></details>`
}

function renderComparison() {
  const summary = report.evaluation.summaries.find(row => row.seasonId === activeSeason.seasonId)
  $('comparison-rows').innerHTML = report.policy.models.map(model => {
    const score = summary.all.models[model]
    const delta = summary.comparisons[model]
    return `<tr class="${model === report.evaluation.developmentChoice ? 'chosen' : ''}"><td>${modelLabel[model]}${model === report.evaluation.developmentChoice ? '<br><span class="fine">开发集选择</span>' : ''}</td><td class="number">${fixed(score.logLoss, 4)}</td><td class="number">${fixed(score.brier, 4)}</td><td class="number">${percent(score.accuracy)}</td><td class="number">${delta?.interval ? delta.interval.map(value => fixed(value, 3)).join(' 至 ') : '基线'}</td></tr>`
  }).join('')
  $('comparison-note').textContent = `同一组 ${summary.all.matches} 场非平局对局；五五开预测计半个正确。双方均已有至少 3 场历史：${summary.withHistory.matches} 场。Log loss / Brier 越低越好；差值区间低于 0 倾向优于 Elo。`
  const calibration = summary.all.models.roster.calibration
  $('calibration-rows').innerHTML = calibration.map(bin => `<tr><td>${Math.round(bin.lower * 100)}–${Math.round(bin.upper * 100)}%</td><td>${bin.count}</td><td>${percent(bin.predicted)}</td><td>${percent(bin.observed)}</td></tr>`).join('')
}

function renderMatchup() {
  const a = activeSeason.ratings.find(team => team.id === $('team-a').value)
  const b = activeSeason.ratings.find(team => team.id === $('team-b').value)
  if (!a || !b || a.id === b.id) { $('match-result').textContent = '选择两支不同队伍。'; return }
  if (!a.matches || !b.matches) { $('match-result').textContent = '至少一支队伍尚未评级，暂不生成对阵数值。'; return }
  if (a.scope !== b.scope) { $('match-result').textContent = '两队的对战网络尚未连通，当前分数不支持直接比较。'; return }
  const first = a.models.roster, second = b.models.roster, q = Math.log(10) / 400
  const g = 1 / Math.sqrt(1 + 3 * q * q * (first.rd ** 2 + second.rd ** 2) / Math.PI ** 2)
  const p = 1 / (1 + Math.exp(-q * g * (first.rating - second.rating)))
  $('match-result').innerHTML = `<div class="versus"><span>${escapeHtml(a.short || a.name)} <strong>${percent(p)}</strong></span><span><strong>${percent(1 - p)}</strong> ${escapeHtml(b.short || b.name)}</span></div><div class="probability-bar" aria-hidden="true"><span style="width:${p * 100}%"></span></div><p class="fine">截至 ${escapeHtml(activeSeason.asOf)} 的阵容模型预期得分。无平局时可作胜率参考；这是归档末日的假设对阵，不是历史赛前预测。${a.status !== 'SUPPORTED' || b.status !== 'SUPPORTED' ? '包含暂定队伍，证据有限。' : ''}</p>`
}

function renderSeason() {
  renderTable(); renderDetail(); renderComparison()
  const options = activeSeason.ratings.map(team => `<option value="${escapeHtml(team.id)}">${escapeHtml(team.short || team.name)}</option>`).join('')
  $('team-a').innerHTML = options; $('team-b').innerHTML = options
  $('team-b').selectedIndex = Math.min(1, activeSeason.ratings.length - 1)
  renderMatchup()
  const audit = activeSeason.audit
  $('quality').innerHTML = `<div><strong>${audit.eligibleSeries} / ${audit.totalMatches}</strong><span>正常评级 / 归档场次</span></div><div><strong>${audit.verifiedLineupMaps} / ${audit.listedMaps}</strong><span>可核对阵容 / 地图</span></div><div><strong>${audit.performanceMaps}</strong><span>具有完整表现输入的地图</span></div>`
  $('quality-note').textContent = `申报段位缺失 ${audit.missingDeclarations} / ${audit.registeredPlayers} 人；${audit.excludedMatches.length} 场未进入评级；对战网络共 ${activeSeason.components.length} 个连通分量（含无比赛队伍）。`
}

$('season-select').innerHTML = report.seasons.map(season => `<option value="${season.seasonId}">${label[season.seasonId] || escapeHtml(season.seasonId)}</option>`).join('')
$('season-select').value = activeSeason.seasonId
$('season-select').addEventListener('change', event => { activeSeason = report.seasons.find(season => season.seasonId === event.target.value); activeTeam = activeSeason.ratings[0]?.id; $('team-search').value = ''; renderSeason() })
$('team-search').addEventListener('input', renderTable)
$('team-a').addEventListener('change', renderMatchup)
$('team-b').addEventListener('change', renderMatchup)
$('total-matches').textContent = report.seasons.reduce((sum, season) => sum + season.audit.eligibleSeries, 0)
$('total-entries').textContent = report.seasons.reduce((sum, season) => sum + season.ratings.length, 0)
$('candidate-identities').textContent = report.identityAudit.candidates.length
$('selection-note').textContent = `FCA/FCR 开发集点估计选择：${modelLabel[report.evaluation.developmentChoice]}。${report.evaluation.validationImprovesOverElo ? `全高杯点估计改善${report.evaluation.validationDifference?.interval?.[1] >= 0 ? '，但误差区间仍跨过零' : ''}。` : '全高杯未证明该选择优于基础 Elo。'}${report.evaluation.developmentRegressions.length ? `${report.evaluation.developmentRegressions.map(id => label[id]).join('、')}尚未优于基础 Elo。` : ''}暂不用于正式配对。队伍表展示 Glicko + 阵容实验评级。`
$('provenance').innerHTML = report.provenance.inputs.map(input => `<li>${escapeHtml(input.seasonId)}：<code>${escapeHtml(input.path)}</code><br><code>SHA-256 ${escapeHtml(input.sha256)}</code></li>`).join('')
renderSeason()
