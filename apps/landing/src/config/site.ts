/** Marketing URLs — override via `.env` (see `.env.example`). */
const githubRepo = (import.meta.env.VITE_GITHUB_REPO_URL ?? 'https://github.com/dhyey2075/MySTT').replace(
  /\/$/,
  ''
)

const explicitDownload = import.meta.env.VITE_DOWNLOAD_URL?.trim()

/** `GET /repos/{owner}/{repo}/releases/latest` — used to resolve `browser_download_url` for the installer. */
export const releasesLatestApiUrl =
  import.meta.env.VITE_GITHUB_RELEASES_API_URL?.trim() ||
  `https://api.github.com/repos/${githubRepo.replace(/^https:\/\/github\.com\//i, '')}/releases/latest`

export const site = {
  name: 'MySTT',
  githubRepo,
  releasesUrl: `${githubRepo}/releases`,
  /** Fallback when API fetch fails or env-only flow: GitHub “latest release” page or pinned installer. */
  downloadUrl:
    explicitDownload && explicitDownload.length > 0 ? explicitDownload : `${githubRepo}/releases/latest`,
  readmeUrl: `${githubRepo}/blob/main/README.md`,
  licenseUrl: `${githubRepo}/blob/main/LICENSE`,
  thirdPartyUrl: `${githubRepo}/blob/main/THIRD_PARTY_NOTICES.md`,
}
