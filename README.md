<img src="assets/icon.svg" width="64" height="64" alt="">

# mubi-view

A small desktop window for [MUBI](https://mubi.com) with DRM playback. It uses
[castLabs Electron](https://github.com/castlabs/electron-releases), a build of Electron that
includes Widevine, so no other browser runs in the background.

## Use

| Key | Action |
| --- | --- |
| F11 / Esc | Toggle / leave fullscreen |
| F5, Ctrl+R | Reload |
| Alt+← / Alt+→ | Back / forward |
| Alt+Home | MUBI home page |
| Ctrl + / − / 0 | Zoom in / out / reset |
| Ctrl+Shift+I | Developer tools |

Links that leave MUBI open in your default browser. To restyle the site, put CSS in
`%APPDATA%\Mubi\custom.css`. It is applied on every page load.

## Build (on Linux, no Wine needed)

You need Node 22+ and Python 3.8+. On Windows the app must be signed with castLabs' free
EVS service, otherwise Widevine refuses to issue licenses.

```sh
python3 -m venv /opt/evs && /opt/evs/bin/pip install castlabs-evs
/opt/evs/bin/python -m castlabs_evs.account signup   # once; later: ... account reauth

npm install
EVS_PYTHON=/opt/evs/bin/python npm run dist          # -> dist/Mubi-<version>-win.zip
```

Unzip it anywhere on Windows and run `Mubi.exe`. `SKIP_EVS=1 npm run dist` builds without
signing (useful only for testing the packaging).

`npm run icon` regenerates `assets/icon.png` and `assets/icon.ico` from `assets/icon.svg`
(needs `rsvg-convert`).
