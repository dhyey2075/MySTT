/** Shared transcript segment shape (mock job + whisper.cpp). */
export type WhisperSegment = {
  id: number
  start: number
  end: number
  text: string
}
