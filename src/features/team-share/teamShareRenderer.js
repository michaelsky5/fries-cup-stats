import { toPng } from 'html-to-image'
import { waitForShareAssets } from '../player-share/playerShareRenderer.js'

export async function exportTeamSharePng(node, fileName) {
  if (!node) throw new Error('Missing team share card node')
  await waitForShareAssets(node)
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: 1600,
    height: 900,
    canvasWidth: 1600,
    canvasHeight: 900,
    backgroundColor: '#101010'
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}
