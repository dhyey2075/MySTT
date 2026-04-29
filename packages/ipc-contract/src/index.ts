import { z } from 'zod'

/** IPC channel names — keep in sync with main/preload/renderer. */
export const IPC_CHANNELS = {
  JOB_START: 'mystt:job:start',
  JOB_CANCEL: 'mystt:job:cancel',
  JOB_PROGRESS: 'mystt:job:progress',
  JOB_SEGMENT: 'mystt:job:segment',
  JOB_DONE: 'mystt:job:done',
  JOB_ERROR: 'mystt:job:error',
  MODEL_LIST: 'mystt:model:list',
  MODEL_DOWNLOAD: 'mystt:model:download',
  MODEL_DELETE: 'mystt:model:delete',
  MODEL_PROGRESS: 'mystt:model:progress',
  RUNTIME_STATUS: 'mystt:runtime:status',
  RUNTIME_INSTALL: 'mystt:runtime:install',
  RUNTIME_REMOVE: 'mystt:runtime:remove',
  RUNTIME_PROGRESS: 'mystt:runtime:progress',
  DOWNLOAD_CANCEL: 'mystt:download:cancel',
  HOTKEY_SET: 'mystt:hotkey:set',
  DICTATION_STARTED: 'mystt:dictation:started',
  DICTATION_COMPLETED: 'mystt:dictation:completed',
  SETTINGS_GET: 'mystt:settings:get',
  SETTINGS_SET: 'mystt:settings:set',
  OPENAI_KEY_SET: 'mystt:openai-key:set',
  DICTATION_ERROR: 'mystt:dictation:error',
  CAPTURE_REPORT: 'mystt:capture:report',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export const JobStartPayloadSchema = z.object({
  sourceKind: z.enum(['file', 'mock']),
  /** Absolute path when sourceKind is file */
  filePath: z.string().optional(),
  modelId: z.enum(['tiny', 'base', 'small']).default('base'),
  language: z.string().optional(),
  translateToEnglish: z.boolean().optional(),
})

export type JobStartPayload = z.infer<typeof JobStartPayloadSchema>

export const JobProgressPayloadSchema = z.object({
  jobId: z.string().uuid(),
  processedSec: z.number().nonnegative(),
  totalSec: z.number().nonnegative(),
  etaMs: z.number().optional(),
})

export type JobProgressPayload = z.infer<typeof JobProgressPayloadSchema>

export const JobSegmentPayloadSchema = z.object({
  jobId: z.string().uuid(),
  id: z.number().int().nonnegative(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
})

export type JobSegmentPayload = z.infer<typeof JobSegmentPayloadSchema>

export const JobDonePayloadSchema = z.object({
  jobId: z.string().uuid(),
  text: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export type JobDonePayload = z.infer<typeof JobDonePayloadSchema>

export const JobErrorPayloadSchema = z.object({
  jobId: z.string().uuid(),
  code: z.string(),
  message: z.string(),
})

export type JobErrorPayload = z.infer<typeof JobErrorPayloadSchema>

export const HotkeySetPayloadSchema = z.object({
  accelerator: z.string(),
})

export type HotkeySetPayload = z.infer<typeof HotkeySetPayloadSchema>

/** Payload main → renderer when dictation lifecycle events occur */
export const DictationStartedPayloadSchema = z.object({
  at: z.number(),
})

export const DictationCompletedPayloadSchema = z.object({
  text: z.string(),
  durationMs: z.number(),
})

export const DictationErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export type DictationStartedPayload = z.infer<typeof DictationStartedPayloadSchema>
export type DictationCompletedPayload = z.infer<typeof DictationCompletedPayloadSchema>
export type DictationErrorPayload = z.infer<typeof DictationErrorPayloadSchema>

const DictationModelIdSchema = z.enum(['tiny', 'base', 'small'])

const AppSettingsInnerSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  /** Electron accelerator grammar; default avoids IME conflicts on Windows (SPEC §15). */
  hotkeyAccelerator: z.string().default('CommandOrControl+Shift+.'),
  defaultModelId: DictationModelIdSchema.default('base'),
  dictationMaxSec: z.number().min(5).max(300).default(60),
  /** Hotkey engine: cloud OpenAI vs local whisper.cpp */
  dictationEngine: z.enum(['cloud', 'local']).default('cloud'),
  /** Model used for local dictation */
  dictationModelId: DictationModelIdSchema.default('tiny'),
  dictationLanguage: z.string().optional(),
  dictationThreads: z.number().int().min(1).max(32).optional(),
})

function migrateLegacyCloudDictation(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const o = { ...(raw as Record<string, unknown>) }
  if (!('dictationEngine' in o) && typeof o.cloudDictationEnabled === 'boolean') {
    o.dictationEngine = o.cloudDictationEnabled ? 'cloud' : 'local'
  }
  delete o.cloudDictationEnabled
  return o
}

/** Migrate legacy `cloudDictationEnabled` → `dictationEngine` when absent. */
export const AppSettingsSchema = z.preprocess(migrateLegacyCloudDictation, AppSettingsInnerSchema)

export type AppSettings = z.infer<typeof AppSettingsSchema>

/** True when settings imply cloud hotkey path (OpenAI). */
export function isCloudDictationEnabled(settings: Pick<AppSettings, 'dictationEngine'>): boolean {
  return settings.dictationEngine === 'cloud'
}

/** Returned by SETTINGS_GET — settings plus metadata for UI. */
export const SettingsStateSchema = z.preprocess(
  migrateLegacyCloudDictation,
  AppSettingsInnerSchema.extend({
    hasOpenAiApiKey: z.boolean(),
  })
)

export type SettingsState = z.infer<typeof SettingsStateSchema>

export const ModelIdSchema = DictationModelIdSchema

export type ModelId = z.infer<typeof ModelIdSchema>

export const DownloadKindSchema = z.enum(['model', 'binary'])

export type DownloadKind = z.infer<typeof DownloadKindSchema>

/** Unified progress for runtime binaries (ffmpeg, whisper-cli) and ggml models */
export const DownloadProgressPayloadSchema = z.object({
  kind: DownloadKindSchema,
  id: z.string(),
  receivedBytes: z.number().nonnegative(),
  totalBytes: z.number().nonnegative(),
  etaMs: z.number().optional(),
})

export type DownloadProgressPayload = z.infer<typeof DownloadProgressPayloadSchema>

export const ModelEntrySchema = z.object({
  id: ModelIdSchema,
  /** Bytes on disk when installed */
  sizeBytes: z.number().nonnegative(),
  /** Whether ggml file exists and matches expected size roughly */
  installed: z.boolean(),
  /** Manifest reference size for UI */
  manifestSizeBytes: z.number().nonnegative(),
})

export type ModelEntry = z.infer<typeof ModelEntrySchema>

export const RuntimeStatusPayloadSchema = z.object({
  ffmpegReady: z.boolean(),
  whisperReady: z.boolean(),
  ffmpegPath: z.string().optional(),
  whisperPath: z.string().optional(),
  platformKey: z.string(),
})

export type RuntimeStatusPayload = z.infer<typeof RuntimeStatusPayloadSchema>

export const InstallRuntimePayloadSchema = z.object({
  target: z.enum(['all', 'ffmpeg', 'whisper']),
})

export type InstallRuntimePayload = z.infer<typeof InstallRuntimePayloadSchema>

/** Same shape as install — remove FFmpeg / whisper-cli / both from `<userData>/MySTT/bin`. */
export const RemoveRuntimePayloadSchema = InstallRuntimePayloadSchema

export type RemoveRuntimePayload = z.infer<typeof RemoveRuntimePayloadSchema>

export const ModelDownloadPayloadSchema = z.object({ id: ModelIdSchema })

export type ModelDownloadPayload = z.infer<typeof ModelDownloadPayloadSchema>

export const ModelDeletePayloadSchema = z.object({ id: ModelIdSchema })

export type ModelDeletePayload = z.infer<typeof ModelDeletePayloadSchema>

export const CancelDownloadPayloadSchema = z.object({
  kind: DownloadKindSchema,
  id: z.string(),
})

export type CancelDownloadPayload = z.infer<typeof CancelDownloadPayloadSchema>
