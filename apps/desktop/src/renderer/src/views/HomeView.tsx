import type { Dispatch, SetStateAction } from 'react'
import type { ModelId, SettingsState } from '@mystt/ipc-contract'
import { useCallback, useEffect, useState } from 'react'

import { HeroCard, type HeroPhase } from '../features/dictation/HeroCard'
import { CloudDictationCard } from '../features/cloud/CloudDictationCard'
import { LocalSttCard } from '../features/local/LocalSttCard'
import { RecentDictations } from '../features/recent/RecentDictations'
import { useDictationLog } from '../features/recent/useDictationLog'
import { StatusGrid } from '../features/status/StatusGrid'

function clip(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n)}…`
}

export function HomeView(props: {
  settings: SettingsState | null
  setSettings: Dispatch<SetStateAction<SettingsState | null>>
  bridgeError: string | null
}) {
  const { settings, setSettings, bridgeError } = props
  const { entries, push } = useDictationLog()

  const [heroPhase, setHeroPhase] = useState<HeroPhase>('idle')
  const [heroDetail, setHeroDetail] = useState<string | null>(null)

  const saveEngine = useCallback(
    async (engine: 'cloud' | 'local') => {
      const api = window.mystt
      if (!settings || !api) return
      const payload = { ...settings } as Record<string, unknown>
      delete payload.hasOpenAiApiKey
      const next = await api.setSettings({ ...payload, dictationEngine: engine })
      setSettings(next)
    },
    [settings, setSettings]
  )

  const saveTerminalNl = useCallback(
    async (enabled: boolean) => {
      const api = window.mystt
      if (!settings || !api) return
      const payload = { ...settings } as Record<string, unknown>
      delete payload.hasOpenAiApiKey
      const next = await api.setSettings({ ...payload, terminalNlCommandEnabled: enabled })
      setSettings(next)
    },
    [settings, setSettings]
  )

  const saveDictationModel = useCallback(
    async (id: ModelId) => {
      const api = window.mystt
      if (!settings || !api) return
      const payload = { ...settings } as Record<string, unknown>
      delete payload.hasOpenAiApiKey
      const next = await api.setSettings({ ...payload, dictationModelId: id })
      setSettings(next)
    },
    [settings, setSettings]
  )

  const saveApiKey = useCallback(
    async (key: string | null) => {
      const api = window.mystt
      if (!api) return
      const next = await api.setOpenAiKey(key)
      setSettings(next)
    },
    [setSettings]
  )

  useEffect(() => {
    if (heroPhase !== 'success' && heroPhase !== 'error') return
    const t = window.setTimeout(() => {
      setHeroPhase('idle')
      setHeroDetail(null)
    }, 5500)
    return () => window.clearTimeout(t)
  }, [heroPhase])

  useEffect(() => {
    const api = window.mystt
    if (!api) return

    const unsubDs = api.onDictationStarted(() => {
      setHeroPhase('recording')
      setHeroDetail('Listening… release the hotkey when finished.')
    })
    const unsubDc = api.onDictationCompleted((p) => {
      const preview = `Pasted: “${clip(p.text, 100)}”`
      setHeroPhase('success')
      setHeroDetail(preview)
      push(preview, true)
      void api.getSettings().then(setSettings)
    })
    const unsubDe = api.onDictationError((p) => {
      const msg = `${p.code}: ${p.message}`
      setHeroPhase('error')
      setHeroDetail(msg)
      push(msg, false)
    })

    return () => {
      unsubDs()
      unsubDc()
      unsubDe()
    }
  }, [push, setSettings])

  const heroSubtitle =
    heroPhase === 'recording'
      ? 'Microphone capture is active — release your hotkey to stop and transcribe.'
      : heroPhase === 'success'
        ? 'Last dictation finished.'
        : heroPhase === 'error'
          ? 'Dictation failed.'
          : undefined

  return (
    <div className="stack-gap">
      {bridgeError ? (
        <div className="bridge-banner">
          <strong>Preload / IPC</strong>
          <div className="mono text-muted" style={{ marginTop: 8 }}>
            {bridgeError}
          </div>
        </div>
      ) : null}

      <HeroCard phase={heroPhase} subtitle={heroSubtitle} detail={heroDetail} />

      <div>
        <div className="section-title">Status</div>
        <StatusGrid settings={settings} />
      </div>

      <CloudDictationCard
        settings={settings}
        onSaveKey={saveApiKey}
        onSetEngine={saveEngine}
        onTerminalNlChange={saveTerminalNl}
      />

      <LocalSttCard settings={settings} onSelectModel={saveDictationModel} />

      <section className="glass stack-gap" style={{ padding: '22px 22px' }}>
        <div className="section-title" style={{ marginBottom: 4 }}>
          Recent dictations
        </div>
        <p className="text-faint" style={{ margin: '0 0 12px' }}>
          Session only — cleared when you quit the app.
        </p>
        <RecentDictations entries={entries} />
      </section>
    </div>
  )
}
