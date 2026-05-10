const { isEthiopianPhone, getAddisPayPhoneFormat } = require("../utils/phoneUtils");

const validateDeposit = (req, res, next) => {
  const { amount, phone_number } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  // Convert to international format for validation
  const internationalPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
  
  if (!isEthiopianPhone(internationalPhone)) {
    return res.status(400).json({ 
      error: "AddisPay only supports Ethiopian phone numbers. Use format: 09xxxxxxxx, 07xxxxxxxx, or +251xxxxxxxxx" 
    });
  }
  
  // Convert to AddisPay format (without +)
  const addisPayPhone = getAddisPayPhoneFormat(internationalPhone);
  if (!addisPayPhone || !addisPayPhone.startsWith("251") || addisPayPhone.length !== 12) {
    return res.status(400).json({ error: "Invalid Ethiopian phone number format" });
  }
  
  // Store the AddisPay format for the API call
  req.body.addisPayPhone = addisPayPhone;
  next();
};

const validateWithdraw = (req, res, next) => {
  const { amount, phone_number } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  // Convert to international format for validation
  const internationalPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
  
  if (!isEthiopianPhone(internationalPhone)) {
    return res.status(400).json({ 
      error: "AddisPay only supports Ethiopian phone numbers. Use format: 09xxxxxxxx, 07xxxxxxxx, or +251xxxxxxxxx" 
    });
  }
  
  // Convert to AddisPay format (without +)
  const addisPayPhone = getAddisPayPhoneFormat(internationalPhone);
  if (!addisPayPhone || !addisPayPhone.startsWith("251") || addisPayPhone.length !== 12) {
    return res.status(400).json({ error: "Invalid Ethiopian phone number format" });
  }
  
  // Store the AddisPay format for the API call
  req.body.addisPayPhone = addisPayPhone;
  next();
};

module.exports = {
  deposit: validateDeposit,
  withdraw: validateWithdraw,
};
