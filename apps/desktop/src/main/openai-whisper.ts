/** Multipart upload to OpenAI Whisper — sends audio to cloud (SPEC interim mode). */

import { polishDictationText } from '@mystt/core-pipeline'

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string }

export async function transcribeWithOpenAI(
  apiKey: string,
  params: { mimeType: string; buffer: ArrayBuffer }
): Promise<TranscribeResult> {
  const body = new FormData()
  const blob = new Blob([params.buffer], { type: params.mimeType || 'audio/webm' })
  body.append('file', blob, filenameForMime(params.mimeType))
  body.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  })

  const textRaw = await res.text()
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: textRaw.slice(0, 500),
    }
  }

  try {
    const json = JSON.parse(textRaw) as { text?: string }
    const text = typeof json.text === 'string' ? json.text : ''
    return { ok: true, text: polishDictationText(text) }
  } catch {
    return { ok: false, status: res.status, message: 'Invalid JSON from OpenAI' }
  }
}

function filenameForMime(mime: string): string {
  if (mime.includes('wav')) return 'audio.wav'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio.mp3'
  return 'audio.webm'
}