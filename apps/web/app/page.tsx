import LandingNav from '@/components/landing/LandingNav'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorks from '@/components/landing/HowItWorks'
import PersonaCards from '@/components/landing/PersonaCards'
import CtaBand from '@/components/landing/CtaBand'
import LandingFooter from '@/components/landing/LandingFooter'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <PersonaCards />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  )
}
