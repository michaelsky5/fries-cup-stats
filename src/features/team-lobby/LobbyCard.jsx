import { Link } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { lobbyText as t } from './lobbyCopy.js'
import { lobbyCardCopy, lobbyDate, roleLabel } from './lobbyModel.js'
import { getLobbyCardHero, getLobbyVacancies } from './lobbyPresentation.js'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import styles from './LobbyCard.module.css'

const roleArtwork = { TANK: 'tank', DPS: 'damage', SUP: 'support' }

function RoleIcon({ role, className }) {
  const icon = roleArtwork[role]
  return icon ? <span aria-hidden="true" className={className} style={{ '--lobby-role-icon': `url("/role/${icon}.png")` }} /> : null
}

export function LobbyIdentity({ card, large = false }) {
  const name = card.title.trim()
  const monogram = /^[a-z\d]/i.test(name) ? name.slice(0, 2).toUpperCase() : Array.from(name)[0]
  return <span aria-hidden="true" data-kind={card.kind} className={`${styles.identity} ${large ? styles.identityLarge : ''}`}>{monogram}</span>
}

export function LobbyRoleTags({ card }) {
  useUiLocale()
  return <div className={styles.roleTags} role="group" aria-label={t('位置')}>{card.roles.map(role => {
    const count = card.kind === 'TEAM' ? card.needs?.find(item => item.role === role)?.count : null
    return <span key={role} className={styles.roleTag}><RoleIcon role={role} className={styles.roleIcon} />{roleLabel(role)}{count > 0 && <span className={styles.roleCount}>× {count}</span>}</span>
  })}</div>
}

export function LobbyCardKind({ card }) {
  useUiLocale()
  return <span className={styles.kind}>{card.kind === 'PERSON' ? t('个人找队') : card.forming ? t('组队中') : t('队伍招募')}</span>
}

function CardCover({ card, destination, returnTo }) {
  const locale = useUiLocale()
  const hero = getLobbyCardHero(card)
  const vacancies = getLobbyVacancies(card)
  return <div className={styles.cover} data-kind={card.kind}>
    <div className={styles.coverIdentity}>
      <div className={styles.coverMeta}><LobbyCardKind card={card} />{card.kind === 'PERSON' && card.roles.length > 1 && <span className={styles.multiRole}>{t('多位置')}</span>}{card.kind === 'TEAM' && vacancies > 0 && <span className={styles.vacancyBadge}>{t('招募 {0} 人', [vacancies])}</span>}</div>
      <div className={card.kind === 'TEAM' ? styles.teamName : undefined}>
        {card.kind === 'TEAM' && <LobbyIdentity card={card} />}
        <h2 className={styles.title}><Link to={destination} state={{ returnTo }}>{card.title}</Link></h2>
      </div>
    </div>
    {card.kind === 'PERSON' && <div className={styles.coverVisual} aria-hidden="true">
      {hero ? <><HeroArtwork hero={hero.id} className={styles.heroArt} decorative /><span className={styles.coverCaption}>{formatOwHeroName(hero.id, locale)}</span></>
        : <span className={styles.roleArtwork} data-multiple={card.roles.length > 1}>{card.roles.filter(role => roleArtwork[role]).map(role => <RoleIcon key={role} role={role} className={styles.roleGlyph} />)}</span>}
    </div>}
  </div>
}

export default function LobbyCard({ card, returnTo }) {
  useUiLocale()
  const copy = lobbyCardCopy(card.kind)
  const destination = `/lobby/cards/${card.publicId}`
  return <article className={styles.card} data-kind={card.kind} data-public-id={card.publicId}>
    <CardCover card={card} destination={destination} returnTo={returnTo} />
    <div className={styles.cardContent}>
    <LobbyRoleTags card={card} />
    <dl className={styles.rank}><div><dt>{copy.levelLabel}</dt><dd>{card.level || <span className={styles.missing}>{t('未填写')}</span>}</dd></div>{card.kind === 'PERSON' && card.level && <span className={styles.selfReported}>{t('段位为自述')}</span>}</dl>
    <dl className={styles.facts}>
      <div><dt>{t('时间')}</dt><dd>{card.availability}</dd></div>
      <div><dt>{t('目标')}</dt><dd>{card.goal}</dd></div>
      {card.kind === 'PERSON' && <div><dt>{copy.heroesLabel}</dt><dd>{card.heroes || <span className={styles.missing}>{t('未填写')}</span>}</dd></div>}
    </dl>
    <p className={styles.bio}>{card.bio}</p>
    <footer className={styles.cardFooter}>
      <div className={styles.confirmed}><span>{t('最近确认')}</span><time dateTime={card.confirmedAt}>{lobbyDate(card.confirmedAt)}</time></div>
      <Link className={styles.cardAction} to={destination} state={{ returnTo }}>{card.kind === 'TEAM' ? t('查看招募') : t('查看资料')}<span className={styles.actionArrow} aria-hidden="true">→</span></Link>
    </footer>
    </div>
  </article>
}
