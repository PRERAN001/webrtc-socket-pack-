# ByteDrop
<img width="1774" height="887" alt="image" src="https://github.com/user-attachments/assets/10aec748-56d1-4983-ac9b-41ecb5ab36bb" />


ByteDrop is a peer-to-peer file sharing application built with **Next.js**, **WebRTC**, and **Socket.IO**. Instead of routing files through a server, ByteDrop establishes a direct encrypted connection between two browsers, enabling fast and secure file transfers with minimal latency.

Socket.IO is used only for signaling—exchanging offers, answers, and ICE candidates—while the actual file transfer happens over a WebRTC DataChannel.

## Features

- Peer-to-peer file transfer
- WebRTC DataChannel communication
- Socket.IO signaling server
- Room-based connection system
- Secure SDP offer/answer negotiation
- ICE candidate exchange
- Real-time transfer progress
- Drag and drop file upload
- Simple and responsive interface
- No server-side file storage

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS

### Backend

- Node.js
- Express
- Socket.IO

### WebRTC

- RTCPeerConnection
- RTCDataChannel
- STUN Server

## How It Works

1. Two users join the same room.
2. Socket.IO establishes signaling between both peers.
3. The first peer creates an SDP offer.
4. The second peer responds with an SDP answer.
5. Both peers exchange ICE candidates.
6. A direct WebRTC connection is established.
7. A DataChannel is opened.
8. Files are transferred directly between browsers in chunks.
9. The receiver reconstructs the file and downloads it automatically.

## Project Structure

```text
app/
    page.tsx

lib/
    socket.js
    peer.js
    channel.js
    filetransfer.js

server/
    index.js
```

## Running Locally

### Clone the repository

```bash
git clone https://github.com/PRERAN001/webrtc-socket-pack-.git
```

### Install dependencies

```bash
npm install
```

### Start the signaling server

```bash
cd server
npm install
npm start
```

### Start the frontend

```bash
cd app01
npm install
npm run dev
```

## WebRTC Flow

```text
User A
   │
Join Room
   │
Create Offer
   │
Set Local Description
   │
Exchange ICE Candidates
   │
──────── Socket.IO ────────
   │
Receive Answer
   │
Set Remote Description
   │
WebRTC Connected
   │
RTCDataChannel Open
   │
Direct File Transfer
```

## Learning Objectives

This project demonstrates the complete WebRTC connection lifecycle, including:

- SDP Offer/Answer negotiation
- ICE Candidate discovery
- STUN server usage
- Signaling using Socket.IO
- RTCDataChannel communication
- Binary file transfer
- Chunked file transmission
- Peer-to-peer networking fundamentals

## Future Improvements

- Multiple file transfer
- Pause and resume transfers
- Transfer speed indicator
- Estimated time remaining
- Screen sharing
- Audio and video calls
- TURN server support
- End-to-end encrypted chat
- Multi-peer rooms

