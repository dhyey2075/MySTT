import type { ForegroundProcessInfo } from './foreground-windows'

/** Executable basename lowercase without ".exe". */
function exeBasenameLower(imagePath: string | null): string | null {
  if (!imagePath) return null
  const parts = imagePath.replace(/\\/g, '/').split('/')
  const base = parts[parts.length - 1]
  if (!base || !base.toLowerCase().endsWith('.exe')) return base?.toLowerCase() ?? null
  return base.slice(0, -4).toLowerCase()
}

/**
 * True when the focused process is plausibly a terminal/console host on Windows.
 * False negatives / positives are possible; errs toward excluding unrelated editors (e.g. Code.exe).
 */
export function isLikelyTerminalProcess(info: ForegroundProcessInfo): boolean {
  const n = info.processName.toLowerCase()
  const exe = exeBasenameLower(info.imagePath)

  const names = new Set([
    'cmd',
    'powershell',
    'pwsh',
    'windowsterminal',
    'wt',
    'conemu64',
    'conemu',
    'conemuc64',
    'alacritty',
    'wezterm-gui',
    'mintty',
    'bash',
    'zsh',
    'openconsole',
    'windowsterminalpreview',
    'tabby',
    'hyper',
    'warp',
    'wsl',
    'wslhost',
  ])

  if (names.has(n)) return true

  if (exe && names.has(exe)) return true

  // Windows Terminal hosts sometimes surface as OpenConsole with WT on path
  if (n === 'openconsole' && info.imagePath && /windowsterminal/i.test(info.imagePath)) return true

  // Generic: console subsystem inside Windows dirs — weak signal
  if (info.imagePath && /\\wsl\.exe$/i.test(info.imagePath)) return true

  return false
}
