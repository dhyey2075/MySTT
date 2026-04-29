import { DebugView } from './DebugView'
import { PlaceholderView } from './PlaceholderView'

export function SettingsView() {
  return (
    <div className="stack-gap">
      <PlaceholderView
        title="Settings"
        body="Hotkeys, themes, and defaults will land here. Use Home for dictation controls."
      />
      {import.meta.env.DEV ? <DebugView /> : null}
    </div>
  )
}
