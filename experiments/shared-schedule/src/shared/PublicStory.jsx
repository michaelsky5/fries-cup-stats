import { useMemo, useState } from 'react'
import { publicStoryScenes, storyText, reviewRoute } from './publicStoryModel'
import { getSeasonName } from './publicSeasons'
import { openCenter } from '../platform'
import { StatsTable } from './CenterViews'
import { PublicHeading, Section, Back, Empty, PublicImage } from './PublicUi'
import { getActiveLocale } from './nativeLocales'
import PosterCard from './PosterCard'
import {posterEntryUrl} from '../poster/posterRoutes'
import Taro from '@tarojs/taro'

function EvidenceCard({ item, selection }) {
  if (typeof item !== 'object' || !item) return <p>{storyText(item)}</p>
  const route = reviewRoute(item.to || item.href || item.storyPath)
  const title = storyText(item.title || item.name || item.label || item.player || item.team)
  const detail = storyText(item.body || item.text || item.description || item.subtitle || item.note)
  return <div className='public-story-note'>{item.avatar || item.image ? <PublicImage src={item.avatar || item.image} className='public-story-portrait' /> : null}{route ? <button className='center-table-link' onClick={() => openCenter(route, selection)}>{title} ↗</button> : <h3>{title}</h3>}<p>{detail}</p>{item.value != null || item.metric != null ? <strong>{storyText(item.value ?? item.metric)} {storyText(item.unit)}</strong> : null}</div>
}
export default function PublicStory({ raw, params, selection, season, onPublicRoute }) {
  const [index, setIndex] = useState(() => Math.max(0, Math.floor(Number(params.scene) || 0)))
  const scenes = useMemo(() => publicStoryScenes(raw, params, getActiveLocale()), [raw, params.story, params.subject, params.role, getActiveLocale()])
  const current = Math.min(index, scenes.length - 1), scene = scenes[current]
  if (!scene) return <><Back view='review' selection={selection} /><Empty>没有找到对应的公开故事。</Empty></>
  const stats = [scene.stats, scene.metrics, scene.witnessStats].filter(Array.isArray).flat()
  const cards = [scene.cards, scene.moments, scene.highlights, scene.mapCards, scene.teamCards, scene.partnerCards, scene.crossPartnerCards, scene.rosterCards, scene.playerCards].filter(Array.isArray).flat()
  function chapter(scene) { setIndex(scene); onPublicRoute?.({ scene }) }
  async function exportReview() {
    try {
      const url = posterEntryUrl(params, season.id)
      if (Taro.getCurrentPages().length >= 8) await Taro.redirectTo({ url })
      else await Taro.navigateTo({ url })
    } catch (_) { await Taro.showToast({ title: '暂时无法打开图片工具', icon: 'none' }) }
  }
  const body = storyText(scene.body), quote = scene.storyQuote
  return <>
    <Back view='review' selection={selection} />
    <div className='public-story'>
      <small>{getSeasonName(season)} · {current + 1} / {scenes.length}</small>
      <PublicHeading title={storyText(scene.title) || '赛事回顾'} lead={storyText(scene.subTitle || scene.eyebrow)} code='REVIEW' />
      <PublicImage src={scene.image} className='public-story-image' />
      {scene.images?.map((item, i) => <PublicImage key={i} src={typeof item === 'string' ? item : item.src || item.url} className='public-story-image' />)}
      <p className='public-story-body'>{body}</p>
      {scene.metric != null ? <div className='public-story-metric'><strong>{storyText(scene.metric)}</strong><small>{storyText(scene.metricLabel)}</small></div> : null}
      {quote ? <blockquote><b>{storyText(quote.title || quote)}</b><p>{storyText(quote.body)}</p></blockquote> : null}
      <div className='public-story-chips'>{scene.chips?.map((chip, i) => <span key={i}>{storyText(chip)}</span>)}</div>
      {stats.length ? <StatsTable rows={stats.filter(item => item && typeof item === 'object').map((item, i) => ({ key: item.label || i, cells: [storyText(item.label || item.title), storyText(item.value ?? item.number) || '—'] }))} /> : null}
      {scene.dataBars?.length ? <Section title='公开记录'><StatsTable columns={['记录', '数值', '说明']} rows={scene.dataBars.map((item, i) => ({ key: i, cells: [storyText(item.label || item.name), storyText(item.value), storyText(item.note || item.unit)] }))} /></Section> : null}
      {scene.timeline?.map((item, i) => <EvidenceCard key={`timeline-${i}`} item={item} selection={selection} />)}
      {cards.map((item, i) => <EvidenceCard key={i} item={item} selection={selection} />)}
      {scene.partnerGroups?.map((group, i) => <Section key={i} title={storyText(group.title || group.label)}>{group.cards?.map((item, j) => <EvidenceCard key={j} item={item} selection={selection} />)}</Section>)}
    </div>
    <button id='public-review-export' className='center-route-card' onClick={exportReview}>纪念票与海报 ↗</button>
    <PosterCard title={storyText(scene.title)} subtitle={getSeasonName(season)} body={body} />
    <div className='center-pagination public-story-controls'>
      <button disabled={current <= 0} onClick={() => chapter(current - 1)}>上一幕</button><span>{current + 1} / {scenes.length}</span><button disabled={current >= scenes.length - 1} onClick={() => chapter(current + 1)}>下一幕</button>
    </div>
    <p className='center-note'>故事来自已归档公开记录，数字与身份沿用 Stats。</p>
  </>
}
