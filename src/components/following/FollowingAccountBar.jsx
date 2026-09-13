import { translateUiText as uiText } from '../../lib/uiText.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from '../../pages/following/FollowingPage.module.css'

const IDENTITY_LABELS = {
  PLAYER: '认证选手',
  MANAGER: '认证经理',
  COACH: '认证教练',
  CASTER: '认证解说',
  REFEREE: '认证赛管'
}

function openAccountCenter() {
  window.dispatchEvent(new CustomEvent('fries-cup:open-account'))
}

function getSyncState(status, error, locale) {
  if (error || status === 'error') return { tone: 'error', label: uiText("关注同步失败", locale) }
  if (status === 'loading') return { tone: 'working', label: uiText("正在读取云端关注", locale) }
  if (status === 'saving') return { tone: 'working', label: uiText("正在同步关注", locale) }
  if (status === 'ready') return { tone: 'ready', label: uiText("关注已云同步", locale) }
  return { tone: 'local', label: locale === 'zh-CN' ? uiText("保存在此浏览器", locale) : 'Saved in this browser' }
}

function getIdentityCopy(identity, target, user) {
  const identityType = identity?.identityType || ''
  const targetName = identityType === 'PLAYER'
    ? target?.player?.display_name || target?.player?.nickname || target?.player?.player_name || identity?.targetId
    : target?.team?.team_name || target?.team?.name || target?.team?.team_short_name || identity?.teamId || identity?.targetId
  const userName = user?.displayName || user?.username || user?.email || '你'

  if (identityType === 'PLAYER') {
    return {
      eyebrow: 'PLAYER SPACE',
      title: `${targetName || userName} 的选手工作台`,
      detail: target?.player
        ? '你的个人资料、所属队伍和相关比赛会优先显示；手动关注仍可自由调整。'
        : '身份已通过，但暂时没有在当前赛季公开名单中匹配到你的选手资料。'
    }
  }

  if (identityType === 'MANAGER' || identityType === 'COACH') {
    return {
      eyebrow: 'TEAM SPACE',
      title: `${targetName || userName} 的队伍工作台`,
      detail: target?.team
        ? '所属队伍、下一场比赛和比赛房入口会优先显示；其他关注不受影响。'
        : '身份已通过，但暂时没有在当前赛季公开名单中匹配到所属队伍。'
    }
  }

  return {
    eyebrow: 'EVENT OPS',
    title: identityType === 'CASTER' ? '解说赛事工作台' : '赛务赛事工作台',
    detail: '你会按认证赛事身份进入有权限的比赛房；这里的队伍与选手关注仍由你自己管理。'
  }
}

export default function FollowingAccountBar({
  accountIdentity,
  accountIdentities = [],
  accountIdentityError,
  accountIdentityTarget,
  authUser,
  favoritesSyncError,
  favoritesSyncStatus,
  identityTeamOverview,
  isAccountIdentityLoading,
  isAuthenticated,
  locale = 'zh-CN',
  onManage,
  onPrimaryIdentityChange,
  withSeason
}) {
  const [switchingIdentity, setSwitchingIdentity] = useState('')
  const [switchError, setSwitchError] = useState('')
  const sync = getSyncState(favoritesSyncStatus, favoritesSyncError, locale)
  let eyebrow = 'LOCAL FOLLOWING'
  let title = locale === 'zh-CN' ? uiText("无需登录，也能追踪你关注的比赛", locale) : 'Follow your teams, even before signing in'
  let detail = locale === 'zh-CN'
    ? uiText("关注的队伍与选手保存在此浏览器。受邀账号登录后可进入我的空间，继续查看已有关注；同步状态以下方标识为准。", locale)
    : 'Your followed teams and players are saved in this browser. Invited accounts can sign in to My Space and keep these follows. Check the sync status below.'

  if (isAuthenticated && isAccountIdentityLoading) {
    eyebrow = 'ACCOUNT CONNECTED'
    title = '正在连接你的赛事身份'
    detail = '关注数据与认证资料正在载入。'
  } else if (isAuthenticated && accountIdentityError) {
    eyebrow = 'ACCOUNT CONNECTED'
    title = '账号已登录，身份资料暂时无法读取'
    detail = '你的关注仍然可以使用；稍后可在账号中心重试身份资料。'
  } else if (isAuthenticated && accountIdentity?.isVerified) {
    const copy = getIdentityCopy(accountIdentity, accountIdentityTarget, authUser)
    eyebrow = copy.eyebrow
    title = copy.title
    detail = copy.detail
  } else if (isAuthenticated && accountIdentity?.isPending) {
    eyebrow = 'VERIFICATION PENDING'
    title = '身份认证正在审核中'
    detail = '审核通过后可进入对应的赛事工作台；关注保存位置以下方同步状态为准。'
  } else if (isAuthenticated && accountIdentity?.isRejected) {
    eyebrow = 'VERIFICATION UPDATE'
    title = '认证信息需要补充'
    detail = accountIdentity.adminNote || '打开账号中心查看审核备注并重新提交。'
  } else if (isAuthenticated) {
    eyebrow = 'VIEWER SPACE'
    title = '你的普通观众空间'
    detail = '可管理账号资料与本机关注。赛事身份通过邀请关联，参赛入口以本届开放范围为准。'
  }

  const identityType = accountIdentity?.identityType || ''
  const playerRouteId = accountIdentityTarget?.playerRouteId
  const teamRouteId = accountIdentityTarget?.teamRouteId
  const nextMatchId = identityTeamOverview?.nextMatch?.matchId
  const activeIdentities = accountIdentities.filter(identity => (
    identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase())
  ))

  const switchIdentity = async identityType => {
    if (!identityType || identityType === accountIdentity?.identityType || !onPrimaryIdentityChange) return
    setSwitchError('')
    setSwitchingIdentity(identityType)
    try {
      await onPrimaryIdentityChange(identityType)
    } catch {
      setSwitchError('身份切换失败，请稍后重试')
    } finally {
      setSwitchingIdentity('')
    }
  }

  return (
    <section className={styles.accountBar} data-status={accountIdentity?.status || 'GUEST'}>
      <div className={styles.accountBarCopy}>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>

      <div className={styles.accountBarMeta}>
        {activeIdentities.length > 1 ? <div className={styles.identitySwitcher} aria-label={uiText("默认身份", locale)}>
          <span>{uiText("默认视角", locale)}</span>
          {activeIdentities.map(identity => {
            const type = String(identity.identityType || identity.type || '').toUpperCase()
            return <button key={identity.id || type} type="button" data-active={type === identityType ? 'true' : 'false'} disabled={Boolean(switchingIdentity)} onClick={() => switchIdentity(type)}>{switchingIdentity === type ? uiText("切换中…", locale) : (IDENTITY_LABELS[type] || type).replace('认证', '')}</button>
          })}
        </div> : null}
        <div className={styles.accountBadges}>
          <em data-tone={isAuthenticated ? 'account' : 'local'}>{isAuthenticated ? uiText("账号已登录", locale) : uiText("游客模式", locale)}</em>
          {accountIdentity?.isVerified ? <em data-tone="verified">{IDENTITY_LABELS[identityType] || uiText("身份已认证", locale)}</em> : null}
          <em data-tone={sync.tone}>{sync.label}</em>
          {switchError ? <em data-tone="error">{switchError}</em> : null}
        </div>

        <div className={styles.accountActions}>
          {!isAuthenticated || !accountIdentity?.isVerified || accountIdentityError ? (
            <button type="button" onClick={openAccountCenter}>
              {!isAuthenticated ? uiText("登录受邀账号", locale) : uiText("打开账号设置", locale)}
            </button>
          ) : null}
          {identityType === 'PLAYER' && playerRouteId ? (
            <Link to={withSeason(`/players/${encodeURIComponent(playerRouteId)}`)}>{uiText("我的选手资料", locale)}</Link>
          ) : null}
          {['PLAYER', 'MANAGER', 'COACH'].includes(identityType) && teamRouteId ? (
            <Link to={withSeason(`/teams/${encodeURIComponent(teamRouteId)}`)}>{uiText("我的队伍", locale)}</Link>
          ) : null}
          {['MANAGER', 'COACH'].includes(identityType) && nextMatchId ? (
            <Link to={withSeason(`/matches/${encodeURIComponent(nextMatchId)}/room`)}>{uiText("下一场比赛房", locale)}</Link>
          ) : null}
          {['CASTER', 'REFEREE'].includes(identityType) ? (
            <Link to={withSeason('/matches')}>{uiText("查看赛事列表", locale)}</Link>
          ) : null}
          <button type="button" className={styles.accountSecondaryAction} onClick={onManage}>{uiText("管理关注", locale)}</button>
        </div>
      </div>
    </section>
  )
}
