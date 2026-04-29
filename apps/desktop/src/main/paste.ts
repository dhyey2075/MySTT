import { clipboard } from 'electron'
import { execFileSync } from 'node:child_process'

/** Backup clipboard text only (conservative). Returns previous text or null if non-text clipboard. */
export function backupClipboardText(): string | null {
  const formats = clipboard.availableFormats()
  if (!formats.some((f) => f === 'text/plain' || f.startsWith('text/'))) {
    return null
  }
  try {
    const t = clipboard.readText()
    return t.length > 0 ? t : ''
  } catch {
    return null
  }
}

/** Paste plain text into the foreground app (Windows): clipboard swap + Ctrl+V via SendKeys. */
export function pasteTextWindows(text: string, restore: string | null, restoreDelayMs = 350): void {
  clipboard.writeText(text)
  sendCtrlVWindows()
  if (restore !== null) {
    setTimeout(() => {
      clipboard.writeText(restore)
    }, restoreDelayMs)
  }
}

function sendCtrlVWindows(): void {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-STA',
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")',
    ],
    { windowsHide: true }
  )
}
