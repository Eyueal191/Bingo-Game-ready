const User = require("../models/userModels");

const restrictAccess = (requiredGames = null, requireAll = false) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select(
        "role gamePermissions"
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin always has full access
      if (user.role === "admin") {
        return next();
      }

      // Manager has access to all game management
      if (user.role === "manager") {
        return next();
      }

      // Finance and secretary can view but not manage game-specific settings
      if (["finance", "secretary"].includes(user.role)) {
        // They can access dashboards but not game-specific management
        if (!requiredGames || requiredGames.length === 0) {
          return next();
        }
        // For game-specific routes, deny access unless they have explicit permissions
      }

      if (user.role !== "game_manager") {
        return res.status(403).json({
          message: "Unauthorized: Requires admin, manager, or game_manager role",
        });
      }

      if (requiredGames) {
        const permissionsToCheck = Array.isArray(requiredGames)
          ? requiredGames
          : [requiredGames];

        const hasPermission = requireAll
          ? permissionsToCheck.every((game) => user.gamePermissions[game])
          : permissionsToCheck.some((game) => user.gamePermissions[game]);

        if (!hasPermission) {
          return res.status(403).json({
            message: `Unauthorized: Requires ${requireAll ? "all of" : "at least one of"
              } the following permissions: ${permissionsToCheck.join(", ")}`,
          });
        }
      }

      next();
    } catch (error) {
      require("../utils/winstonLogger").error(
        "Access restriction failed:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  };
};

module.exports = restrictAccess;

// restrictAccess(["bingo", "keshkesh"], true) used for both permission must
// restrictAccess(["bingo", "keshkesh"]) used for at least one permission
// restrictAccess(["bingo"]) used for only bingo permission
// restrictAccess(["keshkesh"]) used for only keshkesh permission
// restrictAccess() used for no permission required, only admin/manager/game_manager
