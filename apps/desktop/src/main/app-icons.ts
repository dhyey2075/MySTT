import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { app, nativeImage, screen } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Fallback if logo.png missing (1×1 pixel). */
const FALLBACK_TRAY_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/** Dev: `out/main` → `apps/desktop/resources/icons/logo.png`. Packaged: `resources/icons/logo.png`. */
export function resolveLogoPath(): string | null {
  const devPath = join(__dirname, '../../resources/icons/logo.png')
  const packagedPath = join(process.resourcesPath, 'icons', 'logo.png')
  const candidate = app.isPackaged ? packagedPath : devPath
  if (existsSync(candidate)) return candidate
  if (!app.isPackaged && existsSync(devPath)) return devPath
  return null
}

export function loadLogoNativeImage(): Electron.NativeImage | undefined {
  const p = resolveLogoPath()
  if (!p) return undefined
  try {
    const img = nativeImage.createFromPath(p)
    return img.isEmpty() ? undefined : img
  } catch {
    return undefined
  }
}

export function trayIconNativeImage(): Electron.NativeImage {
  const img = loadLogoNativeImage()
  if (!img) {
    return nativeImage.createFromBuffer(Buffer.from(FALLBACK_TRAY_BASE64, 'base64'))
  }
  let sf = 1
  try {
    sf = screen.getPrimaryDisplay().scaleFactor || 1
  } catch {
    sf = 1
  }
  const px = sf >= 2 ? 32 : 16
  return img.resize({ width: px, height: px })
}
