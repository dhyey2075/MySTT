import { BrowserWindow, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { IPC_CHANNELS, type SettingsState } from '@mystt/ipc-contract'
import type { UserDirs } from '@mystt/core-pipeline'
import { transcribeLocalDictation } from './local-whisper'
import { readOpenAiApiKey } from './secrets'
import { transcribeWithOpenAI } from './openai-whisper'
import { backupClipboardText, pasteTextWindows } from './paste'

import { EventType, UiohookKey, uIOhook } from 'uiohook-napi'
import type { UiohookKeyboardEvent } from 'uiohook-napi'

const __dirname = dirname(fileURLToPath(import.meta.url))

export type DictationDeps = {
  getSettingsState: () => SettingsState
  getCredentialDir: () => string
  userDirs: UserDirs
  resolvePreloadPath: () => string
  rendererDevUrl: string | undefined
  broadcastDictation: (channel: string, payload: unknown) => void
  notifyUser: (title: string, body: string) => void
}

let captureWindow: BrowserWindow | null = null
let hookCleanup: (() => void) | null = null
let armed = false
/** Single concurrent local whisper job — dictation hotkey */
let localDictationInFlight = false

export function ensureCaptureWindow(deps: DictationDeps): BrowserWindow {
  if (captureWindow && !captureWindow.isDestroyed()) return captureWindow

  captureWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: deps.resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const url = deps.rendererDevUrl
  if (url) {
    void captureWindow.loadURL(`${url.replace(/\/$/, '')}/capture.html`)
  } else {
    void captureWindow.loadFile(join(__dirname, '../renderer/capture.html'))
  }

  return captureWindow
}

export async function prepareCaptureWindow(deps: DictationDeps): Promise<void> {
  const win = ensureCaptureWindow(deps)
  await new Promise<void>((resolve, reject) => {
    win.webContents.once('did-finish-load', () => resolve())
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      reject(new Error(`capture load failed: ${code} ${desc}`))
    })
  })
}

export function registerCaptureIpc(
  onBlob: (payload: { mimeType: string; buffer: ArrayBuffer }) => Promise<void>
): void {
  ipcMain.handle(IPC_CHANNELS.CAPTURE_REPORT, async (_event, raw: unknown) => {
    const p = raw as { mimeType?: string; buffer?: ArrayBuffer }
    if (!p.buffer || typeof p.mimeType !== 'string') {
      throw new Error('Invalid capture payload')
    }
    await onBlob({ mimeType: p.mimeType, buffer: p.buffer })
    return { ok: true }
  })
}

export function startDictationHotkey(deps: DictationDeps): () => void {
  stopDictationHotkey()

  const onKeydown = (e: UiohookKeyboardEvent) => {
    if (e.type !== EventType.EVENT_KEY_PRESSED) return
    if (e.keycode !== UiohookKey.Period) return
    if (!e.ctrlKey || !e.shiftKey || e.altKey) return
    if (armed) return

    const state = deps.getSettingsState()

    if (state.dictationEngine === 'cloud') {
      const apiKey = readOpenAiApiKey(deps.getCredentialDir())
      if (!apiKey) {
        deps.notifyUser('MySTT', 'Cloud dictation needs an API key (Home → Cloud dictation).')
        deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
          code: 'NO_API_KEY',
          message: 'No OpenAI API key configured.',
        })
        return
      }
    }

    armed = true
    deps.broadcastDictation(IPC_CHANNELS.DICTATION_STARTED, { at: Date.now() })
    const win = ensureCaptureWindow(deps)
    void win.webContents.send('capture:start')
  }

  const onKeyup = (e: UiohookKeyboardEvent) => {
    if (e.type !== EventType.EVENT_KEY_RELEASED) return
    if (e.keycode !== UiohookKey.Period) return
    if (!armed) return

    armed = false
    const win = captureWindow
    if (win && !win.isDestroyed()) {
      void win.webContents.send('capture:stop')
    }
  }

  uIOhook.on('keydown', onKeydown)
  uIOhook.on('keyup', onKeyup)

  try {
    uIOhook.start()
  } catch (err) {
    deps.notifyUser('MySTT', `Keyboard hook failed: ${String(err)}`)
  }

  hookCleanup = () => {
    uIOhook.removeListener('keydown', onKeydown)
    uIOhook.removeListener('keyup', onKeyup)
    try {
      uIOhook.stop()
    } catch {
      /* noop */
    }
    hookCleanup = null
  }

  return () => stopDictationHotkey()
}

export function stopDictationHotkey(): void {
  hookCleanup?.()
}

export async function handleCapturedBlob(
  deps: DictationDeps,
  payload: { mimeType: string; buffer: ArrayBuffer }
): Promise<void> {
  const started = Date.now()
  const state = deps.getSettingsState()

  if (payload.buffer.byteLength === 0) {
    deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
      code: 'EMPTY_AUDIO',
      message: 'No audio captured.',
    })
    return
  }

  if (state.dictationEngine === 'cloud') {
    const apiKey = readOpenAiApiKey(deps.getCredentialDir())
    if (!apiKey) {
      deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
        code: 'CLOUD_DISABLED',
        message: 'Cloud dictation requires an API key.',
      })
      return
    }

    try {
      const result = await transcribeWithOpenAI(apiKey, payload)
      if (!result.ok) {
        deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
          code: `HTTP_${result.status}`,
          message: result.message,
        })
        deps.notifyUser('MySTT transcription failed', result.message.slice(0, 120))
        return
      }

      const backup = backupClipboardText()
      pasteTextWindows(result.text, backup)
      deps.broadcastDictation(IPC_CHANNELS.DICTATION_COMPLETED, {
        text: result.text,
        durationMs: Date.now() - started,
      })
    } catch (err) {
      deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
        code: 'ERR_TRANSCRIBE',
        message: err instanceof Error ? err.message : String(err),
      })
    }
    return
  }

  /* Local whisper.cpp path */
  if (localDictationInFlight) {
    deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
      code: 'BUSY',
      message: 'Local transcription is still running.',
    })
    return
  }

  localDictationInFlight = true
  try {
    const result = await transcribeLocalDictation({
      userDirs: deps.userDirs,
      settings: state,
      buffer: payload.buffer,
      mimeType: payload.mimeType,
    })

    if (!result.ok) {
      deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
        code: result.code,
        message: result.message,
      })
      deps.notifyUser('MySTT local dictation', result.message.slice(0, 140))
      return
    }

    const backup = backupClipboardText()
    pasteTextWindows(result.text, backup)
    deps.broadcastDictation(IPC_CHANNELS.DICTATION_COMPLETED, {
      text: result.text,
      durationMs: Date.now() - started,
    })
  } catch (err) {
    deps.broadcastDictation(IPC_CHANNELS.DICTATION_ERROR, {
      code: 'ERR_TRANSCRIBE',
      message: err instanceof Error ? err.message : String(err),
    })
  } finally {
    localDictationInFlight = false
  }
}
