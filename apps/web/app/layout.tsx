import type { Metadata } from 'next'
import { Geist, Geist_Mono, Syne } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PostHogProvider } from './providers'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Instagraph — VC Funding Network Maps',
  description: 'Instantly generate and explore visual maps of VC funding networks from any funding announcement.',
  openGraph: {
    title: 'Instagraph — VC Funding Network Maps',
    description: 'Instantly generate and explore visual maps of VC funding networks from any funding announcement.',
    type: 'website',
    siteName: 'Instagraph',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Instagraph — VC Funding Network Maps',
    description: 'Instantly generate and explore visual maps of VC funding networks from any funding announcement.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}>
          <PostHogProvider>
            {children}
            <Toaster richColors position="top-right" />
            <Analytics />
            <SpeedInsights />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
