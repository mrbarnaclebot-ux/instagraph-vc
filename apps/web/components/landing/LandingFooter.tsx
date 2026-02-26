import Link from 'next/link'

export default function LandingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white font-bold text-sm">Instagraph</span>
        <div className="flex items-center gap-6 text-gray-500 text-xs">
          <span>© {year} Instagraph</span>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
