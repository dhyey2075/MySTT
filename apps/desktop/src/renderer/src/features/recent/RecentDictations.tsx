import type { DictationLogEntry } from './useDictationLog'

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function RecentDictations(props: { entries: DictationLogEntry[] }) {
  if (props.entries.length === 0) {
    return (
      <p className="text-muted" style={{ margin: 0 }}>
        No dictations this session yet. Hold your hotkey and speak to see entries here.
      </p>
    )
  }

  return (
    <ul className="recent-list">
      {props.entries.map((e) => (
        <li key={e.id} className="recent-item">
          <time dateTime={new Date(e.at).toISOString()}>{formatTime(e.at)}</time>
          <span className="mono" style={{ color: e.ok ? 'inherit' : 'var(--danger)' }}>
            {e.preview}
          </span>
        </li>
      ))}
    </ul>
  )
}
