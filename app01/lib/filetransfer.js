import { getDataChannel } from "./channel";

const CHUNK_SIZE = 16 * 1024;
const MAX_BUFFER = 1024 * 1024; 

export const sendFile = async (file, onProgress) => {
  const channel = getDataChannel();

  if (!channel) return;
  if (channel.readyState !== "open") return;

  channel.bufferedAmountLowThreshold = MAX_BUFFER / 2;

  channel.send(
    JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mime: file.type,
    }),
  );

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

  console.log("File Sent");
};


let incomingFile = null;
let receivedSize = 0;

let fileHandle = null;
let writable = null;

export const handleIncomingData = async (event, onProgress) => {
 
  if (typeof event.data === "string") {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "message":
        console.log("💬", data.message);
        return;

      case "metadata":
        incomingFile = data;
        receivedSize = 0;

        console.log("Receiving:", incomingFile.name);

        
        fileHandle = await window.showSaveFilePicker({
          suggestedName: incomingFile.name,
          types: [
            {
              description: incomingFile.mime,
              accept: {
                [incomingFile.mime]: [
                  "." + incomingFile.name.split(".").pop(),
                ],
              },
            },
          ],
        });

        
        writable = await fileHandle.createWritable();

        console.log("Ready to receive.");

        return;

      case "complete":
        console.log("Closing file...");

        await writable.close();

        console.log("✅ Download Complete");

        writable = null;
        fileHandle = null;
        incomingFile = null;
        receivedSize = 0;

        return;
    }
  }

  // Binary chunk

  if (!writable) {
    console.error("No writable stream.");
    return;
  }

  await writable.write(event.data);

  receivedSize += event.data.byteLength;

  const progress = Math.floor(
    (receivedSize / incomingFile.size) * 100
  );

  onProgress(progress);

  console.log(
    `${receivedSize}/${incomingFile.size} (${progress}%)`
  );
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