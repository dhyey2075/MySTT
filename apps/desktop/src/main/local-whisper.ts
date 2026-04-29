import { existsSync, unlinkSync } from 'node:fs'
import { cpus } from 'node:os'

import type { AppSettings } from '@mystt/ipc-contract'
import {
  decodeToWav16k,
  ggmlModelPath,
  polishDictationText,
  resolveRuntime,
  runWhisperCli,
  type UserDirs,
} from '@mystt/core-pipeline'

export async function transcribeLocalDictation(opts: {
  userDirs: UserDirs
  settings: Pick<AppSettings, 'dictationModelId' | 'dictationThreads' | 'dictationLanguage'>
  buffer: ArrayBuffer
  mimeType: string
  signal?: AbortSignal
}): Promise<{ ok: true; text: string } | { ok: false; code: string; message: string }> {
  const rt = resolveRuntime(opts.userDirs)
  if (!rt.ffmpegReady || !rt.whisperReady) {
    return {
      ok: false,
      code: 'RUNTIME_NOT_READY',
      message: 'Install FFmpeg and whisper-cli using Local STT → Install local engine.',
    }
  }

  const modelPath = ggmlModelPath(opts.userDirs, opts.settings.dictationModelId)
  if (!existsSync(modelPath)) {
    return {
      ok: false,
      code: 'MODEL_MISSING',
      message: `Download the “${opts.settings.dictationModelId}” model first (Local STT card).`,
    }
  }

  const n = cpus().length
  const threads = opts.settings.dictationThreads ?? Math.min(8, Math.max(1, n > 1 ? n - 1 : 1))

  let wavPath: string | undefined
  try {
    const buf = Buffer.from(opts.buffer)
    wavPath = await decodeToWav16k({
      ffmpegPath: rt.ffmpegPath,
      inputBuffer: buf,
      mimeType: opts.mimeType,
      tempDir: opts.userDirs.temp,
      signal: opts.signal,
    })

    const { text } = await runWhisperCli({
      whisperPath: rt.whisperPath,
      modelPath,
      wavPath,
      threads,
      language: opts.settings.dictationLanguage,
      tempDir: opts.userDirs.temp,
      signal: opts.signal,
    })

    return { ok: true, text: polishDictationText(text) }
  } catch (err) {
    return {
      ok: false,
      code: 'ERR_LOCAL',
      message: err instanceof Error ? err.message : String(err),
    }
  } finally {
    if (wavPath) {
      try {
        unlinkSync(wavPath)
      } catch {
        /* noop */
      }
    }
  }
}
