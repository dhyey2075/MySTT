export function Switch(props: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  'aria-label'?: string
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        aria-label={props['aria-label']}
      />
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
    </label>
  )
}
