import { Link } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import { withLocale } from '../../lib/locales.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { showPersonalLobbyEntry } from './lobbyEntryModel.js'
import styles from './TeamLobbyEntry.module.css'

export default function TeamLobbyEntry({ locale = 'zh-CN', personal = false }) {
  const { user, accountCompetitions, isAccountDataLoading, accountDataError } = useAuth()
  if (personal && !showPersonalLobbyEntry({ user, competitions: accountCompetitions, loading: isAccountDataLoading, error: accountDataError })) return null
  return <section className={styles.entry} aria-label={pickUiLocale(locale, '组队大厅', 'Team lobby', '팀 찾기', '組隊大廳')} data-i18n-ignore>
    <div><span className={styles.eyebrow}>TEAM LOBBY</span><h2>{pickUiLocale(locale, personal ? '找到队友，再一起上场。' : '下一场，一起上场。', 'Find your next teammates.', '함께할 팀원을 찾아보세요.', personal ? '找到隊友，再一起上場。' : '下一場，一起上場。')}</h2>
      <p>{pickUiLocale(locale, '浏览队伍招募，或发布个人求队需求。', 'Browse team openings or publish your player profile.', '팀 모집을 둘러보거나 구직 프로필을 게시하세요.', '瀏覽隊伍招募，或發布個人求隊需求。')}</p></div>
    <Link to={withLocale('/lobby', locale)}>{pickUiLocale(locale, '去组队大厅', 'Explore the lobby', '팀 찾기로 이동', '前往組隊大廳')} <span aria-hidden="true">↗</span></Link>
  </section>
}
