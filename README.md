# TabCast

Stream the audio from a browser tab on your PC to your iPhone over WebRTC, with no local helper app. A browser extension captures tab audio on the PC and sends it to a static receiver page (this repo, hosted on GitHub Pages). PeerJS Cloud handles signalling.

## GitHub Pages receiver

The repository root contains the static receiver site:

- `index.html`
- `receiver.js`
- `style.css`
- `peerjs.min.js`

Once GitHub Pages is enabled (Settings → Pages → Deploy from branch → `main` / root), the receiver will be served at:

`https://adnanali287.github.io/TabCast/`

## Setup

1. **Load the browser extension on the PC.** In Chrome/Comet, open `chrome://extensions`, enable Developer mode, click *Load unpacked*, and select the `tabcast-web-complete/tabcast-peerjs/extension` folder from this repository (the folder containing `manifest.json`). The extension lives in this repo for convenience but is **not** part of the Pages site.
2. **Configure the receiver URL in the extension.** Click the TabCast extension icon, open the streamer, and paste your GitHub Pages URL (e.g. `https://adnanali287.github.io/TabCast/`). Save it.
3. **Start a cast.** Open the tab whose audio you want to hear, click the extension icon, and start tab capture. A QR code will appear.
4. **Open the receiver on iPhone.** Scan the QR code with your iPhone camera. The receiver page will open in Safari.
5. **Tap "Enable audio and connect"** on the iPhone. Audio from the PC tab will play through the iPhone.

## Repository layout

- `/` — receiver site served by GitHub Pages.
- `tabcast-web-complete/tabcast-peerjs/extension/` — unpacked browser extension source. Load this folder in the browser; do not host it.
- `tabcast-web-complete/tabcast-peerjs/receiver/` — original receiver source (kept for reference; the served copy lives at the repo root).

## Notes and limits

- PeerJS Cloud handles signalling; GitHub Pages only serves static files.
- WebRTC audio may be blocked on restrictive networks. A TURN relay (paid) is required if direct WebRTC fails.
- DRM-protected streams may not capture.
