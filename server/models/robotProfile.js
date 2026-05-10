const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const robotProfileSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            unique: true,
        },
        names: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const RobotProfile = mongoose.model("RobotProfile", robotProfileSchema);
module.exports = RobotProfile;
