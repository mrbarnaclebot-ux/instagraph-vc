import type { VCGraph } from '@graphvc/shared-types'
import type Cytoscape from 'cytoscape'
import { captureGraphExported } from '@/lib/analytics'
import { toast } from 'sonner'

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

/**
 * Generate a descriptive filename from graph content.
 * Pattern: graphvc-{slug}-{YYYY-MM-DD}.{ext}
 */
export function generateFilename(graph: VCGraph, title: string | undefined, ext: string): string {
  const slug = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    : graph.nodes.slice(0, 4).map(n => n.label).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `graphvc-${slug}-${date}.${ext}`
}

/**
 * EXP-01: Export graph as cleaned/simplified JSON.
 * Produces a readable format with flattened node properties and renamed edge fields.
 */
export function exportGraphAsJson(graph: VCGraph, title?: string) {
  const simplified = {
    nodes: graph.nodes.map(n => ({ id: n.id, label: n.label, type: n.type, ...n.properties })),
    edges: graph.edges.map(e => ({ from: e.source, to: e.target, relationship: e.relationship })),
    exported_at: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(simplified, null, 2)], { type: 'application/json' })
  const filename = generateFilename(graph, title, 'json')
  triggerDownload(blob, filename)
  captureGraphExported('json')
}

/**
 * EXP-02: Export graph as PNG using Cytoscape built-in cy.png().
 * Uses full graph extent with app background color (#030712 gray-950).
 * maxWidth: 4096 safety cap per Research pitfall #2 (large canvas null blob).
 */
export function exportGraphAsPng(cy: Cytoscape.Core, graph?: VCGraph, title?: string) {
  const dataUrl = cy.png({ full: true, scale: 2, bg: '#030712', maxWidth: 4096, maxHeight: 4096 })
  if (!dataUrl) {
    toast.error('PNG export failed — graph may be too large. Try JSON export instead.')
    return
  }
  const byteString = atob(dataUrl.split(',')[1])
  const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  const blob = new Blob([ab], { type: mimeType })
  const filename = graph ? generateFilename(graph, title, 'png') : 'graph.png'
  triggerDownload(blob, filename)
  captureGraphExported('png')
}
