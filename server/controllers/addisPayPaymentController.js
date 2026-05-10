const {
  createOrder,
  initiatePayment,
  checkOrder,
  checkStatus,
  directPayout,
} = require("../services/addispayService");
const {
  handleDepositSuccessCallback,
  handleDepositFailureCallback,
  handleWithdrawalCallback,
} = require("../services/addispayCallbackService");
const generateUniqueId = require("../utils/uniqueId");
const CONFIG = require("../config/config");
const User = require("../models/userModels");
const Reservation = require("../models/reservationModel");
const { getAppSettings } = require("../services/appSettingsService");
const { getAddisPayPhoneFormat, normalizeEthiopianPhone } = require("../utils/phoneUtils");

const {
  Transaction,
  TransactionType,
  TransactionStatus,
} = require("../models/Transaction");
const logger = require("../utils/winstonLogger");

// Map AddisPay status_code to HTTP status when provider doesn't send a clear HTTP status
const httpFromProviderCode = (code) => {
  if (!code) return 400;
  const n = Number(code);
  if ([400, 401, 402, 403, 404, 409, 422, 429].includes(n)) return n;
  if (n >= 500) return 502; // treat unknown 5xx-ish as bad gateway
  return 400;
};

const buildDepositReason = (appName) =>
  `Deposit to your ${appName || ""} wallet`;
const buildWithdrawalReason = (appName) =>
  `Withdrawal from your ${appName || ""} wallet`;
const ADDISPAY_PAYOUT_SUCCESS_MESSAGE =
  "The direct b2c payment has been processed successfully, The customer shall receive the paid amount.";
const PENDING_WITHDRAWAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const deposit = async (req, res) => {
  logger.info("Deposit request received", {
    userId: req.user?._id,
    amount: req.body?.amount,
    paymentMethod: req.body?.paymentMethod,
  });
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }



  try {
    const { identity, walletRules } = await getAppSettings();
    const minDeposit = Number(walletRules?.minDepositAmount) || 50;
    const depositReason = buildDepositReason(identity?.appName);
    const { amount, paymentMethod, phone } = req.body;
    if (!amount || amount < minDeposit) {
      throw new Error(`Amount must be at least ${minDeposit} coins`);
    }
    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }
    let phoneNumber = (phone || user.phone).trim().replace(/[\s-]/g, "");
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Use new phone utils to validate and convert to AddisPay format

    // Attempt to normalize the phone number as an Ethiopian number
    const normalized = normalizeEthiopianPhone(phoneNumber);
    if (!normalized) {
      throw new Error(
        "Invalid Ethiopian phone format. Use 09..., 07..., or +251... followed by 9 digits"
      );
    }

    // Convert to AddisPay format (without +)
    phoneNumber = getAddisPayPhoneFormat(normalized);

    // Final defensive check (Safaricom 7 and Ethio Telecom 9)
    if (!phoneNumber || !/^251[79]\d{8}$/.test(phoneNumber)) {
      throw new Error(
        "Invalid Ethiopian phone format. Use 09..., 07..., or +251... followed by 9 digits"
      );
    }

    const nonce = `deposit_${generateUniqueId()}`;
    const tx_ref = `deposit_${generateUniqueId()}`;
    const paymentData = {
      data: {
        redirect_url: CONFIG.redirectUrl,
        cancel_url: CONFIG.cancelUrl,
        success_url: CONFIG.successUrl,
        error_url: CONFIG.errorUrl,
        order_reason: depositReason,
        currency: "ETB",
        email: user.email || "test@gmail.com",
        first_name: user.fullName.split(" ")[0] || user.fullName || "User",
        last_name: user.fullName.split(" ")[1] || user.fullName || "User",
        nonce: nonce,
        order_detail: {
          amount: amount,
          description: depositReason,
        },
        phone_number: phoneNumber,
        session_expired: CONFIG.sessionExpired || "50000",
        total_amount: amount.toString(),
        tx_ref: tx_ref,
      },
      message: "Deposit request",
    };

    const transaction = new Transaction({
      userId: user._id,
      type: TransactionType.DEPOSIT,
      amount: amount,
      addispayNonce: nonce,
      status: TransactionStatus.PENDING,
      description: `Deposited ${amount} coins`,
      reference: tx_ref,
      localAmount: amount, // AddisPay is ETB, which is 1:1 with coins
      localCurrency: "ETB",
      exchangeRate: 1,
      metadata: paymentData.data,
    });
    await transaction.save();

    const orderResponse = await createOrder(paymentData);
    if (!orderResponse || !orderResponse.uuid) {
      throw new Error("Invalid response from createOrder");
    }
    logger.debug("AddisPay order created", {
      userId: user._id,
      uuid: orderResponse.uuid,
    });

    const orderData = await checkOrder(orderResponse.uuid);
    if (!orderData.data.data) {
      throw new Error("Order data validation failed");
    }
    const paymentPayload = {
      uuid: orderResponse.uuid,
      phone_number: orderData.data.data.phone_number,
      encrypted_total_amount: orderResponse.amount.toString(),
      merchant_name: orderData.data.data.merchant_name,
      selected_service: "ussd",
      selected_bank: paymentMethod || "telebirr",
    };
    logger.debug("Initiating AddisPay payment", {
      userId: user._id,
      uuid: orderResponse.uuid,
      selected_bank: paymentMethod || "telebirr",
    });

    const paymentResponse = await initiatePayment(paymentPayload);
    res.status(200).json({
      status: "success",
      checkout_url: `${orderResponse.checkout_url}/${orderResponse.uuid}`,
      nonce: nonce,
    });
  } catch (error) {
    const isProvider = error && error.isProviderError;
    logger.error("Deposit failed", {
      error: error.message,
      provider: isProvider ? "AddisPay" : undefined,
      code: error.code,
    });
    const statusCode =
      (isProvider && error.httpStatus) ||
      (isProvider && httpFromProviderCode(error.code)) ||
      400;
    if (isProvider && (error.details || error.raw)) {
      return res.status(statusCode).json(error.details || error.raw);
    }
    return res.status(statusCode).json({ message: error.message });
  }
};

const withdraw = async (req, res) => {
  logger.info("Withdrawal request received", {
    userId: req.user?._id,
    amount: req.body?.amount,
    paymentMethod: req.body?.paymentMethod,
  });
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (user.country !== "ET") {
    return res.status(403).json({
      error: "Automatic withdrawal is only available for Ethiopian users."
    });
  }

  let walletDebited = false;
  let transaction = null;
  let tx_ref = null;
  let normalizedAmount = 0;
  let autoReleasedWithdrawalId = null;


  try {
    const { identity, walletRules } = await getAppSettings();
    const minWithdrawal = Number(walletRules?.minWithdrawalAmount) || 100;
    const minBalance = Number(walletRules?.minBalanceAfterWithdrawal) || 10;
    const minWins = Number(walletRules?.minWinsForWithdrawal) || 0;
    const minDeposits = Number(walletRules?.minDepositsForWithdrawal) || 0;
    const withdrawalReason = buildWithdrawalReason(identity?.appName);
    const { amount, paymentMethod, phone } = req.body;
    normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount)) {
      throw new Error("Invalid withdrawal amount");
    }
    if (normalizedAmount < minWithdrawal) {
      throw new Error(`Amount must be at least ${minWithdrawal} coins`);
    }
    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }

    let phoneNumber = (phone || user.phone).trim().replace(/[\s-]/g, "");
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Use new phone utils to validate and convert to AddisPay format

    // Attempt to normalize the phone number as an Ethiopian number
    const normalized = normalizeEthiopianPhone(phoneNumber);
    if (!normalized) {
      throw new Error(
        "Invalid Ethiopian phone format. Use 09..., 07..., or +251... followed by 9 digits"
      );
    }

    // Convert to AddisPay format (without +)
    phoneNumber = getAddisPayPhoneFormat(normalized);

    // Final defensive check (Safaricom 7 and Ethio Telecom 9)
    if (!phoneNumber || !/^251[79]\d{8}$/.test(phoneNumber)) {
      throw new Error(
        "Invalid Ethiopian phone format. Use 09..., 07..., or +251... followed by 9 digits"
      );
    }

    const existingPendingWithdrawal = await Transaction.findOne({
      userId: user._id,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingPendingWithdrawal) {
      const lastActivity =
        existingPendingWithdrawal.updatedAt || existingPendingWithdrawal.createdAt;
      const isStale =
        lastActivity &&
        Date.now() - new Date(lastActivity).getTime() >
        PENDING_WITHDRAWAL_TIMEOUT_MS;

      if (isStale) {
        const staleTransaction = await Transaction.findOneAndUpdate(
          {
            _id: existingPendingWithdrawal._id,
            status: TransactionStatus.PENDING,
          },
          {
            $set: {
              status: TransactionStatus.FAILED,
              "metadata.autoCancelledAt": new Date(),
              "metadata.autoCancelReason":
                "Timed out waiting for AddisPay confirmation",
            },
          },
          { new: true }
        );

        if (staleTransaction) {
          await User.updateOne(
            { _id: user._id },
            { $inc: { wallet: staleTransaction.amount } }
          );
          user.wallet = (user.wallet || 0) + staleTransaction.amount;
          autoReleasedWithdrawalId = staleTransaction._id;
          logger.warn("Pending withdrawal auto-cancelled after timeout", {
            userId: user._id,
            transactionId: staleTransaction._id,
            amount: staleTransaction.amount,
          });
        } else {
          return res.status(409).json({
            message:
              "You already have a pending withdrawal awaiting provider confirmation. Please try again shortly",
            transactionId: existingPendingWithdrawal._id,
          });
        }
      } else {
        return res.status(409).json({
          message:
            "You already have a pending withdrawal. Please wait for it to complete",
          transactionId: existingPendingWithdrawal._id,
        });
      }
    }

    const refreshedUser = await User.findById(user._id).select("wallet");
    if (refreshedUser) {
      user.wallet = refreshedUser.wallet;
    }

    if (user.wallet < normalizedAmount + minBalance) {
      throw new Error(
        `Insufficient balance. Minimum remaining balance is ${minBalance} coins`
      );
    }
    // Check if user has deposited at least the configured times
    if (minDeposits > 0) {
      const depositCount = await Transaction.countDocuments({
        userId: user._id,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
      });
      if (depositCount < minDeposits) {
        logger.info("Withdrawal blocked: minimum deposit count not met", {
          userId: user._id,
          depositCount,
          required: minDeposits,
        });
        return res.status(400).json({
          message: `You must have completed at least ${minDeposits} deposit${minDeposits === 1 ? "" : "s"} to withdraw`,
        });
      }
    }

    // Check if user has the configured number of game wins
    if (minWins > 0) {
      const winCount = await Reservation.countDocuments({
        userId: user._id,
        gameStatus: "won",
        status: "completed",
      });
      if (winCount < minWins) {
        logger.info("Withdrawal blocked: minimum win count not met", {
          userId: user._id,
          winCount,
          required: minWins,
        });
        return res.status(400).json({
          message: `You must have at least ${minWins} game win${minWins === 1 ? "" : "s"} to withdraw`,
        });
      }
    }

    // New Rule (Automatic): Must have at least one game win after the most recent COMPLETED DEPOSIT
    const lastCompletedDeposit = await Transaction.findOne({
      userId: user._id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
    })
      .sort({ createdAt: -1 })
      .select("createdAt");

    if (lastCompletedDeposit) {
      const winAfterLastDepositCount = await Reservation.countDocuments({
        userId: user._id,
        gameStatus: "won",
        status: "completed",
        createdAt: { $gt: lastCompletedDeposit.createdAt },
      });

      if (winAfterLastDepositCount === 0) {
        return res.status(400).json({
          message:
            "You must win at least one game after your last deposit to withdraw",
        });
      }
    }
    const nonce = `payout_${generateUniqueId()}`;
    tx_ref = `payout-${generateUniqueId()}`; // Ensure uniqueness while matching provider resource_id format
    logger.debug("Preparing AddisPay withdrawal", {
      userId: user._id,
      paymentMethod,
      amount: normalizedAmount,
    });
    if (!["telebirr", "cbe", "mpesa"].includes(paymentMethod.toLowerCase())) {
      throw new Error(
        "Invalid payment method. Use 'telebirr', 'cbe', or 'mpesa'"
      );
    }
    // Deduct wallet balance atomically to avoid race conditions on concurrent requests
    const walletUpdateResult = await User.updateOne(
      {
        _id: user._id,
        wallet: { $gte: normalizedAmount + minBalance },
      },
      { $inc: { wallet: -normalizedAmount } }
    );

    if (!walletUpdateResult.modifiedCount) {
      throw new Error(
        `Insufficient balance. Minimum remaining balance is ${minBalance} coins`
      );
    }
    walletDebited = true;

    const updatedUserWallet = await User.findById(user._id)
      .select("wallet")
      .lean();

    const payoutData = {
      data: {
        cancel_url: CONFIG.cancelUrl,
        success_url: CONFIG.withdrawalSuccessUrl || CONFIG.successUrl,
        error_url: CONFIG.withdrawalErrorUrl || CONFIG.errorUrl,
        order_reason: withdrawalReason,
        currency: "ETB",
        customer_name: user.fullName || "User",
        phone_number: phoneNumber,
        nonce: nonce,
        payment_method: paymentMethod.toLowerCase() || "telebirr",
        total_amount: normalizedAmount.toFixed(2),
        tx_ref: tx_ref,
      },
      message: "Withdrawal request",
    };

    transaction = new Transaction({
      userId: user._id,
      type: TransactionType.WITHDRAWAL,
      amount: normalizedAmount,
      addispayNonce: tx_ref, // Use tx_ref to match resource_id
      status: TransactionStatus.PENDING,
      description: `request Withdrawal of ${normalizedAmount} coins`,
      reference: tx_ref,
      metadata: payoutData.data,
    });

    await transaction.save();

    logger.info("Wallet deducted for withdrawal", {
      userId: user._id,
      amount: normalizedAmount,
      newWalletBalance: updatedUserWallet?.wallet,
    });

    const payoutResponse = await directPayout(payoutData);
    logger.debug("AddisPay payout response received", {
      userId: user._id,
      status_code: payoutResponse?.status_code,
      message: payoutResponse?.message,
    });

    // Only treat as pending (await webhook) if exact success message and status_code 913
    const isAddisPayPendingSuccess =
      payoutResponse?.status_code === 913 &&
      payoutResponse?.message === ADDISPAY_PAYOUT_SUCCESS_MESSAGE;

    if (!isAddisPayPendingSuccess) {
      // Refund immediately for any non-913 or different message, even if HTTP 200
      await User.updateOne(
        { _id: user._id },
        { $inc: { wallet: normalizedAmount } }
      );
      transaction.status = TransactionStatus.FAILED;
      await transaction.save();
      walletDebited = false;
      const rollbackWallet = await User.findById(user._id)
        .select("wallet")
        .lean();
      logger.info("Wallet rolled back due to non-913/OK payout response", {
        userId: user._id,
        amount: normalizedAmount,
        newWalletBalance: rollbackWallet?.wallet,
        providerResponse: payoutResponse,
      });
      // Return provider payload as-is to the client
      return res.status(200).json(payoutResponse);
    }

    // Success 913 -> keep pending and wait for webhook
    const responsePayload = {
      status: "success",
      message:
        "Withdrawal has been initiated successfully. Waiting for provider confirmation.",
      payout_status: "pending",
      nonce: nonce,
      tx_ref: tx_ref,
      transaction_id: transaction._id,
    };

    if (autoReleasedWithdrawalId) {
      responsePayload.auto_released_transaction_id = autoReleasedWithdrawalId;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    const isProvider = error && error.isProviderError;
    logger.error("Withdrawal failed", {
      error: error.message,
      provider: isProvider ? "AddisPay" : undefined,
      code: error.code,
    });

    if (!isProvider && error.message.includes("Invalid payment method")) {
      return res.status(400).json({
        message: "Invalid payment method. Use 'telebirr', 'cbe', or 'mpesa'",
      });
    }

    // On any error at this stage, ensure wallet rollback and transaction marked FAILED
    try {
      if (walletDebited) {
        await User.updateOne(
          { _id: user._id },
          { $inc: { wallet: normalizedAmount } }
        );
        walletDebited = false;
      }
      if (
        transaction &&
        !transaction.isNew &&
        transaction.status === TransactionStatus.PENDING
      ) {
        transaction.status = TransactionStatus.FAILED;
        await transaction.save();
      }
      const rollbackWallet = await User.findById(user._id)
        .select("wallet")
        .lean();
      logger.info("Wallet rolled back due to payout error/exception", {
        userId: user._id,
        amount: normalizedAmount,
        transactionRef: tx_ref || req?.body?.tx_ref,
        newWalletBalance: rollbackWallet?.wallet,
      });
    } catch (rbErr) {
      logger.error("Rollback after payout error failed", {
        error: rbErr.message,
      });
    }

    const statusCode =
      (isProvider && error.httpStatus) ||
      (isProvider && httpFromProviderCode(error.code)) ||
      400;
    if (isProvider && (error.details || error.raw)) {
      // Return provider error payload as-is
      return res.status(statusCode).json(error.details || error.raw);
    }
    return res.status(statusCode).json({ message: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const { uuid } = req.query;
    if (!uuid) {
      throw new Error("UUID is required");
    }
    const statusResponse = await checkStatus(uuid);
    res.status(200).json({
      status: "success",
      data: statusResponse,
    });
  } catch (error) {
    const isProvider = error && error.isProviderError;
    const statusCode =
      (isProvider && error.httpStatus) ||
      (isProvider && httpFromProviderCode(error.code)) ||
      400;
    logger.error("Status check failed", {
      error: error.message,
      code: error.code,
    });
    if (isProvider && (error.details || error.raw)) {
      return res.status(statusCode).json(error.details || error.raw);
    }
    return res.status(statusCode).json({ message: error.message });
  }
};

const depositSuccessCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const transaction = await handleDepositSuccessCallback(callbackData, req.io);
    logger.info("Deposit success callback processed", {
      transactionId: transaction._id,
      status: transaction.status,
      nonce: callbackData.nonce,
    });
    res.status(200).json({
      success: true,
      transactionId: transaction._id,
      status: transaction.status,
    });
  } catch (error) {
    logger.error("Deposit success callback error", {
      error: error.message,
      data: req.body,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const depositFailureCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const transaction = await handleDepositFailureCallback(callbackData);
    logger.info("Deposit failure callback processed", {
      transactionId: transaction._id,
      status: transaction.status,
      nonce: callbackData.nonce,
    });
    res.status(200).json({
      success: true,
      transactionId: transaction._id,
      status: transaction.status,
    });
  } catch (error) {
    logger.error("Deposit failure callback error", {
      error: error.message,
      data: req.body,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const withdrawalCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const transaction = await handleWithdrawalCallback(callbackData, req.io);
    logger.info("Withdrawal callback processed", {
      transactionId: transaction._id,
      status: transaction.status,
      resource_id: callbackData.resource_id,
    });
    res.status(200).json({
      success: true,
      transactionId: transaction._id,
      status: transaction.status,
    });
  } catch (error) {
    logger.error("Withdrawal callback error", {
      error: error.message,
      data: req.body,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  deposit,
  withdraw,
  getStatus,
  depositSuccessCallback,
  depositFailureCallback,
  withdrawalCallback,
};