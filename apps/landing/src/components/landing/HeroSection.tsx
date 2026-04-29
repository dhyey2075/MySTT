import { useState } from 'react'

import { ArrowDownToLine, Sparkles } from 'lucide-react'

import { site } from '@/config/site'
import { Button } from '@/components/ui/button'
import { resolveWindowsInstallerUrl } from '@/lib/resolve-windows-installer-url'

export function HeroSection() {
  const [downloadPending, setDownloadPending] = useState(false)

  async function handleDownloadWindows() {
    const explicit = import.meta.env.VITE_DOWNLOAD_URL?.trim()
    if (explicit) {
      window.location.assign(explicit)
      return
    }

    setDownloadPending(true)
    try {
      const url = await resolveWindowsInstallerUrl()
      window.location.assign(url)
    } catch {
      window.open(site.downloadUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadPending(false)
    }
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-4 text-center md:pb-20 md:pt-8">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        Offline-first · Optional cloud
      </p>
      <h1 className="font-sans text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
        Speech to text, on your terms.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        MySTT runs <strong className="font-medium text-foreground">whisper.cpp</strong> locally for private dictation,
        with optional OpenAI when you bring your own key. No account wall — just your desktop.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button
          type="button"
          size="lg"
          className="min-w-[14rem]"
          disabled={downloadPending}
          aria-busy={downloadPending}
          onClick={() => void handleDownloadWindows()}
        >
          <ArrowDownToLine className="size-5" aria-hidden />
          {downloadPending ? 'Fetching download…' : 'Download for Windows'}
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={site.githubRepo} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </Button>
      </div>
    </section>
  )
}
