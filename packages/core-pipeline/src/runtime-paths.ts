import { chmodSync, constants, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

/** Minimal dirs for locating bins/models under `<userData>/MySTT` */
export type BinModelDirs = { bin: string; models: string }

/** `${process.platform}-${process.arch}` */
export function platformRuntimeKey(): string {
  return `${process.platform}-${process.arch}`
}

export function ffmpegBinPath(dirs: BinModelDirs): string {
  const base = dirs.bin
  return process.platform === 'win32' ? join(base, 'ffmpeg.exe') : join(base, 'ffmpeg')
}

export function whisperCliBinPath(dirs: BinModelDirs): string {
  const base = dirs.bin
  return process.platform === 'win32' ? join(base, 'whisper-cli.exe') : join(base, 'whisper-cli')
}

export function ggmlModelPath(dirs: BinModelDirs, modelId: 'tiny' | 'base' | 'small'): string {
  return join(dirs.models, `ggml-${modelId}.bin`)
}

function fileExecutableExists(path: string): boolean {
  if (!existsSync(path)) return false
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

/** POSIX: chmod +x when binary exists */
export function ensureExecutableBit(binPath: string): void {
  if (process.platform === 'win32') return
  try {
    chmodSync(binPath, constants.S_IRWXU)
  } catch {
    /* noop */
  }
}

export type ResolvedRuntime = {
  ffmpegPath: string
  whisperPath: string
  ffmpegReady: boolean
  whisperReady: boolean
}

export function resolveRuntime(dirs: BinModelDirs): ResolvedRuntime {
  const ffmpegPath = ffmpegBinPath(dirs)
  const whisperPath = whisperCliBinPath(dirs)
  return {
    ffmpegPath,
    whisperPath,
    ffmpegReady: fileExecutableExists(ffmpegPath),
    whisperReady: fileExecutableExists(whisperPath),
  }
}

function safeUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path)
  } catch {
    /* noop */
  }
}

/**
 * Delete downloaded runtime binaries under `dirs.bin`. GGML models (`dirs.models`) are untouched.
 * On Windows, whisper DLLs co-located in `bin` are removed when `whisper` or `all` is selected.
 */
export function removeRuntimeArtifacts(
  dirs: BinModelDirs,
  target: 'all' | 'ffmpeg' | 'whisper'
): void {
  if (target === 'all' || target === 'ffmpeg') {
    safeUnlink(ffmpegBinPath(dirs))
  }
  if (target === 'all' || target === 'whisper') {
    safeUnlink(whisperCliBinPath(dirs))
    if (process.platform === 'win32') {
      try {
        for (const name of readdirSync(dirs.bin)) {
          if (name.toLowerCase().endsWith('.dll')) {
            safeUnlink(join(dirs.bin, name))
          }
        }
      } catch {
        /* noop */
      }
    }
  }
}
