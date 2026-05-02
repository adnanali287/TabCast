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

function setSignal(text, ok = false) {
  signalStatus.textContent = text;
  signalDot.classList.toggle("ok", ok);
}

function setStream(text, ok = false) {
  streamStatus.textContent = text;
  streamDot.classList.toggle("ok", ok);
}

function connect() {
  if (!senderPeerId) {
    setSignal("Missing peer ID. Scan the QR code from the PC.", false);
    return;
  }

  if (peer) peer.destroy();
  peer = new Peer(undefined, {
    debug: 1,
    config: {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }
  });

  peer.on("open", () => {
    setSignal("Connected to signalling. Joining PC...", true);
    conn = peer.connect(senderPeerId);
    conn.on("open", () => setSignal("Connected to PC streamer", true));
  });

  peer.on("call", (call) => {
    call.answer();
    call.on("stream", async (stream) => {
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
    call.on("close", () => setStream("Audio call closed", false));
  });

  peer.on("error", (error) => {
    setSignal(`Peer error: ${error.type || error.message}`, false);
  });
}

enableAudio.addEventListener("click", async () => {
  hasEnabledAudio = true;
  if (!peer || peer.destroyed) connect();
  try {
    await remoteAudio.play();
  } catch {}
});

reconnect.addEventListener("click", connect);

connect();

