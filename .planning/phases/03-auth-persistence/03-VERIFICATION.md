---
phase: 03-auth-persistence
verified: 2026-02-27T00:00:00Z
status: gaps_found
score: 12/13 must-haves verified
re_verification: false
gaps:
  - truth: "Clicking a history card navigates to /app?session=<neo4j_session_id> and loads that graph on the Cytoscape canvas"
    status: failed
    reason: "HistoryCard correctly navigates to /app?session=<id> but app/page.tsx has zero code to read the ?session= query param, fetch the graph, or render it. The user lands on a blank /app page."
    artifacts:
      - path: "apps/web/app/app/page.tsx"
        issue: "No useSearchParams, no URL param reading, no graph-by-session fetch — the ?session= param is silently ignored"
      - path: "apps/api/app/generate/router.py"
        issue: "No GET endpoint to fetch a graph by session_id. get_graph_by_session() exists in repository.py but is never wired to any API route."
    missing:
      - "apps/web/app/app/page.tsx: add useSearchParams to read ?session= on mount, fetch the graph, and populate state"
      - "Either expose GET /api/graphs/session/:id in FastAPI (calling get_graph_by_session) OR use the Supabase graphs table to look up neo4j_session_id and fetch from a new endpoint"
human_verification:
  - test: "Sign up with Google OAuth and generate a graph"
    expected: "User lands at /app after sign-in; graph generates successfully; graph appears in /app/history with auto-generated title, correct node/edge counts, relative timestamp"
    why_human: "Requires real Clerk credentials, Google OAuth flow, and live Supabase/Neo4j — cannot verify OAuth redirect chain programmatically"
  - test: "Clerk webhook delivery verification"
    expected: "Clerk Dashboard -> Webhooks shows successful user.created delivery; Supabase users table has a row with Clerk user_id"
    why_human: "External webhook delivery requires runtime validation; cannot verify Supabase row from codebase"
  - test: "CSP header check — no Refused to connect errors from Clerk"
    expected: "Browser DevTools console shows no blocked requests from Clerk domains"
    why_human: "CSP is computed at runtime using env vars; cannot verify actual request blocking from code"
  - test: "Anonymous trial modal on landing page second attempt"
    expected: "First submission succeeds; second submission shows TrialModal with 'Sign Up' and 'Maybe Later'; 'Maybe Later' disables input"
    why_human: "localStorage state is browser-only; modal behavior requires user interaction"
---

# Phase 3: Auth Persistence Verification Report

**Phase Goal:** The application is a real multi-user product — users sign up, their graphs are saved under their identity, history is browsable, and anonymous users get one free trial before being prompted to sign up
**Verified:** 2026-02-27
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All /app/* routes redirect unauthenticated users to /sign-in | VERIFIED | `proxy.ts` has `clerkMiddleware` with `auth.protect()` on all non-public routes; `/app/*` not in `isPublicRoute` matcher |
| 2 | Clerk context is available throughout the Next.js app | VERIFIED | `ClerkProvider` wraps `<html>` in `layout.tsx` (line 18), outside `PostHogProvider` |
| 3 | CSP headers allow Clerk domains | VERIFIED | `next.config.ts` derives `clerkFrontendApi` from publishable key; adds to `script-src`, `connect-src`; `img.clerk.com` in `img-src`; `challenges.cloudflare.com` in `frame-src` |
| 4 | Supabase client initializes once in FastAPI lifespan | VERIFIED | `main.py` creates singleton in `lifespan()`, stored in `app.state.supabase`; graceful `None` when not configured |
| 5 | FastAPI has supabase_url and supabase_key settings | VERIFIED | `config.py` has both fields with empty-string defaults |
| 6 | get_supabase_client dependency returns the singleton | VERIFIED | `dependencies.py` returns `getattr(request.app.state, 'supabase', None)` |
| 7 | Clerk webhook handler upserts users table on user.created | VERIFIED | `app/api/webhooks/clerk/route.ts` calls `verifyWebhook`, checks `user.created`, calls `supabase.from('users').upsert(...)` |
| 8 | User can sign in at /sign-in; user can sign up at /sign-up | VERIFIED | Catch-all routes at `sign-in/[[...sign-in]]/page.tsx` and `sign-up/[[...sign-up]]/page.tsx` with real Clerk `<SignIn />`/`<SignUp />` components; old flat stubs deleted |
| 9 | Authenticated API calls include Authorization: Bearer header | VERIFIED | `lib/api.ts` `generateGraph` accepts optional `getToken`; attaches `Authorization: Bearer ${token}` when present; `app/page.tsx` imports `useAuth`, passes `getToken` |
| 10 | Neo4j nodes have created_by field set to user_id or 'anonymous' | VERIFIED | `repository.py` `persist_graph` accepts `user_id` param (default "anonymous"); Cypher CREATE includes `created_by: $user_id`, `created_at: datetime()`, both parameterized (SEC-02 maintained) |
| 11 | Every POST /api/generate logs a row to Supabase request_log | VERIFIED | `router.py` inserts to `supabase.table("request_log")` after handler; wrapped in `try/except pass` (fire-and-forget) |
| 12 | Authenticated graph generations save a row to Supabase graphs table | VERIFIED | `service.py` inserts to `supabase.table("graphs")` when `user_id != "anonymous"`; fire-and-forget |
| 13 | Clicking a history card navigates to /app?session=<id> and loads the saved graph | FAILED | `HistoryCard.tsx` navigates to `/app?session=${graph.neo4j_session_id}` correctly, but `app/app/page.tsx` has zero code to read `?session=` param or fetch/render the graph. No FastAPI GET endpoint exists for fetching by session_id. Graph will not appear. |
| 14 | Authenticated user sees graph history at /app/history as a card grid | VERIFIED | `history/page.tsx` fetches `/api/graphs`, renders `HistoryCard` grid (1/2/3 col), search filter, loading skeleton, empty state |
| 15 | History cards show title, source preview, node count, edge count, relative timestamp, delete button | VERIFIED | `HistoryCard.tsx` renders all fields; `relativeTime()` helper; delete button visible on hover |
| 16 | User can filter history cards by typing in the search box | VERIFIED | `history/page.tsx` filters `graphs` array client-side on title match |
| 17 | User can rename a graph inline (click title, edit, Enter/blur to save) | VERIFIED | `HistoryCard.tsx` has `handleTitleClick` entering edit mode; `handleRenameSubmit` PATCH to `/api/graphs/:id/rename`; Escape cancels |
| 18 | User can delete their own graph (card removed immediately) | VERIFIED | `handleDelete` calls DELETE `/api/graphs/:id`; `onDelete` removes from parent state optimistically |
| 19 | Anonymous user sees sign-up modal on second generation attempt | VERIFIED | `HeroSection.tsx` checks `isTrialUsed()` before submit; shows `TrialModal` if used; `markTrialUsed()` called after first success |
| 20 | Trial modal has Sign Up (/sign-up) and Maybe Later (dismisses) buttons | VERIFIED | `TrialModal.tsx` has `<Link href="/sign-up">` and `<button onClick={onDismiss}>Maybe Later</button>`; dismiss sets `trialBlocked=true` disabling input |
| 21 | Auto-title is generated from source URL domain or first 60 chars of text | VERIFIED | `_auto_title()` in `service.py`: URL → `domain · Month Day`; text → `text[:60] + "..."` |
| 22 | Supabase logging failure never blocks the API response | VERIFIED | Both `graphs.insert()` and `request_log.insert()` wrapped in `try: ... except: pass` |

**Score:** 12/13 truths verified (1 failed)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/proxy.ts` | Auth guard protecting /app/* | VERIFIED | `clerkMiddleware` + `createRouteMatcher`; `auth.protect()` on all non-public routes |
| `apps/web/app/layout.tsx` | ClerkProvider wrapping entire app | VERIFIED | `ClerkProvider` wraps `<html>` on line 18 |
| `apps/web/next.config.ts` | Updated CSP allowing Clerk domains | VERIFIED | Dynamic `clerkFrontendApi` derivation; `img.clerk.com`; `frame-src challenges.cloudflare.com` |
| `apps/api/app/config.py` | supabase_url and supabase_key settings | VERIFIED | Both fields present with empty-string defaults |
| `apps/api/app/main.py` | Supabase singleton in lifespan | VERIFIED | `app.state.supabase = create_client(...)` with graceful None |
| `apps/api/app/dependencies.py` | get_supabase_client dependency | VERIFIED | Returns `Client | None` from `app.state` |
| `apps/web/app/api/webhooks/clerk/route.ts` | Clerk webhook handler | VERIFIED | `verifyWebhook` + `user.created` check + `users.upsert` |
| `apps/web/lib/supabase.ts` | Supabase client factory | VERIFIED | `createSupabaseAdmin()` with service role key, `persistSession: false` |
| `apps/web/app/sign-in/[[...sign-in]]/page.tsx` | Sign-in page with Clerk SignIn | VERIFIED | Real `<SignIn />` with dark theme appearance; old flat stub deleted |
| `apps/web/app/sign-up/[[...sign-up]]/page.tsx` | Sign-up page with Clerk SignUp | VERIFIED | Real `<SignUp />` with dark theme appearance; old flat stub deleted |
| `apps/web/lib/api.ts` | generateGraph with optional getToken | VERIFIED | `getToken?: (() => Promise<string | null>) | null`; Bearer header conditional |
| `apps/web/app/app/page.tsx` | AppPage using useAuth().getToken() | VERIFIED | `useAuth()` imported; `getToken` passed to `generateGraph`; in dependency array |
| `apps/api/app/graph/repository.py` | persist_graph with created_by field | VERIFIED | `user_id` param (default "anonymous"); `created_by: $user_id` in Cypher |
| `apps/api/app/generate/service.py` | run_generate_pipeline with user_id + Supabase graph save | VERIFIED | Both `user_id` and `supabase` params; `_auto_title()`; `graphs.insert` fire-and-forget |
| `apps/api/app/generate/router.py` | Route handler with user_id + supabase + request logging | VERIFIED | `get_supabase_client` dependency; `request_log.insert` fire-and-forget |
| `apps/web/app/api/graphs/route.ts` | GET /api/graphs — list user's graphs | VERIFIED | `auth()` check; Supabase query filtered by `userId`; ordered by `created_at DESC` |
| `apps/web/app/api/graphs/[id]/route.ts` | DELETE /api/graphs/[id] | VERIFIED | Ownership check `.eq('user_id', userId)`; returns `{ success: true }` |
| `apps/web/app/api/graphs/[id]/rename/route.ts` | PATCH /api/graphs/[id]/rename | VERIFIED | Ownership check; empty title validation; `title.trim()` update |
| `apps/web/app/app/history/page.tsx` | History page — card grid, search, empty state | VERIFIED | Fetches `/api/graphs`; `HistoryCard` grid (1/2/3 col); search filter; loading skeleton; empty state |
| `apps/web/components/history/HistoryCard.tsx` | History card with inline rename, delete, nav | VERIFIED | All features implemented; navigates to `/app?session=${graph.neo4j_session_id}` (nav destination is correct; loading side is broken) |
| `apps/web/lib/trial.ts` | localStorage trial flag utilities | VERIFIED | `TRIAL_KEY = 'graphvc_trial_used'`; `isTrialUsed()`/`markTrialUsed()` with SSR `typeof window` guard |
| `apps/web/components/auth/TrialModal.tsx` | Sign-up prompt modal | VERIFIED | Link to `/sign-up`; "Maybe Later" button; `onDismiss` prop |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | `/app/*` protection | `clerkMiddleware` + `auth.protect()` | WIRED | `isPublicRoute` does not include `/app`; all non-public routes call `auth.protect()` |
| `layout.tsx` | `ClerkProvider` | Wraps `<html>` | WIRED | `ClerkProvider` is outermost element wrapping `PostHogProvider` |
| `app/app/page.tsx` | `lib/api.ts` | `generateGraph(input, signal, getToken)` | WIRED | Line 51: `generateGraph(input, controllerRef.current.signal, getToken)` |
| `lib/api.ts` | `/api/generate` | `Authorization: Bearer` header | WIRED | `...(token ? { Authorization: \`Bearer ${token}\` } : {})` |
| `main.py` | `app.state.supabase` | `lifespan create_client()` | WIRED | Line 43: `app.state.supabase = create_client(...)` |
| `webhooks/clerk/route.ts` | `supabase.from('users').upsert` | `verifyWebhook + user.created` | WIRED | Line 17: `supabase.from('users').upsert({...})` |
| `router.py` | `service.py` | `run_generate_pipeline(user_id=, supabase=)` | WIRED | Line 48-53: `run_generate_pipeline(raw_input=body.input, driver=driver, user_id=user_id, supabase=supabase)` |
| `service.py` | `repository.py` | `persist_graph(user_id=user_id)` | WIRED | Line 130: `persist_graph(driver, session_id=session_id, nodes=nodes, edges=edges, user_id=user_id)` |
| `router.py` | `supabase.table('request_log').insert` | After-handler fire-and-forget | WIRED | Lines 60-68: full `request_log` insert |
| `history/page.tsx` | `/api/graphs` | `fetch` on mount | WIRED | `useEffect` fetches `/api/graphs`, sets `graphs` state |
| `HistoryCard.tsx` | `/app?session=` | `router.push` on card click | WIRED — destination broken | `router.push(\`/app?session=${graph.neo4j_session_id}\`)` navigates correctly; but `/app/page.tsx` ignores the param |
| `HeroSection.tsx` | `lib/trial.ts` | `isTrialUsed()` check before submit | WIRED | Lines 40-43: `if (isTrialUsed()) { setShowTrialModal(true); return }` |
| `HeroSection.tsx` | `TrialModal` | Renders when `showTrialModal === true` | WIRED | Line 242: `{showTrialModal && <TrialModal onDismiss={handleDismissTrialModal} />}` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 03-01, 03-03 | Users sign up/sign in via Clerk; /app/* redirects to /sign-in; Bearer header on API calls | SATISFIED | `proxy.ts` guard; catch-all sign-in/sign-up pages; `lib/api.ts` Bearer attachment; `useAuth().getToken()` in `app/page.tsx` |
| AUTH-02 | 03-05 | Anonymous user gets one free graph; sign-up prompt on second attempt | SATISFIED | `lib/trial.ts`; `HeroSection.tsx` trial gate with `isTrialUsed()`/`markTrialUsed()`; `TrialModal` with "Sign Up"/"Maybe Later" |
| AUTH-03 | 03-02, 03-04 | Supabase users table synced via webhook; graphs table updated per generation | SATISFIED | Webhook handler upserts `users`; `service.py` inserts to `graphs` for authenticated users |
| AUTH-04 | 03-02, 03-04 | Every API request logged to request_log | SATISFIED | `router.py` fire-and-forget `request_log.insert` after every `/api/generate` call |
| AI-05 | 03-04 | Graph nodes persisted with `created_by: user_id` field | SATISFIED | `repository.py` `persist_graph` with `created_by: $user_id` in Cypher; parameterized (SEC-02 safe) |
| FE-03 | 03-05 | View graph history; search by title; click to reload a graph; delete | PARTIAL — gap | History list, search, delete, rename all work. "Click to reload a graph" is NOT working — `/app?session=<id>` is never handled by `app/page.tsx`. |

---

## Anti-Patterns Found

No stub anti-patterns detected. No TODO/FIXME in phase-modified files. No empty implementations. No console.log-only handlers.

One pre-existing TypeScript error documented in `deferred-items.md` (cytoscapeStyles.ts — unrelated to Phase 3 scope).

---

## Human Verification Required

### 1. Google OAuth sign-up and sign-in flow

**Test:** In an incognito browser, visit `http://localhost:3000/sign-up`, sign up with Google OAuth
**Expected:** OAuth completes, user is redirected to `/app`; repeat with sign-in at `/sign-in`
**Why human:** Requires real Clerk credentials and Google OAuth round-trip — cannot verify OAuth redirect chain programmatically

### 2. Authenticated graph generation and history sync

**Test:** While signed in, generate a graph at `/app`, then visit `/app/history`
**Expected:** Graph card appears with auto-generated title, correct node count, edge count, relative timestamp
**Why human:** Requires live Supabase, Neo4j, OpenAI, and Clerk — end-to-end data pipeline

### 3. Clerk webhook and Supabase users sync

**Test:** After sign-up, check Clerk Dashboard -> Webhooks (delivery log) and Supabase -> users table
**Expected:** Successful `user.created` webhook delivery; users row with Clerk user_id
**Why human:** External webhook delivery and database rows require runtime validation

### 4. CSP no-error verification

**Test:** Open browser DevTools -> Console during app use with Clerk active
**Expected:** No "Refused to connect" or "Refused to load" errors related to Clerk domains
**Why human:** CSP enforcement is browser-runtime only; computed from env vars at build time

### 5. Anonymous trial modal on landing page

**Test:** Signed out, visit `/`, generate one graph, try a second generation
**Expected:** Trial modal appears with "Sign Up" (navigates to /sign-up) and "Maybe Later" (dismisses, input disabled)
**Why human:** localStorage state is browser-only; modal interaction requires user action

---

## Gaps Summary

**One gap blocking full goal achievement:**

The history card navigation is broken end-to-end. The plan specified "clicking a history card navigates to `/app` with the saved graph preloaded on the Cytoscape canvas" (03-CONTEXT.md line 26). Two components of this are missing:

1. **Frontend:** `apps/web/app/app/page.tsx` has no `useSearchParams` call, no `?session=` param reading, and no graph-fetching logic triggered by URL params. The `HistoryCard` correctly calls `router.push('/app?session=<id>')` but the destination page silently ignores the param.

2. **Backend:** `get_graph_by_session()` exists in `apps/api/app/graph/repository.py` but is never exposed via any FastAPI route. There is no `GET /api/generate/:session_id` or `GET /api/graphs/session/:id` endpoint.

**FE-03 is partially satisfied** — all history features work except graph reload from history card click.

All other auth, persistence, and trial requirements are fully implemented and verified against the codebase.

---

_Verified: 2026-02-27_
_Verifier: Claude (gsd-verifier)_
