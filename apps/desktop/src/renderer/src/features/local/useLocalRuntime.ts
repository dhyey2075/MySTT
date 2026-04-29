import type {
  DownloadProgressPayload,
  ModelEntry,
  RuntimeStatusPayload,
} from '@mystt/ipc-contract'
import { useCallback, useEffect, useState } from 'react'

export function useLocalRuntime() {
  const [runtime, setRuntime] = useState<RuntimeStatusPayload | null>(null)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [modelProgress, setModelProgress] = useState<DownloadProgressPayload | null>(null)
  const [runtimeProgress, setRuntimeProgress] = useState<DownloadProgressPayload | null>(null)

  const refresh = useCallback(async () => {
    const api = window.mystt
    if (!api?.getRuntimeStatus || !api.listModels) return
    const [rt, ml] = await Promise.all([api.getRuntimeStatus(), api.listModels()])
    setRuntime(rt)
    setModels(ml)
    setModelProgress(null)
    setRuntimeProgress(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const api = window.mystt
    if (!api?.onModelProgress || !api?.onRuntimeProgress) return

    const unsubModel = api.onModelProgress((p) => {
      setModelProgress(p as DownloadProgressPayload)
      const pl = p as DownloadProgressPayload
      if (pl.totalBytes > 0 && pl.receivedBytes >= pl.totalBytes) {
        void refresh()
      }
    })
    const unsubRt = api.onRuntimeProgress((p) => {
      setRuntimeProgress(p as DownloadProgressPayload)
      const pl = p as DownloadProgressPayload
      if (pl.totalBytes > 0 && pl.receivedBytes >= pl.totalBytes) {
        void refresh()
      }
    })
    return () => {
      unsubModel()
      unsubRt()
    }
  }, [refresh])

  return {
    runtime,
    models,
    modelProgress,
    runtimeProgress,
    refresh,
  }
}
