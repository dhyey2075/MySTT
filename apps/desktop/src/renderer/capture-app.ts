let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let chunks: Blob[] = []

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

async function beginRecording(): Promise<void> {
  chunks = []
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  })
  const mime = pickMime()
  mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined)
  mediaRecorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data)
  }
  mediaRecorder.start(200)
}

async function endRecording(): Promise<{ mimeType: string; buffer: ArrayBuffer }> {
  const rec = mediaRecorder
  const stream = mediaStream
  mediaRecorder = null
  mediaStream = null

  if (!rec) {
    return { mimeType: 'audio/webm', buffer: new ArrayBuffer(0) }
  }

  return await new Promise((resolve, reject) => {
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop())
      const type = rec.mimeType || 'audio/webm'
      const blob = new Blob(chunks, { type: type })
      chunks = []
      void blob.arrayBuffer().then((buffer) => resolve({ mimeType: type, buffer }))
    }
    rec.onerror = () => reject(new Error('MediaRecorder error'))
    try {
      rec.stop()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

function boot(): void {
  const api = window.mysttCapture
  if (!api) {
    console.error('mysttCapture bridge missing')
    return
  }

  api.onCaptureStart(() => {
    void beginRecording().catch((e) => console.error(e))
  })

  api.onCaptureStop(() => {
    void endRecording()
      .then(({ mimeType, buffer }) => api.reportBlob(mimeType, buffer))
      .catch((e) => console.error(e))
  })
}

boot()
