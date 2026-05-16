/**
 * Unified Ledger Service
 * Single source of truth for all financial transaction queries
 * Aggregates data from: Transaction (AddisPay), ManualTransaction, deposit (SMS)
 */

const { Transaction: AddisPayTransaction } = require("../models/Transaction");
const ManualTransaction = require("../models/ManualTransaction");
const logger = require("../utils/winstonLogger");

/**
 * Build a date filter object for MongoDB queries
 */
const buildDateFilter = (startDate, endDate, field = "createdAt") => {
    const filter = {};
    if (startDate || endDate) {
        filter[field] = {};
        if (startDate) filter[field].$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter[field].$lte = end;
        }
    }
    return filter;
};

/**
 * Get all deposits from all sources
 * Returns unified format with source identification
 */
const getAllDeposits = async ({ startDate, endDate } = {}) => {
    const dateFilter = buildDateFilter(startDate, endDate);

    try {
        // 1. AddisPay deposits
        const addisPayDeposits = await AddisPayTransaction.aggregate([
            {
                $match: {
                    type: "deposit",
                    status: "COMPLETED",
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    bonusTotal: { $sum: { $ifNull: ["$bonusAmount", 0] } },
                    count: { $sum: 1 },
                },
            },
        ]);

        // 2. Manual deposits (with approved receipts)
        const manualDeposits = await ManualTransaction.aggregate([
            {
                $match: {
                    type: "deposit",
                    source: { $ne: "sms" }, // Exclude SMS
                    ...dateFilter,
                },
            },
            {
                $lookup: {
                    from: "receipts",
                    localField: "receiptId",
                    foreignField: "_id",
                    as: "receipt",
                },
            },
            {
                $match: {
                    $or: [
                        { "receipt.status": { $in: ["approved", "Approved"] } },
                        { receiptId: null }, // Admin deposits without receipt
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    bonusTotal: { $sum: { $ifNull: ["$bonusAmount", 0] } },
                    count: { $sum: 1 },
                },
            },
        ]);

        // 3. SMS deposits (now in ManualTransaction with source: sms)
        const smsDeposits = await ManualTransaction.aggregate([
            {
                $match: {
                    source: "sms",
                    status: "approved", // or { $in: ["approved", "Approved"] }
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    bonusTotal: { $sum: { $ifNull: ["$bonusAmount", 0] } },
                    count: { $sum: 1 },
                },
            },
        ]);

        return {
            addispay: {
                total: addisPayDeposits[0]?.total || 0,
                bonus: addisPayDeposits[0]?.bonusTotal || 0,
                count: addisPayDeposits[0]?.count || 0,
            },
            manual: {
                total: manualDeposits[0]?.total || 0,
                bonus: manualDeposits[0]?.bonusTotal || 0,
                count: manualDeposits[0]?.count || 0,
            },
            sms: {
                total: smsDeposits[0]?.total || 0,
                bonus: smsDeposits[0]?.bonusTotal || 0,
                count: smsDeposits[0]?.count || 0,
            },
            total:
                (addisPayDeposits[0]?.total || 0) +
                (manualDeposits[0]?.total || 0) +
                (smsDeposits[0]?.total || 0),
            totalBonus:
                (addisPayDeposits[0]?.bonusTotal || 0) +
                (manualDeposits[0]?.bonusTotal || 0) +
                (smsDeposits[0]?.bonusTotal || 0),
            totalCount:
                (addisPayDeposits[0]?.count || 0) +
                (manualDeposits[0]?.count || 0) +
                (smsDeposits[0]?.count || 0),
        };
    } catch (error) {
        logger.error("ledgerService.getAllDeposits error:", error);
        throw error;
    }
};

/**
 * Get all withdrawals from all sources
 */
const getAllWithdrawals = async ({ startDate, endDate } = {}) => {
    const dateFilter = buildDateFilter(startDate, endDate);

    try {
        // 1. AddisPay withdrawals
        const addisPayWithdrawals = await AddisPayTransaction.aggregate([
            {
                $match: {
                    type: "withdrawal",
                    status: "COMPLETED",
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        // 2. Manual withdrawals
        const manualWithdrawals = await ManualTransaction.aggregate([
            {
                $match: {
                    type: { $in: ["withdrawal", "Withdrawal"] },
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        return {
            addispay: {
                total: addisPayWithdrawals[0]?.total || 0,
                count: addisPayWithdrawals[0]?.count || 0,
            },
            manual: {
                total: manualWithdrawals[0]?.total || 0,
                count: manualWithdrawals[0]?.count || 0,
            },
            total:
                (addisPayWithdrawals[0]?.total || 0) +
                (manualWithdrawals[0]?.total || 0),
            totalCount:
                (addisPayWithdrawals[0]?.count || 0) +
                (manualWithdrawals[0]?.count || 0),
        };
    } catch (error) {
        logger.error("ledgerService.getAllWithdrawals error:", error);
        throw error;
    }
};

/**
 * Get all bonuses
 */
const getAllBonuses = async ({ startDate, endDate } = {}) => {
    const dateFilter = buildDateFilter(startDate, endDate);

    try {
        const bonuses = await AddisPayTransaction.aggregate([
            {
                $match: {
                    type: { $in: ["registration_bonus", "referral_bonus"] },
                    status: "COMPLETED",
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const bonusMap = {};
        bonuses.forEach((b) => (bonusMap[b._id] = b));

        // Add deposit bonuses from deposits
        const depositBonuses = await AddisPayTransaction.aggregate([
            {
                $match: {
                    type: "deposit",
                    status: "COMPLETED",
                    bonusAmount: { $gt: 0 },
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$bonusAmount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        return {
            registration: {
                total: bonusMap.registration_bonus?.total || 0,
                count: bonusMap.registration_bonus?.count || 0,
            },
            referral: {
                total: bonusMap.referral_bonus?.total || 0,
                count: bonusMap.referral_bonus?.count || 0,
            },
            deposit: {
                total: depositBonuses[0]?.total || 0,
                count: depositBonuses[0]?.count || 0,
            },
            total:
                (bonusMap.registration_bonus?.total || 0) +
                (bonusMap.referral_bonus?.total || 0) +
                (depositBonuses[0]?.total || 0),
        };
    } catch (error) {
        logger.error("ledgerService.getAllBonuses error:", error);
        throw error;
    }
};

/**
 * Get complete financial summary
 */
const getFinancialSummary = async (options = {}) => {
    const [deposits, withdrawals, bonuses] = await Promise.all([
        getAllDeposits(options),
        getAllWithdrawals(options),
        getAllBonuses(options),
    ]);

    return {
        deposits,
        withdrawals,
        bonuses,
        netCashFlow: deposits.total - withdrawals.total,
        netAfterBonuses: deposits.total - withdrawals.total - bonuses.total,
    };
};

module.exports = {
    getAllDeposits,
    getAllWithdrawals,
    getAllBonuses,
    getFinancialSummary,
    buildDateFilter,
};
