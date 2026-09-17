import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { buildReviewEntryPath, buildReviewPath, getReviewOverviewReturnState } from '../../lib/reviewNavigation.js'
import { getRestoreScrollState } from '../../lib/navigationState.js'
import { getReviewSearchResults, getUnifiedReviewSearchResults } from '../../lib/reviewSearch.js'
import {
  REVIEW_LOCALES,
  getReviewIdentities,
  getReviewPlaceholder,
  getStoredReviewLocale,
  localizeReviewSearchResult,
  normalizeReviewLocale,
  reviewText,
  setStoredReviewLocale
} from '../../lib/reviewLocale.js'
import { getLocalizedReviewSeasonProfile, prepareReviewDb } from '../../lib/reviewSeason.js'
import ReviewArchiveSearch from './ReviewArchiveSearch.jsx'
import styles from './ReviewEntryPage.module.css'

function getCinemaEntryCopy(locale) {
  if (locale === 'en-US') {
    return {
      title: 'This season is playing back for you.',
      body: 'Find your place in the season, or revisit the event we made together.',
    }
  }

  if (locale === 'ko-KR') {
    return {
      title: '이번 시즌을 당신을 위해 다시 상영합니다.',
      body: '내가 남긴 기록을 찾거나, 함께 만든 대회를 다시 만나보세요.',
    }
  }

  return {
    title: uiText("这一季，正在为你重新放映。", locale),
    body: uiText("找回属于你的赛季片段，也重看我们共同完成的这一届。", locale),
  }
}

function getResultIdentityTitle(item, identities, locale) {
  const isGenericTeamReview = item?.identity === 'teamStaff'
    && /^\/review\/story\/team\/[^?]+$/.test(String(item?.to || ''))

  if (isGenericTeamReview) {
    if (locale === 'en-US') return 'Team'
    if (locale === 'ko-KR') return '팀'
    return uiText('队伍', locale)
  }

  return identities.find(entry => entry.id === item?.identity)?.shortTitle || item?.identity
}

function ViewerArchiveCard({ profile, locale, to, returnState }) {
  const isEn = locale === 'en-US'
  const isKo = locale === 'ko-KR'

  return (
    <Link to={to} state={returnState} className={styles.viewerCard}>
      <div className={styles.viewerCardBg}>{profile.shortMark}</div>

      <div className={styles.viewerCardTop}>
        <span>SEASON WITNESS</span>
        <b>EVENT ARCHIVE</b>
      </div>

      <div className={styles.viewerCardMain}>
        <h2>{isEn ? `Open the ${profile.eventTitle} witness review` : isKo ? `${profile.eventTitle} 목격자 리뷰 열기` : uiText("打开 {0}见证回顾", locale, [profile.eventTitle])}</h2>
        <p>
          {profile.isPartner ? (isEn ? 'From the group stage to the single-elimination playoffs, revisit the matches and people of Hammer Cup S4.' : isKo ? '조별 리그부터 싱글 엘리미네이션 플레이오프까지, 해머 컵 S4의 경기와 사람들을 다시 만나보세요.' : uiText('从小组赛到单败淘汰赛，重看全高杯 S4 的比赛与参与其中的人。', locale)) : isEn
            ? 'From the Swiss Round and LCQ to the playoffs and the champion road, look back at the event the players, teams, casters, staff, and every viewer completed together.'
            : isKo
              ? '스위스 라운드와 최종 선발전부터 플레이오프와 우승의 길까지, 선수와 팀, 중계진, 스태프, 그리고 모든 관람객이 함께 완성한 대회를 돌아봅니다.'
              : uiText("从{0}到季后淘汰赛，从瑞士轮、突围赛到冠军之路，回看这届比赛如何被选手、队伍、解说、赛管和每一位观众共同完成。", locale, [profile.routeLabel])}
        </p>
      </div>

      <div className={styles.viewerCardGrid}>
        <div>
          <strong>{profile.routeLabel}</strong>
          <span>{profile.isPartner ? (isEn ? 'Four groups / eight playoff spots' : isKo ? '4개 조 / 플레이오프 8자리' : uiText('四个小组 / 八个晋级席位', locale)) : isEn ? 'Swiss Round / LCQ' : isKo ? '스위스 라운드 / 최종 선발전' : uiText("瑞士轮 / 突围赛", locale)}</span>
        </div>
        <div>
          <strong>{isEn ? 'Playoffs' : isKo ? '플레이오프' : uiText("季后淘汰赛", locale)}</strong>
          <span>{isEn ? 'Top eight / champion road' : isKo ? '8강 / 우승의 길' : uiText("前八队伍 / 冠军之路", locale)}</span>
        </div>
        <div>
          <strong>{isEn ? 'Shared memory' : isKo ? '함께 만든 기억' : uiText("共同记忆", locale)}</strong>
          <span>{isEn ? 'Maps / teams / witnesses' : isKo ? '전장 / 팀 / 목격자' : uiText("地图 / 队伍 / 见证者", locale)}</span>
        </div>
      </div>

      <div className={styles.viewerCardAction}>
        <span>{reviewText(locale, 'viewerStart')}</span>
        <b>→</b>
      </div>
    </Link>
  )
}

export default function ReviewEntryPage() {
  const outlet = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const db = useMemo(() => prepareReviewDb(outlet?.db), [outlet?.db])
  const requestedLocale = searchParams.get('lang')
  const locale = requestedLocale
    ? normalizeReviewLocale(requestedLocale)
    : getStoredReviewLocale(outlet?.locale || 'zh-CN')
  const reviewAvailable = outlet?.reviewAvailable
  const seasonLabel = outlet?.season?.publicCode || outlet?.seasonId || 'FRIES CUP'
  const profile = useMemo(
    () => getLocalizedReviewSeasonProfile(outlet?.season?.id || outlet?.seasonId || db, locale),
    [outlet?.season?.id, outlet?.seasonId, db, locale]
  )
  const isCinemaReview = profile.usesRegularTemplate
  const cinemaCopy = useMemo(() => getCinemaEntryCopy(locale), [locale])
  const requestedIdentity = searchParams.get('identity')
  const allowedIdentities = isCinemaReview
    ? ['player', 'teamStaff', 'admin', 'caster']
    : ['player', 'teamStaff', 'admin', 'caster', 'viewer']
  const identity = allowedIdentities.includes(requestedIdentity) ? requestedIdentity : isCinemaReview ? 'all' : 'player'
  const query = searchParams.get('q') || ''
  const reviewPath = useMemo(
    () => path => buildReviewPath(path, profile.id, locale, searchParams.toString()),
    [locale, profile.id, searchParams]
  )
  const reviewEntryPath = useMemo(
    () => buildReviewEntryPath(profile.id, locale, searchParams.toString(), { query, identity }),
    [locale, profile.id, searchParams, query, identity]
  )
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  const overviewReturn = getReviewOverviewReturnState(location.state, profile.id, locale, searchParams.toString())
  const storyReturnState = {
    returnTo: reviewEntryPath,
    parentReturnTo: overviewReturn.returnTo,
    ...(overviewReturn.returnScrollY === undefined ? {} : { parentReturnScrollY: overviewReturn.returnScrollY })
  }
  const searchPanelRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    setStoredReviewLocale(locale)
    if (!reviewAvailable) return
    const cleanSearch = reviewEntryPath.split('?')[1] || ''
    if (searchParams.toString() === cleanSearch) return
    const next = new URLSearchParams(cleanSearch)
    setSearchParams(next, { replace: true, state: location.state })
  }, [locale, reviewAvailable, reviewEntryPath, searchParams, setSearchParams, location.state])

  const identities = useMemo(() => getReviewIdentities(locale, profile.eventNoun), [locale, profile.eventNoun])
  const selected = identities.find(item => item.id === identity)
  const isViewer = identity === 'viewer'
  const results = useMemo(() => {
    if (isViewer || !db) return []
    const rawResults = isCinemaReview && identity === 'all'
      ? getUnifiedReviewSearchResults(db, query)
      : getReviewSearchResults(db, identity, query)
    return rawResults.map(item => ({
      ...localizeReviewSearchResult(item, locale),
      identity: item.identity
    }))
  }, [db, identity, query, isViewer, isCinemaReview, locale])
  const visibleResults = useMemo(() => {
    if (!isCinemaReview) return results
    const limit = query.trim().length <= 1 ? 12 : 24
    return results.slice(0, limit)
  }, [isCinemaReview, query, results])

  useEffect(() => {
    setActiveResultIndex(current => current >= visibleResults.length ? visibleResults.length - 1 : current)
  }, [visibleResults.length])
  const emptyText = !identity
    ? { title: reviewText(locale, 'emptyChoose'), body: reviewText(locale, 'emptyChooseBody') }
    : query.trim()
      ? { title: reviewText(locale, 'emptySearch'), body: reviewText(locale, 'emptySearchBody') }
      : { title: reviewText(locale, 'emptyFeatured'), body: reviewText(locale, 'emptyFeaturedBody') }
  const panelTitle = !selected
    ? reviewText(locale, 'chooseRole')
    : selected.id === 'viewer'
      ? reviewText(locale, 'viewerStart')
      : query.trim()
        ? `${reviewText(locale, 'searchPrefix')}${selected.shortTitle}${locale === 'en-US' ? ' reviews' : locale === 'ko-KR' ? ' 리뷰' : uiText("回顾", locale)}`
        : `${selected.shortTitle}${reviewText(locale, 'featuredSuffix')}`

  function handleLocaleChange(nextLocale) {
    const normalized = normalizeReviewLocale(nextLocale)
    const nextPath = buildReviewEntryPath(profile.id, normalized, searchParams.toString(), { query, identity })
    const next = new URLSearchParams(nextPath.split('?')[1] || '')
    setSearchParams(next, { replace: true, state: location.state })
  }

  if (!reviewAvailable) {
    return (
      <div className={styles.shell} data-i18n-ignore>
        <section className={styles.unavailable}>
          <div>
            <div className={styles.emptyMark}>{seasonLabel}</div>
            <h1>{reviewText(locale, 'noReview')}</h1>
            <p>{reviewText(locale, 'noReviewBody')}</p>
            <Link to={outlet.withSeason('/')}>
              {locale === 'en-US' ? 'Back to this event' : locale === 'ko-KR' ? '대회 개요로 돌아가기' : uiText('返回本届赛事', locale)} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </div>
    )
  }

  function handleIdentitySelect(nextIdentity) {
    updateSearch(!isCinemaReview || nextIdentity === 'viewer' ? '' : query, nextIdentity)
    setActiveResultIndex(-1)

    if (isCinemaReview) return

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

  function updateSearch(nextQuery, nextIdentity = identity) {
    const nextPath = buildReviewEntryPath(profile.id, locale, searchParams.toString(), { query: nextQuery, identity: nextIdentity })
    setSearchParams(new URLSearchParams(nextPath.split('?')[1]), { replace: true, preventScrollReset: true, state: location.state })
    setActiveResultIndex(-1)
  }

  function clearSearch() {
    updateSearch('')
    setActiveResultIndex(-1)
    window.requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  function handleSearchKeyDown(event) {
    if (event.nativeEvent?.isComposing) return

    if (event.key === 'Escape' && query) {
      event.preventDefault()
      clearSearch()
      return
    }

    if (!visibleResults.length) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (isCinemaReview) {
        const nextIndex = activeResultIndex < 0
          ? direction > 0 ? 0 : visibleResults.length - 1
          : (activeResultIndex + direction + visibleResults.length) % visibleResults.length
        setActiveResultIndex(nextIndex)
        document.getElementById(`review-search-result-${nextIndex}`)?.focus()
        return
      }
      setActiveResultIndex(current => {
        if (current < 0) return direction > 0 ? 0 : visibleResults.length - 1
        return (current + direction + visibleResults.length) % visibleResults.length
      })
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const result = visibleResults[activeResultIndex >= 0 ? activeResultIndex : 0]
      if (result?.to) navigate(reviewPath(result.to), { state: storyReturnState })
    }
  }

  return (
    <div className={`${styles.shell} ${isCinemaReview ? styles.cinemaShell : ''}`} data-i18n-ignore>
      <Link className={styles.overviewReturn} to={overviewReturn.returnTo} state={getRestoreScrollState(overviewReturn.returnScrollY)}>
        <span aria-hidden="true">←</span> {locale === 'en-US' ? 'Back to overview' : locale === 'ko-KR' ? '대회 개요로 돌아가기' : uiText('返回赛事总览', locale)}
      </Link>
      <section className={styles.hero}>
        <div className={styles.heroBgText}>REVIEW</div>
        {isCinemaReview ? <div className={styles.projectorLens} aria-hidden="true" /> : null}

        <div className={styles.heroSignal} aria-hidden="true">
          <span>SIGNAL FOUND</span>
          <i />
          <b>{profile.mark}</b>
        </div>

        <div className={styles.heroTopline}>
          <div className={styles.kicker}>{profile.shortMark} / {isCinemaReview ? 'NOW SHOWING' : 'MEMORY SIGNAL'}</div>
          <div className={styles.heroToplineActions}>
            <div className={styles.reviewLocaleSwitch} aria-label={uiText('回顾语言', locale)}>
              {REVIEW_LOCALES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === locale ? styles.reviewLocaleActive : ''}
                  aria-pressed={item.id === locale}
                  onClick={() => handleLocaleChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.archiveTag}>{isCinemaReview ? 'SEASON PICTURE ARCHIVE' : 'SEASON ARCHIVE // ONLINE'}</div>
          </div>
        </div>

        <div className={styles.heroMain}>
          <div>
            <h1>{isCinemaReview ? cinemaCopy.title : reviewText(locale, 'heroTitle')}</h1>
            <p>{isCinemaReview ? cinemaCopy.body : reviewText(locale, 'heroBody')}</p>
          </div>

          <div className={styles.heroArchivePanel} aria-hidden="true">
            <div className={styles.heroArchiveLogo}>
              <img src={profile.logo} alt="" />
              <span>{profile.shortMark}</span>
            </div>

            <div className={styles.heroStats}>
              <div>
                <strong>2026</strong>
                <span>SEASON</span>
              </div>
              <div>
                <strong>{isCinemaReview ? '2' : '5'}</strong>
                <span>{isCinemaReview ? 'ACTS' : 'IDENTITIES'}</span>
              </div>
              <div>
                <strong>{isCinemaReview ? 'PREMIERE' : 'STORY'}</strong>
                <span>{isCinemaReview ? 'SEASON FILM' : 'MEMORY SIGNAL'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isCinemaReview ? (
      <section className={styles.identitySection} aria-label={reviewText(locale, 'selectIdentity')}>
        <div className={styles.mobileIdentityHead}>
          <span>{reviewText(locale, 'selectIdentity')}</span>
          <b>{reviewText(locale, 'swipe')}</b>
        </div>

        <div className={styles.identityGrid}>
          {identities.map(item => {
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
                  <span className={styles.identityNo}>CH {item.no}</span>
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
      ) : null}

      {isCinemaReview ? (
        <ReviewArchiveSearch
          profile={profile}
          locale={locale}
          identity={identity}
          identities={identities}
          query={query}
          results={results}
          visibleResults={visibleResults}
          activeResultIndex={activeResultIndex}
          searchPanelRef={searchPanelRef}
          searchInputRef={searchInputRef}
          onIdentityChange={handleIdentitySelect}
          onQueryChange={updateSearch}
          onClear={clearSearch}
          onSearchKeyDown={handleSearchKeyDown}
          onActiveResultChange={setActiveResultIndex}
          reviewPath={reviewPath}
          returnState={storyReturnState}
          getIdentityTitle={item => getResultIdentityTitle(item, identities, locale)}
        />
      ) : (
      <section ref={searchPanelRef} className={`${styles.searchPanel} ${isViewer ? styles.searchPanelViewer : ''}`}>
        <div className={styles.panelGlow} />

        <div className={styles.searchHead}>
          <div>
            <div className={styles.searchTitle}>{panelTitle}</div>
            <div className={styles.searchSub}>{!selected ? 'SELECT YOUR ROLE FIRST' : selected.id === 'viewer' ? 'SEASON WITNESS ARCHIVE' : query.trim() ? 'MATCHED SEASON ARCHIVES' : 'FEATURED SEASON ARCHIVES'}</div>
          </div>

          <div className={styles.searchMeta}>
            <span>{selected?.en || 'NO ROLE'}</span>
            <strong>{isViewer ? 'ALL' : results.length}</strong>
          </div>
        </div>

        {isViewer ? (
          <ViewerArchiveCard profile={profile} locale={locale} to={reviewPath('/review/story/tournament')} returnState={storyReturnState} />
        ) : (
          <>
            <div className={styles.searchBox}>
              <input
                ref={searchInputRef}
                className={styles.searchInput}
                value={query}
                onChange={event => {
                  updateSearch(event.target.value)
                  setActiveResultIndex(-1)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={getReviewPlaceholder(locale, identity)}
                aria-label={getReviewPlaceholder(locale, identity)}
                aria-controls="review-search-results"
                aria-activedescendant={activeResultIndex >= 0 ? `review-search-result-${activeResultIndex}` : undefined}
                autoComplete="off"
                spellCheck="false"
                disabled={!identity}
              />

              {query ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={clearSearch}
                >
                  {reviewText(locale, 'clear')}
                </button>
              ) : null}
            </div>

            <div className={styles.resultsHead}>
              <div>
                <span>{query.trim() ? 'SEARCH RESULTS' : 'RECOMMENDED'}</span>
                <strong>{reviewText(locale, query.trim() ? 'matchedHint' : 'resultsHint')}</strong>
              </div>
              <div className={styles.countPill} aria-live="polite" aria-atomic="true">
                {results.length} RESULTS
              </div>
            </div>

            <div id="review-search-results" className={styles.results} aria-live="polite">
              {!identity || results.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIntro}>
                    <div className={styles.emptyMark}>{profile.shortMark}</div>
                    <strong>{emptyText.title}</strong>
                    <p>{emptyText.body}</p>
                  </div>

                </div>
              ) : (
                visibleResults.map((item, index) => (
                  <Link
                    id={`review-search-result-${index}`}
                    key={item.id}
                    to={reviewPath(item.to)}
                    state={storyReturnState}
                    className={`${styles.resultItem} ${activeResultIndex === index ? styles.resultItemActive : ''}`}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onFocus={() => setActiveResultIndex(index)}
                  >
                    <div className={styles.resultIndex}>{String(index + 1).padStart(2, '0')}</div>

                    <div className={styles.resultBadge}>
                      {item.identity
                        ? `${getResultIdentityTitle(item, identities, locale)} · ${item.label}`
                        : item.label}
                    </div>

                    <div className={styles.resultMain}>
                      <div className={styles.resultTitle}>{item.title}</div>
                      <div className={styles.resultSub}>{item.subtitle}</div>
                    </div>

                    <div className={styles.resultAction}>
                      <span>{reviewText(locale, 'openReview')}</span>
                      <b>→</b>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </section>
      )}
    </div>
  )
}
