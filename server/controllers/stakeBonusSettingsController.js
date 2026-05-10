const StakeBonusSettings = require("../models/stakeBonusSettings");
const GameRoom = require("../models/gameRoom");

// Get all stake bonus settings
exports.getAllStakeBonuses = async (req, res) => {
  try {
    const settings = await StakeBonusSettings.find({});
    res.status(200).json(settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch stake bonus settings", error });
  }
};

// Get bonus settings for a specific stake
exports.getStakeBonus = async (req, res) => {
  try {
    const { stakeAmount } = req.params;
    const setting = await StakeBonusSettings.findOne({
      stakeAmount: parseFloat(stakeAmount),
    });
    if (!setting)
      return res
        .status(404)
        .json({ message: "No bonus settings for this stake" });
    res.status(200).json(setting);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch stake bonus setting", error });
  }
};

// Create or update bonus settings for a stake
exports.upsertStakeBonus = async (req, res) => {
  try {
    const {
      stakeAmount,
      bonusEnabled,
      bonusAmount,
      bonusDescription,
      systemCommission,
      robotEnabled,
      robotMinCards,
      robotMaxCards,
      robotWinningPercent,
    } = req.body;

    if (typeof stakeAmount !== "number") {
      return res
        .status(400)
        .json({ message: "stakeAmount is required and must be a number" });
    }

    const existing = await StakeBonusSettings.findOne({ stakeAmount });

    const parsedMin =
      robotMinCards !== undefined && robotMinCards !== null
        ? Number(robotMinCards)
        : existing?.robotMinCards;
    const parsedMax =
      robotMaxCards !== undefined && robotMaxCards !== null
        ? Number(robotMaxCards)
        : existing?.robotMaxCards;

    if (
      parsedMin !== undefined &&
      (!Number.isInteger(parsedMin) || parsedMin < 1)
    ) {
      return res.status(400).json({
        message: "robotMinCards must be an integer greater than or equal to 1",
      });
    }

    if (
      parsedMax !== undefined &&
      (!Number.isInteger(parsedMax) || parsedMax < 1)
    ) {
      return res.status(400).json({
        message: "robotMaxCards must be an integer greater than or equal to 1",
      });
    }

    const resolvedMin = parsedMin ?? 1;
    const resolvedMax = parsedMax ?? Math.max(resolvedMin, 1);

    if (resolvedMin > resolvedMax) {
      return res.status(400).json({
        message: "robotMinCards cannot be greater than robotMaxCards",
      });
    }

    const update = {};

    if (typeof bonusEnabled === "boolean") update.bonusEnabled = bonusEnabled;
    if (bonusAmount !== undefined) {
      const parsedBonusAmount = Number(bonusAmount);
      if (Number.isNaN(parsedBonusAmount)) {
        return res.status(400).json({
          message: "bonusAmount must be a valid number",
        });
      }
      update.bonusAmount = parsedBonusAmount;
    }
    if (bonusDescription !== undefined)
      update.bonusDescription = bonusDescription;
    if (systemCommission !== undefined) {
      const parsedCommission = Number(systemCommission);
      if (Number.isNaN(parsedCommission)) {
        return res.status(400).json({
          message: "systemCommission must be a valid number",
        });
      }
      update.systemCommission = parsedCommission;
    }
    if (typeof robotEnabled === "boolean") update.robotEnabled = robotEnabled;

    update.robotMinCards = resolvedMin;
    update.robotMaxCards = resolvedMax;
if (robotWinningPercent !== undefined) {
      const parsedWinningPercent = Number(robotWinningPercent);
      if (
        Number.isNaN(parsedWinningPercent) ||
        parsedWinningPercent < 0 ||
        parsedWinningPercent > 100
      ) {
        return res.status(400).json({
          message: "robotWinningPercent must be between 0 and 100",
        });
      }
      update.robotWinningPercent = parsedWinningPercent;
    }
    const setting = await StakeBonusSettings.findOneAndUpdate(
      { stakeAmount },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const roomUpdate = {};
    if (update.bonusEnabled !== undefined)
      roomUpdate.bonusEnabled = update.bonusEnabled;
    if (update.bonusAmount !== undefined)
      roomUpdate.bonusAmount = update.bonusAmount;
    if (update.bonusDescription !== undefined)
      roomUpdate.bonusDescription = update.bonusDescription;

    if (Object.keys(roomUpdate).length > 0) {
      await GameRoom.updateMany(
        {
          stakeAmount,
          status: { $ne: "completed" },
        },
        {
          $set: roomUpdate,
        }
      );
    }

    res.status(200).json({ message: "Stake settings updated", setting });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update stake bonus setting", error });
  }
};


// Get all commission settings
exports.getAllCommissions = async (req, res) => {
  try {
    const settings = await StakeBonusSettings.find(
      {},
      "stakeAmount systemCommission"
    );
    res.status(200).json(settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch commission settings", error });
  }
};

// Get commission for a specific stake
exports.getStakeCommission = async (req, res) => {
  try {
    const { stakeAmount } = req.params;
    const setting = await StakeBonusSettings.findOne(
      {
        stakeAmount: parseFloat(stakeAmount),
      },
      "stakeAmount systemCommission"
    );

    if (!setting) {
      // Return default commission if no setting exists
      return res.status(200).json({
        stakeAmount: parseFloat(stakeAmount),
        systemCommission: 0.2,
      });
    }

    res.status(200).json(setting);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch stake commission", error });
  }
};

// Create or update commission for a stake (commission only)
exports.upsertStakeCommission = async (req, res) => {
  try {
    const { stakeAmount, systemCommission } = req.body;

    if (typeof stakeAmount !== "number") {
      return res
        .status(400)
        .json({ message: "stakeAmount is required and must be a number" });
    }

    if (
      typeof systemCommission !== "number" ||
      systemCommission < 0 ||
      systemCommission > 1
    ) {
      return res
        .status(400)
        .json({ message: "systemCommission must be a number between 0 and 1" });
    }

    // Only update the systemCommission field, preserve other fields
    const setting = await StakeBonusSettings.findOneAndUpdate(
      { stakeAmount },
      { systemCommission },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true, // This will set default values for other fields
      }
    );

    // Update all waiting/starting rooms of this stake with the new commission
    await GameRoom.updateMany(
      {
        stakeAmount,
        status: { $in: ["waiting", "starting"] },
      },
      {
        $set: { systemCommission },
      }
    );

    res.status(200).json({
      message: "Commission updated successfully",
      setting: { stakeAmount, systemCommission },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update stake commission", error });
  }
};