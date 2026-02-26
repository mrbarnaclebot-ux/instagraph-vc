'use client'

import dynamic from 'next/dynamic'

// CRITICAL: ssr:false required — react-cytoscapejs accesses window at module import
// Same pattern as app/app/page.tsx GraphCanvas dynamic import
const DemoGraphCanvas = dynamic(() => import('./DemoGraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-gray-600 text-sm">Loading graph...</span>
    </div>
  ),
})

export const DEMO_GRAPH_DATA = {
  nodes: [
    { id: 'n1', label: 'Apex Ventures', type: 'Investor', properties: { aum: '$2.1B', stage: 'Seed, Series A' } },
    { id: 'n2', label: 'ChainProtocol', type: 'Project', properties: { chain: 'Ethereum', token: 'CPROTO' } },
    { id: 'n3', label: 'Meridian Capital', type: 'Investor', properties: { aum: '$800M', stage: 'Series A, B' } },
    { id: 'n4', label: 'Series A Round', type: 'Round', properties: { amount: '$18M', date: '2024-Q3' } },
    { id: 'n5', label: 'DeFi Infrastructure', type: 'Narrative', properties: {} },
    { id: 'n6', label: 'Sara Chen', type: 'Person', properties: { role: 'Partner' } },
    { id: 'n7', label: 'Vertex Protocol', type: 'Project', properties: { chain: 'Arbitrum', token: 'VTEX' } },
    { id: 'n8', label: 'L2 Scaling', type: 'Narrative', properties: {} },
  ],
  edges: [
    { source: 'n1', target: 'n4', label: 'LED' },
    { source: 'n3', target: 'n4', label: 'INVESTED_IN' },
    { source: 'n4', target: 'n2', label: 'RAISED' },
    { source: 'n2', target: 'n5', label: 'CLASSIFIED_AS' },
    { source: 'n6', target: 'n1', label: 'PARTNERS_AT' },
    { source: 'n1', target: 'n7', label: 'INVESTED_IN' },
    { source: 'n7', target: 'n8', label: 'FOCUSES_ON' },
  ],
}

interface DemoGraphProps {
  className?: string
}

export default function DemoGraph({ className }: DemoGraphProps) {
  return (
    <div className={className}>
      <DemoGraphCanvas />
    </div>
  )
}
