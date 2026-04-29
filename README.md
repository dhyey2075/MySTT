# MySTT

Privacy-oriented desktop speech-to-text: local **whisper.cpp** dictation with optional **OpenAI** cloud dictation, packaged as an Electron app.

- **[Specification](SPEC.md)** — product scope and architecture notes
- **[LICENSE](LICENSE)** — MIT (application source in this repo)
- **[Third-party notices](THIRD_PARTY_NOTICES.md)** — FFmpeg, whisper.cpp, models, Electron

## Prerequisites

- **Node.js** ≥ 20 ([`engines`](package.json))
- **pnpm** 9.x (see [`packageManager`](package.json))

Install dependencies from the repository root:

```bash
pnpm install
```

## Development

Run the desktop app in dev mode:

```bash
pnpm dev
```

Other useful commands:

| Command                                  | Description                                                   |
| ---------------------------------------- | ------------------------------------------------------------- |
| `pnpm build`                             | Production build (`electron-vite build` for `@mystt/desktop`) |
| `pnpm dist`                              | Build + unpack Windows dir via electron-builder               |
| `pnpm lint`                              | ESLint on the monorepo                                        |
| `pnpm test`                              | Vitest in `@mystt/core-pipeline`                              |
| `pnpm --filter @mystt/desktop typecheck` | Typecheck renderer + main                                     |

### Optional: OpenAI API key (cloud dictation)

For cloud dictation during development you can set:

```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-..."

# Unix
export OPENAI_API_KEY=sk-...
```

Never commit API keys. The app can also store a key locally via the UI (see [`apps/desktop/src/main/secrets.ts`](apps/desktop/src/main/secrets.ts)).

## Repository layout

| Path                                               | Role                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [`apps/desktop`](apps/desktop)                     | Electron main/preload/renderer                             |
| [`packages/core-pipeline`](packages/core-pipeline) | Transcription pipeline, downloads, whisper CLI integration |
| [`packages/ipc-contract`](packages/ipc-contract)   | Shared IPC types and Zod schemas                           |
| [`packages/ui`](packages/ui)                       | Shared UI primitives                                       |

## Publishing npm packages

The root [`package.json`](package.json) keeps `"private": true` so this repo stays a **monorepo workspace**, not an npm-published root package. Workspace packages (`@mystt/*`) are also marked `private`. To publish a scoped package later, remove `"private"` only for that package and configure npm publishing separately.

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Repository metadata

If this fork lives at a different GitHub URL, update `repository`, `homepage`, and `bugs` in the root and [`apps/desktop/package.json`](apps/desktop/package.json) to match.
