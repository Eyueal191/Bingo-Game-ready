const WalletLog = require("../models/walletLog");
const logger = require("../utils/winstonLogger");
// Utility: create log
const createWalletLog = async ({
  targetUser,
  performedBy,
  amount,
  balanceBefore,
  balanceAfter,
  reason = "",
  source = "manual",
  ip,
  userAgent,
}) => {
  try {
    const log = await WalletLog.create({
      targetUser,
      performedBy,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      source,
      ip,
      userAgent,
    });
    return log;
  } catch (e) {
    logger.error("Failed to create wallet log", e);
    // don't throw to avoid breaking main flow
    return null;
  }
};

// GET /api/v1/wallet-logs
const listWalletLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      target,
      admin,
      search = "",
      q = "",
      startDate,
      endDate,
      sortField = "createdAt",
      sortOrder = "desc",
      source,
      minAmount,
      maxAmount,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const escapeRegex = (str = "") =>
      String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const match = {};
    const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
    if (target && isObjectId(target)) match.targetUser = target;
    if (admin && isObjectId(admin)) match.performedBy = admin;
    if (source) match.source = source;

    const minAmt = minAmount != null && minAmount !== "" ? Number(minAmount) : null;
    const maxAmt = maxAmount != null && maxAmount !== "" ? Number(maxAmount) : null;
    if (Number.isFinite(minAmt) || Number.isFinite(maxAmt)) {
      match.amount = {};
      if (Number.isFinite(minAmt)) match.amount.$gte = minAmt;
      if (Number.isFinite(maxAmt)) match.amount.$lte = maxAmt;
    }

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) match.createdAt.$gte = s;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) d.setHours(23, 59, 59, 999);
        if (!isNaN(d.getTime())) match.createdAt.$lte = d;
      }
    }

    const text = (q || search || "").trim();
    const safe = text ? new RegExp(escapeRegex(text), "i") : null;
    const targetText = target && !isObjectId(target) ? new RegExp(escapeRegex(target), "i") : null;
    const adminText = admin && !isObjectId(admin) ? new RegExp(escapeRegex(admin), "i") : null;

    const dir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
    const sortMap = {
      createdAt: { createdAt: dir },
      amount: { amount: dir },
      balanceBefore: { balanceBefore: dir },
      balanceAfter: { balanceAfter: dir },
      source: { source: dir },
      reason: { reason: dir },
      targetUser: { targetUserSort: dir, createdAt: -1 },
      performedBy: { performedBySort: dir, createdAt: -1 },
    };
    const sort = sortMap[sortField] || { createdAt: -1 };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "targetUser",
          foreignField: "_id",
          as: "targetUser",
        },
      },
      { $unwind: { path: "$targetUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "performedBy",
          foreignField: "_id",
          as: "performedBy",
        },
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          targetUserSort: {
            $ifNull: [
              { $toLower: { $ifNull: ["$targetUser.fullName", ""] } },
              "",
            ],
          },
          performedBySort: {
            $ifNull: [
              { $toLower: { $ifNull: ["$performedBy.fullName", ""] } },
              "",
            ],
          },
        },
      },
    ];

    if (safe || targetText || adminText) {
      pipeline.push({
        $match: {
          $or: [
            ...(safe
              ? [
                  { reason: { $regex: safe } },
                  { source: { $regex: safe } },
                  { "targetUser.fullName": { $regex: safe } },
                  { "targetUser.phone": { $regex: safe } },
                  { "targetUser.telegramId": { $regex: safe } },
                  { "performedBy.fullName": { $regex: safe } },
                  { "performedBy.phone": { $regex: safe } },
                  { "performedBy.telegramId": { $regex: safe } },
                ]
              : []),
            ...(targetText
              ? [
                  { "targetUser.fullName": { $regex: targetText } },
                  { "targetUser.phone": { $regex: targetText } },
                  { "targetUser.telegramId": { $regex: targetText } },
                ]
              : []),
            ...(adminText
              ? [
                  { "performedBy.fullName": { $regex: adminText } },
                  { "performedBy.phone": { $regex: adminText } },
                  { "performedBy.telegramId": { $regex: adminText } },
                ]
              : []),
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        rows: [{ $sort: sort }, { $skip: skip }, { $limit: limitNum }],
        total: [{ $count: "count" }],
      },
    });

    const agg = await WalletLog.aggregate(pipeline);
    const rows = agg?.[0]?.rows || [];
    const total = agg?.[0]?.total?.[0]?.count || 0;

    res.json({
      success: true,
      rows,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (e) {
    logger.error("Failed to list wallet logs", e);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/v1/wallet-logs/:id
const getWalletLog = async (req, res) => {
  try {
    const log = await WalletLog.findById(req.params.id)
      .populate("targetUser", "fullName phone telegramId role")
      .populate("performedBy", "fullName phone telegramId role");
    if (!log) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, log });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/v1/wallet-logs/:id (optional; soft requirement)
const deleteWalletLog = async (req, res) => {
  try {
    await WalletLog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createWalletLog,
  listWalletLogs,
  getWalletLog,
  deleteWalletLog,
};