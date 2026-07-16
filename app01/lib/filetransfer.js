import { getDataChannel } from "./channel";

const CHUNK_SIZE = 16 * 1024;

let incomingFile = null;
let receivedBuffers = [];
let receivedSize = 0;

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

export const sendFile = async (file, onProgress) => {
  const channel = getDataChannel();

  if (!channel) return;

  if (channel.readyState !== "open") return;

  channel.send(
    JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mime: file.type,
    }),
  );

  const buffer = await file.arrayBuffer();

  let offset = 0;

  while (offset < buffer.byteLength) {
    const chunk = buffer.slice(offset, offset + CHUNK_SIZE);

    channel.send(chunk);

    offset += CHUNK_SIZE;
    const progress = Math.floor((offset / buffer.byteLength) * 100);

    onProgress(progress);
    console.log(`Sending: ${progress}%`);
  }

  channel.send(
    JSON.stringify({
      type: "complete",
    }),
  );
};

export const handleIncomingData = (event, onProgress) => {
  if (typeof event.data === "string") {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
      console.log("💬", data.message);
      return;
    }

    if (data.type === "metadata") {
      incomingFile = data;
      console.log("incomingFile",incomingFile);
      receivedBuffers = [];
      receivedSize = 0;

      console.log("Receiving:", data.name);

      return;
    }

    if (data.type === "complete") {
      const blob = new Blob(receivedBuffers, {
        type: incomingFile.mime,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = incomingFile.name;
      a.click();
      URL.revokeObjectURL(url);
      console.log("Download Complete");
      return;
    }
  }
  console.log(event.data);
  console.log(event.data.constructor.name);
  receivedBuffers.push(event.data);

  receivedSize += event.data.byteLength;
  const progress = Math.floor((receivedSize / incomingFile.size) * 100);

  onProgress(progress);

  console.log(progress + "%");

  console.log(`${receivedSize}/${incomingFile.size}`);
};
