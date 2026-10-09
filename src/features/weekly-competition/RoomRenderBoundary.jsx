import { Component } from 'react'
import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { roomDiagnostic } from './roomResponse.js'
import styles from './WeeklyLiveRoomPage.module.css'
import { matchListDestination } from '../my-space/spaceDestinations.js'

export default class RoomRenderBoundary extends Component {
  state = { failed: false, busy: false, receipt: '' }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidMount() { this.active = true }
  componentWillUnmount() { this.active = false }
  componentDidCatch(error) { this.failure = String(error?.message || 'Render failed').slice(0, 300) }
  retry = async () => {
    this.setState({ busy: true, receipt: '' })
    try {
      const restored = await this.props.refresh({ force: true })
      if (this.active) this.setState({ failed: !restored, receipt: restored ? '' : '重新同步未完成，请核对连接和登录状态。' })
    } catch { if (this.active) this.setState({ receipt: '重新同步未完成，请核对连接和登录状态。' }) }
    finally { if (this.active) this.setState({ busy: false }) }
  }
  copy = async () => {
    try { await navigator.clipboard.writeText(roomDiagnostic({ matchId: this.props.matchId, error: this.failure })); if (this.active) this.setState({ receipt: '诊断信息已复制。' }) }
    catch { if (this.active) this.setState({ receipt: '复制失败，请记录诊断编号和比赛链接。' }) }
  }
  render() {
    if (!this.state.failed) return this.props.children
    const t = key => uiText(key, this.props.locale)
    return <main className={styles.emptyPage}>
      <small>MATCH ROOM · ROOM_RENDER_ERROR</small><h1>{t('比赛房显示异常')}</h1>
      <p>{t('比赛记录仍保存在服务器。重新同步后可继续；页面不会自动重发刚才的操作。')}</p>
      <p>{t('比赛编号')}：{this.props.matchId}</p>
      <div className={styles.actions}><button type="button" disabled={this.state.busy} onClick={this.retry}>{t(this.state.busy ? '正在重新同步…' : '重新同步比赛房')}</button><button type="button" onClick={this.copy}>{t('复制诊断信息')}</button><button type="button" onClick={() => window.location.reload()}>{t('重新载入页面')}</button></div>
      {this.state.receipt && <p role="status">{t(this.state.receipt)}</p>}
      <Link to={this.props.returnPath || matchListDestination(this.props.matchId, { search: globalThis.location?.search || '' })}>{t('返回我的比赛 ↗')}</Link>
    </main>
  }
}
