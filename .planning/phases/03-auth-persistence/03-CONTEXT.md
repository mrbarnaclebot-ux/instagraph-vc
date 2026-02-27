# Phase 3: Auth + Persistence - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the app into a real multi-user product: Clerk authentication (sign-up/sign-in), per-user graph ownership in Neo4j, browsable/searchable graph history at /app/history, anonymous one-free-trial limit with sign-up modal, and Supabase request logging. Rate limiting and export are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Auth pages
- Custom branded pages — use Clerk's `<SignIn />` and `<SignUp />` components inside Next.js pages (not Clerk-hosted redirect). The existing sign-in/sign-up page stubs are the target files.
- Google OAuth only — no email/password, no GitHub. Single provider keeps auth surface minimal.
- After sign-in: redirect to `/app` (graph generator), not history.
- Auth guard: Next.js middleware redirects unauthenticated `/app/*` requests to `/sign-in` with a `?redirect_url` return param so they land back on `/app` after signing in.

### Graph history layout
- Card grid layout at `/app/history`.
- Each card shows: auto-generated title (prominent), source URL / input preview (truncated), node count + edge count (e.g. "12 nodes · 18 relationships"), relative timestamp (e.g. "2 hours ago"), and a delete button.
- Client-side instant filter for search — no server query. Filter the already-loaded list as user types.
- Clicking a history card navigates to `/app` with the saved graph preloaded on the Cytoscape canvas (not a separate detail page).

### Graph naming & identity
- Auto-title from source URL domain: e.g. "techcrunch.com · Feb 27" for URLs, first 60 chars of text for pasted inputs.
- Users can rename graphs inline on the history card (click title to edit in place, press Enter/blur to save).

### Anonymous trial UX
- One free graph total, tracked via `localStorage` flag (key: `graphvc_trial_used`). Applies across both the landing page hero (`/`) and `/app` — same flag, same limit.
- When the user tries to submit a second graph (either surface), show a modal overlay: "You've used your free graph — sign up to generate more." with "Sign Up" (→ `/sign-up`) and "Maybe Later" buttons.
- "Maybe Later" dismisses the modal. The user can still view and interact with their already-generated graph, but the input stays disabled and blocked — no more free submissions.

### Claude's Discretion
- Exact card grid column count / responsive breakpoints
- Supabase client setup pattern (server component vs API route)
- Clerk middleware configuration details
- Loading skeleton on history page
- Empty state design for `/app/history` when user has no graphs yet

</decisions>

<specifics>
## Specific Ideas

- The sign-in/sign-up pages already exist as stubs (created in previous todo work) — they should be wired up with actual Clerk `<SignIn />` / `<SignUp />` components and Google OAuth configured.
- The trial modal should feel like a soft conversion prompt, not a hard paywall — friendly copy, not aggressive.

</specifics>

<deferred>
## Deferred Ideas

- Email/password authentication — deferred; Google OAuth only for Phase 3
- GitHub OAuth — deferred to backlog
- Graph sharing / team workspaces — Phase 4+ or separate phase
- Graph rename from the canvas view (not history) — backlog
- Rate limiting per user — Phase 4

</deferred>

---

*Phase: 03-auth-persistence*
*Context gathered: 2026-02-27*
