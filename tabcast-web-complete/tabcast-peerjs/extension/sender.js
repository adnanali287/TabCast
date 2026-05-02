const params = new URLSearchParams(window.location.search);
const tabId = Number(params.get("tabId"));
const tabTitle = params.get("title") || "Selected tab";

const selectedTabTitle = document.getElementById("selectedTabTitle");
const receiverBaseInput = document.getElementById("receiverBase");
const saveReceiver = document.getElementById("saveReceiver");
const startCapture = document.getElementById("startCapture");
const stopCapture = document.getElementById("stopCapture");
const receiverLink = document.getElementById("receiverLink");
const qrWrap = document.getElementById("qrWrap");
const statusLog = document.getElementById("statusLog");
const monitorPc = document.getElementById("monitorPc");

let peer;
let call;
let stream;
let audioContext;
let receiverUrl = "";
let peerId = "";

selectedTabTitle.textContent = tabTitle;

function log(message, tone = "normal") {
  const item = document.createElement("li");
  item.textContent = message;
  item.className = tone;
  statusLog.prepend(item);
}

function normaliseReceiverUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const url = new URL(trimmed);
  return url.href;
}

function drawQr(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  qrWrap.className = "qr-wrap";
  qrWrap.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 1, scalable: true });
}

function saveReceiverUrl() {
  try {
    const value = normaliseReceiverUrl(receiverBaseInput.value);
    if (!value) {
      log("Paste the hosted receiver URL first.", "error");
      return false;
    }
    receiverUrl = value;
    chrome.storage?.local?.set?.({ receiverUrl });
    log("Receiver URL saved.", "ok");
    return true;
  } catch {
    log("Receiver URL is not valid. It should start with https://", "error");
    return false;
  }
}

function setupPeer() {
  if (peer) peer.destroy();
  peerId = `tabcast-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
  peer = new Peer(peerId, {
    debug: 1,
    config: {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }
  });

  peer.on("open", () => {
    const url = new URL(receiverUrl);
    url.searchParams.set("peer", peerId);
    receiverLink.href = url.href;
    receiverLink.textContent = url.href;
    drawQr(url.href);
    log("PeerJS signalling ready. Scan the QR code on iPhone.", "ok");
  });

  peer.on("connection", (conn) => {
    conn.on("open", () => {
      log("iPhone receiver connected.", "ok");
      if (stream) {
        call = peer.call(conn.peer, stream);
        log("Audio call sent to iPhone.", "ok");
      }
    });
  });

  peer.on("call", (incoming) => {
    incoming.close();
  });

  peer.on("error", (error) => {
    log(`Peer error: ${error.type || error.message}`, "error");
  });
}

function getMediaStreamId(targetTabId) {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(streamId);
    });
  });
}

async function startTabCapture() {
  if (!receiverUrl && !saveReceiverUrl()) return;

  try {
    if (!peer || peer.destroyed) setupPeer();
    const streamId = await getMediaStreamId(tabId);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    if (monitorPc.checked) {
      audioContext = new AudioContext();
      audioContext.createMediaStreamSource(stream).connect(audioContext.destination);
    }

    startCapture.disabled = true;
    stopCapture.disabled = false;
    log("Tab audio capture started. Start playback in the source tab.", "ok");
  } catch (error) {
    log(`Capture failed: ${error.message}`, "error");
  }
}

function stopTabCapture() {
  if (call) call.close();
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  startCapture.disabled = false;
  stopCapture.disabled = true;
  log("Capture stopped.");
}

saveReceiver.addEventListener("click", () => {
  if (saveReceiverUrl()) setupPeer();
});
startCapture.addEventListener("click", startTabCapture);
stopCapture.addEventListener("click", stopTabCapture);

chrome.storage?.local?.get?.("receiverUrl", (result) => {
  if (result.receiverUrl) {
    receiverBaseInput.value = result.receiverUrl;
    receiverUrl = result.receiverUrl;
    setupPeer();
  } else {
    log("Paste your GitHub Pages receiver URL.");
  }
});

