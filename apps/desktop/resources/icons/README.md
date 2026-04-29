# Icons for Electron packaging

- **`logo.png`** — MySTT brand asset (mic + speech bubble). Used for tray, window icon, and `electron-builder` Windows target.

Windows installers often prefer **`.ico`** files at multiple resolutions. For production you can convert:

```bash
# Example using ImageMagick (optional)
magick logo.png -define icon:auto-resize=256,128,64,48,32,16 logo.ico
```

Then set `"win": { "icon": "resources/icons/logo.ico" }` in `package.json` if needed.

For development, **`logo.png`** is sufficient — Electron accepts PNG for taskbar/window icons.
