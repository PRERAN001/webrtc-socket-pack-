let peer = null;

export const getPeer = () => {
  if (!peer) {
    peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });
  }

  return peer;
};