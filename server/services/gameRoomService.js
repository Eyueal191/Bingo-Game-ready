class GameRoomService {
  constructor(GameRoomModel) {
    this.GameRoom = GameRoomModel;
  }

  async getGameRoomById(roomId) {
    return this.GameRoom.findById(roomId);
  }

  async getActiveRoomsByStake(stakeAmount) {
    return this.GameRoom.find({
      stakeAmount: parseFloat(stakeAmount),
      status: { $in: ["waiting", "starting", "playing"] },
    });
  }

  async createGameRoom(data) {
    const room = new this.GameRoom(data);
    return room.save();
  }

  // Add more methods as needed for update, delete, etc.
}

module.exports = GameRoomService; 