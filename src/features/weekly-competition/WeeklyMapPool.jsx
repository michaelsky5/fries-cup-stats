import { formatOwMapName } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import styles from './WeeklyMapPool.module.css'
const TYPES={Control:'占领要点',Hybrid:'攻击护送',Escort:'运载目标',Push:'机动推进',Flashpoint:'闪点作战'}
export default function WeeklyMapPool({ cycle, week, locale }) {
  const pool=week?.map_pool || cycle?.map_pool
  if (!pool) return null
  const en=String(locale).startsWith('en')
  return <details className={styles.pool}><summary>{en?'Current map pool':'当前周期地图池'} <span>{pool.types.reduce((sum,item)=>sum+item.maps.length,0)} {en?'maps':'张地图'}</span></summary>
    <p>{en?'The opening map is Control. Maps cannot repeat within a series.':'首图为占领要点；同一场比赛具体地图不重复。地图池按周期锁定，历史比赛使用当时版本。'}</p>
    <div className={styles.types}>{pool.types.map(group=><section key={group.type}><h3>{en?group.type:TYPES[group.type]}</h3>{group.maps.map(name=><div key={name} className={styles.map}>{getMapImage(group.type,name) && <img src={getMapImage(group.type,name)} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true}}/>}<span>{formatOwMapName(name,locale)}</span></div>)}</section>)}</div>
    <small>{en?'Pool version':'地图池版本'}：{pool.version}</small>
  </details>
}
