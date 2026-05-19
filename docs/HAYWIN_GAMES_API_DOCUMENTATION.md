# Haywin Games - Complete API Documentation
## Production-Ready REST and WebSocket Reference

**Version:** 1.0  
**Author:** Samuel Aberra  
**Last Updated:** April 17, 2026  
**Base URL (Development):** `http://localhost:5000/api/v1`  
**Base URL (Production):** `https://api.haywingames.com/api/v1`

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Environment Setup](#2-environment-setup)
3. [Health & Status](#3-health--status)
4. [Authentication (`/auth`)](#4-authentication-auth)
5. [Users (`/users`)](#5-users-users)
6. [Bingo Domain](#6-bingo-domain)
7. [Keshkesh Domain (`/keshkesh`)](#7-keshkesh-domain-keshkesh)
8. [Spin Domain (`/spin`)](#8-spin-domain-spin)
9. [Material Lottery Domain (`/material-lottery`)](#9-material-lottery-domain-material-lottery)
10. [Ludo Domain (`/ludo`)](#10-ludo-domain-ludo)
11. [Wallet and Transactions](#11-wallet-and-transactions)
12. [Payments and Withdrawals](#12-payments-and-withdrawals)
13. [Admin, Config, and Reporting](#13-admin-config-and-reporting)
14. [Utility and Support APIs](#14-utility-and-support-apis)
15. [WebSocket Events (Cross-Game)](#15-websocket-events-cross-game)
16. [Error Reference](#16-error-reference)
17. [Rate Limit and Security](#17-rate-limit-and-security)
18. [Postman Collection Guide](#18-postman-collection-guide)

---

## 1. API Conventions

### 1.1 Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.haywingames.com/api/v1
```

### 1.2 Authentication
Protected routes require a JWT token in the Authorization header:
```http
Authorization: Bearer <jwt_token>
```

### 1.3 Content Type
For JSON endpoints:
```http
Content-Type: application/json
```

For file uploads:
```http
Content-Type: multipart/form-data
```

### 1.4 Response Format
Standard response envelope:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { },
  "timestamp": "2026-04-17T10:00:00.000Z"
}
```

Error response format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "timestamp": "2026-04-17T10:00:00.000Z"
}
```

---

## 2. Environment Setup

### 2.1 Postman Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:5000/api/v1` |
| `token` | JWT auth token | `eyJhbGciOiJIUzI1NiIs...` |
| `userId` | Current user ID | `507f1f77bcf86cd799439011` |
| `roomId` | Game room ID | `507f1f77bcf86cd799439012` |
| `gameId` | Game session ID | `507f1f77bcf86cd799439013` |
| `cardId` | Bingo card ID | `12345` |
| `stakeAmount` | Bet amount | `10` |
| `telegramId` | Telegram user ID | `123456789` |
| `transactionId` | Transaction ID | `507f1f77bcf86cd799439014` |
| `withdrawalId` | Withdrawal request ID | `507f1f77bcf86cd799439015` |
| `payoutId` | Payout record ID | `507f1f77bcf86cd799439016` |
| `agentId` | Agent user ID | `507f1f77bcf86cd799439017` |
| `paymentMethodId` | Payment method ID | `507f1f77bcf86cd799439018` |
| `countryId` | Country ID | `507f1f77bcf86cd799439019` |

### 2.2 Postman Collection Files
- **Collection:** `docs/postman/HaywinGames.postman_collection.json`
- **Environment:** `docs/postman/HaywinGames.postman_environment.json`

---

## 3. Health & Status

### 3.1 Health Check
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running smoothly",
  "timestamp": "2026-04-17T10:00:00.000Z"
}
```

---

## 4. Authentication (`/auth`)

Base: `/api/v1/auth`

### 4.1 Register
```http
POST /api/v1/auth/register
```

**Request:**
```json
{
  "fullName": "Player One",
  "phone": "+2519XXXXXXXX",
  "password": "StrongPassword123",
  "referralCode": "OPTIONAL_CODE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Player One",
      "phone": "+2519XXXXXXXX",
      "role": "user",
      "wallet": 0,
      "bonus": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4.2 Register Guest
```http
POST /api/v1/auth/register-guest
```

**Request:**
```json
{
  "fullName": "Guest User"
}
```

### 4.3 Telegram Auth
```http
POST /api/v1/auth/telegram
```

**Request:**
```json
{
  "initData": "query_id=...&user={...}&hash=..."
}
```

### 4.4 Login
```http
POST /api/v1/auth/login
```

**Request:**
```json
{
  "phone": "+2519XXXXXXXX",
  "password": "StrongPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Player One",
      "phone": "+2519XXXXXXXX",
      "role": "user",
      "wallet": 100,
      "bonus": 10
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4.5 Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

### 4.6 Get My Summary
```http
GET /api/v1/auth/my-summary
Authorization: Bearer <token>
```

### 4.7 Update Profile
```http
PUT /api/v1/auth/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "fullName": "Updated Name",
  "language": "en",
  "country": "ET"
}
```

### 4.8 Delete Account
```http
DELETE /api/v1/auth/delete-account
Authorization: Bearer <token>
```

### 4.9 Get Invited Users
```http
GET /api/v1/auth/invited-users
Authorization: Bearer <token>
```

### 4.10 Change Password
```http
PUT /api/v1/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

### 4.11 Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

### 4.12 Reset Password
```http
POST /api/v1/auth/reset-password/:token
Content-Type: application/json
```

**Request:**
```json
{
  "password": "NewPassword456"
}
```

### 4.13 Send Verification Email
```http
POST /api/v1/auth/send-verification-email
Authorization: Bearer <token>
```

### 4.14 Verify Email
```http
GET /api/v1/auth/verify-email/:token
```

### 4.15 Register Agent (Admin)
```http
POST /api/v1/auth/admin/register-agent
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "fullName": "Agent User",
  "phone": "+2519YYYYYYYY",
  "password": "AgentPassword123"
}
```

### 4.16 Register Staff (Admin)
```http
POST /api/v1/auth/admin/register-staff
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "fullName": "Staff User",
  "phone": "+2519ZZZZZZZZ",
  "password": "StaffPassword123",
  "role": "finance"
}
```

---

## 5. Users (`/users`)

Base: `/api/v1/users`

### 5.1 Get All Users
```http
GET /api/v1/users/all
Authorization: Bearer <admin_token>
```

### 5.2 Get User By ID
```http
GET /api/v1/users/:userId
Authorization: Bearer <token>
```

### 5.3 Get User By Telegram ID
```http
GET /api/v1/users/by-telegram-id/:telegramId
Authorization: Bearer <token>
```

### 5.4 Get Balance By Telegram ID
```http
GET /api/v1/users/balance/:telegramId
Authorization: Bearer <token>
```

### 5.5 Get Users By Invite Code
```http
GET /api/v1/users/invited/:referralCode
Authorization: Bearer <token>
```

### 5.6 Get Agents With Stats
```http
GET /api/v1/users/admin/agents-with-stats
Authorization: Bearer <admin_token>
```

### 5.7 Get User Summary
```http
GET /api/v1/users/:userId/summary
Authorization: Bearer <token>
```

### 5.8 Update User Wallet (Admin)
```http
PUT /api/v1/users/:userId/wallet
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 100,
  "operation": "add",
  "reason": "Manual adjustment"
}
```

### 5.9 Update User Bonus (Admin)
```http
PUT /api/v1/users/:userId/bonus
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 50,
  "operation": "add"
}
```

### 5.10 Update User Role (Admin)
```http
PUT /api/v1/users/:userId/role
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "role": "agent"
}
```

### 5.11 Ban User (Admin)
```http
PUT /api/v1/users/:userId/ban
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Policy violation"
}
```

### 5.12 Unban User (Admin)
```http
PUT /api/v1/users/:userId/unban
Authorization: Bearer <admin_token>
```

### 5.13 Delete User (Admin)
```http
DELETE /api/v1/users/delete/:userId
Authorization: Bearer <admin_token>
```

### 5.14 Get Agent Earnings
```http
GET /api/v1/users/agent/earnings
Authorization: Bearer <agent_token>
```

---

## 6. Bingo Domain

### 6.1 Bingo Cards Bulk Management (`/bingo-cards`)

Base: `/api/v1/bingo-cards`

#### Create Bulk Cards
```http
POST /api/v1/bingo-cards/create/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
[
  {
    "cardId": "1001",
    "b1": 1, "b2": 2, "b3": 3, "b4": 4, "b5": 5,
    "i1": 16, "i2": 17, "i3": 18, "i4": 19, "i5": 20,
    "n1": 31, "n2": 32, "n3": 33, "n4": 34,
    "g1": 46, "g2": 47, "g3": 48, "g4": 49, "g5": 50,
    "o1": 61, "o2": 62, "o3": 63, "o4": 64, "o5": 65
  }
]
```

#### Insert Cards From File
```http
POST /api/v1/bingo-cards/insert
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: CSV/Excel file with card data

#### Get Cards Count
```http
GET /api/v1/bingo-cards/count
Authorization: Bearer <token>
```

#### Get All Cards By Room
```http
GET /api/v1/bingo-cards/:roomId
Authorization: Bearer <token>
```

#### Get Card By CardId
```http
GET /api/v1/bingo-cards/:cardId
Authorization: Bearer <token>
```

#### Update Card By CardId
```http
PUT /api/v1/bingo-cards/:cardId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "b1": 10
}
```

#### Get Cards Data (Batch)
```http
POST /api/v1/bingo-cards/data
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "cardIds": ["1", "2", "3"]
}
```

#### Delete All Cards (Admin)
```http
DELETE /api/v1/bingo-cards/
Authorization: Bearer <admin_token>
```

### 6.2 Game Rooms (`/gamerooms`)

Base: `/api/v1/gamerooms`

#### Create Game Room
```http
POST /api/v1/gamerooms
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "stakeAmount": 10,
  "bonusEnabled": false,
  "bonusAmount": 0,
  "startTime": "2026-04-17T12:00:00Z",
  "maxCardsPerUser": 5
}
```

#### Get All Game Rooms
```http
GET /api/v1/gamerooms
Authorization: Bearer <token>
```

#### Get Game Room By ID
```http
GET /api/v1/gamerooms/:roomId
Authorization: Bearer <token>
```

#### Update Game Room
```http
PUT /api/v1/gamerooms/:roomId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "bonusEnabled": true,
  "bonusAmount": 20,
  "status": "active"
}
```

#### Update Room Bonus
```http
PUT /api/v1/gamerooms/:roomId/bonus
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "bonusEnabled": true,
  "bonusAmount": 50,
  "bonusDescription": "Promo bonus"
}
```

#### Delete Game Room
```http
DELETE /api/v1/gamerooms/:roomId
Authorization: Bearer <admin_token>
```

### 6.3 Bingo Domain (`/bingo` and `/cards`)

Base: `/api/v1/bingo` and `/api/v1/cards` (aliases)

#### Get Card By ID
```http
GET /api/v1/bingo/get/:cardId
Authorization: Bearer <token>
```

#### Get Reservation By User
```http
GET /api/v1/bingo/reservation/:userId
Authorization: Bearer <token>
```

#### Get All User Cards
```http
GET /api/v1/bingo/all/cards/:userId
Authorization: Bearer <token>
```

#### Get Card With User Context
```http
GET /api/v1/bingo/get/:userId/:cardId
Authorization: Bearer <token>
```

#### Get Card IDs
```http
GET /api/v1/bingo/getCardIds
Authorization: Bearer <token>
```

#### Create Card
```http
POST /api/v1/bingo/create
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "cardId": "9999",
  "b1": 1, "b2": 2, "b3": 3, "b4": 4, "b5": 5,
  "i1": 16, "i2": 17, "i3": 18, "i4": 19, "i5": 20,
  "n1": 31, "n2": 32, "n3": 33, "n4": 34,
  "g1": 46, "g2": 47, "g3": 48, "g4": 49, "g5": 50,
  "o1": 61, "o2": 62, "o3": 63, "o4": 64, "o5": 65,
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Create Cards Bulk
```http
POST /api/v1/bingo/create/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Update Card
```http
PUT /api/v1/bingo/update/:userId/:cardId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Remove All User Cards
```http
DELETE /api/v1/bingo/remove/all/:userId
Authorization: Bearer <admin_token>
```

#### Remove One User Card
```http
DELETE /api/v1/bingo/remove/:userId/:cardId
Authorization: Bearer <admin_token>
```

#### Last Game Test
```http
GET /api/v1/bingo/last-game/test
Authorization: Bearer <token>
```

---

## 7. Keshkesh Domain (`/keshkesh`)

Base: `/api/v1/keshkesh`

### 7.1 Create Keshkesh Room
```http
POST /api/v1/keshkesh/create
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "bet_amount": 10,
  "max_players": 10,
  "description": "Evening game"
}
```

### 7.2 List Keshkesh Rooms
```http
GET /api/v1/keshkesh
Authorization: Bearer <token>
```

### 7.3 Keshkesh History
```http
GET /api/v1/keshkesh/history
Authorization: Bearer <token>
```

### 7.4 Get Keshkesh Room
```http
GET /api/v1/keshkesh/:gameId
Authorization: Bearer <token>
```

### 7.5 Update Keshkesh Room
```http
PUT /api/v1/keshkesh/:gameId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "max_players": 15,
  "status": "active"
}
```

### 7.6 Reset Keshkesh Room
```http
POST /api/v1/keshkesh/:gameId/reset
Authorization: Bearer <admin_token>
```

### 7.7 Delete Keshkesh Room
```http
DELETE /api/v1/keshkesh/:gameId
Authorization: Bearer <admin_token>
```

---

## 8. Spin Domain (`/spin`)

Base: `/api/v1/spin`

### 8.1 Create Spin Room
```http
POST /api/v1/spin/create
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "bet_amount": 10,
  "max_players": 20,
  "description": "Fetan Spin"
}
```

### 8.2 List Spin Rooms
```http
GET /api/v1/spin
Authorization: Bearer <token>
```

### 8.3 Spin History
```http
GET /api/v1/spin/history
Authorization: Bearer <token>
```

### 8.4 Get Spin Room
```http
GET /api/v1/spin/:gameId
Authorization: Bearer <token>
```

### 8.5 Update Spin Room
```http
PUT /api/v1/spin/:gameId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### 8.6 Reset Spin Room
```http
POST /api/v1/spin/:gameId/reset
Authorization: Bearer <admin_token>
```

### 8.7 Delete Spin Room
```http
DELETE /api/v1/spin/:gameId
Authorization: Bearer <admin_token>
```

---

## 9. Material Lottery Domain (`/material-lottery`)

Base: `/api/v1/material-lottery`

### 9.1 Create Material Lottery Game
```http
POST /api/v1/material-lottery/create
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `name`: Game name
- `description`: Game description
- `prizeImage`: Prize image file
- `prizeValue`: Monetary value
- `startTime`: Start timestamp
- `endTime`: End timestamp

### 9.2 Get Material Lottery Games
```http
GET /api/v1/material-lottery
Authorization: Bearer <token>
```

### 9.3 Material Lottery History
```http
GET /api/v1/material-lottery/history
Authorization: Bearer <token>
```

### 9.4 Update Material Lottery Game
```http
PUT /api/v1/material-lottery/:gameId
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

### 9.5 Get Material Lottery Payouts
```http
GET /api/v1/material-lottery/payouts
Authorization: Bearer <token>
```

### 9.6 Update Material Lottery Payout
```http
PUT /api/v1/material-lottery/payouts/:payoutId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "paid",
  "notes": "Prize delivered"
}
```

### 9.7 Get Material Lottery Dashboard
```http
GET /api/v1/material-lottery/dashboard
Authorization: Bearer <admin_token>
```

### 9.8 Reset Material Lottery Game
```http
POST /api/v1/material-lottery/:gameId/reset
Authorization: Bearer <admin_token>
```

### 9.9 Delete Material Lottery Game
```http
DELETE /api/v1/material-lottery/:gameId
Authorization: Bearer <admin_token>
```

---

## 10. Ludo Domain (`/ludo`)

Base: `/api/v1/ludo`

### 10.1 Create Ludo Room
```http
POST /api/v1/ludo/rooms/create
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "stakeAmount": 10,
  "mode": "classic",
  "playerCount": 2,
  "isPrivate": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "stakeAmount": 10,
    "mode": "classic",
    "playerCount": 2,
    "status": "waiting",
    "createdAt": "2026-04-17T10:00:00Z"
  }
}
```

### 10.2 Join Ludo Room
```http
POST /api/v1/ludo/rooms/join
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "roomId": "507f1f77bcf86cd799439020"
}
```

### 10.3 List Ludo Rooms
```http
GET /api/v1/ludo/rooms
Authorization: Bearer <token>
```

### 10.4 Get Ludo Room
```http
GET /api/v1/ludo/rooms/:roomId
Authorization: Bearer <token>
```

### 10.5 Cancel Ludo Room (Admin)
```http
POST /api/v1/ludo/rooms/:roomId/cancel
Authorization: Bearer <admin_token>
```

### 10.6 Admin List Ludo Rooms
```http
GET /api/v1/ludo/admin/rooms
Authorization: Bearer <admin_token>
```

### 10.7 Admin Get Ludo Game
```http
GET /api/v1/ludo/admin/games/:roomId
Authorization: Bearer <admin_token>
```

### 10.8 Admin Get Ludo Stats
```http
GET /api/v1/ludo/admin/stats
Authorization: Bearer <admin_token>
```

---

## 11. Wallet and Transactions

### 11.1 Transactions (`/transactions`)

Base: `/api/v1/transactions`

#### Get All Transactions (Admin)
```http
GET /api/v1/transactions/all
Authorization: Bearer <admin_token>
```

#### Get My Transactions
```http
GET /api/v1/transactions/mine
Authorization: Bearer <token>
```

#### Get Bonus Transactions
```http
GET /api/v1/transactions/bonuses
Authorization: Bearer <token>
```

#### Get Transactions
```http
GET /api/v1/transactions
Authorization: Bearer <token>
```

#### Get Transaction By ID
```http
GET /api/v1/transactions/:transactionId
Authorization: Bearer <token>
```

#### Update Transaction (Admin)
```http
PUT /api/v1/transactions/:transactionId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "COMPLETED",
  "notes": "Manual verification"
}
```

#### Delete Transaction (Admin)
```http
DELETE /api/v1/transactions/:transactionId
Authorization: Bearer <admin_token>
```

### 11.2 Wallet Logs (`/wallet-logs`)

Base: `/api/v1/wallet-logs`

#### List Wallet Logs
```http
GET /api/v1/wallet-logs
Authorization: Bearer <admin_token>
```

#### Get Wallet Log By ID
```http
GET /api/v1/wallet-logs/:transactionId
Authorization: Bearer <admin_token>
```

#### Delete Wallet Log
```http
DELETE /api/v1/wallet-logs/:transactionId
Authorization: Bearer <admin_token>
```

### 11.3 Transfers (`/transfer`)

Base: `/api/v1/transfer`

#### Create Transfer
```http
POST /api/v1/transfer
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "recipientPhone": "+2519XXXXXXXX",
  "amount": 50,
  "note": "Payment for game"
}
```

#### Get All Transfers (Admin)
```http
GET /api/v1/transfer
Authorization: Bearer <admin_token>
```

#### Get User Transfers
```http
GET /api/v1/transfer/user/:userId
Authorization: Bearer <token>
```

#### Delete Transfer (Admin)
```http
DELETE /api/v1/transfer/:transactionId
Authorization: Bearer <admin_token>
```

---

## 12. Payments and Withdrawals

### 12.1 AddisPay (`/addis-pay`)

Base: `/api/v1/addis-pay`

#### Deposit
```http
POST /api/v1/addis-pay/deposit
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 100,
  "paymentMethod": "telebirr"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "507f1f77bcf86cd799439030",
    "redirectUrl": "https://payment.addispay.com/checkout/...",
    "status": "pending"
  }
}
```

#### Withdraw
```http
POST /api/v1/addis-pay/withdraw
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 50,
  "paymentMethod": "telebirr"
}
```

#### Get Status
```http
GET /api/v1/addis-pay/status
Authorization: Bearer <token>
```

#### Deposit Success Callback
```http
POST /api/v1/addis-pay/deposit/success
Content-Type: application/json
```

**Request:**
```json
{
  "reference": "DEP001",
  "status": "completed",
  "transactionId": "ADDIS_TXN_123"
}
```

#### Deposit Failure Callback
```http
POST /api/v1/addis-pay/deposit/failure
Content-Type: application/json
```

**Request:**
```json
{
  "reference": "DEP001",
  "status": "failed",
  "error": "Insufficient funds"
}
```

#### Withdrawal Callback
```http
POST /api/v1/addis-pay/withdraw/callback
Content-Type: application/json
```

### 12.2 Manual Payment (`/manual-payment`)

Base: `/api/v1/manual-payment`

#### Submit Receipt
```http
POST /api/v1/manual-payment/receipt
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `receipt`: Image file (JPG/PNG/PDF)
- `amount`: Deposit amount
- `paymentMethod`: Payment method used

#### Submit Receipt Telegram
```http
POST /api/v1/manual-payment/upload-receipt/:telegramId
Content-Type: multipart/form-data
```

#### Get Receipts
```http
GET /api/v1/manual-payment/receipts
Authorization: Bearer <admin_token>
```

#### Get Admin Transactions
```http
GET /api/v1/manual-payment/all-transactions
Authorization: Bearer <admin_token>
```

#### Get Referral Income
```http
GET /api/v1/manual-payment/referral-income
Authorization: Bearer <token>
```

#### Reject Receipt
```http
POST /api/v1/manual-payment/reject/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Invalid receipt - amount mismatch"
}
```

#### Delete Receipt
```http
DELETE /api/v1/manual-payment/:id
Authorization: Bearer <admin_token>
```

#### Deposit To Wallet (Admin)
```http
POST /api/v1/manual-payment/deposit
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 100,
  "receiptId": "507f1f77bcf86cd799439040"
}
```

### 12.3 Withdrawals (`/withdrawal`)

Base: `/api/v1/withdrawal`

#### Submit Withdrawal Request
```http
POST /api/v1/withdrawal/request
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 100,
  "paymentMethod": "telebirr",
  "accountDetails": {
    "phone": "+2519XXXXXXXX"
  }
}
```

#### Get Withdrawal Requests
```http
GET /api/v1/withdrawal/requests
Authorization: Bearer <token>
```

#### Approve Withdrawal (Admin)
```http
POST /api/v1/withdrawal/approve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "withdrawalId": "507f1f77bcf86cd799439050"
}
```

#### Reject Withdrawal (Admin)
```http
POST /api/v1/withdrawal/reject
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "withdrawalId": "507f1f77bcf86cd799439050",
  "reason": "Account verification failed"
}
```

#### Delete Withdrawal (Admin)
```http
DELETE /api/v1/withdrawal/requests/:withdrawalId
Authorization: Bearer <admin_token>
```

### 12.4 Agent Payments (`/agent-payments`)

Base: `/api/v1/agent-payments`

#### Create Agent Payment
```http
POST /api/v1/agent-payments
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "agentId": "507f1f77bcf86cd799439060",
  "amount": 1000,
  "paymentMethod": "telebirr",
  "notes": "Commission payment"
}
```

#### Get Payments For Agent
```http
GET /api/v1/agent-payments/:agentId
Authorization: Bearer <agent_token>
```

#### Get My Agent Payments
```http
GET /api/v1/agent-payments
Authorization: Bearer <agent_token>
```

---

## 13. Admin, Config, and Reporting

### 13.1 Admin (`/admin`)

Base: `/api/v1/admin`

#### Admin Dashboard
```http
GET /api/v1/admin/dashboard
Authorization: Bearer <admin_token>
```

#### Admin Transactions
```http
GET /api/v1/admin/transactions
Authorization: Bearer <admin_token>
```

#### Admin Payouts
```http
GET /api/v1/admin/payouts
Authorization: Bearer <admin_token>
```

#### Admin Update Payout
```http
PUT /api/v1/admin/payouts/:payoutId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "paid",
  "paymentReference": "TXN123456"
}
```

#### Admin Stats
```http
GET /api/v1/admin/stats
Authorization: Bearer <admin_token>
```

### 13.2 Dashboard (`/dashboard`)

Base: `/api/v1/dashboard`

#### Dashboard Reports
```http
GET /api/v1/dashboard/reports
Authorization: Bearer <admin_token>
```

### 13.3 Revenue (`/revenue`)

Base: `/api/v1/revenue`

#### Revenue Breakdown
```http
GET /api/v1/revenue/breakdown
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `gameType`: Filter by game

#### Revenue Transactions
```http
GET /api/v1/revenue/transactions
Authorization: Bearer <admin_token>
```

#### Robot Stats
```http
GET /api/v1/revenue/robots
Authorization: Bearer <admin_token>
```

#### Revenue Trend
```http
GET /api/v1/revenue/trend
Authorization: Bearer <admin_token>
```

### 13.4 Stake Bonus (`/stake-bonus`)

Base: `/api/v1/stake-bonus`

#### Get All Stake Bonuses
```http
GET /api/v1/stake-bonus
Authorization: Bearer <token>
```

#### Get Stake Bonus By Amount
```http
GET /api/v1/stake-bonus/:stakeAmount
Authorization: Bearer <token>
```

#### Upsert Stake Bonus
```http
POST /api/v1/stake-bonus
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "stakeAmount": 10,
  "bonusAmount": 5,
  "systemCommission": 0.1,
  "enabled": true
}
```

#### Get Pending Stakes
```http
GET /api/v1/stake-bonus/admin/pending-stakes
Authorization: Bearer <admin_token>
```

#### Get All Commissions
```http
GET /api/v1/stake-bonus/commission/all
Authorization: Bearer <admin_token>
```

#### Get Commission By Stake
```http
GET /api/v1/stake-bonus/commission/:stakeAmount
Authorization: Bearer <admin_token>
```

#### Upsert Commission
```http
POST /api/v1/stake-bonus/commission
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### 13.5 Settings (`/settings` and `/admin/settings`)

#### Get Settings
```http
GET /api/v1/settings
Authorization: Bearer <token>
```

#### Get Card Reservation Settings
```http
GET /api/v1/settings/card-reservation
Authorization: Bearer <token>
```

#### Update Settings
```http
POST /api/v1/settings
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "app": {
    "maintenanceMode": false,
    "allowRegistration": true
  },
  "games": {
    "bingoEnabled": true,
    "ludoEnabled": true
  }
}
```

#### Update Card Reservation Settings
```http
PUT /api/v1/settings/card-reservation
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "enabled": true,
  "maxReservationTime": 300,
  "allowedStakes": [5, 10, 20, 50]
}
```

#### Get Admin Settings
```http
GET /api/v1/admin/settings
Authorization: Bearer <admin_token>
```

#### Update Admin Settings
```http
PUT /api/v1/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "supportPhone": "+2519XXXXXXXX",
  "supportEmail": "support@haywingames.com"
}
```

### 13.6 App Config (`/config`)

Base: `/api/v1/config`

#### Get App Config
```http
GET /api/v1/config
Authorization: Bearer <admin_token>
```

#### Update App Config
```http
PUT /api/v1/config
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "maintenanceMode": false,
  "features": {
    "bingo": true,
    "keshkesh": true,
    "spin": true,
    "materialLottery": false,
    "ludo": true
  }
}
```

#### Get Public Config
```http
GET /api/v1/config/public
```

#### Upload Promo Image
```http
POST /api/v1/config/promo-image
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Promo image file

#### Upload Branding Assets
```http
POST /api/v1/config/branding/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `logo`: Logo image file
- `favicon`: Favicon file

---

## 14. Utility and Support APIs

### 14.1 Notifications (`/send-user-notice`)

Base: `/api/v1/send-user-notice`

#### Send Notification
```http
POST /api/v1/send-user-notice/notify
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title`: Notification title
- `message`: Message body
- `image`: Optional image
- `targetUsers`: Array of user IDs (optional, empty = all)

### 14.2 Permissions (`/permissions`)

Base: `/api/v1/permissions`

#### Register Game Manager
```http
POST /api/v1/permissions/game-managers/register
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "fullName": "Game Manager",
  "phone": "+2519MMMMMMMM"
}
```

#### Get Game Managers
```http
GET /api/v1/permissions/game-managers
Authorization: Bearer <admin_token>
```

#### Update User Permissions
```http
PATCH /api/v1/permissions/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "gamePermissions": {
    "bingo": true,
    "keshkesh": true,
    "spin": true,
    "material_lottery": false,
    "ludo": true
  }
}
```

#### Get User Permissions
```http
GET /api/v1/permissions/:userId
Authorization: Bearer <token>
```

### 14.3 Leaderboard (`/leaderboard`)

Base: `/api/v1/leaderboard`

#### Get Leaderboard
```http
GET /api/v1/leaderboard/leaderboard
Authorization: Bearer <token>
```

### 14.4 Countries (`/countries`)

Base: `/api/v1/countries`

#### Get Active Countries
```http
GET /api/v1/countries/active
```

#### Get All Countries
```http
GET /api/v1/countries
Authorization: Bearer <admin_token>
```

#### Create Country
```http
POST /api/v1/countries
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "code": "ET",
  "name": "Ethiopia",
  "currency": "ETB",
  "active": true
}
```

#### Initialize Countries
```http
POST /api/v1/countries/initialize
Authorization: Bearer <admin_token>
```

#### Update Country
```http
PUT /api/v1/countries/:countryId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Delete Country
```http
DELETE /api/v1/countries/:countryId
Authorization: Bearer <admin_token>
```

### 14.5 Phone (`/phone`)

Base: `/api/v1/phone`

#### Get Supported Phone Countries
```http
GET /api/v1/phone/countries
```

#### Validate Phone
```http
POST /api/v1/phone/validate
Content-Type: application/json
```

**Request:**
```json
{
  "phone": "+2519XXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "country": "ET",
    "formatted": "+251 9XX XXX XXX"
  }
}
```

### 14.6 Payment Methods (`/payment-methods`)

Base: `/api/v1/payment-methods`

#### Get Payment Methods
```http
GET /api/v1/payment-methods
```

#### Get All Payment Methods (Admin)
```http
GET /api/v1/payment-methods/all
Authorization: Bearer <admin_token>
```

#### Create Payment Method
```http
POST /api/v1/payment-methods
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Telebirr",
  "type": "mobile_money",
  "enabled": true,
  "config": {
    "merchantId": "...",
    "apiKey": "..."
  }
}
```

#### Update Payment Method
```http
PUT /api/v1/payment-methods/:paymentMethodId
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Delete Payment Method
```http
DELETE /api/v1/payment-methods/:paymentMethodId
Authorization: Bearer <admin_token>
```

### 14.7 Robots (`/robots`)

Base: `/api/v1/robots`

#### Create Robot
```http
POST /api/v1/robots
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "fullName": "Robot One",
  "phone": "+251900000001"
}
```

#### Delete Robot
```http
DELETE /api/v1/robots/:userId
Authorization: Bearer <admin_token>
```

#### Adjust Robot Wallet
```http
PUT /api/v1/robots/:userId/wallet
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 1000,
  "operation": "add"
}
```

#### Get Robot Names
```http
GET /api/v1/robots/:userId/names
Authorization: Bearer <admin_token>
```

#### Update Robot Names
```http
PUT /api/v1/robots/:userId/names
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "names": ["Bot A", "Bot B", "Bot C"]
}
```

### 14.8 Bot Pacing (`/bot-pacing`)

Base: `/api/v1/bot-pacing`

#### Get Bot Pacing
```http
GET /api/v1/bot-pacing
Authorization: Bearer <admin_token>
```

#### Update Bot Pacing
```http
PUT /api/v1/bot-pacing
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "reservationDelay": 2000,
  "maxCardsPerTick": 5,
  "joinDelay": 1000
}
```

#### Reset Bot Pacing
```http
POST /api/v1/bot-pacing/reset
Authorization: Bearer <admin_token>
```

### 14.9 SMS Deposit (`/sms-deposit`)

Base: `/api/v1/sms-deposit`

#### Validate Automatic Deposit
```http
POST /api/v1/sms-deposit/automatic-deposit/validate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "reference": "SMS001",
  "amount": 100
}
```

#### Automatic Deposit
```http
POST /api/v1/sms-deposit/automatic-deposit
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 100,
  "paymentMethod": "sms",
  "reference": "SMS001"
}
```

### 14.10 Game History (`/games-history` and `/history`)

#### Recent Winners
```http
GET /api/v1/games-history/recent-winners
Authorization: Bearer <token>
```

#### My Game History
```http
GET /api/v1/games-history/mine
Authorization: Bearer <token>
```

#### Leaderboard
```http
GET /api/v1/games-history/leaderboard
Authorization: Bearer <token>
```

#### Admin Leaderboard
```http
GET /api/v1/games-history/leaderboard/admin
Authorization: Bearer <admin_token>
```

#### History By User ID
```http
GET /api/v1/games-history/history/:userId
Authorization: Bearer <admin_token>
```

#### Game History (Admin)
```http
GET /api/v1/history/game-history
Authorization: Bearer <admin_token>
```

#### History Transactions (Admin)
```http
GET /api/v1/history/transactions
Authorization: Bearer <admin_token>
```

### 14.11 Jackpot (`/jackpot`)

Base: `/api/v1/jackpot`

#### Get Public Jackpot
```http
GET /api/v1/jackpot/public
```

#### Get Jackpot Config
```http
GET /api/v1/jackpot
Authorization: Bearer <admin_token>
```

#### Update Jackpot Config
```http
PUT /api/v1/jackpot
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "enabled": true,
  "contributionPercent": 0.02,
  "minAmount": 1000,
  "maxAmount": 50000
}
```

#### Adjust Jackpot Wallet
```http
POST /api/v1/jackpot/adjust-wallet
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 500,
  "operation": "add",
  "reason": "Seed funding"
}
```

#### Allocate Daily Jackpot
```http
POST /api/v1/jackpot/allocate-daily
Authorization: Bearer <admin_token>
```

#### Get Jackpot History
```http
GET /api/v1/jackpot/history
Authorization: Bearer <admin_token>
```

---

## 15. WebSocket Events (Cross-Game)

### 15.1 Connection

Socket server runs on same backend host.

**Client Connection:**
```javascript
const socket = io("http://localhost:5000", {
  auth: { userId: "<userId>" }
});
```

### 15.2 Global User Room
On connect, backend joins socket to personal room by userId for global events:
- `walletUpdate` - Balance changes
- `notification` - System notifications

### 15.3 Bingo Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `requestInitialData` | C→S | Request room state |
| `join_room` | C→S | Join bingo room |
| `reserve_cards` | C→S | Reserve card IDs |
| `number_called` | S→C | New number announced |
| `bingo_winner` | S→C | Winner declared |
| `bingo:player_count` | S→C | Player count update |
| `room_update` | S→C | Room state change |

**Join Room:**
```javascript
socket.emit("join_room", {
  roomId: "room_id",
  userId: "user_id"
});
```

**Reserve Cards:**
```javascript
socket.emit("reserve_cards", {
  roomId: "room_id",
  userId: "user_id",
  cardIds: ["1", "2", "3"]
});
```

### 15.4 Keshkesh Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `requestKeshKeshData` | C→S | Request game data |
| `join_keshkesh` | C→S | Join Keshkesh room |
| `join_keshkesh_game` | C→S | Join specific game |
| `keshkesh_room_data` | S→C | Room state broadcast |
| `gameUpdate` | S→C | Game state update |
| `keshkesh_winner` | S→C | Winner announced |

### 15.5 Spin Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `requestSpinData` | C→S | Request spin data |
| `join_spin` | C→S | Join spin room |
| `join_spin_game` | C→S | Join specific game |
| `fetan_spin_prepare` | S→C | Spin preparing |
| `fetan_spin_start` | S→C | Spin started |
| `fetan_spin_result` | S→C | Spin result |

### 15.6 Material Lottery Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `requestMaterialLotteryData` | C→S | Request lottery data |
| `join_material_lottery` | C→S | Join lottery room |
| `join_material_lottery_game` | C→S | Join specific game |
| `material_lottery_room_data` | S→C | Room state broadcast |
| `lottery_draw` | S→C | Draw result |

### 15.7 Ludo Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ludo:get_rooms` | C→S | Get available rooms |
| `ludo:create_room` | C→S | Create new room |
| `ludo:join_room` | C→S | Join room |
| `ludo:leave_room` | C→S | Leave room |
| `ludo:dice_roll` | C→S | Roll dice |
| `ludo:move_token` | C→S | Move game piece |
| `ludo:turn_change` | S→C | Turn changed |
| `ludo:game_start` | S→C | Game started |
| `ludo:game_end` | S→C | Game ended |
| `ludo:player_joined` | S→C | Player joined |
| `ludo:player_left` | S→C | Player left |
| `ludo:room_update` | S→C | Room state update |

**Create Room:**
```javascript
socket.emit("ludo:create_room", {
  stakeAmount: 10,
  mode: "classic",
  playerCount: 2
});
```

**Join Room:**
```javascript
socket.emit("ludo:join_room", {
  roomId: "room_id"
});
```

**Roll Dice:**
```javascript
socket.emit("ludo:dice_roll", {
  roomId: "room_id",
  gameId: "game_id"
});
```

**Move Token:**
```javascript
socket.emit("ludo:move_token", {
  roomId: "room_id",
  gameId: "game_id",
  tokenId: "token_1",
  steps: 6
});
```

### 15.8 Global Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `walletUpdate` | S→C | Balance updated |
| `notification` | S→C | System notification |
| `maintenance_notice` | S→C | Maintenance alert |
| `jackpot_update` | S→C | Jackpot amount change |
| `jackpot_winner` | S→C | Jackpot won |

---

## 16. Error Reference

### 16.1 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful operation |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable | Validation error |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal error |

### 16.2 Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INSUFFICIENT_BALANCE` | User has insufficient funds | Deposit or reduce stake |
| `ROOM_NOT_FOUND` | Game room doesn't exist | Check room ID |
| `ROOM_FULL` | Room reached max capacity | Join different room |
| `GAME_IN_PROGRESS` | Game already started | Wait for next round |
| `CARDS_ALREADY_RESERVED` | Cards taken by others | Select different cards |
| `INVALID_CARDS` | Cards don't exist | Check card IDs |
| `FORBIDDEN` | Action not permitted | Check permissions |
| `UNAUTHORIZED` | Not authenticated | Login required |
| `VALIDATION_FAILED` | Input validation failed | Check request data |
| `GAME_NOT_AVAILABLE` | Game type disabled | Contact admin |
| `PAYMENT_FAILED` | Payment processing failed | Try again or contact support |
| `WITHDRAWAL_PENDING` | Existing pending withdrawal | Wait for processing |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `DUPLICATE_TRANSACTION` | Transaction already exists | Check transaction ID |
| `ACCOUNT_BANNED` | User account suspended | Contact support |
| `MAINTENANCE_MODE` | Platform under maintenance | Try again later |

---

## 17. Rate Limit and Security

### 17.1 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 10 requests | 1 minute |
| `/withdrawal/*` | 5 requests | 1 minute |
| `/addis-pay/*` | 10 requests | 1 minute |
| `/transfer` | 20 requests | 1 minute |
| Game join operations | 30 requests | 1 minute |
| General API | 100 requests | 1 minute |

### 17.2 Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### 17.3 CORS Policy

Configured origins:
- `http://localhost:5173` (dev)
- `https://haywingames.com` (prod)
- `https://*.haywingames.com` (subdomains)

---

## 18. Postman Collection Guide

### 18.1 Import Steps

1. Open Postman
2. Click **Import** button
3. Select the merged file: `docs/HaywinGames.postman.json`
   - This single file contains both the API collection AND environment variables
4. Collection and environment are automatically imported together
5. Select "Haywin Games (Local/Template)" from the environment dropdown
6. Update `baseUrl` variable for your environment if needed

### 18.2 Environment Variables Setup

After login, the collection automatically sets:
- `token` - From login response
- `userId` - From user object
- `telegramId` - If available

### 18.3 Authentication Flow

1. Run **Auth → Login** or **Auth → Register**
2. Token automatically saved to environment
3. All authenticated requests use `{{token}}`

### 18.4 Collection Structure

```
Haywin Games - Complete API Collection
├── Health
├── Authentication (17 endpoints)
├── Users (15 endpoints)
├── Bingo Cards Bulk Management (8 endpoints)
├── Game Rooms (6 endpoints)
├── Bingo Domain (18 endpoints)
├── Game History (7 endpoints)
├── Transactions and Wallet (9 endpoints)
├── AddisPay (6 endpoints)
├── Manual Payments (8 endpoints)
├── Withdrawals (5 endpoints)
├── Transfers (4 endpoints)
├── Reports, Revenue and Admin (6 endpoints)
├── Stake Bonus and Settings (10 endpoints)
├── Config and Public App Data (5 endpoints)
├── Notifications, Permissions and Support (13 endpoints)
├── Keshkesh (7 endpoints)
├── Spin (7 endpoints)
├── Material Lottery (9 endpoints)
├── Ludo (8 endpoints)
├── Robots and Bot Pacing (7 endpoints)
├── SMS Deposit and Agent Payments (5 endpoints)
└── Jackpot (7 endpoints)
```

### 18.5 Total Endpoint Count

| Category | Endpoints |
|----------|-----------|
| Health | 1 |
| Authentication | 17 |
| Users | 15 |
| Bingo | 38 |
| Keshkesh | 7 |
| Spin | 7 |
| Material Lottery | 9 |
| Ludo | 8 |
| Wallet/Transactions | 13 |
| Payments | 19 |
| Admin/Config | 31 |
| Utilities | 24 |
| Jackpot | 7 |
| **TOTAL** | **196** |

### 18.6 Testing Sequence

Recommended order for testing:

1. **Health** - Verify server is running
2. **Auth** - Register/login, capture token
3. **Config** - Check public settings
4. **Users** - Get profile, verify auth
5. **Wallet** - Check balance
6. **Payments** - Test deposit flow
7. **Games** - Test each game type
8. **Withdrawals** - Test cash-out flow
9. **Admin** - Test admin functions

---

## Appendix A: Data Models

### User Model
```javascript
{
  _id: ObjectId,
  telegramId: String (sparse),
  email: String (sparse),
  isEmailVerified: Boolean,
  fullName: String,
  phone: String (sparse, unique),
  password: String (hashed),
  referralCode: String,
  wallet: Number (min: 0 for non-robots),
  bonus: Number (min: 0),
  language: String (default: "en"),
  country: String,
  invitedBy: String,
  role: Enum["user", "admin", "agent", "game_manager", "robot", "finance", "secretary", "manager", "guest"],
  isRobot: Boolean,
  isGuest: Boolean,
  gamePermissions: {
    bingo: Boolean,
    keshkesh: Boolean,
    spin: Boolean,
    material_lottery: Boolean,
    ludo: Boolean
  },
  isBanned: Boolean,
  banReason: String,
  bannedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  type: Enum["deposit", "withdrawal", "transfer", "receive", "registration_bonus", "referral_bonus", "bonus", "jackpot", "bet", "win", "refund"],
  source: Enum["manual", "sms", "admin", "system", "addispay", "telebirr"],
  amount: Number (min: 0),
  creditedAmount: Number,
  bonusAmount: Number,
  bonusPercent: Number (0-100),
  status: Enum["PENDING", "COMPLETED", "FAILED", "CANCELLED", "approved", "rejected"],
  reference: String (unique, sparse),
  transactionId: String,
  receiptId: ObjectId (ref: Receipts),
  paymentMethod: String,
  addispayNonce: String (unique, sparse),
  addispayTransactionId: String (unique, sparse),
  description: String,
  localAmount: Number,
  localCurrency: String,
  exchangeRate: Number,
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

### GameTransaction Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  userType: Enum["user", "robot"],
  type: Enum["stake", "win", "refund"],
  gameType: Enum["bingo", "keshkesh", "material_lottery", "spin", "ludo"],
  roomId: ObjectId (ref: GameRoom),
  gameId: ObjectId (ref: Game),
  amount: Number (min: 0),
  stakeAmount: Number,
  cardIds: [String],
  walletBefore: Number,
  walletAfter: Number,
  description: String,
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Appendix B: WebSocket Event Payloads

### Bingo: Room Update
```json
{
  "roomId": "507f1f77bcf86cd799439012",
  "status": "active",
  "currentNumber": 42,
  "calledNumbers": [1, 15, 23, 42],
  "players": 15,
  "reservations": 45,
  "timestamp": "2026-04-17T10:05:00Z"
}
```

### Bingo: Winner
```json
{
  "roomId": "507f1f77bcf86cd799439012",
  "winner": {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "Player One",
    "cardId": "12345"
  },
  "prize": 500,
  "winningPattern": "full_house",
  "timestamp": "2026-04-17T10:10:00Z"
}
```

### Ludo: Game State
```json
{
  "gameId": "507f1f77bcf86cd799439020",
  "roomId": "507f1f77bcf86cd799439021",
  "status": "playing",
  "currentTurn": "507f1f77bcf86cd799439011",
  "players": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "color": "red",
      "tokens": [
        {"id": "token_1", "position": 15},
        {"id": "token_2", "position": 0},
        {"id": "token_3", "position": 0},
        {"id": "token_4", "position": 0}
      ]
    }
  ],
  "lastDiceRoll": 6,
  "timestamp": "2026-04-17T10:05:00Z"
}
```

### Wallet Update
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "wallet": 150.50,
  "bonus": 10.00,
  "change": {
    "type": "win",
    "amount": 50.00,
    "gameType": "bingo"
  },
  "timestamp": "2026-04-17T10:05:00Z"
}
```

---

**END OF API DOCUMENTATION**

For additional support, refer to:
- `docs/HAYWIN_GAMES_HANDOVER.md` - Complete platform documentation
- `docs/POSTMAN.md` - Postman usage guide
- `server/README.md` - Backend documentation
- `client/README.md` - Frontend documentation
