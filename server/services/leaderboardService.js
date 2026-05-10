const mongoose = require("mongoose");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModels");
const GameRoom = require("../models/gameRoom");
const StakeBonusSettings = require("../models/stakeBonusSettings");
const RobotProfile = require("../models/robotProfile");
const { getSystemUserObjectIds } = require("./systemUserService");

const GAME_ROOM_COLLECTION =
    (GameRoom.collection && GameRoom.collection.collectionName) || "gamerooms";

const parseStakeAmount = (raw) => {
    if (raw === undefined || raw === null || raw === "" || raw === "all") {
        return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

const clampLimit = (raw, fallback, max) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(Math.floor(parsed), max);
};

const parseDateInput = (raw, isStart) => {
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    if (isStart) {
        date.setHours(0, 0, 0, 0);
    } else {
        date.setHours(23, 59, 59, 999);
    }
    return date;
};

const resolveDateRange = (startRaw, endRaw, options = {}) => {
    const now = new Date();

    const deriveDefaultStart = () => {
        if (options.defaultStart instanceof Date) {
            const copy = new Date(options.defaultStart);
            copy.setHours(0, 0, 0, 0);
            return copy;
        }
        if (options.defaultStart) {
            const parsed = parseDateInput(options.defaultStart, true);
            if (parsed) return parsed;
        }
        // Default to today
        const fallback = new Date();
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    };

    const deriveDefaultEnd = () => {
        if (options.defaultEnd instanceof Date) {
            const copy = new Date(options.defaultEnd);
            copy.setHours(23, 59, 59, 999);
            return copy;
        }
        if (options.defaultEnd) {
            const parsed = parseDateInput(options.defaultEnd, false);
            if (parsed) return parsed;
        }
        const fallback = new Date();
        fallback.setHours(23, 59, 59, 999);
        return fallback;
    };

    const defaultStart = deriveDefaultStart();
    const defaultEnd = deriveDefaultEnd();

    let start = parseDateInput(startRaw, true) || defaultStart;
    let end = parseDateInput(endRaw, false) || defaultEnd;

    if (start > end) {
        [start, end] = [end, start];
    }

    return { start, end };
};

const formatPeriodLabel = (start, end) => {
    if (!start || !end) return null;
    if (
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate()
    ) {
        return start.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }
    if (
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth()
    ) {
        return start.toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    const startLabel = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const endLabel = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    return `${startLabel} - ${endLabel}`;
};

const buildTimeRemaining = (end) => {
    if (!end) return null;
    const ms = end.getTime() - Date.now();
    if (ms <= 0) {
        return {
            totalMilliseconds: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
        };
    }
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
        totalMilliseconds: ms,
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
    };
};

const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return null;
    return `****${phone.slice(-4)}`;
};

const formatDisplayName = (fullName, phone) => {
    const base = (fullName || "Player").trim().split(" ")[0] || "Player";
    if (!phone || phone.length < 4) {
        return base;
    }
    return `${base}(*${phone.slice(-4)})`;
};

const collectStakeOptions = async () => {
    const settings = await StakeBonusSettings.find({}, { stakeAmount: 1 })
        .sort({ stakeAmount: 1 })
        .lean();
    const unique = new Set();
    settings.forEach((entry) => {
        if (typeof entry.stakeAmount === "number") {
            unique.add(entry.stakeAmount);
        }
    });
    return Array.from(unique).sort((a, b) => a - b);
};

const sanitizePlayerForUser = (player) => {
    const displayName = formatDisplayName(player.fullName, player.phone);
    return {
        rank: player.rank,
        displayName,
        firstName: displayName.split("(")[0],
        maskedPhone: maskPhone(player.phone),
        gamesPlayed: player.gamesPlayed,
        wins: player.winCount,
        winRate: player.winRate,
        totalPrize: player.totalPrize,
        biggestWin: player.biggestWin,
        averagePrize: player.averagePrize,
        stakeBreakdown: player.stakeBreakdown,
        isCurrentUser: Boolean(player.isCurrentUser),
        points: player.gamesPlayed * 2,
    };
};

const getRobotNamesMap = async (systemUserObjectIds) => {
    if (!systemUserObjectIds || systemUserObjectIds.length === 0) return new Map();
    const profiles = await RobotProfile.find({
        userId: { $in: systemUserObjectIds },
    }).lean();
    const map = new Map();
    profiles.forEach((p) => {
        if (p.names && p.names.length > 0) {
            map.set(p.userId.toString(), p.names);
        }
    });
    return map;
};

const getRandomRobotName = (names) => {
    if (!names || names.length === 0) return "Robot Player";
    return names[Math.floor(Math.random() * names.length)];
};

const getRandomRobotPhone = () => {
    const prefixes = ["0911", "0912", "0913", "0914", "0921", "0922", "0930", "0944"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    return `${prefix}${suffix}`;
};

const buildFallbackPlayer = async ({
    userId,
    stakeAmount,
    startDate,
    endDate,
    systemUserObjectIds,
}) => {
    if (!userId) return null;

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : null;
    if (!userObjectId) {
        return null;
    }

    if (
        systemUserObjectIds.some((id) => id.toString() === userObjectId.toString())
    ) {
        return null;
    }

    const userDoc = await User.findById(userObjectId)
        .select("fullName phone telegramId")
        .lean();
    if (!userDoc) {
        return null;
    }

    const reservationMatch = {
        status: "completed",
        userId: userObjectId,
    };

    const pipeline = [
        { $match: reservationMatch },
        {
            $lookup: {
                from: GAME_ROOM_COLLECTION,
                localField: "roomId",
                foreignField: "_id",
                as: "room",
            },
        },
        { $unwind: "$room" },
        { $match: { "room.status": "completed" } },
    ];

    if (typeof stakeAmount === "number") {
        pipeline.push({ $match: { "room.stakeAmount": stakeAmount } });
    }

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        pipeline.push({ $match: { "room.completedAt": dateFilter } });
    }

    pipeline.push(
        {
            $group: {
                _id: "$userId",
                rooms: { $addToSet: "$room._id" },
                stakeRecords: {
                    $push: {
                        stakeAmount: "$room.stakeAmount",
                    },
                },
            },
        },
        {
            $project: {
                totalGamesPlayed: { $size: "$rooms" },
                stakeRecords: 1,
            },
        }
    );

    const [stats] = await Reservation.aggregate(pipeline);
    const stakeMap = new Map();
    (stats?.stakeRecords || []).forEach(({ stakeAmount: stakeValue }) => {
        const record = stakeMap.get(stakeValue) || {
            stakeAmount: stakeValue,
            gamesPlayed: 0,
            wins: 0,
            totalPrize: 0,
        };
        record.gamesPlayed += 1;
        stakeMap.set(stakeValue, record);
    });

    return {
        userId: userObjectId.toString(),
        rank: null,
        fullName: userDoc.fullName || "Player",
        phone: userDoc.phone || null,
        telegramId: userDoc.telegramId || null,
        totalPrize: 0,
        winCount: 0,
        gamesPlayed: stats?.totalGamesPlayed || 0,
        winRate: 0,
        lastWinAt: null,
        stakeBreakdown: Array.from(stakeMap.values()).sort(
            (a, b) => a.stakeAmount - b.stakeAmount
        ),
        biggestWin: 0,
        averagePrize: 0,
        points: (stats?.totalGamesPlayed || 0) * 2,
        isCurrentUser: true,
    };
};

const buildLeaderboardCore = async ({
    stakeAmount,
    startDate,
    endDate,
    includeCurrentUserId,
    includeBots = false,
}) => {
    const systemUserObjectIds = await getSystemUserObjectIds();
    const systemUserIdStrings = systemUserObjectIds.map((id) => id.toString());
    console.log(`[DEBUG] buildLeaderboardCore: Found ${systemUserObjectIds.length} system users (robots). includeBots=${includeBots}`);

    const robotNamesMap = includeBots
        ? await getRobotNamesMap(systemUserObjectIds)
        : new Map();

    const matchStage = {
        status: "completed",
        winners: { $ne: [] },
    };

    if (typeof stakeAmount === "number") {
        matchStage.stakeAmount = stakeAmount;
    }

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        matchStage.completedAt = dateFilter;
    }

    const pipeline = [
        { $match: matchStage },
        {
            $project: {
                _id: 1,
                winners: 1,
                completedAt: 1,
                stakeAmount: 1,
            },
        },
        { $unwind: "$winners" },
    ];

    if (!includeBots && systemUserObjectIds.length) {
        pipeline.push({
            $match: { "winners.userId": { $nin: systemUserObjectIds } },
        });
    }

    pipeline.push(
        {
            $group: {
                _id: { userId: "$winners.userId", gameId: "$_id" },
                totalPrize: { $sum: "$winners.prize" },
                stakeAmount: { $first: "$stakeAmount" },
                completedAt: { $first: "$completedAt" },
            },
        },
        {
            $group: {
                _id: "$_id.userId",
                totalPrize: { $sum: "$totalPrize" },
                winCount: { $sum: 1 },
                games: {
                    $push: {
                        gameId: "$_id.gameId",
                        stakeAmount: "$stakeAmount",
                        prize: "$totalPrize",
                        completedAt: "$completedAt",
                    },
                },
                lastWinAt: { $max: "$completedAt" },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: "$user" },
        {
            $project: {
                userId: "$_id",
                totalPrize: 1,
                winCount: 1,
                games: 1,
                lastWinAt: 1,
                fullName: "$user.fullName",
                phone: "$user.phone",
                telegramId: "$user.telegramId",
                isRobot: "$user.isRobot",
            },
        }
    );

    const winnersRaw = await GameRoom.aggregate(pipeline);
    const winMap = new Map(winnersRaw.map((w) => [w.userId.toString(), w]));

    const reservationMatch = {
        status: "completed",
    };
    if (!includeBots && systemUserObjectIds.length) {
        reservationMatch.userId = { $nin: systemUserObjectIds };
    }

    const reservationPipeline = [
        { $match: reservationMatch },
        {
            $lookup: {
                from: GAME_ROOM_COLLECTION,
                localField: "roomId",
                foreignField: "_id",
                as: "room",
            },
        },
        { $unwind: "$room" },
        { $match: { "room.status": "completed" } },
    ];

    if (typeof stakeAmount === "number") {
        reservationPipeline.push({
            $match: { "room.stakeAmount": stakeAmount },
        });
    }

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        reservationPipeline.push({
            $match: { "room.completedAt": dateFilter },
        });
    }

    reservationPipeline.push(
        {
            $group: {
                _id: "$userId",
                rooms: { $addToSet: "$room._id" },
                stakeRecords: {
                    $push: {
                        stakeAmount: "$room.stakeAmount",
                        cardCount: {
                            $size: {
                                $ifNull: ["$cardIds", []],
                            },
                        },
                    },
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: "$user" },
        {
            $project: {
                userId: "$_id",
                totalGamesPlayed: { $size: "$rooms" },
                stakeRecords: 1,
                fullName: "$user.fullName",
                phone: "$user.phone",
                telegramId: "$user.telegramId",
                isRobot: "$user.isRobot",
            },
        }
    );

    const participationMeta = await Reservation.aggregate(reservationPipeline);

    const participationMap = new Map(
        participationMeta.map((doc) => [doc._id.toString(), doc])
    );

    const players = [];
    const stakeSummaryMap = new Map();
    const uniqueGameIds = new Set();

    participationMeta.forEach((participation) => {
        const userIdStr = participation.userId.toString();
        const entry = winMap.get(userIdStr) || {
            userId: participation.userId,
            totalPrize: 0,
            winCount: 0,
            games: [],
            lastWinAt: null,
            fullName: participation.fullName,
            phone: participation.phone,
            telegramId: participation.telegramId,
            isRobot: participation.isRobot,
        };

        const totalPrize = Number(entry.totalPrize || 0);
        const gamesPlayed = participation.totalGamesPlayed || 0;
        const winRate = gamesPlayed
            ? Number(((entry.winCount / gamesPlayed) * 100).toFixed(2))
            : 0;

        const stakeParticipationMap = new Map();
        (participation?.stakeRecords || []).forEach(
            ({ stakeAmount: stake, cardCount }) => {
                const normalizedStake = Number(stake) || 0;
                const cardsReserved = Math.max(Number(cardCount) || 0, 0);
                const record = stakeParticipationMap.get(normalizedStake) || {
                    stakeAmount: normalizedStake,
                    reservations: 0,
                    cardsReserved: 0,
                };
                record.reservations += 1;
                record.cardsReserved += cardsReserved > 0 ? cardsReserved : 1;
                stakeParticipationMap.set(normalizedStake, record);
            }
        );

        const stakeWinMap = new Map();
        let biggestWin = 0;
        entry.games.forEach((game) => {
            const prizeValue = Number(game.prize || 0);
            if (prizeValue > biggestWin) {
                biggestWin = prizeValue;
            }
            uniqueGameIds.add(game.gameId.toString());
            const stat = stakeWinMap.get(game.stakeAmount) || {
                stakeAmount: game.stakeAmount,
                wins: 0,
                totalPrize: 0,
            };
            stat.wins += 1;
            stat.totalPrize += prizeValue;
            stakeWinMap.set(game.stakeAmount, stat);
        });

        stakeWinMap.forEach((winStat, stake) => {
            const normalizedStake = Number(stake) || 0;
            if (!stakeParticipationMap.has(normalizedStake)) {
                stakeParticipationMap.set(normalizedStake, {
                    stakeAmount: normalizedStake,
                    reservations: winStat.wins,
                    cardsReserved: winStat.wins,
                });
            }
        });

        const stakeBreakdown = Array.from(stakeParticipationMap.values())
            .map((entryStat) => {
                const winStat = stakeWinMap.get(entryStat.stakeAmount) || {
                    wins: 0,
                    totalPrize: 0,
                };
                const reservations = Number(entryStat.reservations || 0);
                const cardsReserved = Number(entryStat.cardsReserved || reservations);
                const breakdown = {
                    stakeAmount: entryStat.stakeAmount,
                    gamesPlayed: reservations,
                    cardsReserved,
                    wins: winStat.wins,
                    totalPrize: Number(winStat.totalPrize.toFixed(2)),
                    totalStake: Number((entryStat.stakeAmount * cardsReserved).toFixed(2)),
                };
                if (!stakeSummaryMap.has(entryStat.stakeAmount)) {
                    stakeSummaryMap.set(entryStat.stakeAmount, {
                        stakeAmount: entryStat.stakeAmount,
                        totalPrize: 0,
                        wins: 0,
                        gamesPlayed: 0,
                        cardsReserved: 0,
                        totalStake: 0,
                    });
                }
                const summaryEntry = stakeSummaryMap.get(entryStat.stakeAmount);
                summaryEntry.totalPrize += breakdown.totalPrize;
                summaryEntry.wins += breakdown.wins;
                summaryEntry.gamesPlayed += breakdown.gamesPlayed;
                summaryEntry.cardsReserved += breakdown.cardsReserved;
                summaryEntry.totalStake += breakdown.totalStake;
                return breakdown;
            })
            .sort((a, b) => a.stakeAmount - b.stakeAmount);

        const totalStakeRaw = stakeBreakdown.reduce((sum, entryStat) => {
            const stakeAmount = Number(entryStat.stakeAmount || 0);
            const cards = Number(entryStat.cardsReserved || entryStat.gamesPlayed || 0);
            return sum + stakeAmount * cards;
        }, 0);
        const totalStake = Number(totalStakeRaw.toFixed(2));
        const roundedPrize = Number(totalPrize.toFixed(2));
        if ((Number.isNaN(biggestWin) || biggestWin <= 0) && entry.winCount > 0) {
            biggestWin = totalPrize / entry.winCount;
        }
        const normalizedBiggestWin = Number(biggestWin.toFixed(2));
        const averagePrize = entry.winCount
            ? Number((totalPrize / entry.winCount).toFixed(2))
            : 0;
        const netEarnings = Number((roundedPrize - totalStake).toFixed(2));
        const amountLost = netEarnings < 0 ? Number(Math.abs(netEarnings).toFixed(2)) : 0;

        let fullName = entry.fullName || "Player";
        let phone = entry.phone || null;
        const isRobot = systemUserIdStrings.includes(userIdStr);

        if (isRobot) {
            if (includeBots) {
                const names = robotNamesMap.get(userIdStr);
                if (names) {
                    fullName = getRandomRobotName(names);
                }
                phone = getRandomRobotPhone();
            } else {
                // Should not happen if filtered earlier, but safety check
                return;
            }
        }

        const player = {
            userId: userIdStr,
            fullName,
            phone,
            telegramId: entry.telegramId || null,
            totalPrize: roundedPrize,
            winCount: entry.winCount,
            gamesPlayed,
            winRate,
            lastWinAt: entry.lastWinAt ? entry.lastWinAt.toISOString() : null,
            stakeBreakdown,
            biggestWin: normalizedBiggestWin,
            averagePrize,
            totalStake,
            netEarnings,
            amountLost,
            points: gamesPlayed * 2,
            isCurrentUser:
                !!includeCurrentUserId &&
                userIdStr === includeCurrentUserId.toString(),
            isRobot,
        };

        players.push(player);
    });

    players.sort((a, b) => {
        if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
        if (b.totalPrize !== a.totalPrize) return b.totalPrize - a.totalPrize;
        if (b.winCount !== a.winCount) return b.winCount - a.winCount;
        return a.userId.localeCompare(b.userId);
    });

    let currentRank = 0;
    let previousScore = null;
    players.forEach((player, index) => {
        const score = `${player.gamesPlayed}-${player.totalPrize}-${player.winCount}`;
        if (score !== previousScore) {
            currentRank = index + 1;
            previousScore = score;
        }
        player.rank = currentRank;
    });

    const totalCompletedGames = await GameRoom.countDocuments(matchStage);
    const totalPrizePaid = players.reduce(
        (sum, player) => sum + player.totalPrize,
        0
    );
    const totalStakeSpent = players.reduce(
        (sum, player) => sum + (player.totalStake || 0),
        0
    );
    const totalLoss = players.reduce(
        (sum, player) => sum + (player.amountLost || 0),
        0
    );
    const netEarningsSum = players.reduce(
        (sum, player) => sum + (player.netEarnings || 0),
        0
    );
    const stakeSummary = Array.from(stakeSummaryMap.values()).sort(
        (a, b) => a.stakeAmount - b.stakeAmount
    );

    let currentUser = null;
    if (includeCurrentUserId) {
        const currentIdStr = includeCurrentUserId.toString();
        currentUser =
            players.find((player) => player.userId === currentIdStr) || null;

        if (!currentUser) {
            currentUser = await buildFallbackPlayer({
                userId: includeCurrentUserId,
                stakeAmount,
                startDate,
                endDate,
                systemUserObjectIds,
            });
        }
    }

    return {
        players,
        currentUser,
        summary: {
            totalPlayers: players.length,
            totalPrize: Number(totalPrizePaid.toFixed(2)),
            totalStake: Number(totalStakeSpent.toFixed(2)),
            totalLoss: Number(totalLoss.toFixed(2)),
            netEarnings: Number(netEarningsSum.toFixed(2)),
            totalGames: totalCompletedGames,
            stakeSummary,
        },
        systemUserIds: systemUserIdStrings,
    };
};

module.exports = {
    parseStakeAmount,
    clampLimit,
    parseDateInput,
    resolveDateRange,
    formatPeriodLabel,
    buildTimeRemaining,
    maskPhone,
    formatDisplayName,
    collectStakeOptions,
    sanitizePlayerForUser,
    buildLeaderboardCore,
    buildFallbackPlayer,
};
