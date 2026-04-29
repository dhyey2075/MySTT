import { describe, expect, it } from 'vitest'
import { runMockTranscriptionJob } from './index'

describe('runMockTranscriptionJob', () => {
  it('yields at least one segment', async () => {
    const ac = new AbortController()
    const segments: string[] = []

    for await (const seg of runMockTranscriptionJob(ac.signal)) {
      segments.push(seg.text)
    }

    expect(segments.length).toBeGreaterThan(0)
  })
})
