Place `ffmpeg` and `whisper.cpp` binaries here per OS folder layout decided during integration.

Bundled installers copy this tree via electron-builder `extraResources` → `resources/bin` inside the app (SPEC §9.4).

Do **not** commit proprietary binaries here unless licensing permits redistribution.
