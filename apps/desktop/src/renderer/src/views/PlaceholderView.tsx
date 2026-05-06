import { BrandMark } from '@mystt/ui'

export function PlaceholderView(props: { title: string; body?: string }) {
  return (
    <div className="glass placeholder-view">
      <div className="placeholder-view__brand">
        <BrandMark title="MySTT" size={40} className="brand-mark-img brand-mark-img--placeholder" />
      </div>
      <h2>{props.title}</h2>
      <p className="text-muted">{props.body ?? 'This section is coming soon.'}</p>
    </div>
  )
}
