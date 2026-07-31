import { getDataChannel } from "./channel";

const CHUNK_SIZE = 16 * 1024;
const MAX_BUFFER = 1024 * 1024;

let incomingFile = null;
let receivedSize = 0;

let fileHandle = null;
let writable = null;
let receivedChunks = [];

let pendingReadyResolver = null;
let pendingReadyRejecter = null;

export const setWritable = (stream) => {
  writable = stream;
};

export const sendFile = async (file, onProgress) => {
  const channel = getDataChannel();

  if (!channel) {
    console.error("No data channel available");
    return;
  }
  if (channel.readyState !== "open") {
    console.error("Data channel is not open");
    return;
  }

  channel.bufferedAmountLowThreshold = MAX_BUFFER / 2;

  // Send metadata packet to receiver
  channel.send(
    JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mime: file.type,
    }),
  );

  console.log("Metadata sent. Waiting for receiver to accept...");

  // Wait until receiver accepts ('ready') or declines ('declined')
  try {
    await new Promise((resolve, reject) => {
      pendingReadyResolver = resolve;
      pendingReadyRejecter = reject;

      // Timeout after 60s if receiver does not respond
      setTimeout(() => {
        if (pendingReadyRejecter === reject) {
          pendingReadyResolver = null;
          pendingReadyRejecter = null;
          reject(new Error("Transfer request timed out."));
        }
      }, 60000);
    });
  } catch (err) {
    console.warn("File transfer aborted:", err.message);
    onProgress(0);
    return;
  } finally {
    pendingReadyResolver = null;
    pendingReadyRejecter = null;
  }

  console.log("Receiver ready. Starting file chunk transmission...");

  let offset = 0;

  while (offset < file.size) {
    if (channel.bufferedAmount > MAX_BUFFER) {
      await new Promise((resolve) => {
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
          resolve();
        };
      });
    }

    const chunk = await file
      .slice(offset, offset + CHUNK_SIZE)
      .arrayBuffer();

    channel.send(chunk);

    offset += chunk.byteLength;

    const progress = Math.floor((offset / file.size) * 100);
    onProgress(progress);
  }

  channel.send(
    JSON.stringify({
      type: "complete",
    }),
  );

  console.log("File Sent Successfully");
};

export const handleIncomingData = async (event, onProgress, onIncomingTransfer) => {
  if (typeof event.data === "string") {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "message":
          console.log("💬", data.message);
          return;

        case "metadata":
          incomingFile = data;
          receivedSize = 0;
          receivedChunks = [];
          writable = null;
          console.log("Receiving metadata:", incomingFile.name);
          onIncomingTransfer(data);
          return;

        case "ready":
          console.log("Receiver accepted transfer signal.");
          if (pendingReadyResolver) {
            pendingReadyResolver();
          }
          return;

        case "declined":
          console.log("Receiver declined transfer signal.");
          if (pendingReadyRejecter) {
            pendingReadyRejecter(new Error("Receiver declined the file transfer."));
          }
          return;

        case "complete":
          console.log("Closing file transfer...");

          if (writable) {
            try {
              await writable.close();
              console.log("Stream file saved successfully.");
            } catch (err) {
              console.error("Error closing writable stream:", err);
            }
            writable = null;
          } else if (receivedChunks.length > 0) {
            console.log("Triggering browser download fallback...");
            const blob = new Blob(receivedChunks, {
              type: incomingFile?.mime || "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = incomingFile?.name || "downloaded-file";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            receivedChunks = [];
          }

          console.log("✅ Download Complete");

          fileHandle = null;
          incomingFile = null;
          receivedSize = 0;
          onProgress(100);
          return;
      }
    } catch (err) {
      console.error("Error handling JSON message:", err);
      return;
    }
  }

  // Binary chunk processing
  if (writable) {
    try {
      await writable.write(event.data);
    } catch (err) {
      console.error("Error writing to file stream:", err);
    }
  } else {
    receivedChunks.push(event.data);
  }

  const chunkByteLength = event.data.byteLength || event.data.size || 0;
  receivedSize += chunkByteLength;

  if (incomingFile && incomingFile.size) {
    const progress = Math.min(
      100,
      Math.floor((receivedSize / incomingFile.size) * 100)
    );
    onProgress(progress);

    console.log(`${receivedSize}/${incomingFile.size} (${progress}%)`);
  }
};

export const sendMessage = (message) => {
  const channel = getDataChannel();
  if (!channel) return;
  if (channel.readyState !== "open") return;
  channel.send(
    JSON.stringify({
      type: "message",
      message,
    }),
  );
};