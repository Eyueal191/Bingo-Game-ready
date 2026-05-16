const Withdrawal = require("../models/Withdrawal");
const User = require("../models/userModels");
const ManualTransaction = require("../models/ManualTransaction");
const Reservation = require("../models/reservationModel");
const { NotifyUserTelegram } = require("../botController/notification");
const { getAppSettings } = require("../services/appSettingsService");
const logger = require("../utils/winstonLogger");
const {
  Transaction: AddisTransaction,
  TransactionType,
  TransactionStatus,
} = require("../models/Transaction");

const safeText = (v) => String(v ?? "").trim();

exports.submitWithdrawalRequest = async (req, res) => {
  const { amount, method, accountNumber } = req.body;
  const { walletRules } = await getAppSettings();
  const minWithdrawal = Number(walletRules?.minWithdrawalAmount) || 100;
  const minBalance = Number(walletRules?.minBalanceAfterWithdrawal) || 10;
  const minWins = Number(walletRules?.minWinsForWithdrawal) || 0;
  const minDeposits = Number(walletRules?.minDepositsForWithdrawal) || 0;

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < minWithdrawal) {
    return res.status(400).json({
      message: `Invalid amount (minimum withdrawal amount is ${minWithdrawal} ETB)`,
    });
  }
  if (!method || !accountNumber) {
    return res.status(400).json({
      message:
        "Invalid withdrawal details (method and account number are required)",
    });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: "User not found, please register first with //register",
      });
    }
    if (user.wallet < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    if (minDeposits > 0) {
      const [manualDepositCount, addisPayDepositCount, smsDepositCount] =
        await Promise.all([
          // Manual entries (no status field, type === 'deposit')
          ManualTransaction.countDocuments({
            userId: user._id,
            type: "deposit",
          }),
          // AddisPay entries (only count COMPLETED deposits)
          AddisTransaction.countDocuments({
            userId: user._id,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.COMPLETED,
          }),
          // SMS entries (only count COMPLETED deposits, now in ManualTransaction with source: sms)
          ManualTransaction.countDocuments({
            userId: user._id,
            source: "sms",
            status: "approved", // or { $in: ["approved", "Approved"] }
          }),
        ]);
      const depositCount =
        Number(manualDepositCount || 0) +
        Number(addisPayDepositCount || 0) +
        Number(smsDepositCount || 0);

      if (depositCount < minDeposits) {
        return res.status(400).json({
          message: `You must have deposited at least ${minDeposits} time${minDeposits === 1 ? "" : "s"} to withdraw`,
        });
      }
    }

    if (minWins > 0) {
      const winCount = await Reservation.countDocuments({
        userId: user._id,
        gameStatus: "won",
        status: "completed",
      });
      if (winCount < minWins) {
        return res.status(400).json({
          message: `You must have at least ${minWins} game win${minWins === 1 ? "" : "s"} to withdraw`,
        });
      }
    }

    // Check if wallet balance after withdrawal is >= 10 ETB
    const remainingBalance = user.wallet - parsedAmount;
    if (remainingBalance < minBalance) {
      return res.status(400).json({
        message: `Wallet balance after withdrawal must be at least ${minBalance} ETB`,
      });
    }

    const withdrawal = new Withdrawal({
      userId: req.user._id,
      amount: parsedAmount,
      method,
      accountNumber,
    });

    await withdrawal.save();
    res.status(201).json({
      message: `${parsedAmount} ETB Withdrawal request submitted successfully, you will get received soon`,
    });
  } catch (error) {
    logger.error("withdrawalController: withdrawal submission error", { err: error });
    res.status(500).json({ message: "Failed to submit withdrawal request" });
  }
};

exports.getWithdrawalRequests = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      page,
      pageSize,
      q,
      status,
      method,
      minAmount,
      maxAmount,
      sortField,
      sortOrder,
    } = req.query;

    const hasPaging = page !== undefined || pageSize !== undefined;
    const parsedPage = Math.max(0, Number(page ?? 0) || 0);
    const parsedPageSize = Math.min(100, Math.max(1, Number(pageSize ?? 10) || 10));

    const safeText = (v) => String(v ?? "").trim();
    const queryText = safeText(q);
    const parseNullableNumber = (val) => {
      if (val === undefined || val === null) return null;
      const txt = safeText(val);
      if (txt === "") return null;
      const num = Number(txt);
      return Number.isFinite(num) ? num : NaN;
    };

    const parsedMin = parseNullableNumber(minAmount);
    const parsedMax = parseNullableNumber(maxAmount);

    // Build query object
    const query = {};
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
        if (safeText(startDate).length <= 10) {
          start.setHours(0, 0, 0, 0);
        }
        query.submittedAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
        if (safeText(endDate).length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        query.submittedAt.$lte = end;
      }
    }

    const parseMulti = (value) => {
      const txt = safeText(value);
      if (!txt) return null;
      const items = txt
        .split(",")
        .map((v) => safeText(v))
        .filter(Boolean);
      if (!items.length) return null;
      return items.length === 1 ? items[0] : items;
    };

    const statusFilter = parseMulti(status);
    if (statusFilter) {
      query.status = Array.isArray(statusFilter)
        ? { $in: statusFilter }
        : statusFilter;
    }

    const methodFilter = parseMulti(method);
    if (methodFilter) {
      query.method = Array.isArray(methodFilter)
        ? { $in: methodFilter }
        : methodFilter;
    }

    if (minAmount !== undefined && minAmount !== "" && !Number.isFinite(parsedMin)) {
      return res.status(400).json({ message: "Invalid minAmount" });
    }
    if (maxAmount !== undefined && maxAmount !== "" && !Number.isFinite(parsedMax)) {
      return res.status(400).json({ message: "Invalid maxAmount" });
    }

    if (Number.isFinite(parsedMin) || Number.isFinite(parsedMax)) {
      query.amount = {};
      if (Number.isFinite(parsedMin)) query.amount.$gte = parsedMin;
      if (Number.isFinite(parsedMax)) query.amount.$lte = parsedMax;
    }

    if (queryText) {
      const userMatches = await User.find({
        $or: [
          { fullName: { $regex: queryText, $options: "i" } },
          { telegramId: { $regex: queryText, $options: "i" } },
          { phone: { $regex: queryText, $options: "i" } },
        ],
      })
        .select("_id")
        .limit(5000)
        .lean();

      const userIds = userMatches.map((u) => u._id);
      const or = [
        { accountNumber: { $regex: queryText, $options: "i" } },
        { method: { $regex: queryText, $options: "i" } },
        { status: { $regex: queryText, $options: "i" } },
      ];

      const numericQ = Number(queryText);
      if (Number.isFinite(numericQ)) {
        or.push({ amount: numericQ });
      }
      if (userIds.length) {
        or.push({ userId: { $in: userIds } });
      }
      query.$or = or;
    }

    const sort = {};
    const order = safeText(sortOrder).toLowerCase() === "asc" ? 1 : -1;
    const field = safeText(sortField);
    const allowedSortFields = [
      "submittedAt",
      "amount",
      "status",
      "method",
      "createdAt",
      "updatedAt",
    ];
    if (allowedSortFields.includes(field)) {
      sort[field] = order;
    } else {
      sort.submittedAt = -1;
    }

    if (hasPaging) {
      const [rowCount, withdrawals] = await Promise.all([
        Withdrawal.countDocuments(query),
        Withdrawal.find(query)
          .populate("userId", "telegramId fullName phone wallet")
          .sort(sort)
          .skip(parsedPage * parsedPageSize)
          .limit(parsedPageSize)
          .lean(),
      ]);

      return res.status(200).json({ rows: withdrawals, rowCount });
    }

    const withdrawals = await Withdrawal.find(query)
      .populate("userId", "telegramId fullName phone wallet")
      .sort(sort)
      .lean();
    return res.status(200).json(withdrawals);
  } catch (error) {
    logger.error("withdrawalController: fetch withdrawals error", { err: error });
    res.status(500).json({ message: "Failed to fetch withdrawal requests" });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  const { withdrawalId, reason } = req.body;

  if (!withdrawalId) {
    return res.status(400).json({ message: "Invalid withdrawalId" });
  }

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate(
      "userId",
      "telegramId"
    );

    if (!withdrawal || withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Invalid or already processed withdrawal request" });
    }

    withdrawal.status = "rejected";
    await withdrawal.save();

    const telegramId = withdrawal?.userId?.telegramId;
    if (telegramId && !telegramId.startsWith("web_")) {
      const trimmedReason = safeText(reason);
      const baseMsg = `Your withdrawal request of ${withdrawal.amount} Birr has been rejected.`;
      const message = trimmedReason
        ? `${baseMsg} Reason: ${trimmedReason}`
        : baseMsg;
      await NotifyUserTelegram(telegramId, message);
    }

    return res.status(200).json({ message: "Withdrawal rejected successfully" });
  } catch (error) {
    logger.error("withdrawalController: withdrawal rejection error", { err: error });
    return res.status(500).json({ message: "Failed to reject withdrawal" });
  }
};

exports.deleteWithdrawal = async (req, res) => {
  const { withdrawalId } = req.params;

  if (!withdrawalId) {
    return res.status(400).json({ message: "Invalid withdrawalId" });
  }

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }
    if (withdrawal.status === "approved") {
      return res.status(400).json({
        message: "Approved withdrawals cannot be deleted",
      });
    }

    await Withdrawal.findByIdAndDelete(withdrawalId);
    return res.status(200).json({ message: "Withdrawal deleted successfully" });
  } catch (error) {
    logger.error("withdrawalController: withdrawal deletion error", { err: error });
    return res.status(500).json({ message: "Failed to delete withdrawal" });
  }
};

exports.approveWithdrawal = async (req, res) => {
  const { telegramId, withdrawalId, amount } = req.body;

  const parsedAmount = Number(amount);

  if (!telegramId || !withdrawalId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res
      .status(400)
      .json({ message: "Invalid telegramId, withdrawalId, or amount" });
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Invalid or already processed withdrawal request" });
    }
    if (Number(withdrawal.amount) !== parsedAmount) {
      return res.status(400).json({ message: "Amount mismatch" });
    }
    if (user.wallet < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.wallet -= parsedAmount;
    const transaction = new ManualTransaction({
      userId: user._id,
      type: "Withdrawal", // Matches your enum
      amount: parsedAmount,
      description: "Admin approved withdrawal",
    });

    withdrawal.status = "approved";
    await Promise.all([user.save(), transaction.save(), withdrawal.save()]);

    // Emit wallet update via Socket.IO
    req.io
      .to(user._id.toString())
      .emit("walletUpdate", { wallet: user.wallet, bonus: user.bonus });

    if (telegramId && user.role !== "robot" && !telegramId.startsWith("web_")) {
      const message = `Your withdrawal of ${parsedAmount} has been approved! New wallet balance: ${user.wallet}`;
      await NotifyUserTelegram(telegramId, message);
    }
    res.status(200).json({
      message: "Withdrawal approved successfully",
      wallet: user.wallet,
    });
  } catch (error) {
    logger.error("withdrawalController: withdrawal approval error", { err: error });
    res.status(500).json({ message: "Failed to approve withdrawal" });
  }
};