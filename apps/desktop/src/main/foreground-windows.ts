import { execFileSync } from 'node:child_process'

export type ForegroundProcessInfo = {
  processName: string
  imagePath: string | null
}

/** Best-effort foreground window owner on Windows (for terminal-aware dictation). */
export function getForegroundWindowsProcessInfo(): ForegroundProcessInfo | null {
  if (process.platform !== 'win32') return null

  const script = `
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class WinFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
'@
$h = [WinFg]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) {
  Write-Output "{}"
  exit 0
}
$procId = [uint32]0
[void][WinFg]::GetWindowThreadProcessId($h, [ref]$procId)
$p = Get-Process -Id $procId -ErrorAction SilentlyContinue
if (-not $p) {
  Write-Output "{}"
  exit 0
}
$path = $null
try { $path = $p.Path } catch {}
[PSCustomObject]@{ Name = $p.ProcessName; Path = $path } | ConvertTo-Json -Compress
`.trim()

  try {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const out = execFileSync('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', encoded], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 512 * 1024,
    }).trim()

    const j = JSON.parse(out) as { Name?: string; Path?: string | null }
    const name = typeof j.Name === 'string' ? j.Name.trim() : ''
    if (!name) return null
    const path = typeof j.Path === 'string' && j.Path.length > 0 ? j.Path : null
    return { processName: name, imagePath: path }
  } catch {
    return null
  }
}
