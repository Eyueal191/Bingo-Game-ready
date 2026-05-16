const validateDeposit = (req, res, next) => {
  const { amount, phone_number } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (
    !phone_number ||
    !phone_number.startsWith("251") ||
    phone_number.length !== 12
  ) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  next();
};

const validateWithdraw = (req, res, next) => {
  const { amount, phone_number } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (
    !phone_number ||
    !phone_number.startsWith("251") ||
    phone_number.length !== 12
  ) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  next();
};

module.exports = {
  deposit: validateDeposit,
  withdraw: validateWithdraw,
};
