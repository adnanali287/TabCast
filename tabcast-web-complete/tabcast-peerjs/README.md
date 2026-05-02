# TabCast Web-Hosted Version

This version avoids the local helper completely. It uses:

- A browser extension on the library PC to capture tab audio.
- A static receiver page hosted on GitHub Pages or any HTTPS static host.
- PeerJS Cloud for signalling, so there is no Node.js, `.exe`, or local server on the library PC.

## What to host on GitHub

Upload the contents of the `receiver` folder to a GitHub Pages site.

The receiver folder must contain:

- `index.html`
- `receiver.js`
- `style.css`
- `peerjs.min.js`

After GitHub Pages is enabled, your receiver URL will look like:

`https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/`

## What to load in Comet

Load the `extension` folder as an unpacked extension.

The folder selected in Comet must contain `manifest.json` directly inside it.

## Usage

1. Open the YouTube/browser tab you want to hear.
2. Click the TabCast extension icon.
3. Click “Open streamer”.
4. Paste your GitHub Pages receiver URL.
5. Click “Save receiver URL”.
6. Click “Start tab capture”.
7. Scan the QR code with your iPhone.
8. Tap “Enable audio and connect”.

## Limits

- GitHub Pages only hosts the static receiver page. PeerJS Cloud handles signalling.
- WebRTC audio is still subject to library firewall restrictions.
- If direct WebRTC is blocked by the university network, you will need a TURN relay, which is a paid/server-side component.
- DRM/protected streams may not capture correctly.

