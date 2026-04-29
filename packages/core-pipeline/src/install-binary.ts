import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import AdmZip from 'adm-zip'

import { ensureExecutableBit } from './runtime-paths.js'
import { downloadFile } from './downloader.js'
import type { BinaryArtifact } from './manifest.js'

function normalizeZipPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '')
}

/** Resolve entry inside known layouts (gyan FFmpeg zips version the top-level folder). */
function resolveZipEntry(zip: AdmZip, innerRelative: string): import('adm-zip').IZipEntry | undefined {
  const normalized = normalizeZipPath(innerRelative)

  const tryNames = [normalized, normalized.replace(/\//g, '\\')]
  for (const name of tryNames) {
    const e = zip.getEntry(name)
    if (e && !e.isDirectory) return e
  }

  const entries = zip.getEntries().filter((e) => !e.isDirectory)
  const normLower = normalized.toLowerCase()
  const bySuffix = entries.filter((e) => normalizeZipPath(e.entryName).toLowerCase().endsWith(normLower))
  if (bySuffix.length === 1) return bySuffix[0]
  if (bySuffix.length > 1) {
    return bySuffix.sort((a, b) => a.entryName.length - b.entryName.length)[0]
  }

  const lowerBase = basename(normalized).toLowerCase()
  if (lowerBase === 'ffmpeg.exe') {
    const hit = entries.find((e) => normalizeZipPath(e.entryName).toLowerCase().endsWith('/bin/ffmpeg.exe'))
    if (hit) return hit
  }
  if (lowerBase === 'whisper-cli.exe') {
    const hit = entries.find((e) =>
      normalizeZipPath(e.entryName).toLowerCase().endsWith('/whisper-cli.exe')
    )
    if (hit) return hit
    const roots = entries.filter(
      (e) => basename(normalizeZipPath(e.entryName)).toLowerCase() === 'whisper-cli.exe'
    )
    if (roots.length === 1) return roots[0]
  }

  return undefined
}

function extractZipPrefixToDirectory(zipPath: string, prefixRaw: string, destDir: string): void {
  const zip = new AdmZip(zipPath)
  const prefixNorm = normalizeZipPath(prefixRaw).replace(/\/?$/, '/')
  const pl = prefixNorm.toLowerCase()

  mkdirSync(destDir, { recursive: true })

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const rawName = normalizeZipPath(entry.entryName)
    const fl = rawName.toLowerCase()
    if (!fl.startsWith(pl)) continue

    const tail = rawName.slice(prefixNorm.length)
    if (!tail || tail.endsWith('/')) continue

    const destPath = tail.includes('/')
      ? join(destDir, ...tail.split('/'))
      : join(destDir, tail)
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, entry.getData())
    const lower = tail.toLowerCase()
    if (lower.endsWith('.exe') || lower.endsWith('.dll')) {
      ensureExecutableBit(destPath)
    }
  }
}

function copyZipMemberToFile(zipPath: string, innerRelative: string, destExePath: string): void {
  const zip = new AdmZip(zipPath)
  const entry = resolveZipEntry(zip, innerRelative)
  if (!entry) {
    throw new Error(`Zip archive missing executable entry (hint: ${normalizeZipPath(innerRelative)})`)
  }
  const data = entry.getData()
  mkdirSync(dirname(destExePath), { recursive: true })
  writeFileSync(destExePath, data)
  ensureExecutableBit(destExePath)
}

/**
 * Download ffmpeg or whisper binary artifact (plain exe or zip extraction).
 */
export async function installBinaryArtifact(opts: {
  artifact: BinaryArtifact
  destExePath: string
  tempDir: string
  signal?: AbortSignal
  onProgress?: (receivedBytes: number, totalBytes: number) => void
}): Promise<void> {
  const { artifact } = opts
  const tmpName =
    artifact.format === 'zip'
      ? join(opts.tempDir, `dl-${artifact.sha256.slice(0, 8)}.zip`)
      : join(opts.tempDir, `dl-${artifact.sha256.slice(0, 8)}.bin`)

  mkdirSync(opts.tempDir, { recursive: true })

  await downloadFile({
    url: artifact.url,
    destPath: tmpName,
    sha256Expected: artifact.sha256,
    signal: opts.signal,
    onProgress: (p) => opts.onProgress?.(p.receivedBytes, p.totalBytes),
  })

  if (artifact.format === 'binary') {
    const fs = await import('node:fs')
    fs.renameSync(tmpName, opts.destExePath)
    ensureExecutableBit(opts.destExePath)
    return
  }

  if (!artifact.extractExeRelativePath && !artifact.extractZipDirectoryPrefix) {
    throw new Error('zip binary artifact requires extractExeRelativePath or extractZipDirectoryPrefix')
  }

  try {
    const binDir = dirname(opts.destExePath)
    if (artifact.extractZipDirectoryPrefix) {
      extractZipPrefixToDirectory(tmpName, artifact.extractZipDirectoryPrefix, binDir)
      if (!existsSync(opts.destExePath)) {
        throw new Error(
          `Zip extraction (${artifact.extractZipDirectoryPrefix}) did not produce ${opts.destExePath}`
        )
      }
    } else if (artifact.extractExeRelativePath) {
      copyZipMemberToFile(tmpName, artifact.extractExeRelativePath, opts.destExePath)
    }
  } finally {
    try {
      const fs = await import('node:fs')
      fs.unlinkSync(tmpName)
    } catch {
      /* noop */
    }
  }
}
