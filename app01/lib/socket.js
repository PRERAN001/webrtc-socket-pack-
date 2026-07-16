import { io } from "socket.io-client";

export const socket = io("https://webrtc-socket-pack.onrender.com", {
  autoConnect: false,
});
