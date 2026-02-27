import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'

// Derive Clerk frontend API from publishable key (pk_test_<base64url> → hostname)
// Falls back to NEXT_PUBLIC_CLERK_FRONTEND_API if set explicitly
function getClerkFrontendApi(): string {
  const explicit = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
  if (explicit) return explicit
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
  if (!pk) return ''
  try {
    const b64 = pk.replace(/^pk_(test|live)_/, '').replace(/\$+$/, '')
    return Buffer.from(b64, 'base64url').toString('utf-8').replace(/\$+$/, '')
  } catch {
    return ''
  }
}
const clerkFrontendApi = getClerkFrontendApi()

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}${clerkFrontendApi ? ` https://${clerkFrontendApi}` : isDev ? ' https://*.accounts.dev' : ''} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com${clerkFrontendApi ? ` https://${clerkFrontendApi}` : isDev ? ' https://*.accounts.dev https://*.clerk.accounts.dev' : ''}`,
      "worker-src blob:",
      "img-src 'self' blob: data: https://img.clerk.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "frame-src https://challenges.cloudflare.com",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  transpilePackages: ['@graphvc/shared-types'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
  disableLogger: true,
})
