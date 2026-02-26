// Ambient module declarations for packages without TypeScript definitions

// cytoscape-fcose has no @types package — declare as Cytoscape extension
declare module 'cytoscape-fcose' {
  import type Cytoscape from 'cytoscape'
  const ext: Cytoscape.Ext
  export = ext
}
