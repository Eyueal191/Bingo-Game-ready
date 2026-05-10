const ludoService = require("../services/ludoService");
const LudoRoom = require("../models/LudoRoom");
const LudoGame = require("../models/LudoGame");
const logger = require("../utils/winstonLogger");

/**
 * Create a new Ludo room
 * POST /api/ludo/rooms/create
 */
const createRoom = async (req, res) => {
    try {
        const { stakeAmount, mode, playerCount } = req.body;
        const userId = req.user?._id || req.user?.id;

        const room = await ludoService.createRoom({
            userId,
            stakeAmount: parseFloat(stakeAmount),
            mode: mode || "classic",
            playerCount: parseInt(playerCount) || 2,
        });

        res.status(201).json({ success: true, room });
    } catch (error) {
        logger.error("Error creating Ludo room", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Join a room
 * POST /api/ludo/rooms/join
 */
const joinRoom = async (req, res) => {
    try {
        const { roomId, stakeAmount, mode, playerCount } = req.body;
        const userId = req.user?._id || req.user?.id;

        const room = await ludoService.joinRoom({
            userId,
            roomId,
            stakeAmount: stakeAmount ? parseFloat(stakeAmount) : undefined,
            mode,
            playerCount: playerCount ? parseInt(playerCount) : undefined,
        });

        res.status(200).json({ success: true, room });
    } catch (error) {
        logger.error("Error joining Ludo room", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * List available rooms
 * GET /api/ludo/rooms
 */
const listRooms = async (req, res) => {
    try {
        const { stakeAmount, mode, playerCount, status } = req.query;
        const filters = {};
        if (stakeAmount) filters.stakeAmount = stakeAmount;
        if (mode) filters.mode = mode;
        if (playerCount) filters.playerCount = playerCount;

        let rooms;
        if (status === "all" || req.user?.role === "admin") {
            rooms = await ludoService.getAllRooms(filters);
        } else {
            rooms = await ludoService.getAvailableRooms(filters);
        }

        res.status(200).json({ success: true, rooms });
    } catch (error) {
        logger.error("Error listing Ludo rooms", error);
        res.status(500).json({ success: false, message: "Failed to list rooms" });
    }
};

/**
 * Get room by ID
 * GET /api/ludo/rooms/:roomId
 */
const getRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await ludoService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        res.status(200).json({ success: true, room });
    } catch (error) {
        logger.error("Error getting Ludo room", error);
        res.status(500).json({ success: false, message: "Failed to get room" });
    }
};

/**
 * Cancel room (admin)
 * POST /api/ludo/rooms/:roomId/cancel
 */
const cancelRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await ludoService.cancelRoom(roomId, "Admin cancellation");
        res.status(200).json({ success: true, room });
    } catch (error) {
        logger.error("Error cancelling Ludo room", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Get all Ludo rooms for admin dashboard
 * GET /api/ludo/admin/rooms
 */
const adminListRooms = async (req, res) => {
    try {
        const { status, stakeAmount, mode, page = 1, limit = 25 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (stakeAmount) query.stakeAmount = parseFloat(stakeAmount);
        if (mode) query.mode = mode;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [rooms, total] = await Promise.all([
            LudoRoom.find(query)
                .populate("players.userId", "fullName phone")
                .populate("winnerUserId", "fullName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            LudoRoom.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            rooms,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        logger.error("Error in admin list Ludo rooms", error);
        res.status(500).json({ success: false, message: "Failed to list rooms" });
    }
};

/**
 * Get Ludo game details by room
 * GET /api/ludo/admin/games/:roomId
 */
const adminGetGame = async (req, res) => {
    try {
        const { roomId } = req.params;
        const game = await LudoGame.findOne({ roomId })
            .populate("players.userId", "fullName phone");
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }
        const room = await LudoRoom.findById(roomId)
            .populate("players.userId", "fullName phone")
            .populate("winnerUserId", "fullName");

        res.status(200).json({ success: true, game, room });
    } catch (error) {
        logger.error("Error getting Ludo game for admin", error);
        res.status(500).json({ success: false, message: "Failed to get game" });
    }
};

/**
 * Ludo stats summary for admin dashboard
 * GET /api/ludo/admin/stats
 */
const adminGetStats = async (req, res) => {
    try {
        const [
            totalRooms,
            activeRooms,
            completedGames,
            cancelledGames,
        ] = await Promise.all([
            LudoRoom.countDocuments(),
            LudoRoom.countDocuments({ status: { $in: ["waiting", "playing"] } }),
            LudoRoom.countDocuments({ status: "ended" }),
            LudoRoom.countDocuments({ status: "cancelled" }),
        ]);

        // Revenue from completed games
        const revenueAgg = await LudoRoom.aggregate([
            { $match: { status: "ended" } },
            {
                $group: {
                    _id: null,
                    totalStaked: { $sum: { $multiply: ["$stakeAmount", "$playerCount"] } },
                    totalWon: { $sum: "$winAmount" },
                    totalGames: { $sum: 1 },
                },
            },
        ]);

        const revenue = revenueAgg[0] || { totalStaked: 0, totalWon: 0, totalGames: 0 };
        const totalCommission = revenue.totalStaked - revenue.totalWon;

        res.status(200).json({
            success: true,
            stats: {
                totalRooms,
                activeRooms,
                completedGames,
                cancelledGames,
                totalStaked: revenue.totalStaked,
                totalWon: revenue.totalWon,
                totalCommission,
            },
        });
    } catch (error) {
        logger.error("Error getting Ludo stats", error);
        res.status(500).json({ success: false, message: "Failed to get stats" });
    }
};

module.exports = {
    createRoom,
    joinRoom,
    listRooms,
    getRoom,
    cancelRoom,
    adminListRooms,
    adminGetGame,
    adminGetStats,
};
