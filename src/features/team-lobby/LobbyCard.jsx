import { Link } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { lobbyText as t } from './lobbyCopy.js'
import { lobbyCardCopy, lobbyDate, roleLabel } from './lobbyModel.js'
import { getLobbyCardHero, getLobbyVacancies } from './lobbyPresentation.js'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import styles from './LobbyCard.module.css'

export function LobbyIdentity({ card, large = false }) {
  const name = card.title.trim()
  const monogram = /^[a-z\d]/i.test(name) ? name.slice(0, 2).toUpperCase() : Array.from(name)[0]
  return <span aria-hidden="true" data-kind={card.kind} className={`${styles.identity} ${large ? styles.identityLarge : ''}`}>{monogram}</span>
}

export function LobbyRoleTags({ card }) {
  useUiLocale()
  return <div className={styles.roleTags} role="group" aria-label={t('岗位')}>{card.roles.map(role => {
    const count = card.kind === 'TEAM' ? card.needs?.find(item => item.role === role)?.count : null
    return <span key={role} className={styles.roleTag}>{roleLabel(role)}{count > 0 && <span className={styles.roleCount}>× {count}</span>}</span>
  })}</div>
}

export function LobbyCardKind({ card }) {
  useUiLocale()
  return <span className={styles.kind}>{card.kind === 'PERSON' ? t('个人找队') : card.forming ? t('组队中') : t('队伍招募')}</span>
}

function CardCover({ card }) {
  const locale = useUiLocale()
  const hero = getLobbyCardHero(card)
  const vacancies = getLobbyVacancies(card)
  return <div className={styles.cover} data-kind={card.kind}>
    <div className={styles.coverTop}><LobbyCardKind card={card} /><span className={styles.coverBrand} aria-hidden="true"><img src="/logos/fries-cup-mark-ink.svg" alt="" />FRIES CUP</span></div>
    <span className={styles.coverWord} aria-hidden="true">{card.kind === 'PERSON' ? card.roles[0] ? roleLabel(card.roles[0]) : 'FC' : t('招募')}</span>
    {hero && <HeroArtwork hero={hero.id} className={styles.heroArt} decorative />}
    {card.kind === 'TEAM' && vacancies > 0 && <strong className={styles.coverFigure} aria-hidden="true">{String(vacancies).padStart(2, '0')}</strong>}
    <div className={styles.coverCaption}>{hero ? <span>{t('常用英雄')} · {formatOwHeroName(hero.id, locale)}</span> : card.kind === 'TEAM' && vacancies > 0 ? <span>{t('招募 {0} 人', [vacancies])}</span> : <span>{t('个人找队')}</span>}</div>
  </div>
}

export default function LobbyCard({ card, returnTo }) {
  useUiLocale()
  const copy = lobbyCardCopy(card.kind)
  const destination = `/lobby/cards/${card.publicId}`
  return <article className={styles.card} data-kind={card.kind} data-public-id={card.publicId}>
    <CardCover card={card} />
    <div className={styles.cardContent}>
    <div className={styles.nameRow}><h2 className={styles.title}><Link to={destination} state={{ returnTo }}>{card.title}</Link></h2></div>
    <LobbyRoleTags card={card} />
    <dl className={styles.rank}><div><dt>{copy.levelLabel}</dt><dd>{card.level || <span className={styles.missing}>{t('未填写')}</span>}</dd></div>{card.kind === 'PERSON' && card.level && <span className={styles.selfReported}>{t('段位为自述')}</span>}</dl>
    <dl className={styles.facts}>
      <div><dt>{t('可赛时间')}</dt><dd>{card.availability}</dd></div>
      <div><dt>{t('组队目标')}</dt><dd>{card.goal}</dd></div>
      {card.kind === 'PERSON' && <div><dt>{copy.heroesLabel}</dt><dd>{card.heroes || <span className={styles.missing}>{t('未填写')}</span>}</dd></div>}
    </dl>
    <p className={styles.bio}>{card.bio}</p>
    <footer className={styles.cardFooter}>
      <div className={styles.confirmed}><span>{t('需求确认于')}</span><time dateTime={card.confirmedAt}>{lobbyDate(card.confirmedAt)}</time></div>
      <Link className={styles.cardAction} to={destination} state={{ returnTo }}>{t('查看详情')}<span className={styles.actionArrow} aria-hidden="true">→</span></Link>
    </footer>
    </div>
  </article>
}
