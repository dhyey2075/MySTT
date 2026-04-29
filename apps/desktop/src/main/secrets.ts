import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CREDENTIAL_FILENAME = 'openai-credential.enc'

export function readOpenAiApiKey(baseDir: string): string | null {
  const env = process.env['OPENAI_API_KEY']
  if (env && env.trim().length > 0) return env.trim()

  const p = join(baseDir, CREDENTIAL_FILENAME)
  if (!existsSync(p)) return null

  try {
    const raw = readFileSync(p)
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw)
    }
    return raw.toString('utf8')
  } catch {
    return null
  }
}

export function writeOpenAiApiKey(baseDir: string, key: string | null): void {
  mkdirSync(baseDir, { recursive: true })
  const p = join(baseDir, CREDENTIAL_FILENAME)
  if (key === null || key.trim() === '') {
    if (existsSync(p)) unlinkSync(p)
    return
  }
  const trimmed = key.trim()
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(p, safeStorage.encryptString(trimmed))
  } else {
    writeFileSync(p, trimmed, 'utf8')
  }
}
