import Link from 'next/link'

export default function CtaBand() {
  return (
    <section className="border-t border-gray-800 bg-gray-900/30">
      <div className="mx-auto max-w-7xl px-6 py-16 text-center space-y-6">
        <h2 className="text-3xl font-bold text-white">Ready to map the VC network?</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Start free — no credit card required. Generate your first graph in under 30 seconds.
        </p>
        <Link
          href="/sign-in"
          className="inline-block px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          Start free →
        </Link>
      </div>
    </section>
  )
}
