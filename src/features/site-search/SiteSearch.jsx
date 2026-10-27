import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import { getSeasonById } from '../../config/seasons.js'
import { getDb } from '../../lib/db.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { pickUiLocale } from '../../lib/uiText.js'
import KprDialog from '../kpr-design/KprDialog.jsx'
import { buildRosterOverview } from '../roster-overview/rosterOverviewModel.js'
import { searchSite } from './siteSearchModel.js'
import styles from './SiteSearch.module.css'

const GROUP_NAMES = {
  players: ['选手', 'Players', '선수', '選手'],
  teams: ['队伍', 'Teams', '팀', '隊伍'],
  teamStaff: ['队伍职员', 'Team staff', '팀 스태프', '隊伍職員'],
  eventStaff: ['赛事职员', 'Event staff', '대회 스태프', '賽事職員']
}
const STAFF_ROLES = { admin: ['赛管', 'Official', '운영', '賽管'], caster: ['解说', 'Caster', '해설', '解說'] }

// 票 2.21: one header search for players, teams and staff, using the roster directory's
// own search over the public snapshot already in memory. No new API.
export default function SiteSearch({ seasonId, locale, withSeason }) {
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const resultsId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [snapshot, setSnapshot] = useState({ seasonId: '', db: null, failed: false })
  const season = useMemo(() => getSeasonById(seasonId), [seasonId])
  const db = snapshot.seasonId === season.id ? snapshot.db : null
  const failed = snapshot.seasonId === season.id && snapshot.failed

  useEffect(() => {
    if (!open || db) return undefined
    let alive = true
    getDb(season.id).then(data => { if (alive) setSnapshot({ seasonId: season.id, db: data, failed: false }) })
      .catch(() => { if (alive) setSnapshot({ seasonId: season.id, db: null, failed: true }) })
    return () => { alive = false }
  }, [open, db, season.id])
  useEffect(() => {
    if (!open) return undefined
    // showModal() focuses the close button; the field is what people came for.
    // A previous search stays, selected, so typing replaces it.
    const frame = requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const model = useMemo(() => db ? buildRosterOverview(db, season) : null, [db, season])
  const groups = useMemo(() => searchSite(model, query), [model, query])
  const total = groups.reduce((sum, group) => sum + group.total, 0)
  const first = groups[0]?.items[0]
  const title = t('查找', 'Search', '찾기', '查找')
  const close = () => setOpen(false)
  const linkProps = to => ({ to: withSeason(to), state: getReturnState(location), onClick: () => { saveReturnScroll(location); close() } })
  const detail = item => STAFF_ROLES[item.detail] ? t(...STAFF_ROLES[item.detail]) : item.detail

  return <>
    <button type="button" className={styles.trigger} data-site-search aria-label={t('查找选手、队伍或职员', 'Search players, teams or staff', '선수, 팀, 스태프 찾기', '查找選手、隊伍或職員')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg>
    </button>
    <KprDialog open={open} onClose={close} title={title} locale={locale} className={styles.dialog}>
      <div className={styles.body} data-site-search-dialog>
        <label className={styles.field}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg>
          <ImeSafeInput ref={inputRef} type="search" value={query} onValueChange={setQuery} aria-controls={resultsId}
            aria-label={t('选手、队伍或职员', 'Player, team or staff', '선수, 팀 또는 스태프', '選手、隊伍或職員')}
            placeholder={t('选手、队伍、BattleTag…', 'Player, team, BattleTag…', '선수, 팀, BattleTag…', '選手、隊伍、BattleTag…')}
            onKeyDown={event => {
              // A search field swallows the first Esc to clear itself; here Esc always closes.
              if (event.key === 'Escape') { event.preventDefault(); close() }
              if (event.key === 'Enter' && first) { event.preventDefault(); saveReturnScroll(location); close(); navigate(withSeason(first.href), { state: getReturnState(location) }) }
            }} />
        </label>
        <div id={resultsId} className={styles.results}>
          <p className={styles.status} role="status">{failed ? t('赛事数据暂时无法载入，请稍后再试。', 'Event data could not be loaded. Please try again later.', '대회 데이터를 불러올 수 없습니다. 잠시 후 다시 시도하세요.', '賽事數據暫時無法載入，請稍後再試。')
            : !db ? t('正在载入赛事数据…', 'Loading event data…', '대회 데이터를 불러오는 중…', '正在載入賽事數據…')
              : !query.trim() ? t('输入昵称、BattleTag 或队伍简称。', 'Type a nickname, BattleTag or team abbreviation.', '닉네임, BattleTag 또는 팀 약칭을 입력하세요.', '輸入暱稱、BattleTag 或隊伍簡稱。')
                : total ? t(`${total} 条结果`, `${total} results`, `결과 ${total}개`, `${total} 條結果`)
                  : t('没有找到，试试昵称、BattleTag 或队伍简称。', 'Nothing found. Try a nickname, BattleTag or team abbreviation.', '결과가 없습니다. 닉네임, BattleTag 또는 팀 약칭으로 찾아보세요.', '沒有找到，試試暱稱、BattleTag 或隊伍簡稱。')}</p>
          {groups.map(group => <section key={group.id} aria-label={t(...GROUP_NAMES[group.id])}>
            <h3>{t(...GROUP_NAMES[group.id])}<span>{group.total}</span></h3>
            <ul>{group.items.map(item => <li key={item.id}><Link {...linkProps(item.href)}><strong>{item.name}</strong>{detail(item) ? <small>{detail(item)}</small> : null}<span aria-hidden="true">→</span></Link></li>)}</ul>
            {group.total > group.items.length ? <Link className={styles.more} {...linkProps(group.href)}>{t(`查看全部 ${group.total} 条`, `View all ${group.total}`, `${group.total}개 모두 보기`, `查看全部 ${group.total} 條`)} <span aria-hidden="true">→</span></Link> : null}
          </section>)}
        </div>
      </div>
    </KprDialog>
  </>
}
