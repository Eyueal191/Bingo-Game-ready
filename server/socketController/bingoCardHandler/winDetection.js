// server/socketController/bingoCardHandler/winDetection.js
const {
  StakeBonusSettings,
  Reservation,
  User,
  BingoCard
} = require("../../models");
const logger = require("../../utils/winstonLogger");
const { buildCardGrid, checkForWin } = require("../../utils");

// Gather the configured robot bias for this room and translate cards to grids.
const resolveRobotDrawOptions = async (gameRoom, gameRoomId) => {
  try {
    if (!gameRoom?.stakeAmount) return null;

    const stakeAmount = Number(gameRoom.stakeAmount);
    if (Number.isNaN(stakeAmount)) return null;

    const stakeSettings = await StakeBonusSettings.findOne({
      stakeAmount,
    })
      .select("robotEnabled robotWinningPercent")
      .lean();

    if (!stakeSettings || stakeSettings.robotEnabled === false) {
      return null;
    }

    const robotWinningPercent = Math.max(
      0,
      Math.min(100, Number(stakeSettings.robotWinningPercent ?? 0))
    );
    if (!robotWinningPercent || robotWinningPercent <= 0) {
      return null;
    }

    // Dynamic Robot Resolution: Find all active reservations, then filter by isRobot
    const activeReservations = await Reservation.find({
      roomId: gameRoomId,
      status: { $in: ["pending", "active"] },
      playMode: "auto",
    }).lean();

    if (!activeReservations.length) return null;

    const userIds = [...new Set(activeReservations.map((r) => r.userId.toString()))];
    const robotUsers = await User.find({
      _id: { $in: userIds },
      $or: [{ role: "robot" }, { isRobot: true }],
    }).select("_id").lean();

    const robotUserIds = new Set(robotUsers.map((u) => u._id.toString()));
    const robotReservations = activeReservations.filter((r) =>
      robotUserIds.has(r.userId.toString())
    );

    const robotCardIds = robotReservations.flatMap((res) => res.cardIds || []);
    if (!robotCardIds.length) {
      return null;
    }

    const uniqueRobotCardIds = Array.from(new Set(robotCardIds));

    const robotCards = await BingoCard.find({
      cardId: { $in: uniqueRobotCardIds },
    })
      .select(
        "cardId b1 i1 n1 g1 o1 b2 i2 n2 g2 o2 b3 i3 n3 g3 o3 b4 i4 n4 g4 o4 b5 i5 n5 g5 o5"
      )
      .lean();

    const robotCardGrids = robotCards
      .map(buildCardGrid)
      .filter((grid) => Array.isArray(grid));

    if (!robotCardGrids.length) {
      return null;
    }

    return {
      robotWinningPercent,
      robotCardGrids,
    };
  } catch (err) {
    console.error(
      `Failed to resolve robot draw options for room ${gameRoomId}:`,
      err
    );
    return null;
  }
};

const checkForWinners = async (gameRoomId, drawnNumbers, playMode) => {
  const reservations = await Reservation.find({
    roomId: gameRoomId,
    status: { $in: ["pending", "active"] },
    playMode: playMode,
    isDisqualified: false,
  });
  const winners = [];

  for (const reservation of reservations) {
    logger.debug("Checking reservation for winners", {
      roomId: String(gameRoomId),
      cardsCount: Array.isArray(reservation.cardIds) ? reservation.cardIds.length : 0,
      playMode,
      drawnCount: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
    });
    // Check each card, but stop after finding one winning pattern for this user
    for (const cardId of reservation.cardIds) {
      const card = await BingoCard.findOne({ cardId });
      logger.debug("Fetched bingo card", {
        roomId: String(gameRoomId),
        found: Boolean(card),
      });

      if (!card) continue;

      const cardGrid = buildCardGrid(card);
      if (!cardGrid) continue;

      const winningCard = checkForWin(cardGrid, drawnNumbers);
      if (winningCard) {
        winners.push({
          userId: reservation.userId,
          cardId,
          winningCombo: winningCard.winningCombo,
          cardGrid: cardGrid,
        });
        break; // Stop checking other cards for this user after one win
      }
    }
  }
  return winners;
}; 
const checkCrossWinPattern = (cardGrid, selectedNumbers) => {
  if (!Array.isArray(cardGrid)) {
    console.log("❌ Invalid cardGrid:", cardGrid);
    return false;
  }

  const isMarked = (val) =>
    val === "F" ||
    selectedNumbers.has(val) ||
    selectedNumbers.has(String(val));

  // ✅ N pattern
  const hasNPattern =
    isMarked(cardGrid[0][2]) &&
    isMarked(cardGrid[1][2]) &&
    cardGrid[2][2] === "F" &&
    isMarked(cardGrid[3][2]) &&
    isMarked(cardGrid[4][2]);

  // ✅ 3rd row win
  const hasThirdRowWin =
    isMarked(cardGrid[2][0]) &&
    isMarked(cardGrid[2][1]) &&
    cardGrid[2][2] === "F" &&
    isMarked(cardGrid[2][3]) &&
    isMarked(cardGrid[2][4]);

  console.log("🔍 Cross Win Check:");
  console.log("➡️ N Pattern:", hasNPattern);
  console.log("➡️ Third Row Win:", hasThirdRowWin);
  console.log("➡️ Selected Numbers:", Array.from(selectedNumbers));

  if (hasNPattern) {
    console.log("🎉 N PATTERN WIN DETECTED");
  }

  if (hasThirdRowWin) {
    console.log("🎉 THIRD ROW WIN DETECTED");
  }

  return hasNPattern || hasThirdRowWin;
};
module.exports = {
  resolveRobotDrawOptions,
  checkForWinners,
  checkCrossWinPattern,
};