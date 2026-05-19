# Postman Guide - Haywin Games

**Complete Postman Collection Documentation**  
**Version:** 1.0 | **Last Updated:** April 2026

---

## Overview

This repository includes ready-to-import Postman assets for the complete Haywin Games API surface (196+ endpoints across all game modules).

---

## Files Included

```
docs/
└── HaywinGames.postman.json                 # Complete API collection + Environment
```

**Note:** This single file contains both the API collection (196+ endpoints) AND environment variables. Import once and everything is ready to use.

---

## Import Instructions

### Step 1: Open Postman
Launch Postman application (v10+ recommended)

### Step 2: Import Merged Collection
1. Click **Import** button (or File > Import)
2. Select `docs/HaywinGames.postman.json`
3. Click **Import**

### Step 3: Verify Environment
1. Click environment dropdown (top-right)
2. Select **"Haywin Games (Local/Template)"** (auto-imported with the collection)

### Step 4: Configure Environment Variables

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:5000/api/v1` | API base URL |
| `token` | *(empty)* | JWT auth token |
| `userId` | *(empty)* | Current user ID |
| `roomId` | *(empty)* | Game room ID |
| `gameId` | *(empty)* | Game session ID |
| `cardId` | `1` | Bingo card ID |
| `stakeAmount` | `10` | Default bet amount |
| `telegramId` | *(empty)* | Telegram user ID |
| `transactionId` | *(empty)* | Transaction ID |
| `withdrawalId` | *(empty)* | Withdrawal ID |
| `payoutId` | *(empty)* | Payout record ID |
| `agentId` | *(empty)* | Agent user ID |
| `paymentMethodId` | *(empty)* | Payment method ID |
| `countryId` | *(empty)* | Country ID |

---

## Environment Configuration

### Development Environment
```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "token": "",
  "userId": ""
}
```

### Production Environment
```json
{
  "baseUrl": "https://api.haywingames.com/api/v1",
  "token": "",
  "userId": ""
}
```

---

## Authentication Workflow

### Option 1: Login Existing User

1. Open **Authentication** folder
2. Run **Login** request:
   ```json
   {
     "phone": "+2519XXXXXXXX",
     "password": "StrongPassword123"
   }
   ```
3. Postman script automatically extracts:
   - `token` from `response.data.token`
   - `userId` from `response.data.user._id`
   - `telegramId` from `response.data.user.telegramId`

### Option 2: Register New User

1. Run **Register** request:
   ```json
   {
     "fullName": "Test User",
     "phone": "+2519XXXXXXXX",
     "password": "StrongPassword123"
   }
   ```
2. Then run **Login** with new credentials

### Verify Authentication

1. Run **Get Profile** request
2. Should return user data with 200 status
3. If 401 error, token is missing/invalid

---

## Collection Structure

```
Haywin Games - Complete API Collection (196 endpoints)
│
├── 📁 Health (1 endpoint)
│   └── Health Check
│
├── 📁 Authentication (17 endpoints)
│   ├── Register
│   ├── Register Guest
│   ├── Telegram Auth
│   ├── Login ⭐ (Auto-saves token)
│   ├── Get Profile
│   ├── Get My Summary
│   ├── Update Profile
│   ├── Delete Account
│   ├── Get Invited Users
│   ├── Change Password
│   ├── Forgot Password
│   ├── Reset Password
│   ├── Send Verification Email
│   ├── Verify Email
│   ├── Register Agent (Admin)
│   └── Register Staff (Admin)
│
├── 📁 Users (15 endpoints)
│   ├── Get All Users (Admin)
│   ├── Get User By ID
│   ├── Get User By Telegram ID
│   ├── Get Balance By Telegram ID
│   ├── Get Users By Invite Code
│   ├── Get Agents With Stats
│   ├── Get User Summary
│   ├── Update User Wallet (Admin)
│   ├── Update User Bonus (Admin)
│   ├── Update User Role (Admin)
│   ├── Ban User (Admin)
│   ├── Unban User (Admin)
│   ├── Delete User (Admin)
│   ├── Get Agent Earnings
│   └── Update User Permissions
│
├── 📁 Bingo Cards Bulk Management (8 endpoints)
│   ├── Create Bulk Cards (Admin)
│   ├── Insert Cards From File (Admin)
│   ├── Get Cards Count
│   ├── Get All Cards By Room
│   ├── Get Card By CardId
│   ├── Update Card By CardId (Admin)
│   ├── Get Cards Data (Batch)
│   └── Delete All Cards (Admin)
│
├── 📁 Game Rooms (6 endpoints)
│   ├── Create Game Room (Admin)
│   ├── Get All Game Rooms
│   ├── Get Game Room By ID
│   ├── Update Game Room (Admin)
│   ├── Update Room Bonus (Admin)
│   └── Delete Game Room (Admin)
│
├── 📁 Bingo Domain (18 endpoints)
│   ├── Get Card By ID (/bingo)
│   ├── Get Reservation By User
│   ├── Get All User Cards
│   ├── Get Card With User Context
│   ├── Get Card IDs
│   ├── Create Card (Admin)
│   ├── Create Cards Bulk (Admin)
│   ├── Update Card (Admin)
│   ├── Remove All User Cards (Admin)
│   ├── Remove One User Card (Admin)
│   └── [9 /cards alias endpoints]
│
├── 📁 Game History (7 endpoints)
│   ├── Recent Winners
│   ├── My Game History
│   ├── Leaderboard
│   ├── Admin Leaderboard
│   ├── History By User ID (Admin)
│   ├── Game History (Admin)
│   └── History Transactions (Admin)
│
├── 📁 Transactions and Wallet (9 endpoints)
│   ├── Get All Transactions (Admin)
│   ├── Get My Transactions
│   ├── Get Bonus Transactions
│   ├── Get Transactions
│   ├── Get Transaction By ID
│   ├── Update Transaction (Admin)
│   ├── Delete Transaction (Admin)
│   ├── List Wallet Logs (Admin)
│   └── Get Wallet Log By ID (Admin)
│
├── 📁 AddisPay (6 endpoints)
│   ├── Deposit
│   ├── Withdraw
│   ├── Get Status
│   ├── Deposit Success Callback
│   ├── Deposit Failure Callback
│   └── Withdrawal Callback
│
├── 📁 Manual Payments (8 endpoints)
│   ├── Submit Receipt (FormData)
│   ├── Submit Receipt Telegram (FormData)
│   ├── Get Receipts (Admin)
│   ├── Get Admin Transactions (Admin)
│   ├── Get Referral Income
│   ├── Reject Receipt (Admin)
│   ├── Delete Receipt (Admin)
│   └── Deposit To Wallet (Admin)
│
├── 📁 Withdrawals (5 endpoints)
│   ├── Submit Withdrawal Request
│   ├── Get Withdrawal Requests
│   ├── Approve Withdrawal (Admin)
│   ├── Reject Withdrawal (Admin)
│   └── Delete Withdrawal (Admin)
│
├── 📁 Transfers (4 endpoints)
│   ├── Create Transfer
│   ├── Get All Transfers (Admin)
│   ├── Get User Transfers
│   └── Delete Transfer (Admin)
│
├── 📁 Reports, Revenue and Admin (6 endpoints)
│   ├── Dashboard Reports (Admin)
│   ├── Revenue Breakdown (Admin)
│   ├── Revenue Transactions (Admin)
│   ├── Robot Stats (Admin)
│   ├── Revenue Trend (Admin)
│   ├── Admin Dashboard (Admin)
│   ├── Admin Transactions (Admin)
│   ├── Admin Payouts (Admin)
│   ├── Admin Update Payout (Admin)
│   └── Admin Stats (Admin)
│
├── 📁 Stake Bonus and Settings (10 endpoints)
│   ├── Get All Stake Bonuses
│   ├── Get Stake Bonus By Amount
│   ├── Upsert Stake Bonus (Admin)
│   ├── Get Pending Stakes (Admin)
│   ├── Get All Commissions (Admin)
│   ├── Get Commission By Stake
│   ├── Upsert Commission (Admin)
│   ├── Get Settings
│   ├── Get Card Reservation Settings
│   ├── Update Settings (Admin)
│   ├── Update Card Reservation Settings (Admin)
│   ├── Get Admin Settings (Admin)
│   └── Update Admin Settings (Admin)
│
├── 📁 Config and Public App Data (5 endpoints)
│   ├── Get App Config (Admin)
│   ├── Update App Config (Admin)
│   ├── Get Public Config
│   ├── Upload Promo Image (Admin, FormData)
│   └── Upload Branding Assets (Admin, FormData)
│
├── 📁 Notifications, Permissions and Support (13 endpoints)
│   ├── Send Notification (Admin, FormData)
│   ├── Register Game Manager (Admin)
│   ├── Get Game Managers (Admin)
│   ├── Update User Permissions (Admin)
│   ├── Get User Permissions
│   ├── Leaderboard Route
│   ├── Get Active Countries
│   ├── Get All Countries (Admin)
│   ├── Create Country (Admin)
│   ├── Initialize Countries (Admin)
│   ├── Update Country (Admin)
│   ├── Delete Country (Admin)
│   ├── Get Supported Phone Countries
│   ├── Validate Phone
│   ├── Get Payment Methods
│   ├── Get All Payment Methods (Admin)
│   ├── Create Payment Method (Admin)
│   ├── Update Payment Method (Admin)
│   └── Delete Payment Method (Admin)
│
├── 📁 Keshkesh (7 endpoints)
│   ├── Create Keshkesh Room (Admin)
│   ├── List Keshkesh Rooms
│   ├── Keshkesh History
│   ├── Get Keshkesh Room
│   ├── Update Keshkesh Room (Admin)
│   ├── Reset Keshkesh Room (Admin)
│   └── Delete Keshkesh Room (Admin)
│
├── 📁 Spin (7 endpoints)
│   ├── Create Spin Room (Admin)
│   ├── List Spin Rooms
│   ├── Spin History
│   ├── Get Spin Room
│   ├── Update Spin Room (Admin)
│   ├── Reset Spin Room (Admin)
│   └── Delete Spin Room (Admin)
│
├── 📁 Material Lottery (9 endpoints)
│   ├── Create Material Lottery Game (Admin, FormData)
│   ├── Get Material Lottery Games
│   ├── Material Lottery History
│   ├── Update Material Lottery Game (Admin, FormData)
│   ├── Get Material Lottery Payouts
│   ├── Update Material Lottery Payout (Admin)
│   ├── Get Material Lottery Dashboard (Admin)
│   ├── Reset Material Lottery Game (Admin)
│   └── Delete Material Lottery Game (Admin)
│
├── 📁 Ludo (8 endpoints)
│   ├── Create Ludo Room
│   ├── Join Ludo Room
│   ├── List Ludo Rooms
│   ├── Get Ludo Room
│   ├── Cancel Ludo Room (Admin)
│   ├── Admin List Ludo Rooms (Admin)
│   ├── Admin Get Ludo Game (Admin)
│   └── Admin Get Ludo Stats (Admin)
│
├── 📁 Robots and Bot Pacing (7 endpoints)
│   ├── Create Robot (Admin)
│   ├── Delete Robot (Admin)
│   ├── Adjust Robot Wallet (Admin)
│   ├── Get Robot Names (Admin)
│   ├── Update Robot Names (Admin)
│   ├── Get Bot Pacing (Admin)
│   ├── Update Bot Pacing (Admin)
│   └── Reset Bot Pacing (Admin)
│
├── 📁 SMS Deposit and Agent Payments (5 endpoints)
│   ├── Validate Automatic Deposit (Admin)
│   ├── Automatic Deposit
│   ├── Create Agent Payment (Admin)
│   ├── Get Payments For Agent
│   └── Get My Agent Payments
│
└── 📁 Jackpot (7 endpoints)
    ├── Get Public Jackpot
    ├── Get Jackpot Config (Admin)
    ├── Update Jackpot Config (Admin)
    ├── Adjust Jackpot Wallet (Admin)
    ├── Allocate Daily Jackpot (Admin)
    └── Get Jackpot History (Admin)
```

---

## Testing Workflows

### Workflow 1: Complete User Registration → Game Play

```
1. POST /auth/register
   → Save userId from response
   
2. POST /auth/login
   → Token auto-saved to environment
   
3. GET /auth/profile
   → Verify auth working
   
4. GET /gamerooms
   → Get available rooms
   
5. POST /bingo/reservation (via Socket.IO)
   → Requires Socket.IO connection
```

### Workflow 2: Deposit → Play → Withdraw

```
1. POST /addis-pay/deposit
   → Initiates deposit
   
2. [Complete payment via provider]

3. GET /transactions/mine
   → Verify deposit recorded
   
4. [Play games via Socket.IO]

5. POST /withdrawal/request
   → Request withdrawal
   
6. [Admin approves via /withdrawal/approve]
```

### Workflow 3: Admin Operations

```
1. POST /auth/login (with admin credentials)

2. GET /admin/dashboard
   → View system stats
   
3. GET /users/all
   → List all users
   
4. PUT /users/{userId}/wallet
   → Adjust user balance
   
5. POST /gamerooms
   → Create game room
   
6. GET /revenue/breakdown
   → View revenue report
```

---

## Important Notes

### FormData Endpoints
These endpoints require `multipart/form-data`:
- `POST /manual-payment/receipt`
- `POST /manual-payment/upload-receipt/{telegramId}`
- `POST /material-lottery/create`
- `PUT /material-lottery/{gameId}`
- `POST /config/promo-image`
- `POST /config/branding/upload`
- `POST /send-user-notice/notify`
- `POST /bingo-cards/insert`

### Admin-Only Endpoints
These require `admin`, `manager`, `finance`, or `game_manager` role:
- All `/admin/*` endpoints
- `/users/all`
- `/transactions/all`
- `/gamerooms` (POST, PUT, DELETE)
- `/keshkesh/create`
- `/spin/create`
- `/material-lottery/create`
- `/revenue/*`
- `/robots/*`

### Game Permission Endpoints
These require specific game permissions:
- `/keshkesh/*` → `gamePermissions.keshkesh: true`
- `/spin/*` → `gamePermissions.spin: true`
- `/material-lottery/*` → `gamePermissions.material_lottery: true`
- `/ludo/*` → `gamePermissions.ludo: true`

---

## Troubleshooting

### 401 Unauthorized
- Token expired or missing
- Re-run **Login** to refresh token

### 403 Forbidden
- Insufficient permissions
- Check user role and game permissions

### 404 Not Found
- Resource doesn't exist
- Check ID variables are set correctly

### 429 Rate Limited
- Too many requests
- Wait 1 minute before retrying

### Socket.IO Not in Postman
- WebSocket events cannot be tested via Postman REST
- Use separate WebSocket client or frontend
- See API docs Section 15 for event list

---

## Additional Resources

- **Full API Docs:** `HAYWIN_GAMES_API_DOCUMENTATION.md`
- **Platform Handover:** `HAYWIN_GAMES_HANDOVER.md`
- **Backend Docs:** `../server/README.md`
- **Frontend Docs:** `../client/README.md`

---

**Version:** 1.0  
**Total Endpoints:** 196  
**Last Updated:** April 2026

**INTERNAL DOCUMENTATION - CONFIDENTIAL**