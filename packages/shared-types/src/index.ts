// Entity and relationship types — mirror apps/api/app/generate/schemas.py
export type EntityType = "Investor" | "Project" | "Round" | "Narrative" | "Person"

export type RelationshipType =
  | "LED"
  | "INVESTED_IN"
  | "CO_INVESTED"
  | "RAISED"
  | "FOUNDED"
  | "PARTNERS_AT"
  | "FOCUSES_ON"
  | "CLASSIFIED_AS"

export interface GraphNode {
  id: string
  label: string
  type: EntityType
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  relationship: RelationshipType
}

export interface VCGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GenerateMeta {
  session_id: string
  token_count: number
  source_type: "url" | "text"
  processing_ms: number
  cache_hit: boolean
  cache_age_seconds: number | null
}

export interface GenerateResponse {
  graph: VCGraph
  meta: GenerateMeta
}

// Error response shape from FastAPI (error: str, message: str — Phase 1 API contract)
export interface APIError {
  error: string
  message: string
}
