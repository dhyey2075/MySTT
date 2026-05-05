import type { SettingsState } from '@mystt/ipc-contract'

import { convertNaturalLanguageToShellCommand } from './openai-shell-command'
import { getForegroundWindowsProcessInfo } from './foreground-windows'
import { readOpenAiApiKey } from './secrets'
import { evaluateShellPasteSafety, normalizeShellPasteCandidate } from './shell-command-safety'
import { isLikelyTerminalProcess } from './terminal-process'

/**
 * When the foreground window is a terminal on Windows, optionally rewrite speech to a shell
 * command (OpenAI) and always run heuristic safety checks before paste.
 */
export async function resolveTerminalAwarePasteText(opts: {
  settings: SettingsState
  credentialDir: string
  transcript: string
  notifyUser: (title: string, body: string) => void
}): Promise<{ ok: true; text: string } | { ok: false; code: string; message: string }> {
  let text = opts.transcript.trim()

  if (process.platform !== 'win32') {
    return { ok: true, text }
  }

  const fg = getForegroundWindowsProcessInfo()
  if (!fg || !isLikelyTerminalProcess(fg)) {
    return { ok: true, text }
  }

  let convertedFromModel = false
  if (opts.settings.terminalNlCommandEnabled) {
    const apiKey = readOpenAiApiKey(opts.credentialDir)
    if (apiKey) {
      const conv = await convertNaturalLanguageToShellCommand({
        apiKey,
        userTranscript: text,
      })
      if (conv.ok) {
        text = normalizeShellPasteCandidate(conv.command)
        convertedFromModel = true
      } else if (conv.deniedByModel) {
        opts.notifyUser('MySTT', conv.message)
        return { ok: false, code: 'TERMINAL_CMD_REFUSED', message: conv.message }
      } else {
        opts.notifyUser(
          'MySTT',
          'Could not convert speech to a shell command — pasting transcribed text instead.'
        )
      }
    }
  }

  const safety = evaluateShellPasteSafety(text, convertedFromModel)
  if (!safety.ok) {
    opts.notifyUser('MySTT', `Blocked unsafe terminal paste (${safety.reason}).`)
    return { ok: false, code: 'TERMINAL_CMD_BLOCKED', message: safety.reason }
  }

  return { ok: true, text }
}
