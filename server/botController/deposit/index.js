const {
  handleDeposit,
} = require("./deposit");
const {
  handleOnlineDeposit,
  handleOnlineDepositSubmit,
} = require("./onlineDeposit");
const { handleManualDeposit, handleReceiptUpload } = require("./manualDeposit");
const {
  handleAutomaticDeposit,
  handleAutomaticDepositSubmit,
} = require("./automaticDeposit");

module.exports = {
  handleDeposit,
  handleManualDeposit,
  handleReceiptUpload,
  handleOnlineDeposit,
  handleOnlineDepositSubmit,
  handleAutomaticDeposit,
  handleAutomaticDepositSubmit,
};