# Haywin Games Backend

**Multi-Game Gaming Platform Backend**  
**Version:** 1.0 | **Author:** Samuel Aberra | **Last Updated:** April 2026

---

## Overview

This is the Node.js/Express backend for Haywin Games, a multi-game gaming platform supporting Bingo, Keshkesh, Spin, Material Lottery, and Ludo.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express | 5.x |
| Database | MongoDB | 7.0+ |
| ODM | Mongoose | 8.x |
| Real-time | Socket.IO | 4.x |
| Auth | JWT + bcryptjs | - |
| Validation | Joi, express-validator, Zod | - |
| Logging | Winston | 3.x |
| Payments | AddisPay SDK | - |
| Telegram | node-telegram-bot-api | - |

---

## Project Structure

```
server/
├── controllers/           # API business logic
│   ├── authController.js
│   ├── gameController.js
│   ├── bingoCardsController.js
│   ├── transactionController.js
│   └── ... (37 controllers)
├── models/              # Mongoose schemas
│   ├── userModels.js
│   ├── Transaction.js
│   ├── GameTransaction.js
│   ├── gameRoom.js
│   ├── LudoRoom.js
│   └── ... (30 models)
├── routes/              # Express route definitions
│   ├── index.js         # Route mounting
│   ├── authRoute.js
│   ├── bingoCardRoutes.js
│   └── ... (36 routes)
├── socketController/    # Real-time game engines
│   ├── socketSetup.js   # Socket initialization
│   ├── bingoSocket.js   # Bingo engine
│   ├── keshkeshSocket.js
│   ├── spinSocket.js
│   ├── materialLotterySocket.js
│   ├── ludoSocket.js
│   └── countHandler.js
├── middlewares/         # Express middlewares
│   ├── auth.js          # JWT authentication
│   ├── access.js        # Role/permission checks
│   ├── errorHandler.js
│   ├── helmet.js
│   └── cors.js
├── services/            # Business logic modules
│   ├── walletService.js
│   ├── gameService.js
│   ├── jackpotScheduler.js
│   └── ...
├── botController/       # Telegram bot handlers
│   └── ... (66 items)
├── config/              # Configuration
│   ├── database.js
│   └── config.js
├── utils/               # Utilities
│   ├── winstonLogger.js
│   └── ...
├── uploads/             # File uploads
├── index.js             # Application entry point
├── appSetup.js          # Express app setup
├── botRunner.js         # Telegram bot runner
└── package.json
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB 7.0+ (Replica Set mode)
- pnpm or npm

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server
pnpm run dev
```

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGOURL=mongodb://localhost:27017/haywin_games

# JWT
JWT_SECRET=your_secure_random_string

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
NOTIFICATION_TELEGRAM_BOT_TOKEN=your_notification_bot_token
TELEGRAM_ADMIN_CHAT_IDS=433709639,5971919560
BOT_USERNAME=HaywinBot
SUPPORT_USERNAME=support_username
SUPPORT_GROUP_CHAT_ID=-1002417555639
BOT_RUN_IN_API=true
BOT_ENABLED=true

# AddisPay Payment
ADDISPAY_API_KEY=your_addispay_api_key
ADDISPAY_BASE_URL=https://api.addispay.com

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
MINI_APP_URL=http://localhost:5173

# Payment Redirects
SUCCESS_URL=http://localhost:5173/payment/success
ERROR_URL=http://localhost:5173/payment/error
CANCEL_URL=http://localhost:5173/payment/cancel
REDIRECT_URL=http://localhost:5173/payment/redirect

# Withdrawal URLs
WITHDRAWAL_SUCCESS_URL=http://localhost:5173/withdraw/success
WITHDRAWAL_ERROR_URL=http://localhost:5173/withdraw/error
WITHDRAWAL_NOTIFY_URL=http://localhost:5000/api/v1/addispay/withdraw/callback

# Manual Payment
AGENT_NAME=Your Agent Name
AGENT_CBE=CBE_Account_Number
AGENT_CBEBIRR_ACCOUNT=CBEBirr_Account
AGENT_DASHEN_ACCOUNT=Dashen_Account
AGENT_ABYSSINIA=Abyssinia_Account
AGENT_PHONE=Telebirr_Phone
```

---

## Architecture

### Request Flow

```
Client Request
    ↓
Helmet (Security Headers)
    ↓
CORS
    ↓
Rate Limit (if enabled)
    ↓
Express JSON Parser
    ↓
Auth Middleware (if protected)
    ↓
Route Handler
    ↓
Controller
    ↓
Service/Model
    ↓
MongoDB
```

### Game Engine Architecture

```
Socket.IO Connection
    ↓
socketSetup.js (registration)
    ↓
Game Socket Module
    ↓
Event Handlers
    ↓
Game Logic
    ↓
Wallet Service (if financial)
    ↓
Database Update
    ↓
Broadcast to Room
```

---

## Key Components

### 1. Authentication (`middlewares/auth.js`)

JWT-based authentication with role checking:

```javascript
// Protect route
const { protect, restrictTo } = require('./middlewares/auth');

router.get('/admin-only', protect, restrictTo('admin'), handler);
```

### 2. Access Control (`middlewares/access.js`)

Game permission checking:

```javascript
const { restrictAccess } = require('./middlewares/access');

router.post('/keshkesh/create', protect, restrictAccess('keshkesh'), handler);
```

### 3. Wallet Service (`services/walletService.js`)

Core financial operations:

```javascript
// Debit wallet
await walletService.debit(userId, amount, metadata);

// Credit wallet
await walletService.credit(userId, amount, metadata);

// Get balance
const balance = await walletService.getBalance(userId);
```

### 4. Game Transaction Logging

All game financial events logged to `GameTransaction`:

```javascript
const { GameTransaction, GameTransactionType } = require('../models/GameTransaction');

await GameTransaction.create({
  userId,
  userType: 'user',
  type: GameTransactionType.STAKE,
  gameType: 'bingo',
  amount: stakeAmount,
  roomId,
  walletBefore: user.wallet,
  walletAfter: user.wallet - stakeAmount
});
```

---

## API Endpoints

### Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.haywingames.com/api/v1
```

### Route Groups

| Group | Path | Description |
|-------|------|-------------|
| Auth | `/auth` | Login, register, password reset |
| Users | `/users` | User management |
| Bingo | `/bingo`, `/gamerooms`, `/cards` | Bingo rooms and cards |
| Keshkesh | `/keshkesh` | Keshkesh game |
| Spin | `/spin` | Spin game |
| Material Lottery | `/material-lottery` | Material lottery |
| Ludo | `/ludo` | Ludo game |
| Transactions | `/transactions` | Wallet history |
| Payments | `/addis-pay`, `/manual-payment` | Deposits |
| Withdrawals | `/withdrawal` | Withdrawals |
| Admin | `/admin`, `/revenue` | Admin operations |

**Full API documentation:** `docs/HAYWIN_GAMES_API_DOCUMENTATION.md`

---

## Socket.IO Events

### Connection

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:5000', {
  auth: { userId: 'user_id_here' }
});
```

### Game Events

| Game | Events |
|------|--------|
| Bingo | `join_room`, `reserve_cards`, `number_called`, `bingo_winner` |
| Keshkesh | `join_keshkesh`, `keshkesh_room_data` |
| Spin | `join_spin`, `fetan_spin_result` |
| Material Lottery | `join_material_lottery`, `lottery_draw` |
| Ludo | `ludo:join_room`, `ludo:dice_roll`, `ludo:move_token` |

**Full WebSocket documentation:** `docs/HAYWIN_GAMES_API_DOCUMENTATION.md` Section 15

---

## Database

### MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `transactions` | Cashflow ledger |
| `game_transactions` | Game financial records |
| `gamerooms` | Bingo rooms |
| `reservations` | Bingo card reservations |
| `games` | Keshkesh/Spin games |
| `ludo_rooms` | Ludo rooms |
| `ludo_games` | Active Ludo games |
| `withdrawal_requests` | Withdrawal queue |
| `receipts` | Payment receipts |

### Indexes

Critical indexes for performance:
- `users.phone` (sparse, unique)
- `users.telegramId` (sparse, unique)
- `transactions.userId` + `createdAt`
- `game_transactions.gameType` + `type` + `createdAt`
- `gamerooms.status` + `stakeAmount`
- `reservations.roomId` + `userId`

---

## Scripts

```bash
# Development
pnpm run dev          # Start with nodemon

# Production
pnpm start            # Start Node.js server

# Linting
pnpm run lint         # Run ESLint
pnpm run lint:fix     # Fix ESLint issues
```

---

## Testing

### Postman Collection
- **Merged File:** `docs/HaywinGames.postman.json`
  - Contains: API collection + Environment variables
  - Endpoints: 196+ pre-configured requests
- Import once, both collection and environment are ready

### Manual Testing Flow

1. Health check: `GET /api/v1/health`
2. Register: `POST /api/v1/auth/register`
3. Login: `POST /api/v1/auth/login`
4. Get profile: `GET /api/v1/auth/profile`
5. Create game room (admin): `POST /api/v1/gamerooms`
6. Join via Socket.IO

---

## Deployment

### Docker

```bash
# Build and run
docker build -t haywin-backend .
docker run -p 5000:5000 --env-file .env haywin-backend
```

### Docker Compose (Recommended)

```bash
# From project root
docker-compose up -d
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET`
- [ ] Enable rate limiting
- [ ] Set up MongoDB replica set
- [ ] Configure payment provider credentials
- [ ] Set up monitoring/logging
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS
- [ ] Set up backup strategy

---

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify MongoDB is running
   - Check `MONGOURL` in `.env`
   - Ensure replica set is initialized

2. **Socket.IO Connection Issues**
   - Check CORS configuration
   - Verify client auth token
   - Check firewall settings

3. **Payment Callback Failures**
   - Verify callback URLs are publicly accessible
   - Check SSL certificate validity
   - Review provider credentials

4. **Telegram Bot Not Responding**
   - Verify `TELEGRAM_BOT_TOKEN`
   - Check bot is not blocked by user
   - Review bot webhook settings

---

## Documentation

| Document | Location |
|----------|----------|
| API Reference | `docs/HAYWIN_GAMES_API_DOCUMENTATION.md` |
| Platform Handover | `docs/HAYWIN_GAMES_HANDOVER.md` |
| Postman Guide | `docs/POSTMAN.md` |
| Root README | `../README.md` |

---

## License

Copyright 2025-2026 Abyssinia Software Technology PLC. All rights reserved.

**INTERNAL - CONFIDENTIAL**
