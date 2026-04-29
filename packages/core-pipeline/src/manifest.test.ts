import { describe, expect, it } from 'vitest'

import { parseRuntimeManifest } from './manifest.js'

describe('runtime manifest', () => {
  it('parses a minimal valid manifest', () => {
    const m = parseRuntimeManifest({
      version: 1,
      targets: {
        'win32-x64': {
          ffmpeg: {
            url: 'https://example.com/ffmpeg.zip',
            sha256: '0'.repeat(64),
            sizeBytes: 1,
            format: 'zip',
            extractExeRelativePath: 'bin/ffmpeg.exe',
          },
          whisper: {
            url: 'https://example.com/whisper.zip',
            sha256: '0'.repeat(64),
            sizeBytes: 1,
            format: 'zip',
            extractExeRelativePath: 'whisper-cli.exe',
          },
        },
      },
      models: {
        tiny: { url: 'https://example.com/t.bin', sha256: '0'.repeat(64), sizeBytes: 1 },
        base: { url: 'https://example.com/b.bin', sha256: '0'.repeat(64), sizeBytes: 1 },
        small: { url: 'https://example.com/s.bin', sha256: '0'.repeat(64), sizeBytes: 1 },
      },
    })
    expect(m.version).toBe(1)
    expect(m.targets['win32-x64'].ffmpeg.format).toBe('zip')
  })
})
