export type HeroPhase = 'idle' | 'recording' | 'processing' | 'success' | 'error'

export function HeroCard(props: {
  phase: HeroPhase
  /** Primary description under title — overrides defaults when provided. */
  subtitle?: string | null
  detail?: string | null
}) {
  const { phase } = props
  const subtitle =
    props.subtitle != null && props.subtitle !== ''
      ? props.subtitle
      : phase === 'idle'
        ? 'Hold your hotkey, speak clearly, then release to transcribe and paste into the focused window.'
        : ''

  let badgeClass = 'hero-badge hero-badge--idle'
  let badgeLabel = 'Ready'
  let dot = false

  switch (phase) {
    case 'idle':
      badgeClass = 'hero-badge hero-badge--idle'
      badgeLabel = 'Ready'
      break
    case 'recording':
      badgeClass = 'hero-badge hero-badge--recording'
      badgeLabel = 'Recording'
      dot = true
      break
    case 'processing':
      badgeClass = 'hero-badge hero-badge--busy'
      badgeLabel = 'Transcribing…'
      dot = true
      break
    case 'success':
      badgeClass = 'hero-badge hero-badge--success'
      badgeLabel = 'Transcribed'
      break
    case 'error':
      badgeClass = 'hero-badge hero-badge--error'
      badgeLabel = 'Dictation error'
      break
  }

  return (
    <section className="glass hero-card">
      <div className="hero-card__inner">
        <h1 className="hero-card__title">Dictation</h1>
        {subtitle ? <p className="hero-card__subtitle">{subtitle}</p> : null}

        <div className={badgeClass}>
          {dot ? <span className="pulse-dot" aria-hidden /> : null}
          <span>{badgeLabel}</span>
        </div>

        {props.detail ? (
          <p className="mono text-muted" style={{ marginTop: 14, marginBottom: 0, fontSize: 13 }}>
            {props.detail}
          </p>
        ) : null}
      </div>
    </section>
  )
}
