import posthog from 'posthog-js'

/**
 * OBS-02: Fires after successful graph generation.
 * Called in app/app/page.tsx handleSubmit success branch.
 */
export function captureGraphGenerated(
  nodeCount: number,
  edgeCount: number,
  sourceType: 'url' | 'text'
): void {
  posthog.capture('graph_generated', {
    node_count: nodeCount,
    edge_count: edgeCount,
    source_type: sourceType,
  })
}

/**
 * OBS-02: Fires when user exports a graph.
 * STUB — Phase 5 creates this helper but has no caller.
 * Will be wired to export buttons in Phase 4 (EXP-01 JSON export, EXP-02 PNG export).
 * Do NOT remove — Phase 4 depends on this export being importable.
 */
export function captureGraphExported(format: 'json' | 'png'): void {
  posthog.capture('graph_exported', { format })
}

/**
 * OBS-02: Fires when user views their graph history.
 * STUB — Phase 5 creates this helper but has no caller.
 * Will be wired to the history page in Phase 3 (FE-03).
 * Do NOT remove — Phase 3 depends on this export being importable.
 */
export function captureGraphHistoryViewed(): void {
  posthog.capture('graph_history_viewed')
}
