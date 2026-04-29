export function PlaceholderView(props: { title: string; body?: string }) {
  return (
    <div className="glass placeholder-view">
      <h2>{props.title}</h2>
      <p className="text-muted">{props.body ?? 'This section is coming soon.'}</p>
    </div>
  )
}
