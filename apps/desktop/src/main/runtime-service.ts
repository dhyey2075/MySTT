import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  CancelDownloadPayloadSchema,
  IPC_CHANNELS,
  InstallRuntimePayloadSchema,
  ModelDeletePayloadSchema,
  ModelDownloadPayloadSchema,
  RemoveRuntimePayloadSchema,
  type DownloadProgressPayload,
  type ModelEntry,
  type RuntimeStatusPayload,
} from '@mystt/ipc-contract'
import {
  downloadFile,
  ffmpegBinPath,
  ggmlModelPath,
  installBinaryArtifact,
  loadRuntimeManifestFromPath,
  platformRuntimeKey,
  removeRuntimeArtifacts,
  resolveRuntime,
  whisperCliBinPath,
  type RuntimeManifest,
  type UserDirs,
} from '@mystt/core-pipeline'
import { ipcMain, type BrowserWindow } from 'electron'

function sendProgress(
  getWindow: () => BrowserWindow | null,
  channel: typeof IPC_CHANNELS.MODEL_PROGRESS | typeof IPC_CHANNELS.RUNTIME_PROGRESS,
  payload: DownloadProgressPayload
): void {
  const w = getWindow()
  if (w && !w.isDestroyed()) {
    w.webContents.send(channel, payload)
  }
}

export function registerRuntimeIpc(opts: {
  getMainWindow: () => BrowserWindow | null
  userDirs: UserDirs
  resolveManifestPath: () => string
}): void {
  let manifestCache: RuntimeManifest | null = null
  const abortControllers = new Map<string, AbortController>()

  function manifest(): RuntimeManifest {
    if (!manifestCache) {
      manifestCache = loadRuntimeManifestFromPath(opts.resolveManifestPath())
    }
    return manifestCache
  }

  function platformBins() {
    const key = platformRuntimeKey()
    const m = manifest()
    const bins = m.targets[key]
    if (!bins) {
      throw new Error(
        `No runtime manifest entry for platform "${key}". Edit apps/desktop/resources/runtime-manifest.json.`
      )
    }
    return { key, bins }
  }

  ipcMain.handle(IPC_CHANNELS.RUNTIME_STATUS, (): RuntimeStatusPayload => {
    const rt = resolveRuntime(opts.userDirs)
    return {
      ffmpegReady: rt.ffmpegReady,
      whisperReady: rt.whisperReady,
      ffmpegPath: rt.ffmpegPath,
      whisperPath: rt.whisperPath,
      platformKey: platformRuntimeKey(),
    }
  })

  ipcMain.handle(IPC_CHANNELS.MODEL_LIST, (): ModelEntry[] => {
    const m = manifest()
    const out: ModelEntry[] = []
    for (const id of ['tiny', 'base', 'small'] as const) {
      const meta = m.models[id]
      if (!meta) {
        throw new Error(`runtime-manifest.json missing models.${id}`)
      }
      const p = ggmlModelPath(opts.userDirs, id)
      let sizeBytes = 0
      let installed = false
      if (existsSync(p)) {
        try {
          sizeBytes = statSync(p).size
          installed = sizeBytes > 500_000
        } catch {
          /* noop */
        }
      }
      out.push({
        id,
        sizeBytes,
        installed,
        manifestSizeBytes: meta.sizeBytes,
      })
    }
    return out
  })

  ipcMain.handle(IPC_CHANNELS.MODEL_DOWNLOAD, async (_event, raw: unknown) => {
    const { id } = ModelDownloadPayloadSchema.parse(raw)
    const m = manifest()
    const meta = m.models[id]
    if (!meta) {
      throw new Error(`runtime-manifest.json missing models.${id}`)
    }
    const destPath = ggmlModelPath(opts.userDirs, id)
    mkdirSync(dirname(destPath), { recursive: true })

    const key = cancelKey('model', id)
    abortControllers.get(key)?.abort()
    const ac = new AbortController()
    abortControllers.set(key, ac)

    await downloadFile({
      url: meta.url,
      destPath,
      sha256Expected: meta.sha256,
      signal: ac.signal,
      onProgress: (p) => {
        sendProgress(opts.getMainWindow, IPC_CHANNELS.MODEL_PROGRESS, {
          kind: 'model',
          id,
          receivedBytes: p.receivedBytes,
          totalBytes: p.totalBytes,
        })
      },
    })

    abortControllers.delete(key)
    return { ok: true as const }
  })

  ipcMain.handle(IPC_CHANNELS.MODEL_DELETE, async (_event, raw: unknown) => {
    const { id } = ModelDeletePayloadSchema.parse(raw)
    const p = ggmlModelPath(opts.userDirs, id)
    if (existsSync(p)) {
      unlinkSync(p)
    }
    return { ok: true as const }
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, async (_event, raw: unknown) => {
    const p = CancelDownloadPayloadSchema.parse(raw)
    const key = cancelKey(p.kind, p.id)
    abortControllers.get(key)?.abort()
    abortControllers.delete(key)
    return { ok: true as const }
  })

  ipcMain.handle(IPC_CHANNELS.RUNTIME_INSTALL, async (_event, raw: unknown) => {
    const { target } = InstallRuntimePayloadSchema.parse(raw)
    const { bins } = platformBins()
    const tempDir = join(opts.userDirs.temp, 'runtime-install')
    mkdirSync(tempDir, { recursive: true })

    const steps: Array<{ label: 'ffmpeg' | 'whisper'; artifact: (typeof bins)['ffmpeg'] }> = []
    if (target === 'all' || target === 'ffmpeg') steps.push({ label: 'ffmpeg', artifact: bins.ffmpeg })
    if (target === 'all' || target === 'whisper') steps.push({ label: 'whisper', artifact: bins.whisper })

    for (const step of steps) {
      const dest =
        step.label === 'ffmpeg' ? ffmpegBinPath(opts.userDirs) : whisperCliBinPath(opts.userDirs)
      const key = cancelKey('binary', step.label)
      abortControllers.get(key)?.abort()
      const ac = new AbortController()
      abortControllers.set(key, ac)

      await installBinaryArtifact({
        artifact: step.artifact,
        destExePath: dest,
        tempDir,
        signal: ac.signal,
        onProgress: (received, total) => {
          sendProgress(opts.getMainWindow, IPC_CHANNELS.RUNTIME_PROGRESS, {
            kind: 'binary',
            id: step.label,
            receivedBytes: received,
            totalBytes: total,
          })
        },
      })

      abortControllers.delete(key)
    }

    return { ok: true as const }
  })

  ipcMain.handle(IPC_CHANNELS.RUNTIME_REMOVE, async (_event, raw: unknown) => {
    const { target } = RemoveRuntimePayloadSchema.parse(raw)
    if (target === 'all' || target === 'ffmpeg') {
      const k = cancelKey('binary', 'ffmpeg')
      abortControllers.get(k)?.abort()
      abortControllers.delete(k)
    }
    if (target === 'all' || target === 'whisper') {
      const k = cancelKey('binary', 'whisper')
      abortControllers.get(k)?.abort()
      abortControllers.delete(k)
    }
    removeRuntimeArtifacts(opts.userDirs, target)
    return { ok: true as const }
  })
}

function cancelKey(kind: 'model' | 'binary', id: string): string {
  return `${kind}:${id}`
}