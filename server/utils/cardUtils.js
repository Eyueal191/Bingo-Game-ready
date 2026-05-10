const {Reservation, BingoCard, GameRoom} = require("../models");
const logger = require("./winstonLogger");

const fetchCardStatuses = async (roomId) => {
  try {
    const gameRoom = await GameRoom.findById(roomId);
    if (!gameRoom || gameRoom.status === "playing" || gameRoom.status === "completed") {
      logger.debug("Room not available for card statuses", {
        roomId: String(roomId),
        status: gameRoom?.status || "not found",
      });
      return { cardsWithStatus: [], stakeAmount: gameRoom?.stakeAmount || 0 };
    }

    const reservations = await Reservation.find({ roomId, status: "active" });
    const reservedCardIds = new Set(reservations.flatMap((r) => r.cardIds));
    const cards = await BingoCard.find();
    const stakeAmount = gameRoom.stakeAmount;

    const reservationMap = new Map();
    const duplicateCards = [];

    reservations.forEach((r) => {
      r.cardIds.forEach((cardId) => {
        if (reservationMap.has(cardId)) {
          duplicateCards.push({
            cardId,
            firstReservation: reservationMap.get(cardId),
            duplicateReservation: r._id.toString()
          });
          logger.warn(`Duplicate reservation detected for card ${cardId}`, {
            roomId: String(roomId),
            firstReservation: reservationMap.get(cardId),
            duplicateReservation: r._id.toString(),
          });
        }
        reservationMap.set(cardId, r.userId.toString());
      });
    });

    // Log summary for debugging win amount issues
    if (duplicateCards.length > 0) {
      logger.error(`Room ${roomId} has ${duplicateCards.length} duplicate card reservations`, {
        uniqueCards: reservedCardIds.size,
        rawTotal: reservations.reduce((s, r) => s + r.cardIds.length, 0),
        duplicates: duplicateCards.slice(0, 5), // Log first 5 duplicates
      });
    }

    const cardsWithStatus = cards
      .map((card) => ({
        cardId: card.cardId,
        isReserved: reservedCardIds.has(card.cardId),
        reservedBy: reservedCardIds.has(card.cardId)
          ? reservationMap.get(card.cardId) || null
          : null,
      }))
      .sort((a, b) => a.cardId.localeCompare(b.cardId));

    return {
      cardsWithStatus,
      stakeAmount,
    };
  } catch (error) {
    logger.error(`Error in fetchCardStatuses for room ${roomId}`, error);
    return { cardsWithStatus: [], stakeAmount: 0 };
  }
};

const fetchReservedCardIds = async (roomId) => {
  try {
    const reservations = await Reservation.find({ roomId, status: "active" });
    return [...new Set(reservations.flatMap((r) => r.cardIds))];
  } catch (error) {
    logger.error(`Error fetching reserved cardIds for room ${roomId}`, error);
    return [];
  }
};

module.exports = {
  fetchCardStatuses,
  fetchReservedCardIds,
};