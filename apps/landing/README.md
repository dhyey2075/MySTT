# Marketing site (`@mystt/landing`)

React + Vite + Tailwind landing page for MySTT.

## Commands

From the repo root:

```bash
pnpm landing:dev      # dev server (default http://localhost:5173)
pnpm landing:build    # production build → dist/
pnpm landing:preview  # preview production build
```

Or from `apps/landing`:

```bash
pnpm dev
pnpm build
pnpm preview
```

## Environment variables

Copy `.env.example` to `.env.local` (optional). All variables are prefixed with `VITE_` and are inlined at build time.

| Variable | Description |
|----------|-------------|
| `VITE_GITHUB_REPO_URL` | GitHub repository URL (defaults to `https://github.com/dhyey2075/MySTT`) |
| `VITE_GITHUB_RELEASES_API_URL` | Optional override for `GET …/releases/latest` (defaults from repo URL) |
| `VITE_DOWNLOAD_URL` | If set, **Download for Windows** goes here directly (no API call). If unset, the button calls the GitHub API and uses the latest `.exe` `browser_download_url`, with `{repo}/releases/latest` as fallback |

## Deploying under GitHub Pages (project site)

If the site is served from `https://username.github.io/MySTT/`, set `base: '/MySTT/'` in `vite.config.ts` before building.
