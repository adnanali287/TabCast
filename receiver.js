const params = new URLSearchParams(window.location.search);
const senderPeerId = params.get("peer");

const signalDot = document.getElementById("signalDot");
const signalStatus = document.getElementById("signalStatus");
const streamDot = document.getElementById("streamDot");
const streamStatus = document.getElementById("streamStatus");
const remoteAudio = document.getElementById("remoteAudio");
const enableAudio = document.getElementById("enableAudio");
const reconnect = document.getElementById("reconnect");

let peer;
let conn;
let hasEnabledAudio = false;
let hasStream = false;

function setSignal(text, ok = false) {
  signalStatus.textContent = text;
  signalDot.classList.toggle("ok", ok);
}

function setStream(text, ok = false) {
  streamStatus.textContent = text;
  streamDot.classList.toggle("ok", ok);
}

function setupPeer() {
  if (peer && !peer.destroyed) return;

  if (!senderPeerId) {
    setSignal("Missing peer ID. Scan the QR code from the PC.", false);
    return;
  }

  peer = new Peer(undefined, {
    debug: 1,
    config: {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }
  });

  peer.on("open", () => {
    setSignal("Connected to signalling. Tap Enable audio and connect.", true);
  });

  peer.on("call", (call) => {
    call.answer();
    setStream("Waiting for audio call", false);
    call.on("stream", async (stream) => {
      hasStream = true;
      remoteAudio.srcObject = stream;
      setStream("Audio stream received", true);
      if (hasEnabledAudio) {
        try {
          await remoteAudio.play();
          setStream("Playing", true);
        } catch {
          setStream("Tap Enable audio again", false);
        }
      }
    });
    call.on("close", () => {
      hasStream = false;
      setStream("Audio call closed", false);
    });
  });

  peer.on("error", (error) => {
    setSignal(`Peer error: ${error.type || error.message}`, false);
  });
}

function openDataConnection() {
  if (!peer || peer.destroyed || !senderPeerId) return;
  if (conn && conn.open) {
    try {
      conn.send({ type: "receiver-ready" });
    } catch {}
    return;
  }

  conn = peer.connect(senderPeerId, { reliable: true });
  conn.on("open", () => {
    setSignal("Connected to PC streamer", true);
    if (!hasStream) setStream("Waiting for audio call", false);
    try {
      conn.send({ type: "receiver-ready" });
    } catch {}
  });
  conn.on("close", () => {
    setSignal("Disconnected. Tap Reconnect.", false);
  });
  conn.on("error", (error) => {
    setSignal(`Connection error: ${error.type || error.message}`, false);
  });
}

function startConnect() {
  setupPeer();
  if (!peer) return;

  if (peer.open) {
    openDataConnection();
  } else {
    peer.once
      ? peer.once("open", openDataConnection)
      : peer.on("open", openDataConnection);
  }
}

enableAudio.addEventListener("click", async () => {
  hasEnabledAudio = true;
  if (!peer || peer.destroyed) {
    setSignal("Connecting...", false);
    setStream("Tap Enable audio and connect", false);
  }
  startConnect();
  try {
    await remoteAudio.play();
  } catch {}
});

reconnect.addEventListener("click", () => {
  if (peer) {
    try { peer.destroy(); } catch {}
  }
  conn = undefined;
  hasStream = false;
  setSignal("Reconnecting...", false);
  setStream("Tap Enable audio and connect", false);
  startConnect();
});

setSignal("Tap Enable audio and connect", false);
setStream("Tap Enable audio and connect", false);
