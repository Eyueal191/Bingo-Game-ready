// server/socketController/bingoCardHandler/manualBingo.js
const { GameRoom, Reservation } = require("../../models");
const logger = require("../../utils/winstonLogger");
const { checkForWin } = require("../../utils");
const gameLifecycle = require("./gameLifecycle");

function registerManualBingoClaim(io, socket) {
  socket.on(
    "manual_bingo_claim",
    async ({ userId, cardId, roomId, cardGrid, isCrossWin}) => {
      // Use circular-safe module reference
      const { refreshRoomState, handleGameOver } = gameLifecycle;

      try {
        const gameRoom = await GameRoom.findById(roomId);
        if (!gameRoom || gameRoom.status !== "playing") {
          socket.emit("bingo_invalid", {
            message: "Game is not in playing state.",
          });
          return;
        }

        const reservation = await Reservation.findOne({
          userId,
          roomId,
          status: { $in: ["pending", "active"] },
          playMode: "manual",
        });

        if (!reservation) {
          socket.emit("bingo_invalid", {
            message: "Invalid card or reservation.",
          });
          return;
        }

        if (!reservation.cardIds.includes(cardId)) {
          socket.emit("bingo_invalid", {
            message: "Invalid card or reservation.",
          });
          return;
        }

        if (reservation.isDisqualified) {
          socket.emit("bingo_invalid", {
            message:
              reservation.disqualificationReason ||
              "You're already watching this round after an invalid claim.",
            disqualified: true,
            watcherOnly: true,
            cards: reservation.cardIds || [],
          });
          return;
        }

        const isWinner = checkForWin(cardGrid, gameRoom.drawnNumbers);
        if (!isWinner) {
          const disqualificationNotice =
            "Invalid Bingo claim. All of your cards are disqualified and you're now watching this round.";

          try {
            const activeReservations = await Reservation.find({
              userId,
              roomId,
              status: { $in: ["pending", "active"] },
            });

            const disqualifiedCardIds = [
              ...new Set(
                activeReservations.flatMap((res) => res.cardIds || [])
              ),
            ];

            if (activeReservations.length > 0) {
              const reservationIds = activeReservations.map((res) => res._id);
              await Reservation.updateMany(
                { _id: { $in: reservationIds } },
                {
                  $set: {
                    gameStatus: "lost",
                    isDisqualified: true,
                    disqualifiedAt: new Date(),
                    disqualificationReason: disqualificationNotice,
                  },
                }
              );
            }

            await refreshRoomState(io, roomId);

            socket.emit("bingo_invalid", {
              message: disqualificationNotice,
              disqualified: true,
              watcherOnly: true,
              cards: disqualifiedCardIds,
            });
          } catch (disqualificationError) {
            logger.error("Failed to disqualify invalid bingo claim", disqualificationError);
            socket.emit("bingo_invalid", {
              message: disqualificationNotice,
              disqualified: true,
              watcherOnly: true,
              cards: reservation.cardIds || [],
            });
          }
          return;
        }

        // End the game with the claiming winner
        await handleGameOver(
          io,
          roomId,
          [
            {
              userId,
              cardId,
              winningCombo: isWinner.winningCombo,
              cardGrid,
               isCrossWin,
            },
          ],
          "manual"
        );
      } catch (err) {
        logger.error("Error in manual_bingo_claim", err);
        socket.emit("error", { message: "Manual Bingo claim failed." });
      }
    }
  );
}

module.exports = {
  registerManualBingoClaim
};