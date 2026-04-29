/** Shared cleanup for dictation / cloud transcription polish */

export function polishDictationText(text: string): string {
  let s = text.trim()
  s = s.replace(/\[(BLANK_AUDIO|SILENCE)\]/gi, '')
  s = s.replace(/^\(silence\)\s*/i, '')
  return s.trim()
}
