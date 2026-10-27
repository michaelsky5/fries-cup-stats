import { Component } from 'react'
import Taro from '@tarojs/taro'
import { captureRuntime } from '../platform'
import { BUILD } from './build'

export default class ScheduleRuntimeBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failure: '' }
  }

  static getDerivedStateFromError(error) {
    const failure = String(error?.message || '页面运行错误')
      .replace(/https?:\/\/\S+/gi, '[页面代码]')
      .replace(/[\r\n\t]+/g, ' ').slice(0, 160)
    return { failure }
  }

  componentDidCatch() {
    captureRuntime({ build: BUILD, view: 'render-error', loading: false, error: 'PUBLIC_RENDER', requestDetail: this.state.failure, count: 0 })
  }

  render() {
    if (!this.state.failure) return this.props.children
    return <div className='shared-root'><div className='shared-state'>
      <p>赛事页面暂时无法显示，请重新打开。</p>
      <button onClick={() => Taro.reLaunch({ url: '/pages/schedule/index' })}>重新打开赛事中心</button>
    </div></div>
  }
}
