let dataChannel = null;

export const setDataChannel = (channel) => {
  dataChannel = channel;
};

export const getDataChannel = () => {
  return dataChannel;
};