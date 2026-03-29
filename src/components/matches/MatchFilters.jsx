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
  const update = patch => onChange(prev => ({ ...prev, ...patch }))

  return (
    <section className={styles.shell}>
      <div className={styles.topLine}>
        <div className={styles.panelTitleGroup}>
          <div className={styles.panelTitle}>筛选条件</div>
          <div className={styles.panelSubTitle}>MATCH FILTERS</div>
        </div>
        <div className={styles.panelMeta}>SCHEDULE CONTROL PANEL</div>
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
              <option value="ALL">全部赛段 / ALL STAGES</option>
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
              <option value="ALL">全部轮次 / ALL ROUNDS</option>
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
              <option value="ALL">所有状态 / ALL STATUS</option>
              <option value="PENDING">未开始 / PENDING</option>
              <option value="IN_PROGRESS">进行中 / LIVE</option>
              <option value="COMPLETE">已完结 / COMPLETE</option>
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
              <option value="ALL">全部赛制 / ALL FORMATS</option>
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
            <input
              className={styles.input}
              value={filters.query}
              onChange={e => update({ query: e.target.value })}
              placeholder="输入队伍名称 / 赛段 / 比赛编号..."
            />
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => onChange({ stage: 'ALL', round: 'ALL', status: 'ALL', format: 'ALL', query: '' })}
          >
            重置参数
            <span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>
      </div>
    </section>
  )
}