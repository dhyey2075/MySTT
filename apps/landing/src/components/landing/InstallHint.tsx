import { site } from '@/config/site'

export function InstallHint() {
  return (
    <div className="flex justify-center px-6 pb-12 pt-2">
      <a
        href={site.readmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        — First run? See README for setup —
      </a>
    </div>
  )
}
