import type { SettingsState } from '@mystt/ipc-contract'
import { BrandMark } from '@mystt/ui'
import { useCallback, useState } from 'react'

import { MaskedSecret } from '../../components/MaskedSecret'

export function CloudDictationCard(props: {
  settings: SettingsState | null
  onSaveKey: (key: string | null) => Promise<void>
  onSetEngine: (engine: 'cloud' | 'local') => Promise<void>
  onTerminalNlChange: (enabled: boolean) => Promise<void>
}) {
  const { settings } = props
  const [draft, setDraft] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(false)

  const cloudActive = settings?.dictationEngine !== 'local'

  const saveNewKey = useCallback(async () => {
    const trimmed = draft.trim()
    await props.onSaveKey(trimmed === '' ? null : trimmed)
    setDraft('')
    setReplaceOpen(false)
  }, [draft, props])

  const removeKey = useCallback(async () => {
    await props.onSaveKey(null)
    setReplaceOpen(false)
  }, [props])

  return (
    <section className="glass stack-gap" style={{ padding: '22px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <BrandMark title="MySTT" size={36} className="brand-mark-img brand-mark-img--card" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Dictation engine</h2>
          <p className="text-muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>
            Choose cloud (OpenAI Whisper API) or local on-device whisper.cpp. The global hotkey uses the
            selected engine.
          </p>
        </div>
      </div>

      <nav className="shell-tabs" aria-label="Dictation engine" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="shell-tab"
          data-active={settings?.dictationEngine !== 'local'}
          disabled={!settings}
          onClick={() => void props.onSetEngine('cloud')}
        >
          Cloud (OpenAI)
        </button>
        <button
          type="button"
          className="shell-tab"
          data-active={settings?.dictationEngine === 'local'}
          disabled={!settings}
          onClick={() => void props.onSetEngine('local')}
        >
          Local (offline)
        </button>
      </nav>

      <section className="stack-gap" style={{ marginTop: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Terminal assistant (Windows)</h3>
        <p className="text-muted" style={{ margin: 0, maxWidth: '62ch' }}>
          When Command Prompt, PowerShell, Windows Terminal, or another supported console is focused,
          dictation can be rewritten into a short shell command using your OpenAI API key (chat
          model — billed separately from Whisper). Heuristic filters block many destructive patterns;
          always review before pressing Enter.
        </p>
        <label
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            cursor: props.settings?.hasOpenAiApiKey ? 'pointer' : 'not-allowed',
          }}
        >
          <input
            type="checkbox"
            checked={props.settings?.terminalNlCommandEnabled ?? true}
            disabled={!props.settings?.hasOpenAiApiKey}
            onChange={(e) => void props.onTerminalNlChange(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>Convert speech to shell commands when a terminal is focused</span>
        </label>
        {!props.settings?.hasOpenAiApiKey ? (
          <p className="text-faint" style={{ margin: 0 }}>
            Add an OpenAI API key above to enable conversion (works alongside Local offline dictation).
          </p>
        ) : null}
      </section>

      <div
        style={{
          opacity: cloudActive ? 1 : 0.45,
          pointerEvents: cloudActive ? 'auto' : 'none',
        }}
      >
        <h3 style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 650 }}>Cloud dictation</h3>
        <p className="text-muted" style={{ margin: '0 0 12px', maxWidth: '62ch' }}>
          Hold your hotkey — speak — release. Audio is sent to OpenAI Whisper; transcribed text is pasted
          into the focused app.
        </p>

        <div className="privacy-callout">
          Privacy: cloud dictation sends microphone audio to OpenAI. Local STT keeps audio on device.
        </div>

        <div>
          <div className="section-title">OpenAI API key</div>
          <MaskedSecret configured={settings?.hasOpenAiApiKey ?? false} />

          <div className="row-gap" style={{ marginTop: 12 }}>
            {!replaceOpen ? (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setReplaceOpen(true)}>
                  Replace…
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={!settings?.hasOpenAiApiKey}
                  onClick={() => void removeKey()}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="button" className="btn btn--primary" onClick={() => void saveNewKey()}>
                  Save
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setReplaceOpen(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <p className="text-faint" style={{ marginTop: 10 }}>
            Stored encrypted via Electron safeStorage when supported. Override with{' '}
            <span className="mono">OPENAI_API_KEY</span> for development.
          </p>
        </div>
      </div>

      {!cloudActive ? (
        <p className="text-muted" style={{ margin: 0 }}>
          Cloud fields are hidden while Local engine is selected. Switch back to Cloud to edit API key.
        </p>
      ) : null}
    </section>
  )
}
