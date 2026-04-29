export {}

declare global {
  interface Window {
    mysttCapture?: {
      onCaptureStart: (handler: () => void) => () => void
      onCaptureStop: (handler: () => void) => () => void
      reportBlob: (mimeType: string, buffer: ArrayBuffer) => Promise<void>
    }
  }
}
