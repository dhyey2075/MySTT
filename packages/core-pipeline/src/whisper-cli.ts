import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

import type { WhisperSegment } from './whisper-types.js'

/** Windows NTSTATUS STATUS_DLL_NOT_FOUND when deps next to exe are missing */
function formatWhisperExitError(code: number | null, stderrText: string): string {
  const stderrTrim = stderrText.trim()
  if (code === null) return 'whisper-cli exited with no status code'
  const asUnsigned = code >>> 0
  if (asUnsigned === 0xc0000135 || code === -1073741515) {
    return (
      'whisper-cli could not load a required DLL (Windows 0xC0000135). ' +
      'Re-run Local STT → Install local engine so whisper-cli.exe and its DLLs are extracted together.'
    )
  }
  // whisper.cpp examples/cli/cli.cpp: failed model/context init or unknown DTW preset
  if (code === 3) {
    const hint =
      stderrTrim.includes('initialize whisper context') || stderrTrim.includes('failed to load')
        ? ' Model load or GPU init failed — stderr below.'
        : ''
    const tail = stderrTrim ? (stderrTrim.length > 2000 ? `…${stderrTrim.slice(-2000)}` : stderrTrim) : ''
    return (
      `whisper-cli failed (exit 3).${hint}` +
      (tail ? `\n${tail}` : ' If this persists after reinstalling the runtime, try another GGML model or use Remove runtime → Install local engine.')
    )
  }
  if (stderrTrim) {
    const tail = stderrTrim.length > 1500 ? `…${stderrTrim.slice(-1500)}` : stderrTrim
    return `whisper-cli exited with code ${code}\n${tail}`
  }
  return `whisper-cli exited with code ${code}`
}

/** Join whisper segment texts into one transcript */
export function whisperSegmentsToText(segments: WhisperSegment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

/**
 * Run whisper.cpp CLI — expects `-of` basename producing `<base>.txt`.
 * Binary release must be named whisper-cli (Windows: whisper-cli.exe).
 */
export async function runWhisperCli(opts: {
  whisperPath: string
  modelPath: string
  wavPath: string
  threads: number
  language?: string
  tempDir: string
  signal?: AbortSignal
}): Promise<{ text: string; segments: WhisperSegment[] }> {
  const outBase = join(opts.tempDir, `whisper-${randomUUID()}`)
  const args = [
    '-m',
    opts.modelPath,
    '-ng',
    '-f',
    opts.wavPath,
    '-of',
    outBase,
    '-otxt',
    '-nt',
    '-t',
    String(opts.threads),
  ]
  if (opts.language && opts.language.trim() !== '') {
    args.push('-l', opts.language.trim())
  }

  const proc = spawn(opts.whisperPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: dirname(opts.whisperPath),
  })

  const onAbort = () => {
    try {
      proc.kill('SIGKILL')
    } catch {
      /* noop */
    }
  }
  opts.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const stderrChunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      proc.on('error', reject)
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk)
      })
      proc.stdout?.on('data', () => {
        /* ignore */
      })
      proc.on('exit', (code) => {
        const errText = Buffer.concat(stderrChunks).toString('utf8')
        if (code === 0) resolve()
        else reject(new Error(formatWhisperExitError(code, errText)))
      })
    })
  } finally {
    opts.signal?.removeEventListener('abort', onAbort)
  }

  const txtPath = `${outBase}.txt`
  if (!existsSync(txtPath)) {
    throw new Error(`whisper-cli did not produce ${txtPath}`)
  }

  const raw = readFileSync(txtPath, 'utf8').trim()
  try {
    unlinkSync(txtPath)
  } catch {
    /* noop */
  }
  for (const ext of ['.vtt', '.srt', '.json']) {
    const p = `${outBase}${ext}`
    if (existsSync(p)) {
      try {
        unlinkSync(p)
      } catch {
        /* noop */
      }
    }
  }

  const segments: WhisperSegment[] = raw
    ? [{ id: 0, start: 0, end: 0, text: raw }]
    : []

  return {
    text: raw,
    segments,
  }
}
