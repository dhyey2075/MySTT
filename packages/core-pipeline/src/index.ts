import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import type { WhisperSegment } from './whisper-types.js'

export type { WhisperSegment } from './whisper-types.js'

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const t = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

/**
 * Mock Whisper-like segmented output until FFmpeg + whisper.cpp are wired.
 */
export async function* runMockTranscriptionJob(
  signal: AbortSignal,
  opts?: { totalSec?: number }
): AsyncGenerator<WhisperSegment> {
  const totalSec = opts?.totalSec ?? 12
  const script: WhisperSegment[] = [
    { id: 0, start: 0, end: 3.2, text: 'This is a mock transcript segment.' },
    { id: 1, start: 3.2, end: 6.5, text: 'Replace runMockTranscriptionJob with whisper.cpp.' },
    { id: 2, start: 6.5, end: totalSec, text: 'FFmpeg preprocessing runs before inference.' },
  ]

  for (const seg of script) {
    if (signal.aborted) throw signal.reason
    await delay(120, signal)
    yield seg
  }
}

export type ProbeResult = {
  durationSec: number
  audioStreams: number
  videoStreams: number
}

/** Placeholder until FFprobe is wired (SPEC §3.5). */
export async function probeMediaPlaceholder(filePath: string): Promise<ProbeResult> {
  void filePath
  return {
    durationSec: 120,
    audioStreams: 1,
    videoStreams: 1,
  }
}

export type UserDirs = {
  root: string
  models: string
  history: string
  temp: string
  /** Downloaded ffmpeg / whisper-cli binaries */
  bin: string
}

/** Ensures `<userData>/MySTT/…` layout per SPEC §10.1 */
export function ensureUserDirs(userDataRoot: string): UserDirs {
  const root = join(userDataRoot, 'MySTT')
  const models = join(root, 'models')
  const history = join(root, 'history')
  const temp = join(root, 'temp')
  const bin = join(root, 'bin')

  for (const p of [root, models, history, temp, bin]) {
    mkdirSync(p, { recursive: true })
  }

  return { root, models, history, temp, bin }
}

export {
  parseRuntimeManifest,
  loadRuntimeManifestFromPath,
  type RuntimeManifest,
  type BinaryArtifact,
  type ModelArtifact,
} from './manifest.js'
export {
  platformRuntimeKey,
  ffmpegBinPath,
  whisperCliBinPath,
  ggmlModelPath,
  resolveRuntime,
  ensureExecutableBit,
  type BinModelDirs,
  type ResolvedRuntime,
  removeRuntimeArtifacts,
} from './runtime-paths.js'
export { downloadFile, type DownloadProgress } from './downloader.js'
export { decodeToWav16k } from './audio-decode.js'
export { runWhisperCli, whisperSegmentsToText } from './whisper-cli.js'
export { polishDictationText } from './dictation-text.js'
export { installBinaryArtifact } from './install-binary.js'
