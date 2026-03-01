import { describe, it, expect } from 'vitest'
import { generateFilename } from '@/lib/export'
import type { VCGraph } from '@graphvc/shared-types'

const sampleGraph: VCGraph = {
  nodes: [
    { id: 'paradigm', label: 'Paradigm Capital', type: 'Investor', properties: {} },
    { id: 'uniswap', label: 'Uniswap', type: 'Project', properties: {} },
    { id: 'series-a', label: 'Series A 2024', type: 'Round', properties: {} },
  ],
  edges: [
    { source: 'paradigm', target: 'series-a', relationship: 'LED' },
  ],
}

describe('generateFilename', () => {
  it('uses title when provided', () => {
    const filename = generateFilename(sampleGraph, 'My VC Graph', 'json')
    expect(filename).toMatch(/^graphvc-my-vc-graph-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('slugifies title (strips special chars)', () => {
    const filename = generateFilename(sampleGraph, 'TechCrunch: $50M Raise!!!', 'json')
    expect(filename).toMatch(/^graphvc-techcrunch-50m-raise-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('truncates long titles to 40 chars', () => {
    const longTitle = 'A'.repeat(100)
    const filename = generateFilename(sampleGraph, longTitle, 'json')
    const slug = filename.split('-').slice(1, -3).join('-') // extract slug between graphvc- and -YYYY-MM-DD.json
    expect(slug.length).toBeLessThanOrEqual(40)
  })

  it('falls back to node labels when no title', () => {
    const filename = generateFilename(sampleGraph, undefined, 'json')
    expect(filename).toContain('paradigm')
    expect(filename).toContain('uniswap')
  })

  it('uses correct extension', () => {
    expect(generateFilename(sampleGraph, 'test', 'png')).toMatch(/\.png$/)
    expect(generateFilename(sampleGraph, 'test', 'json')).toMatch(/\.json$/)
  })

  it('includes date in YYYY-MM-DD format', () => {
    const filename = generateFilename(sampleGraph, 'test', 'json')
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/)
    expect(dateMatch).not.toBeNull()
    // Verify it's a valid date
    const date = new Date(dateMatch![1])
    expect(date.getTime()).not.toBeNaN()
  })
})
