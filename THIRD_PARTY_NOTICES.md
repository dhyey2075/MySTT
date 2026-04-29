# Third-party notices

MySTT application **source code** in this repository is licensed under the MIT License — see [LICENSE](LICENSE).

Runtime components listed below are **not** necessarily MIT-licensed. When you use MySTT, third-party binaries and models may be **downloaded at first run** into your user profile (see `runtime-manifest.json`), not vendored in this repo.

## Bundled with the Electron app shell

- **Electron** (includes **Chromium**) — see packaged app `LICENSES.chromium.html` / Electron distribution notices.
- **Node.js APIs** — see Node.js license in Electron tooling.

## Downloaded at runtime (local STT)

URLs and versions are pinned in [`apps/desktop/resources/runtime-manifest.json`](apps/desktop/resources/runtime-manifest.json).

| Component                                           | Typical upstream                                                                      | Notes                                                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FFmpeg** (Windows builds via gyan.dev or similar) | [FFmpeg](https://ffmpeg.org/) — LGPL/GPL depending on build configuration             | Essentials/full builds from third-party packagers may be **GPL-impacting**. Review the packager’s license before redistributing installers that bundle FFmpeg. |
| **whisper.cpp** (`whisper-cli`, DLLs)               | [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)                       | Release artifacts follow upstream license(s) (often MIT for the project; verify per release).                                                                  |
| **GGML models** (`ggml-tiny.bin`, etc.)             | [ggerganov/whisper.cpp on Hugging Face](https://huggingface.co/ggerganov/whisper.cpp) | Models are subject to Whisper / upstream model licenses; use per your use case.                                                                                |

MySTT downloads these for **local inference only** on your machine unless you configure optional cloud features.

## npm dependencies

JavaScript/TypeScript dependencies are listed in `pnpm-lock.yaml` and each package’s own `package.json`. Their licenses can be audited with tools such as `pnpm licenses list` or `license-checker`.

## OpenAI API (optional cloud dictation)

Cloud dictation uses OpenAI’s API when you provide an API key. Use is governed by [OpenAI’s terms](https://openai.com/policies/) and your account settings; audio may leave your device for that path only.

## Disclaimer

This file is for **developer orientation** and is not legal advice. For redistribution (installers, stores, enterprise), confirm compliance with FFmpeg, whisper.cpp, model licenses, and Electron packaging obligations.
