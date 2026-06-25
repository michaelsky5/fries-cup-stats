import { useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getReviewSearchResults } from '../../lib/reviewSearch.js'
import styles from './ReviewEntryPage.module.css'

const IDENTITIES = [
  {
    id: 'player',
    no: '01',
    title: '我是选手',
    shortTitle: '选手',
    en: 'PLAYER',
    desc: '回看你的英雄、地图、数据与赛季轨迹。',
    hint: '英雄池、出场地图、代表瞬间'
  },
  {
    id: 'teamStaff',
    no: '02',
    title: '我是经理 / 教练',
    shortTitle: '经理 / 教练',
    en: 'MANAGER / COACH',
    desc: '打开你带过的队伍，回看它怎么走完这个赛季。',
    hint: '队伍旅程、阶段战绩、最终排名'
  },
  {
    id: 'admin',
    no: '03',
    title: '我是赛管',
    shortTitle: '赛管',
    en: 'STAFF',
    desc: '回看你参与过的比赛、阶段、队伍与协作记录。',
    hint: '幕后场次、参与阶段、协作记录'
  },
  {
    id: 'caster',
    no: '04',
    title: '我是解说',
    shortTitle: '解说',
    en: 'CASTER',
    desc: '回看你解说过的比赛、阶段、队伍与搭档。',
    hint: '解说场次、见证队伍、搭档回顾'
  },
  {
    id: 'viewer',
    no: '05',
    title: '我是观众',
    shortTitle: '观众',
    en: 'WITNESS',
    desc: '作为见证者，回看这届学院赛如何被所有人共同完成。',
    hint: '赛事见证、冠军之路、共同记忆'
  }
]

function getPlaceholder(identity) {
  if (identity === 'player') return '输入选手昵称 / 战网 ID / 队伍简称'
  if (identity === 'teamStaff') return '输入经理 / 教练 / 队伍名 / 队伍简称'
  if (identity === 'admin') return '输入赛管名字'
  if (identity === 'caster') return '输入解说名字'
  if (identity === 'viewer') return '观众回顾不需要搜索，直接开启赛事见证回顾'
  return '先选择身份'
}

function getPanelTitle(selected, query) {
  if (!selected) return '先选择你的身份'
  if (selected.id === 'viewer') return '开启赛事见证回顾'
  if (query.trim()) return `搜索你的${selected.shortTitle}回顾`
  return `${selected.shortTitle}推荐回顾`
}

function getPanelSub(selected, query) {
  if (!selected) return 'SELECT YOUR ROLE FIRST'
  if (selected.id === 'viewer') return 'SEASON WITNESS ARCHIVE'
  if (query.trim()) return 'MATCHED SEASON ARCHIVES'
  return 'FEATURED SEASON ARCHIVES'
}

function getEmptyText(identity, query) {
  if (!identity) {
    return {
      title: '请选择身份',
      body: '选择身份后，这里会出现可以开启的赛季回顾。'
    }
  }

  if (query.trim()) {
    return {
      title: '没有找到结果',
      body: '可以试试战网 ID、队伍简称、中文名，或输入更短的关键词。'
    }
  }

  return {
    title: '暂无推荐结果',
    body: '当前身份下暂时没有可展示的默认回顾，可以输入关键词搜索。'
  }
}

function ViewerArchiveCard() {
  const { withSeason = path => path } = useOutletContext()

  return (
    <Link to={withSeason('/review/story/tournament')} className={styles.viewerCard}>
      <div className={styles.viewerCardBg}>FCA26</div>

      <div className={styles.viewerCardTop}>
        <span>SEASON WITNESS</span>
        <b>EVENT ARCHIVE</b>
      </div>

      <div className={styles.viewerCardMain}>
        <h2>打开 2026 薯条杯学院赛见证回顾</h2>
        <p>
          从公开预选赛到季后淘汰赛，从瑞士轮、突围赛到冠军之路，回看这届比赛如何被选手、队伍、解说、赛管和每一位观众共同完成。
        </p>
      </div>

      <div className={styles.viewerCardGrid}>
        <div>
          <strong>公开预选赛</strong>
          <span>瑞士轮 / 突围赛</span>
        </div>
        <div>
          <strong>季后淘汰赛</strong>
          <span>前八队伍 / 冠军之路</span>
        </div>
        <div>
          <strong>共同记忆</strong>
          <span>地图 / 队伍 / 见证者</span>
        </div>
      </div>

      <div className={styles.viewerCardAction}>
        <span>开启赛事见证回顾</span>
        <b>→</b>
      </div>
    </Link>
  )
}

export default function ReviewEntryPage() {
  const outlet = useOutletContext()
  const db = outlet?.db
  const locale = outlet?.locale || 'zh-CN'
  const reviewAvailable = outlet?.reviewAvailable
  const seasonLabel = outlet?.season?.publicCode || outlet?.seasonId || 'FRIES CUP'
  const withSeason = outlet?.withSeason || (path => path)
  const [identity, setIdentity] = useState('player')
  const [query, setQuery] = useState('')
  const searchPanelRef = useRef(null)

  const selected = IDENTITIES.find(item => item.id === identity)
  const isViewer = identity === 'viewer'
  const results = useMemo(() => {
    if (isViewer || !db) return []
    return getReviewSearchResults(db, identity, query)
  }, [db, identity, query, isViewer])
  const emptyText = getEmptyText(identity, query)

  if (!reviewAvailable) {
    return (
      <div className={styles.shell}>
        <section className={styles.searchPanel}>
          <div className={styles.empty}>
            <div className={styles.emptyMark}>{seasonLabel}</div>
            <strong>{locale === 'en-US' ? 'No review data available for this season' : '当前赛季暂无回顾数据'}</strong>
            <p>{locale === 'en-US' ? 'Season review content will appear here after it is published.' : '当前赛季还没有发布回顾内容。'}</p>
          </div>
        </section>
      </div>
    )
  }

  function handleIdentitySelect(nextIdentity) {
    setIdentity(nextIdentity)
    setQuery('')

    if (typeof window === 'undefined') return

    const isMobile = window.matchMedia?.('(max-width: 760px)').matches
    if (!isMobile) return

    window.requestAnimationFrame(() => {
      searchPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroBgText}>REVIEW</div>

        <div className={styles.heroTopline}>
          <div className={styles.kicker}>2026 FRIES CUP SEASON REVIEW</div>
          <div className={styles.archiveTag}>SEASON REVIEW ARCHIVE</div>
        </div>

        <div className={styles.heroMain}>
          <div>
            <h1>这一次，不只是看数据。</h1>
            <p>
              选择你的身份，找到你的名字。薯条杯会把你的比赛、队伍、解说、赛管记录，或作为见证者看见的整届赛事，整理成一段可以一页页看完的赛季故事。
            </p>
          </div>

          <div className={styles.heroStats} aria-hidden="true">
            <div>
              <strong>2026</strong>
              <span>SEASON</span>
            </div>
            <div>
              <strong>5</strong>
              <span>IDENTITIES</span>
            </div>
            <div>
              <strong>STORY</strong>
              <span>FULLSCREEN REVIEW</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.identitySection} aria-label="选择你的赛季回顾身份">
        <div className={styles.mobileIdentityHead}>
          <span>选择身份</span>
          <b>左右滑动</b>
        </div>

        <div className={styles.identityGrid}>
          {IDENTITIES.map(item => {
            const active = identity === item.id

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={`${styles.identityCard} ${active ? styles.identityCardActive : ''} ${item.id === 'viewer' ? styles.identityCardViewer : ''}`}
                onClick={() => handleIdentitySelect(item.id)}
              >
                <div className={styles.identityHead}>
                  <span className={styles.identityNo}>{item.no}</span>
                  <span className={styles.identityEn}>{item.en}</span>
                </div>

                <strong>{item.title}</strong>
                <p>{item.desc}</p>

                <div className={styles.identityHint}>
                  <span>{item.hint}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section ref={searchPanelRef} className={`${styles.searchPanel} ${isViewer ? styles.searchPanelViewer : ''}`}>
        <div className={styles.panelGlow} />

        <div className={styles.searchHead}>
          <div>
            <div className={styles.searchTitle}>{getPanelTitle(selected, query)}</div>
            <div className={styles.searchSub}>{getPanelSub(selected, query)}</div>
          </div>

          <div className={styles.searchMeta}>
            <span>{selected?.en || 'NO ROLE'}</span>
            <strong>{isViewer ? 'ALL' : results.length}</strong>
          </div>
        </div>

        {isViewer ? (
          <ViewerArchiveCard />
        ) : (
          <>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={getPlaceholder(identity)}
                disabled={!identity}
              />

              {query ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setQuery('')}
                >
                  清空
                </button>
              ) : null}
            </div>

            <div className={styles.resultsHead}>
              <div>
                <span>{query.trim() ? 'SEARCH RESULTS' : 'RECOMMENDED'}</span>
                <strong>{query.trim() ? '根据关键词匹配你的赛季档案' : '先从推荐名单开始，也可以直接搜索'}</strong>
              </div>
              <div className={styles.countPill}>{results.length} RESULTS</div>
            </div>

            <div className={styles.results}>
              {!identity || results.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyMark}>FCA26</div>
                  <strong>{emptyText.title}</strong>
                  <p>{emptyText.body}</p>
                </div>
              ) : (
                results.map((item, index) => (
                  <Link key={item.id} to={withSeason(item.to)} className={styles.resultItem}>
                    <div className={styles.resultIndex}>{String(index + 1).padStart(2, '0')}</div>

                    <div className={styles.resultBadge}>{item.label}</div>

                    <div className={styles.resultMain}>
                      <div className={styles.resultTitle}>{item.title}</div>
                      <div className={styles.resultSub}>{item.subtitle}</div>
                    </div>

                    <div className={styles.resultAction}>
                      <span>开启回顾</span>
                      <b>→</b>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
