/**
 * Wallet Service — Single source of truth for all balance operations.
 *
 * Rules:
 *   1. Game deduction: wallet first → bonus if wallet insufficient → mixed if needed
 *   2. Game win: ALWAYS credited to wallet (never bonus)
 *   3. Deposit: credited to wallet
 *   4. Deposit bonus: credited to bonus only
 *   5. Registration / referral bonus: credited to bonus only
 *   6. Withdrawal: deducted from wallet only (bonus is not withdrawable)
 *   7. Transfer: deducted from wallet only
 */

const User = require("../models/userModels");
const logger = require("../utils/winstonLogger");

/**
 * Check whether a user can afford a game entry.
 * Returns { canAfford, wallet, bonus, total }
 */
const canAffordGame = async (userId) => {
    const user = await User.findById(userId).select("wallet bonus");
    if (!user) throw new Error("User not found");
    return {
        canAfford: (amount) => user.wallet + user.bonus >= amount,
        wallet: user.wallet,
        bonus: user.bonus,
        total: user.wallet + user.bonus,
    };
};

/**
 * Deduct an amount for a game.
 *   Priority: wallet first → bonus → mixed.
 *   Must be called inside an existing Mongoose session/transaction.
 *
 * @param {string}  userId
 * @param {number}  amount   – amount in coins
 * @param {import("mongoose").ClientSession} session
 * @returns {{ walletUsed: number, bonusUsed: number, walletAfter: number, bonusAfter: number }}
 */
const deductForGame = async (userId, amount, session) => {
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const walletUsed = Math.min(user.wallet, amount);
    const bonusUsed = amount - walletUsed;

    const result = await User.updateOne(
        {
            _id: userId,
            $expr: {
                $gte: [{ $add: ["$wallet", "$bonus"] }, amount]
            }
        },
        {
            $inc: {
                wallet: -walletUsed,
                bonus: -bonusUsed
            }
        },
        { session }
    );
  logger.debug("walletService.deductForGame", {
        userId,
        amount,
        walletUsed,
        bonusUsed,
        walletAfter: result.modifiedCount > 0 ? user.wallet - walletUsed : user.wallet||0,
        bonusAfter: result.modifiedCount > 0 ? user.bonus - bonusUsed : user.bonus||0,
    });
    if (result.modifiedCount === 0) {
        throw new Error("Insufficient balance (race condition)");
    }
    

    return {
        walletUsed,
        bonusUsed,
        walletAfter: result.modifiedCount > 0 ? user.wallet - walletUsed : user.wallet||0,
        bonusAfter: result.modifiedCount > 0 ? user.bonus - bonusUsed : user.bonus||0,
    };
};

/**
 * Credit a game win — always goes to wallet.
 *
 * @param {string}  userId
 * @param {number}  amount
 * @param {import("mongoose").ClientSession} [session]
 * @returns {{ walletAfter: number }}
 */
const creditWin = async (userId, amount, session) => {
    const opts = session ? { session } : {};

    if (session) {
        const user = await User.findById(userId).session(session);
        if (!user) throw new Error("User not found");
        user.wallet += amount;
        await user.save({ session });
        return { walletAfter: user.wallet };
    }

    // Without session — use atomic updateOne
    const result = await User.updateOne(
        { _id: userId },
        { $inc: { wallet: amount } },
        opts
    );
    if (result.modifiedCount === 0) throw new Error("User not found");

    const user = await User.findById(userId).select("wallet");
    return { walletAfter: user.wallet };
};

/**
 * Credit a game win using atomic $inc (for use inside transactions where
 * the caller already has a session and doesn't need to load the full user).
 */
const creditWinAtomic = async (userId, amount, session) => {
    await User.updateOne(
        { _id: userId },
        { $inc: { wallet: amount } },
        { session }
    );
};

/**
 * Credit a deposit — goes to wallet.
 */
const creditDeposit = async (userId, amount, session) => {
    const opts = session ? { session } : {};
    const user = await User.findById(userId).session(session || undefined);
    if (!user) throw new Error("User not found");
    user.wallet += amount;
    await user.save(opts);
    return { walletAfter: user.wallet, bonusAfter: user.bonus };
};

/**
 * Credit bonus — goes to bonus only (registration, referral, deposit bonus).
 */
const creditBonus = async (userId, amount, session) => {
    const opts = session ? { session } : {};
    const user = await User.findById(userId).session(session || undefined);
    if (!user) throw new Error("User not found");
    user.bonus += amount;
    await user.save(opts);
    return { walletAfter: user.wallet, bonusAfter: user.bonus };
};

/**
 * Deduct for withdrawal — wallet only (bonus is not withdrawable).
 */
const deductForWithdrawal = async (userId, amount, session) => {
    const opts = session ? { session } : {};
    const user = await User.findById(userId).session(session || undefined);
    if (!user) throw new Error("User not found");
    if (user.wallet < amount) {
        throw new Error("Insufficient wallet balance for withdrawal");
    }
    user.wallet -= amount;
    await user.save(opts);
    return { walletAfter: user.wallet };
};

/**
 * Deduct for transfer — wallet only.
 */
const deductForTransfer = async (userId, amount, session) => {
    const opts = session ? { session } : {};
    const user = await User.findById(userId).session(session || undefined);
    if (!user) throw new Error("User not found");
    if (user.wallet < amount) {
        throw new Error("Insufficient wallet balance for transfer");
    }
    user.wallet -= amount;
    await user.save(opts);
    return { walletAfter: user.wallet };
};

/**
 * Get the current balance breakdown for a user.
 */
const getBalance = async (userId) => {
    const user = await User.findById(userId).select("wallet bonus");
    if (!user) throw new Error("User not found");
    return {
        wallet: user.wallet,
        bonus: user.bonus,
        total: user.wallet + user.bonus,
    };
};

module.exports = {
    canAffordGame,
    deductForGame,
    creditWin,
    creditWinAtomic,
    creditDeposit,
    creditBonus,
    deductForWithdrawal,
    deductForTransfer,
    getBalance,
};
