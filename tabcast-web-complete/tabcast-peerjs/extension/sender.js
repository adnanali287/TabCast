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
let stream;
let audioContext;
let receiverUrl = "";
let peerId = "";

const dataConnections = new Map();
const activeCalls = new Map();

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

function callReceiver(remotePeerId) {
  if (!peer || peer.destroyed) return;
  if (!stream) {
    log(`Phone ${remotePeerId} connected. Will call after capture starts.`);
    return;
  }
  const existing = activeCalls.get(remotePeerId);
  if (existing) {
    try { existing.close(); } catch {}
  }
  const call = peer.call(remotePeerId, stream);
  if (!call) {
    log(`Could not start call to ${remotePeerId}.`, "error");
    return;
  }
  activeCalls.set(remotePeerId, call);
  call.on("close", () => {
    if (activeCalls.get(remotePeerId) === call) activeCalls.delete(remotePeerId);
  });
  call.on("error", (error) => {
    log(`Call error to ${remotePeerId}: ${error.type || error.message}`, "error");
  });
  log(`Audio call sent to ${remotePeerId}.`, "ok");
}

function callAllReceivers() {
  if (!stream) return;
  for (const [remotePeerId, conn] of dataConnections) {
    if (conn.open) callReceiver(remotePeerId);
  }
}

function setupPeer() {
  if (peer) peer.destroy();
  dataConnections.clear();
  activeCalls.clear();
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
    const remotePeerId = conn.peer;
    dataConnections.set(remotePeerId, conn);

    const handleReady = () => {
      if (stream) {
        callReceiver(remotePeerId);
      } else {
        log(`Phone ${remotePeerId} connected. Will call after capture starts.`);
      }
    };

    conn.on("open", () => {
      log(`iPhone receiver ${remotePeerId} connected.`, "ok");
      handleReady();
    });

    conn.on("data", (data) => {
      if (data && typeof data === "object" && data.type === "receiver-ready") {
        log(`Receiver ${remotePeerId} signalled ready.`, "ok");
        handleReady();
      }
    });

    conn.on("close", () => {
      dataConnections.delete(remotePeerId);
      const call = activeCalls.get(remotePeerId);
      if (call) {
        try { call.close(); } catch {}
        activeCalls.delete(remotePeerId);
      }
      log(`Receiver ${remotePeerId} disconnected.`);
    });

    conn.on("error", (error) => {
      log(`Receiver ${remotePeerId} connection error: ${error.type || error.message}`, "error");
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
    callAllReceivers();
  } catch (error) {
    log(`Capture failed: ${error.message}`, "error");
  }
}

function stopTabCapture() {
  for (const [, call] of activeCalls) {
    try { call.close(); } catch {}
  }
  activeCalls.clear();
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
