import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Instagraph',
  description: 'How Instagraph collects, uses, and protects your data.',
}

const LAST_UPDATED = 'February 26, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-base tracking-tight">
            Instagraph
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 py-16 px-6">
        <div className="mx-auto max-w-2xl space-y-12">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: {LAST_UPDATED}</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Instagraph (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the Instagraph platform — a tool that
              generates visual knowledge graphs from VC funding announcements. This Privacy
              Policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </div>

          <Section title="1. Information We Collect">
            <Subsection title="Information you provide">
              <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm">
                <li>Text or URLs you paste into the graph generation tool</li>
                <li>Email address if you sign up for early access or an account</li>
              </ul>
            </Subsection>
            <Subsection title="Automatically collected information">
              <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm">
                <li>Usage analytics including pages visited, features used, and session duration (via PostHog)</li>
                <li>Error and performance data (via Sentry) to help us improve reliability</li>
                <li>Browser type, operating system, and general geographic region (country-level)</li>
                <li>IP address (used for abuse prevention; not stored long-term)</li>
              </ul>
            </Subsection>
          </Section>

          <Section title="2. How We Use Your Information">
            <p className="text-gray-400 text-sm leading-relaxed">We use collected information to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm mt-2">
              <li>Process your graph generation requests using OpenAI&apos;s GPT-4o model</li>
              <li>Store generated graphs in our Neo4j database to serve results to you</li>
              <li>Monitor and improve the performance and reliability of our service</li>
              <li>Detect and prevent abuse, spam, or misuse of the platform</li>
              <li>Send product updates and feature announcements (only if you opt in)</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing">
            <p className="text-gray-400 text-sm leading-relaxed">
              We do not sell your personal data. We share information only with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm mt-2">
              <li>
                <strong className="text-gray-300">OpenAI</strong> — Input text you submit is sent to OpenAI&apos;s API
                for entity extraction. OpenAI&apos;s data usage policies apply. We use the API without
                training data retention opt-in.
              </li>
              <li>
                <strong className="text-gray-300">PostHog</strong> — Anonymous usage analytics to understand
                feature adoption and improve the product.
              </li>
              <li>
                <strong className="text-gray-300">Sentry</strong> — Error and crash reporting to help us fix bugs.
              </li>
              <li>
                <strong className="text-gray-300">Legal requirements</strong> — We may disclose information if
                required by law, court order, or government authority.
              </li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p className="text-gray-400 text-sm leading-relaxed">
              Generated graphs are stored in our database and associated with a session ID. We retain
              graph data for up to <strong className="text-gray-300">90 days</strong> after generation,
              after which it is automatically deleted. If you create an account, your data is retained
              for the lifetime of your account and for 30 days after account deletion.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">
              Analytics data (PostHog, Sentry) is retained per those services&apos; own policies (typically
              1 to 2 years).
            </p>
          </Section>

          <Section title="5. Cookies and Tracking">
            <p className="text-gray-400 text-sm leading-relaxed">
              We use cookies and browser local storage to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm mt-2">
              <li>Maintain your session and authentication state</li>
              <li>Remember your preferences</li>
              <li>Collect anonymized analytics via PostHog</li>
            </ul>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">
              We do not use advertising cookies or third-party tracking pixels.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <p className="text-gray-400 text-sm leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li>Opt out of analytics tracking</li>
              <li>Data portability (export your data in a machine-readable format)</li>
            </ul>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@instagraph.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                privacy@instagraph.ai
              </a>.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p className="text-gray-400 text-sm leading-relaxed">
              We take security seriously. Measures include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm mt-2">
              <li>All data in transit encrypted with TLS 1.2+</li>
              <li>API authentication via signed JWT tokens (RS256)</li>
              <li>Server-Side Request Forgery (SSRF) protection on all URL inputs</li>
              <li>Parameterized database queries to prevent injection attacks</li>
              <li>Automated error monitoring via Sentry</li>
            </ul>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">
              No method of transmission over the Internet is 100% secure. We cannot guarantee absolute
              security, but we maintain industry-standard protections.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p className="text-gray-400 text-sm leading-relaxed">
              Instagraph is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe we have inadvertently collected such
              information, please contact us immediately.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p className="text-gray-400 text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by updating the &ldquo;Last updated&rdquo; date at the top of this page and, where
              appropriate, by sending an email notification. Your continued use of Instagraph after
              changes become effective constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact">
            <p className="text-gray-400 text-sm leading-relaxed">
              Questions about this Privacy Policy? Contact us:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-gray-900 border border-gray-800 text-sm space-y-1">
              <p className="text-gray-300 font-medium">Instagraph</p>
              <p className="text-gray-500">
                Email:{' '}
                <a href="mailto:privacy@instagraph.ai" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  privacy@instagraph.ai
                </a>
              </p>
            </div>
          </Section>

          {/* Footer */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              ← Back to Instagraph
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Terms of Service →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      {children}
    </div>
  )
}
