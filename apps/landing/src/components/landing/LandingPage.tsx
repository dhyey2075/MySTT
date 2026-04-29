import { HeroSection } from '@/components/landing/HeroSection'
import { InstallHint } from '@/components/landing/InstallHint'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { PreviewShowcase } from '@/components/landing/PreviewShowcase'
import { RequirementsRow } from '@/components/landing/RequirementsRow'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <HeroSection />
        <div className="mx-auto max-w-lg px-6 pb-8">
          <RequirementsRow />
        </div>
        <InstallHint />
        <PreviewShowcase />
      </main>
      <LandingFooter />
    </div>
  )
}
