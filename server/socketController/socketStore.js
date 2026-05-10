let io = null;

const socketMap = new Map(); // userId -> socketId

const setIO = (instance) => {
  io = instance;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized yet");
  }
  return io;
};

// ✅ store socket per user
const setUserSocket = (userId, socketId) => {
  socketMap.set(userId, socketId);
};

const getUserSocket = (userId) => {
  return socketMap.get(userId);
};

const removeUserSocket = (userId) => {
  socketMap.delete(userId);
};
module.exports = {
  setIO,
  getIO,
  setUserSocket,
  getUserSocket,
  removeUserSocket,
};