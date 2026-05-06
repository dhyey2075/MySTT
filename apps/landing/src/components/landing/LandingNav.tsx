import type { ReactNode } from 'react'
import { Code } from 'lucide-react'

import { site } from '@/config/site'

function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ?? 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
      }
    >
      {children}
    </a>
  )
}

export function LandingNav() {
  return (
    <header className="relative z-10 w-full px-6 pb-8 pt-8 md:px-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <a href="#" className="inline-flex items-center gap-2.5 font-sans text-lg font-semibold tracking-tight text-foreground md:text-xl">
          <img src="/logo.png" width={36} height={36} alt="" className="size-9 shrink-0 rounded-md object-contain" />
          <span>{site.name}</span>
        </a>
        <nav className="flex items-center gap-6 md:gap-8">
          <ExternalLink href={site.releasesUrl} className="hidden text-sm sm:inline">
            Releases
          </ExternalLink>
          <ExternalLink href={site.githubRepo} className="inline-flex items-center gap-2">
            <Code className="size-4" aria-hidden />
            Source
          </ExternalLink>
        </nav>
      </div>
    </header>
  )
}
