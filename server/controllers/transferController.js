const { Transaction, TransactionType, TransactionStatus } = require('../models/Transaction');
const User = require('../models/userModels');
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/winstonLogger');

// Transfer balance from one user to another
const transferBalance = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let { receiverId, amount, friendPhoneNumber } = req.body;
        // SECURITY: Only admins may specify a different senderId.
        // Regular users are ALWAYS locked to their own authenticated ID.
        const isAdmin = req.user?.role === 'admin';
        const senderId = (isAdmin && req.body.senderId) ? req.body.senderId : req.user?._id;

        console.log('transferBalance input:', { senderId, receiverId, friendPhoneNumber, amount });

        // Validation for common fields
        if (!senderId || (!receiverId && !friendPhoneNumber) || !amount || amount <= 0) {
            console.warn('transferBalance invalid input detected:', {
                hasSenderId: !!senderId,
                hasReceiver: !!receiverId || !!friendPhoneNumber,
                amount
            });
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid input data" });
        }

        // If friendPhoneNumber is provided but receiverId is not, find the user
        if (!receiverId && friendPhoneNumber) {
            const escapedId = friendPhoneNumber.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const receiverUser = await User.findOne({
                $or: [
                    { telegramId: friendPhoneNumber.toString() },
                    { phone: friendPhoneNumber.toString() },
                    { phone: { $regex: new RegExp(escapedId + "$") } }
                ]
            });
            if (!receiverUser) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Recipient not found" });
            }
            receiverId = receiverUser._id;
        }

        // Prevent self-transfer
        if (senderId.toString() === receiverId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Cannot transfer to yourself" });
        }

        // Find sender and receiver
        const sender = await User.findById(senderId).session(session);
        const receiver = await User.findById(receiverId).session(session);

        if (!sender || !receiver) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Sender or receiver not found" });
        }

        // Check if sender has enough balance
        if (sender.wallet < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Update sender and receiver balances
        sender.wallet -= amount;
        receiver.wallet += amount;

        // Save updated users
        await sender.save({ session });
        await receiver.save({ session });

        const reference = `TRF-${Date.now()}-${sender._id.toString().slice(-4)}`;

        // Create transaction records
        const newTransfer = new Transaction({
            userId: sender._id,
            type: TransactionType.TRANSFER,
            amount: amount,
            status: TransactionStatus.COMPLETED,
            reference: reference,
            description: `Transfer to ${receiver.telegramId || 'User'}`,
            metadata: { receiverId: receiver._id }
        });

        const receiverTransfer = new Transaction({
            userId: receiver._id,
            type: TransactionType.RECEIVE,
            amount: amount,
            status: TransactionStatus.COMPLETED,
            reference: `REC-${reference}`,
            description: `Transfer from ${sender.telegramId || 'User'}`,
            metadata: { senderId: sender._id }
        });

        await newTransfer.save({ session });
        await receiverTransfer.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Emit real-time wallet updates
        if (req.io) {
            const senderRoom = sender._id.toString();
            const receiverRoom = receiver._id.toString();
            console.log(`Emitting walletUpdate to sender room: ${senderRoom}, balance: ${sender.wallet}`);
            console.log(`Emitting walletUpdate to receiver room: ${receiverRoom}, balance: ${receiver.wallet}`);

            req.io.to(senderRoom).emit("walletUpdate", { wallet: sender.wallet, bonus: sender.bonus });
            req.io.to(receiverRoom).emit("walletUpdate", { wallet: receiver.wallet, bonus: receiver.bonus });
        }

        return res.status(200).json({
            success: true,
            message: "Transfer successful",
            transfer: newTransfer,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('transferController: error in balance transfer', { err: error });
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all transfers (admin)
const getAllTransfers = async (req, res) => {
    try {
        const transfers = await Transaction.find({ type: { $in: [TransactionType.TRANSFER, TransactionType.RECEIVE] } })
            .populate('userId', 'fullName phone wallet telegramId')
            .sort({ createdAt: -1 });

        return res.status(200).json({ message: "Transfers retrieved", transfers });

    } catch (error) {
        logger.error('transferController: error fetching transfers', { err: error });
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get transfers for a specific user
const getUserTransfers = async (req, res) => {
    try {
        const { userId } = req.params;

        const transfers = await Transaction.find({
            userId: userId,
            type: { $in: [TransactionType.TRANSFER, TransactionType.RECEIVE] }
        })
            .populate('userId', 'fullName phone wallet telegramId')
            .sort({ createdAt: -1 });

        return res.status(200).json({ message: "User transfers retrieved", transfers });

    } catch (error) {
        logger.error('transferController: error fetching user transfers', { err: error });
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a transfer (admin) - Usually you wouldn't delete financial records, but keeping for legacy compatibility
const deleteTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;

        const transfer = await Transaction.findByIdAndDelete(transferId);
        if (!transfer) {
            return res.status(404).json({ message: "Transfer not found" });
        }

        return res.status(200).json({ message: "Transfer deleted successfully" });

    } catch (error) {
        logger.error('transferController: error deleting transfer', { err: error });
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    transferBalance,
    getAllTransfers,
    getUserTransfers,
    deleteTransfer
};
