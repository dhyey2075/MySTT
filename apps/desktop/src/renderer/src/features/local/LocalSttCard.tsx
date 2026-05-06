import type { ModelId, SettingsState } from '@mystt/ipc-contract'
import { BrandMark } from '@mystt/ui'
import { useCallback, useState } from 'react'

import { useLocalRuntime } from './useLocalRuntime'

function fmtMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LocalSttCard(props: {
  settings: SettingsState | null
  onSelectModel: (id: ModelId) => Promise<void>
}) {
  const { runtime, models, modelProgress, runtimeProgress, refresh } = useLocalRuntime()
  const [installError, setInstallError] = useState<string | null>(null)

  const ffmpegOk = runtime?.ffmpegReady ?? false
  const whisperOk = runtime?.whisperReady ?? false
  const runtimeReady = ffmpegOk && whisperOk
  const runtimeInstalled = ffmpegOk || whisperOk

  const removeRuntime = useCallback(async () => {
    const api = window.mystt
    if (!api?.removeRuntime) return
    const ok = window.confirm(
      'Remove FFmpeg and whisper-cli from your MySTT folder (including DLLs on Windows)? GGML model files are not deleted. You can use Install local engine to download again.'
    )
    if (!ok) return
    setInstallError(null)
    try {
      await api.removeRuntime('all')
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setInstallError(msg)
    }
  }, [refresh])

  const installRuntime = useCallback(async () => {
    const api = window.mystt
    if (!api?.installRuntime) return
    setInstallError(null)
    try {
      await api.installRuntime('all')
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setInstallError(msg)
    }
  }, [refresh])

  const downloadModel = useCallback(
    async (id: ModelId) => {
      const api = window.mystt
      if (!api?.downloadModel) return
      await api.downloadModel(id)
      await refresh()
    },
    [refresh]
  )

  const deleteModel = useCallback(
    async (id: ModelId) => {
      const api = window.mystt
      if (!api?.deleteModel) return
      await api.deleteModel(id)
      await refresh()
    },
    [refresh]
  )

  const cancelDl = useCallback(
    async (kind: 'model' | 'binary', id: string) => {
      const api = window.mystt
      if (!api?.cancelDownload) return
      await api.cancelDownload({ kind, id })
      await refresh()
    },
    [refresh]
  )

  return (
    <section className="glass stack-gap" style={{ padding: '22px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <BrandMark title="MySTT" size={36} className="brand-mark-img brand-mark-img--card" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Local STT</h2>
          <p className="text-muted" style={{ margin: '8px 0 0' }}>
            Offline dictation needs two different things: <strong>runtime programs</strong> (FFmpeg +
            whisper-cli.exe) and a <strong>GGML model</strong> (tiny / base / small weights). Model
            downloads do not install whisper-cli — use Install local engine for the programs.
          </p>
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: 6 }}>
        Runtime (programs)
      </div>

      <div className="row-gap" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={ffmpegOk ? 'pill pill--ok' : 'pill pill--warn'}>
          FFmpeg {ffmpegOk ? 'ready' : 'missing'}
        </span>
        <span className={whisperOk ? 'pill pill--ok' : 'pill pill--warn'}>
          whisper-cli {whisperOk ? 'ready' : 'missing'}
        </span>
        {!runtimeReady ? (
          <button type="button" className="btn btn--primary" onClick={() => void installRuntime()}>
            Install local engine
          </button>
        ) : null}
        {runtimeInstalled ? (
          <button type="button" className="btn btn--danger" onClick={() => void removeRuntime()}>
            Remove runtime
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()}>
          Refresh status
        </button>
      </div>

      {ffmpegOk && !whisperOk ? (
        <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
          FFmpeg is installed, but <strong>whisper-cli</strong> (the inference executable from the
          whisper.cpp release) is not. Your GGML model files are separate — finish setup by clicking{' '}
          <strong>Install local engine</strong> so whisper-cli.exe is saved next to FFmpeg.
        </p>
      ) : null}

      {installError ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--danger, #c0392b)' }}>{installError}</p>
      ) : null}

      {runtimeProgress ? (
        <p className="text-muted mono" style={{ margin: 0, fontSize: 12 }}>
          Runtime: {runtimeProgress.id} — {runtimeProgress.receivedBytes} / {runtimeProgress.totalBytes}{' '}
          bytes
        </p>
      ) : null}

      <div className="section-title" style={{ marginBottom: 8 }}>
        Models (GGML weights only)
      </div>
      <p className="text-faint" style={{ marginTop: 0 }}>
        These are neural network weights (<span className="mono">ggml-*.bin</span>), not the
        whisper-cli program. Pulled from huggingface.co/ggerganov/whisper.cpp — placeholder SHA-256 in
        manifest skips verify until you pin real hashes.
      </p>

      {models.map((m) => {
        const selected = props.settings?.dictationModelId === m.id
        const pct =
          modelProgress?.kind === 'model' && modelProgress.id === m.id && modelProgress.totalBytes > 0
            ? Math.round((modelProgress.receivedBytes / modelProgress.totalBytes) * 100)
            : null

        return (
          <div
            key={m.id}
            className="glass-inset row-gap"
            style={{
              padding: '12px 14px',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: m.installed ? 1 : 0.92,
            }}
          >
            <div>
              <span className="mono" style={{ fontWeight: 700 }}>
                {m.id}
              </span>
              <span className="text-muted" style={{ marginLeft: 10, fontSize: 12 }}>
                {m.installed ? fmtMb(m.sizeBytes) : `~${fmtMb(m.manifestSizeBytes)}`}
              </span>
              {pct !== null ? (
                <span className="text-muted" style={{ marginLeft: 10 }}>
                  {pct}%
                </span>
              ) : null}
            </div>
            <div className="row-gap">
              <label className="row-gap text-muted" style={{ fontSize: 13 }}>
                <input
                  type="radio"
                  name="dictation-model"
                  checked={selected}
                  disabled={!m.installed || !props.settings}
                  onChange={() => void props.onSelectModel(m.id)}
                />
                Use
              </label>
              {m.installed ? (
                <>
                  <button type="button" className="btn btn--danger" onClick={() => void deleteModel(m.id)}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn--primary" onClick={() => void downloadModel(m.id)}>
                    Download
                  </button>
                  {modelProgress?.kind === 'model' && modelProgress.id === m.id ? (
                    <button type="button" className="btn btn--ghost" onClick={() => void cancelDl('model', m.id)}>
                      Cancel
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )
      })}

      {runtimeProgress?.kind === 'binary' ? (
        <button type="button" className="btn btn--ghost" onClick={() => void cancelDl('binary', runtimeProgress.id)}>
          Cancel runtime download
        </button>
      ) : null}

      {!runtimeReady ? (
        <p className="text-faint" style={{ marginBottom: 0 }}>
          Platform: <span className="mono">{runtime?.platformKey ?? '…'}</span>. Non-Windows targets need
          entries in <span className="mono">runtime-manifest.json</span>.
        </p>
      ) : null}
    </section>
  )
}
