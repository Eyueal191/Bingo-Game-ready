// server/socketController/bingoCardHandler/index.js
// Re‑export all public functions from submodules and sharedGameState to match the original exports

// Import from submodules
const { callBingoNumber, startNumberCallingLoop, stopNumberCallingLoop } = require('./numberCalling');
const { registerManualBingoClaim } = require('./manualBingo');
const { startSystemReservationBot, stopSystemReservationBot } = require('./robotReservation');

// Import from utils (originally exported)
const { checkForWin } = require('../../utils');

// Import from sharedGameState (originally exported)
const {
  numberCallingIntervals,
  numberCallingInProgress
} = require('../sharedGameState');

// Also export these if needed by other parts of the app (they were in the original)
// Note: resolveRobotDrawOptions and checkForWinners were not exported originally, so we omit them.

module.exports = {
  // From numberCalling
  callBingoNumber,
  startNumberCallingLoop,
  stopNumberCallingLoop,
  numberCallingIntervals,

  // From manualBingo
  registerManualBingoClaim,

  // From robotReservation
  startSystemReservationBot,
  stopSystemReservationBot,

  // From utils
  checkForWin,

  // From sharedGameState
  numberCallingInProgress
};