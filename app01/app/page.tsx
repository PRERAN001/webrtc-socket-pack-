"use client";

import { useEffect, useState, useRef } from "react";
import { socket } from "@/lib/socket";
import { getPeer } from "@/lib/peer";
import { setDataChannel, getDataChannel } from "@/lib/channel";
import { handleIncomingData } from "../lib/filetransfer";
import { sendFile } from "../lib/filetransfer";
import { sendMessage } from "../lib/filetransfer";
import { setWritable } from "@/lib/filetransfer";
export default function Home() {
 
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [socketId, setSocketId] = useState("");
  const roomRef = useRef("");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [incomingTransfer, setIncomingTransfer] = useState<{
    name: string;
    size: number;
    mime: string;
  } | null>(null);
 
  useEffect(() => {
    const peer = getPeer();

    console.log("2. Peer Created");

    peerRef.current = peer;

    console.log("3. Connecting Socket");

    socket.connect();

    console.log("4. socket.connect() returned");

    socket.on("connect", () => {
      console.log("5. Socket Connected");
    });

    socket.on("connect", () => {
      console.log("Socket Connected:", socket.id);
      setSocketId(socket.id ?? "");
      setStatus("Connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket Disconnected");
      setSocketId("");
      setStatus("Disconnected");
    });

    socket.on("room-joined", (room) => {
      console.log("Joined Room:", room);
    });

    peer.onconnectionstatechange = () => {
      console.log("Connection:", peer.connectionState);
      setStatus(peer.connectionState);
    };

    peer.onsignalingstatechange = () => {
      console.log("Signaling:", peer.signalingState);
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE Connection:", peer.iceConnectionState);
    };

    peer.onicegatheringstatechange = () => {
      console.log("ICE Gathering:", peer.iceGatheringState);
    };

    peer.ondatachannel = (event: RTCDataChannelEvent) => {
      console.log("DataChannel Received");
      const channel = event.channel;
      setDataChannel(channel);
      channel.onopen = () => {
        console.log("DataChannel Open");
      };

      channel.onclose = () => {
        console.log("DataChannel Closed");
      };

      channel.onerror = (err: Event) => {
        console.error("DataChannel Error", err);
      };

      channel.onmessage = async (event: MessageEvent) => {
        await handleIncomingData(event, (progress: number) => {
          console.log(progress);
          setReceiveProgress(progress);
        }
        ,setIncomingTransfer
      );
      };
    };

    peer.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        console.log("ICE Gathering Complete");
        return;
      }
      console.log("ICE Candidate Found");

      socket.emit("ice-candidate", {
        roomId: roomRef.current,
        candidate: event.candidate,
      });
    };

    socket.on("ice-candidate", async (candidate) => {
      console.log("ICE Candidate Received");

      try {
        await peer.addIceCandidate(candidate);
        console.log("ICE Candidate Added");
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("user-joined", async (id) => {
      console.log("Peer Joined:", id);
      try {
        const channel = peer.createDataChannel("file-transfer");
        setDataChannel(channel);
        console.log("DataChannel Created");
        channel.onopen = () => {
          console.log("DataChannel Open");
        };
        channel.onclose = () => {
          console.log("DataChannel Closed");
        };
        channel.onerror = (err: Event) => {
          console.error(err);
        };
        channel.onmessage = async (event: MessageEvent) => {
          await handleIncomingData(event, (progress: number) => {
            console.log(progress);
            setReceiveProgress(progress);
          },setIncomingTransfer);
        };

        console.log("Creating Offer");
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        console.log("Local Description Set");
        socket.emit("offer", {
          roomId: roomRef.current,
          offer: peer.localDescription,
        });
        console.log("Offer Sent");
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("offer", async (offer) => {
      try {
        console.log("Offer Received");
        await peer.setRemoteDescription(offer);
        console.log("Remote Description Set");
        const answer = await peer.createAnswer();
        console.log("Answer Created");
        await peer.setLocalDescription(answer);
        console.log("Local Description Set");
        socket.emit("answer", {
          roomId: roomRef.current,
          answer: peer.localDescription,
        });

        console.log("Answer Sent");
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("answer", async (answer) => {
      try {
        console.log("Answer Received");
        await peer.setRemoteDescription(answer);
        console.log("Remote Description Set");
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      socket.off();
      peer.onconnectionstatechange = null;
      peer.onicecandidate = null;
      peer.oniceconnectionstatechange = null;
      peer.onicegatheringstatechange = null;
      peer.onsignalingstatechange = null;
      peer.ondatachannel = null;
      socket.disconnect();
    };
  }, []);

  const joinRoom = async () => {
    if (!roomId.trim()) return;
    roomRef.current = roomId;
    socket.emit("join-room", roomId);
    setStatus(`Joined Room: ${roomId}`);
  };

  return (
    <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex justify-center items-center p-4 sm:p-6 transition-colors duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">
            ByteDrop
          </h1>
          <p className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 mt-1 uppercase">
            WebRTC Playground
          </p>
        </div>

        {/* Room ID Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Room ID
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID..."
            className="w-full rounded-xl bg-neutral-100 border border-neutral-300 p-3 text-sm outline-none transition-all focus:border-black dark:bg-neutral-900 dark:border-neutral-800 dark:focus:border-white"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={joinRoom}
          className="w-full bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider rounded-xl p-3 text-xs hover:opacity-90 active:scale-[0.99] transition-all"
        >
          Join Room
        </button>

        {/* Connection Info Status Dashboard */}
        <div className="rounded-xl bg-neutral-100 border border-neutral-200 p-4 space-y-3 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex justify-between items-center text-xs uppercase tracking-wider">
            <span className="font-bold text-neutral-500 dark:text-neutral-400">
              Status
            </span>
            <span className="px-2.5 py-0.5 rounded-md font-bold bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              {status}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-start text-xs uppercase tracking-wider">
            <span className="font-bold text-neutral-500 dark:text-neutral-400 shrink-0 mr-4">
              Socket ID
            </span>
            <p className="font-mono text-xs lowercase break-all text-neutral-700 dark:text-neutral-300 text-right">
              {socketId || "Not Connected"}
            </p>
          </div>
        </div>

        {/* File & Message Controls */}
        <div className="space-y-3 pt-2">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <span className="font-bold text-black dark:text-white">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (!e.target.files?.length) return;
                sendFile(e.target.files[0], (progress: number) => {
                  setSendProgress(progress);
                });
              }}
            />
          </label>

          <button
            onClick={() => sendMessage("Hello from Browser A")}
            className="w-full border border-neutral-300 dark:border-neutral-800 font-bold uppercase tracking-wider rounded-xl p-3 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-[0.99] transition-all"
          >
            Send Test Message
          </button>

          {/* Progress Indicators */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <span>Send Progress</span>
              <span>{Math.round(sendProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-150"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <span>Receive Progress</span>
              <span>{Math.round(receiveProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-150"
                style={{ width: `${receiveProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {incomingTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Incoming File
              </h2>

              <p className="text-sm text-neutral-500">
                Someone wants to send you a file.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Name</span>
                <span className="font-semibold break-all">
                  {incomingTransfer.name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Size</span>

                <span className="font-semibold">
                  {(incomingTransfer.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-500 text-sm">Type</span>

                <span className="font-semibold">
                  {incomingTransfer.mime || "Unknown"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 py-3 font-bold uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-900"
                onClick={() => {
                  const channel = getDataChannel();
                  if (channel && channel.readyState === "open") {
                    channel.send(
                      JSON.stringify({
                        type: "declined",
                      })
                    );
                  }
                  setIncomingTransfer(null);
                }}
              >
                Decline
              </button>

              <button
                className="flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black py-3 font-bold uppercase tracking-wider"
                onClick={async () => {
                  const channel = getDataChannel();
                  if (!channel) return;

                  let stream = null;

                  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
                    try {
                      const handle = await (window as any).showSaveFilePicker({
                        suggestedName: incomingTransfer.name,
                      });
                      stream = await handle.createWritable();
                    } catch (err: any) {
                      console.warn("showSaveFilePicker failed or was cancelled:", err);
                      if (err.name === "AbortError") {
                        if (channel.readyState === "open") {
                          channel.send(
                            JSON.stringify({
                              type: "declined",
                            })
                          );
                        }
                        setIncomingTransfer(null);
                        return;
                      }
                    }
                  }

                  if (stream) {
                    setWritable(stream);
                  }

                  if (channel.readyState === "open") {
                    channel.send(
                      JSON.stringify({
                        type: "ready",
                      }),
                    );
                  }

                  setIncomingTransfer(null);
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
