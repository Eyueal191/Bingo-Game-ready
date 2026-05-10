const Game = require("../models/game");
const GameParticipant = require("../models/gameParticipant");
const { Transaction } = require("../models/Transaction");
const ManualTransaction = require("../models/DepositRequest");
const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const gameParticipants = await GameParticipant.find({ user_id: userId })
      .populate([
        {
          path: "game_id",
          select: "id prize_amount bet_amount status created_at",
        },
        {
          path: "user_id",
          select: "id fullName",
        },
      ])
      .sort({ created_at: -1 });

    const gameHistory = gameParticipants.map((participant) => ({
      id: participant.game_id._id,
      prize_amount: participant.game_id.prize_amount,
      bet_amount: participant.game_id.bet_amount,
      status: participant.game_id.status,
      rank: participant.rank || null,
      numbers: participant.numbers,
      created_at: participant.game_id.created_at
        ? participant.game_id.created_at.toISOString()
        : null,
    }));

    res.json(gameHistory);
  } catch (error) {
    logger.error(`Error fetching game history: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch game history" });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const [walletTx, manualTx, smsTx] = await Promise.all([
      Transaction.find({ userId })
        .select(
          "_id type amount creditedAmount bonusAmount bonusPercent status description createdAt reference addispayNonce addispayTransactionId metadata"
        )
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find({ userId })
        .select(
          "_id type amount creditedAmount bonusAmount bonusPercent description date createdAt transactionId receiptId status source paymentMethod"
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const normalizedWallet = walletTx.map((tx) => ({
      id: tx._id,
      source: "wallet",
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
      description: tx.description || null,
      reference: tx.reference || null,
      addispayNonce: tx.addispayNonce || null,
      addispayTransactionId: tx.addispayTransactionId || null,
      metadata: tx.metadata || null,
      createdAt: tx.createdAt,
    }));

    const normalizedManual = manualTx.map((tx) => ({
      id: tx._id,
      source: tx.source || "manual",
      type: tx.type === "deposit" ? "deposit" : tx.type, // normalize type if needed
      status: tx.status === "approved" ? "COMPLETED" : (tx.status || "COMPLETED"),
      amount: tx.amount,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
      description: tx.description || (tx.source === 'sms' ? `SMS Deposit (${tx.paymentMethod})` : null),
      reference: tx.transactionId || tx.receiptId || null,
      paymentMethod: tx.paymentMethod || null,
      createdAt: tx.date || tx.createdAt,
    }));

    const transactionHistory = [...normalizedWallet, ...normalizedManual].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(transactionHistory);
  } catch (error) {
    logger.error(`Error fetching transaction history: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
};

module.exports = {
  getGameHistory,
  getTransactionHistory,
};
