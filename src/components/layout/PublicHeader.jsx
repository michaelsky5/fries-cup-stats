import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { SEASONS } from '../../config/seasons.js'
import { LOCALES } from '../../lib/locales.js'
import { pickUiLocale } from '../../lib/uiText.js'
import AuthButton from '../../features/auth/AuthDialog.jsx'
import AccountModeSwitch from '../../features/auth/AccountModeSwitch.jsx'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import EventContextBar from './EventContextBar.jsx'
import SiteSearch from '../../features/site-search/SiteSearch.jsx'
import PublicMobileNav, { PublicMobileMenu } from './PublicMobileNav.jsx'
import mobileStyles from './PublicMobileNav.module.css'
import { getEventNavigation, getPrimaryNavigation, getPersonalNavItem, getNavLabel, getWeeklyNavigationPath } from './publicNavigation.js'
import styles from '../../features/fd-design/layoutStyles.js'

// Older preview designs still list 「我的空间」 in the masthead with this count; the default design shows it on the avatar.
function AccountAttentionBadge({ attention }) {
  if (!attention?.visible) return null

  return (
    <span className={styles.navAttention} aria-label={attention.ariaLabel} title={attention.ariaLabel}>
      {attention.showTaskBadge ? <span>{attention.taskBadge}</span> : null}
      {attention.unreadNotificationCount ? <span>{attention.unreadBadge}</span> : null}
    </span>
  )
}

function PortalNavItem({ item, activeGroup, locale, to, accountAttention }) {
  const label = getNavLabel(item, locale)

  return (
    <Link
      to={to}
      data-nav-group={item.group}
      aria-current={activeGroup === item.group ? 'page' : undefined}
      className={[
        styles.navLink,
        activeGroup === item.group ? styles.navLinkActive : ''
      ].filter(Boolean).join(' ')}
    >
      <span className={styles.navLabel}>{label}</span>
      {item.group === 'space' ? <AccountAttentionBadge attention={accountAttention} /> : null}
    </Link>
  )
}

function MobileNavItem({ item, activeGroup, locale, to, accountAttention, following = false }) {
  const label = getNavLabel(item, locale)

  return (
    <Link
      to={to}
      data-nav-group={item.group}
      data-following-item={following || undefined}
      aria-current={activeGroup === item.group ? 'page' : undefined}
      onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}
      className={[
        styles.mobileNavLink,
        activeGroup === item.group ? styles.mobileNavLinkActive : ''
      ].filter(Boolean).join(' ')}
    >
      <span className={styles.mobileNavItemLabel}>{label}</span>
      <span className={styles.mobileNavItemMeta}>
        {item.group === 'space' ? <AccountAttentionBadge attention={accountAttention} /> : null}
      </span>
    </Link>
  )
}

const LANGUAGE_OPTIONS = LOCALES.map(item => ({ ...item, nativeName: item.label }))

function LanguageMenu({ locale, mobile = false, onLocaleChange }) {
  const detailsRef = useRef(null)
  const options = LANGUAGE_OPTIONS
  const current = options.find(option => option.id === locale) || options[0]

  useEffect(() => {
    if (mobile) return undefined

    const closeMenu = event => {
      const details = detailsRef.current
      if (!details?.open) return

      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        details.removeAttribute('open')
        details.querySelector('summary')?.focus()
        return
      }

      if (!details.contains(event.target)) details.removeAttribute('open')
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [mobile])

  const renderOption = option => (
    <button
      key={option.id}
      type="button"
      className={`${styles.languageOption} ${option.id === locale ? styles.languageOptionActive : ''}`}
      aria-pressed={option.id === locale}
      onClick={event => {
        event.currentTarget.closest('details')?.removeAttribute('open')
        onLocaleChange(option.id)
      }}
    >
      <span>{option.code}</span>
      <strong>{option.nativeName}</strong>
      <i aria-hidden="true">{option.id === locale ? '●' : '○'}</i>
    </button>
  )

  if (mobile) {
    return (
      <section className={styles.mobileLanguageMenu} aria-label={uiText('语言', locale)} data-i18n-ignore>
        <header className={styles.mobileLanguageHeader}>
          <span>{uiText('语言', locale)}</span>
          <strong>{current.code}</strong>
        </header>
        <div className={styles.mobileLanguageOptions}>
          {options.map(renderOption)}
        </div>
      </section>
    )
  }

  return (
    <details ref={detailsRef} className={styles.languageMenu} data-upgrade-language data-i18n-ignore>
      <summary aria-label={`${uiText('语言', locale)}: ${current.nativeName}`}>
        <strong>{current.code}</strong>
        <span>LANGUAGE</span>
      </summary>
      <div className={styles.languageMenuPanel}>
        <header>
          <span>{uiText('选择语言', locale)}</span>
          <strong>{current.code}</strong>
        </header>
        {options.map(renderOption)}
      </div>
    </details>
  )
}

export default function PublicHeader({ isKprHybridDesign = true, mobileMenuRef, activeGroup = "space", layoutLocale = "zh-CN", compatibleLayoutLocale = layoutLocale, withSeason = path => path, accountAttention, activeNavLabel = "我的空间", season, seasonId, updatedAtText = "", seasonStatus, summary, isSyncing = false, dataStatus, handleSeasonChange, headerContextMode = "data", isReviewEntryRoute = false, handleLocaleChange, activeSection, showSeason = true, showLanguage = true, accountControl, showAccountModeSwitch = true }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const fallbackMenuRef = useRef(null)
  const menuRef = mobileMenuRef || fallbackMenuRef
  const headerNavItems = getPrimaryNavigation(isAuthenticated).filter(item => !season?.partnerTrial || !['advance', 'play', 'space'].includes(item.group))
  // 票 2.67: in the default design the masthead and its shared menu list the event pages only; personal pages sit with
  // the account control. Phones keep their own navigation (all items); older preview designs are left as they were.
  const eventNavItems = isKprHybridDesign ? getEventNavigation(headerNavItems) : headerNavItems
  const followingItem = isKprHybridDesign && !isAuthenticated ? headerNavItems.find(item => item.group === 'space') : null
  const navPath = path => withSeason(getWeeklyNavigationPath(path, location.search, season?.rules?.weeklyCompetition?.enabled || season?.competitionFormat === 'WEEKLY'))
  const currentLabel = activeGroup === 'space' ? getNavLabel(getPersonalNavItem(isAuthenticated), layoutLocale) : activeNavLabel
  const phoneNavigation = isKprHybridDesign && !/^\/dev(?:\/|$)/.test(location.pathname) && !/\/room\/?$/.test(location.pathname)

  useEffect(() => { menuRef.current?.removeAttribute('open') }, [location.key, isAuthenticated, menuRef])
  useEffect(() => {
    const closeMenu = event => {
      const menu = menuRef.current
      if (!menu?.open) return
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        menu.removeAttribute('open')
        menu.querySelector('summary')?.focus()
      } else if (!menu.contains(event.target)) menu.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [menuRef])
  return (<>
      <header className={styles.topShell} data-upgrade-header="event-center" data-phone-navigation={phoneNavigation || undefined}>
        <div className={styles.topBar} data-upgrade-bar>
          <a href="https://fries-cup.com/" className={`${styles.brandLink} ${phoneNavigation ? mobileStyles.desktopBrand : ''}`} data-upgrade-brand aria-label={pickUiLocale(layoutLocale, '薯条杯赛事中心 · 返回薯条杯官网', 'FriesCup official site', '프라이즈 컵 공식 사이트로 이동', '薯條杯賽事中心 · 返回薯條杯官網')}>
            <span className={styles.brandEventMark} data-upgrade-mark aria-hidden="true">
              <img src={isKprHybridDesign ? '/logos/fries-cup-mark-ink.svg' : '/logos/fc_logo.svg'} alt="" />
            </span>
            {isKprHybridDesign ? (
              <span className={styles.brandTypeLockup} data-upgrade-lockup aria-hidden="true" data-i18n-ignore>
                <strong>FRIES CUP</strong>
                <small lang={layoutLocale}>{pickUiLocale(layoutLocale, '赛事中心', 'EVENT CENTER', '대회 센터', '賽事中心')}</small>
              </span>
            ) : (
              <span className={styles.brandWordMark} aria-hidden="true">
                <img src="/logos/fc_data_center.svg" alt="" />
              </span>
            )}
          </a>
          {phoneNavigation ? <Link to={navPath('/')} className={`${styles.brandLink} ${mobileStyles.mobileBrand}`} aria-label={pickUiLocale(layoutLocale, '薯条杯赛事首页', 'Fries Cup events', '프라이즈 컵 대회', '薯條杯賽事首頁')}>
            <span className={styles.brandEventMark} data-upgrade-mark aria-hidden="true"><img src="/logos/fries-cup-symbol.png" alt="" /></span>
            <span className={styles.brandTypeLockup} data-upgrade-lockup aria-hidden="true" data-i18n-ignore><strong>FRIES CUP</strong><small>{pickUiLocale(layoutLocale, '赛事中心', 'EVENT CENTER', '대회 센터', '賽事中心')}</small></span>
          </Link> : null}

          <nav className={styles.nav} data-upgrade-nav aria-label={pickUiLocale(layoutLocale, '赛事中心导航', 'Event navigation', '대회 센터 탐색', '賽事中心導覽')} data-i18n-ignore>
            {eventNavItems.map(item => (
              <PortalNavItem
                key={item.group}
                item={item}
                activeGroup={activeGroup}
                locale={layoutLocale}
                to={navPath(item.to)}
                accountAttention={accountAttention}
              />
            ))}
          </nav>

          <details ref={menuRef} className={styles.mobileNavMenu} data-upgrade-menu data-i18n-ignore>
            <summary aria-label={`${currentLabel} · ${pickUiLocale(layoutLocale, '菜单', 'Menu', '메뉴', '選單')}`}>
              <span className={styles.mobileNavCurrent}>{currentLabel}</span>
              <span className={styles.mobileNavSummaryMeta}>
                {isKprHybridDesign ? null : <AccountAttentionBadge attention={accountAttention} />}
                {/* 票 2.80: a menu icon instead of the English word MENU. */}
                <b className={styles.mobileMenuLabel} aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg></b>
              </span>
            </summary>
            <nav className={styles.mobileNavPanel} aria-label={pickUiLocale(layoutLocale, '赛事中心菜单', 'Event menu', '대회 센터 메뉴', '賽事中心選單')}>
              {eventNavItems.map(item => (
                <MobileNavItem
                  key={item.group}
                  item={item}
                  activeGroup={activeGroup}
                  locale={layoutLocale}
                  to={navPath(item.to)}
                  accountAttention={accountAttention}
                />
              ))}
              {/* 票 2.67: below 721px the signed-out 「我的关注」 cell has no room in the dock and is listed here instead. */}
              {followingItem ? <MobileNavItem item={followingItem} activeGroup={activeGroup} locale={layoutLocale} to={navPath(followingItem.to)} following /> : null}
              {isKprHybridDesign && showLanguage ? (
                <LanguageMenu
                  locale={layoutLocale}
                  includeKorean={isReviewEntryRoute || layoutLocale === 'ko-KR'}
                  mobile
                  onLocaleChange={handleLocaleChange}
                />
              ) : null}
            </nav>
          </details>

          <div className={styles.headerRight} data-upgrade-controls>
            {isKprHybridDesign && showSeason ? (
              <EventContextBar
                season={season}
                seasonId={seasonId}
                locale={layoutLocale}
                seasons={SEASONS}
                updatedAtText={updatedAtText}
                seasonStatus={seasonStatus}
                activeSummary={summary}
                isSyncing={isSyncing}
                dataStatus={dataStatus}
                onSeasonChange={handleSeasonChange}
                contextMode={headerContextMode}
                placement="header"
              />
            ) : null}
            {isKprHybridDesign && showSeason ? <SiteSearch seasonId={seasonId} locale={layoutLocale} withSeason={withSeason} /> : null}
            {phoneNavigation ? <PublicMobileMenu items={headerNavItems} locale={layoutLocale} navPath={navPath} reviewAvailable={Boolean(season?.reviewEnabled)} personalAvailable={!season?.partnerTrial}>
              {showLanguage ? <LanguageMenu locale={layoutLocale} mobile onLocaleChange={handleLocaleChange} /> : null}
            </PublicMobileMenu> : null}
            {isKprHybridDesign ? showLanguage ? (
              <LanguageMenu
                locale={layoutLocale}
                includeKorean={isReviewEntryRoute || layoutLocale === 'ko-KR'}
                onLocaleChange={handleLocaleChange}
              />
            ) : null : (
              <div
                className={`${styles.languageSwitch} ${isReviewEntryRoute ? styles.reviewLanguageSwitch : ''}`}
                aria-label={uiText('语言', layoutLocale)}
              >
                {LANGUAGE_OPTIONS.map(option => <button
                  key={option.id}
                  type="button"
                  onClick={() => handleLocaleChange(option.id)}
                  aria-pressed={layoutLocale === option.id}
                  title={option.nativeName}
                  className={layoutLocale === option.id ? styles.languageActive : ''}
                  data-i18n-ignore
                >{option.shortLabel}</button>)}
              </div>
            )}
            <div className={styles.accountCluster} data-upgrade-account>
              {/* 票 2.67: signed out, 「我的关注」 sits left of 「登录」 (phones keep it in their menu sheet). */}
              {followingItem ? <Link to={navPath(followingItem.to)} className={styles.followingLink} data-nav-group="space" aria-current={activeGroup === 'space' ? 'page' : undefined}>{getNavLabel(followingItem, layoutLocale)}</Link> : null}
              {accountControl === undefined ? <AuthButton locale={compatibleLayoutLocale} seasonId={seasonId} attention={isKprHybridDesign ? accountAttention : null} /> : accountControl}
              {/* 票 2.18: on phones 我的 lives behind the avatar, so its attention mark moves here from the tab bar. */}
              {phoneNavigation && accountAttention?.visible ? <i className={mobileStyles.avatarAttention} role="img" aria-label={accountAttention.ariaLabel} /> : null}
            </div>
          </div>
        </div>

        {!isKprHybridDesign ? <EventContextBar
          season={season}
          seasonId={seasonId}
          locale={layoutLocale}
          seasons={SEASONS}
          updatedAtText={updatedAtText}
          seasonStatus={seasonStatus}
          activeSummary={summary}
          isSyncing={isSyncing}
          dataStatus={dataStatus}
          onSeasonChange={handleSeasonChange}
          activeSection={activeSection}
          contextMode={headerContextMode}
        /> : null}
      </header>
      {showAccountModeSwitch ? <AccountModeSwitch locale={compatibleLayoutLocale} seasonId={seasonId} /> : null}
      {phoneNavigation ? <PublicMobileNav items={headerNavItems} locale={layoutLocale} navPath={navPath} /> : null}
  </>)
}
