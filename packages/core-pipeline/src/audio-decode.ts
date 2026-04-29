import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

function extensionForMime(mimeType: string): string {
  const m = mimeType.toLowerCase()
  if (m.includes('webm')) return '.webm'
  if (m.includes('wav')) return '.wav'
  if (m.includes('mpeg') || m.includes('mp3')) return '.mp3'
  if (m.includes('ogg')) return '.ogg'
  if (m.includes('mp4') || m.includes('m4a')) return '.m4a'
  return '.webm'
}

/** Decode captured blob to 16 kHz mono WAV via FFmpeg (writes temp input then runs ffmpeg). */
export async function decodeToWav16k(opts: {
  ffmpegPath: string
  inputBuffer: Buffer
  mimeType: string
  tempDir: string
  signal?: AbortSignal
}): Promise<string> {
  mkdirSync(opts.tempDir, { recursive: true })
  const ext = extensionForMime(opts.mimeType)
  const inPath = join(opts.tempDir, `cap-${randomUUID()}${ext}`)
  const wavPath = join(opts.tempDir, `dict-${randomUUID()}.wav`)
  writeFileSync(inPath, opts.inputBuffer)

  const proc = spawn(opts.ffmpegPath, ['-y', '-i', inPath, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
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
    await new Promise<void>((resolve, reject) => {
      proc.on('error', reject)
      proc.stderr?.on('data', () => {
        /* ffmpeg logs */
      })
      proc.on('exit', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}`))
      })
    })
  } finally {
    opts.signal?.removeEventListener('abort', onAbort)
    try {
      unlinkSync(inPath)
    } catch {
      /* noop */
    }
  }

  return wavPath
}
