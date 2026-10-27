import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicSupport } from './usePublicSupport.js'
import styles from './SupporterThanks.module.css'
import { pickUiLocale } from '../../lib/uiText.js'
export default function SupporterThanks({seasonId,withSeason,locale}) {
  const {data}=usePublicSupport(seasonId)
  const [{tick,now},setClock]=useState(()=>({tick:0,now:Date.now()}))
  useEffect(()=>{const id=setInterval(()=>{const now=Date.now();setClock(c=>({tick:c.tick+1,now}))},5000);return ()=>clearInterval(id)},[])
  const names=(data?.supporters || []).filter(s=>s.web && Date.parse(s.endsAt)>now)
  if(!names.length)return null
  const pages=Math.ceil(names.length/10),page=names.slice((tick%pages)*10,(tick%pages+1)*10)
  return <aside aria-label={pickUiLocale(locale,'周赛个人支持感谢','Weekly supporters','주간 대회 후원자','週賽個人支持感謝')} className={styles.strip}><strong>{pickUiLocale(locale,'感谢个人支持','Thank you, supporters','개인 후원에 감사드립니다','感謝個人支持')}</strong>{page.map((s,i)=><span key={i} data-i18n-ignore>{s.displayName}</span>)}<Link to={withSeason('/support')}>{pickUiLocale(locale,'支持进度','Support updates','후원 현황','支持進度')} →</Link></aside>
}
