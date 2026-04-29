import type { ReactNode } from 'react'
import type { SettingsState } from '@mystt/ipc-contract'

import { KeyCaps } from './KeyCaps'

type TileProps = {
  label: string
  children: ReactNode
  hint?: string
}

function Tile({ label, children, hint }: TileProps) {
  return (
    <div className="glass glass--sm tile">
      <div className="tile__label">{label}</div>
      <div className="tile__value">{children}</div>
      {hint ? <div className="tile__hint">{hint}</div> : null}
    </div>
  )
}

export function StatusGrid(props: { settings: SettingsState | null }) {
  const s = props.settings

  return (
    <div className="tile-grid">
      <Tile label="Engine" hint="Hotkey transcription backend">
        {!s ? (
          <span className="text-muted">…</span>
        ) : s.dictationEngine === 'local' ? (
          <>
            Local · <span className="mono">{s.dictationModelId}</span>
          </>
        ) : (
          <>Cloud · Whisper-1</>
        )}
      </Tile>
      <Tile label="API key" hint="Stored with OS encryption when available">
        {s?.hasOpenAiApiKey ? (
          <span style={{ color: 'var(--success)' }}>Configured</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Not set</span>
        )}
      </Tile>
      <Tile label="Hotkey" hint="Hold-to-talk chord">
        {s ? <KeyCaps accelerator={s.hotkeyAccelerator} /> : <span className="text-muted">…</span>}
      </Tile>
      <Tile label="Microphone" hint="Grant access in OS privacy settings when prompted">
        Required for capture
      </Tile>
    </div>
  )
}
