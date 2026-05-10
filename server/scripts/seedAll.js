/*
 * Seed realistic data across core models for E2E testing.
 * Usage:
 *   node scripts/seedAll.js --clean --users 20 --withdrawals 80
 * Flags:
 *   --clean           Remove prior seed docs tagged with seedTag
 *   --users N         Number of seed users (default 20)
 *   --withdrawals N   Number of withdrawals (default 60)
 *   --rooms N         Number of bingo rooms (default 4)
 *   --games N         Number of keshkesh games (default 3)
 *   --lotteries N     Number of material lotteries (default 2)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const CONFIG = require("../config/config");
const User = require("../models/userModels");
const Withdrawal = require("../models/WithdrawalRequest");
const ManualTransaction = require("../models/DepositRequest");
const { Transaction, TransactionType, TransactionStatus } = require("../models/Transaction");
const Reservation = require("../models/reservationModel");
const GameRoom = require("../models/gameRoom");
const BingoCard = require("../models/bingoCardModel");
const Game = require("../models/game");
const GameParticipant = require("../models/gameParticipant");
const { GameTransaction, GameTransactionType, GameType, UserType } = require("../models/GameTransaction");
const Payout = require("../models/payout");
const Receipt = require("../models/Receipt");
const WalletLog = require("../models/walletLog");
const StakeBonusSettings = require("../models/stakeBonusSettings");
const MaterialLottery = require("../models/materialLottery");
const MaterialPayout = require("../models/materialPayout");
const AgentPayment = require("../models/AgentPayment");
const SpinLog = require("../models/spinLog");
const AppConfig = require("../models/appConfig");
const AdminSetting = require("../models/adminSetting");
const Setting = require("../models/settingModel");

const seedTag = "seed_all";

function argNum(flag, def) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? Number(process.argv[idx + 1]) : def;
}

const shouldClean = process.argv.includes("--clean");
const userCount = argNum("--users", 20);
const withdrawalCount = argNum("--withdrawals", 60);
const roomCount = argNum("--rooms", 4);
const gameCount = argNum("--games", 3);
const lotteryCount = argNum("--lotteries", 2);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randomAmount(min = 10, max = 20000) {
  return randInt(min, max);
}

function randomDate(days = 45) {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  return new Date(randInt(past, now));
}

function makeCardNumbers() {
  // Simple bingo-like distribution; center free space set to 0
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];
  const cols = ranges.map(([lo, hi]) => {
    const nums = new Set();
    while (nums.size < 5) nums.add(randInt(lo, hi));
    return Array.from(nums);
  });
  // Force center free cell
  cols[2][2] = 0;
  const [b, i, n, g, o] = cols;
  return { b, i, n, g, o };
}

async function main() {
  if (!CONFIG.mongoUri) {
    throw new Error("MONGOURL missing");
  }

  await mongoose.connect(CONFIG.mongoUri, {
    autoCreate: true,
    autoIndex: true,
    serverSelectionTimeoutMS: 30000,
  });
  console.log("Mongo connected");

  if (shouldClean) {
    const prefix = new RegExp(`^${seedTag}`);
    const seedUsers = await User.find({ telegramId: prefix }).select("_id");
    const seedIds = seedUsers.map((u) => u._id);

    await Promise.all([
      User.deleteMany({ telegramId: prefix }),
      Withdrawal.deleteMany({ userId: { $in: seedIds } }),
      ManualTransaction.deleteMany({ userId: { $in: seedIds } }),
      Transaction.deleteMany({ userId: { $in: seedIds } }),
      Reservation.deleteMany({ userId: { $in: seedIds } }),
      GameRoom.deleteMany({ createdBy: { $in: seedIds } }),
      BingoCard.deleteMany({ cardId: prefix }),
      GameTransaction.deleteMany({ userId: { $in: seedIds }, description: { $regex: seedTag } }),
      Payout.deleteMany({ user_id: { $in: seedIds } }),
      Receipt.deleteMany({ userId: { $in: seedIds }, fileUrl: { $regex: seedTag } }),
      WalletLog.deleteMany({ targetUser: { $in: seedIds } }),
      StakeBonusSettings.deleteMany({ bonusDescription: { $regex: seedTag } }),
      MaterialLottery.deleteMany({ "participants.full_name": { $regex: seedTag } }),
      MaterialPayout.deleteMany({ user_id: { $in: seedIds } }),
      AgentPayment.deleteMany({ agent: { $in: seedIds }, notes: { $regex: seedTag } }),
      SpinLog.deleteMany({ spinId: { $regex: seedTag } }),
    ]);
    console.log("Cleaned prior seed docs");
  }

  // Ensure singleton configs exist
  await Promise.all([AppConfig.getConfig(), AdminSetting.getSettings()]);
  await Setting.create({}).catch(() => {});

  // Users (incl. an admin/agent)
  const users = [];
  for (let i = 0; i < userCount; i++) {
    users.push(
      new User({
        telegramId: `${seedTag}_${i + 1}`,
        fullName: `Seed User ${i + 1}`,
        phone: `+2519${randInt(10000000, 99999999)}`,
        password: "password123",
        wallet: randInt(200, 20000),
        role: i === 0 ? "admin" : i === 1 ? "agent" : "user",
      })
    );
  }
  await User.insertMany(users, { ordered: false });
  const allUsers = await User.find({ telegramId: { $regex: `^${seedTag}` } }).lean();
  const adminUser = allUsers[0];
  const agentUser = allUsers[1];

  // Stake bonus settings
  const stakeAmounts = [5, 10, 20, 50, 100];
  await StakeBonusSettings.insertMany(
    stakeAmounts.map((s, idx) => ({
      stakeAmount: s,
      bonusEnabled: idx % 2 === 0,
      bonusAmount: idx % 2 === 0 ? randInt(1, 5) : 0,
      bonusDescription: `${seedTag} bonus for ${s}`,
      systemCommission: 0.2,
      robotEnabled: true,
      robotMinCards: 1,
      robotMaxCards: 5,
      robotWinningPercent: randInt(5, 20),
    })),
    { ordered: false }
  ).catch(() => {});

  // Bingo cards
  const cards = [];
  for (let i = 0; i < userCount * 2; i++) {
    const nums = makeCardNumbers();
    cards.push({
      cardId: `${seedTag}_card_${i + 1}`,
      b1: nums.b[0],
      b2: nums.b[1],
      b3: nums.b[2],
      b4: nums.b[3],
      b5: nums.b[4],
      i1: nums.i[0],
      i2: nums.i[1],
      i3: nums.i[2],
      i4: nums.i[3],
      i5: nums.i[4],
      n1: nums.n[0],
      n2: nums.n[1],
      n3: nums.n[2],
      n4: nums.n[3],
      n5: nums.n[4],
      g1: nums.g[0],
      g2: nums.g[1],
      g3: nums.g[2],
      g4: nums.g[3],
      g5: nums.g[4],
      o1: nums.o[0],
      o2: nums.o[1],
      o3: nums.o[2],
      o4: nums.o[3],
      o5: nums.o[4],
    });
  }
  await BingoCard.insertMany(cards, { ordered: false }).catch(() => {});

  // Game rooms
  const rooms = [];
  const activeStakeUsed = new Set();
  for (let i = 0; i < roomCount; i++) {
    const stake = stakeAmounts[i % stakeAmounts.length];
    let status = pick(["waiting", "starting", "playing", "completed"]);
    if (activeStakeUsed.has(stake) && status !== "completed") {
      status = "completed";
    }
    if (status !== "completed") activeStakeUsed.add(stake);
    rooms.push({
      stakeAmount: stake,
      winAmount: stake * randInt(5, 8),
      numberOfPlayers: randInt(5, 20),
      status,
      createdBy: adminUser?._id,
      drawnNumbers: Array.from({ length: randInt(5, 15) }, () => randInt(1, 75)),
      winners: [],
      bonusEnabled: true,
      bonusAmount: randInt(1, 5),
      bonusDescription: `${seedTag} room bonus`,
    });
  }
  const roomDocs = await GameRoom.insertMany(rooms, { ordered: false }).catch(() => GameRoom.find({}));

  // Reservations
  const reservations = [];
  for (let i = 0; i < roomDocs.length; i++) {
    const room = roomDocs[i];
    const playerCount = Math.min(5, allUsers.length);
    for (let j = 0; j < playerCount; j++) {
      const user = allUsers[(i + j) % allUsers.length];
      const cardId = `${seedTag}_card_${(i * 5 + j) % cards.length + 1}`;
      reservations.push({
        userId: user._id,
        roomId: room._id,
        cardIds: [cardId],
        gameStatus: pick(["reserved", "playing", "won", "lost"]),
        status: pick(["active", "completed", "pending"]),
        playMode: pick(["manual", "auto"]),
      });
    }
  }
  await Reservation.insertMany(reservations, { ordered: false }).catch(() => {});

  // Keshkesh games + participants + payouts + spin logs
  const games = [];
  for (let i = 0; i < gameCount; i++) {
    games.push({
      prize_amount: randomAmount(500, 3000),
      bet_amount: randomAmount(20, 100),
      max_players: randInt(3, 8),
      status: pick(["pending", "in_progress", "completed"]),
      gameType: pick(["keshkesh", "fetan-spin"]),
      prize_tiers: [
        { rank: 1, percent: 70 },
        { rank: 2, percent: 20 },
        { rank: 3, percent: 10 },
      ],
    });
  }
  const gameDocs = await Game.insertMany(games, { ordered: false });

  const participants = [];
  const payouts = [];
  const spinLogs = [];
  for (const game of gameDocs) {
    const pCount = Math.min(game.max_players, allUsers.length);
    for (let i = 0; i < pCount; i++) {
      const user = allUsers[(i + 2) % allUsers.length];
      const base = (participants.length + 1) * 10;
      const nums = [base + 1, base + 2, base + 3, base + 4, base + 5];
      participants.push({
        game_id: game._id,
        user_id: user._id,
        numbers: nums,
        paid_status: pick(["pending", "paid"]),
        rank: [],
      });
      payouts.push({
        game_id: game._id,
        user_id: user._id,
        amount: randomAmount(50, 500),
        rank: i + 1,
        status: pick(["pending", "paid"]),
      });
    }
    spinLogs.push({
      spinId: `${seedTag}_spin_${game._id}`,
      gameId: game._id,
      rank: 1,
      commitHash: `commit-${randInt(1000, 9999)}`,
      seed: `${seedTag}-${randInt(1000, 9999)}`,
      targetIndex: randInt(0, 7),
      segmentsCount: randInt(6, 12),
      status: pick(["prepared", "started", "completed"]),
      meta: { seedTag },
    });
  }
  const participantDocs = await GameParticipant.insertMany(participants, { ordered: false }).catch(() => GameParticipant.find({ game_id: { $in: gameDocs.map((g) => g._id) } }));
  await Payout.insertMany(payouts, { ordered: false }).catch(() => {});
  await SpinLog.insertMany(spinLogs, { ordered: false }).catch(() => {});

  // Game transactions (stakes/wins)
  const gameTxs = [];
  for (const room of roomDocs) {
    const user = pick(allUsers);
    gameTxs.push({
      userId: user._id,
      userType: user.isRobot ? UserType.ROBOT : UserType.USER,
      type: GameTransactionType.STAKE,
      gameType: GameType.BINGO,
      roomId: room._id,
      amount: room.stakeAmount,
      stakeAmount: room.stakeAmount,
      cardIds: [cards[0]?.cardId],
      walletBefore: user.wallet,
      walletAfter: user.wallet - room.stakeAmount,
      description: `${seedTag} bingo stake`,
    });
  }
  await GameTransaction.insertMany(gameTxs, { ordered: false }).catch(() => {});

  // Manual transactions (ledger)
  const manualTxs = [];
  for (const user of allUsers.slice(0, 10)) {
    manualTxs.push({
      userId: user._id,
      type: pick(["deposit", "Withdrawal", "bonus"]),
      amount: randomAmount(50, 1000),
      source: pick(["manual", "sms", "admin"]),
      status: pick(["pending", "approved", "rejected"]),
      description: `${seedTag} manual tx for ${user.telegramId}`,
      date: randomDate(20),
    });
  }
  await ManualTransaction.insertMany(manualTxs, { ordered: false }).catch(() => {});

  // Addis transactions
  const addisTxs = [];
  for (let i = 0; i < 15; i++) {
    const user = pick(allUsers);
    addisTxs.push({
      userId: user._id,
      type: pick([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]),
      amount: randomAmount(50, 1500),
      creditedAmount: randomAmount(40, 1400),
      bonusAmount: randInt(0, 100),
      status: pick([TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.FAILED]),
      reference: `${seedTag}_ref_${i}_${Date.now()}`,
      description: `${seedTag} addis tx`,
    });
  }
  await Transaction.insertMany(addisTxs, { ordered: false }).catch(() => {});

  // Withdrawals
  const withdrawals = [];
  const methods = ["telebirr", "bank_abyssinia", "cbe", "dashen"];
  for (let i = 0; i < withdrawalCount; i++) {
    const user = pick(allUsers);
    withdrawals.push({
      userId: user._id,
      amount: randomAmount(50, 5000),
      method: pick(methods),
      accountNumber: `${seedTag}${randInt(100000, 999999)}`,
      status: pick(["pending", "approved", "rejected", "pending"]),
      submittedAt: randomDate(30),
    });
  }
  await Withdrawal.insertMany(withdrawals, { ordered: false }).catch(() => {});

  // Receipts
  const receipts = allUsers.slice(0, 10).map((u, idx) => ({
    userId: u._id,
    fileUrl: `https://example.com/${seedTag}/receipt_${idx + 1}.pdf`,
    status: pick(["pending", "approved", "rejected"]),
    submittedAt: randomDate(15),
  }));
  await Receipt.insertMany(receipts, { ordered: false }).catch(() => {});

  // Wallet logs (admin adjusting user wallets)
  const walletLogs = [];
  for (const user of allUsers.slice(0, 8)) {
    const delta = randInt(-200, 500);
    const before = user.wallet;
    const after = before + delta;
    walletLogs.push({
      targetUser: user._id,
      performedBy: adminUser?._id || user._id,
      amount: delta,
      balanceBefore: before,
      balanceAfter: after,
      reason: `${seedTag} wallet adj`,
      source: pick(["manual", "receipt_approval", "withdrawal_adjustment", "system"]),
    });
  }
  await WalletLog.insertMany(walletLogs, { ordered: false }).catch(() => {});

  // Material lottery + payouts
  const lotteries = [];
  const materialPayouts = [];
  for (let i = 0; i < lotteryCount; i++) {
    const participants = allUsers.slice(0, 5).map((u, idx) => ({
      user_id: u._id,
      full_name: `${u.fullName || u.telegramId} ${seedTag}`,
      numbers: [randInt(1, 30), randInt(1, 30)],
      paid_status: pick(["pending", "paid"]),
      rank: [idx + 1],
    }));
    const winners = participants.slice(0, 2).map((p, idx) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      numbers: p.numbers,
      rank: idx + 1,
      prize: idx === 0 ? "Smartphone" : "1000 coins",
    }));
    const lottery = {
      bet_amount: randInt(20, 100),
      max_players: 30,
      round: i + 1,
      status: pick(["pending", "in_progress", "completed"]),
      participants,
      winners,
      rewards: [
        { rank: 1, type: "material", amount: 0, description: "Smartphone" },
        { rank: 2, type: "monetary", amount: 1000, description: "Cash" },
      ],
    };
    lotteries.push(lottery);
  }
  const lotteryDocs = await MaterialLottery.insertMany(lotteries, { ordered: false }).catch(() => []);
  for (const lot of lotteryDocs) {
    const u = pick(allUsers);
    materialPayouts.push({
      user_id: u._id,
      game_id: lot._id,
      amount: randInt(100, 500),
      description: `${seedTag} material payout`,
      type: pick(["monetary", "material"]),
      status: pick(["pending", "paid"]),
      rank: randInt(1, 3),
    });
  }
  await MaterialPayout.insertMany(materialPayouts, { ordered: false }).catch(() => {});

  // Agent payment
  if (agentUser) {
    await AgentPayment.create({
      agent: agentUser._id,
      amount: randomAmount(100, 5000),
      notes: `${seedTag} agent payment`,
    }).catch(() => {});
  }

  console.log("Seed complete");
  await mongoose.connection.close();
  console.log("Mongo disconnected");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
