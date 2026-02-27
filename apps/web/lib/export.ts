import type { VCGraph } from '@graphvc/shared-types'
import type Cytoscape from 'cytoscape'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportGraphAsJson(graph: VCGraph, filename = 'graph.json') {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function exportGraphAsPng(cy: Cytoscape.Core, filename = 'graph.png') {
  const dataUrl = cy.png({ full: true, scale: 2, bg: '#030712' })
  const byteString = atob(dataUrl.split(',')[1])
  const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([ab], { type: mimeType })
  triggerDownload(blob, filename)
}
