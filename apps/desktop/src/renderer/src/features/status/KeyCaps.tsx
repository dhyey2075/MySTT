import { acceleratorParts } from './accelerator'

export function KeyCaps(props: { accelerator: string }) {
  const parts = acceleratorParts(props.accelerator)
  return (
    <span className="kbd-row">
      {parts.map((p) => (
        <kbd key={p} className="keycap">
          {p}
        </kbd>
      ))}
    </span>
  )
}
