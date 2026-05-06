import { site } from '@/config/site'

export function LandingFooter() {
  return (
    <footer className="border-t border-border/80 bg-muted/20 px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
        <p className="flex items-center gap-3">
          <img src="/logo.png" width={28} height={28} alt="" className="size-7 shrink-0 rounded-md object-contain" />
          <span>
            © {new Date().getFullYear()} MySTT contributors ·{' '}
            <a href={site.licenseUrl} className="underline-offset-4 hover:text-foreground hover:underline" target="_blank" rel="noopener noreferrer">
              MIT License
            </a>
          </span>
        </p>
        <a
          href={site.thirdPartyUrl}
          className="text-xs underline-offset-4 hover:text-foreground hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Third-party notices
        </a>
      </div>
    </footer>
  )
}
