# Contributing to MySTT

Thanks for your interest. This project is a **pnpm monorepo**; run commands from the repository root unless noted.

## Quick checks before opening a PR

```bash
pnpm install
pnpm exec eslint .
pnpm --filter @mystt/desktop typecheck
pnpm test
```

Fix any new lint issues; prefer matching existing style and keeping changes scoped to the issue you are solving.

## Structure

- **`apps/desktop`** — Electron (main process, preload, React renderer).
- **`packages/core-pipeline`** — Offline pipeline (downloads, FFmpeg/whisper integration).
- **`packages/ipc-contract`** — IPC channel names and validated payloads.
- **`packages/ui`** — Shared React UI.

## Pull requests

- Describe **what** changed and **why** in plain language.
- Link related issues if any.
- If you changed user-visible behavior, note how to verify manually when relevant.

## Code of conduct

Be respectful and constructive. Assume good intent.
