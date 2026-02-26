'use client'

import CytoscapeComponent from 'react-cytoscapejs'
import Cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import { cytoscapeStylesheet } from '@/components/graph/cytoscapeStyles'
import { DEMO_GRAPH_DATA } from './DemoGraph'

// CRITICAL: Register fcose at module level — registering inside component causes re-registration on every render
Cytoscape.use(fcose as Cytoscape.Ext)

export default function DemoGraphCanvas() {
  const elements = [
    ...DEMO_GRAPH_DATA.nodes.map(n => ({
      data: { id: n.id, label: n.label, type: n.type, ...n.properties },
    })),
    ...DEMO_GRAPH_DATA.edges.map(e => ({
      data: { source: e.source, target: e.target, label: e.label },
    })),
  ]

  return (
    <CytoscapeComponent
      elements={elements}
      stylesheet={cytoscapeStylesheet}
      layout={{
        name: 'fcose',
        animate: true,
        animationDuration: 800,
        animationEasing: 'ease-out',
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
      } as Cytoscape.LayoutOptions}
      style={{ width: '100%', height: '100%' }}
      pixelRatio={1}
      userZoomingEnabled={true}
      userPanningEnabled={true}
      hideEdgesOnViewport={true}
    />
  )
}
