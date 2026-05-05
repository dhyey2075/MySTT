import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AppSettingsSchema,
  IPC_CHANNELS,
  JobStartPayloadSchema,
  type AppSettings,
  type JobStartPayload,
  type SettingsState,
} from '@mystt/ipc-contract'
import { ensureUserDirs, runMockTranscriptionJob } from '@mystt/core-pipeline'
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  Tray,
} from 'electron'

import {
  handleCapturedBlob,
  prepareCaptureWindow,
  registerCaptureIpc,
  startDictationHotkey,
  stopDictationHotkey,
  type DictationDeps,
} from './dictation-service'
import { loadLogoNativeImage, trayIconNativeImage } from './app-icons'
import { registerRuntimeIpc } from './runtime-service'
import { readOpenAiApiKey, writeOpenAiApiKey } from './secrets'

const __dirname = dirname(fileURLToPath(import.meta.url))

function resolvePreloadScript(): string {
  const dir = join(__dirname, '../preload')
  const candidates = [join(dir, 'index.mjs'), join(dir, 'index.js')]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[1] ?? candidates[0]!
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let userDirs: ReturnType<typeof ensureUserDirs>
const jobs = new Map<string, AbortController>()
let isQuitting = false

function restartDictationHotkey(): void {
  stopDictationHotkey()
  startDictationHotkey(buildDictationDeps())
}

function loadSettingsDisk(): AppSettings {
  const path = join(userDirs.root, 'settings.json')
  if (!existsSync(path)) return AppSettingsSchema.parse({})
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
  return AppSettingsSchema.parse(raw)
}

function saveSettingsDisk(next: AppSettings): void {
  const path = join(userDirs.root, 'settings.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf8')
}

/** Rewrite settings.json so legacy `hotkeyAccelerator` values are replaced on disk. */
function persistNormalizedSettings(): void {
  const path = join(userDirs.root, 'settings.json')
  if (!existsSync(path)) return
  saveSettingsDisk(loadSettingsDisk())
}

function loadSettingsState(): SettingsState {
  const settings = loadSettingsDisk()
  const key = readOpenAiApiKey(userDirs.root)
  return { ...settings, hasOpenAiApiKey: !!key }
}

function resolveRuntimeManifestPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'runtime-manifest.json')
  }
  return join(__dirname, '../../resources/runtime-manifest.json')
}

function buildDictationDeps(): DictationDeps {
  return {
    getSettingsState: loadSettingsState,
    getCredentialDir: () => userDirs.root,
    userDirs,
    resolvePreloadPath: resolvePreloadScript,
    rendererDevUrl: process.env['ELECTRON_RENDERER_URL'],
    broadcastDictation: (channel, payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload)
      }
    },
    notifyUser: (title, body) => {
      if (Notification.isSupported()) {
        try {
          new Notification({ title, body }).show()
        } catch {
          /* noop */
        }
      }
    },
  }
}

function createWindow() {
  const logoImg = loadLogoNativeImage()
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    backgroundColor: '#080b10',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(logoImg ? { icon: logoImg } : {}),
    webPreferences: {
      preload: resolvePreloadScript(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  if (tray) return

  tray = new Tray(trayIconNativeImage())
  tray.setToolTip('MySTT')
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show MySTT',
      click: () => {
        if (!mainWindow) createWindow()
        else {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        stopDictationHotkey()
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

async function runMockPipelineJob(
  wc: Electron.WebContents,
  jobId: string,
  payload: JobStartPayload,
  signal: AbortSignal
): Promise<void> {
  const totalSec = payload.sourceKind === 'mock' ? 12 : 12
  const lines: string[] = []

  try {
    for await (const seg of runMockTranscriptionJob(signal, { totalSec })) {
      lines.push(seg.text.trim())
      wc.send(IPC_CHANNELS.JOB_PROGRESS, {
        jobId,
        processedSec: Math.min(seg.end, totalSec),
        totalSec,
        etaMs: Math.max(0, Math.round((totalSec - seg.end) * 180)),
      })
      wc.send(IPC_CHANNELS.JOB_SEGMENT, {
        jobId,
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })
    }

    const text = lines.join(' ')
    wc.send(IPC_CHANNELS.JOB_DONE, {
      jobId,
      text,
      meta: { modelId: payload.modelId },
    })
  } catch (err) {
    if (signal.aborted) {
      wc.send(IPC_CHANNELS.JOB_ERROR, {
        jobId,
        code: 'ABORTED',
        message: 'Transcription cancelled.',
      })
      return
    }
    wc.send(IPC_CHANNELS.JOB_ERROR, {
      jobId,
      code: 'ERR_JOB',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

function registerIpc() {
  ipcMain.handle(IPC_CHANNELS.JOB_START, async (event, raw: unknown) => {
    const payload = JobStartPayloadSchema.parse(raw)
    const jobId = crypto.randomUUID()
    const ac = new AbortController()
    jobs.set(jobId, ac)

    void runMockPipelineJob(event.sender, jobId, payload, ac.signal).finally(() => {
      jobs.delete(jobId)
    })

    return { jobId }
  })

  ipcMain.handle(IPC_CHANNELS.JOB_CANCEL, async (_event, jobId: unknown) => {
    if (typeof jobId !== 'string' || jobId.length === 0) return
    jobs.get(jobId)?.abort()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => loadSettingsState())

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, raw: unknown) => {
    const next = AppSettingsSchema.parse(raw)
    saveSettingsDisk(next)
    return loadSettingsState()
  })

  ipcMain.handle(IPC_CHANNELS.OPENAI_KEY_SET, (_event, raw: unknown) => {
    if (raw !== null && typeof raw !== 'string') {
      throw new Error('OPENAI_KEY_SET expects string | null')
    }
    const key = raw === null || raw === '' ? null : raw
    writeOpenAiApiKey(userDirs.root, key)
    return loadSettingsState()
  })

  registerRuntimeIpc({
    getMainWindow: () => mainWindow,
    userDirs,
    resolveManifestPath: resolveRuntimeManifestPath,
  })

  registerCaptureIpc(async (payload) => {
    await handleCapturedBlob(buildDictationDeps(), payload)
  })
}

app.whenReady().then(async () => {
  userDirs = ensureUserDirs(app.getPath('userData'))
  persistNormalizedSettings()
  Menu.setApplicationMenu(null)

  registerIpc()
  createWindow()
  createTray()

  const deps = buildDictationDeps()
  try {
    await prepareCaptureWindow(deps)
  } catch (err) {
    console.error('Capture window failed to load:', err)
  }

  restartDictationHotkey()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else {
      mainWindow?.show()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  /* Tray keeps the process alive for push-to-talk */
})
