import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import ImeSafeInput from '../common/ImeSafeInput.jsx'
import styles from './MatchFilters.module.css'

function DualLabel({ cn, en }) {
  return (
    <span className={styles.labelText}>
      <span className={styles.labelCn}>{cn}</span>
      <span className={styles.labelEn}>{en}</span>
    </span>
  )
}

export default function MatchFilters({
  filters,
  onChange,
  stageOptions = [],
  roundOptions = [],
  formatOptions = []
}) {
  const uiLocale = useUiLocale()
  const update = patch => onChange(prev => ({ ...prev, ...patch }))

  return (
    <section className={styles.shell}>
      <div className={styles.topLine}>
        <div className={styles.panelTitleGroup}>
          <div className={styles.panelTitle}>{uiText("筛选条件", uiLocale)}</div>
          <div className={styles.panelSubTitle}>MATCH FILTERS</div>
        </div>
        <div className={styles.panelMeta}>MATCH FILTERS</div>
      </div>

      <div className={styles.main}>
        <div className={styles.group}>
          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="赛段" en="STAGE" />
            </label>
            <select
              className={styles.select}
              value={filters.stage}
              onChange={e => update({ stage: e.target.value })}
            >
              <option value="ALL">{uiText("全部赛段 / ALL STAGES", uiLocale)}</option>
              {stageOptions.filter(v => v !== 'ALL').map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="轮次" en="ROUND" />
            </label>
            <select
              className={styles.select}
              value={filters.round}
              onChange={e => update({ round: e.target.value })}
            >
              <option value="ALL">{uiText("全部轮次 / ALL ROUNDS", uiLocale)}</option>
              {roundOptions.filter(v => v !== 'ALL').map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="状态" en="STATUS" />
            </label>
            <select
              className={styles.select}
              value={filters.status}
              onChange={e => update({ status: e.target.value })}
            >
              <option value="ALL">{uiText("所有状态 / ALL STATUS", uiLocale)}</option>
              <option value="PENDING">{uiText("未开始 / PENDING", uiLocale)}</option>
              <option value="IN_PROGRESS">{uiText("进行中 / LIVE", uiLocale)}</option>
              <option value="COMPLETE">{uiText("已完结 / COMPLETE", uiLocale)}</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <DualLabel cn="赛制" en="FORMAT" />
            </label>
            <select
              className={styles.select}
              value={filters.format}
              onChange={e => update({ format: e.target.value })}
            >
              <option value="ALL">{uiText("全部赛制 / ALL FORMATS", uiLocale)}</option>
              {formatOptions.filter(v => v !== 'ALL').map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.groupRight}>
          <div className={`${styles.field} ${styles.searchField}`}>
            <label className={styles.label}>
              <DualLabel cn="检索" en="SEARCH" />
            </label>
            <ImeSafeInput
              className={styles.input}
              value={filters.query}
              onValueChange={value => update({ query: value })}
              placeholder={uiText("输入队伍名称 / 赛段 / 比赛编号...", uiLocale)}
            />
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => onChange({ stage: 'ALL', round: 'ALL', status: 'ALL', format: 'ALL', query: '' })}
          >{uiText("重置参数", uiLocale)}<span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>
      </div>
    </section>
  )
}
