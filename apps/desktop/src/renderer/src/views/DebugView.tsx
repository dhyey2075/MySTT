import type { JobSegmentPayload } from '@mystt/ipc-contract'
import { useCallback, useEffect, useMemo, useState } from 'react'

function formatClock(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`
}

/** IPC smoke test — only reachable when `import.meta.env.DEV`. */
export function DebugView() {
  const [segments, setSegments] = useState<JobSegmentPayload[]>([])
  const [progress, setProgress] = useState<{ processedSec: number; totalSec: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const [finalText, setFinalText] = useState<string | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const pct = useMemo(() => {
    if (!progress || progress.totalSec <= 0) return null
    return Math.min(100, Math.round((progress.processedSec / progress.totalSec) * 100))
  }, [progress])

  useEffect(() => {
    const api = window.mystt
    if (!api) return

    const unsubProgress = api.onJobProgress((p) => {
      setProgress({ processedSec: p.processedSec, totalSec: p.totalSec })
    })
    const unsubSegment = api.onJobSegment((p) => {
      setSegments((prev) => [...prev.filter((x) => x.id !== p.id), p].sort((a, b) => a.id - b.id))
    })
    const unsubDone = api.onJobDone((p) => {
      setStatus('done')
      setFinalText(p.text)
      setProgress(null)
      setActiveJobId(null)
    })
    const unsubErr = api.onJobError((p) => {
      setStatus('error')
      setLastError(`${p.code}: ${p.message}`)
      setProgress(null)
      setActiveJobId(null)
    })

    return () => {
      unsubProgress()
      unsubSegment()
      unsubDone()
      unsubErr()
    }
  }, [])

  const startMock = useCallback(async () => {
    if (!window.mystt) {
      setLastError('IPC bridge not available.')
      return
    }
    setSegments([])
    setFinalText(null)
    setLastError(null)
    setStatus('running')

    const { jobId } = await window.mystt.startJob({
      sourceKind: 'mock',
      modelId: 'base',
    })
    setActiveJobId(jobId)
  }, [])

  const cancel = useCallback(async () => {
    if (!activeJobId || !window.mystt) return
    setLastError(null)
    await window.mystt.cancelJob(activeJobId)
  }, [activeJobId])

  return (
    <section className="glass stack-gap" style={{ padding: '22px 22px', marginTop: 16 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Debug · IPC smoke test</h3>
        <p className="text-faint" style={{ margin: '6px 0 0' }}>
          Runs <span className="mono">runMockTranscriptionJob</span> — verifies renderer ↔ main ↔
          core-pipeline.
        </p>
      </div>

      <div className="row-gap">
        <button className="btn btn--primary" type="button" disabled={status === 'running'} onClick={startMock}>
          Run mock job
        </button>
        <button type="button" className="btn" disabled={status !== 'running' || !activeJobId} onClick={cancel}>
          Cancel job
        </button>
      </div>

      {pct !== null && (
        <p className="text-muted" style={{ margin: 0 }}>
          Progress: {pct}% ({progress?.processedSec.toFixed(1)}s / {progress?.totalSec.toFixed(1)}s)
        </p>
      )}

      {lastError && (
        <p style={{ margin: 0, color: 'var(--danger)' }} className="mono">
          {lastError}
        </p>
      )}

      {finalText && (
        <div>
          <div className="section-title">Final text</div>
          <p className="mono" style={{ margin: 0 }}>
            {finalText}
          </p>
        </div>
      )}

      <div>
        <div className="section-title">Segments</div>
        {segments.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No segments yet.
          </p>
        ) : (
          segments.map((s) => (
            <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="mono text-muted" style={{ marginRight: 10 }}>
                [{formatClock(s.start)} → {formatClock(s.end)}]
              </span>
              <span>{s.text}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
