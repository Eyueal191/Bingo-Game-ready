const clampNumber = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

// Returns { bonusAmount, creditedAmount, percentApplied }
// - bonusAmount: extra credited amount
// - creditedAmount: amount + bonusAmount
// - percentApplied: normalized percent actually used
const computeDepositBonus = (amount, depositBonusConfig) => {
  const baseAmount = Number(amount);
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return { bonusAmount: 0, creditedAmount: 0, percentApplied: 0 };
  }

  const enabled = Boolean(depositBonusConfig?.enabled);
  if (!enabled) {
    return { bonusAmount: 0, creditedAmount: baseAmount, percentApplied: 0 };
  }

  const percent = clampNumber(depositBonusConfig?.percent, 0, 100);
  if (!percent) {
    return { bonusAmount: 0, creditedAmount: baseAmount, percentApplied: 0 };
  }

  // Round to 2 decimals to avoid floating point noise.
  const bonusAmount = Math.round((baseAmount * (percent / 100)) * 100) / 100;
  const creditedAmount = Math.round((baseAmount + bonusAmount) * 100) / 100;
  return { bonusAmount, creditedAmount, percentApplied: percent };
};

module.exports = {
  computeDepositBonus,
};
