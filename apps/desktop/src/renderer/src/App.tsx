import type { SettingsState } from '@mystt/ipc-contract'
import { useEffect, useState } from 'react'

import { AppShell, type ShellTab } from './shell/AppShell'
import { HomeView } from './views/HomeView'
import { PlaceholderView } from './views/PlaceholderView'
import { SettingsView } from './views/SettingsView'

export default function App() {
  const [tab, setTab] = useState<ShellTab>('home')
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [bridgeError, setBridgeError] = useState<string | null>(null)

  useEffect(() => {
    const api = window.mystt
    if (!api) {
      setBridgeError(
        'IPC bridge missing (window.mystt). Preload script did not run — check DevTools console / main logs.'
      )
      return
    }
    void api.getSettings().then(setSettings).catch(console.error)
  }, [])

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="app-root">
        <AppShell activeTab={tab} onTabChange={setTab} settings={settings}>
          {tab === 'home' ? (
            <HomeView settings={settings} setSettings={setSettings} bridgeError={bridgeError} />
          ) : null}
          {tab === 'file' ? (
            <PlaceholderView
              title="File transcription"
              body="Drag-and-drop audio files and pick local Whisper models — planned."
            />
          ) : null}
          {tab === 'history' ? (
            <PlaceholderView title="History" body="Browse completed jobs and exports — planned." />
          ) : null}
          {tab === 'settings' ? <SettingsView /> : null}
        </AppShell>
      </div>
    </>
  )
}
