import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { lobbyText as t } from './lobbyCopy.js'
import { lobbyCardCopy, lobbyDate, lobbyReadFailure, retryableRead, safeLobbyReturn } from './lobbyModel.js'
import { getLobbyCardHero, getLobbyVacancies } from './lobbyPresentation.js'
import { LobbyCardKind, LobbyRoleTags } from './LobbyCard.jsx'
import { ContactEntry } from './LobbyContacts.jsx'
import * as api from './lobbyApi.js'
import common from './Lobby.module.css'
import styles from './LobbyDetail.module.css'

function ProfileHeader({ card }) {
  const locale = useUiLocale()
  const hero = getLobbyCardHero(card), vacancies = getLobbyVacancies(card)
  return <header className={styles.profileHeader}>
    <div className={styles.profileMeta}><LobbyCardKind card={card} /><span className={styles.brand} aria-hidden="true"><img src="/logos/fries-cup-mark-ink.svg" alt="" />FRIES CUP</span></div>
    <div className={styles.identityRow} data-illustrated={Boolean(hero || vacancies)}>
      <h1>{card.title}</h1>
      {hero && <div className={styles.portrait}><HeroArtwork hero={hero.id} decorative /><span>{t('常用英雄')} · {formatOwHeroName(hero.id, locale)}</span></div>}
      {card.kind === 'TEAM' && vacancies > 0 && <div className={styles.vacancies}><strong aria-hidden="true">{String(vacancies).padStart(2, '0')}</strong><span>{t('招募 {0} 人', [vacancies])}</span></div>}
    </div>
    <div className={styles.roleBand}><LobbyRoleTags card={card} /></div>
  </header>
}

export default function LobbyDetail() {
  useUiLocale()
  const { publicId } = useParams(), location = useLocation()
  const [card, setCard] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  const contactRef = useRef(null)
  const originalReturn = location.state?.returnTo
  const returnTo = typeof originalReturn === 'string' && originalReturn.startsWith('/lobby?') ? safeLobbyReturn(originalReturn) : '/lobby'
  const copy = card ? lobbyCardCopy(card.kind) : null
  useEffect(() => {
    const controller = new AbortController()
    setCard(null); setError(null)
    api.getLobbyCard(publicId, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setCard(value.card) }).catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
  }, [publicId, attempt])
  function visitContact(event) {
    event.preventDefault()
    contactRef.current?.focus({ preventScroll: true })
    contactRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
  return <>
    <div className={styles.toolbar}><Link to={returnTo}>{t('← 返回需求列表')}</Link>{card && <a className={styles.quickContact} href="#lobby-contact" onClick={visitContact}>{card.kind === 'TEAM' ? t('联系队伍') : t('联系 TA')} <span aria-hidden="true">↘</span></a>}</div>
    {error && <div role="alert" className={common.error}>{lobbyReadFailure(error)}{retryableRead(error) && <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('重新读取')}</button>}</div>}
    {!card && !error && <p role="status">{t('正在读取卡片…')}</p>}
    {card && <div className={styles.layout} data-lobby-detail>
      <article className={styles.profile}>
        <ProfileHeader card={card} />
        <div className={styles.profileBody}>
          <section className={styles.summary} aria-labelledby="lobby-profile-facts"><h2 id="lobby-profile-facts">{t('资料概览')}</h2>
            <dl className={styles.facts}>
              <div><dt>{copy.levelLabel}</dt><dd className={styles.rank}>{card.level || <span className={styles.missing}>{t('未填写')}</span>}{card.kind === 'PERSON' && card.level && <small>{t('段位为自述')}</small>}</dd></div>
              <div><dt>{t('可赛时间')}</dt><dd>{card.availability}</dd></div>
              <div className={styles.wide}><dt>{t('组队目标')}</dt><dd>{card.goal}</dd></div>
              {(card.heroes || card.kind === 'PERSON') && <div className={styles.wide}><dt>{copy.heroesLabel}</dt><dd>{card.heroes || <span className={styles.missing}>{t('未填写')}</span>}</dd></div>}
            </dl>
          </section>
          <section className={styles.introduction} aria-labelledby="lobby-profile-intro"><h2 id="lobby-profile-intro">{copy.bio}</h2><p>{card.bio}</p></section>
          <footer className={styles.dates}>
            {card.confirmedAt && <div><span>{t('需求确认于')}</span><time dateTime={card.confirmedAt}>{lobbyDate(card.confirmedAt)}</time></div>}
            <div><span>{t('需求有效至')}</span><time dateTime={card.expiresAt}>{lobbyDate(card.expiresAt)}</time></div>
          </footer>
        </div>
      </article>
      <aside id="lobby-contact" ref={contactRef} tabIndex={-1} aria-label={t('联系')} className={`${common.actionPanel} ${styles.contactPanel}`}>
        <span className={styles.contactKicker}>FRIES CUP / CONNECT</span>
        <ContactEntry card={card} />
        <p className={styles.contactNote}>{t('联系意愿与正式参赛资格分别确认。')}</p>
      </aside>
    </div>}
  </>
}
