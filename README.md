<img src="assets/icon.svg" width="64" height="64" alt="">

# mubi-view

A small desktop window for [MUBI](https://mubi.com) with DRM playback. It uses
[castLabs Electron](https://github.com/castlabs/electron-releases), a build of Electron that
includes Widevine, so no other browser runs in the background.

> [!NOTE]
> **Personal project, not affiliated with MUBI.** This is an unofficial wrapper around the
> mubi.com website, built for my own use. It is not endorsed by, sponsored by, or connected to
> MUBI in any way. "MUBI" is a trademark of its owner.
>
> **Not maintained for others.** I only fix problems I run into myself. Issues and pull
> requests are disabled. Feel free to fork it.

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

### Linux and macOS (untested)

The build config only targets Windows. These commands should work but haven't been tried.

**Linux.** Build on Linux. No EVS signing is needed, because Linux Widevine doesn't check
app signatures. Expect lower maximum resolution than on Windows.

```sh
npm install
SKIP_EVS=1 npx electron-builder --linux AppImage --x64 -c.linux.icon=assets/icon.png
# -> dist/Mubi-<version>.AppImage   (chmod +x it, then run)
```

**macOS.** This must be built on a Mac. EVS signing has to happen *before* Apple code signing,
and the `afterPack` hook already runs before electron-builder's signing step. Without a paid
Apple certificate, sign ad-hoc yourself afterwards:

```sh
python3 -m venv ~/evs && ~/evs/bin/pip install castlabs-evs
~/evs/bin/python -m castlabs_evs.account signup      # once

npm install
EVS_PYTHON=~/evs/bin/python npx electron-builder --mac --dir --universal \
  -c.mac.icon=assets/icon.png -c.mac.identity=null
codesign --force --deep --sign - dist/mac-universal/Mubi.app
ditto -c -k --keepParent dist/mac-universal/Mubi.app dist/Mubi-mac.zip
```

On first launch, right-click → Open to get past Gatekeeper. It isn't confirmed that Widevine
plays with an ad-hoc signature. If playback fails, the app may need a real Apple Developer ID
signature.

`npm run icon` regenerates `assets/icon.png` and `assets/icon.ico` from `assets/icon.svg`
(needs `rsvg-convert`).
