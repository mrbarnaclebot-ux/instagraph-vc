# Phase 4: Guardrails + Export - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Rate limiting with user feedback to protect AI costs, Redis URL caching to reduce duplicate scrapes, and JSON/PNG graph export for reports. This phase makes the app production-safe (cost guardrails) and adds data portability (export).

</domain>

<decisions>
## Implementation Decisions

### Rate limit tiers & feedback
- Anonymous users: 1 generation per day
- Signed-in users: 3 generations per day
- Daily count resets at midnight UTC
- When limit is hit: modal appears prompting user to enter their own OpenAI API key
- Persistent usage counter always visible (e.g., "2 of 3 generations used today")
- API key stored in browser localStorage only — never sent to backend for storage
- When user has their own API key set, rate limit is bypassed (unlimited generations)

### Export button placement & interaction
- Floating action buttons (FAB-style) in the bottom-right corner of the graph canvas
- Always visible when a graph exists; not rendered when no graph is present
- One-click instant download — no intermediary modal or popover
- Two buttons: Export JSON, Export PNG

### Export scope & quality
- PNG captures the full graph extent (not just the current viewport)
- PNG background matches the app background (not transparent)
- JSON uses a cleaned/simplified format optimized for readability, not the raw API response
- Filenames auto-generated from graph content (e.g., "graphvc-a16z-funding-round-2026-02-27.json")

### Caching behavior & transparency
- Redis URL cache with 1-hour TTL
- Show a "cached" indicator on results served from cache (e.g., "Cached — scraped 23 min ago")
- Refresh button available to force a fresh re-scrape, bypassing cache
- Force refresh counts as a generation against the user's daily rate limit

### Claude's Discretion
- Exact FAB button styling and icon choices
- Usage counter placement and visual treatment
- Cached indicator design and positioning
- JSON simplified format structure (as long as it's readable and contains nodes + edges)
- PNG resolution / scale factor
- Modal design for API key entry
- 429 response format and Retry-After header value

</decisions>

<specifics>
## Specific Ideas

- API key modal should appear when the user hits their limit — not as a settings page. It's a conversion moment.
- Usage counter should be persistent and always visible, giving users awareness of remaining generations.
- Cache indicator creates trust — users know they're seeing recent data and can refresh if needed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-guardrails-export*
*Context gathered: 2026-02-27*
