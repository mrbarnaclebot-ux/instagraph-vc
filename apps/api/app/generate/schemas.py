from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# Entity and relationship types from REQUIREMENTS.md AI-01
EntityType = Literal["Investor", "Project", "Round", "Narrative", "Person"]

RelationshipType = Literal[
    "LED",
    "INVESTED_IN",
    "CO_INVESTED",
    "RAISED",
    "FOUNDED",
    "PARTNERS_AT",
    "FOCUSES_ON",
    "CLASSIFIED_AS",
]


class NodeProperties(BaseModel):
    """
    Typed entity properties — covers all entity types with Optional fields.
    additionalProperties: false is required by OpenAI structured outputs.
    """
    model_config = ConfigDict(extra="forbid")

    # Investor
    aum: Optional[str] = None
    stage_focus: Optional[str] = None
    chain_focus: Optional[str] = None
    # Project
    token_ticker: Optional[str] = None
    chain: Optional[str] = None
    category: Optional[str] = None
    # Round
    amount_usd: Optional[str] = None
    stage: Optional[str] = None
    date: Optional[str] = None
    # Person
    title: Optional[str] = None
    firm: Optional[str] = None
    # Narrative
    description: Optional[str] = None


class GraphNode(BaseModel):
    id: str = Field(
        description="Unique slug identifier derived from entity name, e.g., 'paradigm-capital'"
    )
    label: str = Field(description="Display name, e.g., 'Paradigm Capital'")
    type: EntityType
    properties: NodeProperties = Field(
        default_factory=NodeProperties,
        description=(
            "Entity-specific properties. "
            "Investor: aum, stage_focus, chain_focus. "
            "Project: token_ticker, chain, category. "
            "Round: amount_usd, stage, date. "
            "Person: title, firm. "
            "Narrative: description."
        ),
    )


class GraphEdge(BaseModel):
    source: str = Field(description="Source node id (must match a node id in the graph)")
    target: str = Field(description="Target node id (must match a node id in the graph)")
    relationship: RelationshipType


class VCKnowledgeGraph(BaseModel):
    """
    VC ecosystem knowledge graph with typed entities and relationships.
    Used as response_format for client.beta.chat.completions.parse() (AI-01).
    OpenAI native structured outputs guarantee this schema is always returned.
    """
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# API request/response models (CONTEXT.md API Response Contract)

class GenerateRequest(BaseModel):
    input: str = Field(
        description=(
            "Text or HTTPS URL to analyze. "
            "Minimum 200 characters (AI-04). "
            "URL inputs are scraped; text inputs go directly to GPT-4o (AI-03)."
        )
    )
    force_refresh: bool = False  # CONTEXT.md: bypass URL cache, counts as generation
    # Note: min_length validation is done in the service/route via validate_input_length()
    # (from ssrf.py Plan 02) to produce our custom error shape, not Pydantic's 422.


class GenerateMeta(BaseModel):
    session_id: str
    token_count: int
    source_type: Literal["url", "text"]
    processing_ms: int
    cache_hit: bool = False
    cache_age_seconds: int | None = None


class GenerateResponse(BaseModel):
    graph: dict[str, list]   # {"nodes": [...], "edges": [...]}
    meta: GenerateMeta
