const  { Transaction, TransactionType, TransactionStatus } =require('../models/Transaction.js');

exports.createTransaction = async (userId, amount, type, description) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
  if (!Object.values(TransactionType).includes(type)) {
    throw new Error("Invalid transaction type");
  }
    const transaction = new Transaction({
      userId,
      amount,
      type,
      description,
      reference: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
    });
    await transaction.save();
    return transaction;
  };
  
  exports.getTransactionById = async (transactionId) => {
    const transaction = await Transaction.findById(transactionId).populate(
      "userId"
    );
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    return transaction;
  };
  
  exports.getAllTransactions = async () => {
    const transactions = await Transaction.find().populate("userId");
    return transactions;
  };

exports.updateTransaction = async (transactionId, updateData) => {
  const transaction = await Transaction.findByIdAndUpdate(
    transactionId,
    updateData,
    { new: true }
  );
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  return transaction;
};

exports.deleteTransaction = async (transactionId) => {
  const transaction = await Transaction.findByIdAndDelete(transactionId);
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  return transaction;
};

exports.approveTransaction = async (transactionId) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  transaction.status = TransactionStatus.APPROVED;
  await transaction.save();
  return transaction;
 };
exports.rejectTransaction = async (transactionId) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  transaction.status = TransactionStatus.REJECTED;
  await transaction.save();
  return transaction;
 };
exports.getSingleUserTransaction = async (userId) => { 
  const transactions = await Transaction.find({ userId });
  if (!transactions) {
    throw new Error("Transaction not found");
  }
  return transactions;
};