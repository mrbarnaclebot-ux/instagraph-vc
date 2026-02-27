import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Public routes — everything else (including /app/*) is protected
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/api/webhooks/(.*)', // Clerk webhook must be public (no Clerk session)
])

// RATE-02: Per-IP brute-force protection (60 req/min sliding window)
// Only initialized if Upstash env vars are set — graceful degradation in dev
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'ratelimit:ip',
      ephemeralCache: new Map(),
    })
  : null

// Routes exempt from IP rate limiting (Clerk SSO callbacks, webhooks)
const isRateLimitExempt = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // RATE-02: IP rate limit (skip for auth callbacks to prevent Clerk SSO 429s)
  if (ratelimit && !isRateLimitExempt(req)) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const { success, reset } = await ratelimit.limit(ip)
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      )
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
