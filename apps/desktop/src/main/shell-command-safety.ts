/**
 * Heuristic safety gate for text pasted into an interactive shell on Windows.
 * Not a guarantee — users must still review commands before pressing Enter.
 */

const MAX_COMMAND_CHARS = 2048

/** Strip markdown fences / commentary; keep first plausible command line. */
export function normalizeShellPasteCandidate(raw: string): string {
  let s = raw.trim()
  const fence = /^```(?:powershell|pwsh|cmd|shell|bash|sh)?\s*\r?\n([\s\S]*?)\r?\n```$/im
  const m = s.match(fence)
  if (m?.[1]) s = m[1].trim()

  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  s = lines[0] ?? ''

  // Drop leading shell prompts accidentally transcribed
  s = s.replace(/^(?:PS\s*)?[A-Z]:\\[^\s>]*>\s*/i, '')
  s = s.replace(/^\$\s+/, '')

  return s.trim()
}

type SafetyFail = { ok: false; reason: string }
type SafetyOk = { ok: true }

/** Patterns applied to LLM-produced commands (strict). */
const STRICT_BLOCKED_PATTERNS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /(^|[\s;|&`])\s*rm\s+-\w*r\b/i, reason: 'recursive delete (rm)' },
  { re: /\brm\s+\/(?!dev\/)/i, reason: 'destructive rm path' },
  { re: /\brmdir\s+\/[sq]/i, reason: 'recursive rmdir' },
  { re: /\bdel(?:ete)?\s+\/[fq]/i, reason: 'forced delete (del)' },
  { re: /\berase\s+\/[fq]/i, reason: 'forced erase' },
  { re: /\bformat\s+[a-z]\s*:/i, reason: 'disk format' },
  { re: /\bdiskpart\b/i, reason: 'diskpart' },
  { re: /\bmkfs\b/i, reason: 'filesystem format (mkfs)' },
  { re: /\bdd\s+if=/i, reason: 'raw disk write (dd)' },
  { re: />\s*[\\/]\s*(dev|PhysicalDrive)/i, reason: 'redirect to raw device' },
  { re: /\|\s*(bash|sh)\b/i, reason: 'pipe to shell' },
  { re: /\bcurl\b[^\n]*\|/i, reason: 'curl piped (download & execute risk)' },
  { re: /\bwget\b[^\n]*\|/i, reason: 'wget piped (download & execute risk)' },
  { re: /\biwr\b[^\n]*\|/i, reason: 'Invoke-WebRequest piped (IWR)' },
  { re: /\binvoke-expression\b/i, reason: 'Invoke-Expression' },
  { re: /\biex\b\s+/i, reason: 'Invoke-Expression alias (iex)' },
  { re: /\binvoke-webrequest\b.*\|/i, reason: 'Invoke-WebRequest piped' },
  { re: /\bStop-Computer\b/i, reason: 'Stop-Computer' },
  { re: /\bRestart-Computer\b/i, reason: 'Restart-Computer' },
  { re: /\bClear-RecycleBin\b/i, reason: 'Clear-RecycleBin' },
  { re: /\bRemove-Item\b[^\n]*-\s*(?:recurse|r)\b/i, reason: 'Remove-Item -Recurse' },
  { re: /\bri\b\s+\S+\s+-r\b/i, reason: 'recursive remove-item alias' },
  { re: /\bFormat-Volume\b/i, reason: 'Format-Volume' },
  { re: /\bInitialize-Disk\b/i, reason: 'Initialize-Disk' },
  { re: /\bClear-Disk\b/i, reason: 'Clear-Disk' },
  { re: /\breg(\s\.exe)?\s+delete\b/i, reason: 'registry delete' },
  { re: /\bshutdown(?:\.exe)?\s+\/[a-z]/i, reason: 'shutdown with flags' },
  { re: /\blogoff\b/i, reason: 'logoff' },
  { re: /\bbcdedit\b/i, reason: 'bcdedit' },
  { re: /\bcipher\b/i, reason: 'cipher' },
  { re: /\bfsutil\b\s+\w+\s+delete/i, reason: 'fsutil delete' },
  { re: /\bwmic\b[^\n]*\b(delete|format)\b/i, reason: 'wmic delete/format' },
  { re: /\bmshta\b/i, reason: 'mshta' },
  { re: /\bregsvr32\b/i, reason: 'regsvr32' },
  { re: /\bcertutil\b/i, reason: 'certutil (often abused)' },
  { re: /\bbitsadmin\b/i, reason: 'bitsadmin' },
  { re: /\bEncodedCommand\b/i, reason: '-EncodedCommand' },
  { re: /\s-enc\s+/i, reason: 'encoded PowerShell (-enc)' },
  { re: /:\(\)\{[^}]*;\s*\}\s*;/i, reason: 'fork bomb–like definition' },
  { re: /\bchmod\b[^\n]*777/i, reason: 'chmod 777' },
]

/**
 * High-confidence destructive patterns for raw speech pasted without conversion (narrower,
 * avoids blocking normal prose accidentally dictated into a terminal).
 */
const SPEECH_FALLBACK_BLOCKED_PATTERNS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /(^|[\s;|&`])\s*rm\s+-\w*r\b/i, reason: 'recursive delete (rm)' },
  { re: /\bdel(?:ete)?\s+\/[fq]/i, reason: 'forced delete (del)' },
  { re: /\berase\s+\/[fq]/i, reason: 'forced erase' },
  { re: /\bformat\s+[a-z]\s*:/i, reason: 'disk format' },
  { re: /\bdiskpart\b/i, reason: 'diskpart' },
  { re: /\binvoke-expression\b/i, reason: 'Invoke-Expression' },
  { re: /\biex\b\s+/i, reason: 'Invoke-Expression alias (iex)' },
  { re: /\bcurl\b[^\n]*\|/i, reason: 'curl piped' },
  { re: /\bwget\b[^\n]*\|/i, reason: 'wget piped' },
  { re: /\|\s*(bash|sh)\b/i, reason: 'pipe to shell' },
]

export function evaluateShellPasteSafety(
  line: string,
  strictLlmOutput: boolean
): SafetyOk | SafetyFail {
  const cmd = normalizeShellPasteCandidate(line)
  if (cmd.length === 0) return { ok: false, reason: 'empty command after cleanup' }
  if (cmd.length > MAX_COMMAND_CHARS) return { ok: false, reason: 'command too long' }

  if (cmd.includes('\x00')) return { ok: false, reason: 'invalid characters' }

  const blocks = strictLlmOutput ? STRICT_BLOCKED_PATTERNS : SPEECH_FALLBACK_BLOCKED_PATTERNS
  for (const { re, reason } of blocks) {
    if (re.test(cmd)) return { ok: false, reason }
  }

  return { ok: true }
}
