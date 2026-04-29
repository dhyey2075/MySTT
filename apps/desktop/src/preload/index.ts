import { contextBridge, ipcRenderer } from 'electron'

import {
  IPC_CHANNELS,
  type CancelDownloadPayload,
  type InstallRuntimePayload,
  type RemoveRuntimePayload,
} from '@mystt/ipc-contract'

const api = {
  startJob: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.JOB_START, payload),
  cancelJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_CANCEL, jobId),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, payload),
  setOpenAiKey: (key: string | null) => ipcRenderer.invoke(IPC_CHANNELS.OPENAI_KEY_SET, key),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.MODEL_LIST),
  downloadModel: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD, { id }),
  deleteModel: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DELETE, { id }),
  cancelDownload: (payload: CancelDownloadPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_CANCEL, payload),
  getRuntimeStatus: () => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_STATUS),
  installRuntime: (target: InstallRuntimePayload['target']) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_INSTALL, { target }),
  removeRuntime: (target: RemoveRuntimePayload['target']) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_REMOVE, { target }),

  onJobProgress: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.JOB_PROGRESS, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_PROGRESS, subscription)
  },
  onJobSegment: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.JOB_SEGMENT, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_SEGMENT, subscription)
  },
  onJobDone: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.JOB_DONE, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_DONE, subscription)
  },
  onJobError: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.JOB_ERROR, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_ERROR, subscription)
  },
  onDictationStarted: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.DICTATION_STARTED, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DICTATION_STARTED, subscription)
  },
  onDictationCompleted: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.DICTATION_COMPLETED, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DICTATION_COMPLETED, subscription)
  },
  onDictationError: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.DICTATION_ERROR, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DICTATION_ERROR, subscription)
  },
  onModelProgress: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.MODEL_PROGRESS, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MODEL_PROGRESS, subscription)
  },
  onRuntimeProgress: (handler: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data)
    ipcRenderer.on(IPC_CHANNELS.RUNTIME_PROGRESS, subscription)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RUNTIME_PROGRESS, subscription)
  },
}

contextBridge.exposeInMainWorld('mystt', api)

const captureApi = {
  onCaptureStart: (handler: () => void) => {
    const subscription = () => handler()
    ipcRenderer.on('capture:start', subscription)
    return () => ipcRenderer.removeListener('capture:start', subscription)
  },
  onCaptureStop: (handler: () => void) => {
    const subscription = () => handler()
    ipcRenderer.on('capture:stop', subscription)
    return () => ipcRenderer.removeListener('capture:stop', subscription)
  },
  reportBlob: (mimeType: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_REPORT, { mimeType, buffer }),
}

contextBridge.exposeInMainWorld('mysttCapture', captureApi)
