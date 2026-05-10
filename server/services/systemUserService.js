const User = require("../models/userModels");

/**
 * Get system user ObjectIds (robots/bots)
 * Identifies robots by telegramId starting with "ROBOT_" or role "robot" or isRobot true
 * @returns {Promise<ObjectId[]>} Array of ObjectIds for system users
 */
const getSystemUserObjectIds = async () => {
  try {
    const systemUsers = await User.find({
      $or: [
        { role: "robot" },
        { isRobot: true }
      ]
    }).select('_id').lean();
    return systemUsers.map(user => user._id);
  } catch (error) {
    console.error("Error fetching system user ObjectIds:", error.message);
    return [];
  }
};

module.exports = {
  getSystemUserObjectIds
};