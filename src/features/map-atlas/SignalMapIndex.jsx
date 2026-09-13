import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import { SignalDataHeading } from '../../components/database/SignalDataHeader.jsx'
import { formatOwMapMode, formatOwMapName } from '../../lib/heroes.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { buildMapAtlas, filterAtlasMaps, formatMapDuration, mapImageUrl } from './mapAtlasModel.js'
import { Arrow, AtlasEmpty, AtlasImage, AtlasNav, percent } from './MapAtlasShared.jsx'
import styles from './MapAtlas.module.css'

export default function SignalMapIndex() {
  const { db, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const location = useLocation()
  const navigationType = useNavigationType()
  const [params, setParams] = useSearchParams()
  const [previewName, setPreviewName] = useState('')
  const atlas = useMemo(() => buildMapAtlas(db), [db])
  const modeParam = params.get('mapMode') || ''
  const mode = atlas.modes.some(item => item.type === modeParam) ? modeParam : ''
  const search = params.get('mapSearch') || ''
  const sort = ['plays', 'name', 'duration'].includes(params.get('mapSort')) ? params.get('mapSort') : 'plays'
  const showDuration = sort === 'duration'
  const visibleMaps = useMemo(() => filterAtlasMaps(atlas.maps, { mode, search, sort }), [atlas, mode, search, sort])
  const selected = visibleMaps.find(map => map.name === previewName) || visibleMaps[0]
  const highestMetric = Math.max(1, ...visibleMaps.map(map => showDuration ? map.avgDuration || 0 : map.count))
  const returnState = getReturnState(location)
  const toMap = map => withSeason(`/maps/${encodeURIComponent(map.routeName)}`)
  const selectedMode = selected && atlas.modes.find(item => item.type === selected.type)
  const filtered = Boolean(mode || search.trim())
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    if (restoreScrollY !== null) restoreWindowScroll(restoreScrollY)
    else if (location.hash) {
      const frame = requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' }))
      return () => cancelAnimationFrame(frame)
    } else if (navigationType === 'PUSH') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.key, location.hash, navigationType, restoreScrollY])

  const updateFilters = values => setParams(previous => {
    const next = new URLSearchParams(previous)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    return next
  }, { replace: true, preventScrollReset: true, flushSync: true })

  return <div className={styles.shell} data-map-atlas="index" data-map-sort={sort} data-i18n-ignore>
    <AtlasNav withSeason={withSeason} locale={locale} />
    <SignalDataHeading compact title={isEn ? 'Where the season unfolded.' : uiText("赛季，发生在这些地图。", locale)} description={isEn ? 'From each map, explore its heroes, team results and matches.' : uiText("从一张地图开始，查看英雄出场、队伍战绩与比赛记录。", locale)}>
      <span><b>{atlas.maps.length}</b> {isEn ? 'recorded maps' : uiText("张地图留下记录", locale)}</span>
      <span>{atlas.totalRecords} {isEn ? 'map records' : uiText("条地图记录", locale)}</span>
    </SignalDataHeading>

    <div className={styles.modeStrip} role="group" aria-label={isEn ? 'Filter maps by mode' : uiText("按模式筛选地图", locale)} style={{ '--map-mode-count': atlas.modes.length + 1 }}>
      {[{ type: '', count: atlas.totalRecords }, ...atlas.modes].map(item => <button type="button" key={item.type} aria-pressed={mode === item.type} aria-controls="map-results" onClick={() => updateFilters({ mapMode: item.type })}>
        <span>{item.type ? formatOwMapMode(item.type, locale) : isEn ? 'All modes' : uiText("全部模式", locale)}</span><small>{item.count} {isEn ? 'records' : uiText("条记录", locale)}</small>
      </button>)}
    </div>
    <div className={styles.indexToolbar}>
      <label className={styles.searchField}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.5" /></svg>
        <ImeSafeInput aria-label={isEn ? 'Find a map' : uiText("搜索地图", locale)} aria-controls="map-results" placeholder={isEn ? 'Find a map…' : uiText("搜索地图中英文名称…", locale)} value={search} onValueChange={value => updateFilters({ mapSearch: value })} />
        {search ? <button type="button" onClick={() => updateFilters({ mapSearch: '' })} aria-label={isEn ? 'Clear search' : uiText("清除搜索", locale)}>×</button> : null}
      </label>
      <select aria-label={isEn ? 'Sort maps' : uiText("地图排序", locale)} value={sort} onChange={event => updateFilters({ mapSort: event.target.value })}>
        <option value="plays">{isEn ? 'Most records' : uiText("记录数最多", locale)}</option><option value="duration">{isEn ? 'Longest avg.' : uiText("平均时长最长", locale)}</option><option value="name">{isEn ? 'Name A–Z' : uiText("名称 A–Z", locale)}</option>
      </select>
    </div>
    <div className={styles.indexLayout}>
      <section className={styles.indexMain} id="map-results" aria-label={isEn ? 'Map index' : uiText("地图索引", locale)}>
        <header className={styles.indexHeading}><div><h2>{search.trim() ? (isEn ? 'Matching maps' : uiText("搜索结果", locale)) : mode ? formatOwMapMode(mode, locale) : (isEn ? 'Season map index' : uiText("赛季地图索引", locale))}</h2><span role="status" aria-live="polite">{visibleMaps.length} / {atlas.maps.length} {isEn ? 'maps' : uiText("张地图", locale)}</span></div>{filtered ? <button type="button" onClick={() => updateFilters({ mapMode: '', mapSearch: '' })}>{isEn ? 'Clear filters' : uiText("清除筛选", locale)} ×</button> : <span className={styles.previewHint}>{isEn ? 'Point to preview · select to explore' : uiText("指向预览 · 点选展开档案", locale)}</span>}</header>
        <div className={styles.indexReading}><p>{isEn ? `Season share uses all ${atlas.totalRecords} map records, including when filtered.` : uiText("赛季占比以全部 {0} 条地图记录为分母，筛选后保持不变。", locale, [atlas.totalRecords])}</p><a href="#map-method">{isEn ? 'About the data' : uiText("统计口径", locale)}<Arrow down /></a></div>
        <div className={styles.indexColumns} aria-hidden="true"><span>{isEn ? 'MAP / MODE' : uiText("地图 / 模式", locale)}</span><span>{showDuration ? (isEn ? 'AVG. TIME' : uiText("平均时长", locale)) : (isEn ? 'COUNT' : uiText("记录数", locale))}</span><span>{isEn ? 'SEASON SHARE' : uiText("赛季占比", locale)}</span></div>
        {visibleMaps.length ? <ol className={styles.mapRows}>
          {visibleMaps.map((map, index) => <li key={map.name} data-selected={selected?.name === map.name} onMouseEnter={() => setPreviewName(map.name)} onFocusCapture={() => setPreviewName(map.name)}>
            <Link to={toMap(map)} state={returnState} onClick={() => saveReturnScroll(location)} className={styles.mapRow}>
              <div className={styles.mapRowIdentity}><span className={styles.rowRank}>{String(sort === 'plays' ? map.rank : index + 1).padStart(2, '0')}</span><AtlasImage src={mapImageUrl(map)} className={styles.mapThumbnail} /><span><strong>{formatOwMapName(map.name, locale)}</strong><small>{formatOwMapMode(map.type, locale)}{!isEn ? <><i> / </i>{map.name}</> : null}</small></span></div>
              <div className={styles.mapRowCount}><span className={styles.countTrack} aria-hidden="true"><i style={{ width: percent((showDuration ? map.avgDuration || 0 : map.count) / highestMetric) }} /></span><strong aria-label={showDuration ? `${isEn ? 'Average map time' : uiText("平均单图时长", locale)} ${formatMapDuration(map.avgDuration)}` : undefined}>{showDuration ? formatMapDuration(map.avgDuration) : map.count}</strong></div>
              <div className={styles.mapRowShare}><span>{percent(map.share)}</span><Arrow /></div>
            </Link>
          </li>)}
        </ol> : <AtlasEmpty title={isEn ? 'No maps found' : uiText("没有找到匹配的地图", locale)} action={atlas.maps.length ? <button type="button" className={styles.textButton} onClick={() => updateFilters({ mapMode: '', mapSearch: '' })}>{isEn ? 'Clear filters' : uiText("清除筛选", locale)} <Arrow /></button> : null}>{atlas.maps.length ? (isEn ? 'Try another name or game mode.' : uiText("试试其他地图名称，或切换比赛模式。", locale)) : (isEn ? 'Map records will appear after results are published.' : uiText("赛事发布地图赛果后，记录会出现在这里。", locale))}</AtlasEmpty>}
        <div className={styles.indexFootnote}><span>{isEn ? 'Published map results' : uiText("来自已发布地图赛果", locale)}</span><span>{showDuration ? (isEn ? 'Average time uses timed records only.' : uiText("平均时长仅统计有效时长记录。", locale)) : (isEn ? 'Record counts reflect results, not map-pick probability.' : uiText("记录数反映赛果分布，不代表选图概率。", locale))}</span></div>
      </section>

      {selected ? <aside className={styles.mapPreview} aria-label={isEn ? 'Selected map preview' : uiText("当前地图预览", locale)}>
        <div className={styles.previewImage}><AtlasImage key={selected.name} src={mapImageUrl(selected)} eager /><span>{formatOwMapMode(selected.type, locale)}<span className={styles.previewRank}><small>{isEn ? 'BY RECORDS' : uiText("记录数排名", locale)}</small><b>{String(selected.rank).padStart(2, '0')}</b></span></span></div>
        <div className={styles.previewCopy}>
          {!isEn ? <span className={styles.eyebrow}>{selected.name.toUpperCase()}</span> : null}<h2>{formatOwMapName(selected.name, locale)}</h2>
          <p>{isEn ? `No. ${selected.modeRank} in ${formatOwMapMode(selected.type, locale)} by map records.` : uiText("按地图记录数，在{0}中排第 {1}。", locale, [formatOwMapMode(selected.type, locale), selected.modeRank])}</p>
          <div className={styles.previewFacts}><div><span>{isEn ? 'Share of this mode' : uiText("模式内占比", locale)}</span><strong>{percent(selected.modeShare)}</strong><small>{selected.count} / {selectedMode.count} {isEn ? 'records' : uiText("条记录", locale)}</small></div><div><span>{isEn ? 'Average map time' : uiText("平均单图时长", locale)}</span><strong>{formatMapDuration(selected.avgDuration)}</strong><small>{selected.durationSamples} {isEn ? 'timed records' : uiText("份时长样本", locale)}</small></div></div>
          <div className={styles.previewMatch}><span>{isEn ? 'LATEST RECORDED MATCH' : uiText("最近一场记录", locale)}</span><p>{selected.records[0]?.a.short}<b>{selected.records[0]?.scoreA ?? '—'} : {selected.records[0]?.scoreB ?? '—'}</b>{selected.records[0]?.b.short}</p></div>
          <Link className={styles.primaryLink} to={toMap(selected)} state={returnState} onClick={() => saveReturnScroll(location)}>{isEn ? 'Explore this map' : uiText("展开地图档案", locale)}<Arrow /></Link>
        </div>
      </aside> : null}
    </div>
    <details className={styles.method} id="map-method" open={location.hash === '#map-method' || undefined}><summary>{isEn ? 'About these records' : uiText("关于这些记录", locale)}</summary><p>{isEn ? 'Only completed series with a named, known-mode map are included. Administrative map results remain in the record count; they do not contribute to play time or hero samples. Map share reflects published results, not map-selection or ban probability.' : uiText("仅统计已结束系列赛中具名且模式明确的地图。单图裁决保留在记录数中，不计入时长和英雄样本。地图占比反映已发布赛果中的分布，不代表选图或禁图概率。", locale)}</p></details>
  </div>
}
