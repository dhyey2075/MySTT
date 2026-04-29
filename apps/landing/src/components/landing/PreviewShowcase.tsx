import { Card, CardContent } from '@/components/ui/card'

export function PreviewShowcase() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 md:px-10">
      <Card className="overflow-hidden border-border/80 bg-muted/30 shadow-none">
        <CardContent className="flex flex-col items-center p-8 pb-10 md:p-12 md:pb-12">
          <div className="relative flex aspect-[21/10] w-full max-w-xl items-center justify-center rounded-3xl bg-zinc-950 shadow-inner ring-1 ring-white/10">
            {/* Glow */}
            <div
              className="pointer-events-none absolute inset-0 animate-gradient-shift rounded-3xl opacity-90 blur-3xl"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139, 92, 246, 0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 30% 60%, rgba(59, 130, 246, 0.35), transparent 50%), radial-gradient(ellipse 40% 35% at 70% 45%, rgba(244, 114, 182, 0.25), transparent 45%)',
              }}
              aria-hidden
            />
            {/* Floating pill */}
            <div className="relative z-10 flex h-14 min-w-[200px] max-w-[min(90%,320px)] animate-gradient-shift items-center justify-center rounded-full bg-zinc-900/90 px-8 shadow-2xl ring-1 ring-violet-500/30 backdrop-blur-sm md:h-16">
              <span className="font-mono text-xs font-medium text-zinc-100/90 md:text-sm">Listening · local engine</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
