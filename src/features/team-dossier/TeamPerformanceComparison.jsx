import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { comparisonLabel, comparisonPosition, getComparisonExtent } from './teamPerformanceComparison.js'
import { valueLabel } from './TeamPerformancePrimitives.jsx'
import styles from './TeamPerformanceLead.module.css'

function Reading({ row, ownLabel, referenceLabel, mode, en, onEvidence }) {
  const uiLocale = useUiLocale()
  const direction =
    row.difference === null
      ? null
      : Math.round(row.difference * 10) === 0
        ? 'same'
        : row.difference > 0
          ? 'higher'
          : 'lower'
  const description =
    direction === null
      ? en
        ? 'A relative comparison is unavailable.'
        : uiText("暂时无法计算相对差异。", uiLocale)
      : mode === 'outcome'
        ? en
          ? direction === 'same'
            ? 'Equal on won and lost maps.'
            : `${direction === 'higher' ? 'Higher' : 'Lower'} on won maps than lost maps.`
          : direction === 'same'
            ? uiText("赢图与输图时持平。", uiLocale)
            : uiText("赢图时{0}输图。", uiLocale, [direction === 'higher' ? '高于' : '低于'])
        : direction === 'same'
          ? en
            ? `Level with ${referenceLabel}.`
            : uiText("与{0}持平。", uiLocale, [referenceLabel])
          : en
            ? `${direction === 'higher' ? 'Above' : 'Below'} ${referenceLabel}.`
            : `${direction === 'higher' ? uiText('高于', uiLocale) : uiText('低于', uiLocale)}${referenceLabel}。`
  return (
    <aside
      className={styles.reading}
      id="performance-combat-reading"
      lang={en ? 'en' : 'zh-CN'}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.readingTop}>
        <span>{en ? 'IN FOCUS' : uiText("当前观察", uiLocale)}</span>
        <span>{String(row.index + 1).padStart(2, '0')} / 06</span>
      </div>
      <div className={styles.readingHeadline}>
        <h3>{en ? row.en : uiText(row.zh, uiLocale)}</h3>
        <strong className={styles.difference}>
          {comparisonLabel(row.difference)}
          {direction === 'higher' || direction === 'lower' ? (
            <i aria-hidden="true">{direction === 'higher' ? '↗' : '↘'}</i>
          ) : null}
        </strong>
        <p>{description}</p>
      </div>
      <dl className={styles.readingValues}>
        <div>
          <dt>{ownLabel}</dt>
          <dd>{valueLabel(row.own.value)}</dd>
        </div>
        <div>
          <dt>{referenceLabel}</dt>
          <dd>{valueLabel(row.reference.value)}</dd>
        </div>
      </dl>
      <span className={styles.unit}>{en ? 'Team total per 10 minutes' : uiText("团队每 10 分钟", uiLocale)}</span>
      <p className={styles.metricNote}>
        {en ? row.noteEn : row.noteZh}
        {row.reference.value === 0
          ? en
            ? '. Reference is zero; a percentage difference is undefined.'
            : uiText("。参照为零，相对百分比不适用。", uiLocale)
          : ''}
      </p>
      <div className={styles.readingFooter}>
        <span>
          {row.own.count}{' '}
          {en
            ? mode === 'outcome'
              ? 'won maps'
              : 'team maps'
            : mode === 'outcome'
              ? uiText("份赢图样本", uiLocale)
              : uiText("份本队样本", uiLocale)}
          <br />
          {row.reference.count}{' '}
          {en
            ? mode === 'field'
              ? 'reference teams'
              : mode === 'outcome'
                ? 'lost maps'
                : 'paired maps'
            : mode === 'field'
              ? uiText("支参照队伍", uiLocale)
              : mode === 'outcome'
                ? uiText("份输图样本", uiLocale)
                : uiText("份对手样本", uiLocale)}
        </span>
        <button type="button" onClick={onEvidence}>
          {en ? 'Evidence' : uiText("查看依据", uiLocale)}
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </aside>
  )
}

export default function TeamPerformanceComparison({
  rows,
  selectedId,
  mode,
  team,
  en,
  onSelect,
  onModeChange,
  onEvidence
}) {
  const uiLocale = useUiLocale()
  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  const extent = getComparisonExtent(rows)
  const ownLabel = mode === 'outcome' ? (en ? 'Won maps' : uiText("赢图", uiLocale)) : team.shortName
  const referenceLabel =
    mode === 'field'
      ? en
        ? 'Field median'
        : uiText("赛事中位数", uiLocale)
      : mode === 'paired'
        ? en
          ? 'Opponents'
          : uiText("同场对手", uiLocale)
        : en
          ? 'Lost maps'
          : uiText("输图", uiLocale)
  return (
    <div className={styles.analysisSpread}>
      <Reading
        row={{ ...selected, index: rows.indexOf(selected) }}
        ownLabel={ownLabel}
        referenceLabel={referenceLabel}
        mode={mode}
        en={en}
        onEvidence={onEvidence}
      />
      <div className={styles.comparison}>
        <div className={styles.comparisonTop}>
          <h2 id="performance-comparison-title">
            <small>01 / {en ? 'TEAM PERFORMANCE' : uiText("团队表现", uiLocale)}</small>
            {en ? 'Six measures. One view.' : uiText("六项表现，直接对照。", uiLocale)}
          </h2>
          <span className={styles.chooseHint}>
            {en ? 'Select a measure to read its comparison' : uiText("点选指标，查看对应解读", uiLocale)}
          </span>
        </div>
        <div
          className={styles.modeChoice}
          role="group"
          aria-label={en ? 'Combat comparison' : uiText("团队比较方式", uiLocale)}
        >
          {[
            ['field', '相对赛事', 'The field'],
            ['paired', '同场双方', 'Same-match opponents'],
            ['outcome', '赢图与输图', 'Won vs lost maps']
          ].map(([id, zh, english]) => (
            <button type="button" key={id} aria-pressed={mode === id} onClick={() => onModeChange(id)}>
              {en ? english : zh}
            </button>
          ))}
        </div>
        <div
          className={styles.chart}
          role="group"
          aria-label={en ? 'Six measures relative to the selected reference' : uiText("六项指标相对所选参照的差异", uiLocale)}
        >
          <div className={styles.columnLabels} aria-hidden="true">
            <span>{en ? 'Measure' : uiText("指标", uiLocale)}</span>
            <span className={styles.axisLabels}>
              <span>−{extent}%</span>
              <b>{en ? 'Reference' : uiText("参照", uiLocale)} 0%</b>
              <span>+{extent}%</span>
            </span>
            <span>
              {ownLabel}
              <small>/10 min</small>
            </span>
            <span>
              {referenceLabel}
              <small>/10 min</small>
            </span>
          </div>
          <div className={styles.chartRows}>
            {rows.map((row, index) => {
              const position = comparisonPosition(row.difference, extent)
              const label = en ? row.en : uiText(row.zh, uiLocale)
              return (
                <button
                  type="button"
                  key={row.id}
                  className={styles.chartRow}
                  aria-pressed={row.id === selected.id}
                  aria-controls="performance-combat-reading"
                  onClick={() => onSelect(row.id)}
                  aria-label={`${label} · ${ownLabel} ${valueLabel(row.own.value)} · ${referenceLabel} ${valueLabel(row.reference.value)} · ${en ? 'difference' : uiText("相对差异", uiLocale)} ${comparisonLabel(row.difference)}`}
                >
                  <span className={styles.metricName}>
                    <small>{String(index + 1).padStart(2, '0')}</small>
                    <b>
                      <span className={styles.fullLabel}>{label}</span>
                      <span className={styles.compactLabel}>
                        {en && row.id === 'eliminations' ? 'Elims' : label}
                      </span>
                    </b>
                    <i aria-hidden="true">↗</i>
                  </span>
                  <span className={styles.plot} aria-hidden="true">
                    <span className={styles.plotGrid} />
                    {position === null ? (
                      <span className={styles.missingPlot}>—</span>
                    ) : (
                      <>
                        <span
                          className={styles.plotRange}
                          style={{ left: `${Math.min(50, position)}%`, width: `${Math.abs(position - 50)}%` }}
                        />
                        <span className={styles.plotDot} style={{ left: `${position}%` }} />
                        <span
                          className={styles.plotValue}
                          data-side={position > 65 ? 'left' : 'right'}
                          style={{ left: `${position}%` }}
                        >
                          {comparisonLabel(row.difference)}
                        </span>
                      </>
                    )}
                  </span>
                  <span className={styles.ownValue}>
                    <small>{ownLabel}</small>
                    <b>{valueLabel(row.own.value)}</b>
                  </span>
                  <span className={styles.referenceValue}>
                    <small>{referenceLabel}</small>
                    <b>{valueLabel(row.reference.value)}</b>
                  </span>
                </button>
              )
            })}
          </div>
          <div className={styles.chartFoot}>
            <span>← {en ? 'Below reference' : uiText("低于参照", uiLocale)}</span>
            <span>{en ? 'Above reference' : uiText("高于参照", uiLocale)} →</span>
          </div>
        </div>
        <p className={styles.chartNote}>
          {en
            ? 'Select a measure to read its evidence. Position shows relative difference, not a better–worse rating; all rows share one scale.'
            : uiText("选择指标可查看解读与依据。位置表示相对差异，高低不直接等于好坏；六项使用同一刻度。", uiLocale)}
        </p>
      </div>
    </div>
  )
}
