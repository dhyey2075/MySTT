import type { ReactNode } from 'react'
import type { SettingsState } from '@mystt/ipc-contract'
import { BrandMark } from '@mystt/ui'

export type ShellTab = 'home' | 'file' | 'history' | 'settings'

const TABS: { id: ShellTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'file', label: 'File' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

export function AppShell(props: {
  activeTab: ShellTab
  onTabChange: (t: ShellTab) => void
  settings: SettingsState | null
  children: ReactNode
}) {
  const apiOk = props.settings?.hasOpenAiApiKey ?? false

  return (
    <>
      <header className="shell-header">
        <div className="shell-brand no-drag">
          <BrandMark title="MySTT" />
          <span className="shell-brand__title">MySTT</span>
          <nav className="shell-tabs" aria-label="Primary">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="shell-tab"
                data-active={props.activeTab === t.id}
                onClick={() => props.onTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="shell-cluster">
          <span className={apiOk ? 'pill pill--ok' : 'pill pill--warn'}>
            {apiOk ? 'API key' : 'No API key'}
          </span>
          <span className="pill">Offline pipeline</span>
        </div>
      </header>
      <main className="app-main">{props.children}</main>
    </>
  )
}
