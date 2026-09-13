import { Link } from 'react-router-dom'
import { reviewText } from '../../lib/reviewLocale.js'
import styles from './ReviewArchiveSearch.module.css'

const COPY = {
  'zh-CN': {
    title: '找到你的赛季档案',
    subtitle: '选手、队伍与幕后伙伴，都有自己的这一季。',
    placeholder: '搜索昵称、BattleTag 或队名',
    search: '搜索赛季档案',
    all: '全部',
    team: '队伍 / 经理 / 教练',
    filter: '按身份查看',
    hint: '输入名字开始，也可以按身份浏览回顾。',
    results: '份档案',
    browse: '先看这些档案',
    matches: '搜索结果',
    narrow: '继续输入，缩小查找范围。',
    empty: '还没找到这个名字',
    emptyBody: '试试昵称、完整 BattleTag 或队伍简称。',
    reset: '查看全部身份',
    event: '一起重看这一届',
    eventBody: '从瑞士轮、突围赛到冠军之路，重温所有人共同完成的比赛。',
    route: '公开预选赛 → 季后淘汰赛',
    start: '观看赛事回顾'
  },
  'en-US': {
    title: 'Find your season archive',
    subtitle: 'Players, teams, and the people behind the matches.',
    placeholder: 'Search a name, BattleTag, or team',
    search: 'Search season archives',
    all: 'All',
    team: 'Teams / managers / coaches',
    filter: 'Browse by role',
    hint: 'Enter a name, or choose a role to browse the archives.',
    results: 'archives',
    browse: 'Start with these archives',
    matches: 'Search results',
    narrow: 'Keep typing to narrow the results.',
    empty: 'No archive found for this name',
    emptyBody: 'Try a nickname, full BattleTag, or team abbreviation.',
    reset: 'Search all roles',
    event: 'Relive the season together',
    eventBody: 'From the Swiss Round and LCQ to the title run, revisit the event everyone made possible.',
    route: 'Open Qualifier → Playoffs',
    start: 'Watch the event review'
  },
  'ko-KR': {
    title: '내 시즌 아카이브 찾기',
    subtitle: '선수와 팀, 무대 뒤의 동료들에게도 각자의 시즌이 있습니다.',
    placeholder: '닉네임, 배틀태그 또는 팀 검색',
    search: '시즌 아카이브 검색',
    all: '전체',
    team: '팀 / 매니저 / 코치',
    filter: '역할별 보기',
    hint: '이름을 입력하거나 역할을 선택해 기록을 둘러보세요.',
    results: '개 아카이브',
    browse: '이 기록부터 둘러보세요',
    matches: '검색 결과',
    narrow: '계속 입력하면 검색 범위를 좁힐 수 있습니다.',
    empty: '이 이름의 기록을 찾지 못했습니다',
    emptyBody: '닉네임, 전체 배틀태그 또는 팀 약칭으로 검색해 보세요.',
    reset: '모든 역할에서 검색',
    event: '이번 시즌을 함께 다시 보기',
    eventBody: '스위스 라운드와 최종 선발전부터 우승의 길까지, 모두가 함께 만든 대회를 돌아봅니다.',
    route: '공개 예선 → 플레이오프',
    start: '대회 리뷰 보기'
  }
}

export default function ReviewArchiveSearch({
  profile, locale, identity, identities, query, results, visibleResults, activeResultIndex,
  searchPanelRef, searchInputRef, onIdentityChange, onQueryChange, onClear,
  onSearchKeyDown, onActiveResultChange, reviewPath, returnState, getIdentityTitle
}) {
  const copy = COPY[locale] || COPY['zh-CN']
  const filters = [{ id: 'all', shortTitle: copy.all }, ...identities.filter(item => item.id !== 'viewer')]
  const hasResultsContext = Boolean(query.trim()) || identity !== 'all'

  return (
    <div className={styles.hub} ref={searchPanelRef}>
      <section className={styles.finder} aria-labelledby="review-finder-title">
        <div className={styles.sectionLabel}><span>01</span> YOUR SEASON</div>
        <h2 id="review-finder-title">{copy.title}</h2>
        <p className={styles.subtitle}>{copy.subtitle}</p>
        <div className={styles.searchBox}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={copy.placeholder}
            aria-label={copy.search}
            aria-describedby={!hasResultsContext ? 'review-search-hint' : undefined}
            aria-controls={hasResultsContext ? 'review-search-results' : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          {query ? <button type="button" onClick={onClear} aria-label={reviewText(locale, 'clear')}>×</button> : null}
        </div>
        <div className={styles.filters} role="group" aria-label={copy.filter}>
          {filters.map(item => (
            <button key={item.id} type="button" aria-pressed={identity === item.id} onClick={() => onIdentityChange(item.id)}>
              {item.id === 'teamStaff' ? copy.team : item.shortTitle}
            </button>
          ))}
        </div>
        {!hasResultsContext ? <p className={styles.hint} id="review-search-hint">{copy.hint}</p> : null}
      </section>

      {hasResultsContext ? (
        <section className={styles.resultsPanel} aria-labelledby="review-results-title">
          <div className={styles.resultsHead}>
            <h3 id="review-results-title">{query.trim() ? copy.matches : copy.browse}</h3>
            <span role="status" aria-live="polite" aria-atomic="true">{visibleResults.length} {copy.results}</span>
          </div>
          {query.trim() && results.length > visibleResults.length ? <p className={styles.narrowHint}>{copy.narrow}</p> : null}
          <ul className={styles.results} id="review-search-results" data-count={Math.min(visibleResults.length, 3)}>
            {visibleResults.map((item, index) => (
              <li key={item.to}>
                <Link
                  id={`review-search-result-${index}`}
                  to={reviewPath(item.to)}
                  state={returnState}
                  className={activeResultIndex === index ? styles.resultActive : ''}
                  onMouseEnter={() => onActiveResultChange(index)}
                  onFocus={() => onActiveResultChange(index)}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') onSearchKeyDown(event)
                  }}
                >
                  <div className={styles.resultCopy}>
                    <span className={styles.resultType}>{getIdentityTitle(item) || item.label}</span>
                    <strong>{item.title}</strong>
                    <span className={styles.resultSub}>{item.subtitle}</span>
                  </div>
                  <b className={styles.resultArrow} aria-hidden="true">↗</b>
                </Link>
              </li>
            ))}
          </ul>
          {results.length === 0 ? (
            <div className={styles.empty}>
              <strong>{copy.empty}</strong>
              <p>{copy.emptyBody}</p>
              {identity !== 'all' ? <button type="button" onClick={() => onIdentityChange('all')}>{copy.reset} ↗</button> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <Link to={reviewPath('/review/story/tournament')} state={returnState} className={styles.eventCard}>
        <div className={styles.sectionLabel}><span>02</span> OUR SEASON</div>
        <div className={styles.eventIdentity}>
          <img src={profile.logo} alt="" />
          <span>{profile.eventTitle}</span>
        </div>
        <h2>{copy.event}</h2>
        <p>{copy.eventBody}</p>
        <div className={styles.route}>{copy.route}</div>
        <div className={styles.eventAction}><span>{copy.start}</span><b aria-hidden="true">↗</b></div>
      </Link>
    </div>
  )
}
