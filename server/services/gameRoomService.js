// gameRoomService.js
const GameRoom = require('../models/gameRoom');

async function getGameRoomById(roomId) {
  return GameRoom.findById(roomId);
}

async function getActiveRoomsByStake(stakeAmount) {
  return GameRoom.find({
    stakeAmount: parseFloat(stakeAmount),
    status: { $in: ["waiting", "starting", "playing"] },
  });
}

async function createGameRoom(data) {
  const room = new GameRoom(data);
  return room.save();
}

async function updateRoomStatus(roomId, status) {
  return GameRoom.findByIdAndUpdate(roomId, { status }, { new: true });
}

async function deleteGameRoom(roomId) {
  return GameRoom.findByIdAndDelete(roomId);
}

module.exports = {
  getGameRoomById,
  getActiveRoomsByStake,
  createGameRoom,
  updateRoomStatus,
  deleteGameRoom,
};
