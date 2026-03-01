import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <nav className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-base tracking-tight">
            Instagraph
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Already have an account?{' '}
            <span className="text-indigo-400 hover:text-indigo-300">Sign in</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton: 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700',
                formFieldInput: 'bg-gray-800 border-gray-700 text-white',
                footerActionLink: 'text-indigo-400 hover:text-indigo-300',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
