import { toBlob } from 'html-to-image'
import { waitForShareAssets } from '../player-share/playerShareRenderer.js'

export async function exportTeamSharePng(node, fileName) {
  if (!node) throw new Error('Missing team share card node')
  await waitForShareAssets(node)
  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: 1600,
    height: 900,
    canvasWidth: 1600,
    canvasHeight: 900,
    backgroundColor: '#101010'
  })
  if (!blob) throw new Error('Failed to render team share image')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.hidden = true
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
  }
  // Keep the generated file available for an explicit save from the dialog.
  return { url, fileName }
}
