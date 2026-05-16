const {
  getTransactionById,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
} = require("../services/transactionServices");
const { Transaction, TransactionType } = require("../models/Transaction");
const ManualTransaction = require("../models/ManualTransaction");


const logger = require("../utils/winstonLogger");
// Admin: Get all transactions
const getAllAddispayTransactions = async (req, res) => {
  try {
    // Extract query parameters
    const {
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Build the query object
    const query = {};

    // Filter by type if provided
    if (type) {
      const validTypes = [
        "deposit",
        "withdrawal",
        "transfer",
        "receive",
        "registration_bonus",
        "referral_bonus",
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid transaction type" });
      }
      query.type = type;
    }

    // Filter by status if provided
    if (status) {
      const validStatuses = ["PENDING", "COMPLETED", "FAILED", "CANCELED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid transaction status" });
      }
      query.status = status;
    }

    // Handle date range filtering
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
        query.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
        query.createdAt.$lte = end;
      }
    }

    // Convert page and limit to numbers and validate
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Get total count of matching transactions for pagination metadata
    const totalTransactions = await Transaction.countDocuments(query);

    // Fetch transactions with populated user details and pagination
    const transactions = await Transaction.find(query)
      .populate({
        path: "userId",
        select: "fullName phone", // Populate specific fields from Users
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Format the response
    const formattedTransactions = transactions.map((tx) => ({
      id: tx._id,
      user: {
        fullName: tx.userId?.fullName || "Unknown",
        phone: tx.userId?.phone || "N/A",
      },
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
      description: tx.description || "No description",
      createdAt: tx.createdAt,
      reference: tx.reference,
      addispayNonce: tx.addispayNonce || null,
      addispayTransactionId: tx.addispayTransactionId || null,
      metadata: tx.metadata || null,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalTransactions / limitNum);

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      totalTransactions,
      totalPages,
      currentPage: pageNum,
      transactions: formattedTransactions,
    });
  } catch (error) {
    logger.error("transactionController: error fetching transactions", { err: error });
    return res.status(500).json({ message: "Server error" });
  }
};

// User: Get their own transactions (using middleware)
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id; // User ID from middleware
    const { startDate, endDate } = req.query;
    let query = { userId };

    // Apply date filters if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch automatic and manual transactions in parallel
    const [automaticTransactions, manualTransactions] = await Promise.all([
      // Fetch automatic transactions
      Transaction.find(query)
        .select(
          "_id type amount creditedAmount bonusAmount bonusPercent status description createdAt reference addispayTransactionId addispayNonce"
        )
        .lean() // Convert to plain JavaScript objects for better performance
        .sort({ createdAt: -1 }),
      // Fetch manual transactions
      ManualTransaction.find(query)
        .select(
          "_id type amount creditedAmount bonusAmount bonusPercent description date transactionId receiptId createdAt status source paymentMethod"
        )
        .lean()
        .sort({ createdAt: -1 }),
    ]);

    // Map manual transactions to match the UI-expected structure
    const formattedManualTransactions = manualTransactions.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
      status: tx.status === "approved" ? "COMPLETED" : (tx.status || "COMPLETED"),
      description: tx.description || (tx.source === "sms" ? `SMS Deposit (${tx.paymentMethod})` : tx.description),
      reference: tx.transactionId || tx.receiptId || null,
      createdAt: tx.date || tx.createdAt, // Use date if available, fallback to createdAt
    }));

    // Combine both transaction arrays
    const allTransactions = [
      ...automaticTransactions,
      ...formattedManualTransactions,
    ];

    // Sort combined transactions by createdAt in descending order
    allTransactions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(allTransactions);
  } catch (error) {
    logger.error("transactionController: error fetching user transactions", { err: error });
    res.status(500).json({ message: "Server error" });
  }
};

const getTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await getTransactionById(transactionId);
    res.json({ transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await getAllTransactions();
    res.json({ transactions });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateTransactionDetails = async (req, res) => {
  const { transactionId } = req.params;
  const updateData = req.body;

  try {
    const transaction = await updateTransaction(transactionId, updateData);
    res.json({ transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTransactionRecord = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await deleteTransaction(transactionId);
    res.json({ message: "Transaction deleted successfully", transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const getBonusTransactions = async (req, res) => {
  try {

    const walletQuery = {
      $or: [
        {
          type: {
            $in: [
              TransactionType.REGISTRATION_BONUS,
              TransactionType.REFERRAL_BONUS,
            ],
          },
        },
        {
          type: TransactionType.DEPOSIT,
          status: "COMPLETED",
          bonusAmount: { $gt: 0 },
        },
      ],
    };

    const manualQuery = {
      $or: [
        { type: { $in: ["bonus", "referral_bonus"] } },
        { type: "deposit", bonusAmount: { $gt: 0 } },
      ],
    };

    const [walletBonusTx, manualBonusTx] = await Promise.all([
      Transaction.find(walletQuery)
        .populate("userId", "fullName phone telegramId referralCode")
        .sort({ createdAt: -1 })
        .lean(),
      ManualTransaction.find(manualQuery)
        .populate("userId", "fullName phone telegramId referralCode")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const formattedWallet = walletBonusTx.map((tx) => ({
      id: tx._id,
      source: "wallet",
      userId: tx.userId?._id || null,
      fullName: tx.userId?.fullName || "Unknown or deleted",
      phone: tx.userId?.phone || "N/A",
      telegramId: tx.userId?.telegramId || "N/A",
      referralCode: tx.userId?.referralCode || "N/A",
      bonusType: tx.type,
      amount: tx.amount,
      description: tx.description,
      reference: tx.reference,
      status: tx.status,
      createdAt: tx.createdAt,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
    }));

    const formattedManual = manualBonusTx.map((tx) => ({
      id: tx._id,
      source: tx.source || "manual",
      userId: tx.userId?._id || null,
      fullName: tx.userId?.fullName || "Unknown or deleted",
      phone: tx.userId?.phone || "N/A",
      telegramId: tx.userId?.telegramId || "N/A",
      referralCode: tx.userId?.referralCode || "N/A",
      bonusType: tx.type,
      amount: tx.amount,
      description: tx.source === 'sms' ? `SMS Deposit (${tx.paymentMethod})` : tx.description,
      reference: tx.transactionId || tx.receiptId || null,
      status: tx.status === "approved" ? "COMPLETED" : (tx.status || "COMPLETED"),
      createdAt: tx.date || tx.createdAt,
      creditedAmount: tx.creditedAmount ?? 0,
      bonusAmount: tx.bonusAmount ?? 0,
      bonusPercent: tx.bonusPercent ?? 0,
    }));

    const all = [...formattedWallet, ...formattedManual].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      message: "Bonus transactions retrieved successfully",
      transactions: all,
    });
  } catch (error) {
    logger.error("transactionController: failed to fetch bonus transactions", { err: error });
    res
      .status(500)
      .json({ message: "Server error: Failed to fetch bonus transactions" });
  }
};

module.exports = {
  getTransaction,
  getTransactions,
  updateTransactionDetails,
  deleteTransactionRecord,
  getUserTransactions,
  getAllAddispayTransactions,
  getBonusTransactions,
};
