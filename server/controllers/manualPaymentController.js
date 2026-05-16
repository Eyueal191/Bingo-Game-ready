const Receipt = require('../models/Receipt');
const User = require('../models/userModels');
const Transaction = require('../models/ManualTransaction');
const Reservation = require('../models/reservationModel');
const { NotifyUserTelegram } = require('../botController/notification');
const mongoose = require('mongoose');
const {
  findProcessedDepositTransaction,
  buildDuplicateDepositMessage,
} = require('../services/depositTransactionGuard');
const { getAppSettings } = require("../services/appSettingsService");
const { computeDepositBonus } = require("../utils/depositBonus");
const AdminSetting = require("../models/adminSetting");
const {
  awardReferralBonusForFirstDeposit,
  hasCompletedDepositBefore,
} = require("../services/referralBonusService");
const logger = require("../utils/winstonLogger");
  const fs = require("fs");
  const path = require("path");

exports.submitReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No receipt file uploaded, please upload one' });
    }

    const receiptFilePath = req.file.path;

    const receipt = new Receipt({
      userId: req.user._id,
      fileUrl: receiptFilePath,
    });

    await receipt.save();
    res
      .status(201)
      .json({ message: 'Receipt submitted successfully', receipt });
  } catch (error) {
    logger.error('manualPaymentController: receipt upload error', { err: error });
    res.status(500).json({ message: 'Failed to submit receipt' });
  }
};

exports.submitReceiptTelegram = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No receipt file uploaded, please upload one' });
    }
    const { telegramId } = req.params;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const receiptFilePath = req.file.path;

    const receipt = new Receipt({
      userId: user._id,
      fileUrl: receiptFilePath,
    });

    await receipt.save();
    res
      .status(201)
      .json({ message: 'Receipt submitted successfully', receipt });
  } catch (error) {
    logger.error('manualPaymentController: receipt upload error (telegram)', { err: error });
    res.status(500).json({ message: 'Failed to submit receipt' });
  }
};

exports.getReceipts = async (req, res) => {
  try {
    const { startDate, endDate, search, page = 1, limit = 10 } = req.query;

    // Build query object
    const query = {};
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline for efficient searching and pagination
    const pipeline = [
      // Initial match for date filtering
      { $match: query },
      // Lookup user information
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Filter out receipts with null userId
      { $match: { user: { $ne: null } } },
    ];

    // Add search filtering if search term is provided
    if (search && search.trim()) {
      // Function to escape regex special characters
      const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };
      const escapedSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(escapedSearch, "i");
      const searchConditions = [
        { "user.fullName": searchRegex },
        { "user.phone": searchRegex },
        { status: searchRegex },
      ];

      // Add ObjectId search if the search term looks like an ObjectId
      if (mongoose.Types.ObjectId.isValid(search.trim())) {
        searchConditions.push({ _id: mongoose.Types.ObjectId(search.trim()) });
      }

      pipeline.push({
        $match: {
          $or: searchConditions,
        },
      });
    }

    // Add sorting
    pipeline.push({ $sort: { submittedAt: -1 } });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const [countResult] = await Receipt.aggregate(countPipeline);
    const totalCount = countResult?.total || 0;

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limitNum });

    // Add projection
    pipeline.push({
      $project: {
        _id: 1,
        userId: {
          _id: "$user._id",
          fullName: "$user.fullName",
          phone: "$user.phone",
          wallet: "$user.wallet",
          telegramId: "$user.telegramId",
        },
        fileUrl: 1,
        status: 1,
        submittedAt: 1,
      },
    });

    // Execute aggregation
    const receipts = await Receipt.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);

    // Return paginated response
    res.status(200).json({
      success: true,
      data: receipts,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    });
  } catch (error) {
    logger.error('manualPaymentController: fetch receipts error', { err: error });
    res.status(500).json({ message: "Failed to fetch receipts" });
  }
};

// Reject a receipt (mark as rejected)
exports.rejectReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id).populate("userId", "telegramId");
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });
    if (receipt.status === "approved") {
      return res
        .status(400)
        .json({ message: "Approved receipts cannot be rejected" });
    }
    receipt.status = "rejected";
    await receipt.save();
    return res.status(200).json({ message: "Receipt rejected successfully" });
  } catch (error) {
    logger.error('manualPaymentController: reject receipt error', { err: error });
    return res.status(500).json({ message: "Failed to reject receipt" });
  }
};

// Delete a receipt (allowed for pending or rejected). Does not reverse any deposits.
exports.deleteReceipt = async (req, res) => {

  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id);
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });
    if (receipt.status === "approved") {
      return res
        .status(400)
        .json({ message: "Approved receipts cannot be deleted" });
    }

    // Attempt to remove file
    if (receipt.fileUrl) {
      const filePath = path.isAbsolute(receipt.fileUrl)
        ? receipt.fileUrl
        : path.join(process.cwd(), receipt.fileUrl);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        // Log and continue with deletion
        logger.warn('manualPaymentController: failed to delete receipt file', {
          err: e,
        });
      }
    }

    await receipt.deleteOne();
    return res.status(200).json({ message: "Receipt deleted successfully" });
  } catch (error) {
    logger.error('manualPaymentController: delete receipt error', { err: error });
    return res.status(500).json({ message: "Failed to delete receipt" });
  }
};

exports.depositToWallet = async (req, res) => {
  const { telegramId, amount, receiptId, transactionId } = req.body;

  const parsedAmount = Number(amount);

  if (!receiptId) {
    return res.status(400).json({ message: 'Invalid receiptId' });
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res
      .status(400)
      .json({ message: 'Invalid amount (amount should number >= 0)' });
  }
  if (!telegramId) {
    return res.status(400).json({ message: 'Invalid telegramId' });
  }
  if (!transactionId) {
    return res.status(400).json({ message: 'Invalid transactionId' });
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Needed for referral bonus: determine if this is the user's first completed deposit
    const alreadyDepositedBefore = await hasCompletedDepositBefore(user._id);

    const receipt = await Receipt.findById(receiptId);
    if (!receipt || receipt.status !== 'pending') {
      return res
        .status(400)
        .json({ message: 'Invalid or already processed receipt' });
    }

    // Check if this transaction has already been approved via any deposit flow
    const duplicateTransaction = await findProcessedDepositTransaction(transactionId);
    if (duplicateTransaction) {
      return res.status(400).json({
        message:
          buildDuplicateDepositMessage(duplicateTransaction) ||
          'Transaction already processed',
        duplicateSource: duplicateTransaction.source,
      });
    }

    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: parsedAmount,
      description: 'Admin deposit from receipt',
      receiptId,
      transactionId,
    });
    const { depositBonus } = await getAppSettings();
    const { bonusAmount, creditedAmount, percentApplied } = computeDepositBonus(
      parsedAmount,
      depositBonus
    );

    transaction.creditedAmount = creditedAmount;
    transaction.bonusAmount = bonusAmount;
    transaction.bonusPercent = percentApplied;
    // Base deposit amount goes to wallet (real money)
    user.wallet = (Number(user.wallet) || 0) + parsedAmount;
    // Deposit bonus goes to bonus (play-only balance)
    if (bonusAmount > 0) {
      user.bonus = (Number(user.bonus) || 0) + bonusAmount;
    }

    receipt.status = 'approved';
    await Promise.all([
      user.save(),
      transaction.save(),
      receipt.save(),
    ]);

    // Award referral bonus (first-deposit based, settings-driven)
    const referralResult = await awardReferralBonusForFirstDeposit(user, {
      hasCompletedDepositBefore: alreadyDepositedBefore,
      depositAmount: creditedAmount,
    });

    // Emit wallet update via Socket.IO
    req.io
      .to(user._id.toString())
      .emit('walletUpdate', { wallet: user.wallet, bonus: user.bonus });
    if (referralResult?.inviter?._id) {
      req.io
        .to(referralResult.inviter._id.toString())
        .emit('walletUpdate', { wallet: referralResult.inviter.wallet, bonus: referralResult.inviter.bonus });
    }

    if (telegramId && user.role !== "robot" && !telegramId.startsWith("web_")) {
      const bonusText = bonusAmount > 0 ? ` (+${bonusAmount} ETB bonus)` : "";
      const userMessage = `Your deposit of ${parsedAmount}${bonusText} has been approved! New wallet balance: ${user.wallet}`;
      await NotifyUserTelegram(telegramId, userMessage);
    }
    res
      .status(200)
      .json({ message: 'Deposit successful', wallet: user.wallet });
  } catch (error) {
    logger.error('manualPaymentController: deposit error', { err: error });
    res.status(500).json({ message: 'Failed to deposit amount' });
  }
};

// Helper function to calculate if a date is within 30 days
const isWithin30Days = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= 30;
};

// Controller to get referral data
exports.getReferralData = async (req, res) => {
  try {
    // Assuming the authenticated user's ID is available in req.user (e.g., from a middleware like JWT)
    const userId = req.user._id; // Adjust based on your auth middleware

    // Fetch the current user to get their referralCode
    const currentUser = await User.findById(userId).select('referralCode');
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const referralCode = currentUser.referralCode;

    // Find all users invited by this user (where invitedBy matches referralCode)
    const invitedUsers = await User.find({ invitedBy: referralCode })
      .select('fullName phone createdAt')
      .lean();

    // Initialize referral stats
    let totalInvites = invitedUsers.length;
    let activeInvites = 0;
    let pendingInvites = 0;
    let totalEarnings = 0;
    const recentReferrals = [];

    const settings = await AdminSetting.getSettings();
    const referralEnabled = Boolean(settings?.isReferralBonusEnabled);
    const referralPercent = referralEnabled ? Number(settings?.referralBonus) || 0 : 0;

    // Process each invited user
    for (const invitedUser of invitedUsers) {
      const userJoinedDate = invitedUser.createdAt;
      const isActivePeriod = isWithin30Days(userJoinedDate);

      // Get the first deposit transaction for this user
      const firstDeposit = await Transaction.findOne({
        userId: invitedUser._id,
        type: 'deposit',
      }).sort({ date: 1 }); // Oldest deposit first

      let earnings = 0;
      let status = 'pending';

      // Calculate earnings from first deposit (1%)
      if (firstDeposit) {
        earnings += (firstDeposit.amount * referralPercent) / 100;
        status = 'active'; // If they deposited, consider them active
        activeInvites++;
      } else {
        pendingInvites++;
      }

      totalEarnings += earnings;

      // Format username as "firstName (****lastFourDigits)"
      const firstName = invitedUser.fullName
        ? invitedUser.fullName.split(' ')[0]
        : 'Unknown';
      const phoneLastFour = invitedUser.phone.slice(-4);
      const maskedPhone = `****${phoneLastFour}`;
      const username = `${firstName} (${maskedPhone})`;

      // Add to recentReferrals
      recentReferrals.push({
        id: invitedUser._id,
        username,
        date: userJoinedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        status,
        earnings: earnings.toFixed(2), // Round to 2 decimal places
      });
    }

    // Sort recentReferrals by date (most recent first) and limit to 5
    const sortedRecentReferrals = recentReferrals
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    // Construct the response
    const referralData = {
      totalInvites,
      activeInvites,
      pendingInvites,
      totalEarnings: totalEarnings.toFixed(2), // Round to 2 decimal places
      recentReferrals: sortedRecentReferrals,
    };

    return res.status(200).json(referralData);
  } catch (error) {
    logger.error('manualPaymentController: error fetching referral data', { err: error });
    return res.status(500).json({ message: 'Server error' });
  }
};

// Controller to get transactions for admins with optional filters
exports.getAdminTransactions = async (req, res) => {
  try {
    const {
      source,
      type,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      q,
      search,
      minAmount,
      maxAmount,
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const allowedSources = ["manual", "sms", "admin", "system"];
    const allowedTypes = ["deposit", "transfer", "withdrawal", "bonus", "referral_bonus"];
    const allowedMethods = ["CBE", "Telebirr", "Abyssinia", "CBEBirr", "Dashen"];
    const allowedSortFields = {
      createdAt: "createdAt",
      amount: "amount",
      creditedAmount: "creditedAmount",
      bonusAmount: "bonusAmount",
      bonusPercent: "bonusPercent",
      type: "typeNorm",
      status: "statusNorm",
      source: "source",
      paymentMethod: "paymentMethod",
      reference: "transactionId",
      userFullName: "user.fullName",
      userPhone: "userPhoneStr",
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (!Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }
    const skip = (pageNum - 1) * limitNum;

    if (source && !allowedSources.includes(String(source))) {
      return res.status(400).json({ message: "Invalid source" });
    }
    if (paymentMethod && !allowedMethods.includes(String(paymentMethod))) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const requestedType = type ? String(type).toLowerCase() : "";
    if (requestedType && !allowedTypes.includes(requestedType)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    const requestedStatusRaw = status ? String(status).toLowerCase() : "";
    const statusMap = {
      pending: "pending",
      approved: "approved",
      rejected: "rejected",
      completed: "approved",
      failed: "rejected",
      canceled: "rejected",
      cancelled: "rejected",
    };
    const requestedStatus = requestedStatusRaw ? statusMap[requestedStatusRaw] : "";
    if (requestedStatusRaw && !requestedStatus) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const baseMatch = {};
    if (source) baseMatch.source = String(source);
    if (paymentMethod) baseMatch.paymentMethod = String(paymentMethod);

    if (startDate || endDate) {
      baseMatch.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
        baseMatch.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
        end.setHours(23, 59, 59, 999);
        baseMatch.createdAt.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      baseMatch.amount = {};
      if (minAmount !== undefined && minAmount !== "") {
        const n = Number(minAmount);
        if (!Number.isFinite(n)) return res.status(400).json({ message: "Invalid minAmount" });
        baseMatch.amount.$gte = n;
      }
      if (maxAmount !== undefined && maxAmount !== "") {
        const n = Number(maxAmount);
        if (!Number.isFinite(n)) return res.status(400).json({ message: "Invalid maxAmount" });
        baseMatch.amount.$lte = n;
      }
    }

    const escapeRegex = (s) => String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const term = (q ?? search ?? "").toString().trim();
    let regex = null;
    if (term) {
      try {
        regex = new RegExp(escapeRegex(term), "i");
      } catch {
        return res.status(400).json({ message: "Invalid search term" });
      }
    }

    const sortKey = allowedSortFields[String(sortField)] || allowedSortFields.createdAt;
    const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
    const sortStage = { [sortKey]: sortDir, _id: -1 };

    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          typeNorm: { $toLower: { $toString: "$type" } },
          statusNorm: { $toLower: { $toString: "$status" } },
          transactionId: { $toString: { $ifNull: ["$transactionId", ""] } },
          paymentMethod: { $toString: { $ifNull: ["$paymentMethod", ""] } },
        },
      },
      ...(requestedType
        ? [
            {
              $match: {
                typeNorm: requestedType,
              },
            },
          ]
        : []),
      ...(requestedStatus
        ? [
            {
              $match: {
                statusNorm: requestedStatus,
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          userPhoneStr: { $toString: { $ifNull: ["$user.phone", ""] } },
        },
      },
      ...(regex
        ? [
            {
              $match: {
                $or: [
                  { $expr: { $regexMatch: { input: "$transactionId", regex } } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $toString: { $ifNull: ["$description", ""] } },
                        regex,
                      },
                    },
                  },
                  { $expr: { $regexMatch: { input: "$paymentMethod", regex } } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $toString: { $ifNull: ["$user.fullName", ""] } },
                        regex,
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $toString: { $ifNull: ["$user.telegramId", ""] } },
                        regex,
                      },
                    },
                  },
                  { $expr: { $regexMatch: { input: "$userPhoneStr", regex } } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $toString: { $ifNull: ["$user.invitedBy", ""] } },
                        regex,
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $toString: { $ifNull: ["$user.referralCode", ""] } },
                        regex,
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $facet: {
          data: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                id: "$_id",
                user: {
                  fullName: { $ifNull: ["$user.fullName", "Unknown"] },
                  phone: { $ifNull: ["$user.phone", "N/A"] },
                  telegramId: { $ifNull: ["$user.telegramId", "—"] },
                  invitedBy: { $ifNull: ["$user.invitedBy", "—"] },
                  referralCode: { $ifNull: ["$user.referralCode", "—"] },
                },
                source: { $ifNull: ["$source", "manual"] },
                type: "$typeNorm",
                status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$statusNorm", "approved"] }, then: "COMPLETED" },
                      { case: { $eq: ["$statusNorm", "pending"] }, then: "PENDING" },
                      { case: { $eq: ["$statusNorm", "rejected"] }, then: "FAILED" },
                    ],
                    default: "UNKNOWN",
                  },
                },
                amount: 1,
                creditedAmount: { $ifNull: ["$creditedAmount", 0] },
                bonusAmount: { $ifNull: ["$bonusAmount", 0] },
                bonusPercent: { $ifNull: ["$bonusPercent", 0] },
                paymentMethod: { $ifNull: ["$paymentMethod", "—"] },
                reference: { $ifNull: ["$transactionId", "—"] },
                description: { $ifNull: ["$description", "—"] },
                createdAt: 1,
                receiptId: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
          typeTotals: [
            {
              $group: {
                _id: "$typeNorm",
                count: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 0,
                type: "$_id",
                count: 1,
                totalAmount: 1,
              },
            },
          ],
        },
      },
    ];

    const [result] = await Transaction.aggregate(pipeline).allowDiskUse(true);
    const rows = result?.data || [];
    const totalCount = result?.total?.[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);
    const typeTotals = {};
    (result?.typeTotals || []).forEach((t) => {
      typeTotals[t.type] = { count: t.count, totalAmount: t.totalAmount };
    });

    return res.status(200).json({
      success: true,
      count: rows.length,
      totalTransactions: totalCount,
      totalPages,
      currentPage: pageNum,
      transactions: rows,
      typeTotals,
    });
  } catch (error) {
    logger.error('manualPaymentController: error fetching transactions', { err: error });
    return res.status(500).json({ message: "Server error" });
  }
};