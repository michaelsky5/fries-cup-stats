import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { PERFORMANCE_METRICS, memberMatchup, pairedPerformance } from './teamPerformance.js'
import { formatDossierRecord } from './teamDossierPresentation.js'
import { OpponentStudy, SeriesPatterns } from './TeamAnalysisBrief.jsx'
import {
  PerformanceHeading,
  PerformanceEvidence,
  PerformanceRecords,
  HeroPortrait,
  MetricBars,
  valueLabel,
  resultLabel,
  roleLabel
} from './TeamPerformancePrimitives.jsx'
import styles from './TeamPerformance.module.css'
import leadStyles from './TeamPerformanceLead.module.css'
import TeamPerformanceComparison from './TeamPerformanceComparison.jsx'
import { getPerformanceComparison } from './teamPerformanceComparison.js'
import { roleMetrics, roleDefaultMetric, rolePercentile } from './teamPerformanceReadings.js'
import { getAnalysisMember, getAnalysisTeamPath } from './teamAnalysisReading.js'
import readingStyles from './TeamPerformanceReadings.module.css'

function MetricChoice({ id, value, onChange, en, automatic = false }) {
  const uiLocale = useUiLocale()
  return (
    <label className={styles.choiceLabel}>
      {en ? 'Metric' : uiText("观察指标", uiLocale)}
      <select aria-label={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {automatic ? <option value="auto">{en ? 'By role' : uiText("按职责推荐", uiLocale)}</option> : null}
        {PERFORMANCE_METRICS.map((metric) => (
          <option key={metric.id} value={metric.id}>
            {en ? metric.en : uiText(metric.zh, uiLocale)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CombatSection({ report, field, team, ...context }) {
  const uiLocale = useUiLocale()
  const { en, params, updateQuery } = context
  const mode = ['field', 'outcome'].includes(params.get('combatView')) ? params.get('combatView') : 'paired'
  const chosenMetric =
    PERFORMANCE_METRICS.find((metric) => metric.id === params.get('combatMetric')) || PERFORMANCE_METRICS[0]
  const comparisons = getPerformanceComparison(report, field, mode)
  const evidenceRecords =
    mode === 'paired'
      ? report.paired[chosenMetric.id].own.records
      : mode === 'outcome'
        ? [...report.wins[chosenMetric.id].records, ...report.losses[chosenMetric.id].records]
        : report.metrics[chosenMetric.id].records
  return (
    <section
      id="performance-combat"
      className={leadStyles.combat}
      aria-labelledby="performance-comparison-title"
    >
      <div id="team-records" className={styles.legacyAnchor} />
      <TeamPerformanceComparison
        rows={comparisons}
        selectedId={chosenMetric.id}
        mode={mode}
        team={team}
        en={en}
        onSelect={(combatMetric) => {
          updateQuery({ combatMetric })
          if (window.matchMedia('(max-width: 800px)').matches)
            window.requestAnimationFrame(() =>
              document
                .getElementById('performance-combat-reading')
                ?.scrollIntoView({ block: 'start', behavior: 'instant' })
            )
        }}
        onModeChange={(combatView) => updateQuery({ combatView })}
        onEvidence={() => {
          updateQuery({ teamEvidence: [...new Set([...context.opened, 'combat-evidence'])].join(',') })
          window.requestAnimationFrame(() =>
            document
              .getElementById('combat-evidence-anchor')
              ?.scrollIntoView({ block: 'start', behavior: 'instant' })
          )
        }}
      />
      <div className={leadStyles.combatContext}>
        <p>
          {mode === 'field'
            ? en
              ? 'Field medians use teams in the selected stage, each weighted equally. Open the evidence to inspect each team’s sample.'
              : uiText("参照来自当前赛段内各队的中位数，各队等权；展开依据可查看参照队伍及样本量。", uiLocale)
            : mode === 'paired'
              ? en
                ? 'Both sides use the same maps with complete values. These are the opponents this team actually faced.'
                : uiText("双方使用同一批数据齐全的地图，对照的是本队实际遇到的对手。", uiLocale)
              : en
                ? 'Won and lost maps are aggregated separately. Draws are excluded; differences do not establish why a map was won.'
                : uiText("赢图与输图分别汇总，不含平局；差异描述记录，不直接解释获胜原因。", uiLocale)}
        </p>
        <span>{en ? 'TEAM TOTAL / 10 MIN' : uiText("团队合计 / 每 10 分钟", uiLocale)}</span>
      </div>
      <div id="combat-evidence-anchor" className={styles.legacyAnchor}>
        <PerformanceEvidence
          id="combat-evidence"
          title={en ? 'Inspect the comparison samples' : uiText("核对比较所用的样本", uiLocale)}
          {...context}
        >
          <MetricChoice
            id={en ? 'Evidence metric' : uiText("证据指标", uiLocale)}
            value={chosenMetric.id}
            onChange={(combatMetric) => updateQuery({ combatMetric })}
            en={en}
          />
          {mode === 'field' ? (
            <div className={styles.fieldSamples}>
              {field[chosenMetric.id].samples.map((sample) => (
                <Link
                  key={sample.id}
                  to={context.withSeason(getAnalysisTeamPath(sample.id, params, { comparison: true }))}
                  state={context.returnState}
                  onClick={context.onLeave}
                >
                  <b>{sample.name}</b>
                  <span>
                    {sample.count} {en ? 'maps' : uiText("图", uiLocale)}
                  </span>
                  <strong>{valueLabel(sample.value)}</strong>
                </Link>
              ))}
            </div>
          ) : null}
          <PerformanceRecords records={evidenceRecords} {...context} />
        </PerformanceEvidence>
      </div>
    </section>
  )
}

export function MemberSection({ report, team, rolePeers, ...context }) {
  const uiLocale = useUiLocale()
  const { en, params, updateQuery, withSeason, returnState, onLeave } = context
  const explicitMetric = PERFORMANCE_METRICS.find(item => item.id === params.get('memberMetric'))
  const chosen = getAnalysisMember(report, params)
  const metric = explicitMetric || PERFORMANCE_METRICS.find(item => item.id === roleDefaultMetric(chosen?.role))
  const appearance = chosen && report.records.length ? chosen.maps / report.records.length : null
  const percentile = chosen ? rolePercentile(rolePeers, chosen, metric.id) : null
  const matchup = chosen ? memberMatchup(chosen, metric.id) : null
  const cohort = report.cohorts[0]
  return (
    <section id="performance-members" className={styles.section}>
      <PerformanceHeading
        index="02"
        title={en ? 'The people behind the numbers.' : uiText("表现，由每个人共同组成。", uiLocale)}
        note={
          en
            ? 'Grouped by role. Select a player to compare the same-match role sample.'
            : uiText("按职责阅读成员。选择一个名字，查看同场同职责的比较。", uiLocale)
        }
      />
      <div className={styles.sectionTools}>
        <p>
          {report.members.filter((member) => member.maps).length} / {report.members.length}{' '}
          {en ? 'listed players with appearances' : uiText("位名单成员有出场记录", uiLocale)}
          <small className={readingStyles.roleComposition}>{['TANK', 'DPS', 'SUP', 'UNKNOWN'].filter(role => report.members.some(member => member.role === role)).map(role => `${roleLabel(role, en, uiLocale)} ${report.members.filter(member => member.role === role).length}`).join(' / ')}</small>
        </p>
        <MetricChoice
          id={en ? 'Player metric' : uiText("成员指标", uiLocale)}
          value={explicitMetric?.id || 'auto'}
          automatic
          onChange={(memberMetric) => updateQuery({ memberMetric })}
          en={en}
        />
      </div>
      {chosen ? <label className={styles.memberPicker}>{en ? 'Player' : uiText("查看成员", uiLocale)}
        <select aria-label={en ? 'Selected player' : uiText("查看成员", uiLocale)} value={chosen.id} onChange={event => updateQuery({ member: event.target.value, performanceMember: null })}>
          {report.members.map(member => <option key={member.id} value={member.id}>{member.name} · {roleLabel(member.role, en, uiLocale)} · {member.maps} {en ? 'maps' : uiText("图", uiLocale)}</option>)}
        </select>
      </label> : null}
      <div className={styles.membersLayout}>
        <div className={styles.memberDirectory}>
          <div className={styles.memberLabels}>
            <span>{en ? 'Player / recorded role' : uiText("成员 / 职责", uiLocale)}</span>
            <span>{en ? 'Maps' : uiText("出场图数", uiLocale)}</span>
          </div>
          {report.members.map((member) => (
            <button
              type="button"
              className={styles.memberRow}
              key={member.id}
              aria-pressed={chosen?.id === member.id}
              aria-controls="performance-member-reading"
              onClick={() => {
                updateQuery({ member: member.id, performanceMember: null })
                if (window.matchMedia('(max-width: 700px)').matches)
                  window.requestAnimationFrame(() =>
                    document
                      .getElementById('performance-member-reading')
                      ?.scrollIntoView({ block: 'start', behavior: 'instant' })
                  )
              }}
            >
              <span>
                <HeroPortrait hero={member.heroes[0]?.hero} />
                <span>
                  <b>{member.name}</b>
                  <small>
                    {roleLabel(member.role, en, uiLocale)}
                    {member.roles.length > 1 ? (en ? ' · multiple roles recorded' : uiText(" · 有跨职责记录", uiLocale)) : ''}
                  </small>
                  <em className={styles.rowAction}>
                    {chosen?.id === member.id
                      ? en
                        ? 'Selected'
                        : uiText("当前成员", uiLocale)
                      : en
                        ? 'Compare player →'
                        : uiText("查看对照 →", uiLocale)}
                  </em>
                </span>
              </span>
              <span>
                {member.maps}
                <small>
                  {member.series} {en ? 'series' : uiText("场", uiLocale)}
                </small>
              </span>
            </button>
          ))}
        </div>
        {chosen ? (
          <aside id="performance-member-reading" className={styles.memberReading} aria-live="polite">
            <span>
              {team.shortName} / {roleLabel(chosen.role, en, uiLocale)}
            </span>
            <h3>{chosen.name}</h3>
            {chosen.maps ? (
              <>
                <p>{en ? `Appeared on ${chosen.maps} of ${report.records.length} recorded maps` : uiText("在 {0} 张已记录地图中出场 {1} 图", uiLocale, [report.records.length, chosen.maps])} <b>{appearance === null ? '—' : `${Math.round(appearance * 100)}%`}</b></p>
                <div className={readingStyles.roleChoices} role="group" aria-label={en ? 'Player role measures' : uiText("成员职责指标", uiLocale)}>
                  {roleMetrics(chosen.role).map(id => {
                    const description = PERFORMANCE_METRICS.find(item => item.id === id)
                    return <button type="button" key={id} aria-pressed={metric.id === id} onClick={() => updateQuery({ memberMetric: id })}>{en ? description.en : uiText(description.zh, uiLocale)}</button>
                  })}
                </div>
                <h4>
                  {en ? metric.en : uiText(metric.zh, uiLocale)} / {en ? '10 player minutes' : uiText("选手每 10 分钟", uiLocale)}
                </h4>
                <MetricBars
                  left={matchup.own}
                  right={matchup.opponent}
                  leftLabel={chosen.name}
                  rightLabel={en ? 'Opposing role average' : uiText("对手同职责人均", uiLocale)}
                />
                <small>
                  {matchup.count}{' '}
                  {en
                    ? 'paired maps. Opposing players are time-weighted; hero records may differ.'
                    : uiText("张可比地图。对手选手按出场时间加权，英雄记录可能不同。", uiLocale)}
                </small>
                <div className={readingStyles.peerPosition}>
                  <div><span>{en ? 'Same-role metric percentile' : uiText("同职责数值分位", uiLocale)}</span><strong>{percentile ? `P${Math.round(percentile.value)}` : '—'}</strong><small>{percentile ? (en ? `${percentile.count} eligible players in this scope` : uiText("当前范围 {0} 位有效样本选手", uiLocale, [percentile.count])) : (en ? 'Insufficient eligible peer samples' : uiText("当前有效样本不足", uiLocale))}</small></div>
                  <details><summary>{en ? 'Read this position' : uiText("如何读这个位置", uiLocale)} ＋</summary><p>{en ? 'Each player needs at least 5 maps and 30 minutes for this metric and role; the group needs 5 players. P80 means the value is around the 80th percentile, with ties assigned their midpoint. Higher values produce higher percentiles, including deaths. This is not an overall player ranking; hero and opponent differences remain.' : uiText("每位选手在本指标、本职责至少记录 5 图和 30 分钟，同组至少 5 人。P80 表示数值约处在第 80 百分位，并列取中点。数值越高分位越高，死亡也一样；这不是综合实力排名，仍受英雄与对手差异影响。", uiLocale)}</p></details>
                </div>
                <div className={styles.memberHeroes}>
                  {chosen.heroes.slice(0, 3).map((hero) => (
                    <span key={hero.key}>
                      <HeroPortrait hero={hero.hero} />
                      <b>{hero.label}</b>
                      <small>
                        {hero.maps} {en ? 'maps' : uiText("图", uiLocale)}
                      </small>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyMember}>
                <span className={styles.memberSilhouette} aria-hidden="true" />
                <p>
                  {en
                    ? 'No recorded appearances in this scope. No performance value is assigned.'
                    : uiText("当前范围暂无出场记录，不生成表现数值。", uiLocale)}
                </p>
              </div>
            )}
            <Link
              className={styles.textLink}
              to={withSeason(`/players/${encodeURIComponent(chosen.id)}`)}
              state={returnState}
              onClick={onLeave}
            >
              {en ? 'Full player profile' : uiText("完整选手档案", uiLocale)} ↗
            </Link>
          </aside>
        ) : (
          <p className={styles.empty}>{en ? 'No player identities available.' : uiText("暂无可识别的成员信息。", uiLocale)}</p>
        )}
      </div>
      {chosen?.maps ? <PerformanceEvidence
        id={`member-${chosen.id}`}
        title={en ? `${chosen.name} · ${metric.en}: inspect ${matchup.count} paired maps` : uiText("{0} · {1}：核对 {2} 张可比地图", uiLocale, [chosen.name, metric.zh, matchup.count])}
        {...context}
      >
        <PerformanceRecords records={matchup.records} {...context} />
      </PerformanceEvidence> : null}
      <div className={styles.cohort}>
        <div>
          <span>{en ? 'ROSTER CONTINUITY' : uiText("一起出场的成员", uiLocale)}</span>
          <h3>
            {report.cohorts.length} {en ? 'five-player groups on record' : uiText("组完整五人出场组合", uiLocale)}
          </h3>
          <p>
            {en
              ? 'Appearances describe participation, not official starter or substitute status.'
              : uiText("出场记录说明实际参与情况，不据此指定首发、替补或可参赛状态。", uiLocale)}
          </p>
        </div>
        <div>
          {cohort ? (
            report.cohorts.slice(0, 3).map((group) => (
              <div className={styles.cohortRow} key={group.ids.join('|')}>
                <b>
                  {group.ids
                    .map((id) => report.members.find((member) => member.id === id)?.name || id)
                    .join(' / ')}
                </b>
                <strong>
                  {group.records.length}
                  <small>{en ? 'maps together' : uiText("图共同出场", uiLocale)}</small>
                </strong>
              </div>
            ))
          ) : (
            <p className={styles.empty}>
              {en ? 'No complete five-player record.' : uiText("暂无完整五人出场记录。", uiLocale)}
            </p>
          )}
        </div>
      </div>
      {report.cohorts.length > 3 ? (
        <PerformanceEvidence
          id="all-cohorts"
          title={en ? 'All recorded groups' : uiText("展开全部出场组合", uiLocale)}
          {...context}
        >
          {report.cohorts.slice(3).map((group) => (
            <p key={group.ids.join('|')}>
              {group.ids
                .map((id) => report.members.find((member) => member.id === id)?.name || id)
                .join(' / ')}{' '}
              · {group.records.length} {en ? 'maps' : uiText("图", uiLocale)}
            </p>
          ))}
        </PerformanceEvidence>
      ) : null}
    </section>
  )
}

export { default as HeroSection } from './TeamHeroAnalysis.jsx'

function SeriesChart({ series, metric, en }) {
  const uiLocale = useUiLocale()
  const samples = series.map((item) => ({
    own: item.paired[metric].own.value,
    other: item.paired[metric].opponent.value,
    row: item.row
  }))
  const max =
    Math.max(1, ...samples.flatMap((item) => [item.own, item.other]).filter((value) => value !== null)) * 1.12
  const x = (index) => 45 + (samples.length === 1 ? 0.5 : index / Math.max(1, samples.length - 1)) * 610
  const y = (value) => 200 - (value / max) * 165
  return (
    <svg
      className={styles.seriesChart}
      viewBox="0 0 710 250"
      role="img"
      aria-label={
        en
          ? 'Per-series team and same-match opponent values. Exact figures are listed below.'
          : uiText("各场比赛的本队与同场对手表现，精确数值见下方比赛列表。", uiLocale)
      }
    >
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line
            x1="45"
            x2="655"
            y1={y(max * fraction)}
            y2={y(max * fraction)}
            className={styles.chartGuide}
          />
          <text x="40" y={y(max * fraction) - 7}>
            {valueLabel(max * fraction)}
          </text>
        </g>
      ))}
      {['other', 'own'].map((side) => (
        <g key={side} data-line={side}>
          {samples.map((sample, index) =>
            sample[side] === null ? null : (
              <g key={sample.row.match.match_id}>
                {index > 0 && samples[index - 1][side] !== null ? (
                  <line
                    x1={x(index - 1)}
                    y1={y(samples[index - 1][side])}
                    x2={x(index)}
                    y2={y(sample[side])}
                  />
                ) : null}
                <circle cx={x(index)} cy={y(sample[side])} r="4">
                  <title>
                    {sample.row.opponentLabel}: {valueLabel(sample[side])}
                  </title>
                </circle>
              </g>
            )
          )}
        </g>
      ))}
      {samples.map((sample, index) => (
        <text
          key={sample.row.match.match_id}
          className={index > 0 && index < samples.length - 1 ? styles.chartMiddleTick : undefined}
          x={x(index)}
          y="228"
          textAnchor="middle"
        >
          {index === 0 || index === samples.length - 1 || samples.length <= 6
            ? sample.row.timeLabel.split(' ')[0]
            : '·'}
        </text>
      ))}
    </svg>
  )
}

export function TrendSection({ report, research, team, ...context }) {
  const { en, locale, params, updateQuery, withSeason, returnState, onLeave } = context
  const metric =
    PERFORMANCE_METRICS.find((item) => item.id === params.get('trendMetric')) || PERFORMANCE_METRICS[0]
  return (
    <section id="performance-trend" className={styles.section}>
      <PerformanceHeading
        index="↳"
        title={en ? 'Results change. So do the numbers.' : uiText("把变化，放回每一场比赛。", locale)}
        note={
          en
            ? 'Chronological series; no inference about tactical or psychological causes.'
            : uiText("按比赛先后阅读表现，结合对手、地图和样本量判断。", locale)
        }
      />
      <div className={styles.sectionTools}>
        <p>
          {en ? 'Solid: ' : uiText("实线：", locale)}
          {team.shortName} · {en ? 'Dashed: same-match opponents' : uiText("虚线：同场对手", locale)} /10
        </p>
        <MetricChoice
          id={en ? 'Trend metric' : uiText("趋势指标", locale)}
          value={metric.id}
          onChange={(trendMetric) => updateQuery({ trendMetric })}
          en={en}
        />
      </div>
      {report.series.length ? (
        <>
          <SeriesChart series={report.series} metric={metric.id} en={en} />
          <PerformanceEvidence id="trend-series" title={en ? 'Inspect all ' + report.series.length + ' series values' : uiText("核对全部 {0} 场逐场数据", locale, [report.series.length])} {...context}>
          <div className={styles.seriesRows}>
            {report.series.map((item) => (
              <Link
                key={item.row.match.match_id}
                to={withSeason(`/matches/${encodeURIComponent(item.row.match.match_id)}`)}
                state={returnState}
                onClick={onLeave}
              >
                <time>{item.row.timeLabel.split(' ')[0]}</time>
                <span>
                  <b>{item.row.opponentLabel}</b>
                  <small>{item.row.roundLabel}</small>
                </span>
                <strong>{item.row.scoreLabel}</strong>
                <span data-result={item.row.tone}>{resultLabel(item.row.tone, en, locale)}</span>
                <span>
                  {valueLabel(item.paired[metric.id].own.value)}
                  <small>{en ? 'team' : uiText("本队", locale)}</small>
                </span>
                <span>
                  {valueLabel(item.paired[metric.id].opponent.value)}
                  <small>
                    {en ? 'opponent' : uiText("对手", locale)} · {item.paired[metric.id].own.count} {en ? 'maps' : uiText("图", locale)}
                  </small>
                </span>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </div>
          </PerformanceEvidence>
        </>
      ) : (
        <p className={styles.empty}>
          {en ? 'The trend begins with a played series.' : uiText("有实际交手记录后，这里会呈现逐场变化。", locale)}
        </p>
      )}
      <div className={styles.stageCards}>
        {report.stages.map((stage) => (
          <article key={stage.key}>
            <span>{stage.label}</span>
            <h3>{formatDossierRecord(stage.summary, locale)}</h3>
            <p>
              {stage.records.length} {en ? 'scored maps' : uiText("份有效地图", locale)}
            </p>
            <MetricBars
              left={stage.paired[metric.id].own.value}
              right={stage.paired[metric.id].opponent.value}
              leftLabel={team.shortName}
              rightLabel={en ? 'Same-match opponents' : uiText("同场对手", locale)}
            />
          </article>
        ))}
      </div>
      <PerformanceEvidence
        id="series-patterns"
        title={en ? 'Series margins and the order of map results' : uiText("继续看系列赛分差与逐图经过", locale)}
        {...context}
      >
        <SeriesPatterns
          research={research}
          en={en}
          evidenceProps={{ opened: context.opened, onToggle: context.onToggle }}
          withSeason={withSeason}
          returnState={returnState}
          onLeave={onLeave}
        />
      </PerformanceEvidence>
    </section>
  )
}

export function OpponentSection({ report, research, team, seasonId, ...context }) {
  const { en, locale, params, updateQuery, withSeason, returnState, onLeave } = context
  const chosen =
    report.opponents.find((opponent) => opponent.id === params.get('teamOpponent')) || report.opponents[0]
  return (
    <section id="performance-opponents" className={styles.section}>
      <PerformanceHeading
        index="04"
        title={en ? 'The opponent changes the picture.' : uiText("这些表现，发生在谁面前？", locale)}
        note={
          en
            ? 'Choose an actual opponent, then inspect the same-map comparison.'
            : uiText("选择实际交手的对手，再读同一批地图上的双方差异。", locale)
        }
      />
      <div
        className={styles.opponentChoices}
        role="group"
        aria-label={en ? 'Study an opponent' : uiText("研究交手对手", locale)}
      >
        {report.opponents.map((opponent) => (
          <button
            type="button"
            key={opponent.id}
            aria-pressed={chosen?.id === opponent.id}
            onClick={() => updateQuery({ teamOpponent: opponent.id })}
          >
            <TeamLogo team={opponent.team} seasonId={seasonId} className={styles.opponentLogo} />
            <b>{opponent.name}</b>
            <span>
              {opponent.rows.length} {en ? 'series' : uiText("场", locale)}
            </span>
          </button>
        ))}
      </div>
      {chosen ? (
        <div className={styles.opponentReading} aria-live="polite">
          <header>
            <div>
              <span>
                {team.shortName} / {chosen.name}
              </span>
              <h3>{formatDossierRecord(chosen.summary, locale)}</h3>
            </div>
            <p>
              {chosen.records.length} {en ? 'scored maps against this opponent' : uiText("份双方交手的有效地图", locale)}
              <Link
                to={withSeason(getAnalysisTeamPath(chosen.id, params))}
                state={returnState}
                onClick={onLeave}
              >
                {en ? 'Their team analysis' : uiText("进入对手竞技分析", locale)} ↗
              </Link>
            </p>
          </header>
          <div className={styles.opponentMetrics}>
            {PERFORMANCE_METRICS.map((metric) => (
              <article key={metric.id}>
                <h4>{en ? metric.en : uiText(metric.zh, locale)} /10</h4>
                <MetricBars
                  left={chosen.paired[metric.id].own.value}
                  right={chosen.paired[metric.id].opponent.value}
                  leftLabel={team.shortName}
                  rightLabel={chosen.name}
                />
                <small>
                  {chosen.paired[metric.id].own.count} {en ? 'paired maps' : uiText("张双方可比地图", locale)}
                </small>
              </article>
            ))}
          </div>
          {chosen.rows.length > 1 ? (
            <div className={styles.rematchMetrics}>
              <h4>{en ? 'From one meeting to the next' : uiText("每次相遇，表现有何不同", locale)}</h4>
              {chosen.rows.map((row) => {
                const metrics = pairedPerformance(
                  chosen.records.filter((record) => record.match.match_id === row.match.match_id)
                )
                return (
                  <div key={row.match.match_id}>
                    <Link
                      to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)}
                      state={returnState}
                      onClick={onLeave}
                    >
                      <span>
                        {row.timeLabel.split(' ')[0]} · {row.roundLabel}
                      </span>
                      <b>{row.scoreLabel} ↗</b>
                    </Link>
                    <span>
                      {en ? 'Damage' : uiText("伤害", locale)} {valueLabel(metrics.damage.own.value)} /{' '}
                      {valueLabel(metrics.damage.opponent.value)}
                    </span>
                    <span>
                      {en ? 'Deaths' : uiText("死亡", locale)} {valueLabel(metrics.deaths.own.value)} /{' '}
                      {valueLabel(metrics.deaths.opponent.value)}
                    </span>
                  </div>
                )
              })}
              <p>
                {en
                  ? 'Team / opponent, per 10 minutes; each meeting may contain different maps and heroes.'
                  : uiText("依次为本队 / 对手，每 10 分钟。各次交手的地图与英雄可能不同。", locale)}
              </p>
            </div>
          ) : null}
          <PerformanceEvidence
            id={`performance-opponent-${chosen.id}`}
            title={en ? 'Open every map against this opponent' : uiText("展开与这位对手的全部地图记录", locale)}
            {...context}
          >
            <PerformanceRecords records={chosen.records} {...context} />
          </PerformanceEvidence>
          {research.opponents.some((opponent) => opponent.id === chosen.id && opponent.rows.length > 1) ? (
            <PerformanceEvidence
              id="rematch-maps"
              title={en ? 'Compare the map results across meetings' : uiText("进一步对照再次交手的逐图赛果", locale)}
              {...context}
            >
              <OpponentStudy
                research={research}
                selectedOpponent={chosen.id}
                onOpponentChange={(teamOpponent) => updateQuery({ teamOpponent })}
                team={team}
                seasonId={seasonId}
                en={en}
                locale={locale}
                withSeason={withSeason}
                returnState={returnState}
                onLeave={onLeave}
              />
            </PerformanceEvidence>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty}>
          {en ? 'No identified played opponents in this scope.' : uiText("当前范围暂无已识别的实际交手对手。", locale)}
        </p>
      )}
    </section>
  )
}
