import { releasesLatestApiUrl } from '@/config/site'

type GitHubRelease = {
  assets?: { browser_download_url: string; name: string }[]
}

/**
 * Resolves the Windows installer URL: explicit env → GitHub `releases/latest` API → throw.
 */
export async function resolveWindowsInstallerUrl(): Promise<string> {
  const explicit = import.meta.env.VITE_DOWNLOAD_URL?.trim()
  if (explicit) return explicit

  const res = await fetch(releasesLatestApiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!res.ok) {
    throw new Error(`GitHub API responded with ${res.status}`)
  }

  const data = (await res.json()) as GitHubRelease
  const assets = data.assets ?? []
  const exe =
    assets.find((a) => /\.exe$/i.test(a.name)) ??
    assets.find((a) => /setup/i.test(a.name))

  const url = exe?.browser_download_url
  if (!url) {
    throw new Error('Latest release has no Windows installer asset')
  }

  return url
}
