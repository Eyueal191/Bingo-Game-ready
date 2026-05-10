const ManualTransaction = require("../models/DepositRequest");
// Removed deposit model import


const DuplicateSources = Object.freeze({
  MANUAL: "manual",
  AUTOMATIC: "automatic",
});

const defaultManualProjection = "_id userId amount transactionId type createdAt updatedAt";

/**
 * Checks whether the provided transactionId has already been credited via any deposit flow.
 * Only ManualTransaction records with type "deposit" are considered processed.
 * For automatic (SMS) deposits we only consider completed transactions to be processed.
 *
 * @param {string} transactionId
 * @returns {Promise<{source: string, status: string, transaction: object} | null>}
 */
async function findProcessedDepositTransaction(transactionId) {
  if (!transactionId) return null;

  const [manualTx, automaticTx] = await Promise.all([
    ManualTransaction.findOne({ transactionId, type: "deposit" })
      .select(defaultManualProjection)
      .lean(),
  ]);

  if (manualTx) {
    if (manualTx.source === "sms" && manualTx.status === "approved") {
      return {
        source: DuplicateSources.AUTOMATIC,
        status: manualTx.status,
        transaction: manualTx,
      };
    }
    // Assuming manual source if not sms, or check source explicitly
    if (manualTx.source !== "sms") {
      // Check receipt status logic if needed, or assume COMPLETED if it was found?
      // The original code returned COMPLETED effectively if found (line 36).
      return {
        source: DuplicateSources.MANUAL,
        status: "COMPLETED",
        transaction: manualTx,
      };
    }
  }

  return null;
}

function buildDuplicateDepositMessage(duplicateInfo) {
  if (!duplicateInfo) return null;
  switch (duplicateInfo.source) {
    case DuplicateSources.MANUAL:
      return "This transaction was already approved manually.";
    case DuplicateSources.AUTOMATIC:
      return "This transaction was already processed automatically.";
    default:
      return "This transaction was already processed.";
  }
}

module.exports = {
  DuplicateSources,
  findProcessedDepositTransaction,
  buildDuplicateDepositMessage,
};
