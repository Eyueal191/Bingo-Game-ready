const { Server } = require("socket.io");
const { corsOptions } = require("../utils");
const logger = require("../utils/winstonLogger");
const {
  setIO,
  getIO,
  setUserSocket,
} = require("../socketController/socketStore.js");

const {
  initializeCounters,
  closeCounterChangeStreams,
} = require("./countHandler");

const { initializeLudoSocket, closeLudoChangeStreams } = require("./ludoSocket");
const { initializeBingoSocket } = require("./bingoSocket");

let closeBingoStreams = null;

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  // ✅ use setIO here
  setIO(io);

  io.on("connection", (socket) => {
    logger.info(`A user connected: ${socket.id}`);

    const userId =
      socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (userId && userId !== "pending") {
      socket.join(userId.toString());
      logger.debug(`Socket ${socket.id} joined personal room: ${userId}`);

      // ✅ store socket mapping
      setUserSocket(userId.toString(), socket.id);
    }

    socket.on("update_user_room", (newUserId) => {
      if (newUserId) {
        socket.join(newUserId.toString());
        logger.debug(
          `Socket ${socket.id} joined personal room via update: ${newUserId}`
        );

        // ✅ update mapping
        setUserSocket(newUserId.toString(), socket.id);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`A user disconnected: ${socket.id}`);
    });
  });

  initializeCounters(io);
  closeBingoStreams = initializeBingoSocket(io);
  initializeLudoSocket(io);

  io.on("connect_error", (err) => {
    logger.error("Socket.IO connection error", { error: err?.message });
  });

  return io;
};

const closeAllChangeStreams = async () => {
  const tasks = [];
  if (typeof closeBingoStreams === "function") tasks.push(closeBingoStreams());
  tasks.push(closeCounterChangeStreams());
  tasks.push(closeLudoChangeStreams());
  await Promise.allSettled(tasks);
};

module.exports = { initializeSocket, closeAllChangeStreams };