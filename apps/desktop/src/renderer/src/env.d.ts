import type {
  CancelDownloadPayload,
  DictationCompletedPayload,
  DictationErrorPayload,
  DictationStartedPayload,
  DownloadProgressPayload,
  JobDonePayload,
  JobErrorPayload,
  JobProgressPayload,
  JobSegmentPayload,
  ModelEntry,
  RuntimeStatusPayload,
  SettingsState,
} from '@mystt/ipc-contract'

export {}

declare global {
  interface Window {
    mystt?: {
      startJob: (payload: unknown) => Promise<{ jobId: string }>
      cancelJob: (jobId: string) => Promise<void>
      getSettings: () => Promise<SettingsState>
      setSettings: (payload: unknown) => Promise<SettingsState>
      setOpenAiKey: (key: string | null) => Promise<SettingsState>
      listModels: () => Promise<ModelEntry[]>
      downloadModel: (id: string) => Promise<{ ok: boolean }>
      deleteModel: (id: string) => Promise<{ ok: boolean }>
      cancelDownload: (payload: CancelDownloadPayload) => Promise<{ ok: boolean }>
      getRuntimeStatus: () => Promise<RuntimeStatusPayload>
      installRuntime: (target: 'all' | 'ffmpeg' | 'whisper') => Promise<{ ok: boolean }>
      removeRuntime: (target: 'all' | 'ffmpeg' | 'whisper') => Promise<{ ok: boolean }>
      onJobProgress: (handler: (data: JobProgressPayload) => void) => () => void
      onJobSegment: (handler: (data: JobSegmentPayload) => void) => () => void
      onJobDone: (handler: (data: JobDonePayload) => void) => () => void
      onJobError: (handler: (data: JobErrorPayload) => void) => () => void
      onDictationStarted: (handler: (data: DictationStartedPayload) => void) => () => void
      onDictationCompleted: (handler: (data: DictationCompletedPayload) => void) => () => void
      onDictationError: (handler: (data: DictationErrorPayload) => void) => () => void
      onModelProgress: (handler: (data: DownloadProgressPayload) => void) => () => void
      onRuntimeProgress: (handler: (data: DownloadProgressPayload) => void) => () => void
    }
  }
}
