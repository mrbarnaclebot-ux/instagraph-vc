import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'
const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API ?? ''

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}${clerkFrontendApi ? ` https://${clerkFrontendApi}` : ''} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com${clerkFrontendApi ? ` https://${clerkFrontendApi}` : ''}`,
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
