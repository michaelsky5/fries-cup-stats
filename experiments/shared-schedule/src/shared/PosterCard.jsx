import { useState } from 'react'
import { Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'

function lines(context, text, width) {
  const result = []
  for (const paragraph of String(text || '').slice(0, 1600).split('\n')) {
    let line = ''
    for (const char of Array.from(paragraph)) {
      if (line && context.measureText(line + char).width > width) { result.push(line); line = char }
      else line += char
    }
    result.push(line)
  }
  return result
}
export default function PosterCard({ title, subtitle, body = '' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (process.env.TARO_ENV !== 'weapp') return null
  async function make() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const context = Taro.createCanvasContext('public-poster')
      context.setFillStyle('#eeede6'); context.fillRect(0, 0, 360, 640)
      context.setFillStyle('#f4c320'); context.fillRect(24, 28, 46, 6)
      context.setFillStyle('#181a17'); context.setFontSize(18); context.fillText('FRIES CUP', 24, 65)
      context.setFontSize(12); context.fillText(String(subtitle || '').slice(0, 38), 24, 94)
      context.setFontSize(28)
      const heading = lines(context, title, 312).slice(0, 4)
      heading.forEach((line, index) => context.fillText(line, 24, 145 + index * 40))
      const top = 145 + heading.length * 40
      context.setStrokeStyle('#181a17'); context.setLineWidth(2); context.beginPath(); context.moveTo(24, top); context.lineTo(336, top); context.stroke()
      context.setFontSize(16)
      const paragraphs = lines(context, body, 312)
      paragraphs.slice(0, Math.floor((565 - top) / 26)).forEach((line, index) => context.fillText(line, 24, top + 38 + index * 26))
      context.setFontSize(11); context.fillText('公开赛事记录 · 薯条杯赛事助手', 24, 614)
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('生成图片超时，请重试。')), 12000)
        context.draw(false, () => Taro.canvasToTempFilePath({ canvasId: 'public-poster', width: 360, height: 640, destWidth: 1080, destHeight: 1920, fileType: 'png', success: result => { clearTimeout(timer); resolve(result.tempFilePath) }, fail: () => { clearTimeout(timer); reject(new Error('图片暂时无法生成，请重试。')) } }))
      }).then(path => Taro.previewImage({ current: path, urls: [path] }))
    } catch (failure) { setError(failure.message || '图片暂时无法生成，请重试。') }
    finally { setBusy(false) }
  }
  return <div className='public-poster-tool'><button className='center-link public-make-poster' disabled={busy} onClick={make}>{busy ? '正在制作图片…' : '制作公开资料图片 ↗'}</button>{error ? <p role='alert'>{error}</p> : null}<Canvas canvasId='public-poster' className='public-poster-canvas' style={{ width: '360px', height: '640px' }} /></div>
}
