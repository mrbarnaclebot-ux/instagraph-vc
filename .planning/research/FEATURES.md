# Feature Landscape

**Domain:** Crypto VC intelligence / knowledge graph SaaS
**Researched:** 2026-02-25
**Overall confidence:** MEDIUM-HIGH

## Table Stakes

Features users expect from any knowledge graph or crypto intelligence tool. Missing these and users bounce immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Text + URL input for graph generation | Core value prop -- users paste content, get a graph. Arkham, Bubblemaps, and every graph tool starts with an input. | Low | Already exists in InstaGraph; just needs polish |
| Interactive graph canvas (pan, zoom, drag) | Every graph visualization tool (Arkham Visualizer, Bubblemaps, Obsidian) has this. Without it, the tool is a static image generator. | Low | Cytoscape.js provides this out of the box |
| Node click to reveal detail panel | "Detail on demand" is the foundational UX pattern for graph exploration (Cambridge Intelligence, Stanford CS520). Users expect to click a node and see its properties. | Medium | Sidebar panel showing entity attributes (AUM, stage, chain, etc.) |
| Entity type visual differentiation | Color/shape coding by entity type (Investor, Project, Round, Narrative, Person) is how every graph tool communicates semantics at a glance. Bubblemaps uses size; Arkham uses color. | Low | Already planned: indigo ellipse, emerald rect, amber diamond, etc. |
| Edge labels showing relationship type | Users need to understand the nature of connections (LED, INVESTED_IN, CO_INVESTED). Without labels, the graph is meaningless. | Low | Existing InstaGraph code already renders edge labels |
| Authentication with social login | Every SaaS product requires auth. Google OAuth is baseline expectation. | Low | Clerk handles this with minimal code |
| Graph history / saved graphs | Users generate multiple graphs over time. Without persistence, every session starts from zero. Messari and Nansen both persist user workspace state. | Medium | Needs Supabase graph index + Neo4j storage |
| Graph export (PNG, JSON) | Analysts need to share findings in reports, Slack, Twitter. Export is table stakes for any data visualization tool. | Low | html-to-image for PNG, JSON download for data |
| Rate limiting with clear feedback | Without limits, AI costs spiral. Users expect clear "you've hit your limit" messaging rather than silent failures. | Low | Upstash sliding window + 429 with Retry-After |
| Loading states and error handling | AI graph generation takes 5-15 seconds. Without progress indication and clear error messages, users assume the tool is broken. | Low | Skeleton states, progress indicators, toast errors |
| Landing page with demo | First-time visitors need to understand the value prop in < 10 seconds. A demo graph embed communicates more than copy. | Medium | Hero + input box + embedded demo graph |
| Mobile-responsive layout | 30-40% of web traffic is mobile. Graph tools don't need mobile parity, but the landing page and basic viewing must work. | Low | CSS only; graph interaction can be desktop-optimized |

## Differentiators

Features that set GraphVC apart from generic knowledge graph tools and crypto analytics platforms. These create competitive advantage specifically for crypto VC intelligence.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Crypto VC-specific entity extraction | Generic graph tools extract generic entities. GraphVC extracts Investor, Project, Round, Narrative, Person with VC-specific properties (AUM, stage focus, token ticker, raise amounts). This is the core moat. | Medium | GPT-4o + crypto-specific system prompt + Pydantic models |
| VC relationship type vocabulary | LED, INVESTED_IN, CO_INVESTED, RAISED, FOUNDED, PARTNERS_AT, FOCUSES_ON, CLASSIFIED_AS -- these specific relationship types map to how crypto VCs actually think about deal flow. No generic tool offers this. | Low | Prompt engineering + schema definition |
| Anonymous 1-graph trial | Reduces friction dramatically. User pastes a URL, gets instant value, THEN is asked to sign up. Most competing tools gate behind registration. | Low | localStorage for anon graph + Clerk prompt on 2nd attempt |
| Node double-click to expand | Exploring a graph by expanding nodes into sub-graphs is the power interaction for investigation workflows. Arkham Visualizer supports this pattern. | High | Requires sub-graph queries to Neo4j, merging new nodes into existing canvas |
| Right-click context menu on nodes | Power users expect contextual actions: "Show all investments by this VC", "Find co-investors", "Open source URL". Arkham and graph analytics tools provide this. | Medium | Cytoscape.js cxtmenu extension or custom implementation |
| URL content caching | Same URL scraped once per hour rather than per request. Reduces latency for popular funding announcements shared by multiple users. | Low | Redis with 1hr TTL; already planned |
| Graph legend / entity type key | When sharing graph screenshots, viewers need to understand the color/shape encoding without context. A persistent legend solves this. | Low | Small overlay component on the canvas |

## Anti-Features

Features to deliberately NOT build for MVP. Each would be valuable eventually but is either too complex, too early, or a distraction from core value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Graph merging / entity deduplication across sessions | Entity resolution is a hard problem (is "a16z crypto" the same as "Andreessen Horowitz"?). Building this wrong creates data quality issues worse than not having it. | Each graph session is independent for MVP. Dedup is a v2 feature requiring fuzzy matching + manual confirmation UX. |
| Real-time data feeds (Crunchbase API, Nansen) | Requires paid data partnerships ($10K+/year), API integrations, data pipeline infrastructure. Premature before product-market fit. | User-initiated scraping of public URLs is the MVP data source. |
| Wallet tracking / on-chain data | Entirely separate data pipeline (blockchain indexers, address labeling). Arkham and Nansen already do this well. Don't compete on their turf. | Focus on off-chain intelligence (funding announcements, news, portfolio pages) as the differentiated angle. |
| Cypher query UI | Power users might want raw graph queries, but it's a niche feature that requires graph database literacy. Alienates 95% of target users. | Provide pre-built exploration patterns via context menus and expand-on-click instead. |
| Team collaboration / shared graphs | Multi-user editing, permissions, sharing -- each is a product in itself. Premature complexity. | Single-user with PNG/JSON export for sharing. Collaboration is v2. |
| Paid tier / billing integration | Don't build billing before validating willingness to pay. Stripe integration is a week of work for uncertain return. | Rate-limit free tier. Add billing only after 100+ active users express intent to pay. |
| Social media scraping (Twitter/X, LinkedIn) | Legal/ToS risk. Twitter API costs are unpredictable. LinkedIn actively blocks scrapers. | Only scrape public web pages. Users can paste text from social media manually. |
| Background job queue for long inputs | QStash or Celery adds infrastructure complexity. MVP caps input at 32k chars which GPT-4o handles in < 30 seconds. | Synchronous request with loading state. Add async processing only if users consistently hit timeouts. |
| Graph comparison / diff view | Comparing two graphs side-by-side requires complex alignment algorithms. Interesting but premature. | Users can open two browser tabs. |
| Custom entity type definitions | Letting users define their own entity types and relationships sounds flexible but creates schema chaos and breaks visualization consistency. | Opinionated fixed schema for crypto VC. Extend the schema based on user feedback, not user configuration. |

## Cytoscape.js Production Patterns

Critical implementation details for handling knowledge graphs in production with Cytoscape.js. The existing InstaGraph codebase uses v3.19.0 with naive configuration. These patterns address real production needs.

### Performance Optimization (Priority: HIGH)

The existing code uses `unbundled-bezier` curve style and function-based style values -- both are among the slowest options in Cytoscape.js.

| Optimization | Impact | Implementation |
|-------------|--------|----------------|
| Upgrade to Cytoscape.js 3.31+ | Access to WebGL renderer preview | npm package update |
| Switch edge curve-style from `unbundled-bezier` to `bezier` | ~2x faster edge rendering | Style config change |
| Replace function-based node width with `data()` mapper | Eliminates per-recalc function calls; static values are fastest, then `data()`, then `mapData()`, then functions | Pre-calculate width during data prep, store as node data property |
| Replace function-based text color with `data()` mapper | Same as above -- compute during data transformation, not during render | Pre-calculate contrast color server-side or in data transform |
| Set `pixelRatio: 1` for large graphs | Reduces rendering load on high-DPI displays | Init option; conditionally apply when node count > 200 |
| Set `hideEdgesOnViewport: true` for large graphs | Hides edges during pan/zoom/drag interactions | Init option; conditionally apply when edge count > 500 |
| Use `min-zoomed-font-size` for labels | Hides labels when zoomed out, reducing render cost | Style property; set to ~12px |
| Avoid `text-background-opacity` on edges | Edge labels with backgrounds are expensive to render | Remove from existing style or use sparingly |
| Use opaque edges (no semi-transparency) | Opaque edges with arrows are 2x+ faster than semi-transparent | Ensure edge opacity is always 1 |
| Batch element additions with `cy.batch()` | Single redraw instead of N redraws when adding multiple elements | Wrap add/remove operations in batch callback |

### WebGL Renderer (Priority: MEDIUM -- watch, don't depend)

Cytoscape.js 3.31.0 (January 2025) shipped a WebGL renderer preview. For graphs with 500+ elements, this provides significant improvement (3 FPS to 10 FPS on 3200-node graphs). However:

- It is marked as "provisional" and requires community feedback
- Uses texture atlases for batched rendering (nodes rendered to sprite sheet, then GPU-composited)
- Enable with `renderer: { name: 'webgl' }` in init options
- Configurable: `webglTexSize`, `webglTexRows`, `webglBatchSize`

**Recommendation:** Use canvas renderer for MVP. Enable WebGL as opt-in for users who generate very large graphs (100+ nodes). Monitor the WebGL renderer stability before making it default.

### Layout Algorithm Selection (Priority: HIGH)

The existing code uses `cose` (Compound Spring Embedder) which is reasonable but can be slow for large graphs.

| Layout | Best For | Performance | Notes |
|--------|----------|-------------|-------|
| `cose` | General purpose, < 100 nodes | Good | Current choice; adequate for MVP graph sizes |
| `cose-bilkent` | Better quality than cose, handles clusters | Moderate | External extension; better visual results for VC relationship clusters |
| `fcose` | Fast compound spring embedder | Fast | Best balance of quality and performance for 50-500 nodes |
| `preset` | Loading saved graphs with known positions | Instant | Use when loading from Neo4j with stored coordinates |
| `dagre` | Hierarchical/directed graphs | Fast | Good for funding chain visualizations (VC -> Round -> Project) |

**Recommendation:** Use `fcose` as the default layout for new graphs (fast, good quality). Use `preset` when loading saved graphs (store positions in Neo4j). Offer `dagre` as an alternative for hierarchical views.

### Interaction Patterns (Priority: HIGH)

Based on graph visualization UX research (Cambridge Intelligence, Stanford CS520, Springer usability studies):

| Pattern | Implementation | Why |
|---------|---------------|-----|
| Click node -> sidebar detail panel | `cy.on('tap', 'node', handler)` populates a sidebar with entity properties | "Detail on demand" -- the single most important graph UX pattern |
| Click empty canvas -> close panel | `cy.on('tap', handler)` checks if target is background | Prevents panel from staying open when user clicks away |
| Hover node -> highlight connected edges | `cy.on('mouseover', 'node', handler)` adds highlighted class to connected edges | Helps users trace relationships without clicking |
| Double-click node -> expand sub-graph (v2) | `cy.on('dbltap', 'node', handler)` queries Neo4j for connected nodes | Progressive disclosure; start simple, drill deeper on demand |
| Fit-to-viewport button | `cy.fit()` with padding | Users lose context after panning; need a "reset view" escape hatch |
| Zoom to selection | `cy.fit(selectedElements)` | Focus on a subset of the graph |
| Node search/filter | Filter by entity type or text search; dim non-matching nodes | Essential when graphs grow beyond 30-40 nodes |

### Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Instead |
|-------------|---------|---------|
| Reinitializing Cytoscape on every graph load | Creates new instance, leaks memory, loses user viewport state | Reuse instance; call `cy.elements().remove()` then `cy.add()` |
| Showing all labels at all zoom levels | Clutters the view, makes the graph unreadable at overview zoom | Use `min-zoomed-font-size` to hide labels when zoomed out |
| Edge labels on every edge | Edge labels are more expensive than node labels and clutter quickly | Show edge labels only on hover or selection; use `display: none` by default, `display: element` on `:selected` or with a class |
| Force-directed layout on saved graphs | Re-running layout scrambles node positions, confusing users who remember spatial arrangement | Store positions; use `preset` layout for saved graphs |
| Complex node shapes for all types | Star, polygon shapes render slower than ellipse/rectangle | Use ellipse + rectangle as base shapes; differentiate with color primarily, shape secondarily |

## Feature Dependencies

```
Authentication (Clerk) -> Graph History (needs user identity)
Authentication (Clerk) -> Rate Limiting (needs user tier)
Graph Generation (GPT-4o) -> Graph Storage (Neo4j)
Graph Storage (Neo4j) -> Graph History page
Graph Storage (Neo4j) -> Individual graph page (/app/graph/[id])
Graph Storage (Neo4j) -> Graph Export (need stored data to export)
Landing Page -> Anonymous Trial (1 free graph)
Anonymous Trial -> Authentication prompt (triggered on 2nd graph attempt)
Node Detail Panel -> Entity properties (needs VC-specific schema)
Cytoscape Performance Optimization -> All graph rendering features
URL Scraping + SSRF prevention -> Graph Generation (feeds content to GPT-4o)
Redis caching -> URL Scraping (prevents redundant fetches)
```

## MVP Recommendation

**Prioritize (Phase 1 -- Core Product):**

1. Graph generation from text/URL with VC-specific entity extraction -- this IS the product
2. Interactive Cytoscape canvas with performance optimizations (not the naive config from InstaGraph)
3. Node click -> detail sidebar panel -- the primary exploration interaction
4. Entity type visual styling (color + shape) -- makes graphs immediately readable
5. Authentication (Clerk) + anonymous 1-graph trial -- acquisition funnel
6. Graph persistence and history -- retention hook

**Prioritize (Phase 2 -- Polish + Export):**

7. Graph export (PNG via html-to-image, JSON download)
8. Rate limiting (Upstash) with clear UX feedback
9. Landing page with embedded demo graph
10. Node hover -> highlight connected edges
11. Fit-to-viewport and basic navigation controls
12. Graph legend overlay

**Defer:**

- **Node expand on double-click:** Requires sub-graph Neo4j queries and graph merging logic. HIGH complexity, save for v2.
- **Right-click context menu:** Useful but not blocking for launch.
- **Graph merging / dedup:** Hard problem. Users can live without it initially.
- **Alternative layout options (dagre):** Start with fcose only; add layout switcher based on user feedback.
- **WebGL renderer:** Monitor stability; canvas renderer is sufficient for MVP graph sizes (typically 10-80 nodes from a single article).

## Competitive Landscape Context

GraphVC occupies a unique niche: **off-chain VC relationship intelligence via AI extraction from public content**. No existing tool does exactly this.

| Competitor | What They Do | GraphVC Differentiation |
|-----------|-------------|------------------------|
| Arkham Intelligence | On-chain address visualization, transaction flow mapping | GraphVC maps off-chain relationships (funding rounds, co-investment patterns) from news/announcements |
| Bubblemaps | Token holder visualization, on-chain cluster analysis | GraphVC focuses on entity relationships, not token holdings |
| Messari | Structured project/fundraising database with manual curation | GraphVC generates relationship graphs instantly from any URL, no manual curation |
| Nansen | Smart money tracking, wallet labels, DeFi analytics | GraphVC maps investor-to-investor and investor-to-project networks, not wallet activity |
| Crunchbase | Funding round database with investor profiles | GraphVC visualizes relationships as explorable graphs rather than flat lists/tables |

The gap: None of these tools let you paste a TechCrunch article about a Series A and instantly see a visual map of who invested alongside whom, what else those VCs funded, and what narratives connect the portfolio.

## Sources

- [Cytoscape.js Performance Optimization (DeepWiki)](https://deepwiki.com/cytoscape/cytoscape.js/8-performance-optimization) -- HIGH confidence
- [Cytoscape.js WebGL Renderer Preview](https://blog.js.cytoscape.org/2025/01/13/webgl-preview/) -- HIGH confidence
- [Cytoscape.js Official Performance Docs](https://github.com/cytoscape/cytoscape.js/blob/master/documentation/md/performance.md) -- HIGH confidence
- [Knowledge Graph Visualization Best Practices (Cambridge Intelligence)](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/) -- MEDIUM confidence
- [Stanford CS520: How Do Users Interact With Knowledge Graphs](https://web.stanford.edu/class/cs520/2020/notes/How_Do_Users_Interact_With_a_Knowledge_Graph.html) -- MEDIUM confidence
- [Arkham Intelligence Visualizer (Codex)](https://codex.arkm.com/the-intelligence-platform/visualizer) -- MEDIUM confidence
- [Top Crypto Analytics Platforms for VCs (Nansen)](https://www.nansen.ai/post/top-crypto-analytics-platforms-used-by-vcs-for-strategic-insights-due-diligence) -- MEDIUM confidence
- [Knowledge Graph Exploration Usability (Springer)](https://link.springer.com/chapter/10.1007/978-3-030-33220-4_24) -- MEDIUM confidence
- [KG Visualization Practical Insights (FalkorDB)](https://www.falkordb.com/blog/knowledge-graph-visualization-insights/) -- MEDIUM confidence
- [Large Network Graph Rendering Methods (Medium)](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-network-graphs-on-the-web-d122ece2f4dc) -- LOW confidence
